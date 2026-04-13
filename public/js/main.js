const PLAYER_NAME_KEY = 'drucker_player_name';
const TUTORIAL_SEEN_KEY = 'drucker_tutorial_seen';

const game = new Game();

document.addEventListener('DOMContentLoaded', () => {
  const ui = {
    menuScreen: document.getElementById('menu-screen'),
    leaderboardScreen: document.getElementById('leaderboard-screen'),
    gameScreen: document.getElementById('game-screen'),
    winScreen: document.getElementById('win-screen'),
    loseScreen: document.getElementById('lose-screen'),
    playerName: document.getElementById('player-name'),
    lexicalGrid: document.getElementById('lexical-grid'),
    grammarPicker: document.getElementById('grammar-picker'),
    bonusSlots: Array.from(document.querySelectorAll('.bonus-slot')),
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialClose: document.getElementById('tutorial-close'),
    startButton: document.getElementById('start-btn'),
    useDoorButton: document.getElementById('use-door-btn')
  };

  let selectedLevel = null;
  let selectedLexical = null;
  let selectedGrammar = null;
  let selectedSlotIndex = null;
  const slotAssignments = Array(BONUS_SLOTS.length).fill(null);
  let pendingTutorialCallback = null;

  const savedName = localStorage.getItem(PLAYER_NAME_KEY);
  if (savedName) {
    ui.playerName.value = savedName;
  }

  renderLexicalGrid();
  renderSlots();
  renderGrammarPicker();
  updateStartButton();
  showStep(1);

  document.getElementById('to-step2-btn').addEventListener('click', () => {
    showStep(2);
  });

  document.getElementById('back-to-step1').addEventListener('click', () => {
    showStep(1);
  });

  document.getElementById('back-to-step2').addEventListener('click', () => {
    showStep(2);
  });

  document.getElementById('back-to-step3').addEventListener('click', () => {
    showStep(3);
  });

  document.querySelectorAll('.level-btn').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.level-btn').forEach((item) => {
        item.classList.toggle('selected', item === button);
      });

      selectedLevel = button.dataset.level;
      updateStartButton();
      showStep(3);
    });
  });

  ui.playerName.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      showStep(2);
    }
  });

  ui.bonusSlots.forEach((slotElement, index) => {
    slotElement.addEventListener('click', () => {
      if (selectedGrammar) {
        assignGrammarToSlot(index, selectedGrammar);
        return;
      }

      if (selectedSlotIndex === index) {
        slotAssignments[index] = null;
        selectedSlotIndex = null;
      } else {
        selectedSlotIndex = index;
      }

      renderSlots();
      renderGrammarPicker();
      updateStartButton();
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    const settings = buildGameSettings();
    if (!settings) {
      return;
    }

    if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
      localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
      showTutorial(() => startGame(settings));
      return;
    }

    startGame(settings);
  });

  ui.tutorialClose.addEventListener('click', () => {
    ui.tutorialOverlay.classList.add('hidden');
    if (pendingTutorialCallback) {
      const callback = pendingTutorialCallback;
      pendingTutorialCallback = null;
      callback();
    }
  });

  document.querySelectorAll('.dir-btn').forEach((button) => {
    button.addEventListener('click', () => {
      game.movePlayer(button.dataset.dir);
    });
  });

  ui.useDoorButton.addEventListener('click', () => {
    game.tryUseDoor();
  });

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    game.leaderboard.render();
    setActiveScreen('leaderboard-screen');
  });

  document.getElementById('leaderboard-back').addEventListener('click', () => {
    setActiveScreen('menu-screen');
  });

  document.getElementById('win-next').addEventListener('click', () => {
    setActiveScreen('game-screen');
    game.nextLevel();
  });

  document.getElementById('win-restart').addEventListener('click', () => {
    game.destroy();
    game.restart();
    setActiveScreen('menu-screen');
    showStep(1);
  });

  document.getElementById('lose-restart').addEventListener('click', () => {
    setActiveScreen('game-screen');
    game.restartLevel();
  });

  document.getElementById('lose-menu').addEventListener('click', () => {
    game.destroy();
    game.restart();
    setActiveScreen('menu-screen');
    showStep(1);
  });

  document.addEventListener('keydown', (event) => {
    if (document.activeElement === ui.playerName) {
      return;
    }

    if (!ui.tutorialOverlay.classList.contains('hidden') && (event.key === 'Enter' || event.key === 'Escape')) {
      event.preventDefault();
      ui.tutorialClose.click();
      return;
    }

    if ((event.key === 'e' || event.key === 'E') && game.hasDoorInReach()) {
      event.preventDefault();
      game.tryUseDoor();
      return;
    }

    if (game.state === 'question') {
      const optionIndex = parseInt(event.key, 10) - 1;
      const buttons = ui.gameScreen.querySelectorAll('#question-options .option-btn');
      if (optionIndex >= 0 && optionIndex < buttons.length && !buttons[optionIndex].disabled) {
        event.preventDefault();
        buttons[optionIndex].click();
      }
      return;
    }

    if (game.state === 'direction_select') {
      const moveKeyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        W: 'up',
        s: 'down',
        S: 'down',
        a: 'left',
        A: 'left',
        d: 'right',
        D: 'right'
      };

      if (moveKeyMap[event.key]) {
        event.preventDefault();
        game.movePlayer(moveKeyMap[event.key]);
      }
      return;
    }

    if (game.state === 'topic_select') {
      const topicIndex = parseInt(event.key, 10) - 1;
      if (topicIndex >= 0 && topicIndex < game.slotConfigs.length) {
        event.preventDefault();
        game.selectTopic(game.slotConfigs[topicIndex].slotDef.id);
        return;
      }
    }

    if (ui.gameScreen.classList.contains('active')) {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' || event.key === 'q' || event.key === 'Q') {
        event.preventDefault();
        game.rotateView(-1);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        game.rotateView(1);
      }
    }
  });

  function showStep(stepNumber) {
    for (let index = 1; index <= 4; index += 1) {
      const node = document.getElementById(`setup-step${index}`);
      node.classList.toggle('hidden', index !== stepNumber);
    }
  }

  function setActiveScreen(screenId) {
    ['menu-screen', 'game-screen', 'win-screen', 'lose-screen', 'leaderboard-screen'].forEach((id) => {
      const node = document.getElementById(id);
      node.classList.toggle('active', id === screenId);
    });
  }

  function renderLexicalGrid() {
    ui.lexicalGrid.innerHTML = '';

    LEXICAL_TOPICS.forEach((topic) => {
      const button = document.createElement('button');
      button.className = 'lexical-btn';
      button.textContent = topic;
      button.classList.toggle('selected', selectedLexical === topic);
      button.addEventListener('click', () => {
        selectedLexical = topic;
        renderLexicalGrid();
        updateStartButton();
        showStep(4);
      });
      ui.lexicalGrid.appendChild(button);
    });
  }

  function renderSlots() {
    ui.bonusSlots.forEach((slotElement, index) => {
      const slot = BONUS_SLOTS[index];
      const grammar = slotAssignments[index];
      const topicNode = slotElement.querySelector('.slot-topic');
      const grammarNode = slotElement.querySelector('.slot-grammar');
      const bonusNode = slotElement.querySelector('.slot-bonus');

      bonusNode.textContent = slot.bonusLabel;
      slotElement.classList.toggle('selected-slot', selectedSlotIndex === index);
      slotElement.classList.toggle('has-topic', Boolean(grammar));
      slotElement.classList.toggle('empty', !grammar);
      slotElement.classList.toggle('filled', Boolean(grammar));

      if (slot.isWortstellung) {
        topicNode.textContent = 'Wortstellung';
        grammarNode.textContent = grammar ? `+ ${grammar}` : '+ выберите тему';
      } else {
        topicNode.textContent = grammar || 'Пусто';
        grammarNode.textContent = '';
      }
    });
  }

  function renderGrammarPicker() {
    ui.grammarPicker.innerHTML = '';
    const usedTopics = slotAssignments.filter(Boolean);

    GRAMMAR_TOPICS.forEach((topic) => {
      const button = document.createElement('button');
      button.className = 'grammar-tag';
      button.textContent = topic;

      if (usedTopics.includes(topic)) {
        button.classList.add('used');
      }

      if (selectedGrammar === topic) {
        button.classList.add('selected-grammar');
      }

      button.addEventListener('click', () => {
        if (usedTopics.includes(topic)) {
          return;
        }

        if (selectedSlotIndex !== null) {
          assignGrammarToSlot(selectedSlotIndex, topic);
          return;
        }

        selectedGrammar = selectedGrammar === topic ? null : topic;
        renderSlots();
        renderGrammarPicker();
      });

      ui.grammarPicker.appendChild(button);
    });
  }

  function assignGrammarToSlot(slotIndex, grammarTopic) {
    for (let index = 0; index < slotAssignments.length; index += 1) {
      if (slotAssignments[index] === grammarTopic) {
        slotAssignments[index] = null;
      }
    }

    slotAssignments[slotIndex] = grammarTopic;
    selectedGrammar = null;
    selectedSlotIndex = null;

    renderSlots();
    renderGrammarPicker();
    updateStartButton();
  }

  function updateStartButton() {
    ui.startButton.disabled = !selectedLevel || !selectedLexical || slotAssignments.some((item) => !item);
  }

  function buildGameSettings() {
    if (!selectedLevel || !selectedLexical || slotAssignments.some((item) => !item)) {
      return null;
    }

    const playerName = ui.playerName.value.trim() || 'Spieler';
    localStorage.setItem(PLAYER_NAME_KEY, playerName);

    return {
      playerName,
      langLevel: selectedLevel,
      lexicalTopic: selectedLexical,
      level: 1,
      slotConfigs: BONUS_SLOTS.map((slotDef, index) => ({
        slotDef,
        grammarTopic: slotAssignments[index]
      }))
    };
  }

  function startGame(settings) {
    setActiveScreen('game-screen');
    game.init(settings).catch((error) => {
      console.error('Failed to start the game:', error);
      game.destroy();
      setActiveScreen('menu-screen');
    });
  }

  function showTutorial(onClose) {
    pendingTutorialCallback = onClose;
    ui.tutorialOverlay.classList.remove('hidden');
  }
});
