// === GAME JET CYBER MOBILE — FIXED & HEALTH BAR ===

// Ambil elemen-elemen penting
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highscore');
const ammoDisplay = document.getElementById('ammo');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const menu = document.getElementById('menu');
// === Deteksi apakah perangkat touch (HP) atau PC ===
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;


// Variabel utama game
let jet, bullets, enemies, particles, keys;
let score = 0, highScore = 0, level = 1, ammo = 20;
let isGameOver = false, isPaused = false;
let animationFrameId = null, spawnIntervalId = null, gameRunning = false;
let isReloading = false;
let health = 100; // persen nyawa

const RELOAD_TIME = 10000;
const MAX_ENEMIES = 20;
const MAX_PARTICLES = 2000;
const MAX_BULLETS = 30;
const SHOOT_COOLDOWN = 150;
let lastShotTime = 0;

// === Ukuran Canvas ===
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (jet) {
    jet.y = Math.max(0, Math.min(jet.y, canvas.height - jet.height));
    jet.x = Math.max(0, Math.min(jet.x, canvas.width - jet.width));
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// === Inisialisasi Game (state dasar, tanpa memulai loop) ===
function initGame(resetProgress = true) {
  if (resetProgress) {
    score = 0;
    level = 1;
    ammo = 20;
    highScore = highScore || 0;
  }
  jet = { x: 100, y: canvas.height / 2 - 20, width: 50, height: 25, color: "#ff00ff", speed: 7 };
  bullets = []; enemies = []; particles = [];
  keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
  isGameOver = false; isPaused = false; isReloading = false;
  scoreDisplay.textContent = score;
  ammoDisplay.textContent = ammo;
  levelDisplay.textContent = level;
  gameOverDisplay.style.display = 'none';
  updateHealthBar();
}

// === Spawn Musuh ===
function spawnEnemy() {
  if (isGameOver || isPaused) return;
  if (enemies.length >= MAX_ENEMIES) return;
  const size = 30 + Math.random() * 30;
  const y = Math.random() * Math.max(1, (canvas.height - size));
  const speed = 3 + Math.random() * 2 + Math.floor(level / 3);
  enemies.push({ x: canvas.width + 50, y, width: size, height: size, color: "#ff3300", speed });
}

// === Tembakan ===
function shoot() {
  if (isGameOver || isPaused || isReloading) return;

  // 🔊 Mainkan suara laser saat user menekan tombol tembak
  const laserSound = document.getElementById('laserSound');
  if (laserSound) {
    laserSound.currentTime = 0;
    laserSound.volume = 0.5; // atur volume (0.0–1.0)
    laserSound.play().catch(() => {}); // ignore error autoplay
  }

  const now = performance.now();
  if (now - lastShotTime < SHOOT_COOLDOWN) return;
  lastShotTime = now;

  if (ammo <= 0) {
    ammo = 0;
    ammoDisplay.textContent = "Reloading...";
    if (!isReloading) {
      isReloading = true;
      setTimeout(() => {
        ammo = 20;
        ammoDisplay.textContent = ammo;
        isReloading = false;
      }, RELOAD_TIME);
    }
    return;
  }

  if (bullets.length >= MAX_BULLETS) return;

  bullets.push({
    x: jet.x + jet.width,
    y: jet.y + jet.height / 2 - 3,
    width: 20,
    height: 6,
    color: "#00ffff",
    speed: 12
  });

  ammo--;
  ammoDisplay.textContent = ammo;
}

// === Efek Ledakan ===
function createExplosion(x, y) {
  const count = Math.min(20, Math.max(6, Math.floor(20 - level / 2)));
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      life: 30 + Math.floor(Math.random() * 20),
      color: "#ffff00"
    });
  }
}

// === Update Health Bar (visual) ===
function updateHealthBar() {
  const bar = document.getElementById('healthBar');
  if (!bar) return;
  bar.style.width = `${health}%`;

  // 💙 Warna nyawa berubah dari biru muda → neon → biru gelap lembut
  if (health > 60) {
    // Full health = biru muda cerah
    bar.style.background = 'linear-gradient(90deg, #00ffff, #00aaff)';
  } else if (health > 30) {
    // Menurun = biru neon ke biru agak tua
    bar.style.background = 'linear-gradient(90deg, #0088ff, #0044aa)';
  } else {
    // Kritis = biru gelap tapi masih kelihatan jelas
    bar.style.background = 'linear-gradient(90deg, #0022aa, #001155)';
  }
}

// Helper: cek tabrakan AABB
function isColliding(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// === Update Game (movement, bullets, collisions) ===
function update() {
  if (keys.ArrowUp && jet.y > 0) jet.y -= jet.speed;
  if (keys.ArrowDown && jet.y + jet.height < canvas.height) jet.y += jet.speed;
  if (keys.ArrowLeft && jet.x > 0) jet.x -= jet.speed;
  if (keys.ArrowRight && jet.x + jet.width < canvas.width) jet.x += jet.speed;

  for (let b of bullets) b.x += b.speed;
  bullets = bullets.filter(b => b.x < canvas.width + 50);

  for (let e of enemies) e.x -= e.speed;
  enemies = enemies.filter(e => e.x + e.width > -50);

  for (let p of particles) { p.x += p.dx; p.y += p.dy; p.life--; }
  particles = particles.filter(p => p.life > 0);

  // Collision: enemy hit jet -> kurangi nyawa 10% dan hapus enemy
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    // Jika musuh nabrak jet
    if (isColliding(jet, e)) {
      // Kurangi health 10%
      health -= 10;
      if (health < 0) health = 0;
      updateHealthBar();

      // hilangkan enemy agar gak nabrak terus
      enemies.splice(i, 1);

      // cek nyawa habis
      if (health === 0) {
        endGame();
        return;
      }
      // lanjutkan ke next enemy
      continue;
    }

    // cek peluru kena enemy
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (isColliding(b, e)) {
        createExplosion(e.x + e.width / 2, e.y + e.height / 2);
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 10;
        scoreDisplay.textContent = score;
        if (score > highScore) { highScore = score; highScoreDisplay.textContent = highScore; }
        const newLevel = Math.floor(score / 100) + 1;
        if (newLevel !== level) { level = newLevel; levelDisplay.textContent = level; }
        break;
      }
    }
  }
}

// === Gambar Semua Objek ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = jet.color;
  ctx.beginPath();
  ctx.moveTo(jet.x, jet.y + jet.height / 2);
  ctx.lineTo(jet.x + jet.width, jet.y);
  ctx.lineTo(jet.x + jet.width, jet.y + jet.height);
  ctx.closePath();
  ctx.fill();

  for (let b of bullets) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); }
  for (let e of enemies) { ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); }
  for (let p of particles) { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }
}

// === Loop Game ===
function loop() {
  if (!gameRunning) return;
  if (isPaused || isGameOver) { animationFrameId = requestAnimationFrame(loop); return; }
  update();
  draw();
  animationFrameId = requestAnimationFrame(loop);
}

// === Kontrol Game: start / stop / end ===
function startGame() {
  // reset state permainan
  initGame(true);
  health = 100;
  updateHealthBar();

  // mulai spawn & loop
  if (spawnIntervalId) clearInterval(spawnIntervalId);
  spawnIntervalId = setInterval(spawnEnemy, 1000);
  gameRunning = true;
  toggleControls(true);
  isPaused = false;
  isGameOver = false;
  // mulai loop
  if (!animationFrameId) loop();
}

function stopGame() {
  gameRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (spawnIntervalId) {
    clearInterval(spawnIntervalId);
    spawnIntervalId = null;
  }
}

function endGame() {
  isGameOver = true;
  stopGame();

  // Aktifkan efek blur dan sembunyikan elemen gameplay
  document.body.classList.add('blur-active');
  document.getElementById('controls').style.display = 'none';
  document.getElementById('fire').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('fullscreenBtn').style.display = 'none';
  document.getElementById('hud').style.display = 'none';

  // Tampilkan layar Game Over
  gameOverDisplay.style.display = 'block';
}

// === Menu Utama ===
function showMainMenu() {
  stopGame();
  isGameOver = false;
  isPaused = false;
  gameRunning = false;

  document.body.classList.remove('blur-active');
  document.getElementById('controls').style.display = 'none';
  document.getElementById('fire').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('fullscreenBtn').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('menu').style.display = 'block';
}

// === Toggle Kontrol (UI show/hide) ===
function toggleControls(show) {
  const display = show ? 'block' : 'none';

  // Tombol pause & fullscreen tetap ditampilkan di semua perangkat
  document.getElementById('pauseBtn').style.display = display;
  document.getElementById('fullscreenBtn').style.display = display;

  // Tombol navigasi & tembak hanya muncul di mobile
  if (isMobile) {
    document.getElementById('controls').style.display = display;
    document.getElementById('fire').style.display = display;
  } else {
    document.getElementById('controls').style.display = 'none';
    document.getElementById('fire').style.display = 'none';
  }
}

// === Pause toggle & icon handling (non-emoji) ===
function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  const icon = document.querySelector('#pauseBtn .icon');
  // kalau tidak ada icon span, fallback ubah teks
  if (icon) {
    if (isPaused) {
      icon.classList.remove('pause-icon'); icon.classList.add('play-icon');
    } else {
      icon.classList.remove('play-icon'); icon.classList.add('pause-icon');
    }
  } else {
    document.getElementById('pauseBtn').textContent = isPaused ? '▶' : '||';
  }
}

// === Tombol Keyboard ===
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();

  // Tembak
  if (key === ' ') { e.preventDefault(); shoot(); return; }

  // WASD dan panah
  if (['w', 'arrowup'].includes(key)) keys.ArrowUp = true;
  if (['s', 'arrowdown'].includes(key)) keys.ArrowDown = true;
  if (['a', 'arrowleft'].includes(key)) keys.ArrowLeft = true;
  if (['d', 'arrowright'].includes(key)) keys.ArrowRight = true;
});

window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  if (['w', 'arrowup'].includes(key)) keys.ArrowUp = false;
  if (['s', 'arrowdown'].includes(key)) keys.ArrowDown = false;
  if (['a', 'arrowleft'].includes(key)) keys.ArrowLeft = false;
  if (['d', 'arrowright'].includes(key)) keys.ArrowRight = false;
});

// === Auto Pause Saat Keluar dari Halaman ===
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !isGameOver) {
    // Kalau game lagi jalan dan tab di minimize/keluar
    if (!isPaused) {
      togglePause();
    }
  }
});
// === Tombol Arah (Mobile) ===
['btn-up', 'btn-down', 'btn-left', 'btn-right'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const map = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const dir = id.split('-')[1];
  el.addEventListener('pointerdown', () => keys[map[dir]] = true);
  el.addEventListener('pointerup', () => keys[map[dir]] = false);
  el.addEventListener('pointerleave', () => keys[map[dir]] = false);
  el.addEventListener('pointercancel', () => keys[map[dir]] = false);
});

// === Tombol Game ===
const fireBtn = document.getElementById('fire');
if (fireBtn) fireBtn.addEventListener('pointerdown', shoot);

const pauseBtnEl = document.getElementById('pauseBtn');
if (pauseBtnEl) pauseBtnEl.addEventListener('click', togglePause);

const fullscreenBtnEl = document.getElementById('fullscreenBtn');
if (fullscreenBtnEl) fullscreenBtnEl.addEventListener('click', () => {
  if (!document.fullscreenElement) canvas.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
});

// === Tombol Menu ===
const btnContinue = document.getElementById('btnContinue');
if (btnContinue) btnContinue.onclick = () => {
  document.getElementById('menu').style.display = 'none';
  startGame();
};

const btnNew = document.getElementById('btnNew');
if (btnNew) btnNew.onclick = () => {
  document.getElementById('menu').style.display = 'none';
  startGame();
};

const btnReset = document.getElementById('btnReset');
if (btnReset) btnReset.onclick = () => location.reload();

// === Tombol "Main Lagi" (Game Over) ===
if (restartBtn) restartBtn.onclick = () => {
  // Hilangkan efek blur & restore UI, lalu mulai ulang
  document.body.classList.remove('blur-active');
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('controls').style.display = 'block';
  document.getElementById('fire').style.display = 'block';
  document.getElementById('pauseBtn').style.display = 'block';
  document.getElementById('fullscreenBtn').style.display = 'block';

  // Reset health & stat lalu start
  health = 100;
  updateHealthBar();
  setTimeout(() => { startGame(); }, 150);
};

// === Tombol "Kembali ke Menu" ===
document.addEventListener("DOMContentLoaded", () => {
  const tombolKembali = document.getElementById("kembaliBtn");
  if (tombolKembali) tombolKembali.onclick = () => showMainMenu();
});

// === Intro & Start (jalan sekali) ===
initGame(true);
toggleControls(false);
setTimeout(() => {
  const intro = document.getElementById('introScreen');
  if (intro) intro.style.display = 'none';
  showMainMenu();
}, 3500);