# MAFIVERA – neues Ressourcen-, Karten- und Bausystem

## Verbindliche Spielregeln

- Die bisherige quadratische Raster-/Gebietslogik wird langfristig durch einen rasterlosen GPS-Scan- und Baubereich ersetzt.
- Der Scanradius um den aktuellen Spielerstandort ist zugleich der Baubereich.
- Innerhalb dieses Radius dürfen Gebäude frei und ohne Raster platziert werden.
- Ressourcenverteilungen sind je Ressource unabhängig. Mehrere Ressourcen können am selben Ort gleichzeitig vorkommen.
- Die Karte zeigt alle Ressourcen gleichzeitig. Der Farbton identifiziert die Ressource; die Deckkraft/Intensität visualisiert deren Konzentration.
- 0 % bedeutet kein Vorkommen und wird vollständig transparent dargestellt.
- Beim Antippen eines Standorts zeigt ein Detailfenster alle dort vorhandenen Ressourcen samt exaktem Prozentwert.
- Konzentrationen werden serverseitig erzeugt und dauerhaft gespeichert. Scannen darf keine neuen Zufallswerte würfeln.
- Der exakte Prozentwert beeinflusst Gewinnung, Anbau- bzw. Produktionsleistung; die Farbe allein ist keine diskrete Qualitätsstufe.

## Ressourcen-Farbpalette (erste Vorschläge)

| Ressource | Farbe | Hex | Gebäudekategorie |
|---|---|---|---|
| Cannabis | Grün | #22c55e | Anbaufläche |
| Mehl | Warmweiß | #f4f1e8 | passende Gewinnungs-/Verarbeitungsanlage |
| Waffenteile | Stahlgrau | #7b8490 | Werkstatt/Produktionsanlage |
| Koka | Gelb | #eab308 | Anbaufläche |
| Meth | Violett | #a855f7 | Labor |
| Chemikalien | Cyan | #06b6d4 | Labor |
| Tabak | Braun | #a16207 | Anbaufläche |
| Metalle | Orange | #d97706 | Werkstatt/Produktionsanlage |

Die Palette ist konfigurierbar. Warmweiß braucht auf hellen Kartenkacheln eine dunkle Kontur.

## Gebäude

### Anbaufläche
Viereckiges Gebäude für natürliche Pflanzen. Pflanzen werden abhängig von der Spielerstufe freigeschaltet, wachsen über eine definierte Zeit und werden anschließend geerntet. Der Standortwert der jeweiligen Pflanze beeinflusst den Ertrag.

### Labor
Kleines rundes Gebäude mit zwei getrennten Funktionen:
1. Gewinnung/Sammlung der passenden Ressource abhängig vom Standortwert.
2. Verarbeitung eingelagerter Rohstoffe zu Endprodukten; der Standortwert steigert zusätzlich die Verarbeitungsgeschwindigkeit.

Gewinnung und Verarbeitung laufen getrennt und müssen getrennt balancierbar sein.

## Technischer Datenvertrag

Ein Standortdatensatz enthält Koordinaten und eine Konzentration je Ressourcen-ID (0–100). Die Kartenansicht rendert pro Ressource eine unabhängige transparente Ebene. Der Browser darf keine autoritativen Konzentrationswerte generieren. Serverseitige Validierung prüft Standort, Scanradius, Baubereich und Gebäudeberechtigung.

## Umsetzung in Etappen

1. Ressourcen-IDs, Farbpalette und Datenvertrag bereitstellen (dieser Commit).
2. Kartenraster aus der sichtbaren Kartenansicht entfernen, ohne bestehende Daten zu löschen.
3. Serverseitige persistente Ressourcenverteilungen und Scan-Endpunkt implementieren.
4. Mehrere überlagerte Ressourcen-Heatmaps und Standort-Detailfenster integrieren.
5. GPS-Scan-/Baubereich als gemeinsamen Kreis anzeigen.
6. Freie Gebäudeplatzierung und standortabhängige Bauprüfung umsetzen.
7. Anbau, Gewinnung und Laborverarbeitung auf die neuen Standortwerte umstellen.

## Sicherheits- und Datenschutzanforderungen

- Keine präzisen GPS-Koordinaten öffentlich anzeigen.
- Standort- und Bauaktionen serverseitig validieren.
- Standort- und Scanabfragen auf den aktuellen Spieler-Radius begrenzen.
- Sichere Abstände/Schutzbereiche für sensible Orte und Privatgrundstücke vorsehen.
