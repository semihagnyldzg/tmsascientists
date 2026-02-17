/* Simulation Manager - Handles multiple interactive labs */

const SimManager = {
    currentLab: null,
    overlay: null,

    init() {
        if (document.getElementById('sim-overlay')) return;

        // Create Generic Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'sim-overlay';
        this.overlay.className = 'sim-overlay';
        this.overlay.style.display = 'none';
        this.overlay.innerHTML = `
            <div class="sim-container" id="sim-container">
                <button class="sim-close-btn" onclick="SimManager.close()">❌ Close Lab</button>
                <div id="sim-content"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Handle Browser Back Button
        window.addEventListener('popstate', (event) => {
            // When back button is pressed, if lab is open, close it (UI only)
            if (this.currentLab) {
                this._closeUI();
            }
        });
    },

    open(type, topic = "Science Topic") {
        this.init();

        // Push history state so Back button works
        history.pushState({ simOpen: true }, '', '#simulation');

        const container = document.getElementById('sim-content');
        container.innerHTML = ''; // Clear previous

        if (type === 'weather') {
            WeatherLab.render(container);
            this.currentLab = WeatherLab;
        } else if (type === 'forces') {
            ForcesLab.render(container);
            this.currentLab = ForcesLab;
        } else {
            // Default to Generic
            GenericLab.render(container, topic);
            this.currentLab = GenericLab;
        }

        this.overlay.style.display = 'flex';
        if (this.currentLab && this.currentLab.start) {
            this.currentLab.start();
        }
    },

    // Called by the Close Button
    close() {
        // Go back in history, which triggers 'popstate' event to close UI
        history.back();
    },

    // Internal clean close (called by popstate)
    _closeUI() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        if (this.currentLab && this.currentLab.stop) {
            this.currentLab.stop();
        }
        this.currentLab = null;
    }
};

/* --- 3. Generic Lab (Placeholder) --- */
const GenericLab = {
    render(container, topic) {
        container.innerHTML = `
            <div class="sim-header">
                <h2>🧪 Interactive Lab: ${topic}</h2>
                <p>Explore concepts related to ${topic}.</p>
            </div>
            <div style="padding: 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; background: #f8fafc;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🚧</div>
                <h3 style="color: #475569;">Simulation Under Construction</h3>
                <p style="color: #64748b; max-width: 400px; line-height: 1.6;">
                    Our scientists are currently building the interactive simulation for <b>${topic}</b>. 
                    Check back soon for updates!
                </p>
                <div style="margin-top: 2rem; padding: 1rem; background: #e0f2fe; border-radius: 12px; color: #0369a1;">
                    💡 <b>Tip:</b> Try the <i>Weather</i> or <i>Forces & Motion</i> labs to see what's coming!
                </div>
            </div>
        `;
    },
    start() { },
    stop() { }
};

/* --- 1. Weather Lab (Refactored) --- */
const WeatherLab = {
    state: { temp: 20, vapor: 0, cloud: 0 },
    interval: null,

    render(container) {
        container.innerHTML = `
            <div class="sim-header">
                <h2>💧 Water Cycle Simulator</h2>
                <p>Adjust temperature to create clouds and rain!</p>
            </div>
            <div class="sim-scene" id="weather-scene">
                <div class="sim-sky"></div>
                <div class="sim-sun" id="sim-sun"></div>
                <div class="sim-clouds" id="sim-clouds"></div>
                <div class="sim-rain-container" id="sim-rain"></div>
                <div class="sim-ocean"><div class="ocean-label">Ocean</div></div>
                <div class="sim-vapor-container" id="sim-vapor"></div>
            </div>
            <div class="sim-controls">
                <label>🌡️ Temperature: <span id="temp-val">20</span>°C</label>
                <input type="range" id="temp-slider" min="-10" max="100" value="20">
                <div class="sim-status" id="weather-status">Status: Normal.</div>
            </div>
        `;

        // Re-bind events
        document.getElementById('temp-slider').oninput = (e) => this.updateTemp(e.target.value);
        this.updateTemp(20);
    },

    start() {
        this.interval = setInterval(() => this.tick(), 100);
    },

    stop() {
        clearInterval(this.interval);
    },

    updateTemp(val) {
        this.state.temp = parseInt(val);
        document.getElementById('temp-val').textContent = val;

        const sun = document.getElementById('sim-sun');
        const scene = document.getElementById('weather-scene');
        if (!sun || !scene) return;

        sun.style.opacity = Math.max(0.4, (this.state.temp + 10) / 110);
        sun.style.boxShadow = `0 0 ${this.state.temp * 1.5}px orange`;

        if (this.state.temp < 0) scene.style.background = 'linear-gradient(to bottom, #dbeafe, #eff6ff)';
        else if (this.state.temp > 30) scene.style.background = 'linear-gradient(to bottom, #fef3c7, #fed7aa)';
        else scene.style.background = 'linear-gradient(to bottom, #bfdbfe, #dbeafe)';
    },

    tick() {
        const T = this.state.temp;
        const vaporEl = document.getElementById('sim-vapor');
        const rainEl = document.getElementById('sim-rain');
        const cloudsEl = document.getElementById('sim-clouds');
        const statusEl = document.getElementById('weather-status');

        if (!vaporEl) return;

        // Logic
        if (T > 10 && Math.random() < (T - 10) / 100) {
            this.state.vapor = Math.min(100, this.state.vapor + 0.5);
            this.spawnParticle(vaporEl, 'vapor');
        } else {
            this.state.vapor = Math.max(0, this.state.vapor - 0.5);
        }

        if (this.state.vapor > 20) this.state.cloud = Math.min(100, this.state.cloud + 0.2);
        else this.state.cloud = Math.max(0, this.state.cloud - 0.1);

        if (this.state.cloud > 60 && Math.random() < (this.state.cloud / 200)) {
            this.spawnParticle(rainEl, T <= 0 ? 'snow' : 'rain');
        }

        // Updates
        if (cloudsEl) {
            cloudsEl.style.opacity = this.state.cloud / 100;
            cloudsEl.style.filter = `brightness(${255 - this.state.cloud * 1.5}%)`;
        }

        if (statusEl) {
            if (T <= 0) statusEl.textContent = "❄️ Freezing! Ice forming.";
            else if (T < 60) statusEl.textContent = "☀️ Warm. Evaporation active.";
            else statusEl.textContent = "🔥 Hot! Heavy rain likely.";
        }
    },

    spawnParticle(container, type) {
        const p = document.createElement('div');
        p.className = `sim-particle ${type}`;
        p.style.left = Math.random() * 100 + '%';
        if (type === 'vapor') p.style.bottom = '10%';
        else p.style.top = '10%';
        container.appendChild(p);
        setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 2500);
    }
};

/* --- 2. Forces & Motion Lab (Rocket) --- */
const ForcesLab = {
    state: { thrust: 0, mass: 1000, velocity: 0, height: 0, fuel: 100, isLaunching: false },
    interval: null,

    render(container) {
        container.innerHTML = `
            <div class="sim-header">
                <h2>🚀 Rocket Launch Lab (Forces & Motion)</h2>
                <p>Balance <b>Thrust</b> (Force) vs <b>Mass</b> to reach orbit!</p>
            </div>
            <div class="sim-scene" id="forces-scene" style="background: linear-gradient(to bottom, #1e1b4b, #3b82f6); align-items: flex-end; display: flex; justify-content: center;">
                
                <!-- Stars -->
                <div id="stars"></div>

                <!-- Rocket -->
                <div id="rocket" style="width: 60px; height: 100px; background: url('https://cdn-icons-png.flaticon.com/512/3212/3212567.png') no-repeat center/contain; position: relative; bottom: 0; transition: bottom 0.1s linear;">
                    <div id="flame" style="width: 20px; height: 0px; background: orange; margin: 0 auto; border-radius: 50%; position: absolute; bottom: -20px; left: 20px; box-shadow: 0 0 20px red; transition: height 0.2s;"></div>
                </div>

                <!-- Ground -->
                <div style="position: absolute; bottom: 0; width: 100%; height: 50px; background: #22c55e;"></div>

                <!-- Stats HUD -->
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 8px;">
                    <div>Height: <span id="val-height">0</span> m</div>
                    <div>Velocity: <span id="val-vel">0</span> m/s</div>
                    <div>Accel: <span id="val-acc">0</span> m/s²</div>
                </div>
            </div>

            <div class="sim-controls" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px;">
                <div>
                    <label>🔥 Thrust (Force): <span id="val-thrust">0</span> kN</label>
                    <input type="range" id="slider-thrust" min="0" max="5000" value="0" step="100">
                </div>
                <div>
                    <label>⚖️ Rocket Mass: <span id="val-mass">1000</span> kg</label>
                    <input type="range" id="slider-mass" min="500" max="5000" value="1000" step="100">
                </div>
                <div style="display: flex; align-items: center;">
                    <button id="btn-launch" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">LAUNCH 🚀</button>
                    <button id="btn-reset" style="padding: 10px; margin-left: 5px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer;">↺</button>
                </div>
            </div>
        `;

        // Bind Controls
        document.getElementById('slider-thrust').oninput = (e) => {
            this.state.thrust = parseInt(e.target.value);
            document.getElementById('val-thrust').innerText = this.state.thrust;
            this.updateFlame();
        };
        document.getElementById('slider-mass').oninput = (e) => {
            this.state.mass = parseInt(e.target.value);
            document.getElementById('val-mass').innerText = this.state.mass;
        };
        document.getElementById('btn-launch').onclick = () => this.toggleLaunch();
        document.getElementById('btn-reset').onclick = () => this.reset();

        this.generateStars();
    },

    start() {
        this.interval = setInterval(() => this.physicsTick(), 50); // 20fps
    },

    stop() {
        clearInterval(this.interval);
    },

    toggleLaunch() {
        this.state.isLaunch = !this.state.isLaunch; // Just toggle state, physics handles movement
        const btn = document.getElementById('btn-launch');
        if (this.state.isLaunch) {
            btn.innerText = "ABORT";
            btn.style.background = "#f59e0b";
        } else {
            btn.innerText = "LAUNCH 🚀";
            btn.style.background = "#ef4444";
        }
    },

    reset() {
        this.state.isLaunch = false;
        this.state.height = 0;
        this.state.velocity = 0;
        this.renderRocket();
        document.getElementById('btn-launch').innerText = "LAUNCH 🚀";
    },

    updateFlame() {
        const flame = document.getElementById('flame');
        if (flame) {
            // Height proportional to thrust
            flame.style.height = (this.state.thrust / 50) + 'px';
        }
    },

    physicsTick() {
        // F = ma  ->  a = F/m
        // Forces: Thrust (Up), Gravity (Down)
        // Gravity Fg = m * g (g = 9.8)

        const g = 9.8;
        const Fg = this.state.mass * g;

        // Net Force
        // If on ground (height=0) and Thrust < Gravity, no move.
        let Fnet = (this.state.thrust * 1000) - Fg; // Thrust in kN -> N

        if (this.state.height <= 0 && Fnet < 0) {
            Fnet = 0;
            this.state.velocity = 0;
            this.state.height = 0;
        }

        // Acceleration a = Fnet / m
        const a = Fnet / this.state.mass;

        if (this.state.isLaunch || this.state.height > 0) {
            // Update Velocity: v = v0 + at
            const dt = 0.05; // 50ms
            this.state.velocity += a * dt;

            // Update Height: h = h0 + vt
            this.state.height += this.state.velocity * dt;

            // Crash/Land
            if (this.state.height < 0) {
                this.state.height = 0;
                this.state.velocity = 0;
                this.state.isLaunch = false;
                document.getElementById('btn-launch').innerText = "LAUNCH 🚀";
            }
        }

        this.updateUI(a);
    },

    updateUI(accel) {
        document.getElementById('val-height').innerText = Math.round(this.state.height);
        document.getElementById('val-vel').innerText = Math.round(this.state.velocity);
        document.getElementById('val-acc').innerText = accel.toFixed(1);

        this.renderRocket();
    },

    renderRocket() {
        const r = document.getElementById('rocket');
        if (r) {
            // Visually clamp height or scale it. 
            // Let's say max screen height is 400px = 1000m?
            // Or just move it up until it disappears and wrap or clamp.
            // visual bottom = min(300, actual height)
            let visualH = Math.min(350, this.state.height);
            r.style.bottom = visualH + 'px';
        }
    },

    generateStars() {
        const bg = document.getElementById('stars');
        if (!bg) return;
        let html = '';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            html += `<div style="position:absolute; width:2px; height:2px; background:white; top:${y}%; left:${x}%; opacity:${Math.random()}"></div>`;
        }
        bg.innerHTML = html;
    }
};
