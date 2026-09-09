'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { GRAMMAR_RULES, resolveTopic, getTopicFormats, renderTopicBlock } = require('../lib/grammar-rules');
const { EXERCISE_FORMATS } = require('../lib/exercise-formats');
const { buildExercisePrompt } = require('../lib/exercise-prompt');
const { validateQuestion, validateBatch, minOptionWords } = require('../lib/exercise-validation');

/** Die Themenliste, die der Client tatsächlich verschickt. */
function clientTopics() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'questions.js'), 'utf8');
  const block = source.match(/const GRAMMAR_TOPICS = \[[\s\S]*?\];/);
  return [...block[0].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

test('jedes Thema des Clients findet einen Regelsatz', () => {
  const unresolved = clientTopics().filter((topic) => !resolveTopic(topic));
  assert.deepStrictEqual(unresolved, [], `ohne Regeln: ${unresolved.join(', ')}`);
});

test('jeder Regelsatz ist vollständig und verweist auf bekannte Formate', () => {
  for (const [topic, entry] of Object.entries(GRAMMAR_RULES)) {
    for (const field of ['rule', 'design', 'traps', 'avoid']) {
      assert.ok(entry[field] && entry[field].length > 40, `${topic}: ${field} fehlt oder ist zu knapp`);
    }
    assert.ok(entry.formats.length >= 3, `${topic}: zu wenige Formate`);
    for (const id of entry.formats) {
      assert.ok(EXERCISE_FORMATS[id], `${topic}: unbekanntes Format ${id}`);
    }
  }
});

test('jedes Format hat ein Beispiel, dessen richtige Option existiert', () => {
  for (const [id, format] of Object.entries(EXERCISE_FORMATS)) {
    const example = format.example;
    assert.strictEqual(example.options.length, 4, `${id}: Beispiel braucht 4 Optionen`);
    assert.ok(example.options[example.correct], `${id}: correct zeigt ins Leere`);
    assert.strictEqual(new Set(example.options).size, 4, `${id}: doppelte Optionen im Beispiel`);
  }
});

test('"Infinitiv mit zu" lässt keine reine Lückenaufgabe zu', () => {
  assert.ok(!getTopicFormats('Infinitiv mit zu').includes('luecke'));
  assert.strictEqual(minOptionWords('Infinitiv mit zu', false), 3);
});

test('die Füllwort-Aufgabe wird abgelehnt', () => {
  const result = validateQuestion(
    {
      format: 'luecke',
      text: 'Выбери правильный вариант.',
      display: 'Er versucht, den Bahnhof ___ finden.',
      options: ['zu', '–', 'zum', 'um zu'],
      correct: 0,
    },
    { grammarTopic: 'Infinitiv mit zu' }
  );
  assert.strictEqual(result.ok, false);
  assert.match(result.reason, /Füllwort/);
});

test('die gleiche Aufgabe als Vollsatz-Auswahl wird angenommen', () => {
  const result = validateQuestion(
    {
      format: 'satzvarianten',
      text: 'Выбери грамматически правильный вариант.',
      display: 'Sein Zug fährt um sechs. (vorhaben – früh aufstehen)',
      options: [
        'Er hat vor, morgen früh aufzustehen.',
        'Er hat vor, morgen früh zu aufstehen.',
        'Er hat vor, morgen früh aufstehen zu.',
        'Er hat vor, morgen früh aufstehen.',
      ],
      correct: 0,
      correctAnswer: 'Er hat vor, morgen früh aufzustehen.',
    },
    { grammarTopic: 'Infinitiv mit zu' }
  );
  assert.strictEqual(result.ok, true);
});

test('Einwortoptionen bleiben erlaubt, wo das Zielwort eines ist', () => {
  const result = validateQuestion(
    {
      format: 'dialog',
      text: 'Выбери подходящий вариант.',
      display: '___ ich zehn Jahre alt war, ist meine Familie nach Berlin gezogen.',
      options: ['Als', 'Wenn', 'Wann', 'Während'],
      correct: 0,
    },
    { grammarTopic: 'als vs. wenn' }
  );
  assert.strictEqual(result.ok, true);
});

test('widersprüchlicher Index wird über correctAnswer korrigiert', () => {
  const result = validateQuestion(
    {
      text: 'Выбери.',
      display: 'Anna hat ___ einen Blumenstrauß geschenkt.',
      options: ['ihrer neuen Kollegin', 'ihre neue Kollegin', 'ihrer neue Kollegin', 'ihren neuen Kollegen'],
      correct: 3,
      correctAnswer: 'ihrer neuen Kollegin',
    },
    { grammarTopic: 'Dativ' }
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.question.correct, 0);
});

test('kaputte Aufgaben fallen durch', () => {
  const context = { grammarTopic: 'Präsens' };
  const cases = [
    [{ text: 'a', display: 'b', options: ['x', 'y', 'z'], correct: 0 }, /statt 4/],
    [{ text: 'a', display: 'b', options: ['x', 'x', 'y', 'z'], correct: 0 }, /doppelte/],
    [{ text: 'a', display: 'b', options: ['w', 'x', 'y', 'z'], correct: 9 }, /correct-Index/],
    [{ text: 'a', display: 'Er geht...', options: ['w', 'x', 'y', 'z'], correct: 0 }, /abgeschnitten/],
    [{ text: 'a', display: 'b', options: ['w ___', 'x', 'y', 'z'], correct: 0 }, /Lücke/],
  ];
  for (const [raw, pattern] of cases) {
    const result = validateQuestion(raw, context);
    assert.strictEqual(result.ok, false);
    assert.match(result.reason, pattern);
  }
});

test('ein Block verliert Dubletten und begrenzt ein einzelnes Format', () => {
  const make = (n) => ({
    format: 'satzvarianten',
    text: 'Выбери.',
    display: `Aufgabe Nummer ${n} mit genug Kontext für einen ganzen Satz.`,
    options: [
      `Er hat vor, am ${n}. Mai früh aufzustehen.`,
      `Er hat vor, am ${n}. Mai früh zu aufstehen.`,
      `Er hat vor, am ${n}. Mai früh aufstehen zu.`,
      `Er hat vor, am ${n}. Mai früh aufstehen.`,
    ],
    correct: 0,
  });
  const batch = [make(1), make(1), make(2), make(3), make(4), make(5), make(6)];
  const result = validateBatch(batch, { grammarTopic: 'Infinitiv mit zu', count: 10 });

  assert.ok(result.rejected.includes('Aufgabe doppelt'));
  assert.strictEqual(result.questions.length, 6);
  assert.strictEqual(result.formatCounts.satzvarianten, 4);
});

test('der Prompt trägt Thema, Niveau, Formate und Verbote', () => {
  const prompt = buildExercisePrompt({
    level: 'B1',
    grammarTopic: 'Infinitiv mit zu',
    lexicalTopic: 'Reisen und Urlaub',
    count: 10,
  });

  assert.match(prompt, /GRAMMATIKTHEMA: Infinitiv mit zu/);
  assert.match(prompt, /NIVEAU B1/);
  assert.match(prompt, /Reisen und Urlaub/);
  assert.match(prompt, /SUBSTANZ DER OPTIONEN/);
  assert.match(prompt, /DECKUNGSTEST/);
  assert.match(prompt, /FORMAT "satzvarianten"/);
  assert.ok(!/FORMAT "luecke"/.test(prompt), 'Lückenformat darf hier nicht angeboten werden');
});

test('ein Wortstellungs-Slot verlangt Satzformate', () => {
  const prompt = buildExercisePrompt({
    level: 'A2',
    grammarTopic: 'Dativ',
    isWortstellung: true,
    count: 10,
  });
  assert.match(prompt, /FORMAT "wortstellung"/);
  assert.match(prompt, /Inversion/);
});

test('renderTopicBlock liefert alle vier Abschnitte', () => {
  const block = renderTopicBlock('Praeteritum');
  assert.match(block, /GRAMMATIK "Präteritum"/);
  assert.match(block, /AUFGABENDESIGN/);
  assert.match(block, /GUTE FALSCHE OPTIONEN/);
  assert.match(block, /VERBOTEN/);
});
