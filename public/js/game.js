const MAX_QUESTIONS = 10;
// Levels: CEFR A1..B2 = dive 1..4 floors on a correct answer.
const LEVELS = [
  { n: 1, cefr: 'A1', drop: 1 },
  { n: 2, cefr: 'A2', drop: 2 },
  { n: 3, cefr: 'B1', drop: 3 },
  { n: 4, cefr: 'B2', drop: 4 }
];
const MAX_DEPTH = MAX_QUESTIONS * 4; // 40

const SCREEN_IDS = ['menu-screen', 'game-screen', 'win-screen', 'lose-screen', 'leaderboard-screen'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hidden value earned for descending onto floor `d`. Steep with depth so risky
// deep dives pay off — but the player never sees these numbers until cash-out.
function floorValue(d) {
  return randomInt(8 + d * 6, 18 + d * 16);
}

class Leaderboard {
  constructor() { this.key = 'schacht_leaderboard'; }

  getScores() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; }
    catch (error) { console.warn('Failed to read leaderboard:', error); return []; }
  }

  best() {
    const scores = this.getScores();
    return scores.length ? scores[0].gold : 0;
  }

  addScore(entry) {
    const scores = this.getScores();
    scores.push(entry);
    scores.sort((a, b) => (b.gold !== a.gold ? b.gold - a.gold : b.depth - a.depth));
    try { localStorage.setItem(this.key, JSON.stringify(scores.slice(0, 20))); } catch (_) {}
  }

  render() {
    const tbody = document.getElementById('leaderboard-body');
    const empty = document.getElementById('leaderboard-empty');
    const scores = this.getScores();
    tbody.innerHTML = '';
    if (!scores.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      if (index < 3) row.className = `rank-${index + 1}`;
      row.innerHTML = `<td>${index + 1}</td><td>${this._escape(score.name)}</td><td>${score.depth}</td><td>${score.gold} 💰</td>`;
      tbody.appendChild(row);
    });
  }

  _escape(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
}

class Game {
  constructor() {
    this.state = 'menu';
    this.renderer = null;
    this.audio = null;
    this.questionManager = new QuestionManager();
    this.leaderboard = new Leaderboard();

    this.settings = null;
    this.depth = 0;
    this.questionsUsed = 0;
    this.pot = 0;                 // hidden until cash-out
    this.currentLevel = null;
    this.currentQuestion = null;

    this.revealTimeoutId = null;
    this.transitionTimeoutId = null;
    this.messageTimeoutId = null;

    this.ui = this._cacheUi();
  }

  _cacheUi() {
    return {
      canvas: document.getElementById('game-canvas'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text'),
      decisionPanel: document.getElementById('decision-panel'),
      decisionPrompt: document.getElementById('decision-prompt'),
      levelButtons: Array.from(document.querySelectorAll('.lvl-btn')),
      takeBtn: document.getElementById('take-btn'),
      questionPanel: document.getElementById('question-panel'),
      questionTopicLabel: document.getElementById('question-topic-label'),
      questionText: document.getElementById('question-text'),
      questionOptions: document.getElementById('question-options'),
      questionFeedback: document.getElementById('question-feedback'),
      depthNum: document.getElementById('depth-num'),
      qNum: document.getElementById('q-num'),
      treasureDisplay: document.getElementById('treasure-display'),
      bestNum: document.getElementById('best-num'),
      messageBanner: document.getElementById('message-banner'),
      revealBanner: document.getElementById('reveal-banner'),
      deathOverlay: document.getElementById('death-overlay'),
      winTitle: document.getElementById('win-title'),
      winStats: document.getElementById('win-stats'),
      loseStats: document.getElementById('lose-stats'),
      loseMessage: document.getElementById('lose-message')
    };
  }

  async init(settings) {
    if (settings) this.settings = settings;
    this._disposeRuntime();
    this._clearTimeouts();
    this._resetRunState();

    this._setActiveScreen('game-screen');
    this._hidePanels();
    this.ui.deathOverlay.classList.remove('active', 'instant');
    this._showLoading('Готовим шахту...');

    this.questionManager.configure({
      lexicalTopic: this.settings.lexicalTopic,
      grammarTopics: this.settings.grammarTopics
    });

    this.renderer = new MineRenderer(this.ui.canvas);
    this.audio = new AudioManager();
    this.audio.init();

    await Promise.allSettled([
      this.renderer.ensureReady(),
      this.questionManager.prefetch(['A1', 'A2'])
    ]);

    this.renderer.buildShaft(MAX_DEPTH);
    this.renderer.startLoop(() => {});

    this._updateHud();
    this._hideLoading();
    this.state = 'decision';
    this._showDecision();
    this._showMessage('Выбери уровень задания. Выше уровень — глубже нырок, но труднее вопрос.', 3000);
  }

  startNewRun() {
    this.init(this.settings).catch((error) => console.error('Failed to start run:', error));
  }

  _resetRunState() {
    this.state = 'loading';
    this.depth = 0;
    this.questionsUsed = 0;
    this.pot = 0;
    this.currentLevel = null;
    this.currentQuestion = null;
  }

  // ---------- Decision: pick a level to dive, or take the treasure ----------
  _showDecision() {
    this._hidePanels();
    this.state = 'decision';
    this.ui.decisionPanel.classList.remove('hidden');
    this._updateHud();

    const outOfQuestions = this.questionsUsed >= MAX_QUESTIONS;
    this.ui.levelButtons.forEach((btn) => { btn.disabled = outOfQuestions; });
    this.ui.takeBtn.disabled = this.depth === 0;

    if (outOfQuestions) {
      this.ui.decisionPrompt.textContent = 'Вопросы кончились! Забирай сокровище, пока цело.';
    } else if (this.depth === 0) {
      this.ui.decisionPrompt.textContent = 'Выбери уровень задания и ныряй за сокровищем.';
    } else {
      this.ui.decisionPrompt.textContent =
        `Глубина ${this.depth}. Нырнуть глубже — или забрать сокровище (узнаешь ценность только тогда)?`;
    }
  }

  async chooseLevel(levelNumber) {
    if (this.state !== 'decision' || this.questionsUsed >= MAX_QUESTIONS) return;
    const level = LEVELS[levelNumber - 1];
    if (!level) return;

    // Commit BLIND: the question only appears after you pick a level.
    this._hidePanels();
    this.state = 'question';
    this.questionsUsed += 1;
    this.currentLevel = level;
    this._updateHud();

    this._showMessage(`Бурим породу... (${level.cefr})`, 1400);
    const question = await this.questionManager.getQuestion(level.cefr, level.n);
    if (this.state !== 'question') return;
    this.currentQuestion = question;
    this._clearMessage();
    this._showQuestion(question);
  }

  takeTreasure() {
    if (this.state !== 'decision' || this.depth === 0) return;
    this._win();
  }

  // ---------- Question ----------
  _showQuestion(question) {
    this._hidePanels();
    this.ui.questionPanel.classList.remove('hidden');
    this.ui.questionFeedback.classList.add('hidden');
    this.ui.questionFeedback.textContent = '';

    this.ui.questionTopicLabel.textContent =
      `${this.currentLevel.cefr} • ныряем на ${this.currentLevel.drop} • ${question.grammarTopic}`;
    this.ui.questionText.innerHTML =
      `${this._escape(question.text)}<br><strong>${this._escape(question.display)}</strong>`;

    this.ui.questionOptions.innerHTML = '';
    question.options.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'option-btn';
      button.textContent = `${index + 1}. ${option}`;
      button.addEventListener('click', () => {
        const buttons = this.ui.questionOptions.querySelectorAll('.option-btn');
        buttons.forEach((item) => { item.disabled = true; });
        if (index === question.options.correctIndex) button.classList.add('correct');
        else { button.classList.add('wrong'); buttons[question.options.correctIndex].classList.add('correct'); }
        this.answer(index);
      });
      this.ui.questionOptions.appendChild(button);
    });
  }

  answer(selectedIndex) {
    if (this.state !== 'question' || !this.currentQuestion) return;
    const isCorrect = selectedIndex === this.currentQuestion.options.correctIndex;

    if (isCorrect) {
      this.audio.playCorrect();
      this.audio.playDig();
      this.renderer.swingPickaxe();
      this._showFeedback(true, `Верно! Ныряем на ${this.currentLevel.drop} вниз...`);

      this.state = 'descending';
      this._clearTransition();
      const drop = this.currentLevel.drop;
      this.transitionTimeoutId = window.setTimeout(() => {
        if (this.state !== 'descending') return;
        this.renderer.descend(drop, () => this._onArrive(drop));
      }, 550);
      return;
    }

    this.audio.playWrong();
    const correct = this.currentQuestion.options.options[this.currentQuestion.options.correctIndex];
    this._showFeedback(false, `Обвал! Правильно: ${correct}`);
    this.state = 'lost';
    this._clearTransition();
    this.transitionTimeoutId = window.setTimeout(() => this._caveIn(), 900);
  }

  _onArrive(drop) {
    let gained = 0;
    for (let i = 1; i <= drop; i += 1) gained += floorValue(this.depth + i);
    this.depth += drop;
    this.pot += gained;

    this.audio.playOreReveal(Math.min(5, this.currentLevel.n + 1));
    this._showReveal('🎁 Сундук потяжелел...');
    this._updateHud();

    this._clearTransition();
    this.transitionTimeoutId = window.setTimeout(() => {
      if (this.state === 'descending') this._showDecision();
    }, 1000);
  }

  // ---------- End states ----------
  _win() {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'won';
    this._clearTimeouts();
    this._hidePanels();
    this.audio.playBank();
    this.renderer.openChest(() => {});

    this.leaderboard.addScore({
      name: this.settings.playerName,
      depth: this.depth,
      gold: this.pot,
      date: new Date().toISOString()
    });

    this._showReveal(`🎁 ${this.pot} 💰`);
    this.ui.winTitle.textContent = '🎁 СОКРОВИЩЕ ТВОЁ!';
    this.ui.winStats.textContent =
      `Ты поднял сокровище ценой ${this.pot} 💰 с глубины ${this.depth}. Жадность не победила.`;

    window.setTimeout(() => {
      if (this.renderer) this.renderer.stopLoop();
      this._setActiveScreen('win-screen');
    }, 1600);
  }

  _caveIn() {
    if (this.state === 'won') return;
    this.state = 'lost';
    this._clearTimeouts();
    this._hidePanels();
    this.audio.playCaveIn();
    this.ui.deathOverlay.classList.add('active');

    this.ui.loseMessage.textContent = 'Шахта обрушилась, и сокровище засыпало...';
    this.ui.loseStats.textContent =
      `Ты был на глубине ${this.depth}. Сокровище потеряно. Надо было вовремя подняться.`;

    this.renderer.caveIn(() => {
      if (this.renderer) this.renderer.stopLoop();
      this._setActiveScreen('lose-screen');
    });
  }

  // ---------- View / HUD ----------
  rotateView(direction) {
    if (this.renderer && (this.state === 'decision' || this.state === 'question')) {
      this.renderer.nudgeYaw(direction);
    }
  }

  _updateHud() {
    this.ui.depthNum.textContent = this.depth;
    this.ui.qNum.textContent = this.questionsUsed;
    this.ui.bestNum.textContent = this.leaderboard.best();
    // Treasure value stays hidden during the run.
    this.ui.treasureDisplay.textContent = this.depth > 0 ? '🎁 ???' : '🎁 —';
  }

  _showFeedback(isCorrect, text) {
    this.ui.questionFeedback.classList.remove('hidden', 'correct', 'wrong');
    this.ui.questionFeedback.classList.add(isCorrect ? 'correct' : 'wrong');
    this.ui.questionFeedback.textContent = text;
  }

  _showReveal(text) {
    const banner = this.ui.revealBanner;
    banner.textContent = text;
    banner.classList.remove('hidden', 'show');
    void banner.offsetWidth;
    banner.classList.add('show');
    if (this.revealTimeoutId) window.clearTimeout(this.revealTimeoutId);
    this.revealTimeoutId = window.setTimeout(() => banner.classList.add('hidden'), 1200);
  }

  _showMessage(text, duration = 1500) {
    this._clearMessage();
    this.ui.messageBanner.textContent = text;
    this.ui.messageBanner.classList.remove('hidden');
    this.messageTimeoutId = window.setTimeout(() => this.ui.messageBanner.classList.add('hidden'), duration);
  }

  _clearMessage() {
    if (this.messageTimeoutId) { window.clearTimeout(this.messageTimeoutId); this.messageTimeoutId = null; }
    this.ui.messageBanner.classList.add('hidden');
  }

  _hidePanels() {
    this.ui.decisionPanel.classList.add('hidden');
    this.ui.questionPanel.classList.add('hidden');
  }

  _showLoading(text) { this.ui.loadingText.textContent = text; this.ui.loadingOverlay.classList.remove('hidden'); }
  _hideLoading() { this.ui.loadingOverlay.classList.add('hidden'); }

  _setActiveScreen(screenId) {
    SCREEN_IDS.forEach((id) => document.getElementById(id).classList.toggle('active', id === screenId));
  }

  restart() { this.depth = 0; this.pot = 0; this.questionsUsed = 0; this.state = 'menu'; }

  destroy() {
    this._clearTimeouts();
    this._disposeRuntime();
    this.state = 'menu';
    this._hidePanels();
    this._hideLoading();
    this.ui.messageBanner.classList.add('hidden');
    this.ui.revealBanner.classList.add('hidden');
    this.ui.deathOverlay.classList.remove('active', 'instant');
  }

  _disposeRuntime() {
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    if (this.audio) { this.audio.dispose(); this.audio = null; }
  }

  _clearTransition() {
    if (this.transitionTimeoutId) { window.clearTimeout(this.transitionTimeoutId); this.transitionTimeoutId = null; }
  }

  _clearTimeouts() {
    this._clearTransition();
    this._clearMessage();
    if (this.revealTimeoutId) { window.clearTimeout(this.revealTimeoutId); this.revealTimeoutId = null; }
  }

  _escape(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
}
