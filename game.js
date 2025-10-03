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

for (let key in imageSources) {
  images[key] = new Image();
  images[key].src = imageSources[key];
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

function beendeSpiel() {
  gameRunning = false;
  paused = false;
  sounds.musik.pause();
  sounds.gameover.play();
  startButton.style.display = 'block';
  pauseButton.style.display = 'block';
  quitButton.style.display = 'block';
  pauseButton.textContent = 'Pause';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 36px Arial';
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2 - 20);
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
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 14px Arial';
    ctx.fillText("P", player.x + player.width / 2 - 5, player.y + player.height / 2 + 5);
  }
}

function drawEnemy(e) {
  if (images.drone.complete && images.drone.naturalWidth !== 0) {
    ctx.drawImage(images.drone, e.x, e.y, e.width, e.height);
  } else {
    ctx.fillStyle = 'red';
    ctx.fillRect(e.x, e.y, e.width, e.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText("E", e.x + e.width / 2 - 5, e.y + e.height / 2 + 5);
  }
}

function drawBoss() {
  if (images.bomber.complete && images.bomber.naturalWidth !== 0) {
    ctx.drawImage(images.bomber, boss.x, boss.y, boss.width, boss.height);
  } else {
    ctx.fillStyle = 'purple';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText("B", boss.x + boss.width / 2 - 5, boss.y + boss.height / 2 + 5);
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
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
}

function drawShield() {
  if (images.shield.complete && images.shield.naturalWidth !== 0) {
    ctx.drawImage(images.shield, player.x - 10, player.y - 10, player.width + 20, player.height + 20);
  } else {
    ctx.strokeStyle = 'aqua';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x - 5, player.y - 5, player.width + 10, player.height + 10);
  }
}

function drawBombEffect() {
  if (images.bomb.complete && images.bomb.naturalWidth !== 0) {
    ctx.drawImage(images.bomb, canvas.width / 2 - 100, canvas.height / 2 - 100, 200, 200);
  } else {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawHUD() {
  ctx.fillStyle = 'white';
  ctx.font = '18px Arial';
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Lives: ${lives}`, 20, 60);
  ctx.fillText(`Bombs: ${bombs}`, 20, 90);
  ctx.fillText(`Shield: ${shieldActive ? 'ON' : 'OFF'}`, 20, 120);
}

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
