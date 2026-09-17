# MAFIVERA V2 — Stabilized Test Build

**Stand:** 17.09.2026
**Status:** Öffentliche Testphase
**Stable ref:** `v2-stable`

## V2-Stabilisierung
- Ein zentraler Game-Runtime-Pfad statt konkurrierender Karten-/Marker-Engines.
- Legacy-Marker-Engine stillgelegt, damit keine doppelten Layer mehr flackern.
- Dealer als eigener V2-Controller: ein Marker, bestehender Marker wird bei Positionsupdates verschoben statt neu erzeugt.
- Dealer-Alarm bleibt klickbar und öffnet direkt das Angebot.
- Kartenbewegungen werden nicht mehr durch konkurrierende Marker-Engines überschrieben.
- Vorhandene Spielstände und Supabase-Daten bleiben unverändert.
- Die öffentliche `main`-Version ist auf die V2-Testphase ausgerichtet.

## Testversion
Die Spieler testen weiterhin die veröffentlichte GitHub-Pages-Version des Spiels. Der Stand dieses Dokuments ist zusätzlich im Branch `v2-stable` eingefroren.
