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

const BONUS_SLOTS = [
  { id: 'wortstellung', bonus: 'move2', bonusLabel: '2 хода', isWortstellung: true, fixed: true },
  { id: 'step', bonus: 'move1', bonusLabel: '+1 ход' },
  { id: 'hint', bonus: 'hint', bonusLabel: 'Подсказка' },
  { id: 'shield', bonus: 'shield', bonusLabel: 'Щит' },
  { id: 'timer', bonus: 'timer', bonusLabel: 'Таймер' }
];

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

class QuestionManager {
  constructor(level = 'A2') {
    this.level = level;
    this.lexicalTopic = null;
    this.questionPool = Object.create(null);
    this.fetching = Object.create(null);
    this.slots = [];
    this.lastQuestion = null;
    this.usedDisplays = Object.create(null);
  }

  setLevel(level) {
    if (this.level !== level) {
      this.level = level;
      this.questionPool = Object.create(null);
      this.fetching = Object.create(null);
      this.usedDisplays = Object.create(null);
      this.lastQuestion = null;
    }
  }

  setLexicalTopic(topic) {
    if (this.lexicalTopic !== topic) {
      this.lexicalTopic = topic;
      this.questionPool = Object.create(null);
      this.fetching = Object.create(null);
      this.usedDisplays = Object.create(null);
      this.lastQuestion = null;
    }
  }

  configureSlots(slotConfigs) {
    this.slots = slotConfigs.filter(Boolean);
  }

  async prefetchAll() {
    const tasks = this.slots.map((slot) => this._ensurePool(slot.slotDef.id));
    await Promise.allSettled(tasks);
  }

  shuffleAllPools() {
    for (const slotId of Object.keys(this.questionPool)) {
      this.questionPool[slotId] = shuffleArray(this.questionPool[slotId]);
    }
  }

  getQuestion(slotId) {
    const slotConfig = this.slots.find((slot) => slot.slotDef.id === slotId);
    if (!slotConfig) {
      return null;
    }

    const pool = this.questionPool[slotId];
    if (!pool || pool.length === 0) {
      return this._fallbackQuestion(slotConfig);
    }

    const rawQuestion = pool.shift();
    this.lastQuestion = { slotId, question: rawQuestion };

    if (pool.length === 0) {
      this._ensurePool(slotId);
    }

    return this._formatQuestion(rawQuestion, slotConfig);
  }

  onCorrectAnswer(slotId) {
    if (this.lastQuestion && this.lastQuestion.slotId === slotId) {
      const set = this.usedDisplays[slotId] || new Set();
      set.add(this.lastQuestion.question.display);
      this.usedDisplays[slotId] = set;
      this.lastQuestion = null;
    }

    if (!this.questionPool[slotId] || this.questionPool[slotId].length === 0) {
      this._ensurePool(slotId);
    }
  }

  onWrongAnswer(slotId) {
    if (!this.lastQuestion || this.lastQuestion.slotId !== slotId) {
      return;
    }

    const pool = this.questionPool[slotId] || [];
    const position = Math.floor(Math.random() * (pool.length + 1));
    pool.splice(position, 0, this.lastQuestion.question);
    this.questionPool[slotId] = pool;
    this.lastQuestion = null;
  }

  async _ensurePool(slotId) {
    if (this.fetching[slotId]) {
      return this.fetching[slotId];
    }

    const pool = this.questionPool[slotId];
    if (pool && pool.length > 0) {
      return pool;
    }

    const slotConfig = this.slots.find((slot) => slot.slotDef.id === slotId);
    if (!slotConfig) {
      return [];
    }

    this.fetching[slotId] = this._fetchQuestions(slotConfig)
      .catch((error) => {
        console.warn(`Не удалось загрузить вопросы для слота ${slotId}:`, error);
        return [];
      })
      .finally(() => {
        delete this.fetching[slotId];
      });

    return this.fetching[slotId];
  }

  async _fetchQuestions(slotConfig) {
    const slotId = slotConfig.slotDef.id;
    const seen = Array.from(this.usedDisplays[slotId] || []).slice(-12);
    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: this.level,
        lexicalTopic: this.lexicalTopic,
        grammarTopic: slotConfig.grammarTopic,
        isWortstellung: Boolean(slotConfig.slotDef.isWortstellung),
        count: 30,
        exclude: seen
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const valid = (data.questions || []).filter((question) => this._isValidQuestion(question));
    if (!valid.length) {
      return [];
    }

    const pool = [...(this.questionPool[slotId] || []), ...shuffleArray(valid)];
    this.questionPool[slotId] = pool;
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

  _formatQuestion(rawQuestion, slotConfig) {
    const correctAnswer = rawQuestion.options[rawQuestion.correct];
    const shuffledOptions = shuffleArray(rawQuestion.options);

    return {
      slotId: slotConfig.slotDef.id,
      slotDef: slotConfig.slotDef,
      grammarTopic: slotConfig.grammarTopic,
      level: this.level,
      text: rawQuestion.text,
      display: rawQuestion.display,
      options: {
        options: shuffledOptions,
        correctIndex: shuffledOptions.indexOf(correctAnswer)
      }
    };
  }

  _fallbackQuestion(slotConfig) {
    return {
      slotId: slotConfig.slotDef.id,
      slotDef: slotConfig.slotDef,
      grammarTopic: slotConfig.grammarTopic,
      level: this.level,
      text: 'Резервное упражнение',
      display: 'Сервер вопросов временно недоступен. Нажмите OK, чтобы получить бонус и не останавливать игру.',
      options: {
        options: ['OK', 'Пауза', 'Ошибка', 'Назад'],
        correctIndex: 0
      }
    };
  }
}
