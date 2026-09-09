'use strict';

/**
 * Grammatikregeln je Thema.
 *
 * Jeder Eintrag hat vier Felder, und jedes davon landet an einer anderen Stelle
 * im Prompt:
 *
 *   rule    – der grammatische Kern. Formen, Ausnahmen, Richtig/Falsch-Paare.
 *             Das Modell soll hier nachschlagen, nicht aus dem Gedächtnis raten.
 *   design  – wie eine GUTE Aufgabe zu diesem Thema gebaut ist: welche
 *             Entscheidung der Lernende treffen muss und was der Satz dafür
 *             liefern muss.
 *   formats – die Aufgabenformate aus exercise-formats.js, die zu diesem Thema
 *             passen. Die Reihenfolge ist eine Empfehlung.
 *   traps   – Distraktoren, die auf echten Lernerfehlern beruhen.
 *   avoid   – Aufgaben, die bei diesem Thema regelmäßig Ausschuss ergeben.
 *
 * Diese Datei ist in Morskoy und Druckmaschine identisch.
 */

const GRAMMAR_RULES = {

  // ─── Verben ──────────────────────────────────────────────────────

  "Präsens": {
    rule: `Regelmäßige Endungen: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en.
Bindevokal -e- nach Stamm auf -t/-d/-chn/-ffn/-gn: du arbeitest, er arbeitet, du findest, er redet, es regnet, du öffnest.
Stamm auf -s/-ss/-ß/-z/-tz: 2. Person Singular nur -t: du heißt, du tanzt, du sitzt (NICHT "du heißtst").
Stammvokalwechsel NUR in der 2. und 3. Person Singular: e→i (sprechen→du sprichst/er spricht, helfen→hilft, essen→isst, geben→gibt, nehmen→nimmt, treffen→trifft), e→ie (lesen→liest, sehen→sieht, empfehlen→empfiehlt), a→ä (fahren→fährt, schlafen→schläft, tragen→trägt, laufen→läuft, halten→hält), o→ö (stoßen→stößt).
Der Vokalwechsel gilt NICHT im Plural: wir sprechen, ihr sprecht, sie sprechen.
Unregelmäßig: sein (bin, bist, ist, sind, seid, sind), haben (habe, hast, hat, haben, habt, haben), werden (werde, wirst, wird, werden, werdet, werden), wissen (weiß, weißt, weiß, wissen, wisst, wissen).
Präsens steht für die Gegenwart UND mit Zeitangabe für die Zukunft: "Morgen fahre ich nach Berlin."`,
    design: `Prüfe genau eine Entscheidung: den Stammvokalwechsel in der 2./3. Person Singular, den Bindevokal -e-, die Sonderform nach -s/-ss/-ß/-z oder eine unregelmäßige Form (sein/haben/werden/wissen).
Das Subjekt muss im Satz stehen und eindeutig sein, damit die Person nicht geraten werden muss.`,
    formats: ["luecke","mehrfachluecke","fehlerkorrektur","dialog","satzvarianten"],
    traps: `Fehlender Vokalwechsel (er sprecht, er fahrt, er lest), Vokalwechsel im Plural (wir sprichen), fehlender Bindevokal (du arbeitst, er findt), doppeltes -st nach Zischlaut (du heißtst, du tanzst), falsche Person (er spreche), Infinitiv statt konjugierter Form.`,
    avoid: `Keine Aufgaben mit völlig regelmäßigen Verben wie "machen" oder "spielen" — dort gibt es nichts zu entscheiden.
Kein Wechsel der Zeitform zwischen den Optionen: alle 4 Optionen stehen im Präsens.`,
  },

  "Perfekt": {
    rule: `sein + Partizip II bei: Bewegungsverben (gehen→ist gegangen, fahren→ist gefahren, kommen→ist gekommen, fliegen→ist geflogen, laufen→ist gelaufen), Zustandsänderung (einschlafen→ist eingeschlafen, aufwachen, sterben, werden, bleiben). haben + Partizip II bei ALLEN anderen Verben (machen→hat gemacht, essen→hat gegessen, lesen→hat gelesen). Partizip II: ge-...-t (regelmäßig: gemacht, gekauft), ge-...-en (unregelmäßig: gegangen, geschrieben). Verben auf -ieren: KEIN ge- (studiert, telefoniert). Trennbare: ge- zwischen Präfix und Stamm (ein·ge·kauft, auf·ge·standen). Untrennbare (be-, er-, ver-, ent-, zer-, emp-, miss-): KEIN ge- (besucht, verstanden, erzählt).`,
    design: `Prüfe genau EINE Sache pro Aufgabe: entweder die Wahl des Hilfsverbs (haben/sein) ODER die Form des Partizips II — niemals beides gleichzeitig.
Bei der Hilfsverb-Aufgabe steht in allen 4 Optionen dasselbe, korrekte Partizip II; variiert wird nur haben/sein in der richtigen Person.
Bei der Partizip-Aufgabe steht in allen 4 Optionen dasselbe, korrekte Hilfsverb; variiert wird nur das Partizip.
Das Partizip II gehört im Hauptsatz ans Satzende (Satzklammer).`,
    formats: ["mehrfachluecke","umformung","satzvarianten","fehlerkorrektur","bedeutung"],
    traps: `Falsches Hilfsverb (ist gemacht, hat gefahren), ge- bei -ieren-Verben (gestudiert, getelefoniert), ge- bei untrennbaren Verben (gebesucht, geverstanden), ge- am falschen Platz bei trennbaren Verben (geeinkauft statt eingekauft), regelmäßiges Partizip statt unregelmäßigem (gegeht statt gegangen, geschreibt statt geschrieben), Mischform (gegangt, geesst).`,
    avoid: `Keine Aufgabe, deren Lösung schon aus dem übrigen Satz ablesbar ist.
Keine Optionen, die zusätzlich in der Person falsch sind (er haben gemacht) — der Fehler wäre dann kein Perfekt-Fehler.`,
  },

  "Präteritum": {
    rule: `Regelmäßige (schwache) Verben: Stamm + -te, -test, -te, -ten, -tet, -ten: machte, machtest, machte, machten, machtet, machten. Bindevokal -e- nach -t/-d: arbeitete, redete, öffnete.
Unregelmäßige (starke) Verben: Stammvokalwechsel OHNE -te-, Endungen: –, -st, –, -en, -t, -en: gehen→ich ging, du gingst, er ging, wir gingen, ihr gingt, sie gingen.
Wichtige starke Formen: gehen→ging, kommen→kam, sehen→sah, geben→gab, nehmen→nahm, sprechen→sprach, lesen→las, schreiben→schrieb, fahren→fuhr, finden→fand, trinken→trank, sitzen→saß, stehen→stand, bleiben→blieb, rufen→rief, fallen→fiel, laufen→lief, essen→aß, helfen→half, treffen→traf, ziehen→zog, fliegen→flog, schließen→schloss.
Mischverben: Vokalwechsel UND -te-: bringen→brachte, denken→dachte, kennen→kannte, nennen→nannte, rennen→rannte, wissen→wusste, brennen→brannte.
Unregelmäßig: sein (war, warst, war, waren, wart, waren), haben (hatte, hattest, hatte, hatten, hattet, hatten), werden (wurde, wurdest, wurde, wurden, wurdet, wurden).
Modalverben verlieren den Umlaut: können→konnte, müssen→musste, dürfen→durfte, mögen→mochte; wollen→wollte, sollen→sollte.
1. und 3. Person Singular sind IMMER gleich: ich ging / er ging, ich machte / er machte.
Gebrauch: geschriebene Erzählung und Bericht; gesprochen vor allem bei sein, haben, werden und den Modalverben.`,
    design: `Prüfe die Bildung der Präteritumform: starke Verben ohne -te-, Mischverben mit Vokalwechsel UND -te-, Modalverben ohne Umlaut, Bindevokal bei -t/-d.
Der Satz muss die Vergangenheit eindeutig markieren (gestern, damals, als Kind, letztes Jahr), damit die Zeitform nicht geraten werden muss.`,
    formats: ["umformung","mehrfachluecke","satzvarianten","fehlerkorrektur"],
    traps: `Regelmäßige Bildung bei starken Verben (gehte, sehte, nehmte), fehlende Endung in der 2. Person (du ging), Konjunktiv-II-Form statt Präteritum (könnte statt konnte, müsste statt musste, hätte statt hatte), Perfekt statt Präteritum, falsche Vokalstufe (er gang, er sprich), Mischverb ohne Vokalwechsel (kennte, denkte).`,
    avoid: `Keine Aufgabe ohne Vergangenheitssignal im Satz — sonst wäre auch das Präsens richtig und es gäbe zwei korrekte Antworten.
Keine Vermischung von Präteritum und Perfekt in den Optionen, wenn beide Formen im Satz korrekt wären.`,
  },

  "Futur I": {
    rule: `Bildung: werden (konjugiert, Position 2) + Infinitiv (Satzende). werden: ich werde, du wirst, er/sie/es wird, wir werden, ihr werdet, sie/Sie werden.
Der Infinitiv steht IMMER am Satzende und NIE mit "zu": "Ich werde morgen früh aufstehen." | Falsch: "Ich werde morgen früh zu aufstehen."
Mit Modalverb stehen zwei Infinitive am Ende: "Er wird arbeiten müssen."
Im Nebensatz steht "werden" ganz am Ende, hinter dem Infinitiv: "Ich glaube, dass er kommen wird." | Falsch: "..., dass er wird kommen."
Bedeutung: Zukunft (oft mit Zeitangabe), Vermutung über die Gegenwart ("Er wird wohl krank sein."), feste Absicht oder Versprechen.
Im Alltag steht für die Zukunft oft das Präsens mit Zeitangabe: "Morgen fahre ich nach Berlin." Beides ist korrekt — innerhalb einer Aufgabe darf aber nur EINE Option grammatisch möglich sein.
"werden" als Vollverb (= etwas werden) ist etwas anderes: "Er wird Arzt." (kein Futur).`,
    design: `Prüfe die Konjugation von "werden", die Endstellung des Infinitivs oder die Verbstellung im Nebensatz.
In allen 4 Optionen bleibt das Vollverb dasselbe; variiert wird nur die Form von "werden" oder die Wortstellung.`,
    formats: ["umformung","satzvarianten","wortstellung","fehlerkorrektur"],
    traps: `Falsche werden-Form (du werdest, er werde, ihr werden), "zu" vor dem Infinitiv, Partizip II statt Infinitiv (Ich werde gegangen), Infinitiv nicht am Satzende, im Nebensatz "wird" vor dem Infinitiv, Konjunktiv statt Futur (würde statt werde).`,
    avoid: `Keine Aufgabe, in der Präsens und Futur beide korrekt wären — dann gibt es zwei Lösungen.
Wenn die werden-Form schon mechanisch aus dem Subjektpronomen folgt, verlege die Entscheidung auf die Wortstellung oder den Nebensatz.`,
  },

  "Imperativ": {
    rule: `du-Form: Präsensstamm ohne Endung und OHNE Pronomen: "Komm!", "Geh!", "Mach!". Das -e ist meist optional ("Sag!"/"Sage!"), aber Pflicht nach -t/-d/-ig/-chn/-ffn: "Arbeite!", "Rede!", "Entschuldige!", "Öffne!".
e→i/ie bleibt im Imperativ erhalten, und zwar OHNE -e: "Sprich!", "Lies!", "Nimm!", "Gib!", "Sieh!", "Iss!", "Hilf!", "Vergiss!".
a→ä fällt im Imperativ WEG: "Fahr!" (nicht "Fähr!"), "Schlaf!", "Lauf!", "Trag!", "Halt!".
ihr-Form: wie im Präsens, nur ohne Pronomen: "Kommt!", "Lest!", "Arbeitet!", "Sprecht!".
Sie-Form: Infinitiv + Sie: "Kommen Sie!", "Lesen Sie!", "Nehmen Sie Platz!" — das Pronomen "Sie" steht IMMER dabei.
wir-Form (Aufforderung an alle): "Gehen wir!", "Fangen wir an!"
Unregelmäßig: sein → "Sei!" / "Seid!" / "Seien Sie!"; haben → "Hab!" / "Habt!" / "Haben Sie!"; werden → "Werde!" / "Werdet!" / "Werden Sie!".
Trennbare Verben: Präfix ans Ende: "Steh auf!", "Ruf mich an!", "Machen Sie das Fenster auf!"
Das Verb steht auf Position 1. Abtönung im Mittelfeld: "Komm bitte mal her!"`,
    design: `Der Satz muss die Anrede eindeutig festlegen — durch Anrede, Namen, Kontext oder ein Possessivpronomen ("Kinder, ...!", "Herr Meier, ...!", "Nimm deine Jacke ...").
Prüfe dann: Vokalwechsel (bleibt bei e→i, fällt bei a→ä), Pflicht-e nach -t/-d, Pronomen bei der Sie-Form, Position des trennbaren Präfixes.`,
    formats: ["umformung","dialog","satzvarianten","fehlerkorrektur"],
    traps: `Fälschlich umgelautete du-Form (Fähr!, Schläf!), -st in der du-Form (Sprichst!, Kommst!), Pronomen in der du-Form (Komm du!), fehlendes "Sie" (Kommen!), Vokalwechsel in der ihr-Form (Liest! statt Lest!), fehlendes Pflicht-e (Arbeit!, Red!), Präfix am falschen Platz (Aufsteh!).`,
    avoid: `Keine Aufgabe, in der die Anrede offen bleibt — dann sind mehrere Imperativformen korrekt.
Optionen aus verschiedenen Anredeformen nur dann, wenn der Satz die Anrede eindeutig markiert.`,
  },

  "Modalverben": {
    rule: `Bedeutung: können (Fähigkeit, Möglichkeit), müssen (Notwendigkeit, Zwang), dürfen (Erlaubnis), nicht dürfen (VERBOT), sollen (Auftrag oder Empfehlung eines anderen), wollen (eigener Wille), mögen (Vorliebe), möchten (höflicher Wunsch).
Präsens mit Vokalwechsel im Singular und OHNE Endung in der 1./3. Person Singular: ich kann, du kannst, er kann, wir können, ihr könnt, sie können. Ebenso: muss/musst/muss, darf/darfst/darf, will/willst/will, soll/sollst/soll (kein Wechsel!), mag/magst/mag, möchte/möchtest/möchte.
Satzklammer: Modalverb auf Position 2, Vollverb als INFINITIV am Satzende, NIE mit "zu": "Er kann den Bahnhof finden." | Falsch: "Er kann den Bahnhof zu finden." | Falsch: "Er kann findet den Bahnhof."
Im Nebensatz steht das Modalverb ganz am Ende: "..., weil er den Bahnhof finden kann."
Bedeutungsfalle: "nicht müssen" = keine Notwendigkeit, NICHT Verbot. Das Verbot heißt "nicht dürfen": "Du darfst hier nicht rauchen." gegenüber "Du musst nicht kommen." (= es ist nicht nötig).
Das Vollverb kann wegfallen, wenn es klar ist: "Ich muss nach Hause."`,
    design: `Zwei saubere Aufgabentypen:
1) BEDEUTUNG: Der Kontext (Schild, Regel, Wunsch, Fähigkeit, fremder Auftrag) legt genau ein Modalverb fest; alle 4 Optionen stehen in derselben, korrekt konjugierten Person, variiert wird nur das Modalverb.
2) FORM/POSITION: ein Modalverb, variiert werden Konjugation, "zu" vor dem Infinitiv oder die Satzklammer.
Mische beide Typen innerhalb einer Aufgabe NICHT.`,
    formats: ["dialog","bedeutung","satzvarianten","mehrfachluecke","fehlerkorrektur"],
    traps: `Endung in der 1./3. Person Singular (ich kanne, er musse), fehlender Vokalwechsel (ich könne statt kann), "zu" vor dem Infinitiv, konjugiertes Vollverb statt Infinitiv, Vollverb nicht am Satzende, "nicht müssen" statt "nicht dürfen" beim Verbot, "wollen" statt "sollen" bei fremdem Auftrag, "mögen" statt "möchten".`,
    avoid: `Keine Aufgabe, in der mehrere Modalverben inhaltlich passen — der Kontext muss genau eines erzwingen.
Keine Bedeutungsaufgabe, deren Optionen sich zusätzlich in der Person unterscheiden: dann prüfst du Kongruenz statt Bedeutung.`,
  },

  "Modalverben in Präteritum": {
    rule: `Präteritum der Modalverben: KEIN Umlaut, immer mit -te-: können→konnte, müssen→musste, dürfen→durfte, mögen→mochte, wollen→wollte, sollen→sollte.
Endungen: ich konnte, du konntest, er/sie/es konnte, wir konnten, ihr konntet, sie/Sie konnten. 1. und 3. Person Singular sind gleich.
Der Umlaut gehört zum Konjunktiv II und ist im Präteritum FALSCH: konnte (Vergangenheit) gegenüber könnte (Möglichkeit, Höflichkeit); musste/müsste; durfte/dürfte; mochte/möchte.
Satzklammer wie im Präsens: Modalverb auf Position 2, Vollverb als Infinitiv am Satzende, NIE mit "zu": "Ich konnte damals nicht schwimmen."
Im Nebensatz steht das Modalverb am Ende: "..., weil ich nicht schwimmen konnte."
Das Perfekt der Modalverben ist im Alltag selten — die Vergangenheit steht im Präteritum. Bei zwei Infinitiven gilt der Ersatzinfinitiv: "Ich habe arbeiten müssen." (nicht "gemusst").
Bedeutung wie im Präsens: konnte (war fähig), musste (war nötig), durfte (hatte die Erlaubnis), durfte nicht (war verboten), wollte (hatte den Willen), sollte (hatte den Auftrag), mochte (mochte gern).`,
    design: `Der Satz muss die Vergangenheit eindeutig markieren (früher, damals, als ich klein war, gestern, letztes Jahr).
Variiere gezielt EINEN Punkt: Umlaut ja/nein (Präteritum gegen Konjunktiv II), Person/Numerus, Zeitform (Präsens gegen Präteritum) oder die Satzklammer.
Wechsle die Aufgabenformen ab: Lücke mit Infinitiv-Hinweis in Klammern, Umformung eines Präsenssatzes, Wahl der korrekten Satzvariante.`,
    formats: ["umformung","mehrfachluecke","satzvarianten","dialog","fehlerkorrektur"],
    traps: `Unnötiger Umlaut (könnte, müsste, dürfte, möchte) als Konjunktiv-II-Falle, falsche Person (ich konnten, wir konnte), Präsens statt Präteritum (kann statt konnte), "zu" vor dem Infinitiv, Vollverb nicht am Satzende, Partizip statt Ersatzinfinitiv (habe gemusst arbeiten).`,
    avoid: `Keine Aufgabe ohne Vergangenheitssignal — sonst ist auch das Präsens korrekt.
Der Konjunktiv II (könnte, müsste, dürfte) ist hier immer Distraktor und NIE die richtige Lösung.`,
  },

  "Trennbare Verben": {
    rule: `Trennbare Präfixe (BETONT): ab-, an-, auf-, aus-, bei-, ein-, mit-, nach-, vor-, zu-, zurück-, weg-, los-, her-, hin-, fest-, teil-, statt-, vorbei-, weiter-. Untrennbare Präfixe (unbetont): be-, ge-, er-, ver-, zer-, ent-, emp-, miss-. Wechselnd je nach Bedeutung: durch-, über-, um-, unter-, wider-, wieder-.
Hauptsatz (Präsens/Präteritum): Präfix ans SATZENDE: "Ich stehe jeden Tag um 7 Uhr auf." | Falsch: "Ich aufstehe um 7 Uhr."
Nebensatz: wieder zusammen, am Ende: "..., weil ich um 7 Uhr aufstehe." | Falsch: "..., weil ich um 7 Uhr stehe auf."
Perfekt: ge- ZWISCHEN Präfix und Stamm: aufgestanden, eingekauft, angerufen, mitgekommen. Untrennbare: KEIN ge- (besucht, verstanden).
Mit Modalverb: Infinitiv zusammen am Ende: "Ich muss früh aufstehen." Mit zu: zu zwischen Präfix und Stamm, EIN Wort: "Ich habe vor, früh aufzustehen." | Falsch: "... früh zu aufstehen."
Imperativ: "Steh auf!", "Ruf mich an!", "Kommt mit!"
AUFGABENDESIGN: Die Lücke prüft die POSITION des Präfixes bzw. die Form (aufgestanden / aufzustehen / aufstehen). Alle 4 Optionen enthalten dasselbe Verb in derselben Person — variiere NUR Trennung, ge-Stellung oder zu-Stellung, niemals die Personalendung.`,
    design: `Prüfe die Position des Präfixes, nicht das Vokabular: Hauptsatz (Präfix am Ende), Nebensatz (alles zusammen am Ende), Perfekt (ge- in der Mitte), Modalverb (Infinitiv zusammen am Ende), zu-Infinitiv ("zu" zwischen Präfix und Stamm).
In allen 4 Optionen steht dasselbe Verb in derselben Person; variiert wird nur Position oder Form des Präfixes.`,
    formats: ["satzvarianten","wortstellung","mehrfachluecke","fehlerkorrektur"],
    traps: `Präfix bleibt im Hauptsatz am Verb (Ich aufstehe um sieben), Präfix wird im Nebensatz abgetrennt (..., weil ich auf um sieben stehe), ge- vor dem Präfix (geaufstanden), untrennbares Verb fälschlich getrennt (Ich stehe das Problem ver), "zu" vor dem ganzen Verb statt in der Mitte (zu aufstehen), Präfix im Mittelfeld statt am Ende.`,
    avoid: `Keine Aufgabe, die nur die Bedeutung des Präfixes abfragt (an-/auf-/aus-) — das ist Wortschatz, nicht Grammatik.
Keine Optionen mit unterschiedlichen Verben oder Zeitformen.`,
  },

  "Reflexive Verben": {
    rule: `Reflexivpronomen Akkusativ: mich, dich, sich, uns, euch, sich. Dativ: mir, dir, sich, uns, euch, sich — Akkusativ und Dativ unterscheiden sich NUR in der 1./2. Person Singular (mich/mir, dich/dir)!
Dativ steht, wenn ein zusätzliches Akkusativobjekt da ist (Körperteil, Kleidung, Gegenstand): "Ich wasche mir die Hände.", "Er putzt sich die Zähne.", "Sie zieht sich den Mantel an.", "Ich kaufe mir ein Buch." Ohne Akkusativobjekt steht Akkusativ: "Ich wasche mich.", "Ich ziehe mich an."
Echte reflexive Verben (nur mit Reflexivpronomen möglich): sich beeilen, sich erholen, sich freuen (über+Akk / auf+Akk), sich schämen, sich verlieben (in+Akk), sich bedanken (für+Akk), sich erkälten, sich verspäten, sich befinden, sich erinnern (an+Akk), sich interessieren (für+Akk), sich kümmern (um+Akk), sich bewerben (um+Akk), sich ärgern (über+Akk), sich unterhalten (mit+Dat über+Akk).
Unechte reflexive Verben (auch mit anderem Objekt): sich waschen, sich kämmen, sich anziehen, sich setzen, sich legen, sich verletzen.
Wortstellung: Reflexivpronomen direkt nach dem finiten Verb ("Ich freue mich auf den Urlaub."). Bei Inversion nach dem Pronomen-Subjekt ("Morgen treffe ich mich mit Anna."), aber VOR einem Nomen-Subjekt ("Morgen trifft sich mein Bruder mit Anna."). Im Nebensatz nach dem Subjekt, Verb am Ende ("..., weil ich mich auf den Urlaub freue."). Perfekt IMMER mit haben: "Ich habe mich beeilt." Mit Modalverb: "Ich muss mich beeilen." Imperativ: "Beeil dich!", "Beeilt euch!", "Beeilen Sie sich!"
Reziprok (gegenseitig) = Plural + uns/euch/sich, bei Bedarf mit "einander": "Wir treffen uns.", "Sie helfen einander."

AUFGABENDESIGN für dieses Thema — halte dich STRIKT daran:
- Das Verb steht in ALLEN 4 Optionen in der GLEICHEN, korrekt konjugierten Form. Variiere AUSSCHLIESSLICH das Reflexivpronomen (oder ausschließlich seine Position). Eine falsche Option darf NIEMALS eine falsche Personalendung enthalten — sonst prüft die Aufgabe Konjugation statt Reflexivpronomen.
- VERBOTEN (klassische Schrott-Aufgabe): "Wir ___ heute Abend im Park." mit den Optionen "treffen sich / treffen uns / trifft euch / trefft uns". Hier verraten Kongruenz und Person die Lösung; man muss die Regel gar nicht kennen.
- Vermeide Aufgaben, bei denen das Pronomen mechanisch aus dem Subjekt folgt (wir→uns, ihr→euch, ich→mich). Baue stattdessen eine echte Entscheidung ein:
  1) Dativ vs. Akkusativ in der 1./2. Person Singular: "Ich putze ___ die Zähne." (mir / mich / sich / mir die) — richtig: mir. "Zuerst muss ich ___ waschen, dann ___ die Haare kämmen."
  2) Wortstellung: "Heute ___ ." mit "trifft sich mein Bruder / trifft mein Bruder sich / ..." oder Nebensatz/Perfekt/Imperativ.
  3) Rektion echter reflexiver Verben: "Ich interessiere mich ___ Geschichte." (für / an / über / auf), "Sie freut sich ___ das Geschenk."
  4) sich als 3. Person Sg./Pl. gegen ein flektiertes Pronomen: "Der Junge wäscht ___ ." (sich / ihn / sein / ihm) — richtig: sich.
- Wenn ein Lernender die Aufgabe allein durch Subjekt-Verb-Kongruenz lösen kann, ist sie Ausschuss — formuliere sie neu.`,
    design: `Baue eine echte Entscheidung ein, keine Kongruenzaufgabe. Erlaubte Aufgabenkerne:
1) Dativ gegen Akkusativ in der 1./2. Person Singular ("Ich putze ___ die Zähne." → mir), weil sich nur dort die Formen unterscheiden.
2) Position des Reflexivpronomens (Inversion, Nebensatz, Perfekt, Imperativ).
3) Rektion echter reflexiver Verben (sich interessieren FÜR, sich freuen AUF/ÜBER, sich ärgern ÜBER).
4) "sich" in der 3. Person gegen ein flektiertes Personalpronomen ("Der Junge wäscht ___." → sich, nicht ihn/ihm).
Das Verb steht in allen 4 Optionen in derselben, korrekt konjugierten Form.`,
    formats: ["mehrfachluecke","bedeutung","satzvarianten","fehlerkorrektur","luecke"],
    traps: `Akkusativ statt Dativ bei zusätzlichem Akkusativobjekt (Ich wasche mich die Hände), "sich" bei ich/du/wir/ihr (Ich freue sich), Personalpronomen statt Reflexivpronomen (Er wäscht ihn — gemeint ist er selbst), falsche Präposition bei echten reflexiven Verben, Reflexivpronomen an falscher Position (Heute sich trifft mein Bruder).`,
    avoid: `VERBOTEN ist die klassische Schrott-Aufgabe "Wir ___ heute im Park." mit "treffen sich / treffen uns / trifft euch / trefft uns": die Verbform verrät die Lösung.
Wenn ein Lernender die Aufgabe allein durch Subjekt-Verb-Kongruenz oder mechanisch aus dem Subjekt (wir→uns, ihr→euch) lösen kann, ist sie Ausschuss.`,
  },

  "Verben mit Präpositionen": {
    rule: `Feste Verb-Präposition-Verbindungen — Präposition UND Kasus muss man auswendig lernen.
Akkusativ: warten auf, denken an, sich erinnern an, sich freuen auf (Zukunft) / über (Gegenwart+Vergangenheit), sich interessieren für, sich kümmern um, bitten um, sich bewerben um, sich ärgern über, sprechen über, achten auf, sich verlassen auf, sich vorbereiten auf, stolz sein auf, böse sein auf.
Dativ: teilnehmen an, leiden unter, träumen von, abhängen von, fragen nach, suchen nach, helfen bei, sich beschäftigen mit, sich treffen mit, gehören zu, zufrieden sein mit, einverstanden sein mit, Angst haben vor, sich fürchten vor.
Präpositionaladverb bei SACHEN: da(r)- + Präposition — darauf, daran, darüber, dafür, damit, davon: "Ich warte darauf." Bei PERSONEN: Präposition + Pronomen: "Ich warte auf ihn." | Falsch: "Ich warte darauf." (wenn eine Person gemeint ist)
Fragewort bei Sachen: wo(r)- + Präposition — worauf, woran, worüber, wofür. Bei Personen: "Auf wen wartest du?"
Richtig: "Ich denke oft an meine Großmutter." | Falsch: "Ich denke oft über meine Großmutter."
AUFGABENDESIGN: Prüfe Präposition UND Kasus gemeinsam (z.B. "Ich warte ___ Bus." → auf den / auf dem / an den / für den). Verb, Nomen und Satzbau bleiben in allen 4 Optionen gleich.`,
    design: `Die Aufgabe prüft die feste Rektion: entweder die Präposition selbst oder den Kasus nach der Präposition.
Das Verb muss im Satz stehen, damit die Verbindung überhaupt bestimmbar ist. Alle 4 Optionen meinen inhaltlich dasselbe Objekt.`,
    formats: ["luecke","dialog","mehrfachluecke","fehlerkorrektur"],
    traps: `Wörtliche Übertragung aus der Muttersprache (denken über statt denken an, warten für statt warten auf), richtige Präposition mit falschem Kasus (auf den / auf dem), Verwechslung nah verwandter Verbindungen (sich freuen auf gegen über, sprechen über gegen mit, sich interessieren für gegen an).`,
    avoid: `Keine Aufgabe, in der zwei Präpositionen mit dem Verb möglich sind (sich freuen auf/über), solange der Kontext nicht eindeutig Zukunft oder Anlass festlegt.
Keine Optionen, die zusätzlich einen Artikel- oder Numerusfehler enthalten.`,
  },

  "Lassen": {
    rule: `Vier Bedeutungen: 1) ERLAUBEN: "Meine Eltern lassen mich abends ausgehen." 2) VERANLASSEN (jemand anders macht es): "Ich lasse mein Auto reparieren." (nicht ich repariere!) 3) ZURÜCKLASSEN/VERGESSEN: "Ich habe meinen Schlüssel zu Hause gelassen." 4) sich lassen = Passiv-Ersatz (= können + Passiv): "Das Fenster lässt sich nicht öffnen." (= kann nicht geöffnet werden)
Konjugation: ich lasse, du lässt, er/sie/es lässt, wir lassen, ihr lasst, sie lassen. Präteritum: ließ.
Satzbau: lassen auf Position 2, Infinitiv am Satzende OHNE "zu": "Er lässt seine Haare schneiden." | Falsch: "Er lässt seine Haare zu schneiden."
Perfekt MIT Infinitiv → Ersatzinfinitiv "lassen", NICHT "gelassen": "Ich habe mein Auto reparieren lassen." | Falsch: "Ich habe mein Auto reparieren gelassen."
Perfekt OHNE Infinitiv → "gelassen": "Ich habe die Tasche im Auto gelassen."
Imperativ: "Lass uns gehen!" (du), "Lasst uns gehen!" (ihr), "Lassen Sie uns gehen!"`,
    design: `Prüfe genau eine Bedeutung bzw. Struktur: veranlassen (jemanden etwas machen lassen), zulassen/erlauben, unterlassen (sein lassen), "sich lassen" als Passiversatz oder den Ersatzinfinitiv im Perfekt.
Alle 4 Optionen behalten dasselbe Vollverb; variiert wird die Form von "lassen", die Position oder der Ersatzinfinitiv.`,
    formats: ["umformung","bedeutung","satzvarianten","fehlerkorrektur"],
    traps: `Partizip statt Ersatzinfinitiv im Perfekt ("habe schneiden gelassen" statt "habe schneiden lassen"), "zu" vor dem Infinitiv (Ich lasse das Auto zu reparieren), falscher Kasus beim Veranlasser (Ich lasse dem Mechaniker das Auto reparieren), Infinitiv nicht am Satzende, Passiv statt "sich lassen".`,
    avoid: `Keine Aufgabe, in der "lassen" und ein Modalverb gleichermaßen passen.
Keine Vermischung mehrerer lassen-Bedeutungen innerhalb einer Aufgabe.`,
  },

  // ─── Nomen, Artikel und Pronomen ─────────────────────────────────

  "Artikel": {
    rule: `Bestimmter Artikel: der (m), die (f), das (n), die (Pl) — bekannte oder schon erwähnte Dinge.
Unbestimmter Artikel: ein (m), eine (f), ein (n), im Plural KEIN Artikel — Neues oder Unbestimmtes. Negation: kein, keine, kein, keine (Pl).
Nullartikel bei: Eigennamen, den meisten Ländern (Deutschland, Frankreich), Berufen nach sein/werden ("Er ist Lehrer."), Stoffnamen und unbestimmten Mengen ("Ich trinke Kaffee.", "Wir kaufen Brot."), Sprachen ("Ich lerne Deutsch.").
Länder MIT Artikel: die Schweiz, die Türkei, die USA (Pl), der Iran, die Niederlande (Pl).
Genusregeln — Endungen: -ung, -heit, -keit, -schaft, -ion, -tät, -ei, -ik, -ur, -enz, -anz → die. -chen, -lein, -um, -ment, -tum, -nis (meist) → das. -er, -ling, -ismus, -or, -ant, -ist → der.
Bedeutungsgruppen: der (Tage, Monate, Jahreszeiten, Himmelsrichtungen, Wetter, Alkohol, Automarken); die (Bäume, Blumen, viele Früchte, Zahlen als Substantiv); das (Farben, Sprachen, substantivierte Verben: das Essen, das Lesen; Metalle).
Zusammengesetzte Nomen erben das Genus vom LETZTEN Wort: das Haus + die Tür → die Haustür; die Bahn + der Hof → der Bahnhof.
Verschmelzungen: an/in/bei/von/zu + dem → am, im, beim, vom, zum; zu + der → zur; an/in + das → ans, ins.`,
    design: `Prüfe entweder das Genus (bei klarer Kasusvorgabe) oder die Wahl bestimmt / unbestimmt / Nullartikel aus dem Kontext (erste Erwähnung gegen Wiederaufnahme, Beruf, Stoffname, Land).
Alle 4 Optionen stehen im selben Kasus, wenn das Genus geprüft wird — sonst prüfst du in Wahrheit den Kasus.`,
    formats: ["dialog","luecke","bedeutung","fehlerkorrektur"],
    traps: `Falsches Genus trotz eindeutiger Endung (der Zeitung, das Freiheit), Genus des ersten statt des letzten Gliedes im Kompositum (das Haustür), bestimmter Artikel bei der ersten Erwähnung, Artikel beim Beruf nach sein ("Er ist ein Lehrer." als Distraktor zu "Er ist Lehrer."), Artikel vor Ländernamen ohne Artikel (in der Deutschland), unverschmolzene Form, wo die Verschmelzung Pflicht ist.`,
    avoid: `Kein Genus-Raten ohne Signal: Das Nomen muss eine typische Endung, ein erkennbares Kompositum oder eine klare Bedeutungsgruppe haben.
Keine Aufgabe, in der bestimmter und unbestimmter Artikel beide zum Kontext passen.`,
  },

  "Nominativ": {
    rule: `Der Nominativ ist der Kasus des SUBJEKTS — Frage: wer? was? Er kongruiert mit dem finiten Verb.
Formen bestimmt: der, die, das, die (Pl). Unbestimmt: ein, eine, ein, – (Pl). Negativ/Possessiv: kein/keine/kein/keine, mein/meine/mein/meine.
Personalpronomen: ich, du, er, sie, es, wir, ihr, sie/Sie.
Auch das PRÄDIKATIV nach sein, werden, bleiben und heißen steht im Nominativ: "Der Mann ist ein guter Lehrer.", "Sie wird eine bekannte Ärztin.", "Er bleibt mein bester Freund." | Falsch: "Der Mann ist einen guten Lehrer."
Das Subjekt steht nicht immer auf Position 1: bei Inversion rückt es hinter das Verb ("Gestern kam mein Bruder."), bleibt aber im Nominativ.
Bei "es gibt" steht das Objekt im AKKUSATIV: "Es gibt einen Park." — nicht im Nominativ.
Adjektivendung im Nominativ Singular: nach der/die/das → -e; nach ein → -er (m), -e (f), -es (n); ohne Artikel → -er/-e/-es.`,
    design: `Prüfe die Abgrenzung Nominativ gegen Akkusativ: Subjekt und Prädikativ (Nominativ) gegen direktes Objekt (Akkusativ). Am schärfsten im Maskulinum, wo sich der/den und ein/einen unterscheiden.
Gute Kerne: Prädikativ nach sein/werden/bleiben, Subjekt bei Inversion, "es gibt" + Akkusativ als Kontrast.`,
    formats: ["luecke","satzvarianten","bedeutung","fehlerkorrektur"],
    traps: `Akkusativ im Prädikativ (Er ist einen guten Lehrer), Nominativ nach "es gibt" (Es gibt ein Park), Verwechslung von Subjekt und Objekt bei Inversion (Den Hund beißt der Mann), falsche Adjektivendung im Nominativ.`,
    avoid: `Keine Aufgabe nur mit Feminina oder Neutra: dort sind Nominativ und Akkusativ formgleich und es gibt nichts zu entscheiden.
Kein Verb, das den Kasus nicht eindeutig festlegt.`,
  },

  "Akkusativ": {
    rule: `Der Akkusativ ist der Kasus des direkten Objekts — Frage: wen? was?
Formen bestimmt: den (m), die (f), das (n), die (Pl). Unbestimmt: einen (m), eine (f), ein (n), – (Pl). kein: keinen/keine/kein/keine. Possessiv: meinen/meine/mein/meine.
NUR das Maskulinum verändert sich gegenüber dem Nominativ (der→den, ein→einen). Feminin, Neutrum und Plural sind formgleich.
Personalpronomen: mich, dich, ihn, sie, es, uns, euch, sie/Sie.
Reine Akkusativpräpositionen: durch, für, gegen, ohne, um, bis, entlang.
Transitive Verben mit Akkusativ: sehen, kaufen, essen, trinken, lesen, schreiben, brauchen, haben, finden, suchen, besuchen, fragen, verstehen, lieben, nehmen, tragen, bestellen.
"es gibt" + Akkusativ: "Es gibt einen Supermarkt."
Zeitangaben ohne Präposition stehen im Akkusativ: jeden Tag, nächste Woche, letzten Monat, diesen Sommer.
Wechselpräpositionen mit Akkusativ nur bei der Frage "wohin?" (Richtung).`,
    design: `Prüfe die Akkusativform im MASKULINUM — nur dort ist die Entscheidung sichtbar. Kerne: transitives Verb, Akkusativpräposition, "es gibt", Akkusativ-Zeitangabe, Abgrenzung zum Dativ bei Dativverben.
Alle 4 Optionen bezeichnen dasselbe Nomen im selben Numerus; variiert wird nur die Kasusform.`,
    formats: ["luecke","mehrfachluecke","satzvarianten","fehlerkorrektur"],
    traps: `Nominativ statt Akkusativ (Ich sehe der Mann), Dativ statt Akkusativ (für dem Freund, ohne meinem Bruder), Akkusativ nach Dativverben (Ich helfe den Mann), Akkusativ nach Dativpräpositionen (mit einen Freund), falsche Adjektivendung (einen guter Film).`,
    avoid: `Keine Aufgabe mit Feminin, Neutrum oder Plural als Zielform — sie sind mit dem Nominativ identisch und damit geschenkt.
Keine Wechselpräposition ohne eindeutiges wohin-Signal.`,
  },

  "Dativ": {
    rule: `Der Dativ ist der Kasus des indirekten Objekts — Frage: wem?
Formen bestimmt: dem (m), der (f), dem (n), den + Nomen-n (Pl: den Kindern, den Männern). Unbestimmt: einem, einer, einem, – (Pl). kein: keinem/keiner/keinem/keinen. Possessiv: meinem/meiner/meinem/meinen.
Merke: Im Dativ Plural bekommt das NOMEN ein -n, außer bei Plural auf -s: den Autos, den Kindern, den Frauen, den Männern.
Personalpronomen: mir, dir, ihm, ihr, ihm, uns, euch, ihnen/Ihnen.
Reine Dativpräpositionen: mit, nach, bei, seit, von, zu, aus, außer, gegenüber, ab, entgegen.
Dativverben (kein Akkusativ!): helfen, danken, gehören, gefallen, schmecken, passen, gratulieren, antworten, folgen, glauben (einer Person), begegnen, zuhören, vertrauen, fehlen, wehtun, ähneln, raten.
Verben mit Dativ UND Akkusativ: geben, schenken, zeigen, erklären, empfehlen, bringen, schicken, kaufen, sagen — der Dativ ist die Person, der Akkusativ die Sache: "Ich schenke meinem Bruder ein Buch."
Reihenfolge im Mittelfeld: Dativ vor Akkusativ bei Nomen ("Ich gebe dem Kind das Buch."), aber Pronomen zuerst und Akkusativ vor Dativ ("Ich gebe es dem Kind.", "Ich gebe es ihm.").
Wechselpräpositionen mit Dativ nur bei der Frage "wo?" (Position).`,
    design: `Prüfe eine echte Kasusentscheidung: Dativverb gegen transitives Verb, Dativpräposition, Dativ Plural mit -n am Nomen, oder Dativ gegen Akkusativ bei geben/schenken/zeigen.
Alle 4 Optionen behalten Nomen und Numerus; variiert wird nur die Kasusform.`,
    formats: ["luecke","mehrfachluecke","bedeutung","fehlerkorrektur"],
    traps: `Akkusativ nach Dativverben (Ich helfe meinen Bruder), Akkusativ nach Dativpräpositionen (mit meinen Freund, nach der Schule → nach die Schule), fehlendes -n im Dativ Plural (mit den Kinder), Vertauschung von Person und Sache (Ich schenke meinen Bruder ein Buch), falsche Adjektivendung (mit dem guter Freund).`,
    avoid: `Keine Aufgabe, in der Dativ und Akkusativ beide sinnvoll wären (etwa bei Wechselpräpositionen ohne wohin/wo-Signal).
Keine Optionen, die sich zusätzlich im Numerus unterscheiden.`,
  },

  "Genitiv": {
    rule: `Der Genitiv bezeichnet Zugehörigkeit — Frage: wessen?
Maskulinum/Neutrum: des/eines + Nomen mit -(e)s: des Mannes, des Autos, eines Kindes. Einsilbige Nomen meist -es (des Mannes), mehrsilbige -s (des Lehrers).
Femininum: der/einer + Nomen OHNE Endung: der Frau, einer Studentin.
Plural: der + Nomen ohne Endung: der Kinder, der Männer.
Adjektiv im Genitiv hat IMMER die Endung -en: des guten Mannes, der neuen Frau, der kleinen Kinder.
Genitivpräpositionen: wegen, trotz, während, innerhalb, außerhalb, statt/anstatt, aufgrund, dank (auch Dativ), laut.
Eigennamen: -s ohne Apostroph: "Annas Buch", "Peters Auto". Namen auf -s/-z/-x: Apostroph: "Hans' Buch".
Alternative mit "von" + Dativ (umgangssprachlich, bei Namen ohne Artikel und im Plural ohne Artikel obligatorisch): "das Auto von meinem Vater", "die Farbe von Blumen".
Der Genitiv steht NACH dem Bezugsnomen: "das Auto meines Vaters" | Falsch: "meines Vaters das Auto".`,
    design: `Prüfe genau einen Punkt: die Genitivform des Artikels, das -(e)s am maskulinen/neutralen Nomen, die Endung -en beim Adjektiv oder den Kasus nach einer Genitivpräposition.
Der Bezug muss eindeutig sein (wessen was?), damit nur eine Lösung passt.`,
    formats: ["luecke","umformung","mehrfachluecke","fehlerkorrektur"],
    traps: `Fehlendes -s am Nomen (des Mann, wegen des Wetter), -s beim Femininum (der Frau-s), Dativ statt Genitiv nach Genitivpräpositionen (wegen dem Wetter — umgangssprachlich verbreitet, hier als Distraktor), Adjektivendung -es/-er statt -en (des guter Mannes), Genitiv vor dem Bezugsnomen.`,
    avoid: `Keine Aufgabe, in der die von-Konstruktion gleichwertig richtig wäre — sonst gibt es zwei Lösungen.
Keine Optionen mit unterschiedlichem Numerus.`,
  },

  "N-Deklination": {
    rule: `Maskuline Nomen, die in ALLEN Fällen außer dem Nominativ Singular die Endung -n/-en bekommen.
Gruppe 1 — Maskulina auf -e: der Junge, der Kunde, der Kollege, der Neffe, der Zeuge, der Löwe, der Affe, der Russe, der Franzose, der Grieche.
Gruppe 2 — Personenbezeichnungen auf -ent, -ant, -ist, -at, -oge, -graf, -soph, -arch: der Student, der Praktikant, der Journalist, der Polizist, der Tourist, der Soldat, der Kandidat, der Biologe, der Fotograf, der Philosoph.
Gruppe 3 — Einzelfälle: der Mensch, der Nachbar, der Bauer, der Held, der Herr (Singular -n: dem Herrn / Plural -en: die Herren).
Formen: Nom. der Student | Akk. den Studenten | Dat. dem Studenten | Gen. des Studenten.
Gemischte Deklination (zusätzlich -s im Genitiv): der Name → des Namens, der Gedanke → des Gedankens, der Buchstabe, das Herz (n!) → des Herzens.
Die Endung steht AUCH nach Präpositionen: "mit meinem Kollegen", "für den Studenten", "ohne meinen Nachbarn", "Ich helfe dem Jungen."
Richtig: "Ich kenne den Studenten." | Falsch: "Ich kenne den Student."
NICHT n-Deklination: der Lehrer, der Arzt, der Freund, der Mann, der Sohn — diese bleiben unverändert. Falsch: "Ich kenne den Lehreren."
AUFGABENDESIGN: In allen 4 Optionen bleibt der Artikel im richtigen Kasus — variiere NUR die Nomen-Endung, oder prüfe Artikel + Endung gemeinsam. Verwende überwiegend echte n-Deklination-Nomen.`,
    design: `Prüfe, ob das n-Nomen außerhalb des Nominativ Singular die Endung -(e)n trägt. Der Satz muss den Kasus eindeutig festlegen — durch Verb, Präposition oder Objektstelle.
In allen 4 Optionen bleibt der Artikel korrekt; variiert wird nur die Nomenendung — oder umgekehrt Artikel bei fester Nomenform. Nicht beides.`,
    formats: ["luecke","mehrfachluecke","satzvarianten","fehlerkorrektur"],
    traps: `Fehlende -n-Endung im Akkusativ/Dativ/Genitiv (Ich sehe den Student, mit dem Kollege), -n schon im Nominativ Singular (Der Studenten kommt), fehlendes -s im Genitiv der Sondergruppe (des Namen statt des Namens), n-Endung bei einem Nomen, das gar nicht zur n-Deklination gehört.`,
    avoid: `Keine Aufgabe im Nominativ Singular — dort ist die Form endungslos und es gibt nichts zu entscheiden.
Keine Nomen, deren Zugehörigkeit zur n-Deklination unklar ist.`,
  },

  "Pronomen": {
    rule: `Personalpronomen — Nom: ich, du, er, sie, es, wir, ihr, sie/Sie. Akk: mich, dich, ihn, sie, es, uns, euch, sie/Sie. Dat: mir, dir, ihm, ihr, ihm, uns, euch, ihnen/Ihnen.
Das Pronomen richtet sich nach dem GRAMMATISCHEN Genus des Nomens, nicht nach dem Geschlecht: "Das Mädchen ist nett, es wohnt nebenan." "Wo ist der Tisch? — Ich habe ihn verkauft." "Wie findest du die Jacke? — Ich finde sie schön."
Der Kasus kommt vom Verb bzw. der Präposition im Satz: "Ich helfe ihm." (helfen + Dat) | "Ich sehe ihn." (sehen + Akk) | "ohne mich" (Akk), "mit mir" (Dat).
WORTSTELLUNG: Pronomen stehen VOR Nomen: "Ich gebe ihm das Buch." / "Ich gebe es dem Mann." Zwei Pronomen: AKKUSATIV vor DATIV: "Ich gebe es ihm." | Falsch: "Ich gebe ihm es."
Indefinitpronomen: man (Nom.) – einen (Akk.) – einem (Dat.): "Wenn man müde ist, hilft einem Kaffee." jemand/niemand, etwas/nichts, alle/alles, jeder/jede/jedes.
Demonstrativpronomen: dieser/diese/dieses (Endungen wie der/die/das), betontes der/die/das: "Den kenne ich!"
AUFGABENDESIGN: Der Kasus muss aus dem Verb oder der Präposition ableitbar sein, nicht aus der Person. Alle 4 Optionen enthalten Pronomen derselben Person in verschiedenen Kasus/Genera — variiere nie das Verb.`,
    design: `Der Bezug muss eindeutig sein: Genus und Numerus folgen dem BEZUGSNOMEN, der Kasus folgt der FUNKTION im Satz. Beides muss aus dem Satz ablesbar sein.
Kerne: Akkusativ gegen Dativ (ihn/ihm, sie/ihr), Genus des Bezugsnomens (das Mädchen → es), Reihenfolge zweier Pronomen, "es" als Platzhalter.`,
    formats: ["luecke","mehrfachluecke","dialog","fehlerkorrektur"],
    traps: `Kasus des Bezugsnomens statt der eigenen Funktion, Dativ statt Akkusativ (Ich sehe ihm), natürliches statt grammatisches Genus (das Mädchen → sie statt es), falsche Reihenfolge (Ich gebe ihm es statt Ich gebe es ihm), Possessiv- statt Personalpronomen.`,
    avoid: `Keine Aufgabe mit mehrdeutigem Bezug — wenn zwei Nomen im Satz infrage kommen, ist die Aufgabe Ausschuss.
Keine Optionen, die sich zusätzlich im Numerus unterscheiden, wenn der Kasus geprüft wird.`,
  },

  "Pronominaladverbien": {
    rule: `Pronominaladverbien ersetzen "Präposition + Pronomen", wenn sich der Bezug auf eine SACHE oder einen Sachverhalt richtet.
Bildung: da(r) + Präposition: damit, dafür, darauf, daran, darüber, davon, dazu, dabei, dadurch, danach, darin, darunter. Vor Vokal steht -r-: darauf, daran, darüber, darin, darum.
Frageform: wo(r) + Präposition: womit, wofür, worauf, woran, worüber, wovon, wozu, worin.
PERSONEN dagegen behalten Präposition + Pronomen: "Ich warte auf ihn." (nicht "darauf"), "Ich denke an sie." Frage nach Personen: "Auf wen wartest du?", "An wen denkst du?" — nicht "worauf/woran".
Vorausweisend auf einen Nebensatz oder Infinitivsatz: "Ich freue mich darauf, dich zu sehen.", "Ich denke daran, dass wir umziehen.", "Er wartet darauf, dass der Zug kommt."
Rückweisend auf schon Gesagtes: "Er hat ein neues Auto. — Ja, damit fährt er jeden Tag."
Die Präposition richtet sich nach der Rektion des Verbs: warten auf → darauf/worauf; sich freuen über → darüber/worüber; sich interessieren für → dafür/wofür; denken an → daran/woran.
Nicht möglich mit Präpositionen, die keine Verbrektion tragen (ohne, seit, gegenüber bei Personen).`,
    design: `Prüfe eine der drei Entscheidungen: Sache gegen Person (da(r)- gegen Präposition + Pronomen), die richtige Präposition aus der Verbrektion, oder das vorausweisende da(r)- vor einem dass-/Infinitivsatz.
Das Verb im Satz muss die Präposition eindeutig festlegen.`,
    formats: ["luecke","dialog","verbindung","fehlerkorrektur"],
    traps: `da(r)- bei Personen (Ich warte darauf statt auf ihn), Präposition + Pronomen bei Sachen (Ich warte auf es statt darauf), fehlendes -r- vor Vokal (daauf, daan), falsche Präposition aus der Muttersprache (dafür statt darauf bei warten), fehlendes vorausweisendes da(r)- vor dem dass-Satz, wo-Form statt da-Form im Aussagesatz.`,
    avoid: `Keine Aufgabe, in der offen bleibt, ob eine Person oder eine Sache gemeint ist.
Keine Optionen, die zugleich Verbrektion und da/wo-Unterscheidung mischen.`,
  },

  "Possessivpronomen in verschiedenen Kasus": {
    rule: `Stämme: ich→mein, du→dein, er/es→sein, sie(Sg.)→ihr, wir→unser, ihr→euer, sie(Pl.)→ihr, Sie→Ihr.
ZWEI unabhängige Entscheidungen: der BESITZER bestimmt den STAMM (sein/ihr), das BESESSENE NOMEN bestimmt die ENDUNG (Kasus, Genus, Numerus)!
Endungen wie bei ein/kein: Nom. m mein / f meine / n mein / Pl. meine. Akk. m meinen / f meine / n mein / Pl. meine. Dat. m meinem / f meiner / n meinem / Pl. meinen (+n am Nomen). Gen. m meines / f meiner / n meines / Pl. meiner.
Richtig: "Die Frau sucht ihren Mann." (ihr- weil die Frau besitzt; -en weil "den Mann" Akk. maskulin) | Falsch: "Die Frau sucht seinen Mann." (falscher Besitzer) | Falsch: "Die Frau sucht ihre Mann." (falsche Endung)
Richtig: "Der Mann spielt mit seiner Tochter." (Dat. feminin) | Falsch: "... mit seine Tochter."
euer VERLIERT das -e-, sobald eine Endung kommt: euer Vater, aber eure Mutter, euren Bruder, eurem Kind. | Falsch: "euere Mutter", "eueren Bruder".
unser behält das -e-: unsere Mutter, unseren Vater, unserem Kind.
AUFGABENDESIGN: Der Satz muss BEIDE Entscheidungen erzwingen — Besitzer und Kasus dürfen sich nicht decken. Nimm ein Subjekt in der 3. Person (er/sie) und ein Nomen in einem anderen Kasus als Nominativ. Die 4 Optionen: richtiger Stamm + richtige Endung, richtiger Stamm + falsche Endung, falscher Stamm + richtige Endung, falscher Stamm + falsche Endung.`,
    design: `Zwei Informationen müssen im Satz stehen: der BESITZER (bestimmt den Stamm: mein/dein/sein/ihr/unser/euer/ihr/Ihr) und die Funktion des Nomens (bestimmt die Endung).
Prüfe die ENDUNG bei feststehendem Stamm oder den STAMM bei feststehender Endung — nicht beides gleichzeitig. Die Endungen folgen dem Muster von "ein/kein".`,
    formats: ["luecke","mehrfachluecke","dialog","fehlerkorrektur"],
    traps: `Endung des falschen Kasus (mit meinem Bruder → mit meinen Bruder), Endung des falschen Genus (meine Vater), sein statt ihr und umgekehrt (die Frau und sein Auto), fehlendes -n im Dativ Plural (mit meinen Kinder), Endung -e bei "euer" ohne Ausfall des -e- (euere statt eure), Verwechslung mit dem Personalpronomen (ihr/ihre).`,
    avoid: `Keine Aufgabe ohne eindeutigen Besitzer im Satz.
Keine Optionen, die sich in Stamm UND Endung unterscheiden — die Aufgabe wird sonst unscharf.`,
  },

  // ─── Adjektive ───────────────────────────────────────────────────

  "Adjektivdeklination": {
    rule: `Die Endung hängt von drei Dingen ab: Artikelwort, Kasus, Genus/Numerus. Grundprinzip: Das Signal für Kasus und Genus muss genau EINMAL erscheinen — trägt es der Artikel, bekommt das Adjektiv die schwache Endung.
SCHWACH (nach der/die/das, dieser, jeder, welcher, alle): Nominativ Singular m/f/n → -e; Akkusativ Singular f/n → -e; ALLE anderen Formen → -en. Also: der gute Mann, die gute Frau, das gute Kind, den guten Mann, dem guten Mann, die guten Kinder, mit den guten Kindern.
GEMISCHT (nach ein/kein/mein/dein/sein/ihr/unser/euer): Dort, wo der Artikel kein Signal trägt, springt das Adjektiv ein: Nominativ m → -er (ein guter Mann), Nominativ/Akkusativ n → -es (ein gutes Kind), Nominativ/Akkusativ f → -e (eine gute Frau); alle übrigen Formen → -en (einen guten Mann, einem guten Mann, meiner guten Freundin, keine guten Ideen).
STARK (ohne Artikelwort, auch nach viele, wenige, einige, mehrere, Zahlen): Das Adjektiv trägt die Signalendung des bestimmten Artikels: -er (m Nom), -e (f Nom/Akk), -es (n Nom/Akk), -en (m Akk), -em (m/n Dat), -er (f Dat/Gen), -en (Pl Dat), -er (Pl Nom/Akk). Beispiele: guter Wein, kaltes Wasser, mit gutem Wein, frische Brötchen, mit netten Leuten.
Genitiv m/n hat IMMER -en: des guten Mannes, trotz schlechten Wetters.
Mehrere Adjektive haben dieselbe Endung: "ein großes, schönes Haus".
Nach "sein/werden/bleiben" bleibt das Adjektiv als Prädikativ ENDUNGSLOS: "Der Mann ist gut." | Falsch: "Der Mann ist guter."
Nicht dekliniert: Farben auf -a (rosa, lila), Adjektive auf -er von Städten (Berliner, Münchner).`,
    design: `Der Satz muss Artikelwort, Kasus und Genus eindeutig festlegen — durch Verb, Präposition oder Satzstelle. Erst dann ist die Endung bestimmbar.
Prüfe gezielt einen Übergang: schwach gegen gemischt (der/ein), Nominativ gegen Akkusativ im Maskulinum, Dativ, Genitiv mit -en oder die starke Deklination ohne Artikel.
Alle 4 Optionen enthalten dasselbe Adjektiv und dasselbe Artikelwort; variiert wird nur die Endung.`,
    formats: ["luecke","mehrfachluecke","satzvarianten","fehlerkorrektur"],
    traps: `-e statt -er nach "ein" im Nominativ Maskulinum (ein gute Mann), -er statt -en im Akkusativ (einen guter Film), Nominativendung im Dativ (mit dem guter Freund), -e statt -en im Genitiv (des gute Mannes), fehlende Endung im Attribut (ein gut Mann), Endung beim Prädikativ (Der Mann ist guter), starke statt schwacher Endung nach dem bestimmten Artikel (der guter Mann).`,
    avoid: `Keine Aufgabe, in der der Kasus nicht eindeutig ist — sonst sind mehrere Endungen richtig.
Keine Optionen, die zusätzlich Artikel oder Numerus ändern.`,
  },

  "Steigerung": {
    rule: `Positiv – Komparativ (+ -er) – Superlativ (am + -sten / der/die/das + -ste): schnell – schneller – am schnellsten.
UMLAUT bei den meisten einsilbigen Adjektiven: alt–älter–am ältesten, jung, lang, kurz, warm, kalt, stark, schwach, hart, klug, dumm, oft, arm. KEIN Umlaut bei: schlank, klar, voll, froh, bunt, laut, flach, rasch, sanft.
Unregelmäßig: gut–besser–am besten | viel–mehr–am meisten | gern–lieber–am liebsten | hoch–höher–am höchsten | nah–näher–am nächsten | groß–größer–am größten | teuer–teurer–am teuersten | dunkel–dunkler.
Nach -d, -t, -s, -ß, -z, -sch kommt -esten: am ältesten, am kürzesten, am heißesten, am hübschesten.
VERGLEICH: Gleichheit "(genau)so ... wie": "Er ist so groß wie ich." Ungleichheit Komparativ + "als": "Er ist größer als ich." | Falsch: "Er ist größer wie ich."
NIEMALS "mehr + Adjektiv" wie im Englischen: Falsch: "Er ist mehr interessant." Richtig: "Er ist interessanter."
Vor dem Nomen wird gesteigertes Adjektiv DEKLINIERT: der schnellere Zug, ein schnellerer Zug, der schnellste Zug, mit dem schnellsten Zug. | Falsch: "der schneller Zug".
AUFGABENDESIGN: Alle 4 Optionen beziehen sich auf dasselbe Adjektiv — variiere Steigerungsstufe, Umlaut, Vergleichspartikel (als/wie) oder Deklinationsendung.`,
    design: `Der Satz muss die Stufe erzwingen: Vergleich mit "wie" (Positiv), Vergleich mit "als" (Komparativ), Höchststufe mit "am"/Artikel (Superlativ).
Prüfe entweder die Stufenform (mit Umlaut, unregelmäßig) oder die Vergleichspartikel oder die Superlativform (am -sten gegen attributives der/die/das -ste).`,
    formats: ["luecke","umformung","bedeutung","satzvarianten","fehlerkorrektur"],
    traps: `"wie" statt "als" nach dem Komparativ (größer wie), doppelte Steigerung (mehr besser, am schönsten-ste), fehlender Umlaut (alter statt älter, großer statt größer), regelmäßige Bildung bei unregelmäßigen Adjektiven (guter/gutter statt besser, hocher statt höher), "am schönsten" in attributiver Stellung (das am schönste Haus), fehlendes -e- nach -d/-t/-s (heißste statt heißeste).`,
    avoid: `Keine Aufgabe ohne Vergleichsgröße im Satz — sonst passen mehrere Stufen.
Keine Optionen, die zusätzlich die Adjektivendung falsch bilden, wenn die Stufe geprüft wird.`,
  },

  // ─── Präpositionen ───────────────────────────────────────────────

  "Wechselpräpositionen": {
    rule: `Neun Wechselpräpositionen: an, auf, hinter, in, neben, über, unter, vor, zwischen.
WOHIN? (Richtung, Bewegung mit Ziel) → AKKUSATIV: "Ich stelle das Buch auf den Tisch.", "Sie hängt das Bild an die Wand.", "Wir gehen in die Stadt."
WO? (Ort, Position, Bewegung ohne Ziel) → DATIV: "Das Buch steht auf dem Tisch.", "Das Bild hängt an der Wand.", "Wir laufen in der Stadt."
Verbpaare als sicherstes Signal — Akkusativ: stellen, legen, setzen, hängen (transitiv), stecken, gehen, fahren, kommen, bringen. Dativ: stehen, liegen, sitzen, hängen (intransitiv), stecken (intransitiv), sein, bleiben, wohnen, arbeiten.
Achtung: "hängen" und "stecken" gibt es in beiden Varianten — dann entscheidet die Bedeutung: "Ich hänge das Bild an die Wand." (wohin) gegenüber "Das Bild hängt an der Wand." (wo).
Nicht jede Bewegung heißt Akkusativ: Ein Ziel muss überschritten werden. "Ich laufe im Park." (wo — Bewegung ohne Ziel) gegenüber "Ich laufe in den Park." (wohin).
Verschmelzungen: an/in + dem → am, im; an/in + das → ans, ins; auf + das → aufs.
Übertragene Bedeutung hat feste Rektion und folgt NICHT der wohin/wo-Frage: warten auf + Akkusativ, denken an + Akkusativ, sich freuen über + Akkusativ, teilnehmen an + Dativ, leiden unter + Dativ, sich interessieren für + Akkusativ.`,
    design: `Der Satz muss wohin oder wo eindeutig festlegen — am besten über das Verb (stellen/stehen, legen/liegen, setzen/sitzen, hängen/hängen).
Alle 4 Optionen verwenden dieselbe Präposition und dasselbe Nomen; variiert wird ausschließlich der Kasus (und gegebenenfalls die Verschmelzung).`,
    formats: ["bedeutung","luecke","mehrfachluecke","fehlerkorrektur"],
    traps: `Dativ bei Richtung (Ich lege das Buch auf dem Tisch), Akkusativ bei Position (Das Buch liegt auf den Tisch), falsche Verschmelzung (in dem statt im, in das statt ins), Akkusativ bei fester Verbrektion mit Dativ (teilnehmen an den Kurs), Bewegung ohne Ziel als Akkusativ gedeutet (Ich laufe in den Park, gemeint ist "im Park").`,
    avoid: `Keine Aufgabe mit einem Verb, das beide Lesarten zulässt, ohne zusätzliches Signal.
Keine Vermischung von räumlicher Bedeutung und fester Verbrektion in derselben Aufgabe.`,
  },

  "Lokale Präpositionen": {
    rule: `WO? (Position, Dativ): in der Stadt, an der Wand, auf dem Tisch, bei meinen Eltern, neben dem Haus, hinter der Schule, vor dem Kino, unter dem Bett, über dem Sofa, zwischen den Häusern, gegenüber dem Bahnhof.
WOHIN? (Richtung): nach + Städte/Länder OHNE Artikel: "Ich fahre nach Berlin / nach Italien." | zu + Personen, Institutionen, Gebäude als Ziel: "Ich gehe zum Arzt / zur Schule / zu meiner Oma." | in + Länder MIT Artikel und geschlossene Räume (Akkusativ!): "in die Schweiz, in die Türkei, in die USA, ins Kino, in die Schule (hinein)." | auf + öffentliche Plätze/Ämter: "auf die Post, auf den Markt, auf die Bank." | an + Gewässer/Grenzflächen: "ans Meer, an den Strand, an die Wand."
WOHER? aus (Herkunft, aus geschlossenem Raum): "Ich komme aus Polen / aus dem Haus." | von (von einem Ort/einer Person weg): "Ich komme von der Arbeit / von meiner Oma."
bei = Aufenthalt bei Personen oder Firmen: "Ich wohne bei meinen Eltern." "Ich arbeite bei Siemens."
Richtig: "Ich fahre nach Berlin." | Falsch: "Ich fahre in Berlin." (das ist WO) | Richtig: "Ich bin in Berlin."
Richtig: "Ich gehe zum Arzt." | Falsch: "Ich gehe nach dem Arzt." / "Ich gehe in den Arzt."
Richtig: "Ich gehe in die Schule." (wohin, Akk.) | "Ich bin in der Schule." (wo, Dat.)`,
    design: `Der Satz muss den Ortstyp eindeutig markieren: Land, Stadt, Gebäude, Person, Institution, offene Fläche — davon hängt die Präposition ab.
Prüfe entweder die Präposition (nach/in/zu/bei/an/auf) oder den Kasus, nicht beides gleichzeitig.`,
    formats: ["dialog","luecke","bedeutung","fehlerkorrektur"],
    traps: `"in" statt "nach" bei Städten und Ländern ohne Artikel (Ich fahre in Berlin), "nach" bei Ländern mit Artikel (nach der Schweiz statt in die Schweiz), "zu" statt "in" bei Gebäuden, die man betritt, "nach" bei Personen (Ich gehe nach dem Arzt), Verwechslung "bei" und "zu" (Ich gehe bei meiner Oma), falscher Kasus bei Wechselpräpositionen (in die Schule / in der Schule).`,
    avoid: `Keine Aufgabe, in der wohin und wo beide plausibel sind.
Keine Ortsangabe, für die im Deutschen mehrere Präpositionen üblich sind.`,
  },

  "Temporale Präpositionen": {
    rule: `um + Uhrzeit: "um 8 Uhr", "um Mitternacht".
am + Wochentag, Datum, Tageszeit: "am Montag, am 3. Mai, am Morgen, am Abend, am Wochenende". AUSNAHME: "in der Nacht".
im + Monat, Jahreszeit: "im Mai, im Sommer, im Winter".
Jahreszahl OHNE Präposition oder mit "im Jahr": "1990" / "im Jahr 1990". | Falsch: "in 1990" (Anglizismus!).
seit + Dativ (begann in der Vergangenheit, dauert an; Verb im PRÄSENS!): "Ich lerne seit zwei Jahren Deutsch." | Falsch: "Ich lernte seit zwei Jahren..."
vor + Dativ (Zeitpunkt in der Vergangenheit): "vor drei Tagen, vor einem Jahr".
in + Dativ (Zeitpunkt in der Zukunft): "in einer Woche, in zwei Stunden".
für + Akkusativ (geplante Dauer): "Ich fahre für zwei Wochen nach Spanien."
ab + Dativ (Beginn), von ... bis (Zeitraum), bis + Akkusativ, nach + Dativ, während + Genitiv, zwischen + Dativ, gegen + Akkusativ (ungefähr: "gegen 8 Uhr").
Ohne Präposition: jeden Tag, letzte Woche, nächstes Jahr, diesen Monat (Akkusativ!).
Richtig: "Am Montag habe ich frei." | Falsch: "In Montag habe ich frei."
Richtig: "Ich wohne seit 2020 hier." | Falsch: "Ich wohne für 2020 hier."`,
    design: `Die Zeitangabe im Satz muss den Typ eindeutig festlegen: Uhrzeit, Wochentag, Tageszeit, Monat, Jahreszeit, Jahreszahl, Dauer, Zeitpunkt in Vergangenheit oder Zukunft.
Prüfe entweder die Präposition oder den Kasus danach — und behalte in allen 4 Optionen dieselbe Zeitangabe.`,
    formats: ["luecke","dialog","mehrfachluecke","fehlerkorrektur"],
    traps: `"in" vor Jahreszahlen als Anglizismus (in 1990), "am" vor Monaten (am Mai), "im" vor Wochentagen (im Montag), "für" statt "seit" bei andauernder Dauer (Ich wohne für zwei Jahren hier), "vor" statt "in" bei Zukunft, Präposition vor Akkusativ-Zeitangaben (an jeden Tag), falscher Kasus (seit einem Jahr → seit ein Jahr), Vergangenheitsform bei "seit" (Ich lernte seit zwei Jahren).`,
    avoid: `Keine Aufgabe, in der zwei Zeitpräpositionen inhaltlich passen.
Keine Optionen, die die Zeitangabe selbst verändern.`,
  },

  "Kausale Präpositionen": {
    rule: `Kausale Präpositionen nennen den GRUND — Frage: warum? weshalb?
wegen + Genitiv (standardsprachlich), umgangssprachlich auch Dativ: "wegen des schlechten Wetters", "wegen eines Unfalls". Bei Personalpronomen: meinetwegen, deinetwegen, seinetwegen.
aufgrund / auf Grund + Genitiv (förmlich, schriftlich): "aufgrund der neuen Regelung".
dank + Genitiv oder Dativ, POSITIVER Grund: "dank deiner Hilfe", "dank dem guten Wetter".
infolge + Genitiv (Folge eines Ereignisses): "infolge des Sturms".
aus + Dativ bei einem inneren Beweggrund ohne Artikel: "aus Angst", "aus Liebe", "aus Neugier", "aus Versehen".
vor + Dativ bei einer unwillkürlichen körperlichen Reaktion: "Sie zitterte vor Kälte.", "Er weinte vor Freude.", "Ich sterbe vor Hunger."
durch + Akkusativ nennt die Ursache oder das Mittel: "durch den Regen wurde die Straße nass".
Abgrenzung: KONZESSIV (Gegengrund) ist trotz + Genitiv: "trotz des Regens". Er nennt keinen Grund, sondern einen Widerstand.
Präposition + Nomen gegen Konjunktion + Satz: "wegen des Regens" (Präposition + Nomen) gegenüber "weil es regnet" (Konjunktion + Nebensatz) und "denn es regnet" (Konjunktion + Hauptsatz). Nach einer Präposition steht NIE ein konjugiertes Verb.
"deshalb, deswegen, darum, daher" sind Adverbien und stehen auf Position 1 mit Inversion: "Es regnete, deshalb blieben wir zu Hause."`,
    design: `Prüfe entweder die Wahl der kausalen Präposition (aus gegen vor, wegen gegen trotz, dank bei positivem Grund) oder den Kasus nach der Präposition oder die Abgrenzung Präposition gegen Konjunktion (wegen / weil / denn / deshalb).
Der Satz muss Grund und Folge klar erkennen lassen.`,
    formats: ["umformung","verbindung","luecke","fehlerkorrektur"],
    traps: `"weil" nach einer Präpositionsstelle (wegen es regnete), "wegen" vor einem ganzen Satz, Nominativ oder Akkusativ nach "wegen" (wegen der Regen), "trotz" für einen Grund statt für einen Gegengrund, "vor" statt "aus" bei bewusstem Beweggrund (vor Angst gegen aus Angst), Artikel bei "aus Angst/vor Kälte" (aus der Angst), "deshalb" ohne Inversion (deshalb wir blieben).`,
    avoid: `Keine Aufgabe, in der Grund und Gegengrund beide zum Kontext passen.
Keine Vermischung von Präposition und Konjunktion in den Optionen, wenn der Kasus geprüft wird.`,
  },

  // ─── Satzbau ─────────────────────────────────────────────────────

  "Negation": {
    rule: `KEIN verneint Nomen mit unbestimmtem Artikel oder ohne Artikel: "Ich habe ein Auto." → "Ich habe kein Auto."; "Ich trinke Kaffee." → "Ich trinke keinen Kaffee." Es wird wie "ein" dekliniert und hat zusätzlich Pluralformen: keine Bücher, mit keinen Freunden.
NICHT verneint alles Übrige: Verben, Adjektive, Adverbien, Eigennamen, Nomen mit bestimmtem Artikel oder Possessivpronomen: "Ich kenne den Mann nicht.", "Das ist nicht mein Auto.", "Er kommt nicht aus Berlin."
Position von "nicht":
— SATZNEGATION: möglichst weit hinten, aber VOR der rechten Satzklammer (Infinitiv, Partizip II, trennbares Präfix, Prädikatsnomen, Prädikatsadjektiv, obligatorische Ortsangabe): "Ich habe das Buch nicht gelesen.", "Ich kann heute nicht kommen.", "Er steht nicht auf.", "Sie ist nicht müde.", "Ich fahre nicht nach Berlin."
— nach dem finiten Verb und nach Pronomen/Objekten: "Ich sehe ihn nicht."
— SONDERNEGATION: direkt VOR dem verneinten Element: "Nicht ich habe angerufen, sondern mein Bruder.", "Ich fahre nicht heute, sondern morgen."
Weitere Negationswörter: nie/niemals, nichts, niemand, nirgends, noch nicht, nicht mehr, kein ... mehr.
KEINE doppelte Verneinung im Standarddeutschen: "Ich habe nichts gesehen." | Falsch: "Ich habe nicht nichts gesehen."
Antwort auf eine verneinte Frage: DOCH bestätigt positiv: "Kommst du nicht?" — "Doch, ich komme."`,
    design: `Prüfe genau eine Entscheidung: kein gegen nicht (abhängig vom Artikel des Nomens), die Deklination von "kein", die POSITION von "nicht" in der Satzklammer, oder ja/nein/doch.
Bei einer Positionsaufgabe bleiben Wortmaterial und Formen in allen 4 Optionen identisch; variiert wird nur die Stelle von "nicht".`,
    formats: ["satzvarianten","wortstellung","umformung","bedeutung","fehlerkorrektur"],
    traps: `"nicht" vor einem Nomen ohne Artikel (Ich habe nicht Auto), "kein" vor bestimmtem Artikel oder Possessivum (Das ist kein mein Auto), falsche kein-Endung (Ich habe kein Bruder statt keinen), "nicht" hinter der rechten Klammer (Ich habe gelesen nicht), "nicht" vor dem finiten Verb im Hauptsatz, doppelte Verneinung, "ja" statt "doch" auf eine verneinte Frage.`,
    avoid: `Keine Aufgabe, in der Satz- und Sondernegation beide sinnvoll sind — sonst sind zwei Positionen korrekt.
Keine Optionen, die zusätzlich Kasus oder Konjugation verändern.`,
  },

  "Satzklammer": {
    rule: `Das Prädikat wird auf ZWEI Positionen verteilt; dazwischen liegt das Mittelfeld.
LINKE KLAMMER (Position 2): finites Verb — Modalverb, Hilfsverb (haben/sein/werden) oder Vollverb.
RECHTE KLAMMER (Satzende): Infinitiv, Partizip II, trennbares Präfix oder Prädikatsteil.
"Ich [habe] gestern lange mit meiner Schwester [telefoniert]." | "Ich [muss] morgen sehr früh [aufstehen]." | "Ich [stehe] jeden Tag um sechs [auf]." | "Er [wird] nächstes Jahr in Berlin [studieren]." | "Sie [hat] das Buch [lesen wollen]."
NEBENSATZ: Die Klammer schließt sich am Ende, das finite Verb steht GANZ hinten: "..., weil ich gestern lange telefoniert habe." | "..., weil ich morgen früh aufstehen muss."
MITTELFELD (TeKaMoLo): Subjekt – Dativobjekt – TEmporal (wann) – KAusal (warum) – MOdal (wie) – LOkal (wo) – Akkusativobjekt. Pronomen rücken nach vorn, direkt hinter das finite Verb.
Hinter die rechte Klammer gehört NICHTS (Ausnahme Nachfeld: Vergleiche mit als/wie, Nebensätze).
Richtig: "Ich muss morgen früh aufstehen." | Falsch: "Ich muss aufstehen morgen früh."
Richtig: "Ich habe ihr gestern ein Buch geschenkt." | Falsch: "Ich habe geschenkt ihr gestern ein Buch."`,
    design: `Prüfe die Verteilung des Prädikats auf linke und rechte Klammer oder die Reihenfolge im Mittelfeld (TeKaMoLo, Pronomen vorn).
Alle 4 Optionen enthalten exakt dasselbe Wortmaterial in denselben Formen; variiert wird ausschließlich die Reihenfolge.`,
    formats: ["wortstellung","satzvarianten","fehlerkorrektur"],
    traps: `Rechte Klammer im Mittelfeld statt am Ende (Ich muss aufstehen morgen früh), Angabe hinter der rechten Klammer, finites Verb nicht auf Position 2, im Nebensatz Hilfsverb vor dem Partizip (weil ich habe telefoniert), Pronomen zu weit hinten (Ich habe gestern ihr ein Buch geschenkt statt Ich habe ihr gestern...), zwei Elemente vor dem finiten Verb.`,
    avoid: `Keine Aufgabe, in der zwei Reihenfolgen gleichermaßen korrekt sind — Angaben im Mittelfeld sind oft verschiebbar, also wähle einen Fall mit eindeutiger Regel (rechte Klammer, Verbposition, Pronomenstellung).
Keine Optionen mit zusätzlichen Form- oder Kasusfehlern.`,
  },

  "Wortstellung im Hauptsatz": {
    rule: `Das finite Verb steht im Aussagesatz IMMER auf Position 2. Position 1 füllt genau EIN Satzglied: Subjekt, Zeitangabe, Ortsangabe, Objekt oder ein ganzer Nebensatz.
Steht etwas anderes als das Subjekt auf Position 1, folgt INVERSION: Verb Position 2, Subjekt Position 3: "Gestern ging ich ins Kino." | Falsch: "Gestern ich ging ins Kino."
Ein vorangestellter Nebensatz füllt Position 1 komplett; danach kommt sofort das finite Verb des Hauptsatzes: "Weil es regnet, bleibe ich zu Hause." | Falsch: "Weil es regnet, ich bleibe zu Hause."
Verbzweit gilt auch nach den nebenordnenden Konjunktionen und, oder, aber, denn, sondern — sie besetzen KEINE Position: "Ich bleibe zu Hause, denn ich bin krank."
Adverbien wie deshalb, trotzdem, dann, danach, außerdem, jedoch sind dagegen Satzglieder und erzwingen Inversion: "Ich bin krank, deshalb bleibe ich zu Hause."
Mittelfeld TeKaMoLo: TEmporal – KAusal – MOdal – LOkal; Dativ vor Akkusativ bei Nomen, Pronomen rücken nach vorn direkt hinter das finite Verb.
Die rechte Klammer (Infinitiv, Partizip II, trennbares Präfix) steht am Satzende.
Position 1 im Fragesatz: Ja/Nein-Frage beginnt mit dem Verb ("Kommst du?"), W-Frage mit dem Fragewort und Verb auf Position 2 ("Wann kommst du?").`,
    design: `Prüfe die Verbzweitstellung und die Inversion. Der Satz muss ein Element auf Position 1 haben, das nicht das Subjekt ist, oder eine Konjunktion/ein Adverb, dessen Wirkung zu entscheiden ist (denn gegen deshalb).
Alle 4 Optionen bestehen aus demselben Wortmaterial in denselben Formen.`,
    formats: ["wortstellung","satzvarianten","fehlerkorrektur"],
    traps: `Subjekt und Verb beide vor Position 2 (Gestern ich ging), Verb auf Position 1 im Aussagesatz, Inversion nach "und/aber/denn" (denn bin ich krank), fehlende Inversion nach "deshalb/trotzdem", fehlende Inversion nach vorangestelltem Nebensatz, rechte Klammer im Mittelfeld.`,
    avoid: `Keine Aufgabe, in der mehrere Reihenfolgen korrekt wären. Inversionen sind ebenfalls korrekt und dürfen NICHT als falsche Option angeboten werden.
Keine Optionen mit zusätzlichen Konjugations- oder Kasusfehlern — sonst prüfst du nicht die Wortstellung.`,
  },

  "Wortstellung im Nebensatz": {
    rule: `Nach einer unterordnenden Konjunktion (weil, dass, wenn, als, ob, obwohl, damit, bevor, nachdem, während, seit, bis, falls, sobald) steht das FINITE Verb am ENDE des Nebensatzes.
Auch Relativsätze und indirekte Fragen sind Nebensätze mit Endstellung des Verbs.
Bei zusammengesetzten Formen steht das finite Verb GANZ hinten, hinter Partizip oder Infinitiv: "..., weil er nach Hause gegangen ist.", "..., weil ich früh aufstehen muss.", "..., dass sie kommen wird."
Trennbare Verben bleiben im Nebensatz ZUSAMMEN: "..., weil ich um sieben aufstehe." | Falsch: "..., weil ich um sieben auf stehe."
Ausnahme Doppelinfinitiv: Bei zwei Infinitiven rückt das Hilfsverb VOR die Infinitive: "..., weil er hat arbeiten müssen."
Der Nebensatz wird mit Komma abgetrennt. Steht er vorn, füllt er Position 1 des Hauptsatzes, und das Hauptsatzverb folgt sofort: "Weil ich krank bin, bleibe ich zu Hause."
Nicht verwechseln: und, oder, aber, denn, sondern sind NEBENORDNEND — nach ihnen gilt normale Hauptsatzstellung mit Verb auf Position 2.`,
    design: `Prüfe die Endstellung des finiten Verbs, die Reihenfolge bei zusammengesetzten Formen (Partizip/Infinitiv vor dem finiten Verb), die Nichttrennung trennbarer Verben oder die Abgrenzung unterordnend gegen nebenordnend (weil gegen denn).
Alle 4 Optionen bestehen aus demselben Wortmaterial in denselben Formen.`,
    formats: ["wortstellung","satzvarianten","verbindung","fehlerkorrektur"],
    traps: `Verbzweitstellung im Nebensatz (weil ich bin krank), Hilfsverb vor dem Partizip (weil er ist gegangen), getrenntes Präfix im Nebensatz, Hauptsatzstellung nach "weil" wie nach "denn", fehlende Inversion im Hauptsatz nach vorangestelltem Nebensatz.`,
    avoid: `Keine Optionen, die zusätzlich Kasus, Konjugation oder Wortwahl verändern.
Keine Aufgabe, in der zwei Reihenfolgen im Mittelfeld gleichermaßen zulässig sind — die Entscheidung muss an der Verbposition hängen.`,
  },

  // ─── Nebensätze ──────────────────────────────────────────────────

  "weil-Sätze": {
    rule: `"weil" leitet einen NEBENSATZ ein und nennt den Grund — Frage: warum?
Das finite Verb steht am ENDE: "Ich bleibe zu Hause, weil ich krank bin." | Falsch: "..., weil ich bin krank."
Bei zusammengesetzten Formen steht das finite Verb ganz hinten: "..., weil ich zu viel gearbeitet habe.", "..., weil ich arbeiten muss."
Der weil-Satz kann auch vorn stehen; dann füllt er Position 1 und der Hauptsatz beginnt mit dem Verb: "Weil ich krank bin, bleibe ich zu Hause."
"denn" bedeutet dasselbe, ist aber NEBENORDNEND: normale Hauptsatzstellung, Verb auf Position 2, immer nach dem Hauptsatz: "Ich bleibe zu Hause, denn ich bin krank." | Falsch: "Denn ich bin krank, bleibe ich zu Hause."
"deshalb / deswegen / darum / daher" nennen die FOLGE, nicht den Grund, und stehen mit Inversion: "Ich bin krank, deshalb bleibe ich zu Hause."
"da" ist ein Synonym zu "weil" mit Endstellung, steht bevorzugt vorn und bei bekanntem Grund: "Da es regnet, bleiben wir zu Hause."
Komma vor weil ist Pflicht. Auf die Frage "Warum?" kann der weil-Satz allein stehen: "Warum kommst du nicht?" — "Weil ich keine Zeit habe."`,
    design: `Prüfe die Verbendstellung nach "weil" oder die Abgrenzung weil / denn / deshalb bei identischem Inhalt.
Alle 4 Optionen enthalten dasselbe Wortmaterial; variiert wird nur die Konjunktion oder die Verbposition.`,
    formats: ["verbindung","satzvarianten","umformung","fehlerkorrektur"],
    traps: `Verbzweitstellung nach weil, Hilfsverb vor dem Partizip (weil ich habe gearbeitet), Hauptsatzstellung nach weil wie nach denn, "denn" mit Endstellung, "deshalb" für den Grund statt für die Folge, fehlende Inversion im Hauptsatz nach vorangestelltem weil-Satz.`,
    avoid: `Keine Aufgabe, in der Grund und Folge vertauschbar sind — die Kausalrichtung muss eindeutig sein.
Keine Optionen mit zusätzlichen Konjugationsfehlern.`,
  },

  "dass-Sätze": {
    rule: `"dass" leitet einen NEBENSATZ ein, der als Subjekt oder Objekt zum Hauptsatz gehört. Das finite Verb steht am ENDE: "Ich glaube, dass er recht hat." | Falsch: "Ich glaube, dass er hat recht."
Typische Auslöser: glauben, denken, meinen, wissen, sagen, hoffen, finden, sehen, hören, sich freuen; unpersönlich: "Es ist wichtig/schade/klar, dass ...", "Es freut mich, dass ..."
Bei zusammengesetzten Formen steht das finite Verb ganz hinten: "..., dass er gekommen ist.", "..., dass sie arbeiten muss.", "..., dass er kommen wird."
Bei gleichem Subjekt ist oft ein Infinitivsatz mit "zu" die bessere Wahl: "Ich hoffe, dass ich dich sehe." → "Ich hoffe, dich zu sehen." Nach Verben mit Präposition steht vorausweisend da(r)-: "Ich freue mich darauf, dass du kommst."
"das" (Artikel oder Relativpronomen) und "dass" (Konjunktion) nicht verwechseln: "Ich weiß, dass das Buch teuer ist." Probe: Lässt sich "dieses/welches" einsetzen, schreibt man "das".
Komma vor dass ist Pflicht. "dass" kann nach Verben des Sagens auch entfallen — dann gilt Hauptsatzstellung: "Ich glaube, er hat recht."`,
    design: `Prüfe die Verbendstellung, die Stellung des finiten Verbs bei zusammengesetzten Formen oder die Unterscheidung dass / das / ob.
Alle 4 Optionen enthalten dasselbe Wortmaterial.`,
    formats: ["verbindung","umformung","satzvarianten","fehlerkorrektur"],
    traps: `Verbzweitstellung nach dass, Hilfsverb vor dem Partizip, "das" statt "dass", "ob" statt "dass" (und umgekehrt), "was" statt "dass", fehlendes Komma als Distraktor nur dann, wenn die Interpunktion ausdrücklich geprüft wird.`,
    avoid: `Keine Aufgabe, in der die dass-lose Variante mit Hauptsatzstellung ebenfalls korrekt wäre.
Keine Vermischung von Konjunktionswahl und Verbstellung in derselben Aufgabe.`,
  },

  "obwohl-Sätze": {
    rule: `"obwohl" leitet einen KONZESSIVEN Nebensatz ein: Es geschieht etwas, obwohl ein Gegengrund vorliegt. Das finite Verb steht am ENDE: "Wir gingen spazieren, obwohl es regnete." | Falsch: "..., obwohl es regnete nicht" bzw. "..., obwohl regnete es."
Der obwohl-Satz kann vorn stehen; dann folgt im Hauptsatz Inversion: "Obwohl es regnete, gingen wir spazieren."
Synonyme mit Endstellung: obgleich, obschon, wenngleich (schriftsprachlich).
"trotzdem" und "dennoch" sind ADVERBIEN im Hauptsatz und erzwingen Inversion: "Es regnete, trotzdem gingen wir spazieren." | Falsch: "..., trotzdem wir gingen spazieren."
"aber" ist nebenordnend, besetzt keine Position: "Es regnete, aber wir gingen spazieren."
"trotz" ist eine PRÄPOSITION mit Genitiv und steht vor einem Nomen, nie vor einem Satz: "Trotz des Regens gingen wir spazieren." | Falsch: "Trotz es regnete, ..."
Logik: Der obwohl-Satz enthält den unerwarteten Gegengrund, der Hauptsatz das trotzdem eintretende Ereignis. Der Inhalt beider Teile darf nicht vertauscht werden.
Komma vor obwohl ist Pflicht.`,
    design: `Prüfe die Verbendstellung nach "obwohl" oder die Abgrenzung obwohl / trotzdem / trotz / aber bei identischem Inhalt.
Der Satz muss den Widerspruch klar enthalten, damit die konzessive Lesart zwingend ist.`,
    formats: ["verbindung","umformung","satzvarianten","fehlerkorrektur"],
    traps: `Verbzweitstellung nach obwohl, "trotzdem" mit Endstellung, "trotzdem" ohne Inversion, "trotz" vor einem ganzen Satz, "weil" statt "obwohl" (Grund statt Gegengrund), vertauschte Inhalte von Haupt- und Nebensatz, fehlende Inversion nach vorangestelltem obwohl-Satz.`,
    avoid: `Keine Aufgabe, in der kausale und konzessive Lesart beide passen.
Keine Optionen mit zusätzlichen Zeitform- oder Kasusfehlern.`,
  },

  "wenn-Sätze": {
    rule: `"wenn" hat drei Bedeutungen, alle mit Verbendstellung im Nebensatz:
1) TEMPORAL, wiederholt ("immer wenn", "jedes Mal wenn"), in allen Zeiten: "Immer wenn es regnete, blieben wir zu Hause."
2) TEMPORAL, einmalig in Gegenwart oder Zukunft: "Wenn ich morgen ankomme, rufe ich dich an."
3) KONDITIONAL (Bedingung, = falls): "Wenn du Zeit hast, komm vorbei."
Für ein EINMALIGES Ereignis in der VERGANGENHEIT steht "als", nicht "wenn": "Als ich zehn war, zogen wir um."
Nach der FRAGE nach dem Zeitpunkt steht "wann": "Ich weiß nicht, wann er kommt." — nie "wenn".
Steht der wenn-Satz vorn, füllt er Position 1, und der Hauptsatz beginnt mit dem finiten Verb (Inversion): "Wenn es regnet, bleibe ich zu Hause." | Falsch: "Wenn es regnet, ich bleibe zu Hause."
Im Hauptsatz kann "dann" oder "so" folgen — es besetzt dann Position 1 und der wenn-Satz steht davor: "Wenn es regnet, dann bleibe ich zu Hause."
Irreale Bedingung mit Konjunktiv II: "Wenn ich Zeit hätte, würde ich mitkommen."
"wenn" kann in der Bedingung wegfallen; dann steht das Verb auf Position 1: "Hätte ich Zeit, würde ich mitkommen."`,
    design: `Prüfe entweder die Verbendstellung samt Inversion im Hauptsatz oder die Wahl wenn / als / wann. Der Satz muss über Zeitform und Signalwort (immer, gestern, morgen, einmal) eindeutig festlegen, welche Konjunktion möglich ist.`,
    formats: ["verbindung","satzvarianten","dialog","fehlerkorrektur"],
    traps: `Fehlende Inversion im Hauptsatz nach vorangestelltem wenn-Satz, Verbzweitstellung im wenn-Satz, "wenn" für ein einmaliges Ereignis in der Vergangenheit (statt als), "wenn" in der indirekten Frage (statt wann), Indikativ in der irrealen Bedingung, "dann" zusätzlich vor dem Subjekt ohne Inversion.`,
    avoid: `Keine Aufgabe ohne Zeit- oder Häufigkeitssignal — sonst sind als und wenn beide möglich.
Keine Vermischung von Konjunktionswahl und Konjunktiv II in derselben Aufgabe.`,
  },

  "Relativsätze": {
    rule: `Das Relativpronomen übernimmt GENUS und NUMERUS vom Bezugswort, aber den KASUS von seiner Funktion IM RELATIVSATZ. Diese zwei Quellen sind der Kern des Themas.
Formen: Nominativ der/die/das/die; Akkusativ den/die/das/die; Dativ dem/der/dem/DENEN; Genitiv dessen/deren/dessen/deren.
Bestimme den Kasus so: Welche Rolle hat das Pronomen im Relativsatz? Subjekt → Nominativ; direktes Objekt → Akkusativ; indirektes Objekt oder Dativverb → Dativ; Besitz → Genitiv.
"Der Turm, den man von hier sehen kann" — Akkusativ, weil man DEN Turm sieht. "Der Mann, dem ich helfe" — Dativ, weil helfen den Dativ verlangt. "Die Frau, deren Auto kaputt ist" — Genitiv.
Das finite Verb steht am ENDE des Relativsatzes.
Mit Präposition steht die Präposition VOR dem Relativpronomen und bestimmt den Kasus: "Das Haus, in dem ich wohne.", "Der Freund, mit dem ich fahre.", "Die Arbeit, auf die ich warte."
Nach dem Genitiv-Relativpronomen folgt das Nomen OHNE Artikel: "der Mann, dessen Auto ..." | Falsch: "dessen das Auto".
"was" statt "der/die/das" nach: das, alles, nichts, etwas, vieles, wenig, dem Superlativ als Nomen und nach einem ganzen Satz: "Alles, was er sagt, stimmt.", "Er kam zu spät, was mich ärgerte."
"wo" ersetzt umgangssprachlich Ortsangaben: "die Stadt, wo/in der ich wohne."
Der Relativsatz steht möglichst direkt hinter dem Bezugswort und wird mit Komma abgetrennt.`,
    design: `Der Relativsatz muss den Kasus eindeutig erzwingen — über ein transitives Verb, ein Dativverb, eine Präposition oder eine Genitivbeziehung.
Das Bezugswort muss eindeutig sein und im Genus klar erkennbar. Prüfe entweder das Pronomen bei fester Verbstellung oder die Verbstellung bei festem Pronomen.`,
    formats: ["verbindung","satzvarianten","mehrfachluecke","fehlerkorrektur"],
    traps: `Kasus vom Bezugswort übernommen statt von der Funktion (Der Turm, der man sehen kann), Nominativ statt Akkusativ, Akkusativ statt Dativ bei Dativverben (Der Mann, den ich helfe), "den" statt "denen" im Dativ Plural, Verbzweitstellung im Relativsatz, Präposition hinter dem Pronomen (Das Haus, das ich in wohne), "das" statt "was" nach alles/nichts/etwas, Artikel nach dessen/deren.`,
    avoid: `Keine Aufgabe mit mehrdeutigem Bezugswort.
Keine Optionen, die zusätzlich das Genus wechseln, wenn der Kasus geprüft wird — sonst kann der Lernende allein über das Genus ausschließen.`,
  },

  "Indirekte Fragen": {
    rule: `Indirekte Fragen sind NEBENSÄTZE: finites Verb am ENDE, KEINE Inversion.
Mit W-Wort (wer, was, wo, wann, wie, warum, welcher, wie viel): "Wo wohnst du?" → "Ich weiß nicht, wo du wohnst." | Falsch: "Ich weiß nicht, wo wohnst du."
Ja/Nein-Frage → Einleitung mit "ob": "Kommst du mit?" → "Ich frage, ob du mitkommst." | Falsch: "Ich frage, ob kommst du mit."
NIEMALS "wenn" statt "ob"! Falsch: "Ich weiß nicht, wenn er kommt." Richtig: "Ich weiß nicht, ob er kommt." (= Ja/Nein) oder "..., wann er kommt." (= Zeitpunkt).
Einleitungen: Ich weiß nicht, ... | Können Sie mir sagen, ... | Ich möchte wissen, ... | Er fragt, ... | Weißt du, ...
Fragezeichen nur, wenn der GANZE Satz eine Frage ist: "Weißt du, wo er wohnt?" aber "Ich weiß nicht, wo er wohnt."
Trennbare Verben und Perfekt im Nebensatz: "Ich frage, ob er mitkommt." / "Ich weiß nicht, wann sie angekommen ist."
AUFGABENDESIGN: Prüfe entweder die Einleitung (ob/wenn/wann/dass) oder die Wortstellung im Nebensatz — beides mit identischem Wortmaterial in allen 4 Optionen.`,
    design: `Prüfe entweder die Einleitung (ob / wenn / wann / dass / W-Wort) oder die Wortstellung im Nebensatz — mit identischem Wortmaterial in allen 4 Optionen.
Die direkte Frage muss aus dem Kontext eindeutig hervorgehen: Ja/Nein-Frage → ob; Frage nach dem Zeitpunkt → wann; Frage nach Ort/Grund/Art → W-Wort.`,
    formats: ["umformung","verbindung","satzvarianten","fehlerkorrektur"],
    traps: `Verbzweitstellung im Nebensatz (Ich weiß nicht, wo wohnst du), "wenn" statt "ob", "ob" bei einer W-Frage, "dass" statt "ob", Inversion nach dem W-Wort, getrenntes Präfix im Nebensatz, Fragezeichen bei einem Aussagesatz.`,
    avoid: `Keine Aufgabe, in der ob und ein W-Wort beide passen.
Keine Optionen, die zusätzlich die Zeitform ändern.`,
  },

  "Infinitiv mit zu": {
    rule: `Der Infinitiv mit "zu" steht am Ende des Infinitivsatzes: "Er versucht, den Bahnhof zu finden."
Bei trennbaren Verben steht "zu" ZWISCHEN Präfix und Stamm und wird zusammengeschrieben: "Ich habe vor, morgen früh aufzustehen." | Falsch: "... zu aufstehen".
OHNE "zu" stehen: die Modalverben (können, müssen, sollen, wollen, dürfen, mögen), werden (Futur), lassen, sehen, hören, gehen, fahren, bleiben, helfen (oft ohne zu): "Er kann den Bahnhof finden." | Falsch: "Er kann den Bahnhof zu finden."
MIT "zu" stehen unter anderem: versuchen, beginnen, anfangen, aufhören, vorhaben, hoffen, vergessen, planen, beschließen, versprechen, erlauben, verbieten, bitten, empfehlen, scheinen, brauchen (verneint: "Du brauchst nicht zu kommen."), sich freuen, Lust haben, Zeit haben, Angst haben, sowie unpersönliche Ausdrücke: "Es ist wichtig/möglich/schwer/schön, ... zu ..."
Der Infinitivsatz hat KEIN eigenes Subjekt — das Subjekt ist das des Hauptsatzes (oder bei erlauben/bitten/empfehlen das Dativobjekt): "Ich bitte dich, mir zu helfen."
Drei feste Konstruktionen: "um ... zu" (Zweck: "Ich lerne Deutsch, um in Berlin zu studieren."), "ohne ... zu" ("Er ging, ohne sich zu verabschieden."), "statt/anstatt ... zu" ("Er spielt, statt zu lernen."). "um ... zu" ist nur bei gleichem Subjekt möglich, sonst "damit".
Perfekter Infinitiv für Vorzeitigkeit: "Er behauptet, den Film gesehen zu haben."
Komma: Bei einer erweiterten Infinitivgruppe und immer bei um/ohne/statt ... zu.`,
    design: `Prüfe genau eine Entscheidung: zu ja/nein (abhängig vom auslösenden Verb), die Position von "zu" bei trennbaren Verben, oder die Wahl zwischen um/ohne/statt ... zu und damit.
Das auslösende Verb muss im Satz stehen und die Konstruktion eindeutig festlegen.`,
    formats: ["satzvarianten","umformung","verbindung","fehlerkorrektur"],
    traps: `"zu" nach Modalverben, fehlendes "zu" nach versuchen/vorhaben/hoffen, "zu" vor dem trennbaren Verb statt in der Mitte, Infinitiv nicht am Ende, eigenes Subjekt im Infinitivsatz, "um ... zu" bei verschiedenen Subjekten (statt damit), konjugiertes Verb statt Infinitiv.`,
    avoid: `Keine Aufgabe, in der dass-Satz und Infinitivsatz beide korrekt wären, wenn die Konstruktion geprüft wird.
Keine Optionen, die zusätzlich die Verbform des Hauptsatzes verändern.`,
  },

  // ─── Fortgeschrittene Themen ─────────────────────────────────────

  "Konjunktiv II": {
    rule: `Der Konjunktiv II drückt Irreales aus: irreale Bedingung, irrealer Wunsch, höfliche Bitte, Ratschlag, Vermutung, irrealer Vergleich.
Standardform: würde + Infinitiv am Satzende: "Ich würde gern mitkommen.", "Wenn ich Zeit hätte, würde ich dich besuchen."
EIGENE Formen (statt würde) haben vor allem: sein→wäre, haben→hätte, werden→würde, die Modalverben können→könnte, müssen→müsste, dürfen→dürfte, sollen→sollte, mögen→möchte, wollen→wollte; dazu wissen→wüsste, brauchen→bräuchte, geben→gäbe, kommen→käme, gehen→ginge, tun→täte, finden→fände, bleiben→bliebe.
Bildung der eigenen Formen: Präteritumstamm + Umlaut + Endungen -e, -est, -e, -en, -et, -en: war→wäre, wärest, wäre, wären, wäret, wären.
sollen und wollen bekommen KEINEN Umlaut: sollte, wollte — sie sind mit dem Präteritum formgleich.
Bei sein, haben und den Modalverben ist "würde" unüblich: "Wenn ich reich wäre, ..." | Falsch: "Wenn ich reich werden würde, ..."
Im wenn-Satz UND im Hauptsatz steht der Konjunktiv II; zweimal "würde" vermeidet man: "Wenn ich mehr Zeit hätte, würde ich mehr lesen."
"wenn" kann entfallen; dann steht das Verb auf Position 1: "Hätte ich mehr Zeit, würde ich mehr lesen."
VERGANGENHEIT: hätte/wäre + Partizip II — es gibt nur EINE Vergangenheitsform: "Wenn ich das gewusst hätte, wäre ich früher gekommen." | Falsch: "Wenn ich das gewusst würde haben."
Höflichkeit: "Könnten Sie mir helfen?", "Ich hätte gern einen Kaffee.", "Würden Sie bitte das Fenster schließen?"
Ratschlag mit sollte: "Du solltest mehr schlafen." Irrealer Vergleich mit "als ob" und Verbendstellung: "Er tut so, als ob er alles wüsste."`,
    design: `Der Kontext muss die Irrealität erzwingen: eine Bedingung, die nicht erfüllt ist, ein Wunsch, eine höfliche Bitte oder ein Ratschlag. Sonst ist auch der Indikativ richtig.
Prüfe genau einen Punkt: eigene Form gegen würde-Umschreibung, Gegenwart gegen Vergangenheit, Verbstellung im wenn-Satz oder Indikativ gegen Konjunktiv.`,
    formats: ["umformung","satzvarianten","dialog","bedeutung","fehlerkorrektur"],
    traps: `würde bei sein/haben/Modalverben (würde sein statt wäre), Indikativ statt Konjunktiv (Wenn ich Zeit habe, würde ich...), doppeltes würde in beiden Satzteilen, falsch gebildete Vergangenheit (würde gewusst haben statt hätte gewusst), fehlender Umlaut (hatte statt hätte, konnte statt könnte), Umlaut bei sollen/wollen (söllte, wöllte), fehlende Inversion nach vorangestelltem wenn-Satz.`,
    avoid: `Keine Aufgabe ohne Irrealitätssignal — sonst sind Indikativ und Konjunktiv beide möglich.
Keine Optionen, die zugleich Zeitstufe und Formtyp wechseln, wenn nur eines geprüft wird.`,
  },

  "Passiv": {
    rule: `Das Vorgangspassiv rückt die HANDLUNG in den Vordergrund; wer handelt, ist nebensächlich oder unbekannt.
Bildung: werden (konjugiert) + Partizip II am Satzende.
Zeiten: Präsens "wird gelesen"; Präteritum "wurde gelesen"; Perfekt "ist gelesen WORDEN" (nicht "geworden"!); Plusquamperfekt "war gelesen worden"; Futur "wird gelesen werden"; mit Modalverb "muss gelesen werden".
Umformung Aktiv → Passiv: Das AKKUSATIVOBJEKT des Aktivsatzes wird zum Subjekt im Nominativ; das Aktivsubjekt wird weggelassen oder als "von + Dativ" angehängt.
"Der Mechaniker repariert das Auto." → "Das Auto wird (vom Mechaniker) repariert."
von + Dativ nennt den HANDELNDEN (Person, Institution): "von meinem Bruder". durch + Akkusativ nennt das MITTEL oder die Ursache: "durch einen Sturm".
Der Dativ bleibt im Passiv DATIV und wird NICHT zum Subjekt: "Er hilft dem Kind." → "Dem Kind wird geholfen." Das Passiv ist dann subjektlos; Position 1 kann "es" füllen: "Es wird dem Kind geholfen."
Verben ohne Akkusativobjekt bilden ein unpersönliches Passiv: "Hier wird nicht geraucht.", "Am Samstag wird gearbeitet."
KEIN Passiv bilden: haben, besitzen, kennen, wissen, bekommen, es gibt, sowie reflexive Verben.
Im Nebensatz steht das finite Verb am Ende: "..., weil das Auto repariert wird."`,
    design: `Am besten als Umformung: Der Aktivsatz steht im display, die Anweisung nennt die Zielzeit exakt, die Optionen sind vollständige Passivsätze.
Prüfe genau einen Punkt: die Zeitform, "worden" gegen "geworden", von gegen durch, oder den Umgang mit dem Dativobjekt.`,
    formats: ["umformung","satzvarianten","bedeutung","fehlerkorrektur"],
    traps: `"geworden" statt "worden" im Perfekt, Infinitiv statt Partizip (wird reparieren), Zustandspassiv statt Vorgangspassiv (ist repariert statt wird repariert), Akkusativ als Subjekt beibehalten (Das Auto wird den Mechaniker repariert), Dativobjekt zum Nominativ gemacht (Das Kind wird geholfen), "durch" bei einer handelnden Person, falsche Zeitform gegenüber der Anweisung.`,
    avoid: `Keine Umformungsaufgabe ohne exakte Angabe der Zielzeit — sonst sind mehrere Passivsätze korrekt.
Keine Verben, die gar kein Passiv bilden.`,
  },

  "Zustandspassiv": {
    rule: `Das Zustandspassiv beschreibt das ERGEBNIS einer Handlung, nicht die Handlung selbst.
Bildung: sein (konjugiert) + Partizip II: "Das Fenster ist geöffnet." Präteritum: "war geöffnet". Es gibt praktisch nur diese zwei Zeitstufen.
Der entscheidende Gegensatz:
— VORGANGSPASSIV (werden + Partizip II) = der Vorgang läuft: "Das Fenster wird geöffnet." (jemand öffnet es gerade)
— ZUSTANDSPASSIV (sein + Partizip II) = der Zustand danach: "Das Fenster ist geöffnet." (es steht offen)
Zeitliche Reihenfolge: Erst der Vorgang, dann der Zustand. "Der Brief wird geschrieben." → danach: "Der Brief ist geschrieben."
Signale für den Zustand: schon, bereits, seit, endlich, jetzt, immer noch. Signale für den Vorgang: gerade, jeden Tag, von + Person, im Moment.
Der Handelnde wird beim Zustandspassiv normalerweise NICHT genannt — "von" passt schlecht: "Die Tür ist geschlossen." (nicht: "Die Tür ist vom Hausmeister geschlossen.")
Nicht verwechseln mit dem Perfekt Aktiv: "Er ist gekommen." (Perfekt eines Bewegungsverbs) gegenüber "Das Fenster ist geöffnet." (Zustandspassiv).
Nicht verwechseln mit dem Perfekt des Vorgangspassivs: "Das Fenster ist geöffnet WORDEN." (Vorgang, abgeschlossen) gegenüber "Das Fenster ist geöffnet." (Zustand).
Manche Partizipien sind zu reinen Adjektiven geworden: verliebt, erschöpft, begeistert, interessiert.`,
    design: `Nimm das Format Bedeutungsunterscheidung: Die Situation muss eindeutig entweder den Vorgang oder das Ergebnis meinen, und beide Sätze sind für sich wohlgeformt.
Alternativ eine Umformung mit exakter Zielangabe ("als Zustand beschreiben").`,
    formats: ["bedeutung","umformung","satzvarianten","fehlerkorrektur"],
    traps: `werden statt sein und umgekehrt, "ist geöffnet worden" (Perfekt Vorgangspassiv) als Zustandsvariante angeboten, Handelnder mit "von" im Zustandspassiv, Verwechslung mit dem Perfekt Aktiv bei Bewegungsverben, falsche Zeitstufe (war statt ist).`,
    avoid: `Keine Aufgabe ohne klares Vorgangs- oder Zustandssignal — dann sind beide Formen richtig.
Keine Verben, die kein Passiv bilden.`,
  },

  "Plusquamperfekt": {
    rule: `Bildung: hatte/war (Präteritum von haben/sein) + Partizip II. Bedeutung: VORZEITIGKEIT — eine Handlung liegt VOR einer anderen Handlung in der Vergangenheit.
hatte, hattest, hatte, hatten, hattet, hatten | war, warst, war, waren, wart, waren.
Hilfsverb-Wahl wie im Perfekt: sein bei Bewegung und Zustandsänderung (war gegangen, war gefahren, war eingeschlafen), haben bei allen anderen (hatte gemacht, hatte gegessen).
Typische Konstruktion mit "nachdem": Nebensatz im Plusquamperfekt + Hauptsatz im Präteritum/Perfekt: "Nachdem ich gegessen hatte, ging ich spazieren." | Falsch: "Nachdem ich gegessen habe, ging ich spazieren." | Falsch: "Nachdem ich gegessen hatte, gehe ich spazieren."
Auch mit: als, bevor, schon, zuerst: "Der Zug war schon abgefahren, als wir am Bahnhof ankamen."
Im Nebensatz steht das Hilfsverb am ENDE: "..., weil er den Schlüssel vergessen hatte."
Richtig: "Ich hatte den Film schon gesehen, deshalb ging ich nicht ins Kino." | Falsch: "Ich habe den Film schon gesehen gehabt."`,
    design: `Das Plusquamperfekt braucht IMMER eine zweite Handlung als Bezugspunkt — sonst ist es nicht begründbar. Baue deshalb zwei Ereignisse in die Aufgabe (mit nachdem, bevor, als, schon, zuerst).
Format Satzverbindung oder Umformung: Der Lernende muss entscheiden, welches Ereignis früher liegt und welche Zeitform es bekommt.`,
    formats: ["verbindung","umformung","mehrfachluecke","bedeutung","satzvarianten"],
    traps: `Perfekt statt Plusquamperfekt nach "nachdem", Präsens im Hauptsatz nach einem nachdem-Satz, falsches Hilfsverb (hatte gefahren statt war gefahren), doppeltes Perfekt (habe gesehen gehabt), Hilfsverb nicht am Ende im Nebensatz, vertauschte Reihenfolge der Ereignisse.`,
    avoid: `Keine Aufgabe mit nur einer Handlung — dann ist auch das Perfekt korrekt.
Keine Optionen, die zusätzlich die Person wechseln.`,
  },

  "Konjunktiv I": {
    rule: `Der Konjunktiv I steht in der INDIREKTEN REDE, vor allem in Nachrichten, Berichten und Zitaten.
Bildung: Infinitivstamm + Endungen -e, -est, -e, -en, -et, -en: er sage, er komme, er habe, er gehe, er wisse. sein ist unregelmäßig: ich sei, du sei(e)st, er sei, wir seien, ihr seiet, sie seien — und in der 1./3. Person Singular OHNE -e.
Praktisch wichtig ist fast nur die 3. Person Singular: "Er sagt, er komme später.", "Sie erklärt, das Projekt sei fertig."
ERSATZREGEL: Wenn die Konjunktiv-I-Form mit dem Indikativ identisch ist (vor allem im Plural und in der 1. Person Singular), weicht man auf den Konjunktiv II aus: "Sie sagen, sie hätten keine Zeit." (nicht "sie haben"), "Er sagt, ich müsste warten."
Vergangenheit: EINE einzige Form mit habe/sei + Partizip II, egal welche Vergangenheit in der direkten Rede stand: "Er sagte: Ich bin gekommen." → "Er sagte, er sei gekommen."
Zukunft: werde + Infinitiv: "Er sagt, er werde morgen kommen."
Bei der Umformung ändern sich Pronomen und Zeitangaben mit: "Ich komme morgen." → "Er sagte, er komme am nächsten Tag."
Die indirekte Rede kann mit oder ohne "dass" stehen. Mit "dass" gilt Verbendstellung: "Er sagt, dass er später komme."
Modalverben: er könne, er müsse, er dürfe, er wolle, er solle.
In der gesprochenen Sprache steht oft der Indikativ — in der Übung ist der Konjunktiv I die Zielform, wenn die Anweisung ihn verlangt.`,
    design: `Format Umformung: Die direkte Rede steht im display, die Anweisung verlangt die indirekte Rede. Die Optionen sind vollständige Sätze.
Prüfe einen Punkt: die Konjunktiv-I-Form der 3. Person, die Ersatzregel mit Konjunktiv II, die einheitliche Vergangenheitsform oder die Anpassung von Pronomen und Zeitangaben.`,
    formats: ["umformung","satzvarianten","fehlerkorrektur"],
    traps: `Indikativ statt Konjunktiv I (er kommt), "sei" mit -e in der 3. Person (er seie), Konjunktiv II, wo Konjunktiv I eindeutig ist (er käme statt er komme), Indikativ im Plural statt der Ersatzform mit Konjunktiv II, Beibehaltung der ursprünglichen Zeitform statt der einheitlichen Vergangenheitsform, nicht angepasste Pronomen.`,
    avoid: `Keine Aufgabe in der 1. Person Singular ohne Ersatzregel — dort ist die Form mehrdeutig.
Keine Optionen, die zusätzlich den Inhalt der Aussage verändern.`,
  },

  "Doppelkonjunktionen": {
    rule: `sowohl ... als auch (beides): "Er spricht sowohl Englisch als auch Spanisch."
entweder ... oder (eins von beiden): "Wir gehen entweder ins Kino oder ins Theater." Am Satzanfang mit Inversion: "Entweder gehen wir ins Kino, oder wir bleiben zu Hause."
weder ... noch (keins von beiden) — KEINE zusätzliche Verneinung: "Er trinkt weder Kaffee noch Tee." | Falsch: "Er trinkt nicht weder Kaffee noch Tee."
nicht nur ... sondern auch: "Sie ist nicht nur klug, sondern auch fleißig." (Komma vor sondern!)
zwar ... aber (Einschränkung): "Die Wohnung ist zwar klein, aber sehr gemütlich."
einerseits ... andererseits (zwei Seiten): "Einerseits will ich reisen, andererseits fehlt mir das Geld."
je ... desto/umso: "je" leitet einen NEBENSATZ ein (Verb am Ende), "desto/umso" einen Hauptsatz mit INVERSION, beide mit Komparativ: "Je mehr ich lerne, desto besser verstehe ich." | Falsch: "Je mehr ich lerne, desto ich verstehe besser." | Falsch: "Je ich mehr lerne, ..."
PARALLELITÄT: Beide Teile müssen dieselbe grammatische Struktur verbinden (zwei Nomen, zwei Verben, zwei Sätze). Falsch: "Er ist sowohl klug als auch er arbeitet viel."`,
    design: `Der Kontext muss die logische Beziehung eindeutig festlegen: beides, eines von beidem, keines von beidem, Steigerung, Einschränkung, Gegenüberstellung, Verhältnis.
Format Satzverbindung: zwei Einzelsätze im display, vier vollständige Verbindungen als Optionen. So wird zugleich die Wortstellung geprüft.`,
    formats: ["verbindung","satzvarianten","umformung","fehlerkorrektur"],
    traps: `Falsches Paar (sowohl ... oder, entweder ... noch, weder ... oder), zusätzliche Verneinung bei "weder ... noch", fehlende Inversion nach "entweder" am Satzanfang, fehlendes Komma vor "sondern", "je ... desto" ohne Verbendstellung im je-Satz oder ohne Inversion im desto-Satz, fehlende Parallelität der verbundenen Teile.`,
    avoid: `Keine Aufgabe, in der zwei Paare logisch passen.
Keine Optionen, die zusätzlich die Verbform verändern.`,
  },

  "als vs. wenn": {
    rule: `EINMALIGES Ereignis in der VERGANGENHEIT → als: "Als ich zehn Jahre alt war, zog meine Familie nach Berlin." "Als ich gestern nach Hause kam, regnete es."
WIEDERHOLUNG in der Vergangenheit (immer wenn / jedes Mal wenn) → wenn: "Immer wenn wir Ferien hatten, fuhren wir ans Meer."
GEGENWART und ZUKUNFT (jedes Mal / falls) → wenn: "Wenn ich Zeit habe, lese ich." "Wenn es morgen regnet, bleiben wir zu Hause."
FRAGE nach dem Zeitpunkt (direkt und indirekt) → wann: "Wann kommst du?" "Ich weiß nicht, wann er kommt."
MERKSATZ: einmal + Vergangenheit → als | alles andere → wenn | Frage → wann.
Alle drei leiten Nebensätze ein: finites Verb am ENDE (Ausnahme: "wann" in der direkten Frage). Steht der Nebensatz vorn, folgt im Hauptsatz INVERSION: "Als er kam, schliefen alle schon."
Falsch: "Wenn ich ein Kind war, wohnte ich in Moskau." (einmaliger Zeitraum in der Vergangenheit → als)
Falsch: "Ich weiß nicht, wenn der Film beginnt." (Frage nach dem Zeitpunkt → wann)
Falsch: "Als ich morgen Zeit habe, rufe ich dich an." (Zukunft → wenn)
AUFGABENDESIGN: Der Satz muss die Entscheidung erzwingen — die Zeitform und das Signalwort (einmal/immer/morgen/gestern) müssen eindeutig auf genau eine Lösung zeigen. Optionen: als / wenn / wann / (bei Bedarf) während oder ob.`,
    design: `Der Satz MUSS zwei Signale enthalten: die Zeitform und ein Häufigkeits- oder Zeitsignal (einmal, immer, jedes Mal, gestern, morgen, damals).
Hier sind Einwortoptionen (als/wenn/wann/während) ausdrücklich richtig, weil das Zielphänomen genau dieses Wort ist — aber der Satz muss dafür genug Kontext liefern.
Das Format Minidialog oder Satzverbindung macht die Entscheidung besonders klar.`,
    formats: ["dialog","luecke","verbindung","fehlerkorrektur"],
    traps: `"wenn" für ein einmaliges Ereignis in der Vergangenheit, "als" für Wiederholung oder Zukunft, "wenn" in der indirekten Frage statt "wann", "wann" im Aussagesatz, fehlende Verbendstellung, fehlende Inversion im Hauptsatz nach vorangestelltem Nebensatz.`,
    avoid: `Keine Aufgabe ohne eindeutiges Zeit- oder Häufigkeitssignal.
Keine Optionen, die zusätzlich die Verbstellung ändern, wenn die Konjunktion geprüft wird.`,
  },

  "Partizip I und II als Adjektive": {
    rule: `Beide Partizipien können vor einem Nomen als Adjektiv stehen und werden dann NORMAL DEKLINIERT.
PARTIZIP I: Infinitiv + d, Bedeutung AKTIV und GLEICHZEITIG ("der gerade tut"): lachen→lachend, schlafen→schlafend, spielen→spielend, kochen→kochend.
Attributiv mit Endung: "das lachende Kind", "die schlafenden Kinder", "mit dem weinenden Mädchen", "kochendes Wasser".
PARTIZIP II: Bedeutung PASSIV und VORZEITIG ("der behandelt wurde", "was schon geschehen ist"): "das gekochte Ei", "die reparierte Uhr", "ein gebrauchtes Auto", "die verlorene Zeit".
Bei intransitiven Verben mit sein hat das Partizip II aktive Bedeutung: "der angekommene Zug", "die eingeschlafene Katze".
Die Probe: Tut das Nomen etwas selbst → Partizip I. Wird oder wurde etwas mit ihm gemacht → Partizip II. "das lesende Kind" (es liest) gegenüber "das gelesene Buch" (es wurde gelesen).
Das Partizip I steht als Attribut, NICHT als Prädikativ: "Das Kind ist lachend." ist falsch — richtig: "Das Kind lacht."
Erweiterte Partizipialattribute: "das im Garten spielende Kind", "die gestern reparierte Uhr" — die Ergänzungen stehen zwischen Artikel und Partizip.
"zu" + Partizip I drückt Notwendigkeit aus: "die zu lösende Aufgabe" (= die gelöst werden muss).
Endungen wie bei jedem Adjektiv: nach bestimmtem Artikel schwach, nach ein/kein gemischt, ohne Artikel stark.`,
    design: `Der Satz muss die Richtung der Handlung eindeutig machen: Handelt das Nomen selbst oder wird an ihm gehandelt? Erst dann ist Partizip I oder II bestimmbar.
Prüfe entweder die Wahl Partizip I gegen Partizip II (Format Bedeutungsunterscheidung) oder die Deklinationsendung bei feststehendem Partizip.`,
    formats: ["umformung","luecke","bedeutung","fehlerkorrektur"],
    traps: `Partizip II statt Partizip I bei aktiver Bedeutung (das gelachte Kind), Partizip I statt Partizip II bei passiver Bedeutung (das kochende Ei für ein gekochtes), fehlende Adjektivendung (das lachend Kind), falsche Endung nach ein/der, Partizip I als Prädikativ (Das Kind ist lachend), Infinitiv statt Partizip I (das lachen Kind).`,
    avoid: `Keine Aufgabe, in der beide Partizipien inhaltlich denkbar sind.
Keine Vermischung von Partizipwahl und Adjektivendung in derselben Aufgabe.`,
  },
};

/**
 * Die Clients schicken die Themennamen mal mit Umlaut ("Präteritum"), mal
 * ASCII-transliteriert ("Praeteritum"). Beides muss dieselbe Regel finden.
 */
function normalizeTopicKey(topic) {
  return String(topic || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** Zweite, gröbere Normalisierung: ae/oe/ue fallen auf a/o/u zusammen. */
function looseTopicKey(topic) {
  return normalizeTopicKey(topic)
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u');
}

/** Namen, unter denen ein Thema zusätzlich ankommen kann. */
const TOPIC_ALIASES = {
  'Possessivpronomen': 'Possessivpronomen in verschiedenen Kasus',
  'Possessivpronomen in Kasus': 'Possessivpronomen in verschiedenen Kasus',
  'Modalverben Präteritum': 'Modalverben in Präteritum',
  'Modalverben im Präteritum': 'Modalverben in Präteritum',
  'Partizip I und II': 'Partizip I und II als Adjektive',
  'Partizipien als Adjektive': 'Partizip I und II als Adjektive',
  'als oder wenn': 'als vs. wenn',
  'Vorgangspassiv': 'Passiv',
};

const STRICT_INDEX = Object.create(null);
const LOOSE_INDEX = Object.create(null);
for (const topic of Object.keys(GRAMMAR_RULES)) {
  STRICT_INDEX[normalizeTopicKey(topic)] = topic;
  LOOSE_INDEX[looseTopicKey(topic)] = topic;
}
for (const [alias, target] of Object.entries(TOPIC_ALIASES)) {
  STRICT_INDEX[normalizeTopicKey(alias)] = target;
  LOOSE_INDEX[looseTopicKey(alias)] = target;
}

/** Kanonischer Themenname oder null. */
function resolveTopic(topic) {
  const strict = STRICT_INDEX[normalizeTopicKey(topic)];
  if (strict) return strict;
  return LOOSE_INDEX[looseTopicKey(topic)] || null;
}

/** Regelsatz zu einem Thema oder null. */
function getTopicRules(topic) {
  const resolved = resolveTopic(topic);
  return resolved ? { topic: resolved, ...GRAMMAR_RULES[resolved] } : null;
}

/**
 * Der Themenblock für den Prompt. Ohne passenden Eintrag bleibt der Block leer —
 * die allgemeinen Qualitätsregeln greifen trotzdem.
 */
function renderTopicBlock(topic) {
  const entry = getTopicRules(topic);
  if (!entry) return '';

  return [
    `GRAMMATIK "${entry.topic}" — halte dich strikt daran:`,
    entry.rule,
    '',
    `AUFGABENDESIGN für "${entry.topic}" — so wird die Aufgabe anspruchsvoll:`,
    entry.design,
    '',
    'GUTE FALSCHE OPTIONEN für dieses Thema (alles echte Lernerfehler):',
    entry.traps,
    '',
    `BEI DIESEM THEMA VERBOTEN:`,
    entry.avoid,
  ].join('\n');
}

/** Formate, die zu einem Thema passen. Fallback für unbekannte Themen. */
function getTopicFormats(topic) {
  const entry = getTopicRules(topic);
  return entry ? entry.formats : ['luecke', 'satzvarianten', 'fehlerkorrektur', 'umformung'];
}

module.exports = {
  GRAMMAR_RULES,
  TOPIC_ALIASES,
  normalizeTopicKey,
  resolveTopic,
  getTopicRules,
  getTopicFormats,
  renderTopicBlock,
};
