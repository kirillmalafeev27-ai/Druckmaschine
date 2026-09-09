'use strict';

const { renderTopicBlock, getTopicFormats, resolveTopic } = require('./grammar-rules');
const { renderFormatCatalogue } = require('./exercise-formats');
const {
  OPTION_SUBSTANCE,
  DISTRACTOR_QUALITY,
  ANTI_PATTERNS,
  COVER_TEST,
  SELF_CHECK,
  buildMixRule,
} = require('./quality-rules');

/**
 * Niveaubeschreibungen. "Niveau A2" allein sagt einem Modell wenig — es braucht
 * konkrete Grenzen für Satzlänge, Strukturen und Wortschatz.
 */
const LEVEL_SPECS = {
  A1: {
    sentenceLength: '6 bis 10 Wörter',
    structures: 'Präsens, Modalverben, Perfekt der häufigsten Verben, Imperativ, Nominativ und Akkusativ, Possessivartikel, einfache Hauptsätze, Verbindung mit und/oder/aber/denn.',
    forbidden: 'Genitiv, Konjunktiv, Passiv, Relativsätze, Plusquamperfekt, Partizipialattribute, Nebensätze außer sehr einfachen weil-Sätzen.',
    vocabulary: 'Nur Alltagswortschatz der ersten Lernmonate: Familie, Wohnung, Essen, Zahlen, Uhrzeit, Einkaufen, Verkehrsmittel.',
    taskNote: 'Die Aufgaben bleiben kurz und konkret. Der Kontext steht direkt im Satz, nicht zwischen den Zeilen.',
  },
  A2: {
    sentenceLength: '8 bis 14 Wörter',
    structures: 'Alle Zeiten außer Plusquamperfekt und Futur II, Dativ, Wechselpräpositionen, Komparativ und Superlativ, trennbare und reflexive Verben, Nebensätze mit weil, dass, wenn, Adjektivdeklination nach bestimmtem und unbestimmtem Artikel.',
    forbidden: 'Konjunktiv I, Passiv in zusammengesetzten Zeiten, erweiterte Partizipialattribute, Nominalisierungen, seltene Genitivpräpositionen.',
    vocabulary: 'Erweiterter Alltagswortschatz: Arbeit, Gesundheit, Reisen, Wetter, Feste, Wohnen, Freizeit.',
    taskNote: 'Minidialoge und kurze Situationen sind auf diesem Niveau besonders gut, weil der Kontext die Entscheidung tragen kann.',
  },
  B1: {
    sentenceLength: '10 bis 18 Wörter',
    structures: 'Alle Zeiten, Vorgangs- und Zustandspassiv, Konjunktiv II, Relativsätze, indirekte Fragen, Infinitivsätze mit zu, Genitiv, Doppelkonjunktionen, alle Nebensatztypen.',
    forbidden: 'Konjunktiv I außer in einfacher indirekter Rede, stark verschachtelte Satzgefüge, Fachsprache.',
    vocabulary: 'Alltag, Beruf, Ausbildung, Medien, Umwelt, Gesellschaft — konkret und gebräuchlich.',
    taskNote: 'Hier gehören Umformungen und Satzverbindungen zum Standardrepertoire. Der Kontext darf über zwei Sätze laufen.',
  },
  B2: {
    sentenceLength: '14 bis 24 Wörter',
    structures: 'Passiv in allen Zeiten, Passiversatzformen, Konjunktiv I und II, Partizipialattribute, Nominalisierung und Verbalisierung, Konnektoren wie zumal, sofern, indem, während, mehrgliedrige Satzgefüge.',
    forbidden: 'Enge Fachterminologie, veraltete oder rein literarische Wendungen.',
    vocabulary: 'Abstrakter: Arbeitswelt, Wissenschaft, Kultur, Politik, Technik — aber allgemein verständlich.',
    taskNote: 'Die Aufgaben dürfen zwei Entscheidungen verlangen, wenn beide zum Thema gehören.',
  },
  C1: {
    sentenceLength: '18 bis 30 Wörter',
    structures: 'Das gesamte Formeninventar, feste Wendungen, Funktionsverbgefüge, erweiterte Attribute, Modalpartikeln, stilistische Varianten.',
    forbidden: 'Konstruierte Sätze ohne realistischen Sprachgebrauch.',
    vocabulary: 'Gehoben, idiomatisch, registerbewusst; Nuancen zwischen nahen Synonymen sind Teil der Aufgabe.',
    taskNote: 'Die Distraktoren dürfen fein sein: Register, Konnotation, Stilbruch statt grober Formfehler.',
  },
};

const DEFAULT_LEVEL = 'B1';

function normalizeLevel(level) {
  const key = String(level || '').trim().toUpperCase();
  return LEVEL_SPECS[key] ? key : DEFAULT_LEVEL;
}

function renderLevelBlock(level) {
  const key = normalizeLevel(level);
  const spec = LEVEL_SPECS[key];

  return `NIVEAU ${key} — halte es strikt ein:
- Satzlänge: ${spec.sentenceLength}.
- Erlaubte Strukturen: ${spec.structures}
- Auf diesem Niveau NICHT verwenden: ${spec.forbidden}
- Wortschatz: ${spec.vocabulary}
- ${spec.taskNote}
Eine Aufgabe, die über dem Niveau liegt, prüft nicht das Thema, sondern den Wortschatz — und ist damit unbrauchbar.`;
}

/** Ausgabeformat 1: JSON-Array. */
const OUTPUT_JSON = `AUSGABEFORMAT — antworte NUR mit einem validen JSON-Array, ohne Markdown, ohne Kommentar, ohne Einleitung:
[
  {
    "format": "id des verwendeten Formats aus dem Katalog",
    "text": "kurze Anweisung auf Russisch",
    "display": "das deutsche Aufgabenmaterial",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "correctAnswer": "exakter Text der richtigen Option, Zeichen für Zeichen wie in options"
  }
]
"correct" ist der Index (0 bis 3) und "correctAnswer" der wörtliche Text derselben Option. Beide müssen übereinstimmen — daran wird deine Antwort geprüft.
Immer genau vier Optionen. Die Pfeile und Buchstaben aus den Beispielen im Katalog gehören NICHT in die Ausgabe.`;

/** Ausgabeformat 2: Text mit getrenntem Lösungsschlüssel. */
const OUTPUT_TEXT = `AUSGABEFORMAT — genau so, ohne Markdown, ohne Erklärungen:
AUFGABEN
1. Format: id des verwendeten Formats aus dem Katalog
Anweisung: kurze Anweisung auf Russisch
Aufgabe: das deutsche Aufgabenmaterial
A) Option A
B) Option B
C) Option C
D) Option D

2. Format: ...
Anweisung: ...
Aufgabe: ...
A) ...
B) ...
C) ...
D) ...

LÖSUNGEN
1: A = exakter Text der Option A
2: C = exakter Text der Option C

Im Lösungsteil stehen der Buchstabe UND der wörtliche Text der richtigen Option. Beides wird gegen die Aufgabe geprüft, also löse jede Aufgabe erst selbst und schreibe den Schlüssel danach.
Immer genau vier Optionen A bis D. Die Pfeile aus den Beispielen im Katalog gehören NICHT in die Ausgabe.`;

/**
 * Baut den vollständigen Prompt.
 *
 * @param {object} options
 * @param {string} options.level           GER-Niveau (A1 … C1)
 * @param {string} options.grammarTopic    Grammatikthema
 * @param {string} [options.lexicalTopic]  Wortschatzthema
 * @param {boolean} [options.isWortstellung] Slot verlangt Wortstellungsübungen
 * @param {number} [options.count]         Anzahl der Aufgaben
 * @param {string[]} [options.exclude]     Schon verwendete Aufgabenstellungen
 * @param {'json'|'text'} [options.output] Ausgabeformat
 */
function buildExercisePrompt(options) {
  const {
    level,
    grammarTopic,
    lexicalTopic,
    isWortstellung = false,
    count = 10,
    exclude = [],
    output = 'json',
  } = options || {};

  const questionsCount = Math.max(1, Math.min(20, Number(count) || 10));
  const topic = resolveTopic(grammarTopic) || String(grammarTopic || '').trim();

  // Wortstellungs-Slots verlangen Formate, die mit ganzen Sätzen arbeiten.
  const formats = isWortstellung
    ? ['wortstellung', 'satzvarianten', 'fehlerkorrektur', 'verbindung']
    : getTopicFormats(grammarTopic);

  const topicBlock = renderTopicBlock(grammarTopic);
  const lexicalBlock = lexicalTopic
    ? `WORTSCHATZTHEMA: ${lexicalTopic}. Alle Aufgaben spielen in diesem Themenfeld — Personen, Orte und Gegenstände stammen daraus. Das Grammatikthema bleibt trotzdem der Prüfgegenstand.`
    : 'WORTSCHATZTHEMA: frei wählbar, aber innerhalb eines Blocks abwechslungsreich.';

  const excludeBlock = exclude && exclude.length
    ? `SCHON VERWENDET — diese Aufgabenstellungen nicht wiederholen und auch nicht leicht abwandeln:\n${exclude.slice(-12).map((item) => `- ${item}`).join('\n')}`
    : '';

  const wortstellungNote = isWortstellung
    ? `DIESER SLOT VERLANGT WORTSTELLUNGSÜBUNGEN: Das Grammatikthema "${topic}" liefert den Inhalt, geprüft wird aber die Wortstellung. Die Optionen sind deshalb IMMER vollständige Sätze.\nAchtung: Auch die Inversion ist korrektes Deutsch. Biete niemals eine korrekte Umstellung als falsche Option an.`
    : '';

  return [
    'Du bist erfahrener DaF-Lehrer und Lehrbuchautor. Du schreibst Übungen auf dem Qualitätsniveau von Schritte International, Menschen und Aspekte.',
    `Erstelle genau ${questionsCount} Multiple-Choice-Aufgaben mit je vier Optionen.`,
    `GRAMMATIKTHEMA: ${topic}`,
    lexicalBlock,
    '',
    renderLevelBlock(level),
    '',
    wortstellungNote,
    topicBlock,
    '',
    renderFormatCatalogue(formats),
    '',
    buildMixRule(questionsCount, formats),
    '',
    OPTION_SUBSTANCE,
    '',
    DISTRACTOR_QUALITY,
    '',
    ANTI_PATTERNS,
    '',
    COVER_TEST,
    '',
    excludeBlock,
    '',
    SELF_CHECK,
    '',
    output === 'text' ? OUTPUT_TEXT : OUTPUT_JSON,
    '',
    `Schreibe jetzt die ${questionsCount} Aufgaben.`,
  ].filter((block) => String(block).trim()).join('\n');
}

module.exports = {
  LEVEL_SPECS,
  normalizeLevel,
  renderLevelBlock,
  buildExercisePrompt,
  OUTPUT_JSON,
  OUTPUT_TEXT,
};
