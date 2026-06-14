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

// Pools are keyed by difficulty tier (1..4). Each fetch pulls a batch for one
// tier and a random grammar topic from the selected list.
class QuestionManager {
  constructor() {
    this.level = 'A2';
    this.lexicalTopic = null;
    this.grammarTopics = ['Artikel'];
    this.pools = Object.create(null);
    this.fetching = Object.create(null);
    this.usedDisplays = new Set();
  }

  configure({ level, lexicalTopic, grammarTopics }) {
    this.level = level || 'A2';
    this.lexicalTopic = lexicalTopic || null;
    this.grammarTopics = (grammarTopics && grammarTopics.length) ? grammarTopics : ['Artikel'];
    this.pools = Object.create(null);
    this.fetching = Object.create(null);
    this.usedDisplays = new Set();
  }

  prefetch(tiers = [1, 2]) {
    return Promise.allSettled(tiers.map((tier) => this._ensurePool(tier)));
  }

  // Returns a formatted question for the given difficulty tier, or a fallback.
  async getQuestion(tier) {
    await this._ensurePool(tier);
    const pool = this.pools[tier];

    if (!pool || pool.length === 0) {
      return this._fallbackQuestion(tier);
    }

    const raw = pool.shift();
    this.usedDisplays.add(raw.display);

    if (pool.length <= 2) {
      this._ensurePool(tier); // top up in background
    }

    return this._formatQuestion(raw, tier);
  }

  _randomGrammarTopic() {
    return this.grammarTopics[Math.floor(Math.random() * this.grammarTopics.length)];
  }

  async _ensurePool(tier) {
    if (this.fetching[tier]) {
      return this.fetching[tier];
    }
    const pool = this.pools[tier];
    if (pool && pool.length > 2) {
      return pool;
    }

    this.fetching[tier] = this._fetchQuestions(tier)
      .catch((error) => {
        console.warn(`Не удалось загрузить вопросы (tier ${tier}):`, error);
        return [];
      })
      .finally(() => {
        delete this.fetching[tier];
      });

    return this.fetching[tier];
  }

  async _fetchQuestions(tier) {
    const grammarTopic = this._randomGrammarTopic();
    const seen = Array.from(this.usedDisplays).slice(-12);
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: this.level,
        lexicalTopic: this.lexicalTopic,
        grammarTopic,
        difficulty: tier,
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
      return this.pools[tier] || [];
    }

    valid.forEach((q) => { q.grammarTopic = grammarTopic; });
    const pool = [...(this.pools[tier] || []), ...shuffleArray(valid)];
    this.pools[tier] = pool;
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

  _formatQuestion(raw, tier) {
    const correctAnswer = raw.options[raw.correct];
    const shuffledOptions = shuffleArray(raw.options);

    return {
      tier,
      grammarTopic: raw.grammarTopic || this._randomGrammarTopic(),
      level: this.level,
      text: raw.text,
      display: raw.display,
      options: {
        options: shuffledOptions,
        correctIndex: shuffledOptions.indexOf(correctAnswer)
      }
    };
  }

  _fallbackQuestion(tier) {
    return {
      tier,
      grammarTopic: this._randomGrammarTopic(),
      level: this.level,
      text: 'Резервное упражнение',
      display: 'Сервер вопросов временно недоступен. Нажмите OK, чтобы продолжить спуск.',
      options: {
        options: ['OK', 'Пауза', 'Ошибка', 'Назад'],
        correctIndex: 0
      }
    };
  }
}
