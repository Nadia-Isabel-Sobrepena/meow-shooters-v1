const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const grazeVal = document.getElementById('grazeVal');
const hpFill = document.getElementById('boss-hp-fill');
const overlay = document.getElementById('screen-overlay');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 600;
canvas.height = 800;

let score = 0;
let graze = 0;
let gameActive = true;
let frameCount = 0;

const input = { left: false, right: false, up: false, down: false, space: false, shift: false };
let player, boss, pBullets, eBullets, stars;

// --- Helper: Drawing ---

function drawPlayer(x, y, isFocus) {
    ctx.save();
    ctx.translate(x, y);
    
    // Visual Ship
    ctx.globalAlpha = isFocus ? 0.7 : 1;
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-15, 15); ctx.lineTo(15, 15); ctx.fill();
    ctx.fillStyle = '#ff99cc'; // Ears
    ctx.fillRect(-10, -10, 5, 5); ctx.fillRect(5, -10, 5, 5);

    // TOUHOU HITBOX (Only visible in Focus Mode)
    if (isFocus) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'red';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// --- Classes ---

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.hitRadius = 2;   // Tiny hitbox
        this.grazeRadius = 20; // Larger graze area
        this.speed = 6;
        this.focusSpeed = 2.5;
    }
    update() {
        let s = input.shift ? this.focusSpeed : this.speed;
        if (input.left && this.x > 20) this.x -= s;
        if (input.right && this.x < canvas.width - 20) this.x += s;
        if (input.up && this.y > 20) this.y -= s;
        if (input.down && this.y < canvas.height - 20) this.y += s;

        if (input.space && frameCount % 5 === 0) {
            pBullets.push({ x: this.x, y: this.y - 20 });
        }
        drawPlayer(this.x, this.y, input.shift);
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = 150;
        this.maxHp = 2000;
        this.hp = 2000;
        this.targetX = canvas.width / 2;
        this.moveTimer = 0;
    }
    update() {
        // Simple side-to-side hovering
        if (this.moveTimer <= 0) {
            this.targetX = Math.random() * (canvas.width - 200) + 100;
            this.moveTimer = 120;
        }
        this.x += (this.targetX - this.x) * 0.05;
        this.moveTimer--;

        this.shoot();
        this.draw();
        
        // Update HP Bar
        hpFill.style.width = (this.hp / this.maxHp) * 100 + "%";
    }
    shoot() {
        // Pattern 1: Spiral (HP > 1300)
        if (this.hp > 1300) {
            if (frameCount % 3 === 0) {
                let angle = frameCount * 0.15;
                this.fireBullet(angle, 4, '#ff00ff');
                this.fireBullet(angle + Math.PI, 4, '#ff00ff');
            }
        } 
        // Pattern 2: Aimed Bursts (700 < HP <= 1300)
        else if (this.hp > 700) {
            if (frameCount % 40 === 0) {
                for (let i = -2; i <= 2; i++) {
                    let angle = Math.atan2(player.y - this.y, player.x - this.x) + (i * 0.2);
                    this.fireBullet(angle, 3.5, '#00f2fe');
                }
            }
        } 
        // Pattern 3: Chaos Petals (HP < 700)
        else {
            if (frameCount % 10 === 0) {
                for (let i = 0; i < 8; i++) {
                    let angle = (i * Math.PI / 4) + (frameCount * 0.02);
                    this.fireBullet(angle, 3, '#ffcc00');
                }
            }
        }
    }
    fireBullet(angle, speed, color) {
        eBullets.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            radius: 5,
            grazed: false
        });
    }
    draw() {
        // Draw Boss (A large robo-mouse)
        ctx.fillStyle = '#444';
        ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff007f';
        ctx.beginPath(); ctx.arc(this.x - 20, this.y - 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + 20, this.y - 10, 15, 0, Math.PI * 2); ctx.fill();
    }
}

// --- Engine ---

function init() {
    player = new Player();
    boss = new Boss();
    pBullets = []; eBullets = [];
    stars = Array.from({length: 50}, () => ({x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2}));
    score = 0; graze = 0; gameActive = true;
    overlay.style.display = 'none';
    loop();
}

function loop() {
    if (!gameActive) return;
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#fff";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.s, s.s);
        s.y += 1; if (s.y > canvas.height) s.y = 0;
    });

    player.update();
    boss.update();

    // Player Bullets
    pBullets.forEach((b, i) => {
        b.y -= 12;
        ctx.fillStyle = '#00f2fe'; ctx.fillRect(b.x - 2, b.y, 4, 15);
        if (Math.hypot(b.x - boss.x, b.y - boss.y) < 40) {
            boss.hp -= 2; score += 10;
            pBullets.splice(i, 1);
        }
        if (b.y < 0) pBullets.splice(i, 1);
    });

    // Enemy Bullets
    eBullets.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.stroke();

        let dist = Math.hypot(b.x - player.x, b.y - player.y);
        
        // 1. Collision Check (Touhou tiny hitbox)
        if (dist < player.hitRadius + b.radius) {
            gameActive = false;
            overlay.style.display = 'flex';
            document.getElementById('finalScore').innerText = score;
        }
        
        // 2. Graze Check
        if (!b.grazed && dist < player.grazeRadius) {
            b.grazed = true;
            graze++;
            score += 50;
            grazeVal.innerText = graze;
        }

        if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
            eBullets.splice(i, 1);
        }
    });

    scoreVal.innerText = score;
    if (boss.hp <= 0) {
        document.getElementById('statusTitle').innerText = "VICTORY!";
        gameActive = false;
        overlay.style.display = 'flex';
    } else {
        requestAnimationFrame(loop);
    }
}

// Controls
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
    if (e.code === 'Space') input.space = true;
    if (e.shiftKey) input.shift = true;
});
window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
    if (e.code === 'Space') input.space = false;
    if (!e.shiftKey) input.shift = false;
});
restartBtn.addEventListener('click', () => location.reload());

init();