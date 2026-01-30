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
let gameStartTime = 0;
let elapsedTime = 0;
let particles = [];

// Settings
let settings = {
    theme: 'dark',
    sound: true,
    showGrid: true,
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
    setupThemeButtons();
    setupToggles();
    resetScoresBtn.addEventListener('click', resetHighScore);
    setupTouchControls();
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
    const diff = DIFFICULTY_SETTINGS[difficulty];
    gameSpeed = diff.speed;
    updateScore();
    updateStats();
    spawnFood();
}

function gameLoopHandler(currentTime) {
    if (!isGameRunning || isPaused) return;
    requestAnimationFrame(gameLoopHandler);
    if (currentTime - lastRenderTime < gameSpeed) return;
    lastRenderTime = currentTime;
    update();
    draw();
}

function update() {
    direction = { ...nextDirection };
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    if (checkCollision(head)) { gameOver(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
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
    if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) return true;
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function spawnFood() {
    const gridWidth = canvas.width / GRID_SIZE;
    const gridHeight = canvas.height / GRID_SIZE;
    let newFood, isOnSnake;
    do {
        isOnSnake = false;
        newFood = { x: Math.floor(Math.random() * gridWidth), y: Math.floor(Math.random() * gridHeight) };
        for (const seg of snake) {
            if (seg.x === newFood.x && seg.y === newFood.y) { isOnSnake = true; break; }
        }
    } while (isOnSnake);
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
    drawParticles();
    drawFood(style);
    drawSnake(style);
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
