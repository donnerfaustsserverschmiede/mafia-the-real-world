# MAFIVERA – Google Sites Setup

## Ziel

Google Sites ist die öffentliche Website. Das Spiel und Discord bleiben die eigentlichen externen Dienste.

- **Game:** https://donnerfaustsserverschmiede.github.io/mafia-the-real-world/
- **Discord:** https://discord.gg/qRRP2EJ69f
- **Dynamischer Bereich:** „Was noch kommt“

Google Sites unterstützt das Einbetten externer Webseiten, Apps-Script-Web-Apps und HTML/CSS/JavaScript über **Einfügen → Einbetten**. Manche externe Seiten erlauben keine Einbettung. 

## Empfohlene Navigation

1. Startseite
2. Spielen
3. Über MAFIVERA
4. Über uns
5. Was noch kommt
6. News & Changelog
7. Discord
8. Regeln
9. Rechtliches
   - Impressum
   - Datenschutz
   - Nutzungsbedingungen
   - Haftungsausschluss

Die vollständigen Texte liegen in `google-sites/content.md`.

## Logo

Vorhanden im Repository:
`assets/mafivera-logo.webp`

Alternativ:
`assets/mafivera-logo.svg`

## Discord → „Was noch kommt“

### 1. Google Apps Script

1. Google Drive öffnen.
2. **Neu → Mehr → Google Apps Script**.
3. Den Inhalt von `google-sites/discord-sync/Code.gs` als `Code.gs` einsetzen.
4. Funktion `setupSyncSecret` einmal manuell ausführen.
5. Im Ausführungsprotokoll den ausgegebenen Wert `MAFIVERA_SYNC_SECRET=...` kopieren.
6. **Bereitstellen → Neue Bereitstellung → Web-App**.
7. Ausführen als: **Ich**.
8. Zugriff: **Jeder**.
9. Den erzeugten `/exec`-Link kopieren.

Das Secret gehört **nicht** in Google Sites und nicht in öffentliches GitHub.

### 2. Google Sites

Auf der Seite **„Was noch kommt“**:

**Einfügen → Einbetten → URL**

Dort den Apps-Script-`/exec`-Link einfügen.

Die Seite zeigt automatisch die zuletzt vom Discord-Bot veröffentlichte Nachricht.

### 3. Discord-Bot

Der vorhandene Bot kann den Listener aus `discord_sync.py` übernehmen.

Benötigte Umgebungsvariablen:

```
DISCORD_BOT_TOKEN=DEIN_BOT_TOKEN
MAFIVERA_SITES_WEBAPP_URL=DEIN_APPS_SCRIPT_EXEC_LINK
MAFIVERA_SITES_SYNC_SECRET=DEIN_GENERIERTES_SECRET
```

Optional kann statt des Kanalnamens eine feste Kanal-ID verwendet werden:

```
MAFIVERA_DISCORD_CHANNEL_ID=123456789012345678
```

Ohne Kanal-ID wird standardmäßig `#was-noch-kommt` verwendet.

Im Discord Developer Portal muss für den Bot der **Message Content Intent** aktiviert sein.

### Ablauf

```
Discord
  ↓
#was-noch-kommt
  ↓
MAFIVERA Discord-Bot
  ↓
Google Apps Script
  ↓
Google Sites
  ↓
🚧 WAS NOCH KOMMT
```

Jede neue Nachricht im Zielkanal ersetzt die bisher angezeigte Ankündigung.

## Rechtliches

Das Impressum und die Datenschutzerklärung sind absichtlich mit Platzhaltern angelegt, solange die tatsächlichen Anbieter-, Kontakt- und Datenverarbeitungsangaben fehlen.

Für Deutschland ist insbesondere § 5 DDG für die Anbieterkennzeichnung relevant. Die konkreten Angaben hängen von der tatsächlichen Person/Rechtsform und Tätigkeit des Betreibers ab.

Die Datenschutzerklärung muss die tatsächlich eingesetzten Dienste und Datenflüsse abbilden. Vor Veröffentlichung müssen deshalb insbesondere Google Sites, Game/Hosting, Supabase, Authentifizierung, Discord, Logs, GPS/Standortfunktionen und eventuelle Analyse-/Trackingdienste geprüft werden.

**Keine Platzhalter veröffentlichen.**

## Veröffentlichung

Google Sites kann nach der Vorschau über **Veröffentlichen** öffentlich bereitgestellt werden. Die Sichtbarkeit sollte auf **Öffentlich** gestellt werden, wenn die Website ohne Anmeldung erreichbar sein soll.
