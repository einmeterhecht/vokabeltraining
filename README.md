---
layout: default
title: Anleitung
---

Dieser webbasiertes Vokabeltrainer ist für ein Lernen mit Tastatureingabe optimiert.

## Letzte Änderungen:
- "to " am Wortanfang kann weggelassen werden
- Was in Klammern steht, kann man weglassen, sogar wenn es mehrere Teile in Klammern gibt
- Wenn man mit einer Liste durch ist, kann man jetzt mit nur den nicht gewussten Fragen weiterlernen.
- Man kann nun tauschen, in welche Richtung gelernt wird. Dafür gibt es auf der rechten Seite einen &#x21c5;-Knopf.
- Trennzeichen (Komma, Semikolon, Schrägstriche) und Klammern können jetzt ganz weggelassen werden.

## Alleinstellungsmerkmale
- Aufgeräumtes Design
- Keine Logins, Ladezeiten, Cookies & Bezahlung
- Keine motivierenden Botschaften. Bei einer richtigen Antwort kommt kommentarlos das nächste Wort.
- Schnelle Eingaben. Zum Absenden einer Antwort kann man statt Enter die Leertaste drücken. Sobald im Eingabefeld ein Leerschlag mehr ist als in der richtigen Lösung, wird die Antwort abgesendet. Hat man etwas falsches eingegeben, kann man die Leertaste oder Enter drücken, um weiterzumachen (Wort wird wiederholt) oder "a" drücken, um "meine Antwort war richtig" zu sagen.
- Die Wörter lernen, nicht die Formatierung. Ob Wörter mit Semikolon, Komma, Schrägstrich, Leerzeichen getrennt sind, spielt keine Rolle.
- Kein überflüssiges Tippen. Die Vokabeln in den Lernlisten sind speziell kurz gehalten.
- Optimierung für Französisch: Es wird angezeigt, wenn ein Wort mit einem bestimmten (le/la/l'/les) oder unbestimmten (un/une) Artikel anfängt.
- Ein ebenso banaler wie überlegener Lernalgorithmus.

## Lernalgorithmus
1. Die Vokabeln werden in einer zufälligen Reihenfolge abgefragt.
2. Hat man eine Vokabel nicht gewusst, so wird das Wort - nachdem wieder gefragt (nachdem 5 andere Wörter abgefragt wurden).
3. Hat man es dann richtig, kommt es nicht mehr.
4. Hat man es sich bis zum zweiten Versuch nicht gemerkt, wird es wiederholt, bis man es richtig hatte (mit jeweils 5 anderen Wörtern dazwischen).
5. Zur Sicherheit wird nach 14 Wörtern noch einmal überprüft, ob man es sich immer noch gemerkt hat. Wenn nicht, wird wieder zu 4. gesprungen.

## Online verfügbare Listen

[Häufigste französische Präpositionen](/vokabeltraining/abfragen?folder=franz&file=praepositionen)

[Häufigste französische Adverbien](/vokabeltraining/abfragen?folder=franz&file=adverbien)


*Note: The source code, the vocabulary lists and the documentation of this project are mainly written in german.*
*And PLEASE don't look at the source unless you are looking for examples of how not to write code.*
