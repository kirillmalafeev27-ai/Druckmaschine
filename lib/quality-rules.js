'use strict';

/**
 * Qualitätsregeln, die für JEDE Aufgabe gelten — unabhängig vom Thema.
 * Sie sind der Grund, warum eine Aufgabe nicht primitiv wird.
 */

/**
 * SUBSTANZREGEL — die wichtigste Regel des ganzen Generators.
 * Sie verhindert Aufgaben, bei denen der Lernende nur ein einzelnes Füllwort
 * anklickt, während drei offensichtlich kaputte Varianten daneben stehen.
 */
const OPTION_SUBSTANCE = `SUBSTANZ DER OPTIONEN — die wichtigste Regel:
Eine Option muss die VOLLSTÄNDIGE Zielstruktur enthalten, nie nur ein einzelnes Element daraus.

- Infinitiv mit zu → die ganze Infinitivgruppe ("morgen früh aufzustehen") oder ganze Sätze.
  VERBOTEN ist die Optionsliste "zu / – / zum / um zu". Das prüft nichts: Wer die Konstruktion kennt, erkennt sie am ersten Blick, und wer sie nicht kennt, rät.
- Kasus, Artikel, Adjektivdeklination → die ganze Nominalphrase (Artikelwort + Adjektiv + Nomen): "ihrer neuen Kollegin".
  VERBOTEN ist die Optionsliste "dem / den / der / des" ohne Nomen.
- Perfekt, Plusquamperfekt, Passiv, Futur, Modalverben → der ganze Verbalkomplex (Hilfs-/Modalverb + Partizip/Infinitiv), am besten als Mehrfachlücke.
- Wortstellung, Nebensätze, Satzklammer, Negationsposition → IMMER vollständige Sätze als Optionen.
- Relativsätze → mindestens Relativpronomen samt Verbstellung, besser der ganze Relativsatz.

EINZIGE AUSNAHME: Ein einzelnes Wort als Option ist zulässig, wenn das Zielphänomen tatsächlich genau dieses eine Wort IST — die Wahl der Konjunktion (als/wenn/wann), die Bedeutung eines Modalverbs, die Wahl der Präposition bei fester Rektion, ein Pronomen.
Dann gilt zusätzlich: Der Kontext muss die Entscheidung allein tragen (Situation, Minidialog, eindeutige Signalwörter), und der Aufgabensatz muss mindestens acht Wörter umfassen.
Wenn du eine Einwortoption schreibst, prüfe: Steht die Entscheidung wirklich in diesem Wort — oder hast du die Struktur nur zerlegt, um es dir leicht zu machen?`;

/**
 * Distraktoren tragen die Qualität einer MC-Aufgabe. Drei kaputte Varianten
 * neben einer offensichtlichen Lösung sind keine Aufgabe, sondern eine Anzeige.
 */
const DISTRACTOR_QUALITY = `QUALITÄT DER FALSCHEN OPTIONEN:
1. Jeder Distraktor bildet einen REAL BELEGTEN Lernerfehler ab — etwas, das ein Lernender auf diesem Niveau tatsächlich schreibt. Keine erfundenen Wortsalate, keine Fantasieformen.
2. Mindestens ZWEI der drei Distraktoren müssen attraktiv sein: Sie wären in einem NACHBARKONTEXT korrekt (anderer Kasus, andere Zeitform, andere Konjunktion, anderes Genus). Wer die Regel nicht beherrscht, muss sie ernsthaft in Erwägung ziehen.
3. Jeder Distraktor scheitert an GENAU EINER Sache, und diese Sache gehört zum Thema. Ein Distraktor, der zusätzlich eine falsche Personalendung, ein falsches Wort oder einen Tippfehler enthält, ist wertlos — der Lernende schließt ihn aus, ohne das Thema zu verstehen.
4. Alle vier Optionen sind ÄHNLICH LANG und gleich gebaut. Die auffällig längste oder kürzeste Option verrät sonst die Lösung.
5. Alle vier Optionen verwenden dasselbe Wortmaterial. Wechselnder Wortschatz zwischen den Optionen macht die Aufgabe zum Vokabeltest.
6. Ein Distraktor DARF für sich genommen wohlgeformt sein, wenn die Anweisung ihn eindeutig ausschließt (falsche Zeitform bei "ins Präteritum umformen", falsche Richtung bei einer wohin-Situation). Dann muss die Anweisung die Zielform exakt benennen.
7. Die Position der richtigen Antwort wird über die Aufgaben GLEICHMÄSSIG verteilt.`;

/**
 * Die Verbotsliste. Jeder Punkt beschreibt eine Aufgabe, die im fertigen Spiel
 * schon aufgetaucht ist oder typischerweise auftaucht.
 */
const ANTI_PATTERNS = `AUSSCHUSS — diese Aufgaben darfst du NICHT erzeugen:
1. DIE FÜLLWORT-AUFGABE: eine Lücke, in die ein einzelnes Funktionswort gehört, mit drei offensichtlich kaputten Varianten daneben (Musterfall: "zu / – / zum / zu dem" beim Thema Infinitiv mit zu). Siehe Substanzregel — baue stattdessen die ganze Struktur in die Optionen.
2. DIE KONGRUENZ-AUFGABE: Die Lösung folgt schon aus der Übereinstimmung von Subjekt und Verb oder mechanisch aus dem Subjekt (wir→uns, ihr→euch), ohne dass eine Kasus-, Positions- oder Rektionsentscheidung nötig wäre.
3. DIE MÜLL-OPTION: Distraktoren, die kein Mensch wählen würde, weil sie offensichtlicher Unsinn sind.
4. DIE DOPPELTE LÖSUNG: zwei Optionen sind grammatisch korrekt (besonders häufig bei Wortstellung, wo Inversionen ebenfalls richtig sind, und bei Präsens gegen Futur).
5. DIE THEMENFREMDE FALLE: Der Distraktor scheitert an etwas, das mit dem Thema nichts zu tun hat.
6. DER KONTEXTLOSE SATZ: Der Satz liefert nicht genug Information, um die Form eindeutig zu bestimmen (Vergangenheit ohne Zeitsignal, Wechselpräposition ohne wohin/wo-Signal, Imperativ ohne erkennbare Anrede).
7. DIE EINTÖNIGE SERIE: alle Aufgaben eines Blocks nach demselben Muster, mit demselben Subjekt, demselben Verb oder derselben Satzlänge.
8. DER ABGESCHNITTENE SATZ: unvollständige Sätze, ausgelassene Satzzeichen, drei Punkte statt Inhalt.
9. DIE VERRATENE LÖSUNG: Die richtige Option ist die einzige, die natürlich klingt, weil die anderen drei gar keine deutschen Sätze sind.`;

/** Der Deckungstest ist die schärfste Selbstprüfung. */
const COVER_TEST = `DER DECKUNGSTEST — wende ihn auf JEDE Aufgabe an, bevor du sie ausgibst:
Stell dir einen Lernenden vor, der das Thema NICHT beherrscht, aber sonst gut Deutsch kann.
Decke gedanklich das Zielphänomen ab und frage: Kann er die Aufgabe trotzdem lösen — über Subjekt-Verb-Kongruenz, über den Wortschatz, über die Optionslänge, über den Ausschluss von Unsinn?
Wenn ja, ist die Aufgabe Ausschuss. Formuliere sie neu, sodass die Entscheidung wirklich am Thema hängt.`;

/**
 * Mischungsregel: Ein Block darf nicht aus zehn gleich gebauten Aufgaben bestehen.
 */
function buildMixRule(count, formatIds) {
  const total = Math.max(1, Number(count) || 10);
  const maxPerFormat = Math.max(2, Math.ceil(total * 0.4));
  const minFormats = total >= 8 ? 4 : total >= 5 ? 3 : 2;

  return `MISCHUNG DES BLOCKS (${total} Aufgaben):
- Verwende mindestens ${minFormats} VERSCHIEDENE Aufgabenformate aus dem Katalog.
- Kein Format darf öfter als ${maxPerFormat}-mal vorkommen.
- Mindestens zwei Aufgaben müssen aus den anspruchsvollen Formaten stammen: Umformung, Satzverbindung, Fehlerkorrektur oder Bedeutungsunterscheidung.
- Erlaubte Formate für dieses Thema: ${formatIds.join(', ')}.
- Gib bei jeder Aufgabe an, welches Format du verwendet hast.
- Variiere außerdem Subjekte, Verben, Personen, Numeri und Satzlängen. Zwei Aufgaben mit demselben Verb im selben Muster sind eine Aufgabe zu viel.`;
}

/** Abschließende Selbstprüfung, die das Modell Punkt für Punkt durchgehen soll. */
const SELF_CHECK = `SELBSTPRÜFUNG — gehe JEDE Aufgabe einzeln durch, bevor du sie ausgibst:
1. Setze die richtige Option ein: Ist der Satz grammatisch einwandfrei und natürlich? Kasus, Genus, Numerus, Konjugation, Wortstellung, Rechtschreibung?
2. Setze jede falsche Option ein: Enthält der Satz genau einen klaren Fehler — und liegt dieser Fehler im Thema?
3. Gibt es wirklich nur EINE richtige Antwort? Prüfe besonders Inversionen, Präsens gegen Futur, Perfekt gegen Präteritum, verschiebbare Angaben im Mittelfeld.
4. Erfüllen die Optionen die Substanzregel? Steht die ganze Zielstruktur in der Option?
5. Sind alle vier Optionen ähnlich lang, gleich gebaut und aus demselben Wortmaterial?
6. Besteht die Aufgabe den Deckungstest?
7. Passt die Aufgabe zum Niveau — Wortschatz, Satzlänge, Struktur?
8. Unterscheidet sie sich von den übrigen Aufgaben des Blocks in Format, Wortschatz und Satzbau?
Wenn ein Punkt nicht erfüllt ist, schreibe die Aufgabe neu, statt sie auszugeben.`;

module.exports = {
  OPTION_SUBSTANCE,
  DISTRACTOR_QUALITY,
  ANTI_PATTERNS,
  COVER_TEST,
  SELF_CHECK,
  buildMixRule,
};
