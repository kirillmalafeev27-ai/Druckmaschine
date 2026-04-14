const GRID_SIZE = 8;
const PLAYER_START = { x: 3, y: 7 };
const START_SAFE_TILES = [
  { x: 3, y: 7 },
  { x: 4, y: 7 }
];
const MIN_SAFE_DISTANCE = 4;
const DOOR_COUNT = 6;
const DOOR_MIN_SPACING = 2;
const SCREEN_IDS = [
  'menu-screen',
  'game-screen',
  'win-screen',
  'lose-screen',
  'leaderboard-screen'
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tileKey(x, y) {
  return `${x}:${y}`;
}

class Leaderboard {
  constructor() {
    this.key = 'drucker_leaderboard';
  }

  getScores() {
    try {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    } catch (error) {
      console.warn('Failed to read leaderboard:', error);
      return [];
    }
  }

  addScore(entry) {
    const scores = this.getScores();
    scores.push(entry);
    scores.sort((left, right) => {
      if (right.level !== left.level) {
        return right.level - left.level;
      }
      if (right.accuracy !== left.accuracy) {
        return right.accuracy - left.accuracy;
      }
      if (right.correct !== left.correct) {
        return right.correct - left.correct;
      }
      return left.durationMs - right.durationMs;
    });
    localStorage.setItem(this.key, JSON.stringify(scores.slice(0, 20)));
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
      if (index < 3) {
        row.className = `rank-${index + 1}`;
      }

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${this._escapeHtml(score.name)}</td>
        <td>${score.level}</td>
        <td>${score.accuracy}%</td>
      `;
      tbody.appendChild(row);
    });
  }

  _escapeHtml(value) {
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
    this.questionManager = null;
    this.leaderboard = new Leaderboard();

    this.playerName = 'Spieler';
    this.langLevel = 'A1';
    this.lexicalTopic = null;
    this.slotConfigs = [];
    this.currentLevel = 1;

    this.player = { ...PLAYER_START };
    this.levelData = null;
    this.correctDoorId = null;
    this.safeTileKeys = new Set();
    this.startSafeKeys = new Set(START_SAFE_TILES.map((tile) => tileKey(tile.x, tile.y)));

    this.movesLeft = 0;
    this.questionsAnswered = 0;
    this.questionsCorrect = 0;
    this.doorAttempts = 0;
    this.shieldCharges = 0;
    this.shieldCooldownUntil = 0;
    this.currentSlotId = null;
    this.currentQuestion = null;

    this.hintDoorId = null;
    this.hintUntil = 0;
    this.hintCooldownUntil = 0;
    this.timerRevealUntil = 0;
    this.messageTimeoutId = null;
    this.transitionTimeoutId = null;

    this.startedAt = 0;
    this.lastSafeState = null;
    this.lastDoorPromptId = null;

    this.crusher = {
      phase: 'waiting',
      phaseStartedAt: 0,
      nextDropAt: 0,
      waitMs: 0,
      dropMs: 0,
      downMs: 0,
      riseMs: 0
    };

    this.ui = this._cacheUi();
  }

  _cacheUi() {
    return {
      canvas: document.getElementById('game-canvas'),
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text'),
      topicPanel: document.getElementById('topic-panel'),
      topicButtons: document.getElementById('topic-buttons'),
      questionPanel: document.getElementById('question-panel'),
      questionTopicLabel: document.getElementById('question-topic-label'),
      questionText: document.getElementById('question-text'),
      questionOptions: document.getElementById('question-options'),
      questionFeedback: document.getElementById('question-feedback'),
      directionPanel: document.getElementById('direction-panel'),
      directionPrompt: document.querySelector('#direction-panel .direction-prompt'),
      useDoorPrompt: document.getElementById('use-door-prompt'),
      safeIndicator: document.getElementById('safe-indicator'),
      levelNum: document.getElementById('level-num'),
      statusEffects: document.getElementById('status-effects'),
      timerDisplay: document.getElementById('crusher-timer-display'),
      timerValue: document.getElementById('crusher-timer-value'),
      deathOverlay: document.getElementById('death-overlay'),
      messageBanner: document.getElementById('message-banner'),
      winStats: document.getElementById('win-stats'),
      loseStats: document.getElementById('lose-stats'),
      loseMessage: document.getElementById('lose-message')
    };
  }

  async init(settings, reuseQuestions = false) {
    this._disposeRuntime();
    this._clearTimeouts();
    this._applySettings(settings);
    this._resetRunState();
    this._setActiveScreen('game-screen');
    this._showLoading('Загружаем комнату...');
    this._hidePanels();
    this._hideDoorPrompt();
    this.ui.deathOverlay.classList.remove('active');
    this.ui.deathOverlay.classList.remove('instant');

    if (!reuseQuestions || !this.questionManager) {
      this.questionManager = new QuestionManager(this.langLevel);
      this.questionManager.setLevel(this.langLevel);
      this.questionManager.setLexicalTopic(this.lexicalTopic);
      this.questionManager.configureSlots(this.slotConfigs);
    }

    this.renderer = new CrusherRoomRenderer(this.ui.canvas);
    this.audio = new AudioManager();
    this.audio.init();

    this.levelData = this._createLevelData(this.currentLevel);
    this.correctDoorId = this.levelData.correctDoorId;
    this.safeTileKeys = new Set(this.levelData.safeTiles.map((tile) => tileKey(tile.x, tile.y)));
    this.player = { ...this.levelData.start };
    this.startedAt = performance.now();

    const loadTasks = [this.renderer.ensureModelsLoaded()];
    if (!reuseQuestions || !this.questionManager) {
      loadTasks.push(this.questionManager.prefetchAll());
    }
    await Promise.allSettled(loadTasks);

    this.renderer.buildLevel(this.levelData);
    this.renderer.setPlayerCell(this.player.x, this.player.y, true);
    this._scheduleCrusherCycle();
    this._updateStatusEffects();
    this._updateHud();
    this._updateDoorPrompt();

    this.state = 'topic_select';
    this._showTopicPanel();
    this._hideLoading();
    this._showMessage('Вы в безопасности у входа. Отвечайте правильно и ищите нужную дверь.', 2800);

    this.renderer.startLoop((deltaSeconds) => {
      this._update(deltaSeconds);
    });
  }

  _applySettings(settings) {
    this.playerName = settings.playerName || 'Spieler';
    this.langLevel = settings.langLevel || 'A1';
    this.lexicalTopic = settings.lexicalTopic || null;
    this.slotConfigs = (settings.slotConfigs || []).map((config) => ({
      slotDef: config.slotDef,
      grammarTopic: config.grammarTopic
    }));
    this.currentLevel = settings.level || 1;
  }

  _resetRunState() {
    this.state = 'loading';
    this.movesLeft = 0;
    this.questionsAnswered = 0;
    this.questionsCorrect = 0;
    this.doorAttempts = 0;
    this.shieldCharges = 0;
    this.shieldCooldownUntil = 0;
    this.currentSlotId = null;
    this.currentQuestion = null;
    this.hintDoorId = null;
    this.hintUntil = 0;
    this.hintCooldownUntil = 0;
    this.timerRevealUntil = 0;
    this.lastSafeState = null;
    this.lastDoorPromptId = null;
    this.ui.messageBanner.classList.add('hidden');
  }

  _createLevelData(level) {
    const doors = this._generateDoors();
    const safeTiles = this._generateSafeTiles(level);
    const correctDoor = doors[randomInt(0, doors.length - 1)];

    return {
      gridSize: GRID_SIZE,
      start: { ...PLAYER_START },
      startSafeTiles: START_SAFE_TILES.map((tile) => ({ ...tile })),
      safeTiles,
      doors,
      correctDoorId: correctDoor.id
    };
  }

  _generateDoors() {
    const candidates = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      candidates.push({ side: 'north', col, row: 0, approach: { x: col, y: 0 } });
    }
    for (let row = 0; row < GRID_SIZE; row += 1) {
      candidates.push({ side: 'west', col: 0, row, approach: { x: 0, y: row } });
      candidates.push({ side: 'east', col: GRID_SIZE - 1, row, approach: { x: GRID_SIZE - 1, y: row } });
    }

    const shuffled = shuffleArray(candidates);
    const chosen = [];
    let index = 0;

    for (const cand of shuffled) {
      if (chosen.length >= DOOR_COUNT) {
        break;
      }

      const tooClose = chosen.some((other) =>
        Math.abs(other.approach.x - cand.approach.x) + Math.abs(other.approach.y - cand.approach.y) < DOOR_MIN_SPACING
      );
      if (tooClose) {
        continue;
      }

      index += 1;
      chosen.push({
        id: `door-${cand.side}-${index}`,
        side: cand.side,
        col: cand.col,
        row: cand.row,
        approach: { x: cand.approach.x, y: cand.approach.y }
      });
    }

    return chosen;
  }

  _generateSafeTiles(level) {
    const safeTiles = [];
    const placed = [...START_SAFE_TILES];
    const targetCount = Math.max(3, 5 - Math.floor((level - 1) / 3));

    const isFarEnough = (x, y) => {
      for (const tile of placed) {
        if (Math.abs(tile.x - x) + Math.abs(tile.y - y) < MIN_SAFE_DISTANCE) {
          return false;
        }
      }
      return true;
    };

    const candidates = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (!START_SAFE_TILES.some((tile) => tile.x === x && tile.y === y)) {
          candidates.push({ x, y });
        }
      }
    }

    const shuffled = shuffleArray(candidates);
    for (const tile of shuffled) {
      if (safeTiles.length >= targetCount) {
        break;
      }
      if (isFarEnough(tile.x, tile.y)) {
        safeTiles.push(tile);
        placed.push(tile);
      }
    }

    return safeTiles;
  }

  _scheduleCrusherCycle() {
    const now = performance.now();
    this.crusher.phase = 'waiting';
    this.crusher.phaseStartedAt = now;
    const baseWait = this.currentLevel <= 1 ? 22 : this.currentLevel <= 2 ? 17 : 12;
    this.crusher.waitMs = (baseWait + 1 + Math.random() * 4) * 1000;
    this.crusher.dropMs = (1 + 1 + Math.random()) * 1000;
    this.crusher.downMs = 850;
    this.crusher.riseMs = 900;
    this.crusher.nextDropAt = now + this.crusher.waitMs;
    this.renderer.setCrusherState(0, 'waiting', 0);
    this.audio.setCrusherDanger(0);
  }

  _update() {
    if (this.state === 'won' || this.state === 'lost' || this.state === 'menu') {
      return;
    }

    const now = performance.now();
    this._updateEffects(now);
    this._updateCrusher(now);
    this._updateDoorPrompt();
    this._updateSafeIndicator();
    this._updateTimerDisplay(now);
  }

  _updateEffects(now) {
    if (this.hintDoorId && now >= this.hintUntil) {
      this.hintDoorId = null;
      this.hintUntil = 0;
      if (this.renderer) {
        this.renderer.setHintedDoor(null);
      }
      this._updateStatusEffects();
    }

    if (this.timerRevealUntil && now >= this.timerRevealUntil) {
      this.timerRevealUntil = 0;
      this._updateStatusEffects();
      this._updateTimerDisplay(now);
    }
  }

  _updateCrusher(now) {
    let progress = 0;
    let danger = 0;

    if (this.crusher.phase === 'waiting') {
      const remaining = this.crusher.nextDropAt - now;
      danger = clamp(1 - remaining / 5000, 0, 1);
      if (remaining <= 0) {
        this.crusher.phase = 'dropping';
        this.crusher.phaseStartedAt = now;
        this.crusher.hitHead = false;
        this.audio.playCrusherStart();
        this._showMessage('Давилка пошла вниз!', 1200);
      }
    }

    if (this.crusher.phase === 'dropping') {
      progress = clamp((now - this.crusher.phaseStartedAt) / this.crusher.dropMs, 0, 1);
      danger = 1;

      const headProgress = this.renderer.getHeadCrushProgress();
      if (!this.crusher.hitHead && progress >= headProgress && !this._isPlayerSafe()) {
        this.crusher.hitHead = true;
        if (this.shieldCharges > 0) {
          this.shieldCharges -= 1;
          this.audio.playShieldBreak();
          this._updateStatusEffects();
          this._showMessage('Щит спас от удара, но исчез.', 1800);
        } else {
          this.audio.playCrusherImpact();
          this._lose('Давилка раздавила вас.', false);
          return;
        }
      }

      if (progress >= 1) {
        this.crusher.phase = 'down';
        this.crusher.phaseStartedAt = now;
        this.audio.playCrusherImpact();
        this.renderer.shake(0.12, 450);
        progress = 1;
      }
    } else if (this.crusher.phase === 'down') {
      progress = 1;
      danger = 1;
      if (now - this.crusher.phaseStartedAt >= this.crusher.downMs) {
        this.crusher.phase = 'rising';
        this.crusher.phaseStartedAt = now;
      }
    } else if (this.crusher.phase === 'rising') {
      const elapsed = clamp((now - this.crusher.phaseStartedAt) / this.crusher.riseMs, 0, 1);
      progress = 1 - elapsed;
      danger = clamp(progress * 0.4, 0, 0.4);
      if (elapsed >= 1) {
        this._scheduleCrusherCycle();
        return;
      }
    }

    this.renderer.setCrusherState(progress, this.crusher.phase, danger);
    this.audio.setCrusherDanger(danger);
  }

  _isPlayerSafe() {
    const key = tileKey(this.player.x, this.player.y);
    return this.startSafeKeys.has(key) || this.safeTileKeys.has(key);
  }

  selectTopic(slotId) {
    if (this.state !== 'topic_select') {
      return;
    }

    const question = this.questionManager.getQuestion(slotId);
    if (!question) {
      this._showMessage('Не удалось получить вопрос для этого слота.', 1400);
      return;
    }

    this.currentSlotId = slotId;
    this.currentQuestion = question;
    this.state = 'question';
    this._showQuestion(question);
  }

  answerQuestion(selectedIndex) {
    if (this.state !== 'question' || !this.currentQuestion) {
      return;
    }

    this.questionsAnswered += 1;
    const isCorrect = selectedIndex === this.currentQuestion.options.correctIndex;

    if (isCorrect) {
      this.questionsCorrect += 1;
      this.audio.playCorrectAnswer();
      const reward = this._applyBonus(this.currentQuestion.slotDef.bonus);
      this.questionManager.onCorrectAnswer(this.currentSlotId);
      this._showFeedback(true, reward.feedback);

      this._clearTransitionTimeout();
      this.transitionTimeoutId = window.setTimeout(() => {
        if (this.state === 'won' || this.state === 'lost') {
          return;
        }
        if (this.movesLeft > 0) {
          this.state = 'direction_select';
          this._showDirectionPanel();
        } else {
          this.state = 'topic_select';
          this._showTopicPanel();
        }
      }, 850);
      return;
    }

    this.audio.playWrongAnswer();
    this.questionManager.onWrongAnswer(this.currentSlotId);
    this._showFeedback(false, `Неверно. Правильный ответ: ${this.currentQuestion.options.options[this.currentQuestion.options.correctIndex]}`);

    this._clearTransitionTimeout();
    this.transitionTimeoutId = window.setTimeout(() => {
      if (this.state === 'won' || this.state === 'lost') {
        return;
      }
      this.state = 'topic_select';
      this._showTopicPanel();
    }, 1300);
  }

  _applyBonus(bonusType) {
    const now = performance.now();
    let steps = 1;
    let feedback = 'Верно! +1 ход.';

    if (bonusType === 'move2') {
      steps = 2;
      feedback = 'Верно! +2 хода.';
    } else if (bonusType === 'hint') {
      steps = 0;
      if (now < this.hintCooldownUntil) {
        const remaining = Math.ceil((this.hintCooldownUntil - now) / 1000);
        feedback = `Верно! Подсказка перезаряжается ещё ${remaining} c.`;
      } else {
        const wrongDoors = this.levelData.doors.filter((door) => door.id !== this.correctDoorId);
        if (wrongDoors.length) {
          const wrongDoor = wrongDoors[randomInt(0, wrongDoors.length - 1)];
          this.hintDoorId = wrongDoor.id;
          this.hintUntil = now + 6500;
          this.hintCooldownUntil = now + 180000;
          this.renderer.setHintedDoor(wrongDoor.id);
          feedback = 'Верно! Подсказка: эта дверь неверная.';
        } else {
          feedback = 'Верно!';
        }
      }
    } else if (bonusType === 'shield') {
      steps = 0;
      if (now < this.shieldCooldownUntil) {
        const remaining = Math.ceil((this.shieldCooldownUntil - now) / 1000);
        feedback = `Верно! Щит перезаряжается ещё ${remaining} c.`;
      } else if (this.shieldCharges >= 1) {
        feedback = 'Верно! У вас уже есть щит.';
      } else {
        this.shieldCharges = 1;
        this.shieldCooldownUntil = now + 120000;
        feedback = 'Верно! Щит от одного удара активирован.';
      }
    } else if (bonusType === 'timer') {
      steps = 0;
      this.timerRevealUntil = now + 8000;
      feedback = 'Верно! Временный таймер давилки активирован.';
    }

    this.movesLeft = steps;
    this._updateStatusEffects();
    this._updateTimerDisplay(now);
    return { steps, feedback };
  }

  movePlayer(relativeDirection) {
    if (this.state !== 'direction_select' || this.movesLeft <= 0 || !this.renderer) {
      return;
    }

    const delta = this.renderer.getMoveDelta(relativeDirection);
    const nextX = this.player.x + delta.x;
    const nextY = this.player.y + delta.y;

    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      this._showMessage('Там стена.', 900);
      return;
    }

    this.player.x = nextX;
    this.player.y = nextY;
    this.movesLeft -= 1;

    this.renderer.setPlayerCell(this.player.x, this.player.y);
    this.audio.playStep();
    this._updateSafeIndicator(true);
    this._updateDoorPrompt();
    this._updateStatusEffects();

    if (this.movesLeft > 0) {
      this._showDirectionPanel();
      return;
    }

    this.state = 'topic_select';
    this._showTopicPanel();
  }

  rotateView(direction) {
    if (!this.renderer || this.state === 'loading' || this.state === 'won' || this.state === 'lost') {
      return;
    }

    this.renderer.nudgeYaw(direction);
    this._updateDoorPrompt();

    if (this.state === 'direction_select') {
      this._updateDirectionButtons();
    }
  }

  tryUseDoor() {
    if (this.state === 'loading' || this.state === 'question' || this.state === 'won' || this.state === 'lost') {
      return;
    }

    const doorId = this.getInteractableDoorId();
    if (!doorId) {
      return;
    }

    this.doorAttempts += 1;
    const success = doorId === this.correctDoorId;
    this.renderer.triggerDoorAttempt(doorId, success);

    if (success) {
      this.audio.playDoorOpen();
      this._win();
      return;
    }

    this.audio.playDoorLocked();
    this._showMessage('Неверная дверь. Замок не поддаётся.', 1200);
  }

  getInteractableDoorId() {
    if (!this.renderer) {
      return null;
    }
    return this.renderer.getInteractableDoorId(this.player.x, this.player.y);
  }

  hasDoorInReach() {
    return Boolean(this.getInteractableDoorId());
  }

  _win() {
    if (this.state === 'won' || this.state === 'lost') {
      return;
    }

    this.state = 'won';
    this._clearTimeouts();
    this._hidePanels();
    this._hideDoorPrompt();
    this.audio.setCrusherDanger(0);
    this._saveScore();

    const accuracy = this._getAccuracy();
    this.ui.winStats.textContent =
      `Уровень ${this.currentLevel} пройден. Точность: ${accuracy}%. Правильных ответов: ${this.questionsCorrect}/${this.questionsAnswered}.`;

    window.setTimeout(() => {
      if (this.renderer) {
        this.renderer.stopLoop();
      }
      this._setActiveScreen('win-screen');
    }, 500);
  }

  _lose(message, instant = false) {
    if (this.state === 'won' || this.state === 'lost') {
      return;
    }

    this.state = 'lost';
    this._clearTimeouts();
    this._hidePanels();
    this._hideDoorPrompt();
    this.audio.setCrusherDanger(0);
    this.ui.deathOverlay.classList.add('active');
    if (instant) {
      this.ui.deathOverlay.classList.add('instant');
    }
    this._saveScore();

    const accuracy = this._getAccuracy();
    this.ui.loseMessage.textContent = message;
    this.ui.loseStats.textContent =
      `Уровень: ${this.currentLevel}. Точность: ${accuracy}%. Правильных ответов: ${this.questionsCorrect}/${this.questionsAnswered}.`;

    const delay = instant ? 350 : 650;
    window.setTimeout(() => {
      if (this.renderer) {
        this.renderer.stopLoop();
      }
      this._setActiveScreen('lose-screen');
    }, delay);
  }

  _saveScore() {
    this.leaderboard.addScore({
      name: this.playerName,
      level: this.currentLevel,
      accuracy: this._getAccuracy(),
      correct: this.questionsCorrect,
      total: this.questionsAnswered,
      durationMs: Math.round(performance.now() - this.startedAt),
      doorsTried: this.doorAttempts,
      lexicalTopic: this.lexicalTopic,
      date: new Date().toISOString()
    });
  }

  _getAccuracy() {
    if (!this.questionsAnswered) {
      return 0;
    }
    return Math.round((this.questionsCorrect / this.questionsAnswered) * 100);
  }

  nextLevel() {
    this.init(this._buildSettings(this.currentLevel + 1)).catch((error) => {
      console.error('Failed to load next level:', error);
    });
  }

  restartLevel() {
    this.init(this._buildSettings(this.currentLevel), true).catch((error) => {
      console.error('Failed to restart level:', error);
    });
  }

  restart() {
    this.currentLevel = 1;
  }

  _buildSettings(level) {
    return {
      playerName: this.playerName,
      langLevel: this.langLevel,
      lexicalTopic: this.lexicalTopic,
      slotConfigs: this.slotConfigs,
      level
    };
  }

  _showTopicPanel() {
    this._hidePanels();
    this.ui.topicPanel.classList.remove('hidden');
    this.ui.topicButtons.innerHTML = '';

    this.slotConfigs.forEach((config, index) => {
      const button = document.createElement('button');
      button.className = 'topic-btn';
      button.dataset.slot = config.slotDef.id;

      const title = config.slotDef.isWortstellung
        ? `Wortstellung + ${config.grammarTopic}`
        : config.grammarTopic;

      button.innerHTML = `
        <span class="topic-name">${index + 1}. ${this._escapeHtml(title)}</span>
        <span class="topic-bonus">${this._escapeHtml(config.slotDef.bonusLabel)}</span>
      `;
      button.addEventListener('click', () => this.selectTopic(config.slotDef.id));
      this.ui.topicButtons.appendChild(button);
    });
  }

  _showQuestion(question) {
    this._hidePanels();
    this.ui.questionPanel.classList.remove('hidden');
    this.ui.questionFeedback.classList.add('hidden');
    this.ui.questionFeedback.textContent = '';

    const label = question.slotDef.isWortstellung
      ? `Wortstellung • ${question.grammarTopic}`
      : question.grammarTopic;

    this.ui.questionTopicLabel.textContent = `${label} • ${question.level}`;
    this.ui.questionText.innerHTML =
      `${this._escapeHtml(question.text)}<br><strong>${this._escapeHtml(question.display)}</strong>`;

    this.ui.questionOptions.innerHTML = '';
    question.options.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'option-btn';
      button.textContent = `${index + 1}. ${option}`;
      button.addEventListener('click', () => {
        const buttons = this.ui.questionOptions.querySelectorAll('.option-btn');
        buttons.forEach((item) => {
          item.disabled = true;
        });

        if (index === question.options.correctIndex) {
          button.classList.add('correct');
        } else {
          button.classList.add('wrong');
          buttons[question.options.correctIndex].classList.add('correct');
        }

        this.answerQuestion(index);
      });
      this.ui.questionOptions.appendChild(button);
    });
  }

  _showFeedback(isCorrect, text) {
    this.ui.questionFeedback.classList.remove('hidden', 'correct', 'wrong');
    this.ui.questionFeedback.classList.add(isCorrect ? 'correct' : 'wrong');
    this.ui.questionFeedback.textContent = text;
  }

  _showDirectionPanel() {
    this._hidePanels();
    this.ui.directionPanel.classList.remove('hidden');
    this.ui.directionPrompt.textContent =
      `Выберите направление. Ходов осталось: ${this.movesLeft}.`;
    this._updateDirectionButtons();
  }

  _updateDirectionButtons() {
    const buttons = document.querySelectorAll('.dir-btn');
    buttons.forEach((button) => {
      const delta = this.renderer.getMoveDelta(button.dataset.dir);
      const nextX = this.player.x + delta.x;
      const nextY = this.player.y + delta.y;
      button.disabled = nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE;
    });
  }

  _hidePanels() {
    this.ui.topicPanel.classList.add('hidden');
    this.ui.questionPanel.classList.add('hidden');
    this.ui.directionPanel.classList.add('hidden');
  }

  _showLoading(text) {
    this.ui.loadingText.textContent = text;
    this.ui.loadingOverlay.classList.remove('hidden');
  }

  _hideLoading() {
    this.ui.loadingOverlay.classList.add('hidden');
  }

  _updateHud() {
    this.ui.levelNum.textContent = this.currentLevel;
    this._updateSafeIndicator(true);
    this._updateStatusEffects();
  }

  _updateSafeIndicator(force = false) {
    const isSafe = this._isPlayerSafe();
    if (!force && this.lastSafeState === isSafe) {
      return;
    }

    this.lastSafeState = isSafe;
    this.ui.safeIndicator.classList.toggle('hidden', !isSafe);
  }

  _updateStatusEffects() {
    const container = this.ui.statusEffects;
    container.innerHTML = '';

    if (this.shieldCharges > 0) {
      container.appendChild(this._createStatusBadge(`Щит x${this.shieldCharges}`));
    }

    if (this.hintDoorId) {
      container.appendChild(this._createStatusBadge('Подсказка: неверная дверь'));
    }

    if (this.timerRevealUntil > performance.now()) {
      container.appendChild(this._createStatusBadge('Таймер открыт'));
    }
  }

  _createStatusBadge(text) {
    const badge = document.createElement('div');
    badge.className = 'status-badge';
    badge.textContent = text;
    return badge;
  }

  _updateDoorPrompt() {
    const doorId = this.getInteractableDoorId();
    this.renderer.setActiveDoor(doorId);

    const shouldHide =
      !doorId ||
      this.state === 'loading' ||
      this.state === 'question' ||
      this.state === 'won' ||
      this.state === 'lost';

    if (shouldHide) {
      this._hideDoorPrompt();
      return;
    }

    if (this.lastDoorPromptId === doorId && !this.ui.useDoorPrompt.classList.contains('hidden')) {
      return;
    }

    this.lastDoorPromptId = doorId;
    this.ui.useDoorPrompt.classList.remove('hidden');
  }

  _hideDoorPrompt() {
    this.lastDoorPromptId = null;
    this.ui.useDoorPrompt.classList.add('hidden');
    if (this.renderer) {
      this.renderer.setActiveDoor(null);
    }
  }

  _updateTimerDisplay(now) {
    const showTimer = this.timerRevealUntil > now;
    this.ui.timerDisplay.classList.toggle('hidden', !showTimer);

    if (!showTimer) {
      return;
    }

    if (this.crusher.phase === 'waiting') {
      const seconds = Math.max(0, (this.crusher.nextDropAt - now) / 1000);
      this.ui.timerValue.textContent = `До удара: ${seconds.toFixed(1)} c`;
      return;
    }

    if (this.crusher.phase === 'dropping') {
      const remaining = Math.max(0, (this.crusher.dropMs - (now - this.crusher.phaseStartedAt)) / 1000);
      this.ui.timerValue.textContent = `Удар через: ${remaining.toFixed(1)} c`;
      return;
    }

    if (this.crusher.phase === 'down') {
      this.ui.timerValue.textContent = 'Давилка внизу';
      return;
    }

    this.ui.timerValue.textContent = 'Давилка поднимается';
  }

  _showMessage(text, durationMs = 1500) {
    this._clearMessageTimeout();
    this.ui.messageBanner.textContent = text;
    this.ui.messageBanner.classList.remove('hidden');
    this.messageTimeoutId = window.setTimeout(() => {
      this.ui.messageBanner.classList.add('hidden');
    }, durationMs);
  }

  _clearMessageTimeout() {
    if (this.messageTimeoutId) {
      window.clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
    }
  }

  _clearTransitionTimeout() {
    if (this.transitionTimeoutId) {
      window.clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
  }

  _clearTimeouts() {
    this._clearMessageTimeout();
    this._clearTransitionTimeout();
  }

  _setActiveScreen(screenId) {
    SCREEN_IDS.forEach((id) => {
      const node = document.getElementById(id);
      node.classList.toggle('active', id === screenId);
    });
  }

  destroy() {
    this._clearTimeouts();
    this._disposeRuntime();
    this.state = 'menu';
    this._hidePanels();
    this._hideDoorPrompt();
    this._hideLoading();
    this.ui.messageBanner.classList.add('hidden');
    this.ui.deathOverlay.classList.remove('active');
    this.ui.deathOverlay.classList.remove('instant');
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

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
