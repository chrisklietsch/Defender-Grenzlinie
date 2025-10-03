const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const quitButton = document.getElementById('quitButton');

const sounds = {
  hit: new Audio('assets/sounds/hit.wav'),
  powerup: new Audio('assets/sounds/powerup.wav'),
  start: new Audio('assets/sounds/start.wav'),
  shoot: new Audio('assets/sounds/shoot.wav'),
  musik: new Audio('assets/sounds/musik.mp3'),
  gameover: new Audio('assets/sounds/gameover.wav')
};

const images = {};
const imageSources = {
  player: 'assets/images/player.png',
  drone: 'assets/images/drone.png',
  bomber: 'assets/images/bomber.png',
  bullet: 'assets/images/bullet.png',
  shield: 'assets/images/schild_glow.png',
  explosion: 'assets/images/explosion.png',
  bomb: 'assets/images/bomb_effect.png',
  background: 'assets/images/background.png'
};

let keys = {};
let player, enemies = [], bullets = [], enemyBullets = [], boss = null;
let score = 0, lives = 3, shieldActive = false, shieldHits = 0, bombs = 1;
let gameRunning = false;
let bombEffectTimer = 0;
let paused = false;

// Bildinitialisierung mit Fallback-Erkennung
for (let key in imageSources) {
  images[key] = new Image();
  images[key].src = imageSources[key];
  images[key].onerror = () => console.warn(`Bild ${key} konnte nicht geladen werden.`);
}

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'p') togglePause();
});
document.addEventListener('keyup', e => keys[e.key] = false);

startButton.addEventListener('click', () => {
  startButton.style.display = 'none';
  pauseButton.style.display = 'none';
  quitButton.style.display = 'none';
  sounds.start.play();
  sounds.musik.currentTime = 0;
  sounds.musik.play();
  player = createPlayer();
  enemies = []; bullets = []; enemyBullets = []; boss = null;
  score = 0; lives = 3; shieldActive = false; shieldHits = 0; bombs = 1;
  gameRunning = true; paused = false;
  requestAnimationFrame(gameLoop);
});

pauseButton.addEventListener('click', togglePause);
quitButton.addEventListener('click', beendeSpiel);

function togglePause() {
  paused = !paused;
  if (paused) {
    sounds.musik.pause();
    pauseButton.textContent = 'Fortsetzen';
  } else {
    sounds.musik.play();
    pauseButton.textContent = 'Pause';
    requestAnimationFrame(gameLoop);
  }
}

function createPlayer() {
  return { x: 100, y: canvas.height / 2 - 40, width: 80, height: 80, speed: 5 };
}
function createDrone() {
  return { x: canvas.width, y: Math.random() * (canvas.height - 60), width: 60, height: 60, speed: 3 };
}
function createBoss() {
  return { x: canvas.width, y: Math.random() * (canvas.height - 100), width: 100, height: 100, speed: 2, fireRate: 60, fireTimer: 0 };
}
function createBullet(x, y, direction, isEnemy = false) {
  return { x, y, width: 20, height: 10, speed: isEnemy ? -6 : 6, isEnemy };
}

function gameLoop() {
  if (!gameRunning || paused) return;

  if (images.background.complete && images.background.naturalWidth !== 0) {
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
  if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
  if (keys[' '] && bullets.length < 10) {
    bullets.push(createBullet(player.x + player.width, player.y + player.height / 2 - 5));
    sounds.shoot.play();
  }
  if (keys['b'] && bombs > 0) {
    enemies = [];
    bombEffectTimer = 30;
    bombs--;
  }

  if (Math.random() < 0.02) enemies.push(createDrone());
  if (!boss && score >= 100) boss = createBoss();

  enemies.forEach(e => e.x -= e.speed);
  enemies = enemies.filter(e => e.x + e.width > 0);

  if (boss) {
    boss.x -= boss.speed;
    boss.fireTimer++;
    if (boss.fireTimer >= boss.fireRate) {
      enemyBullets.push(createBullet(boss.x, boss.y + boss.height / 2 - 5, -1, true));
      boss.fireTimer = 0;
    }
  }

  bullets.forEach(b => b.x += b.speed);
  enemyBullets.forEach(b => b.x += b.speed);
  bullets = bullets.filter(b => b.x < canvas.width);
  enemyBullets = enemyBullets.filter(b => b.x > 0);

  bullets.forEach(b => {
    enemies.forEach((e, ei) => {
      if (checkCollision(b, e)) {
        enemies.splice(ei, 1);
        score += 10;
        sounds.hit.play();
      }
    });
    if (boss && checkCollision(b, boss)) {
      boss = null;
      score += 50;
      sounds.hit.play();
    }
  });

  enemyBullets.forEach((b, bi) => {
    if (checkCollision(b, player)) {
      enemyBullets.splice(bi, 1);
      if (shieldActive) {
        shieldHits++;
        if (shieldHits >= 5) {
          shieldActive = false;
          shieldHits = 0;
        }
      } else {
        lives--;
        sounds.hit.play();
        if (lives <= 0) {
          beendeSpiel();
          return;
        }
      }
    }
  });

  drawPlayer();
  enemies.forEach(drawEnemy);
  if (boss) drawBoss();
  bullets.forEach(drawBullet);
  enemyBullets.forEach(drawBullet);
  if (shieldActive) drawShield();
  if (bombEffectTimer > 0) {
    drawBombEffect();
    bombEffectTimer--;
  }

  drawHUD();
  requestAnimationFrame(gameLoop);
}

function drawPlayer() {
  if (images.player.complete && images.player.naturalWidth !== 0) {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(images.player, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();
  } else {
    ctx.fillStyle = 'lime';
    ctx.font = 'bold 24px Arial';
    ctx.fillText("O", player.x + player.width / 2 - 12, player.y + player.height / 2 + 8);
  }
}

function drawEnemy(e) {
  if (images.drone.complete && images.drone.naturalWidth !== 0) {
    ctx.drawImage(images.drone, e.x, e.y, e.width, e.height);
  } else {
    ctx.fillStyle = 'red';
    ctx.font = 'bold 24px Arial';
    ctx.fillText("X", e.x + e.width / 2 - 12, e.y + e.height / 2 + 8);
  }
}

function drawBoss() {
  if (images.bomber.complete && images.bomber.naturalWidth !== 0) {
    ctx.drawImage(images.bomber, boss.x, boss.y, boss.width, boss.height);
  } else {
    ctx.fillStyle = 'purple';
    ctx.font = 'bold 24px Arial';
    ctx.fillText("XX", boss.x + boss.width / 2 - 24, boss.y + boss.height / 2 + 8);
  }
}

function drawBullet(b) {
  if (images.bullet.complete && images.bullet.naturalWidth !== 0) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.filter = b.isEnemy ? 'hue-rotate(0deg)' : 'hue-rotate(180deg)';
    ctx.drawImage(images.bullet, b.x, b.y, b.width, b.height);
    ctx.restore();
  } else {
    ctx.fillStyle = b.isEnemy ? 'orange' : 'cyan';
    ctx.fillRect