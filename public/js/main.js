const PLAYER_NAME_KEY = 'schacht_player_name';
const TUTORIAL_SEEN_KEY = 'schacht_tutorial_seen';

const game = new Game();

document.addEventListener('DOMContentLoaded', () => {
  const ui = {
    playerName: document.getElementById('player-name'),
    lexicalGrid: document.getElementById('lexical-grid'),
    grammarPicker: document.getElementById('grammar-picker'),
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialClose: document.getElementById('tutorial-close'),
    startButton: document.getElementById('start-btn'),
    gameScreen: document.getElementById('game-screen')
  };

  let selectedLevel = null;
  let selectedLexical = null;
  const selectedGrammar = new Set();
  let pendingTutorialCallback = null;

  try {
    const savedName = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedName) ui.playerName.value = savedName;
  } catch (_) {}

  renderLexicalGrid();
  renderGrammarPicker();
  updateStartButton();
  showStep(1);

  document.getElementById('to-step2-btn').addEventListener('click', () => showStep(2));
  document.getElementById('back-to-step1').addEventListener('click', () => showStep(1));
  document.getElementById('back-to-step2').addEventListener('click', () => showStep(2));
  document.getElementById('back-to-step3').addEventListener('click', () => showStep(3));

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

  document.getElementById('start-btn').addEventListener('click', () => {
    const settings = buildGameSettings();
    if (!settings) return;

    let tutorialSeen = false;
    try { tutorialSeen = Boolean(localStorage.getItem(TUTORIAL_SEEN_KEY)); } catch (_) {}

    if (!tutorialSeen) {
      try { localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch (_) {}
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

  // In-game controls
  document.getElementById('dig-btn').addEventListener('click', () => game.digDeeper());
  document.getElementById('bank-btn').addEventListener('click', () => game.bank());

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    game.leaderboard.render();
    setActiveScreen('leaderboard-screen');
  });
  document.getElementById('leaderboard-back').addEventListener('click', () => {
    setActiveScreen('menu-screen');
  });

  document.getElementById('win-next').addEventListener('click', () => game.startNewRun());
  document.getElementById('win-restart').addEventListener('click', () => {
    game.destroy();
    game.restart();
    setActiveScreen('menu-screen');
    showStep(1);
  });
  document.getElementById('lose-restart').addEventListener('click', () => game.startNewRun());
  document.getElementById('lose-menu').addEventListener('click', () => {
    game.destroy();
    game.restart();
    setActiveScreen('menu-screen');
    showStep(1);
  });

  document.addEventListener('keydown', (event) => {
    if (document.activeElement === ui.playerName) return;

    if (!ui.tutorialOverlay.classList.contains('hidden') && (event.key === 'Enter' || event.key === 'Escape')) {
      event.preventDefault();
      ui.tutorialClose.click();
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

    if (game.state === 'decision') {
      if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowDown') {
        event.preventDefault();
        game.digDeeper();
        return;
      }
      if (event.key === 'b' || event.key === 'B' || event.key === 'ArrowUp') {
        event.preventDefault();
        game.bank();
        return;
      }
    }

    if (ui.gameScreen.classList.contains('active')) {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        game.rotateView(-1);
      } else if (event.key === 'ArrowRight') {
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
      document.getElementById(id).classList.toggle('active', id === screenId);
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

  function renderGrammarPicker() {
    ui.grammarPicker.innerHTML = '';
    GRAMMAR_TOPICS.forEach((topic) => {
      const button = document.createElement('button');
      button.className = 'grammar-tag';
      button.textContent = topic;
      button.classList.toggle('selected-grammar', selectedGrammar.has(topic));
      button.addEventListener('click', () => {
        if (selectedGrammar.has(topic)) {
          selectedGrammar.delete(topic);
        } else {
          selectedGrammar.add(topic);
        }
        renderGrammarPicker();
        updateStartButton();
      });
      ui.grammarPicker.appendChild(button);
    });
  }

  function updateStartButton() {
    ui.startButton.disabled = !selectedLevel || !selectedLexical || selectedGrammar.size === 0;
  }

  function buildGameSettings() {
    if (!selectedLevel || !selectedLexical || selectedGrammar.size === 0) {
      return null;
    }
    const playerName = ui.playerName.value.trim() || 'Шахтёр';
    try { localStorage.setItem(PLAYER_NAME_KEY, playerName); } catch (_) {}

    return {
      playerName,
      langLevel: selectedLevel,
      lexicalTopic: selectedLexical,
      grammarTopics: Array.from(selectedGrammar)
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
