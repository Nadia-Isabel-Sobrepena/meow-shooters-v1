const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const grazeVal = document.getElementById('grazeVal');
const hpFill = document.getElementById('boss-hp-fill');
const gameOverOverlay = document.getElementById('screen-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtns = document.querySelectorAll('.restartBtn');

canvas.width = 600;
canvas.height = 800;

let score, graze, gameActive, isPaused, frameCount;
const input = { left: false, right: false, up: false, down: false, space: false, shift: false };
let player, boss, pBullets, eBullets, stars;

// --- Classes (Player, Boss remain mostly the same) ---

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.hitRadius = 2.5;
        this.grazeRadius = 25;
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
        this.draw();
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-15, 15); ctx.lineTo(15, 15); ctx.fill();
        ctx.fillStyle = '#ff99cc';
        ctx.fillRect(-10, -10, 5, 5); ctx.fillRect(5, -10, 5, 5);
        if (input.shift) {
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = 150;
        this.maxHp = 2500;
        this.hp = 2500;
        this.targetX = canvas.width / 2;
        this.moveTimer = 0;
    }
    update() {
        if (this.moveTimer <= 0) {
            this.targetX = Math.random() * (canvas.width - 200) + 100;
            this.moveTimer = 100;
        }
        this.x += (this.targetX - this.x) * 0.04;
        this.moveTimer--;
        this.shoot();
        this.draw();
        hpFill.style.width = (this.hp / this.maxHp) * 100 + "%";
    }
    shoot() {
        // Pattern logic
        if (this.hp > 1700) { // Spiral
            if (frameCount % 3 === 0) {
                let angle = frameCount * 0.15;
                this.fire(angle, 4, '#ff00ff');
                this.fire(angle + Math.PI, 4, '#ff00ff');
            }
        } else if (this.hp > 800) { // Aimed
            if (frameCount % 45 === 0) {
                for (let i = -3; i <= 3; i++) {
                    let angle = Math.atan2(player.y - this.y, player.x - this.x) + (i * 0.15);
                    this.fire(angle, 3, '#00f2fe');
                }
            }
        } else { // Finale
            if (frameCount % 12 === 0) {
                for (let i = 0; i < 10; i++) {
                    let angle = (i * Math.PI / 5) + (frameCount * 0.05);
                    this.fire(angle, 2.5, '#ffcc00');
                }
            }
        }
    }
    fire(angle, speed, color) {
        eBullets.push({ x: this.x, y: this.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, color: color, r: 6, grazed: false });
    }
    draw() {
        ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(this.x, this.y, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff007f'; ctx.beginPath(); ctx.arc(this.x-20, this.y-10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x+20, this.y-10, 15, 0, Math.PI * 2); ctx.fill();
    }
}

// --- Engine Functions ---

function init() {
    score = 0; graze = 0; frameCount = 0;
    gameActive = true; isPaused = false;
    player = new Player();
    boss = new Boss();
    pBullets = []; eBullets = [];
    stars = Array.from({length: 50}, () => ({x: Math.random() * canvas.width, y: Math.random() * canvas.height, s: Math.random() * 2}));
    
    scoreVal.innerText = score;
    grazeVal.innerText = graze;
    gameOverOverlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    pauseOverlay.style.display = isPaused ? 'flex' : 'none';
}

function loop() {
    if (gameActive && !isPaused) {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Stars
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
            ctx.fillStyle = '#00f2fe'; ctx.fillRect(b.x-2, b.y, 4, 15);
            if (Math.hypot(b.x - boss.x, b.y - boss.y) < 40) {
                boss.hp -= 3; score += 10;
                pBullets.splice(i, 1);
            }
            if (b.y < 0) pBullets.splice(i, 1);
        });

        // Enemy Bullets
        eBullets.forEach((b, i) => {
            b.x += b.vx; b.y += b.vy;
            ctx.fillStyle = b.color;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'white'; ctx.stroke();

            let dist = Math.hypot(b.x - player.x, b.y - player.y);
            if (dist < player.hitRadius + b.r) {
                gameActive = false;
                gameOverOverlay.style.display = 'flex';
                document.getElementById('finalScore').innerText = score;
            }
            if (!b.grazed && dist < player.grazeRadius) {
                b.grazed = true; graze++; score += 50;
                grazeVal.innerText = graze;
            }
            if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) eBullets.splice(i, 1);
        });

        scoreVal.innerText = score;
        if (boss.hp <= 0) {
            document.getElementById('statusTitle').innerText = "VICTORY!";
            gameActive = false;
            gameOverOverlay.style.display = 'flex';
        }
    }
    requestAnimationFrame(loop);
}

// --- Listeners ---

window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;
    if (e.code === 'Space') input.space = true;
    if (e.shiftKey) input.shift = true;
    
    if (e.code === 'Escape') togglePause();
    if (e.code === 'KeyR') init(); // Quick Restart
});

window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
    if (e.code === 'Space') input.space = false;
    if (!e.shiftKey) input.shift = false;
});

resumeBtn.addEventListener('click', togglePause);
restartBtns.forEach(btn => btn.addEventListener('click', init));

init();
loop();