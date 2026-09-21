# MAFIVERA — Version 5 ist da

**Version 5 · 22.09.2026**

Version 5 bündelt die aktuellen großen Änderungen und Fehlerbehebungen von MAFIVERA – The Real World.

## Marsch- & Gebietssystem
- Marschsystem repariert: Truppen können wieder korrekt entsendet werden.
- Gebiete werden nach erfolgreicher Ankunft korrekt dem Spieler übertragen.
- Truppen können wieder zuverlässig zurückgerufen werden.
- Der Fehler durch das fehlende PostgreSQL-pg_net-Schema wurde behoben.
- Push-Fehler können Spielaktionen künftig nicht mehr zurückrollen.

## Mafia-Familien
- Neues Mafia-Rangsystem: Don, Underboss, Consigliere und Soldat.
- Familienmitglieder können innerhalb der erlaubten Rangfolge befördert werden.
- Beförderungen sind serverseitig abgesichert und können nur vom Don der jeweiligen Familie durchgeführt werden.
- Bestehende Familien- und Bewerbungsfunktionen bleiben kompatibel.

## Admin-System
- Admin-Zentrale vom normalen Spiel-Drawer entkoppelt.
- Eigenes Admin-Overlay mit eigenem Scrollbereich.
- Stabilere Touch- und Klicksteuerung auf Mobilgeräten.
- Spielerprofile lassen sich wieder aus der Admin-Zentrale öffnen.
- Schließen, Zurückkehren und erneutes Öffnen wurden stabilisiert.
- Bestehende Admin-Hierarchie und Master-Berechtigung bleiben erhalten.

## Lootbox-System
- Globale Lootbox-Infrastruktur integriert.
- Lootboxen werden zeitgesteuert in der Umgebung aktiver Spieler erzeugt.
- Belohnungen können Geld, Material, Waffenteile, Reputation, fertige Drogen und Waffen enthalten.
- Geöffnete Lootboxen werden global als beansprucht geführt.

## Waffenhändler
- Waffenhändler erscheint stündlich mit zufälligem Startzeitpunkt innerhalb der Stunde.
- Zufällige Position, Waffenart, Menge und Preis.
- Waffenhändler benötigt keine Waffenfabrik, um zu erscheinen.

## Push-Benachrichtigungen
- Push-System technisch überarbeitet.
- VAPID-/Service-Worker-Anbindung aktualisiert.
- Push-Abonnements werden serverseitig gespeichert.
- Push-Dispatch läuft über die MAFIVERA Push Edge Function.
- Automatische Reparatur ergänzt: Wenn die Browser-/Android-Berechtigung bereits erteilt ist, aber das Push-Abonnement fehlt, versucht MAFIVERA beim Öffnen der Einstellungen die Registrierung erneut.
- Push-Versand darf keine Spieltransaktion mehr abbrechen.

## Allgemeine Stabilität
- Cache-Versionen aktualisiert.
- Diverse UI-, Interaktions- und Synchronisationsprobleme behoben.
- Bestehende Master-, Admin-, Familien- und Spielsysteme bleiben erhalten.

---

# Version 5 ist da

MAFIVERA entwickelt sich weiter: Gebietseroberung, Märsche, Familien, Admin-System, Lootboxen, Waffenhandel und Benachrichtigungen wurden weiter ausgebaut und stabilisiert.

Danke an alle Spieler und Tester, die Fehler melden und damit helfen, MAFIVERA weiterzuentwickeln.

Weitere Informationen, Updates und Support gibt es im offiziellen Discord.
