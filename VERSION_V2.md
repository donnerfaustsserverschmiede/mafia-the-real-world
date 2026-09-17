# MAFIVERA V2 — Stabilized Test Build

**Stand:** 17.09.2026
**Status:** Öffentliche Testphase
**Stable ref:** `v2-stable`

## V2-Stabilisierung
- Ein zentraler Game-Runtime-Pfad statt konkurrierender Karten-/Marker-Engines.
- Ressourcen- und Gebäudemarker werden jetzt von einem stabilen V2-Marker-Manager verwaltet und nicht bei jeder Kartenbewegung neu erzeugt.
- Sichtbare Marker bleiben beim normalen Verschieben der Karte bestehen; nur beim Wechsel des Kartenbereichs werden Marker hinzugefügt bzw. entfernt.
- Legacy-Marker-Ausgabe des Haupt-Runtimes ist ausgeblendet, damit keine doppelten Marker mehr entstehen.
- Dealer als eigener V2-Controller: ein Marker, bestehender Marker wird bei Positionsupdates verschoben statt neu erzeugt.
- Dealer-Alarm bleibt klickbar und öffnet direkt das Angebot.
- Kartenbewegungen werden nicht mehr durch konkurrierende Marker-Engines überschrieben.
- Vorhandene Spielstände und Supabase-Daten bleiben unverändert.
- Die öffentliche `main`-Version ist auf die V2-Testphase ausgerichtet.

## Testversion
Die Spieler testen weiterhin die veröffentlichte GitHub-Pages-Version des Spiels. Der Stand dieses Dokuments ist zusätzlich im Branch `v2-stable` eingefroren.
