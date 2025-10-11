const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highscore');
const ammoDisplay = document.getElementById('ammo');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const menu = document.getElementById('menu');

let jet, bullets, enemies, particles, keys;
let score=0, highScore=0, level=1, ammo=20;
let isGameOver=false, isPaused=false;
let animationFrameId=null, spawnIntervalId=null, gameRunning=false;
let isReloading = false;
const RELOAD_TIME = 10000;
const MAX_ENEMIES = 20;
const MAX_PARTICLES = 2000;
const MAX_BULLETS = 30;
const SHOOT_COOLDOWN = 150;
let lastShotTime = 0;

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (jet){
    jet.y = Math.max(0, Math.min(jet.y, canvas.height - jet.height));
    jet.x = Math.max(0, Math.min(jet.x, canvas.width - jet.width));
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initGame(resetProgress=true){
  if (resetProgress){
    score = 0; level = 1; ammo = 20;
  }
  jet = { x: 100, y: canvas.height/2 - 20, width: 50, height: 25, color: "#ff00ff", speed: 7 };
  bullets = []; enemies = []; particles = [];
  keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
  isGameOver = false; isPaused = false; isReloading = false;
  scoreDisplay.textContent = score; ammoDisplay.textContent = ammo; levelDisplay.textContent = level;
  gameOverDisplay.style.display = 'none';
}

function spawnEnemy(){
  if (isGameOver || isPaused) return;
  if (enemies.length >= MAX_ENEMIES) return;
  const size = 30 + Math.random()*30;
  const y = Math.random() * Math.max(1, (canvas.height - size));
  const speed = 3 + Math.random()*2 + Math.floor(level/3);
  enemies.push({ x: canvas.width + 50, y, width: size, height: size, color: "#ff3300", speed });
}

function shoot(){
  if (isGameOver || isPaused || isReloading) return;
  const now = performance.now();
  if (now - lastShotTime < SHOOT_COOLDOWN) return;
  lastShotTime = now;

  if (ammo <= 0) {
    ammo = 0;
    ammoDisplay.textContent = "Reloading...";
    if (!isReloading) {
      isReloading = true;
      setTimeout(()=>{
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
    y: jet.y + jet.height/2 - 3,
    width: 20,
    height: 6,
    color:"#00ffff",
    speed: 12
  });

  ammo--;
  ammoDisplay.textContent = ammo;
}

function createExplosion(x,y){
  const count = Math.min(20, Math.max(6, Math.floor(20 - level/2)));
  for (let i=0;i<count;i++){
    particles.push({
      x, y,
      dx:(Math.random()-0.5)*6,
      dy:(Math.random()-0.5)*6,
      life: 30 + Math.floor(Math.random()*20),
      color: "#ffff00"
    });
  }
}

function update(){
  if (keys.ArrowUp && jet.y > 0) jet.y -= jet.speed;
  if (keys.ArrowDown && jet.y + jet.height < canvas.height) jet.y += jet.speed;
  if (keys.ArrowLeft && jet.x > 0) jet.x -= jet.speed;
  if (keys.ArrowRight && jet.x + jet.width < canvas.width) jet.x += jet.speed;

  for (let b of bullets) b.x += b.speed;
  bullets = bullets.filter(b => b.x < canvas.width + 50);

  for (let e of enemies) e.x -= e.speed;
  enemies = enemies.filter(e => e.x + e.width > -50);

  for (let p of particles){ p.x += p.dx; p.y += p.dy; p.life--; }
  particles = particles.filter(p => p.life > 0);

  for (let i = enemies.length - 1; i >= 0; i--){
    const e = enemies[i];
    if (jet.x < e.x + e.width && jet.x + jet.width > e.x &&
        jet.y < e.y + e.height && jet.y + jet.height > e.y){
      endGame(); return;
    }
    for (let j = bullets.length - 1; j >= 0; j--){
      const b = bullets[j];
      if (b.x < e.x + e.width && b.x + b.width > e.x &&
          b.y < e.y + e.height && b.y + b.height > e.y){
        createExplosion(e.x + e.width/2, e.y + e.height/2);
        enemies.splice(i,1); bullets.splice(j,1);
        score += 10;
        scoreDisplay.textContent = score;
        if (score > highScore){ highScore = score; highScoreDisplay.textContent = highScore; }
        const newLevel = Math.floor(score / 100) + 1;
        if (newLevel !== level){ level = newLevel; levelDisplay.textContent = level; }
        break;
      }
    }
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = jet.color;
  ctx.beginPath();
  ctx.moveTo(jet.x, jet.y + jet.height/2);
  ctx.lineTo(jet.x + jet.width, jet.y);
  ctx.lineTo(jet.x + jet.width, jet.y + jet.height);
  ctx.closePath();
  ctx.fill();
  for (let b of bullets){ ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); }
  for (let e of enemies){ ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); }
  for (let p of particles){ ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }
}

function loop(){
  if (!gameRunning) return;
  if (isPaused || isGameOver){ requestAnimationFrame(loop); return; }
  update(); draw(); requestAnimationFrame(loop);
}

function startGame(){
  if (gameRunning) stopGame();
  initGame(true);
  spawnIntervalId = setInterval(spawnEnemy, 1000);
  gameRunning = true;
  toggleControls(true);
  requestAnimationFrame(loop);
}

function stopGame(){
  gameRunning = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (spawnIntervalId){ clearInterval(spawnIntervalId); spawnIntervalId = null; }
}

function endGame(){
  isGameOver = true;
  gameOverDisplay.style.display = 'block';
  stopGame();
}

function togglePause(){
  if (isGameOver) return;
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? '▶ Resume' : '⏸ Pause';
}

function toggleControls(show){
  const display = show ? 'block' : 'none';
  document.getElementById('controls').style.display = display;
  document.getElementById('fire').style.display = display;
  document.getElementById('pauseBtn').style.display = display;
  document.getElementById('fullscreenBtn').style.display = display;
}

window.addEventListener('keydown', e=>{
  if (e.key === ' '){ e.preventDefault(); shoot(); return; }
  keys[e.key] = true;
});
window.addEventListener('keyup', e=>{ keys[e.key] = false; });

['btn-up','btn-down','btn-left','btn-right'].forEach(id=>{
  const el = document.getElementById(id);
  const map = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const dir = id.split('-')[1];
  el.addEventListener('pointerdown', ()=> keys[map[dir]] = true);
  el.addEventListener('pointerup', ()=> keys[map[dir]] = false);
  el.addEventListener('pointerleave', ()=> keys[map[dir]] = false);
  el.addEventListener('pointercancel', ()=> keys[map[dir]] = false);
});

document.getElementById('fire').addEventListener('pointerdown', shoot);
restartBtn.onclick = ()=> startGame();
document.getElementById('btnContinue').onclick = ()=>{
  menu.style.display='none'; startGame();
};
document.getElementById('btnNew').onclick = ()=>{
  menu.style.display='none'; startGame();
};
document.getElementById('btnReset').onclick = ()=> location.reload();
document.getElementById('pauseBtn').onclick = ()=> togglePause();
document.getElementById('fullscreenBtn').onclick = ()=>{
  if (!document.fullscreenElement) canvas.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
};

// initial setup
initGame(true);
toggleControls(false); // hide controls di menu

setTimeout(()=>{
  document.getElementById('introScreen').style.display = 'none';
  menu.style.display = 'block';
  toggleControls(false);
}, 3500);
