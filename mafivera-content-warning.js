/* MAFIVERA CONTENT WARNING — permanent startup gate
 * This screen is intentionally shown for 10 seconds before the game starts.
 * Do not remove or bypass this gate when changing other game systems.
 */
(() => {
  'use strict';

  const WARNING_ID = 'mtrw-content-warning';
  const DURATION_MS = 10000;

  function waitForWarning() {
    if (document.getElementById(WARNING_ID)) return Promise.resolve();

    return new Promise(resolve => {
      const overlay = document.createElement('section');
      overlay.id = WARNING_ID;
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="mtrw-warning-card">
          <div class="mtrw-warning-icon">⚠️</div>
          <div class="mtrw-warning-kicker">WICHTIGER HINWEIS</div>
          <h1>Fiktiver In-Game-Inhalt</h1>
          <p>
            MAFIVERA ist ein fiktives Spiel. Alle dargestellten Handlungen,
            Gegenstände, Organisationen und Situationen sind ausschließlich
            <strong>In-Game-Inhalte</strong> und dürfen keinesfalls als
            Vorbild oder Anleitung für das echte Leben verstanden werden.
          </p>
          <p>
            Das Spiel behandelt unter anderem <strong>Drogen, Waffen,
            Gewalt und organisierte Kriminalität</strong>. Diese Inhalte
            dienen ausschließlich dem Spielgeschehen und der fiktiven
            Darstellung.
          </p>
          <p class="mtrw-warning-safety">
            <strong>MAFIVERA ist ein Spiel ab 18 Jahren.</strong>
            Spieler unter 18 Jahren werden ausdrücklich aufgefordert,
            dieses Spiel nicht zu spielen. Diese Inhalte sind nicht für
            Minderjährige bestimmt und dürfen nicht nachgeahmt werden.
            Für die Missachtung dieses Hinweises übernehmen wir keine Haftung.
          </p>
          <p class="mtrw-warning-discord">
            Weitere Informationen und Hinweise findest du auf unserem Discord-Server.
          </p>
          <div class="mtrw-warning-countdown" aria-live="polite">
            Spielstart in <strong><span id="mtrw-warning-seconds">10</span> Sekunden</strong>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.id = 'mtrw-content-warning-style';
      style.textContent = `
        #mtrw-content-warning{
          position:fixed;inset:0;z-index:2147483647;
          display:flex;align-items:center;justify-content:center;
          padding:24px;box-sizing:border-box;
          background:radial-gradient(circle at 50% 20%,#1b2430 0%,#070a0f 58%,#030508 100%);
          color:#f4f6f8;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        }
        #mtrw-content-warning .mtrw-warning-card{
          width:min(680px,100%);box-sizing:border-box;
          padding:32px 28px 28px;border:1px solid #6f5a24;
          border-radius:22px;background:rgba(10,14,20,.97);
          box-shadow:0 20px 80px rgba(0,0,0,.65);
          text-align:center;
        }
        #mtrw-content-warning .mtrw-warning-icon{font-size:46px;margin-bottom:8px}
        #mtrw-content-warning .mtrw-warning-kicker{
          color:#e0b84d;font-size:13px;font-weight:800;
          letter-spacing:.16em;margin-bottom:8px;
        }
        #mtrw-content-warning h1{
          margin:0 0 18px;font-size:clamp(25px,6vw,38px);
          line-height:1.12;
        }
        #mtrw-content-warning p{
          margin:12px auto;max-width:590px;
          color:#d8dde5;font-size:16px;line-height:1.55;
        }
        #mtrw-content-warning strong{color:#fff}
        #mtrw-content-warning .mtrw-warning-safety{
          color:#f0cf78;font-weight:700;
        }
        #mtrw-content-warning .mtrw-warning-discord{
          color:#aeb9c7;font-size:14px;margin-top:18px;
        }
        #mtrw-content-warning .mtrw-warning-countdown{
          margin-top:24px;padding:14px 16px;border-radius:14px;
          background:#151c26;border:1px solid #303b49;
          color:#b9c3cf;font-size:15px;
        }
        #mtrw-content-warning .mtrw-warning-countdown strong{color:#e0b84d}
        @media(max-width:600px){
          #mtrw-content-warning{padding:14px}
          #mtrw-content-warning .mtrw-warning-card{padding:25px 18px 20px;border-radius:18px}
          #mtrw-content-warning p{font-size:14px}
          #mtrw-content-warning .mtrw-warning-icon{font-size:38px}
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(overlay);

      const secondsEl = overlay.querySelector('#mtrw-warning-seconds');
      const started = Date.now();
      const timer = setInterval(() => {
        const remaining = Math.max(0, DURATION_MS - (Date.now() - started));
        if (secondsEl) secondsEl.textContent = String(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          clearInterval(timer);
          overlay.remove();
          style.remove();
          resolve();
        }
      }, 100);
    });
  }

  window.__mtrwShowContentWarning = waitForWarning;
})();
