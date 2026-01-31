// Game Constants
const GRID_SIZE = 20;
const DIFFICULTY_SETTINGS = {
    easy: { speed: 180, speedIncrement: 1, minSpeed: 100 },
    normal: { speed: 140, speedIncrement: 2, minSpeed: 60 },
    hard: { speed: 100, speedIncrement: 3, minSpeed: 40 }
};

// Game State
let canvas, ctx;
let snake = [];
let food = {};
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = 0;
let gameSpeed = 140;
let isGameRunning = false;
let isPaused = false;
let lastRenderTime = 0;
let difficulty = 'normal';
let gameMode = 'classic'; // classic, nowalls, maze, speedrun
let gameStartTime = 0;
let elapsedTime = 0;
let particles = [];
let obstacles = []; // For maze mode
let speedRunTime = 60; // Seconds for speed run mode
let speedRunTimer = null;

// Settings
let settings = {
    theme: 'dark',
    sound: true,
    showGrid: false,
    particles: true
};

// Audio Context for sound effects
let audioCtx = null;

// DOM Elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');
const finalLengthElement = document.getElementById('final-length');
const finalTimeElement = document.getElementById('final-time');
const gameOverScreen = document.getElementById('game-over-screen');
const startScreen = document.getElementById('start-screen');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const speedLevelElement = document.getElementById('speed-level');
const snakeLengthElement = document.getElementById('snake-length');
const gameTimeElement = document.getElementById('game-time');
const pauseIndicator = document.getElementById('pause-indicator');
const newHighScoreElement = document.getElementById('new-high-score');
const resetScoresBtn = document.getElementById('reset-scores');
const soundToggle = document.getElementById('sound-toggle');
const gridToggle = document.getElementById('grid-toggle');
const particlesToggle = document.getElementById('particles-toggle');
const homeBtn = document.getElementById('home-btn');

// Initialize
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    loadSettings();
    highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    highScoreElement.textContent = highScore;
    document.addEventListener('keydown', handleKeyPress);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
    setupSpeedButtons();
    setupModeButtons();
    setupThemeButtons();
    setupToggles();
    resetScoresBtn.addEventListener('click', resetHighScore);
    setupTouchControls();
    createSpeedRunTimer();
    homeBtn.addEventListener('click', goHome);
}

function resizeCanvas() {
    const containerWidth = Math.min(window.innerWidth - 64, 480);
    const size = Math.floor(containerWidth / GRID_SIZE) * GRID_SIZE;
    canvas.width = size;
    canvas.height = size;
}

function loadSettings() {
    const saved = localStorage.getItem('snakeSettings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
    }
    applyTheme(settings.theme);
    soundToggle.checked = settings.sound;
    gridToggle.checked = settings.showGrid;
    particlesToggle.checked = settings.particles;
}

function saveSettings() {
    localStorage.setItem('snakeSettings', JSON.stringify(settings));
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    settings.theme = theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    saveSettings();
}

function setupThemeButtons() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });
}

function setupSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update all speed buttons across both screens
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.speed-btn[data-speed="${btn.dataset.speed}"]`).forEach(b => b.classList.add('active'));
            difficulty = btn.dataset.speed;
        });
    });
}

function setupModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.mode-btn[data-mode="${btn.dataset.mode}"]`).forEach(b => b.classList.add('active'));
            gameMode = btn.dataset.mode;
        });
    });
}

function createSpeedRunTimer() {
    const timerDiv = document.createElement('div');
    timerDiv.id = 'speedrun-timer';
    timerDiv.className = 'speedrun-timer hidden';
    timerDiv.textContent = '60';
    document.querySelector('.canvas-wrapper').appendChild(timerDiv);
}

function setupToggles() {
    soundToggle.addEventListener('change', () => {
        settings.sound = soundToggle.checked;
        saveSettings();
    });
    gridToggle.addEventListener('change', () => {
        settings.showGrid = gridToggle.checked;
        saveSettings();
    });
    particlesToggle.addEventListener('change', () => {
        settings.particles = particlesToggle.checked;
        saveSettings();
    });
}

function openSettings() {
    settingsModal.classList.remove('hidden');
    if (isGameRunning && !isPaused) togglePause();
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

function resetHighScore() {
    highScore = 0;
    localStorage.setItem('snakeHighScore', 0);
    highScoreElement.textContent = 0;
    closeSettings();
}

function setupTouchControls() {
    // Swipe controls on canvas
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
        if (!isGameRunning || isPaused) return;
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 30 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
            else if (diffX < -30 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
        } else {
            if (diffY > 30 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
            else if (diffY < -30 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
        }
    }, { passive: true });

    // D-pad button controls
    const dpadUp = document.getElementById('dpad-up');
    const dpadDown = document.getElementById('dpad-down');
    const dpadLeft = document.getElementById('dpad-left');
    const dpadRight = document.getElementById('dpad-right');
    const touchPause = document.getElementById('touch-pause');

    if (dpadUp) {
        dpadUp.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameRunning && !isPaused && direction.y !== 1) {
                nextDirection = { x: 0, y: -1 };
            }
        }, { passive: false });
    }

    if (dpadDown) {
        dpadDown.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameRunning && !isPaused && direction.y !== -1) {
                nextDirection = { x: 0, y: 1 };
            }
        }, { passive: false });
    }

    if (dpadLeft) {
        dpadLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameRunning && !isPaused && direction.x !== 1) {
                nextDirection = { x: -1, y: 0 };
            }
        }, { passive: false });
    }

    if (dpadRight) {
        dpadRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (isGameRunning && !isPaused && direction.x !== -1) {
                nextDirection = { x: 1, y: 0 };
            }
        }, { passive: false });
    }

    if (touchPause) {
        touchPause.addEventListener('click', () => {
            if (isGameRunning) togglePause();
        });
    }
}

function handleKeyPress(e) {
    if (e.code === 'Space' || e.code === 'KeyP') {
        if (isGameRunning) { togglePause(); e.preventDefault(); }
        return;
    }
    if (!isGameRunning || isPaused) return;
    const keyActions = {
        'ArrowUp': { x: 0, y: -1, block: { x: 0, y: 1 } },
        'ArrowDown': { x: 0, y: 1, block: { x: 0, y: -1 } },
        'ArrowLeft': { x: -1, y: 0, block: { x: 1, y: 0 } },
        'ArrowRight': { x: 1, y: 0, block: { x: -1, y: 0 } },
        'KeyW': { x: 0, y: -1, block: { x: 0, y: 1 } },
        'KeyS': { x: 0, y: 1, block: { x: 0, y: -1 } },
        'KeyA': { x: -1, y: 0, block: { x: 1, y: 0 } },
        'KeyD': { x: 1, y: 0, block: { x: -1, y: 0 } }
    };
    const action = keyActions[e.code];
    if (action && (direction.x !== action.block.x || direction.y !== action.block.y)) {
        nextDirection = { x: action.x, y: action.y };
        e.preventDefault();
    }
}

function togglePause() {
    isPaused = !isPaused;
    pauseIndicator.classList.toggle('hidden', !isPaused);
    if (!isPaused) {
        lastRenderTime = performance.now();
        requestAnimationFrame(gameLoopHandler);
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    resetGame();
    isGameRunning = true;
    isPaused = false;
    gameStartTime = Date.now();
    lastRenderTime = 0;
    if (gameMode === 'speedrun') startSpeedRunTimer();
    requestAnimationFrame(gameLoopHandler);
}

function restartGame() {
    gameOverScreen.classList.add('hidden');
    newHighScoreElement.classList.add('hidden');
    resetGame();
    isGameRunning = true;
    isPaused = false;
    gameStartTime = Date.now();
    lastRenderTime = 0;
    if (gameMode === 'speedrun') startSpeedRunTimer();
    requestAnimationFrame(gameLoopHandler);
}

function resetGame() {
    const centerX = Math.floor(canvas.width / GRID_SIZE / 2);
    const centerY = Math.floor(canvas.height / GRID_SIZE / 2);
    snake = [{ x: centerX, y: centerY }, { x: centerX - 1, y: centerY }, { x: centerX - 2, y: centerY }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    particles = [];
    obstacles = [];
    const diff = DIFFICULTY_SETTINGS[difficulty];
    gameSpeed = diff.speed;
    updateScore();
    updateStats();

    // Generate maze obstacles if in maze mode
    if (gameMode === 'maze') {
        generateMaze();
    }

    // Setup speed run timer
    const timerEl = document.getElementById('speedrun-timer');
    if (gameMode === 'speedrun') {
        speedRunTime = 60;
        timerEl.textContent = speedRunTime;
        timerEl.classList.remove('hidden', 'warning');
    } else {
        timerEl.classList.add('hidden');
        if (speedRunTimer) {
            clearInterval(speedRunTimer);
            speedRunTimer = null;
        }
    }

    spawnFood();
}

function generateMaze() {
    const gridWidth = Math.floor(canvas.width / GRID_SIZE);
    const gridHeight = Math.floor(canvas.height / GRID_SIZE);
    obstacles = [];

    const centerX = Math.floor(gridWidth / 2);
    const centerY = Math.floor(gridHeight / 2);

    // Create obstacles away from center where snake starts
    // Snake starts at center and moves right, so we need clear space there
    const patterns = [
        // Corner blocks (far from center)
        { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 },
        { x: gridWidth - 3, y: 2 }, { x: gridWidth - 4, y: 2 }, { x: gridWidth - 3, y: 3 },
        { x: 2, y: gridHeight - 3 }, { x: 3, y: gridHeight - 3 }, { x: 2, y: gridHeight - 4 },
        { x: gridWidth - 3, y: gridHeight - 3 }, { x: gridWidth - 4, y: gridHeight - 3 }, { x: gridWidth - 3, y: gridHeight - 4 },

        // Top edge obstacles
        { x: Math.floor(gridWidth / 3), y: 3 },
        { x: Math.floor(gridWidth / 3) + 1, y: 3 },
        { x: Math.floor(2 * gridWidth / 3), y: 3 },
        { x: Math.floor(2 * gridWidth / 3) - 1, y: 3 },

        // Bottom edge obstacles
        { x: Math.floor(gridWidth / 3), y: gridHeight - 4 },
        { x: Math.floor(gridWidth / 3) + 1, y: gridHeight - 4 },
        { x: Math.floor(2 * gridWidth / 3), y: gridHeight - 4 },
        { x: Math.floor(2 * gridWidth / 3) - 1, y: gridHeight - 4 },

        // Left side obstacles (away from center)
        { x: 3, y: Math.floor(gridHeight / 3) },
        { x: 3, y: Math.floor(gridHeight / 3) + 1 },
        { x: 3, y: Math.floor(2 * gridHeight / 3) },
        { x: 3, y: Math.floor(2 * gridHeight / 3) - 1 },

        // Right side obstacles (away from center)
        { x: gridWidth - 4, y: Math.floor(gridHeight / 3) },
        { x: gridWidth - 4, y: Math.floor(gridHeight / 3) + 1 },
        { x: gridWidth - 4, y: Math.floor(2 * gridHeight / 3) },
        { x: gridWidth - 4, y: Math.floor(2 * gridHeight / 3) - 1 },
    ];

    // Filter out any obstacles that might be too close to the snake starting position
    // Snake starts at centerX, centerY and extends left 2 cells, moving right
    patterns.forEach(obs => {
        // Create a safe zone around the center (5 cells in each direction)
        const isTooClose = Math.abs(obs.x - centerX) <= 5 && Math.abs(obs.y - centerY) <= 2;
        if (!isTooClose && obs.x >= 0 && obs.x < gridWidth && obs.y >= 0 && obs.y < gridHeight) {
            obstacles.push(obs);
        }
    });
}

function goHome() {
    // Stop the game and return to start screen
    isGameRunning = false;
    isPaused = false;

    // Clear speed run timer if active
    if (speedRunTimer) {
        clearInterval(speedRunTimer);
        speedRunTimer = null;
    }
    document.getElementById('speedrun-timer').classList.add('hidden');

    // Hide game over screen if visible
    gameOverScreen.classList.add('hidden');
    newHighScoreElement.classList.add('hidden');
    pauseIndicator.classList.add('hidden');

    // Show start screen
    startScreen.classList.remove('hidden');

    // Reset display
    score = 0;
    updateScore();
}

function gameLoopHandler(currentTime) {
    if (!isGameRunning || isPaused) return;
    requestAnimationFrame(gameLoopHandler);
    if (currentTime - lastRenderTime < gameSpeed) return;
    lastRenderTime = currentTime;
    update();
    draw();
}

function startSpeedRunTimer() {
    if (speedRunTimer) clearInterval(speedRunTimer);
    speedRunTimer = setInterval(() => {
        if (!isGameRunning || isPaused) return;
        speedRunTime--;
        const timerEl = document.getElementById('speedrun-timer');
        timerEl.textContent = speedRunTime;

        if (speedRunTime <= 10) {
            timerEl.classList.add('warning');
        }

        if (speedRunTime <= 0) {
            clearInterval(speedRunTimer);
            speedRunTimer = null;
            gameOver();
        }
    }, 1000);
}

function update() {
    direction = { ...nextDirection };
    let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Handle wrap-around for "No Walls" mode
    if (gameMode === 'nowalls') {
        const gridWidth = canvas.width / GRID_SIZE;
        const gridHeight = canvas.height / GRID_SIZE;
        if (head.x < 0) head.x = gridWidth - 1;
        if (head.x >= gridWidth) head.x = 0;
        if (head.y < 0) head.y = gridHeight - 1;
        if (head.y >= gridHeight) head.y = 0;
    }

    if (checkCollision(head)) { gameOver(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        // Bonus points for maze mode
        if (gameMode === 'maze') score += 5;
        // Add time in speed run mode
        if (gameMode === 'speedrun') {
            speedRunTime += 5;
            const timerEl = document.getElementById('speedrun-timer');
            timerEl.textContent = speedRunTime;
            if (speedRunTime > 10) timerEl.classList.remove('warning');
        }
        updateScore();
        if (settings.particles) createParticles(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2);
        playSound('eat');
        spawnFood();
        increaseSpeed();
    } else {
        snake.pop();
    }
    updateStats();
    updateParticles();
}

function checkCollision(head) {
    const gridWidth = canvas.width / GRID_SIZE;
    const gridHeight = canvas.height / GRID_SIZE;

    // Wall collision (only in classic and maze mode)
    if (gameMode === 'classic' || gameMode === 'maze' || gameMode === 'speedrun') {
        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) return true;
    }

    // Self collision (all modes)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }

    // Obstacle collision (maze mode)
    if (gameMode === 'maze') {
        for (const obs of obstacles) {
            if (head.x === obs.x && head.y === obs.y) return true;
        }
    }

    return false;
}

function spawnFood() {
    const gridWidth = canvas.width / GRID_SIZE;
    const gridHeight = canvas.height / GRID_SIZE;
    let newFood, isOnSnake, isOnObstacle;
    do {
        isOnSnake = false;
        isOnObstacle = false;
        newFood = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
        for (const seg of snake) {
            if (seg.x === newFood.x && seg.y === newFood.y) { isOnSnake = true; break; }
        }
        if (gameMode === 'maze') {
            for (const obs of obstacles) {
                if (obs.x === newFood.x && obs.y === newFood.y) { isOnObstacle = true; break; }
            }
        }
    } while (isOnSnake || isOnObstacle);
    food = newFood;
}

function increaseSpeed() {
    const diff = DIFFICULTY_SETTINGS[difficulty];
    if (gameSpeed > diff.minSpeed) gameSpeed -= diff.speedIncrement;
}

function updateScore() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
}

function updateStats() {
    const speedLevel = Math.floor((DIFFICULTY_SETTINGS[difficulty].speed - gameSpeed) / DIFFICULTY_SETTINGS[difficulty].speedIncrement) + 1;
    speedLevelElement.textContent = speedLevel;
    snakeLengthElement.textContent = snake.length;
    if (isGameRunning && !isPaused) {
        elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
        const mins = Math.floor(elapsedTime / 60);
        const secs = elapsedTime % 60;
        gameTimeElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color: getComputedStyle(document.documentElement).getPropertyValue('--food-color').trim()
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        return p.life > 0;
    });
}

function draw() {
    const style = getComputedStyle(document.documentElement);
    ctx.fillStyle = style.getPropertyValue('--canvas-bg').trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (settings.showGrid) drawGrid(style);
    if (gameMode === 'maze') drawObstacles(style);
    drawParticles();
    drawFood(style);
    drawSnake(style);
}

function drawObstacles(style) {
    const obstacleColor = style.getPropertyValue('--text-secondary').trim();
    obstacles.forEach(obs => {
        const x = obs.x * GRID_SIZE;
        const y = obs.y * GRID_SIZE;
        const padding = 1;
        const size = GRID_SIZE - padding * 2;

        // Draw obstacle with gradient
        const grad = ctx.createLinearGradient(x, y, x + size, y + size);
        grad.addColorStop(0, obstacleColor);
        grad.addColorStop(1, 'rgba(100, 100, 100, 0.8)');

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        roundRect(ctx, x + padding, y + padding, size, size, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add brick pattern
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + padding, y + GRID_SIZE / 2);
        ctx.lineTo(x + size, y + GRID_SIZE / 2);
        ctx.stroke();
    });
}

function drawGrid(style) {
    ctx.strokeStyle = style.getPropertyValue('--grid-color').trim();
    ctx.lineWidth = 1;
    const gw = canvas.width / GRID_SIZE, gh = canvas.height / GRID_SIZE;
    for (let x = 0; x <= gw; x++) { ctx.beginPath(); ctx.moveTo(x * GRID_SIZE, 0); ctx.lineTo(x * GRID_SIZE, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= gh; y++) { ctx.beginPath(); ctx.moveTo(0, y * GRID_SIZE); ctx.lineTo(canvas.width, y * GRID_SIZE); ctx.stroke(); }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawFood(style) {
    const x = food.x * GRID_SIZE + GRID_SIZE / 2;
    const y = food.y * GRID_SIZE + GRID_SIZE / 2;
    const r = GRID_SIZE / 2 - 2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    const glowColor = style.getPropertyValue('--food-glow').trim();
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.getPropertyValue('--food-color').trim();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x - r / 3, y - r / 3, r / 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnake(style) {
    const headColor = style.getPropertyValue('--snake-head').trim();
    const tailColor = style.getPropertyValue('--snake-tail').trim();
    snake.forEach((seg, i) => {
        const x = seg.x * GRID_SIZE, y = seg.y * GRID_SIZE;
        const padding = 1, size = GRID_SIZE - padding * 2;
        const progress = i / snake.length;
        const color = lerpColor(headColor, tailColor, progress);
        ctx.fillStyle = color;
        if (i === 0) { ctx.shadowColor = headColor; ctx.shadowBlur = 10; }
        else ctx.shadowBlur = 0;
        roundRect(ctx, x + padding, y + padding, size, size, 4);
        ctx.fill();
        if (i === 0) { ctx.shadowBlur = 0; drawEyes(x, y, size); }
    });
    ctx.shadowBlur = 0;
}

function lerpColor(c1, c2, t) {
    const hex = c => parseInt(c.slice(1), 16);
    const h1 = hex(c1), h2 = hex(c2);
    const r = Math.round(((h1 >> 16) & 255) + t * (((h2 >> 16) & 255) - ((h1 >> 16) & 255)));
    const g = Math.round(((h1 >> 8) & 255) + t * (((h2 >> 8) & 255) - ((h1 >> 8) & 255)));
    const b = Math.round((h1 & 255) + t * ((h2 & 255) - (h1 & 255)));
    return `rgb(${r},${g},${b})`;
}

function drawEyes(x, y, size) {
    const er = 2.5, p = 1;
    let lx, ly, rx, ry;
    if (direction.x === 1) { lx = x + size - 4; ly = y + p + 6; rx = x + size - 4; ry = y + size - 5; }
    else if (direction.x === -1) { lx = x + p + 5; ly = y + p + 6; rx = x + p + 5; ry = y + size - 5; }
    else if (direction.y === -1) { lx = x + p + 6; ly = y + p + 5; rx = x + size - 5; ry = y + p + 5; }
    else { lx = x + p + 6; ly = y + size - 4; rx = x + size - 5; ry = y + size - 4; }
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
    ctx.beginPath(); ctx.arc(lx, ly, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx, ry, er, 0, Math.PI * 2); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function playSound(type) {
    if (!settings.sound) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    if (type === 'eat') { osc.frequency.value = 600; gain.gain.value = 0.1; osc.type = 'sine'; }
    else if (type === 'die') { osc.frequency.value = 200; gain.gain.value = 0.15; osc.type = 'sawtooth'; }
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.stop(audioCtx.currentTime + 0.15);
}

function gameOver() {
    isGameRunning = false;
    playSound('die');

    // Clear speed run timer
    if (speedRunTimer) {
        clearInterval(speedRunTimer);
        speedRunTimer = null;
    }
    document.getElementById('speedrun-timer').classList.add('hidden');

    finalScoreElement.textContent = score;
    finalLengthElement.textContent = snake.length;
    finalTimeElement.textContent = gameTimeElement.textContent;
    if (score === highScore && score > 0) newHighScoreElement.classList.remove('hidden');
    else newHighScoreElement.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    canvas.style.animation = 'none';
    canvas.offsetHeight;
    canvas.style.animation = 'shake 0.3s ease';
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }`;
document.head.appendChild(shakeStyle);

window.addEventListener('DOMContentLoaded', init);
