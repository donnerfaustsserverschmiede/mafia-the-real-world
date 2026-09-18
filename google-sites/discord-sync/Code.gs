/**
 * MAFIVERA – Google Sites / Discord „Was noch kommt“
 *
 * 1. In Google Drive ein neues Apps-Script-Projekt erstellen.
 * 2. Diesen Code als Code.gs einfügen.
 * 3. Deploy > New deployment > Web app.
 * 4. Execute as: Me
 * 5. Who has access: Anyone
 * 6. Den /exec-Link in Google Sites über „Einfügen > URL einbetten“ einfügen.
 *
 * Der Discord-Bot sendet POST:
 * {
 *   "secret": "...",
 *   "text": "Neue Gebäude kommen nächste Woche.",
 *   "author": "MAFIVERA-Team"
 * }
 *
 * Das Secret wird NICHT im Frontend veröffentlicht.
 */

const STORE_KEY = 'MAFIVERA_WHAT_NEXT';
const DEFAULT = {
  text: 'Noch keine neuen Ankündigungen. Schau bald wieder vorbei!',
  author: 'MAFIVERA-Team',
  updatedAt: ''
};

function getStore_() {
  const raw = PropertiesService.getScriptProperties().getProperty(STORE_KEY);
  if (!raw) return DEFAULT;
  try { return JSON.parse(raw); } catch (e) { return DEFAULT; }
}

function doGet() {
  const data = getStore_();
  const safeText = escapeHtml_(data.text || DEFAULT.text);
  const safeAuthor = escapeHtml_(data.author || DEFAULT.author);
  const date = data.updatedAt ? new Date(data.updatedAt).toLocaleString('de-DE', {timeZone:'Europe/Berlin'}) : '';

  const html = '<!doctype html><html lang="de"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' +
    'body{margin:0;background:#090909;color:#eee;font-family:Arial,sans-serif}' +
    '.box{box-sizing:border-box;max-width:900px;margin:0 auto;padding:28px;border:1px solid #6d4d1d;border-radius:18px;background:linear-gradient(145deg,#111,#080808);box-shadow:0 12px 40px #0008}' +
    '.eyebrow{font-size:12px;letter-spacing:3px;color:#c99a43;font-weight:700;text-transform:uppercase}' +
    'h1{margin:8px 0 18px;font-family:Georgia,serif;font-size:34px;color:#d5aa5b}' +
    '.text{font-size:19px;line-height:1.6;white-space:pre-wrap}' +
    '.meta{margin-top:22px;font-size:12px;color:#aaa}' +
    '</style></head><body><section class="box">' +
    '<div class="eyebrow">MAFIVERA · ROADMAP</div>' +
    '<h1>Was noch kommt</h1>' +
    '<div class="text">' + safeText + '</div>' +
    '<div class="meta">Von ' + safeAuthor + (date ? ' · Aktualisiert: ' + escapeHtml_(date) : '') + '</div>' +
    '</section></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const secret = PropertiesService.getScriptProperties().getProperty('DISCORD_SYNC_SECRET');
  if (!secret) return json_({ok:false,error:'secret_not_configured'}, 500);

  let body;
  try { body = JSON.parse(e.postData.contents || '{}'); }
  catch (err) { return json_({ok:false,error:'invalid_json'}, 400); }

  if (body.secret !== secret) return json_({ok:false,error:'unauthorized'}, 401);

  const text = String(body.text || '').trim().slice(0, 4000);
  if (!text) return json_({ok:false,error:'empty_text'}, 400);

  const data = {
    text,
    author: String(body.author || 'MAFIVERA-Team').slice(0, 120),
    updatedAt: new Date().toISOString()
  };

  PropertiesService.getScriptProperties().setProperty(STORE_KEY, JSON.stringify(data));
  return json_({ok:true,updatedAt:data.updatedAt});
}

function setSyncSecret() {
  // Einmal manuell ausführen, nachdem du das Secret angepasst hast.
  PropertiesService.getScriptProperties().setProperty(
    'DISCORD_SYNC_SECRET',
    'HIER_EIN_LANGES_ZUFAELLIGES_SECRET_EINTRAGEN'
  );
}

function json_(obj, status) {
  // Apps Script ContentService liefert keinen frei gesetzten HTTP-Status.
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
