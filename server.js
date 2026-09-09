const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const aitunnelClient = process.env.AITUNNEL_API_KEY
  ? new OpenAI({
      apiKey: process.env.AITUNNEL_API_KEY,
      baseURL: 'https://api.aitunnel.ru/v1',
    })
  : null;

const AITUNNEL_MODELS = (process.env.AITUNNEL_MODELS || 'gpt-5.4,gpt-5.2,gpt-5,gpt-5-mini,gpt-4o,gpt-4o-mini')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const questionPool = {};

const TOPIC_RULES = {
  'Infinitiv mit zu': `Verwende NUR Verben, die "zu + Infinitiv" verlangen: versuchen, beginnen, anfangen, aufhören, vorhaben, hoffen, vergessen, planen, sich freuen, Lust haben, Es ist wichtig/möglich/schwer... NIEMALS Modalverben (können, müssen, sollen, wollen, dürfen, mögen) — diese stehen mit Infinitiv OHNE "zu"! Richtig: "Er versucht, den Bahnhof zu finden." | Falsch: "Er kann den Bahnhof zu finden."`,

  'Reflexive Verben': `Reflexivpronomen Akkusativ: mich, dich, sich, uns, euch, sich. Dativ: mir, dir, sich, uns, euch, sich — Akkusativ und Dativ unterscheiden sich NUR in der 1./2. Person Singular (mich/mir, dich/dir)!
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

  'Modalverben': `Modalverben: können, müssen, sollen, wollen, dürfen, mögen/möchten. Modalverb auf Position 2, Infinitiv am Satzende OHNE "zu"! Richtig: "Er kann den Bahnhof finden." | Falsch: "Er kann den Bahnhof zu finden."`,

  'Perfekt': `sein + Partizip II bei: Bewegungsverben (gehen→ist gegangen, fahren→ist gefahren, kommen→ist gekommen, fliegen→ist geflogen, laufen→ist gelaufen), Zustandsänderung (einschlafen→ist eingeschlafen, aufwachen, sterben, werden, bleiben). haben + Partizip II bei ALLEN anderen Verben (machen→hat gemacht, essen→hat gegessen, lesen→hat gelesen). Partizip II: ge-...-t (regelmäßig: gemacht, gekauft), ge-...-en (unregelmäßig: gegangen, geschrieben). Verben auf -ieren: KEIN ge- (studiert, telefoniert). Trennbare: ge- zwischen Präfix und Stamm (ein·ge·kauft, auf·ge·standen). Untrennbare (be-, er-, ver-, ent-, zer-, emp-, miss-): KEIN ge- (besucht, verstanden, erzählt).`,

  'Präteritum': `Regelmäßig: Stamm + -te/-test/-te/-ten/-tet/-ten (machte, sagtest). Unregelmäßig: Stammvokalwechsel OHNE -te (gehen→ging, sehen→sah, nehmen→nahm, schreiben→schrieb, lesen→las, sprechen→sprach). Mischverben: Vokalwechsel + -te (bringen→brachte, denken→dachte, kennen→kannte, wissen→wusste).`,

  'Dativ': `Dativpräpositionen: mit, nach, bei, seit, von, zu, aus, gegenüber, ab. Dativverben: helfen, danken, gehören, gefallen, schmecken, passen, gratulieren, antworten, folgen. Formen: dem (m/n), der (f), den + -n (Pl). ein→einem (m/n), eine→einer (f).`,

  'Akkusativ': `Akkusativpräpositionen: durch, für, gegen, ohne, um. Formen: den (m), die (f), das (n), die (Pl). ein→einen (m), eine (f), ein (n). Transitive Verben: sehen, kaufen, essen, trinken, lesen, schreiben, brauchen, haben, finden.`,

  'Genitiv': `Genitivpräpositionen: wegen, trotz, während, innerhalb, außerhalb, statt/anstatt. Maskulin/Neutrum: des/eines + Nomen mit -(e)s (des Mannes, eines Kindes). Feminin: der/einer + Nomen OHNE Endung (der Frau, einer Studentin). Plural: der + Nomen OHNE Endung (der Kinder).`,

  'Adjektivdeklination': `Nach bestimmtem Artikel (der/die/das): -e (Nom. Sg. alle Genera), -en (alle anderen Fälle). Nach unbestimmtem Artikel (ein/kein/mein): -er (Nom.m), -es (Nom./Akk.n), -e (Nom./Akk.f), -en (alle anderen). Ohne Artikel: starke Endungen — Signalendungen des bestimmten Artikels: -er (m.Nom), -e (f.Nom/Akk), -es (n.Nom/Akk), -en (Dat/Gen), -em (m/n.Dat). Richtig: "ein alter Mann" (m.Nom), "mit dem alten Mann" (m.Dat) | Falsch: "ein alten Mann", "mit dem alter Mann"`,

  'Wechselpräpositionen': `an, auf, hinter, in, neben, über, unter, vor, zwischen. Wohin? (Bewegung/Richtung) → Akkusativ: "Ich stelle das Buch auf den Tisch." (stellen, legen, setzen, hängen) Wo? (Position/Ort) → Dativ: "Das Buch steht auf dem Tisch." (stehen, liegen, sitzen, hängen)`,

  'Negation': `"nicht" verneint: Verben, Adjektive, Adverbien, Präpositionalphrasen. Position: vor dem verneinten Element. "kein/keine/keinen/keinem/keiner" ersetzt unbestimmten Artikel oder Nullartikel + Nomen. Richtig: "Ich habe kein Auto." | Falsch: "Ich habe nicht Auto." Richtig: "Ich komme nicht aus Berlin." | Falsch: "Ich komme kein aus Berlin."`,

  'Wortstellung im Hauptsatz': `Finites Verb IMMER auf Position 2! Inversion bei Adverb/Objekt auf Pos.1: Verb Pos.2, Subjekt Pos.3. Richtig: "Gestern ging ich ins Kino." | Falsch: "Gestern ich ging ins Kino."`,

  'Wortstellung im Nebensatz': `Nach Konjunktion (weil, dass, wenn, ob, als, nachdem, obwohl): finites Verb am SATZENDE. Richtig: "Ich weiß, dass er morgen kommt." | Falsch: "Ich weiß, dass er kommt morgen." Perfekt im Nebensatz: "..., weil er nach Hause gegangen ist." (Hilfsverb am Ende!)`,

  'dass-Sätze': `"dass" + Nebensatzwortstellung (Verb am Ende). Richtig: "Ich glaube, dass er recht hat." | Falsch: "Ich glaube, dass er hat recht."`,

  'weil-Sätze': `"weil" + Nebensatzwortstellung (Verb am Ende). Richtig: "Ich bleibe zu Hause, weil ich krank bin." | Falsch: "Ich bleibe zu Hause, weil ich bin krank."`,

  'wenn-Sätze': `"wenn" + Verb am Ende. Hauptsatz nach wenn-Satz: Verb auf Position 1. Richtig: "Wenn es regnet, bleibe ich zu Hause." | Falsch: "Wenn es regnet, ich bleibe zu Hause."`,

  'Relativsätze': `Relativpronomen: Genus/Numerus vom BEZUGSWORT, aber Kasus von der FUNKTION im Nebensatz! Bestimme den Kasus: Was ist die Rolle des Relativpronomens im Nebensatz? Subjekt→Nom, direktes Objekt→Akk, indirektes Objekt→Dat. Nom: der/die/das/die. Akk: den/die/das/die. Dat: dem/der/dem/denen. Gen: dessen/deren. Richtig: "Der Turm, den man sehen kann" (Akk! weil: man sieht DEN Turm). Falsch: "Der Turm, dem man sehen kann." Richtig: "Der Mann, dem ich helfe" (Dat! weil: ich helfe DEM Mann). Verb am Ende des Relativsatzes!`,

  'Konjunktiv II': `Irreale Wünsche, höfliche Bitten, Ratschläge. würde + Infinitiv (Standard). Eigene Formen: wäre, hätte, könnte, müsste, sollte, dürfte, wüsste, käme, ginge, bräuchte. Richtig: "Wenn ich reich wäre, würde ich reisen." | Falsch: "Wenn ich reich würde sein..."`,

  'Passiv': `Vorgangspassiv: werden + Partizip II. "Das Buch wird gelesen." Zustandspassiv: sein + Partizip II. "Das Fenster ist geöffnet." Agens: von + Dativ. Präteritum: wurde + P.II. Perfekt: ist + P.II + worden.`,

  'Präsens': `Konjugation: -e, -st, -t, -en, -t, -en. Stammvokalwechsel (2./3. Sg.): e→i (sprechen→spricht, helfen→hilft), e→ie (lesen→liest, sehen→sieht), a→ä (fahren→fährt, schlafen→schläft). Verben auf -ten/-den: Bindevokal -e- (du arbeitest, er arbeitet).`,

  'Verben mit Vokalwechsel': `Starke Verben wechseln im PRÄSENS den Stammvokal, aber NUR in der 2. und 3. Person Singular (du, er/sie/es). Bei ich, wir, ihr, sie/Sie bleibt der Stamm unverändert.
e→i: sprechen→du sprichst, er spricht | helfen→du hilfst, er hilft | geben→du gibst, er gibt | nehmen→du nimmst, er nimmt | essen→du isst, er isst | treffen→du triffst, er trifft | vergessen→du vergisst, er vergisst | werfen→er wirft | sterben→er stirbt | brechen→er bricht.
e→ie: lesen→du liest, er liest | sehen→du siehst, er sieht | empfehlen→du empfiehlst, er empfiehlt | stehlen→er stiehlt | geschehen→es geschieht.
a→ä: fahren→du fährst, er fährt | schlafen→du schläfst, er schläft | tragen→du trägst, er trägt | halten→du hältst, er hält | fallen→er fällt | gefallen→es gefällt | lassen→du lässt, er lässt | waschen→er wäscht | raten→er rät | backen→er bäckt.
au→äu: laufen→du läufst, er läuft. o→ö: stoßen→du stößt, er stößt.
Falsch: "ich spriche" (richtig: ich spreche), "wir fähren" (richtig: wir fahren), "ihr nimmt" (richtig: ihr nehmt), "sie siehen" (richtig: sie sehen).
Imperativ du: e→i/ie BLEIBT, ohne -e und ohne Pronomen — "Sprich!", "Lies!", "Nimm!", "Gib!". a→ä fällt WEG — "Fahr!", "Schlaf!", "Trag!" (nicht "Fähr!").
Modalverben sowie Präteritum- und Partizipformen gehören NICHT zu diesem Thema.
AUFGABENDESIGN: Das Subjekt steht IMMER in der 2. oder 3. Person Singular — nur dort ist der Wechsel sichtbar; ein Satz mit "ich" oder "wir" prüft das Thema nicht. Die Lücke prüft AUSSCHLIESSLICH den Stammvokal: alle Optionen tragen dasselbe Verb in derselben Person und mit derselben, korrekten Personalendung und unterscheiden sich NUR im Vokal. Richtig: "Du ___ viel zu schnell." mit den Optionen "fährst / fahrst / fuhrst / führst". Richtig: "Er ___ jeden Abend mit dem Kapitän." mit den Optionen "spricht / sprecht / spracht / sprächt". Falsch, weil die Endung die Lösung verrät: "Du ___ den Koffer." mit den Optionen "trägst / tragt / trage / trugen".`,

  'Futur I': `werden + Infinitiv. werden: werde, wirst, wird, werden, werdet, werden. Richtig: "Ich werde morgen kommen." | Falsch: "Ich werde morgen zu kommen."`,

  'Imperativ': `du: Stamm (+e optional): "Komm!", "Mach!". e→i/ie bleibt: "Sprich!", "Lies!", "Nimm!" (KEIN -st, KEIN Pronomen). a→ä fällt weg: "Fahr!" (nicht "Fähr!"). ihr: wie Präsens ohne "ihr": "Kommt!", "Lest!". Sie: Infinitiv + Sie: "Kommen Sie!", "Lesen Sie!"`,

  'Artikel': `Bestimmt: der (m), die (f), das (n), die (Pl). Unbestimmt: ein (m/n), eine (f). Genus-Regeln: -ung/-heit/-keit/-schaft/-tion/-tät → die. -chen/-lein → das. -er/-ling → oft der.`,

  'Trennbare Verben': `Trennbare Präfixe (BETONT): ab-, an-, auf-, aus-, bei-, ein-, mit-, nach-, vor-, zu-, zurück-, weg-, los-, her-, hin-, fest-, teil-, statt-, vorbei-, weiter-. Untrennbare Präfixe (unbetont): be-, ge-, er-, ver-, zer-, ent-, emp-, miss-. Wechselnd je nach Bedeutung: durch-, über-, um-, unter-, wider-, wieder-.
Hauptsatz (Präsens/Präteritum): Präfix ans SATZENDE: "Ich stehe jeden Tag um 7 Uhr auf." | Falsch: "Ich aufstehe um 7 Uhr."
Nebensatz: wieder zusammen, am Ende: "..., weil ich um 7 Uhr aufstehe." | Falsch: "..., weil ich um 7 Uhr stehe auf."
Perfekt: ge- ZWISCHEN Präfix und Stamm: aufgestanden, eingekauft, angerufen, mitgekommen. Untrennbare: KEIN ge- (besucht, verstanden).
Mit Modalverb: Infinitiv zusammen am Ende: "Ich muss früh aufstehen." Mit zu: zu zwischen Präfix und Stamm, EIN Wort: "Ich habe vor, früh aufzustehen." | Falsch: "... früh zu aufstehen."
Imperativ: "Steh auf!", "Ruf mich an!", "Kommt mit!"
AUFGABENDESIGN: Die Lücke prüft die POSITION des Präfixes bzw. die Form (aufgestanden / aufzustehen / aufstehen). Alle 4 Optionen enthalten dasselbe Verb in derselben Person — variiere NUR Trennung, ge-Stellung oder zu-Stellung, niemals die Personalendung.`,

  'Verben mit Präpositionen': `Feste Verb-Präposition-Verbindungen — Präposition UND Kasus muss man auswendig lernen.
Akkusativ: warten auf, denken an, sich erinnern an, sich freuen auf (Zukunft) / über (Gegenwart+Vergangenheit), sich interessieren für, sich kümmern um, bitten um, sich bewerben um, sich ärgern über, sprechen über, achten auf, sich verlassen auf, sich vorbereiten auf, stolz sein auf, böse sein auf.
Dativ: teilnehmen an, leiden unter, träumen von, abhängen von, fragen nach, suchen nach, helfen bei, sich beschäftigen mit, sich treffen mit, gehören zu, zufrieden sein mit, einverstanden sein mit, Angst haben vor, sich fürchten vor.
Präpositionaladverb bei SACHEN: da(r)- + Präposition — darauf, daran, darüber, dafür, damit, davon: "Ich warte darauf." Bei PERSONEN: Präposition + Pronomen: "Ich warte auf ihn." | Falsch: "Ich warte darauf." (wenn eine Person gemeint ist)
Fragewort bei Sachen: wo(r)- + Präposition — worauf, woran, worüber, wofür. Bei Personen: "Auf wen wartest du?"
Richtig: "Ich denke oft an meine Großmutter." | Falsch: "Ich denke oft über meine Großmutter."
AUFGABENDESIGN: Prüfe Präposition UND Kasus gemeinsam (z.B. "Ich warte ___ Bus." → auf den / auf dem / an den / für den). Verb, Nomen und Satzbau bleiben in allen 4 Optionen gleich.`,

  'Lassen': `Vier Bedeutungen: 1) ERLAUBEN: "Meine Eltern lassen mich abends ausgehen." 2) VERANLASSEN (jemand anders macht es): "Ich lasse mein Auto reparieren." (nicht ich repariere!) 3) ZURÜCKLASSEN/VERGESSEN: "Ich habe meinen Schlüssel zu Hause gelassen." 4) sich lassen = Passiv-Ersatz (= können + Passiv): "Das Fenster lässt sich nicht öffnen." (= kann nicht geöffnet werden)
Konjugation: ich lasse, du lässt, er/sie/es lässt, wir lassen, ihr lasst, sie lassen. Präteritum: ließ.
Satzbau: lassen auf Position 2, Infinitiv am Satzende OHNE "zu": "Er lässt seine Haare schneiden." | Falsch: "Er lässt seine Haare zu schneiden."
Perfekt MIT Infinitiv → Ersatzinfinitiv "lassen", NICHT "gelassen": "Ich habe mein Auto reparieren lassen." | Falsch: "Ich habe mein Auto reparieren gelassen."
Perfekt OHNE Infinitiv → "gelassen": "Ich habe die Tasche im Auto gelassen."
Imperativ: "Lass uns gehen!" (du), "Lasst uns gehen!" (ihr), "Lassen Sie uns gehen!"`,

  'N-Deklination': `Maskuline Nomen, die in ALLEN Fällen außer dem Nominativ Singular die Endung -n/-en bekommen.
Gruppe 1 — Maskulina auf -e: der Junge, der Kunde, der Kollege, der Neffe, der Zeuge, der Löwe, der Affe, der Russe, der Franzose, der Grieche.
Gruppe 2 — Personenbezeichnungen auf -ent, -ant, -ist, -at, -oge, -graf, -soph, -arch: der Student, der Praktikant, der Journalist, der Polizist, der Tourist, der Soldat, der Kandidat, der Biologe, der Fotograf, der Philosoph.
Gruppe 3 — Einzelfälle: der Mensch, der Nachbar, der Bauer, der Held, der Herr (Singular -n: dem Herrn / Plural -en: die Herren).
Formen: Nom. der Student | Akk. den Studenten | Dat. dem Studenten | Gen. des Studenten.
Gemischte Deklination (zusätzlich -s im Genitiv): der Name → des Namens, der Gedanke → des Gedankens, der Buchstabe, das Herz (n!) → des Herzens.
Die Endung steht AUCH nach Präpositionen: "mit meinem Kollegen", "für den Studenten", "ohne meinen Nachbarn", "Ich helfe dem Jungen."
Richtig: "Ich kenne den Studenten." | Falsch: "Ich kenne den Student."
NICHT n-Deklination: der Lehrer, der Arzt, der Freund, der Mann, der Sohn — diese bleiben unverändert. Falsch: "Ich kenne den Lehreren."
AUFGABENDESIGN: In allen 4 Optionen bleibt der Artikel im richtigen Kasus — variiere NUR die Nomen-Endung, oder prüfe Artikel + Endung gemeinsam. Verwende überwiegend echte n-Deklination-Nomen.`,

  'Pronomen': `Personalpronomen — Nom: ich, du, er, sie, es, wir, ihr, sie/Sie. Akk: mich, dich, ihn, sie, es, uns, euch, sie/Sie. Dat: mir, dir, ihm, ihr, ihm, uns, euch, ihnen/Ihnen.
Das Pronomen richtet sich nach dem GRAMMATISCHEN Genus des Nomens, nicht nach dem Geschlecht: "Das Mädchen ist nett, es wohnt nebenan." "Wo ist der Tisch? — Ich habe ihn verkauft." "Wie findest du die Jacke? — Ich finde sie schön."
Der Kasus kommt vom Verb bzw. der Präposition im Satz: "Ich helfe ihm." (helfen + Dat) | "Ich sehe ihn." (sehen + Akk) | "ohne mich" (Akk), "mit mir" (Dat).
WORTSTELLUNG: Pronomen stehen VOR Nomen: "Ich gebe ihm das Buch." / "Ich gebe es dem Mann." Zwei Pronomen: AKKUSATIV vor DATIV: "Ich gebe es ihm." | Falsch: "Ich gebe ihm es."
Indefinitpronomen: man (Nom.) – einen (Akk.) – einem (Dat.): "Wenn man müde ist, hilft einem Kaffee." jemand/niemand, etwas/nichts, alle/alles, jeder/jede/jedes.
Demonstrativpronomen: dieser/diese/dieses (Endungen wie der/die/das), betontes der/die/das: "Den kenne ich!"
AUFGABENDESIGN: Der Kasus muss aus dem Verb oder der Präposition ableitbar sein, nicht aus der Person. Alle 4 Optionen enthalten Pronomen derselben Person in verschiedenen Kasus/Genera — variiere nie das Verb.`,

  'Possessivpronomen': `Stämme: ich→mein, du→dein, er/es→sein, sie(Sg.)→ihr, wir→unser, ihr→euer, sie(Pl.)→ihr, Sie→Ihr.
ZWEI unabhängige Entscheidungen: der BESITZER bestimmt den STAMM (sein/ihr), das BESESSENE NOMEN bestimmt die ENDUNG (Kasus, Genus, Numerus)!
Endungen wie bei ein/kein: Nom. m mein / f meine / n mein / Pl. meine. Akk. m meinen / f meine / n mein / Pl. meine. Dat. m meinem / f meiner / n meinem / Pl. meinen (+n am Nomen). Gen. m meines / f meiner / n meines / Pl. meiner.
Richtig: "Die Frau sucht ihren Mann." (ihr- weil die Frau besitzt; -en weil "den Mann" Akk. maskulin) | Falsch: "Die Frau sucht seinen Mann." (falscher Besitzer) | Falsch: "Die Frau sucht ihre Mann." (falsche Endung)
Richtig: "Der Mann spielt mit seiner Tochter." (Dat. feminin) | Falsch: "... mit seine Tochter."
euer VERLIERT das -e-, sobald eine Endung kommt: euer Vater, aber eure Mutter, euren Bruder, eurem Kind. | Falsch: "euere Mutter", "eueren Bruder".
unser behält das -e-: unsere Mutter, unseren Vater, unserem Kind.
AUFGABENDESIGN: Der Satz muss BEIDE Entscheidungen erzwingen — Besitzer und Kasus dürfen sich nicht decken. Nimm ein Subjekt in der 3. Person (er/sie) und ein Nomen in einem anderen Kasus als Nominativ. Die 4 Optionen: richtiger Stamm + richtige Endung, richtiger Stamm + falsche Endung, falscher Stamm + richtige Endung, falscher Stamm + falsche Endung.`,

  'Steigerung': `Positiv – Komparativ (+ -er) – Superlativ (am + -sten / der/die/das + -ste): schnell – schneller – am schnellsten.
UMLAUT bei den meisten einsilbigen Adjektiven: alt–älter–am ältesten, jung, lang, kurz, warm, kalt, stark, schwach, hart, klug, dumm, oft, arm. KEIN Umlaut bei: schlank, klar, voll, froh, bunt, laut, flach, rasch, sanft.
Unregelmäßig: gut–besser–am besten | viel–mehr–am meisten | gern–lieber–am liebsten | hoch–höher–am höchsten | nah–näher–am nächsten | groß–größer–am größten | teuer–teurer–am teuersten | dunkel–dunkler.
Nach -d, -t, -s, -ß, -z, -sch kommt -esten: am ältesten, am kürzesten, am heißesten, am hübschesten.
VERGLEICH: Gleichheit "(genau)so ... wie": "Er ist so groß wie ich." Ungleichheit Komparativ + "als": "Er ist größer als ich." | Falsch: "Er ist größer wie ich."
NIEMALS "mehr + Adjektiv" wie im Englischen: Falsch: "Er ist mehr interessant." Richtig: "Er ist interessanter."
Vor dem Nomen wird gesteigertes Adjektiv DEKLINIERT: der schnellere Zug, ein schnellerer Zug, der schnellste Zug, mit dem schnellsten Zug. | Falsch: "der schneller Zug".
AUFGABENDESIGN: Alle 4 Optionen beziehen sich auf dasselbe Adjektiv — variiere Steigerungsstufe, Umlaut, Vergleichspartikel (als/wie) oder Deklinationsendung.`,

  'Lokale Präpositionen': `WO? (Position, Dativ): in der Stadt, an der Wand, auf dem Tisch, bei meinen Eltern, neben dem Haus, hinter der Schule, vor dem Kino, unter dem Bett, über dem Sofa, zwischen den Häusern, gegenüber dem Bahnhof.
WOHIN? (Richtung): nach + Städte/Länder OHNE Artikel: "Ich fahre nach Berlin / nach Italien." | zu + Personen, Institutionen, Gebäude als Ziel: "Ich gehe zum Arzt / zur Schule / zu meiner Oma." | in + Länder MIT Artikel und geschlossene Räume (Akkusativ!): "in die Schweiz, in die Türkei, in die USA, ins Kino, in die Schule (hinein)." | auf + öffentliche Plätze/Ämter: "auf die Post, auf den Markt, auf die Bank." | an + Gewässer/Grenzflächen: "ans Meer, an den Strand, an die Wand."
WOHER? aus (Herkunft, aus geschlossenem Raum): "Ich komme aus Polen / aus dem Haus." | von (von einem Ort/einer Person weg): "Ich komme von der Arbeit / von meiner Oma."
bei = Aufenthalt bei Personen oder Firmen: "Ich wohne bei meinen Eltern." "Ich arbeite bei Siemens."
Richtig: "Ich fahre nach Berlin." | Falsch: "Ich fahre in Berlin." (das ist WO) | Richtig: "Ich bin in Berlin."
Richtig: "Ich gehe zum Arzt." | Falsch: "Ich gehe nach dem Arzt." / "Ich gehe in den Arzt."
Richtig: "Ich gehe in die Schule." (wohin, Akk.) | "Ich bin in der Schule." (wo, Dat.)`,

  'Temporale Präpositionen': `um + Uhrzeit: "um 8 Uhr", "um Mitternacht".
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

  'Satzklammer': `Das Prädikat wird auf ZWEI Positionen verteilt; dazwischen liegt das Mittelfeld.
LINKE KLAMMER (Position 2): finites Verb — Modalverb, Hilfsverb (haben/sein/werden) oder Vollverb.
RECHTE KLAMMER (Satzende): Infinitiv, Partizip II, trennbares Präfix oder Prädikatsteil.
"Ich [habe] gestern lange mit meiner Schwester [telefoniert]." | "Ich [muss] morgen sehr früh [aufstehen]." | "Ich [stehe] jeden Tag um sechs [auf]." | "Er [wird] nächstes Jahr in Berlin [studieren]." | "Sie [hat] das Buch [lesen wollen]."
NEBENSATZ: Die Klammer schließt sich am Ende, das finite Verb steht GANZ hinten: "..., weil ich gestern lange telefoniert habe." | "..., weil ich morgen früh aufstehen muss."
MITTELFELD (TeKaMoLo): Subjekt – Dativobjekt – TEmporal (wann) – KAusal (warum) – MOdal (wie) – LOkal (wo) – Akkusativobjekt. Pronomen rücken nach vorn, direkt hinter das finite Verb.
Hinter die rechte Klammer gehört NICHTS (Ausnahme Nachfeld: Vergleiche mit als/wie, Nebensätze).
Richtig: "Ich muss morgen früh aufstehen." | Falsch: "Ich muss aufstehen morgen früh."
Richtig: "Ich habe ihr gestern ein Buch geschenkt." | Falsch: "Ich habe geschenkt ihr gestern ein Buch."`,

  'Indirekte Fragen': `Indirekte Fragen sind NEBENSÄTZE: finites Verb am ENDE, KEINE Inversion.
Mit W-Wort (wer, was, wo, wann, wie, warum, welcher, wie viel): "Wo wohnst du?" → "Ich weiß nicht, wo du wohnst." | Falsch: "Ich weiß nicht, wo wohnst du."
Ja/Nein-Frage → Einleitung mit "ob": "Kommst du mit?" → "Ich frage, ob du mitkommst." | Falsch: "Ich frage, ob kommst du mit."
NIEMALS "wenn" statt "ob"! Falsch: "Ich weiß nicht, wenn er kommt." Richtig: "Ich weiß nicht, ob er kommt." (= Ja/Nein) oder "..., wann er kommt." (= Zeitpunkt).
Einleitungen: Ich weiß nicht, ... | Können Sie mir sagen, ... | Ich möchte wissen, ... | Er fragt, ... | Weißt du, ...
Fragezeichen nur, wenn der GANZE Satz eine Frage ist: "Weißt du, wo er wohnt?" aber "Ich weiß nicht, wo er wohnt."
Trennbare Verben und Perfekt im Nebensatz: "Ich frage, ob er mitkommt." / "Ich weiß nicht, wann sie angekommen ist."
AUFGABENDESIGN: Prüfe entweder die Einleitung (ob/wenn/wann/dass) oder die Wortstellung im Nebensatz — beides mit identischem Wortmaterial in allen 4 Optionen.`,

  'Plusquamperfekt': `Bildung: hatte/war (Präteritum von haben/sein) + Partizip II. Bedeutung: VORZEITIGKEIT — eine Handlung liegt VOR einer anderen Handlung in der Vergangenheit.
hatte, hattest, hatte, hatten, hattet, hatten | war, warst, war, waren, wart, waren.
Hilfsverb-Wahl wie im Perfekt: sein bei Bewegung und Zustandsänderung (war gegangen, war gefahren, war eingeschlafen), haben bei allen anderen (hatte gemacht, hatte gegessen).
Typische Konstruktion mit "nachdem": Nebensatz im Plusquamperfekt + Hauptsatz im Präteritum/Perfekt: "Nachdem ich gegessen hatte, ging ich spazieren." | Falsch: "Nachdem ich gegessen habe, ging ich spazieren." | Falsch: "Nachdem ich gegessen hatte, gehe ich spazieren."
Auch mit: als, bevor, schon, zuerst: "Der Zug war schon abgefahren, als wir am Bahnhof ankamen."
Im Nebensatz steht das Hilfsverb am ENDE: "..., weil er den Schlüssel vergessen hatte."
Richtig: "Ich hatte den Film schon gesehen, deshalb ging ich nicht ins Kino." | Falsch: "Ich habe den Film schon gesehen gehabt."`,

  'Doppelkonjunktionen': `sowohl ... als auch (beides): "Er spricht sowohl Englisch als auch Spanisch."
entweder ... oder (eins von beiden): "Wir gehen entweder ins Kino oder ins Theater." Am Satzanfang mit Inversion: "Entweder gehen wir ins Kino, oder wir bleiben zu Hause."
weder ... noch (keins von beiden) — KEINE zusätzliche Verneinung: "Er trinkt weder Kaffee noch Tee." | Falsch: "Er trinkt nicht weder Kaffee noch Tee."
nicht nur ... sondern auch: "Sie ist nicht nur klug, sondern auch fleißig." (Komma vor sondern!)
zwar ... aber (Einschränkung): "Die Wohnung ist zwar klein, aber sehr gemütlich."
einerseits ... andererseits (zwei Seiten): "Einerseits will ich reisen, andererseits fehlt mir das Geld."
je ... desto/umso: "je" leitet einen NEBENSATZ ein (Verb am Ende), "desto/umso" einen Hauptsatz mit INVERSION, beide mit Komparativ: "Je mehr ich lerne, desto besser verstehe ich." | Falsch: "Je mehr ich lerne, desto ich verstehe besser." | Falsch: "Je ich mehr lerne, ..."
PARALLELITÄT: Beide Teile müssen dieselbe grammatische Struktur verbinden (zwei Nomen, zwei Verben, zwei Sätze). Falsch: "Er ist sowohl klug als auch er arbeitet viel."`,

  'als vs. wenn': `EINMALIGES Ereignis in der VERGANGENHEIT → als: "Als ich zehn Jahre alt war, zog meine Familie nach Berlin." "Als ich gestern nach Hause kam, regnete es."
WIEDERHOLUNG in der Vergangenheit (immer wenn / jedes Mal wenn) → wenn: "Immer wenn wir Ferien hatten, fuhren wir ans Meer."
GEGENWART und ZUKUNFT (jedes Mal / falls) → wenn: "Wenn ich Zeit habe, lese ich." "Wenn es morgen regnet, bleiben wir zu Hause."
FRAGE nach dem Zeitpunkt (direkt und indirekt) → wann: "Wann kommst du?" "Ich weiß nicht, wann er kommt."
MERKSATZ: einmal + Vergangenheit → als | alles andere → wenn | Frage → wann.
Alle drei leiten Nebensätze ein: finites Verb am ENDE (Ausnahme: "wann" in der direkten Frage). Steht der Nebensatz vorn, folgt im Hauptsatz INVERSION: "Als er kam, schliefen alle schon."
Falsch: "Wenn ich ein Kind war, wohnte ich in Moskau." (einmaliger Zeitraum in der Vergangenheit → als)
Falsch: "Ich weiß nicht, wenn der Film beginnt." (Frage nach dem Zeitpunkt → wann)
Falsch: "Als ich morgen Zeit habe, rufe ich dich an." (Zukunft → wenn)
AUFGABENDESIGN: Der Satz muss die Entscheidung erzwingen — die Zeitform und das Signalwort (einmal/immer/morgen/gestern) müssen eindeutig auf genau eine Lösung zeigen. Optionen: als / wenn / wann / (bei Bedarf) während oder ob.`,

  'Nominativ': `Subjekt im Nominativ. Prädikativ nach sein/werden/bleiben ebenfalls Nominativ. Richtig: "Der Mann ist ein guter Lehrer." | Falsch: "Der Mann ist einen guten Lehrer."`,
};

// Der Client sendet ASCII-transliterierte Themennamen ("Praesens", "Relativsaetze"),
// die Regeln stehen unter den deutschen Schreibweisen. Über eine normalisierte
// Suche greifen beide Varianten auf dieselbe Regel zu.
function normalizeTopic(topic) {
  return String(topic)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

const TOPIC_RULES_INDEX = Object.create(null);
for (const [key, value] of Object.entries(TOPIC_RULES)) {
  TOPIC_RULES_INDEX[normalizeTopic(key)] = value;
}

function getTopicRule(topic) {
  return TOPIC_RULES_INDEX[normalizeTopic(topic)] || '';
}

function isValidQuestion(q) {
  return (
    q &&
    typeof q.text === 'string' &&
    typeof q.display === 'string' &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    typeof q.correct === 'number' &&
    q.correct >= 0 &&
    q.correct <= 3
  );
}

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate-questions', async (req, res) => {
  const { level, lexicalTopic, grammarTopic, isWortstellung, count, exclude } = req.body;

  if (!level || !grammarTopic) {
    return res.status(400).json({ error: 'level and grammarTopic are required' });
  }

  if (!aitunnelClient) {
    return res.status(503).json({ error: 'AITUNNEL_API_KEY is not configured' });
  }

  const questionsCount = count || 10;
  const cacheKey = `${level}:${grammarTopic}:${lexicalTopic || ''}:${isWortstellung ? 'w' : 'g'}`;

  if (questionPool[cacheKey] && questionPool[cacheKey].length >= questionsCount) {
    const cached = questionPool[cacheKey].splice(0, questionsCount);
    res.json({ questions: cached });
    return;
  }

  let excludeNote = '';
  if (exclude && exclude.length > 0) {
    const short = exclude.slice(-10).map(t => `"${t}"`).join(', ');
    excludeNote = `\nVerwende diese Sätze NICHT: ${short}`;
  }

  const topicRule = getTopicRule(grammarTopic);

  let taskDescription;
  if (isWortstellung) {
    taskDescription = `Erstelle ${questionsCount} Wortstellungsübungen für Deutsch (Niveau ${level}).
Grammatikthema: ${grammarTopic}.
${lexicalTopic ? `Lexikalisches Thema: ${lexicalTopic}. Alle Sätze müssen Wörter aus diesem Thema verwenden.` : ''}

Format:
- "display": Wörter/Phrasen durch " / " getrennt in ZUFÄLLIGER Reihenfolge (NICHT in der korrekten Reihenfolge!)
- "options": 4 vollständige deutsche Sätze — NUR EINER ist grammatisch korrekt
- "correct": Index der korrekten Option (0–3), GLEICHMÄSSIG verteilt
- "text": Kurze Anweisung auf Russisch (z.B. "Расставь слова в правильном порядке:")

Regeln für Wortstellungsübungen:
- Die Wörter in "display" MÜSSEN durcheinander sein — NICHT in der korrekten Reihenfolge!
- NUR EIN Satz darf korrekt sein. Inversionen (z.B. "Morgen gehe ich" statt "Ich gehe morgen") sind AUCH korrekt — biete sie NICHT als falsche Option an!
- Falsche Optionen: klare Wortstellungsfehler (Verb nicht auf Position 2 im Hauptsatz, Verb nicht am Ende im Nebensatz usw.)
- Jeder Satz ANDERS (verschiedene Subjekte, Verben, Situationen)`;
  } else {
    taskDescription = `Erstelle ${questionsCount} Grammatikübungen (Lückenübungen) für Deutsch (Niveau ${level}).
Grammatikthema: ${grammarTopic}.
${lexicalTopic ? `Lexikalisches Thema: ${lexicalTopic}. Alle Sätze müssen Wörter aus diesem Thema verwenden.` : ''}

Format:
- "display": Deutscher Satz mit Lücke ___ an der relevanten Stelle
- "options": 4 Optionen auf Deutsch — NUR EINE ist grammatisch korrekt
- "correct": Index der korrekten Option (0–3), GLEICHMÄSSIG verteilt
- "text": Kurze Anweisung auf Russisch (z.B. "Выбери правильный вариант:")

Regeln für Lückenübungen:
- Falsche Optionen: EINE klare Fehlerart (falscher Kasus, falscher Artikel, falsche Endung, falsche Konjugation)
- Keine absurden oder offensichtlich falschen Optionen — sie müssen plausibel aussehen
- Jeder Satz ANDERS (verschiedene Subjekte, Verben, Situationen)`;
  }

  const prompt = `Du bist ein erfahrener DaF-Lehrer (Deutsch als Fremdsprache) und Lehrbuchautor. Du erstellst Übungen auf dem Qualitätsniveau von Schritte International, Menschen und Aspekte.

${topicRule ? `GRAMMATIKREGELN für "${grammarTopic}" — halte dich STRIKT daran:\n${topicRule}\n` : ''}
${taskDescription}

GER-Niveau: ${level}. Halte dich STRIKT an dieses Niveau! Verwende KEINE Grammatik und KEINEN Wortschatz über ${level}.
${excludeNote}

KRITISCHE REGELN (Verstoß = Ausschuss):
1. Die korrekte Antwort MUSS grammatisch EINWANDFREI sein. Prüfe vor der Ausgabe jeden Satz: Subjekt, Prädikat, Kasus, Genus, Numerus, Wortstellung.
2. Jeder Satz MUSS VOLLSTÄNDIG und SINNVOLL abgeschlossen sein. Kein Satz darf abgeschnitten werden! Wenn ein grammatisch korrekter Satz lang sein muss — schreibe ihn lang. Die Länge ist NICHT begrenzt.
3. Falsche Optionen müssen EINEN KLAREN Fehler enthalten (falscher Kasus, Artikel, Endung, Wortstellung). Keine absurden Optionen.
4. GENAU EINE korrekte Antwort. Wenn zwei Optionen grammatisch korrekt sind — ist die Übung Ausschuss.
5. "correct" — Index der korrekten Antwort (0–3). GLEICHMÄSSIG über die Positionen verteilen.
6. Alle ${questionsCount} Sätze EINZIGARTIG: verschiedene Subjekte, Verben, Situationen. Keine Eintönigkeit.
7. Verwende lebendige, natürliche Sätze wie in den Lehrbüchern Schritte, Menschen, Aspekte.
8. ISOLIERE DAS ZIELPHÄNOMEN: Alle 4 Optionen müssen sich AUSSCHLIESSLICH in dem Merkmal unterscheiden, das das Thema "${grammarTopic}" prüft. Alles andere — Verbkonjugation, Personalendung, Zeitform, Wortwahl, Satzbau — bleibt in allen 4 Optionen IDENTISCH und KORREKT. Eine falsche Option, die schon an einem themenfremden Fehler scheitert, ist wertlos.
9. KEINE GESCHENKTEN AUFGABEN: Die richtige Antwort darf NICHT allein aus Subjekt-Verb-Kongruenz, aus der Person des Subjekts oder aus dem Bauchgefühl ableitbar sein. Stelle dir einen Lernenden vor, der "${grammarTopic}" NICHT beherrscht: Wenn er die Aufgabe trotzdem lösen kann, ist sie Ausschuss — formuliere sie neu, sodass eine echte grammatische Entscheidung nötig ist.
10. KEINE MECHANISCHEN AUFGABEN: Wenn die Lösung nur ein 1:1-Abgleich mit dem Subjekt ist (ohne Kasus-, Positions- oder Rektionsentscheidung), erhöhe den Anspruch — wähle eine Form, Position oder Rektion, bei der man wirklich nachdenken muss.

QUALITÄTSKONTROLLE — prüfe JEDE Übung BEVOR du sie ausgibst:
1. Setze die korrekte Option in den Satz ein → ist er grammatisch PERFEKT? Kasus, Genus, Numerus, Konjugation, Wortstellung — alles korrekt?
2. Setze JEDE falsche Option ein → enthält der Satz einen KLAREN grammatischen Fehler?
3. Gibt es GENAU EINE korrekte Antwort? Wenn zwei Optionen korrekt sein könnten → Übung neu formulieren!
4. Passt die Übung zum Thema "${grammarTopic}" und zum Niveau ${level}?
5. Sind die Sätze natürlich und vollständig?
6. Unterscheiden sich die 4 Optionen NUR im Zielphänomen von "${grammarTopic}"? Enthält eine falsche Option zusätzlich einen themenfremden Fehler (z.B. falsche Personalendung) → Optionen neu bauen!
7. Ist die Aufgabe ohne Kenntnis der Regel lösbar (z.B. durch Kongruenz mit dem Subjekt)? Wenn ja → Übung verwerfen und eine anspruchsvollere formulieren!

Antworte NUR mit einem validen JSON-Array, KEIN Markdown, KEINE Erklärungen:
[{"text":"Anweisung auf Russisch","display":"Deutscher Text","options":["A","B","C","D"],"correct":0}]`;

  const errors = [];
  let text = null;

  for (const model of AITUNNEL_MODELS) {
    try {
      const completion = await aitunnelClient.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      const content = completion.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        text = content.trim();
        break;
      }
      errors.push(`${model}: empty response`);
    } catch (err) {
      const detail = err?.message || String(err);
      errors.push(`${model}: ${detail}`);
      console.error(`AI Tunnel error on model ${model}:`, detail);
    }
  }

  if (!text) {
    return res.status(502).json({ error: 'AI Tunnel: all models failed', detail: errors.join(' | ') });
  }

  try {
    let jsonStr = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    const valid = parsed.filter(isValidQuestion);

    if (!valid.length) {
      console.error('No valid questions parsed. Raw text:', text.slice(0, 500));
      return res.status(502).json({ error: 'No valid questions in LLM response' });
    }

    if (valid.length > questionsCount) {
      if (!questionPool[cacheKey]) questionPool[cacheKey] = [];
      questionPool[cacheKey].push(...valid.slice(questionsCount));
    }

    res.json({ questions: valid.slice(0, questionsCount) });
  } catch (err) {
    console.error('JSON parse error:', err.message, 'Raw text:', text.slice(0, 500));
    res.status(502).json({ error: 'Failed to parse LLM response', detail: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Drucker game running on port ${PORT}`);
});
