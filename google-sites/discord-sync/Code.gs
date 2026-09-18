/**
 * MAFIVERA – Discord → Google Sites synchronisation
 *
 * Google Apps Script:
 * 1. Neues Apps-Script-Projekt erstellen.
 * 2. Code einfügen.
 * 3. setupSyncSecret() einmal manuell ausführen.
 * 4. Deploy → New deployment → Web app.
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Den /exec-Link für den Discord-Bot verwenden.
 *
 * POST body:
 * {
 *   "secret": "...",
 *   "text": "Neue Gebäude kommen nächste Woche.",
 *   "author": "MAFIVERA-Team"
 * }
 */

const STORE_KEY = 'MAFIVERA_WHAT_NEXT';
const SECRET_KEY = 'DISCORD_SYNC_SECRET';

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
  const date = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString('de-DE', {timeZone:'Europe/Berlin'})
    : '';

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
    '<div class="meta">Von ' + safeAuthor +
    (date ? ' · Aktualisiert: ' + escapeHtml_(date) : '') +
    '</div></section></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const secret = PropertiesService.getScriptProperties().getProperty(SECRET_KEY);
  if (!secret) return json_({ok:false,error:'secret_not_configured'});

  let body;
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return json_({ok:false,error:'invalid_json'});
  }

  if (body.secret !== secret) return json_({ok:false,error:'unauthorized'});

  const text = String(body.text || '').trim().slice(0, 4000);
  if (!text) return json_({ok:false,error:'empty_text'});

  const data = {
    text,
    author: String(body.author || 'MAFIVERA-Team').trim().slice(0, 120),
    updatedAt: new Date().toISOString()
  };

  PropertiesService.getScriptProperties().setProperty(STORE_KEY, JSON.stringify(data));
  return json_({ok:true,updatedAt:data.updatedAt});
}

/**
 * Einmal manuell im Apps-Script-Editor ausführen.
 * Der erzeugte Schlüssel erscheint nur im Ausführungsprotokoll.
 */
function setupSyncSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty(SECRET_KEY);

  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
    props.setProperty(SECRET_KEY, secret);
  }

  console.log('MAFIVERA_SYNC_SECRET=' + secret);
  return secret;
}

function json_(obj) {
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
