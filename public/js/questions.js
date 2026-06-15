const GRAMMAR_TOPICS = [
  'Praesens',
  'Perfekt',
  'Praeteritum',
  'Futur I',
  'Imperativ',
  'Modalverben',
  'Trennbare Verben',
  'Reflexive Verben',
  'Verben mit Praepositionen',
  'Lassen',
  'Artikel',
  'Nominativ',
  'Akkusativ',
  'Dativ',
  'Genitiv',
  'N-Deklination',
  'Pronomen',
  'Possessivpronomen',
  'Adjektivdeklination',
  'Steigerung',
  'Wechselpraepositionen',
  'Lokale Praepositionen',
  'Temporale Praepositionen',
  'Negation',
  'Satzklammer',
  'Wortstellung im Hauptsatz',
  'Wortstellung im Nebensatz',
  'weil-Saetze',
  'dass-Saetze',
  'wenn-Saetze',
  'Relativsaetze',
  'Indirekte Fragen',
  'Infinitiv mit zu',
  'Konjunktiv II',
  'Passiv',
  'Plusquamperfekt',
  'Doppelkonjunktionen',
  'als vs. wenn'
];

const LEXICAL_TOPICS = [
  'Begruessung',
  'Familie',
  'Schule',
  'Essen und Trinken',
  'Tagesablauf',
  'Wetter',
  'Stadt',
  'Hobbys und Freizeit',
  'Reisen und Urlaub',
  'Einkaufen',
  'Natur und Umwelt',
  'Wohnen',
  'Kleidung',
  'Koerper und Gesundheit',
  'Berufe',
  'Verkehrsmittel',
  'Feste und Feiertage',
  'Medien und Technik'
];

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

// Pools are keyed by CEFR level (A1..B2 = dive depth 1..4). Each fetch pulls a
// batch for one level and a random grammar topic from the selected list.
class QuestionManager {
  constructor() {
    this.lexicalTopic = null;
    this.grammarTopics = ['Artikel'];
    this.pools = Object.create(null);
    this.fetching = Object.create(null);
    this.usedDisplays = new Set();
  }

  configure({ lexicalTopic, grammarTopics }) {
    this.lexicalTopic = lexicalTopic || null;
    this.grammarTopics = (grammarTopics && grammarTopics.length) ? grammarTopics : ['Artikel'];
    this.pools = Object.create(null);
    this.fetching = Object.create(null);
    this.usedDisplays = new Set();
  }

  prefetch(levels = ['A1', 'A2']) {
    return Promise.allSettled(levels.map((lvl) => this._ensurePool(lvl)));
  }

  // Returns a formatted question for the given CEFR level, or a fallback.
  async getQuestion(level, difficulty) {
    await this._ensurePool(level);
    const pool = this.pools[level];

    if (!pool || pool.length === 0) {
      return this._fallbackQuestion(level);
    }

    const raw = pool.shift();
    this.usedDisplays.add(raw.display);

    if (pool.length <= 2) {
      this._ensurePool(level); // top up in background
    }

    return this._formatQuestion(raw, level);
  }

  _randomGrammarTopic() {
    return this.grammarTopics[Math.floor(Math.random() * this.grammarTopics.length)];
  }

  _difficultyFor(level) {
    return { A1: 1, A2: 2, B1: 3, B2: 4 }[level] || 1;
  }

  async _ensurePool(level) {
    if (this.fetching[level]) {
      return this.fetching[level];
    }
    const pool = this.pools[level];
    if (pool && pool.length > 2) {
      return pool;
    }

    this.fetching[level] = this._fetchQuestions(level)
      .catch((error) => {
        console.warn(`Не удалось загрузить вопросы (${level}):`, error);
        return [];
      })
      .finally(() => {
        delete this.fetching[level];
      });

    return this.fetching[level];
  }

  async _fetchQuestions(level) {
    const grammarTopic = this._randomGrammarTopic();
    const seen = Array.from(this.usedDisplays).slice(-12);
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        lexicalTopic: this.lexicalTopic,
        grammarTopic,
        difficulty: this._difficultyFor(level),
        count: 12,
        exclude: seen
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const valid = (data.questions || []).filter((q) => this._isValidQuestion(q));
    if (!valid.length) {
      return this.pools[level] || [];
    }

    valid.forEach((q) => { q.grammarTopic = grammarTopic; });
    const pool = [...(this.pools[level] || []), ...shuffleArray(valid)];
    this.pools[level] = pool;
    return pool;
  }

  _isValidQuestion(question) {
    return Boolean(
      question &&
        typeof question.text === 'string' &&
        typeof question.display === 'string' &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        typeof question.correct === 'number' &&
        question.correct >= 0 &&
        question.correct <= 3
    );
  }

  _formatQuestion(raw, level) {
    const correctAnswer = raw.options[raw.correct];
    const shuffledOptions = shuffleArray(raw.options);

    return {
      level,
      grammarTopic: raw.grammarTopic || this._randomGrammarTopic(),
      text: raw.text,
      display: raw.display,
      options: {
        options: shuffledOptions,
        correctIndex: shuffledOptions.indexOf(correctAnswer)
      }
    };
  }

  _fallbackQuestion(level) {
    return {
      level,
      grammarTopic: this._randomGrammarTopic(),
      text: 'Резервное упражнение',
      display: 'Сервер вопросов временно недоступен. Нажмите OK, чтобы продолжить спуск.',
      options: {
        options: ['OK', 'Пауза', 'Ошибка', 'Назад'],
        correctIndex: 0
      }
    };
  }
}
