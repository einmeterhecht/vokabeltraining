*Note: The source code of this project, the vocabulary lists and the documentation of this project are mainly written in german.*

# Vokabeltraining
Dieser webbasiertes Vokabeltrainer ist für ein Lernen mit Tastatureingabe gedacht.

## Alleinstellungsmerkmale
- Aufgeräumtes Design
- Keine Logins, Ladezeiten, Cookies & Bezahlung
- Keine Möglichkeit, den Fortschritt online zu speichern
- Keine motivierenden Botschaften. Bei einer richtigen Antwort kommt kommentarlos das nächste Wort.
- Schnelle Eingaben. Zum Absenden einer Antwort kann man statt Enter die Leertaste drücken. Sobald im Eingabefeld ein Leerschlag mehr ist als in der richtigen Lösung, wird die Antwort abgesendet.
- Die Wörter lernen, nicht die Formatierung. In den Listen wird auf einen einheitlichen Stil geachtet. Beispiel: Synonyme sind immer mit ; getrennt. So muss man nur die Wörter lernen - und nicht, wo ein Schrägstrich, ein Komma oder ein Semikolon verwendet wird.
- Kein überflüssiges Tippen. So wird etwa bei englischen Verben kein "to " vorangestellt.
- Optimierung für Französisch: Es wird angezeigt, wenn ein Wort mit einem bestimmten (le/la/l'/les) oder unbestimmten (un/une) Artikel anfängt.
- Ein ebenso banaler wie überlegener Algorithmus.

## Lernalgorithmus
1. Die Vokabeln werden in einer zufälligen Reihenfolge abgefragt.
2. Hat man eine Vokabel nicht gewusst, so wird das Wort - nachdem wieder gefragt (nachdem 5 andere Wörter abgefragt wurden).
3. Hat man es dann richtig, kommt es nicht mehr.
4. Hat man es sich bis zum zweiten Versuch nicht gemerkt, wird es wiederholt, bis man es richtig hatte (mit jeweils 5 anderen Wörtern dazwischen).
5. Zur Sicherheit wird nach 14 Wörtern noch einmal überprüft, ob man es sich immer noch gemerkt hat. Wenn nicht, wird wieder zu 4. gesprungen.

## Online verfügbare Listen
Der Grossteil meiner gut 8000 Vokabeln umfassenden Datenbank ist nicht gut formattiert, nicht sinnvoll getrennt, nicht von mir abgetippt und teils urheberrechtlich geschützt. Verfügbar sind aber:

[Englisch auf 23. Februar 2023](einmeterhecht.github.io/vokabeltraining/abfragen.html?folder=english&file=2023-01-13)