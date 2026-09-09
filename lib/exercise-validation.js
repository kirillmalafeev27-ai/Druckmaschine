'use strict';

const { getTopicFormats, resolveTopic } = require('./grammar-rules');

/**
 * Wie viel Substanz eine Option mindestens haben muss — die maschinelle Seite
 * der Substanzregel aus quality-rules.js.
 *
 * Themen, deren Zielphänomen wirklich ein einzelnes Wort ist (Konjunktion,
 * Präposition, Modalverbbedeutung, Verbform, Pronomen), stehen in keiner der
 * beiden Listen: dort ist eine Einwortoption korrekt.
 */

/** Zielstruktur ist eine Nominalphrase — Artikel allein reicht nicht. */
const PHRASE_TOPICS = new Set([
  'Nominativ',
  'Akkusativ',
  'Dativ',
  'Genitiv',
  'N-Deklination',
  'Adjektivdeklination',
  'Reflexive Verben',
  'Wechselpräpositionen',
]);

/** Zielstruktur ist eine Wortgruppe oder ein ganzer Satz. */
const SENTENCE_TOPICS = new Set([
  'Infinitiv mit zu',
  'Relativsätze',
  'Wortstellung im Hauptsatz',
  'Wortstellung im Nebensatz',
  'Satzklammer',
  'Trennbare Verben',
  'Passiv',
  'Zustandspassiv',
  'Plusquamperfekt',
  'Konjunktiv I',
  'Konjunktiv II',
  'Partizip I und II als Adjektive',
  'Indirekte Fragen',
  'Doppelkonjunktionen',
  'Lassen',
]);

/** Mindestwortzahl, die mindestens eine Option erreichen muss. */
function minOptionWords(grammarTopic, isWortstellung) {
  if (isWortstellung) return 3;
  const topic = resolveTopic(grammarTopic);
  if (!topic) return 1;
  if (SENTENCE_TOPICS.has(topic)) return 3;
  if (PHRASE_TOPICS.has(topic)) return 2;
  return 1;
}

/** Formate, deren Optionen ganze Sätze sein müssen. */
const SENTENCE_FORMATS = new Set(['satzvarianten', 'umformung', 'verbindung', 'fehlerkorrektur', 'wortstellung']);

const MIN_SENTENCE_WORDS = 4;

function normalizeText(value) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/[„“”«»"']/g, '')
    .trim()
    .toLowerCase();
}

function wordCount(value) {
  const text = String(value || '').trim();
  return text ? text.split(/\s+/).length : 0;
}

function answerLetterToIndex(letter) {
  return ['A', 'B', 'C', 'D'].indexOf(String(letter || '').trim().toUpperCase());
}

/**
 * Prüft eine einzelne Aufgabe. Gibt die bereinigte Aufgabe zurück oder einen
 * Ablehnungsgrund — die Gründe landen im Log und machen sichtbar, woran das
 * Modell gerade scheitert.
 */
function validateQuestion(raw, context = {}) {
  const reject = (reason) => ({ ok: false, reason });

  if (!raw || typeof raw !== 'object') return reject('kein Objekt');

  const text = String(raw.text || '').trim();
  const display = String(raw.display || '').trim();
  if (!text) return reject('Anweisung fehlt');
  if (!display) return reject('Aufgabenmaterial fehlt');

  const options = Array.isArray(raw.options)
    ? raw.options.map((option) => String(option == null ? '' : option).replace(/\s+/g, ' ').trim())
    : [];
  if (options.length !== 4) return reject(`${options.length} statt 4 Optionen`);
  if (options.some((option) => !option)) return reject('leere Option');
  if (options.some((option) => option.includes('___'))) return reject('Lücke steht in der Option');
  if (new Set(options.map(normalizeText)).size !== 4) return reject('doppelte Optionen');

  // Abgeschnittene Sätze — das Modell hat mitten im Satz aufgehört.
  const truncated = [display, ...options].some((value) => /(\.\.\.|…)\s*$/.test(value));
  if (truncated) return reject('abgeschnittener Satz');

  let correct = Number.isInteger(raw.correct) ? raw.correct : Number.NaN;
  if (!Number.isInteger(correct)) correct = answerLetterToIndex(raw.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return reject('ungültiger correct-Index');

  // Kreuzprobe: Der Index und der ausgeschriebene Lösungstext müssen dieselbe
  // Option meinen. Weicht beides ab, hat das Modell beim Zählen geraten.
  const claimed = raw.correctAnswer || raw.answer || raw.loesung;
  if (claimed) {
    const claimedText = normalizeText(claimed);
    if (claimedText && claimedText !== normalizeText(options[correct])) {
      const fallback = options.findIndex((option) => normalizeText(option) === claimedText);
      if (fallback < 0) return reject('correctAnswer passt zu keiner Option');
      correct = fallback;
    }
  }

  // Zugelassen sind nur die Formate, die für dieses Thema im Katalog stehen.
  // Ein Format, das das Modell dazuerfindet, darf keine Ausnahmen erkaufen.
  const allowedFormats = context.isWortstellung
    ? ['wortstellung', 'satzvarianten', 'fehlerkorrektur', 'verbindung']
    : (context.grammarTopic ? getTopicFormats(context.grammarTopic) : []);
  const declared = String(raw.format || '').trim().toLowerCase();
  const format = declared && allowedFormats.includes(declared) ? declared : null;

  // SUBSTANZPRÜFUNG — der Kern gegen primitive Aufgaben.
  // Bleiben ALLE vier Optionen unter der Mindestsubstanz des Themas, ist es die
  // verbotene Füllwort-Aufgabe: etwa "zu / – / zum / um zu" bei "Infinitiv mit
  // zu" oder "den / der / dem / dessen" bei Relativsätzen.
  const minWords = minOptionWords(context.grammarTopic, context.isWortstellung);
  if (minWords > 1 && options.every((option) => wordCount(option) < minWords)) {
    return reject(
      `Füllwort-Optionen: Thema verlangt mindestens ${minWords} Wörter je Option`
    );
  }

  // Satzformate brauchen Sätze, nicht Fragmente.
  const needsSentences = context.isWortstellung || (format ? SENTENCE_FORMATS.has(format) : false);
  if (needsSentences) {
    const sentenceLike = options.filter((option) => wordCount(option) >= MIN_SENTENCE_WORDS).length;
    if (sentenceLike < 3) return reject(`Format "${format || 'wortstellung'}" verlangt vollständige Sätze`);
  }

  // Grob unterschiedlich lange Optionen verraten die Lösung.
  const lengths = options.map((option) => option.length);
  if (Math.max(...lengths) > 5 * Math.min(...lengths)) {
    return reject('Optionen zu unterschiedlich lang');
  }

  return {
    ok: true,
    question: { format, text, display, options, correct },
  };
}

/**
 * Prüft einen ganzen Block, entfernt Dubletten und begrenzt die Häufigkeit
 * einzelner Formate, damit nicht zehnmal dasselbe Muster ausgeliefert wird.
 */
function validateBatch(rawQuestions, context = {}) {
  const list = Array.isArray(rawQuestions) ? rawQuestions : [];
  const wanted = Math.max(1, Number(context.count) || 10);
  const maxPerFormat = Math.max(2, Math.ceil(wanted * 0.4));

  const accepted = [];
  const overflow = [];
  const rejected = [];
  const seenDisplays = new Set(
    (Array.isArray(context.exclude) ? context.exclude : []).map(normalizeText).filter(Boolean)
  );
  const formatCounts = Object.create(null);

  for (const raw of list) {
    const result = validateQuestion(raw, context);
    if (!result.ok) {
      rejected.push(result.reason);
      continue;
    }

    const key = normalizeText(result.question.display);
    if (seenDisplays.has(key)) {
      rejected.push('Aufgabe doppelt');
      continue;
    }
    seenDisplays.add(key);

    const format = result.question.format || 'unbekannt';
    const used = formatCounts[format] || 0;
    // Über dem Limit landet die Aufgabe hinten in der Warteschlange, statt
    // verworfen zu werden — lieber ein eintöniger Block als ein leerer.
    if (used >= maxPerFormat) {
      overflow.push(result.question);
      continue;
    }

    formatCounts[format] = used + 1;
    accepted.push(result.question);
  }

  return {
    questions: [...accepted, ...overflow],
    rejected,
    formatCounts,
  };
}

module.exports = {
  validateQuestion,
  validateBatch,
  minOptionWords,
  PHRASE_TOPICS,
  SENTENCE_TOPICS,
  normalizeText,
  wordCount,
  answerLetterToIndex,
  SENTENCE_FORMATS,
};
