const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const finalScore = document.getElementById('finalScore');
const overlay = document.getElementById('screen-overlay');
const restartBtn = document.getElementById('restartBtn');

// Configuration
canvas.width = 600;
canvas.height = 800;

let score = 0;
let gameActive = true;
let frameCount = 0;
const input = { left: false, right: false, up: false, down: false, space: false };

let player, bullets, enemies, particles, stars;

// --- Vector Drawing Functions ---

function drawPlayer(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Wings
    ctx.fillStyle = '#7a2eb0';
    ctx.beginPath();
    ctx.moveTo(-25, 10); ctx.lineTo(25, 10); ctx.lineTo(0, -10);
    ctx.fill();

    // Ship Body
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.moveTo(-12, 15); ctx.lineTo(12, 15); ctx.lineTo(0, -25);
    ctx.fill();

    // Cat Ears
    ctx.fillStyle = '#ff99cc';
    ctx.beginPath(); // Left
    ctx.moveTo(-10, -12); ctx.lineTo(-15, -25); ctx.lineTo(-4, -18); ctx.fill();
    ctx.beginPath(); // Right
    ctx.moveTo(10, -12); ctx.lineTo(15, -25); ctx.lineTo(4, -18); ctx.fill();

    // Engine Fire
    ctx.fillStyle = frameCount % 4 < 2 ? '#ffcc00' : '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-5, 15); ctx.lineTo(5, 15); ctx.lineTo(0, 25);
    ctx.fill();

    ctx.restore();
}

function drawFishBullet(x, y) {
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x - 5, y + 12);
    ctx.lineTo(x + 5, y + 12);
    ctx.fill();
}

function drawEnemy(x, y, type, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (type === 'mouse') {
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff99cc';
        ctx.beginPath();
        ctx.arc(-10, -10, 6, 0, Math.PI * 2); ctx.arc(10, -10, 6, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
        for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.moveTo(-15, -5 + (i*5));
            ctx.bezierCurveTo(-5, -20, 5, 20, 15, -5 + (i*5));
            ctx.stroke();
        }
    }
    ctx.restore();
}

// --- Classes ---

class Ship {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.speed = 7;
        this.radius = 15;
        this.cooldown = 0;
    }
    update() {
        if (input.left && this.x > 30) this.x -= this.speed;
        if (input.right && this.x < canvas.width - 30) this.x += this.speed;
        if (input.up && this.y > 30) this.y -= this.speed;
        if (input.down && this.y < canvas.height - 30) this.y += this.speed;

        if (input.space && this.cooldown <= 0) {
            bullets.push(new Bullet(this.x, this.y - 20));
            this.cooldown = 10;
        }
        if (this.cooldown > 0) this.cooldown--;
        drawPlayer(this.x, this.y);
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.speed = 10;
        this.radius = 5;
    }
    update() {
        this.y -= this.speed;
        drawFishBullet(this.x, this.y);
    }
}

class Enemy {
    constructor() {
        this.x = Math.random() * (canvas.width - 60) + 30;
        this.y = -50;
        this.type = Math.random() > 0.5 ? 'mouse' : 'yarn';
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.speed = 2 + (score / 1000) + Math.random() * 2;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.1;
        this.radius = 18;
    }
    update() {
        this.y += this.speed;
        this.rotation += this.rotSpeed;
        drawEnemy(this.x, this.y, this.type, this.color, this.rotation);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= 0.03;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// --- Game Engine ---

function init() {
    player = new Ship();
    bullets = [];
    enemies = [];
    particles = [];
    stars = Array.from({length: 100}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2
    }));
    score = 0;
    scoreVal.innerText = score;
    gameActive = true;
    overlay.style.display = 'none';
    requestAnimationFrame(loop);
}

function loop() {
    if (!gameActive) return;
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars background
    ctx.fillStyle = "#FFF";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.s, s.s);
        s.y += (s.s * 0.5);
        if (s.y > canvas.height) s.y = 0;
    });

    player.update();

    // Spawning
    if (frameCount % Math.max(15, 50 - Math.floor(score/200)) === 0) {
        enemies.push(new Enemy());
    }

    // Update Bullets
    bullets.forEach((b, i) => {
        b.update();
        if (b.y < -20) bullets.splice(i, 1);
    });

    // Update Enemies
    enemies.forEach((e, ei) => {
        e.update();

        // Bullet Collision
        bullets.forEach((b, bi) => {
            if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
                for(let k=0; k<10; k++) particles.push(new Particle(e.x, e.y, e.type === 'mouse' ? '#888' : e.color));
                enemies.splice(ei, 1);
                bullets.splice(bi, 1);
                score += 10;
                scoreVal.innerText = score;
            }
        });

        // Player Collision
        if (Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius) {
            gameOver();
        }

        if (e.y > canvas.height + 50) enemies.splice(ei, 1);
    });

    // Update Particles
    particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0) particles.splice(i, 1);
    });

    requestAnimationFrame(loop);
}

function gameOver() {
    gameActive = false;
    overlay.style.display = 'flex';
    finalScore.innerText = score;
}

// Input Handling
const handleKey = (e, status) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = status;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = status;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = status;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = status;
    if (e.code === 'Space') input.space = status;
};

window.addEventListener('keydown', e => handleKey(e, true));
window.addEventListener('keyup', e => handleKey(e, false));
restartBtn.addEventListener('click', init);

// Start Game
init();