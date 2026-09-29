# MAFIVERA – Google Play Vorbereitung

MAFIVERA wird als Trusted Web Activity (TWA) für Android verpackt. Das eigentliche Spiel bleibt die bestehende Web-App.

## Konfiguration
- Paketname: `de.donnerfaust.mafivera`
- App-Name: `MAFIVERA – The Real World`
- Launcher: `MAFIVERA`
- Startpfad: `/mafia-the-real-world/?mtrw_app=1`
- Target SDK: Android 16 / API 36
- Minimum SDK: 23
- Android-Version: 1.0.0 / VersionCode 1

Google Play verlangt für neue Apps seit dem 31.08.2026 Target API 36 oder höher.

## Build
```bash
npm i -g @bubblewrap/cli
cd play
bubblewrap update
bubblewrap build
```

Bubblewrap erzeugt ein signiertes App Bundle (`app-release-bundle.aab`) für den Upload in die Play Console.

## Signatur
`mafivera-upload-key.jks` darf niemals ins Repository. Der private Uploadschlüssel muss sicher aufbewahrt werden.

Die endgültige `assetlinks.json` wird erst nach Einrichtung der Google-Play-App-Signatur erstellt, weil dafür der tatsächliche SHA-256-Fingerabdruck des von Google Play verwendeten App-Signaturschlüssels benötigt wird.

## Nächste Schritte
1. PWA online validieren.
2. Android-Projekt mit Bubblewrap generieren.
3. Uploadschlüssel lokal erzeugen.
4. AAB bauen und Android-Test durchführen.
5. Google-Play-App-Signatur einrichten.
6. SHA-256-Fingerabdruck übernehmen und `/.well-known/assetlinks.json` veröffentlichen.
7. Closed Test starten.
8. Danach Production Release beantragen.
