const MAX_FLOORS = 10;

// Each band covers two floors. min = guaranteed gold (knowledge always pays),
// bonus = hidden random extra on top (the reveal thrill). Steep growth keeps
// deep runs short and rich.
const ORE_TIERS = [
  { name: 'Уголь', icon: '⚫', min: 10, bonus: 10, tier: 1, difficulty: 1 },
  { name: 'Железо', icon: '🔩', min: 30, bonus: 30, tier: 2, difficulty: 2 },
  { name: 'Золото', icon: '🟡', min: 80, bonus: 80, tier: 3, difficulty: 3 },
  { name: 'Лазурит', icon: '🔵', min: 200, bonus: 200, tier: 4, difficulty: 4 },
  { name: 'Алмаз', icon: '💎', min: 500, bonus: 500, tier: 5, difficulty: 4 }
];

const SCREEN_IDS = ['menu-screen', 'game-screen', 'win-screen', 'lose-screen', 'leaderboard-screen'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tierForDepth(depth) {
  const index = Math.min(ORE_TIERS.length - 1, Math.floor((depth - 1) / 2));
  return ORE_TIERS[index];
}

class Leaderboard {
  constructor() {
    this.key = 'schacht_leaderboard';
  }

  getScores() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch (error) {
      console.warn('Failed to read leaderboard:', error);
      return [];
    }
  }

  best() {
    const scores = this.getScores();
    return scores.length ? scores[0].gold : 0;
  }

  addScore(entry) {
    const scores = this.getScores();
    scores.push(entry);
    // Leaderboard = best single run (gold banked), so runs never accumulate.
    scores.sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      return b.depth - a.depth;
    });
    try { localStorage.setItem(this.key, JSON.stringify(scores.slice(0, 20))); } catch (_) {}
  }

  render() {
    const tbody = document.getElementById('leaderboard-body');
    const empty = document.getElementById('leaderboard-empty');
    const scores = this.getScores();
    tbody.innerHTML = '';

    if (!scores.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      if (index < 3) row.className = `rank-${index + 1}`;
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${this._escape(score.name)}</td>
        <td>${score.depth}</td>
        <td>${score.gold} 💰</td>
      `;
      tbody.appendChild(row);
    });
  }

  _escape(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
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
    this.pot = 0;
    this.currentQuestion = null;
    this.currentTier = null;

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
      digBtn: document.getElementById('dig-btn'),
      bankBtn: document.getElementById('bank-btn'),
      questionPanel: document.getElementById('question-panel'),
      questionTopicLabel: document.getElementById('question-topic-label'),
      questionText: document.getElementById('question-text'),
      questionOptions: document.getElementById('question-options'),
      questionFeedback: document.getElementById('question-feedback'),
      depthNum: document.getElementById('depth-num'),
      goldNum: document.getElementById('gold-num'),
      tierDisplay: document.getElementById('tier-display'),
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
      level: this.settings.langLevel,
      lexicalTopic: this.settings.lexicalTopic,
      grammarTopics: this.settings.grammarTopics
    });

    this.renderer = new MineRenderer(this.ui.canvas);
    this.audio = new AudioManager();
    this.audio.init();

    await Promise.allSettled([
      this.renderer.ensureReady(),
      this.questionManager.prefetch([1, 2])
    ]);

    this.renderer.buildShaft(MAX_FLOORS);
    this.renderer.startLoop(() => {});

    this._updateHud();
    this._hideLoading();
    this.state = 'decision';
    this._showDecision();
    this._showMessage('Ты на поверхности. Копай вниз за рудой — но помни про обвал.', 2600);
  }

  startNewRun() {
    this.init(this.settings).catch((error) => {
      console.error('Failed to start run:', error);
    });
  }

  _resetRunState() {
    this.state = 'loading';
    this.depth = 0;
    this.pot = 0;
    this.currentQuestion = null;
    this.currentTier = null;
  }

  // ---------- Decision: dig deeper or climb out ----------
  _showDecision() {
    this._hidePanels();
    this.state = 'decision';
    this.ui.decisionPanel.classList.remove('hidden');
    this._updateHud();

    const atBottom = this.depth >= MAX_FLOORS;
    if (atBottom) {
      // Safety net — normally we auto-bank at the bottom.
      this.bank(true);
      return;
    }

    const nextTier = tierForDepth(this.depth + 1);
    this.ui.digBtn.disabled = false;
    this.ui.bankBtn.disabled = this.depth === 0;

    if (this.depth === 0) {
      this.ui.decisionPrompt.textContent =
        `Глубже ждёт ${nextTier.icon} ${nextTier.name}. Спускайся!`;
    } else {
      this.ui.decisionPrompt.textContent =
        `Рюкзак: ${this.pot} 💰. Глубже — ${nextTier.icon} ${nextTier.name} (дороже). ` +
        `Копать дальше или подняться и забрать?`;
    }
  }

  async digDeeper() {
    if (this.state !== 'decision' || this.depth >= MAX_FLOORS) {
      return;
    }

    // Commit BLIND: the question only appears after you choose to descend.
    this._hidePanels();
    this.state = 'question';
    const nextDepth = this.depth + 1;
    this.currentTier = tierForDepth(nextDepth);

    this._showMessage('Долбим породу...', 1200);
    const question = await this.questionManager.getQuestion(this.currentTier.difficulty);

    if (this.state !== 'question') {
      return; // run was aborted while fetching
    }
    this.currentQuestion = question;
    this._clearMessage();
    this._showQuestion(question);
  }

  bank(reachedBottom = false) {
    if (this.state !== 'decision' && !reachedBottom) {
      return;
    }
    if (this.depth === 0 && !reachedBottom) {
      return;
    }
    this._win(reachedBottom);
  }

  // ---------- Question ----------
  _showQuestion(question) {
    this._hidePanels();
    this.ui.questionPanel.classList.remove('hidden');
    this.ui.questionFeedback.classList.add('hidden');
    this.ui.questionFeedback.textContent = '';

    this.ui.questionTopicLabel.textContent =
      `${this.currentTier.icon} ${this.currentTier.name} • ${question.grammarTopic} • ${question.level}`;
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
        if (index === question.options.correctIndex) {
          button.classList.add('correct');
        } else {
          button.classList.add('wrong');
          buttons[question.options.correctIndex].classList.add('correct');
        }
        this.answer(index);
      });
      this.ui.questionOptions.appendChild(button);
    });
  }

  answer(selectedIndex) {
    if (this.state !== 'question' || !this.currentQuestion) {
      return;
    }
    const isCorrect = selectedIndex === this.currentQuestion.options.correctIndex;

    if (isCorrect) {
      this.audio.playCorrect();
      this.audio.playDig();
      this.renderer.swingPickaxe();
      this._showFeedback(true, 'Верно! Спускаемся глубже...');

      this.state = 'descending';
      this._clearTransition();
      this.transitionTimeoutId = window.setTimeout(() => {
        if (this.state !== 'descending') return;
        this.renderer.descend(() => this._onArrive());
      }, 600);
      return;
    }

    // Wrong → cave-in, lose the whole backpack.
    this.audio.playWrong();
    const correct = this.currentQuestion.options.options[this.currentQuestion.options.correctIndex];
    this._showFeedback(false, `Обвал! Правильно: ${correct}`);
    this.state = 'lost';
    this._clearTransition();
    this.transitionTimeoutId = window.setTimeout(() => this._caveIn(), 900);
  }

  _onArrive() {
    this.depth += 1;
    const tier = tierForDepth(this.depth);
    const gold = tier.min + randomInt(0, tier.bonus);
    this.pot += gold;

    this.renderer.revealOre(this.depth, tier.tier);
    this.audio.playOreReveal(tier.tier);
    this._showReveal(`+${gold} 💰 ${tier.icon}`);
    this._updateHud();

    if (this.depth >= MAX_FLOORS) {
      this._clearTransition();
      this.transitionTimeoutId = window.setTimeout(() => this.bank(true), 1300);
      return;
    }

    this._clearTransition();
    this.transitionTimeoutId = window.setTimeout(() => {
      if (this.state === 'descending') {
        this._showDecision();
      }
    }, 1100);
  }

  // ---------- End states ----------
  _win(reachedBottom) {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = 'won';
    this._clearTimeouts();
    this._hidePanels();
    this.audio.playBank();

    this.leaderboard.addScore({
      name: this.settings.playerName,
      depth: this.depth,
      gold: this.pot,
      date: new Date().toISOString()
    });

    this.ui.winTitle.textContent = reachedBottom ? '💎 ДНО ШАХТЫ!' : '🪜 ТЫ ВЫБРАЛСЯ!';
    this.ui.winStats.textContent =
      `Ты поднял на поверхность ${this.pot} 💰 с глубины ${this.depth}. ` +
      (reachedBottom ? 'Ты добрался до самого дна — легенда!' : 'Золото твоё. Жадность не победила.');

    window.setTimeout(() => {
      if (this.renderer) this.renderer.stopLoop();
      this._setActiveScreen('win-screen');
    }, 700);
  }

  _caveIn() {
    if (this.state === 'won') return;
    this.state = 'lost';
    this._clearTimeouts();
    this._hidePanels();
    this.audio.playCaveIn();
    this.ui.deathOverlay.classList.add('active');

    this.ui.loseMessage.textContent = 'Шахта обрушилась, и весь рюкзак засыпало...';
    this.ui.loseStats.textContent =
      `Ты потерял ${this.pot} 💰 на глубине ${this.depth}. Надо было вовремя подняться.`;

    this.renderer.caveIn(() => {
      if (this.renderer) this.renderer.stopLoop();
      this._setActiveScreen('lose-screen');
    });
  }

  // ---------- View helpers ----------
  rotateView(direction) {
    if (this.renderer && (this.state === 'decision' || this.state === 'question')) {
      this.renderer.nudgeYaw(direction);
    }
  }

  _updateHud() {
    this.ui.depthNum.textContent = this.depth;
    this.ui.goldNum.textContent = this.pot;
    this.ui.bestNum.textContent = this.leaderboard.best();
    if (this.depth >= 1) {
      const tier = tierForDepth(this.depth);
      this.ui.tierDisplay.textContent = `${tier.icon} ${tier.name}`;
    } else {
      this.ui.tierDisplay.textContent = '';
    }
  }

  _showQuestionTopicLabel() {}

  _showFeedback(isCorrect, text) {
    this.ui.questionFeedback.classList.remove('hidden', 'correct', 'wrong');
    this.ui.questionFeedback.classList.add(isCorrect ? 'correct' : 'wrong');
    this.ui.questionFeedback.textContent = text;
  }

  _showReveal(text) {
    const banner = this.ui.revealBanner;
    banner.textContent = text;
    banner.classList.remove('hidden', 'show');
    void banner.offsetWidth; // restart animation
    banner.classList.add('show');
    if (this.revealTimeoutId) window.clearTimeout(this.revealTimeoutId);
    this.revealTimeoutId = window.setTimeout(() => {
      banner.classList.add('hidden');
    }, 1200);
  }

  _showMessage(text, duration = 1500) {
    this._clearMessage();
    this.ui.messageBanner.textContent = text;
    this.ui.messageBanner.classList.remove('hidden');
    this.messageTimeoutId = window.setTimeout(() => {
      this.ui.messageBanner.classList.add('hidden');
    }, duration);
  }

  _clearMessage() {
    if (this.messageTimeoutId) {
      window.clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
    this.ui.messageBanner.classList.add('hidden');
  }

  _hidePanels() {
    this.ui.decisionPanel.classList.add('hidden');
    this.ui.questionPanel.classList.add('hidden');
  }

  _showLoading(text) {
    this.ui.loadingText.textContent = text;
    this.ui.loadingOverlay.classList.remove('hidden');
  }

  _hideLoading() {
    this.ui.loadingOverlay.classList.add('hidden');
  }

  _setActiveScreen(screenId) {
    SCREEN_IDS.forEach((id) => {
      document.getElementById(id).classList.toggle('active', id === screenId);
    });
  }

  restart() {
    this.depth = 0;
    this.pot = 0;
    this.state = 'menu';
  }

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
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.audio) {
      this.audio.dispose();
      this.audio = null;
    }
  }

  _clearTransition() {
    if (this.transitionTimeoutId) {
      window.clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
  }

  _clearTimeouts() {
    this._clearTransition();
    this._clearMessage();
    if (this.revealTimeoutId) {
      window.clearTimeout(this.revealTimeoutId);
      this.revealTimeoutId = null;
    }
  }

  _escape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
