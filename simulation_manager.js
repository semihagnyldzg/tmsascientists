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

        // Inject Shared Styles for Simulations
        if (!document.getElementById('sim-shared-style')) {
            const s = document.createElement('style');
            s.id = 'sim-shared-style';
            s.innerHTML = `
                .sim-tab-btn { padding: 8px 16px; border: none; background: #e2e8f0; border-radius: 20px; cursor: pointer; font-weight: bold; margin: 0 5px; }
                .sim-tab-btn.active { background: #3b82f6; color: white; }
                .sim-tab-btn:hover { background: #cbd5e1; }
                .sim-btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: transform 0.1s; }
                .sim-btn:active { transform: scale(0.95); }
                .sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
            document.head.appendChild(s);
        }
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
        } else if (type === 'matter') {
            MatterLab.render(container);
            this.currentLab = MatterLab;
        } else if (type === 'genetics') {
            GeneticsLab.render(container);
            this.currentLab = GeneticsLab;
        } else if (type === 'microbio') {
            MicrobiologyLab.render(container);
            this.currentLab = MicrobiologyLab;
        } else if (type === 'earth_history') {
            EarthHistoryLab.render(container);
            this.currentLab = EarthHistoryLab;
        } else if (type === 'ecosystems') {
            EcosystemsLab.render(container);
            this.currentLab = EcosystemsLab;
        } else if (type === 'literacy') {
            GenericLab.render(container); // Use Generic Lab for Literacy for now
            this.currentLab = GenericLab;
        } else if (type === 'hydrosphere') {
            HydrosphereLab.render(container);
            this.currentLab = HydrosphereLab;
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

/* --- 3. Matter Lab (Dual Mode) --- */
const MatterLab = {
    state: {
        tab: 'phases', // 'phases' or 'mass'
        temp: -20,     // Phase change temp
        particles: [],
        scaleItems: [],
        isMelting: false
    },
    interval: null,
    container: null,

    render(container) {
        this.container = container;
        this.state.tab = 'phases'; // Reset to default
        this.state.temp = -20;
        this.state.scaleItems = [];
        this.renderTabs();
    },

    renderTabs() {
        this.container.innerHTML = `
            <div class="sim-header">
                <h2>⚗️ Matter: Properties & Change</h2>
                <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.5rem;">
                    <button onclick="MatterLab.switchTab('phases')" class="sim-tab-btn ${this.state.tab === 'phases' ? 'active' : ''}">States of Matter</button>
                    <button onclick="MatterLab.switchTab('mass')" class="sim-tab-btn ${this.state.tab === 'mass' ? 'active' : ''}">Conservation of Mass</button>
                </div>
            </div>
            <div id="matter-content" style="height: 60vh; position: relative; overflow: hidden;"></div>
        `;

        // Add styles for tabs if not present
        if (!document.getElementById('matter-styles')) {
            const style = document.createElement('style');
            style.id = 'matter-styles';
            style.innerHTML = `
                .sim-tab-btn { padding: 8px 16px; border: none; background: #e2e8f0; border-radius: 20px; cursor: pointer; font-weight: bold; }
                .sim-tab-btn.active { background: #3b82f6; color: white; }
                .scale-item { transition: all 0.5s; cursor: pointer; }
            `;
            document.head.appendChild(style);
        }

        this.renderContent();
    },

    switchTab(tab) {
        this.state.tab = tab;
        this.stop(); // Stop any running loops
        this.renderTabs(); // Re-render wrapper to update active class
        this.start(); // Restart loop if needed
    },

    renderContent() {
        const content = document.getElementById('matter-content');
        content.innerHTML = '';

        if (this.state.tab === 'phases') {
            this.renderPhases(content);
        } else {
            this.renderConservation(content);
        }
    },

    /* --- Tab 1: Phase Changes --- */
    renderPhases(content) {
        content.innerHTML = `
            <div class="sim-scene" id="phase-scene" style="background: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div id="particle-container" style="width: 300px; height: 300px; border: 4px solid #334155; background: white; position: relative; border-radius: 12px; overflow: hidden;"></div>
                <div style="margin-top: 1rem; font-weight: bold; font-size: 1.2rem; color: #475569;" id="phase-label">SOLID (Ice)</div>
            </div>
            <div class="sim-controls">
                <label>🌡️ Temperature: <span id="val-temp">-20</span>°C</label>
                <input type="range" id="slider-temp" min="-50" max="150" value="-20" step="1" oninput="MatterLab.updateTemp(this.value)">
                <div class="sim-status">Watch how particles move as heat increases!</div>
            </div>
        `;
        this.initParticles();
    },

    initParticles() {
        const container = document.getElementById('particle-container');
        if (!container) return;

        this.state.particles = [];
        // Create 64 particles (8x8 grid for solid state)
        for (let i = 0; i < 64; i++) {
            const p = document.createElement('div');
            p.style.width = '12px';
            p.style.height = '12px';
            p.style.background = '#3b82f6';
            p.style.borderRadius = '50%';
            p.style.position = 'absolute';
            p.style.boxShadow = 'inset -2px -2px 4px rgba(0,0,0,0.2)';
            container.appendChild(p);

            // Randomize grid slightly for visual interest
            const row = Math.floor(i / 8);
            const col = i % 8;
            this.state.particles.push({
                el: p,
                x: 60 + col * 20, // Initial grid pos
                y: 60 + row * 20,
                vx: 0, vy: 0,
                baseX: 60 + col * 20,
                baseY: 60 + row * 20
            });
        }
        this.updateTemp(-20); // Set initial state
    },

    updateTemp(val) {
        this.state.temp = parseInt(val);
        const label = document.getElementById('phase-label');
        const valDisp = document.getElementById('val-temp');
        if (label) {
            if (this.state.temp < 0) label.innerText = "SOLID (Ice)";
            else if (this.state.temp < 100) label.innerText = "LIQUID (Water)";
            else label.innerText = "GAS (Steam)";
        }
        if (valDisp) valDisp.innerText = this.state.temp;
    },

    tickPhases() {
        const T = this.state.temp;
        const speed = (T + 60) / 20; // Speed factor based on temp
        const containerW = 300;
        const containerH = 300;

        this.state.particles.forEach(p => {
            if (T < 0) {
                // SOLID: Vibrate around base position
                // Jitter increases with temp (approaching 0)
                const jitter = (T + 50) * 0.05;
                p.x = p.baseX + (Math.random() - 0.5) * jitter;
                p.y = p.baseY + (Math.random() - 0.5) * jitter + 100; // Shift down for gravity effect
            } else if (T < 100) {
                // LIQUID: Flow at bottom
                // Gravity pulls down, particles repel/collide roughly
                p.vy += 0.5; // Gravity
                p.vx += (Math.random() - 0.5) * speed * 0.5;
                p.vy += (Math.random() - 0.5) * speed * 0.5;

                // Bounds
                if (p.y > containerH - 20) { p.y = containerH - 20; p.vy *= -0.5; }
                if (p.x < 0) { p.x = 0; p.vx *= -1; }
                if (p.x > containerW - 15) { p.x = containerW - 15; p.vx *= -1; }

                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Dampen
                p.vx *= 0.95;
                p.vy *= 0.95;
            } else {
                // GAS: Fly everywhere
                const gasSpeed = Math.max(2, (T - 80) / 10);
                p.vx += (Math.random() - 0.5) * gasSpeed;
                p.vy += (Math.random() - 0.5) * gasSpeed;

                p.x += p.vx;
                p.y += p.vy;

                // Bounce off walls
                if (p.x <= 0 || p.x >= containerW - 15) p.vx *= -1;
                if (p.y <= 0 || p.y >= containerH - 15) p.vy *= -1;

                // Clamp
                p.x = Math.max(0, Math.min(containerW - 15, p.x));
                p.y = Math.max(0, Math.min(containerH - 15, p.y));
            }

            p.el.style.left = p.x + 'px';
            p.el.style.top = p.y + 'px';

            // Color change
            if (T > 100) p.el.style.background = '#94a3b8'; // Steam (Grayish)
            else if (T > 0) p.el.style.background = '#3b82f6'; // Water (Blue)
            else p.el.style.background = '#60a5fa'; // Ice (Light Blue)
        });
    },

    /* --- Tab 2: Conservation of Mass --- */
    renderConservation(content) {
        content.innerHTML = `
            <div class="sim-scene" style="background: #ecfccb; padding: 20px; display: flex; flex-direction: column; align-items: center;">
                
                <!-- Weight Display -->
                <div style="background: #333; color: #bef264; font-family: monospace; font-size: 3rem; padding: 10px 30px; border-radius: 8px; border: 4px solid #555; box-shadow: 0 4px 0 #111; margin-bottom: 2rem;">
                    <span id="scale-value">0</span> g
                </div>

                <!-- Scale Platform -->
                <div id="scale-zone" style="width: 300px; height: 15px; background: #9ca3af; border-radius: 4px; position: relative;">
                    <!-- Items pile here -->
                </div>
                <div style="width: 100px; height: 80px; background: #4b5563; margin-top: 0px;"></div> <!-- Base -->

                <!-- Inventory -->
                <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                    <button onclick="MatterLab.addItem('ice')" class="sim-btn" style="background: #bfdbfe;">🧊 Add Ice (50g)</button>
                    <button onclick="MatterLab.addItem('water')" class="sim-btn" style="background: #3b82f6; color: white;">💧 Add Water (100g)</button>
                    <button onclick="MatterLab.addItem('salt')" class="sim-btn" style="background: white; border: 1px solid #ccc;">🧂 Add Salt (10g)</button>
                </div>

                <!-- Actions -->
                <div style="margin-top: 1rem; display: flex; gap: 1rem;">
                    <button onclick="MatterLab.mixItems()" class="sim-btn" style="background: #f59e0b; color: white;">🔥 Melt / Stir</button>
                    <button onclick="MatterLab.resetScale()" class="sim-btn" style="background: #ef4444; color: white;">🗑️ Clear Scale</button>
                </div>
                
                <p style="margin-top: 1rem; font-style: italic; color: #555;">Try adding items, checking the total, then melting/stirring. Does the weight change?</p>
            </div>
        `;
        this.resetScale();
    },

    addItem(type) {
        if (this.state.scaleItems.length > 3) {
            alert("Scale is full!");
            return;
        }

        let item = { type, id: Date.now() };
        if (type === 'ice') { item.weight = 50; item.display = '🧊'; item.color = '#bfdbfe'; }
        if (type === 'water') { item.weight = 100; item.display = '💧 Beaker'; item.color = '#3b82f6'; }
        if (type === 'salt') { item.weight = 10; item.display = '🧂'; item.color = 'white'; }

        this.state.scaleItems.push(item);
        this.updateScaleVisuals();
    },

    mixItems() {
        // Transform logic
        // Ice -> Water
        // Salt + Water -> Salt Water (Salt disappears visually or merges)
        let changed = false;

        // 1. Melt Ice
        this.state.scaleItems.forEach(item => {
            if (item.type === 'ice') {
                item.type = 'water_puddle';
                item.display = '💧 Puddle';
                item.color = '#93c5fd';
                changed = true;
            }
        });

        // 2. Dissolve Salt if Water exists
        const hasWater = this.state.scaleItems.some(i => i.type === 'water' || i.type === 'water_puddle');
        if (hasWater) {
            this.state.scaleItems.forEach(item => {
                if (item.type === 'salt') {
                    item.type = 'dissolved_salt';
                    item.display = '(Dissolved)';
                    item.color = 'transparent';
                    // We don't remove it from array, so weight stays!
                    changed = true;
                }
            });
        }

        if (changed) {
            this.updateScaleVisuals();
            // Pedagogical Feedback
            const feedback = document.createElement('div');
            feedback.style.position = 'absolute';
            feedback.style.top = '10px';
            feedback.style.left = '50%';
            feedback.style.transform = 'translateX(-50%)';
            feedback.style.background = '#dcfce7';
            feedback.style.padding = '10px 20px';
            feedback.style.borderRadius = '20px';
            feedback.style.border = '2px solid #22c55e';
            feedback.style.fontWeight = 'bold';
            feedback.style.color = '#15803d';
            feedback.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            feedback.innerHTML = `✨ Change Complete!<br>Form changed, but <b>Mass stayed the same!</b>`;

            document.getElementById('scale-zone').appendChild(feedback);

            setTimeout(() => feedback.remove(), 4000);
        } else {
            alert("Nothing to change right now. Add ingredients!");
        }
    },

    resetScale() {
        this.state.scaleItems = [];
        this.updateScaleVisuals();
    },

    updateScaleVisuals() {
        const zone = document.getElementById('scale-zone');
        const display = document.getElementById('scale-value');
        if (!zone || !display) return;

        zone.innerHTML = '';
        let totalWeight = 0;

        this.state.scaleItems.forEach((item, idx) => {
            totalWeight += item.weight;

            // Visual Block
            const div = document.createElement('div');
            // Enhanced Puddle Visual
            if (item.type === 'water_puddle') {
                div.innerText = '💧 Melted';
                div.style.borderRadius = '50% 50% 5px 5px'; // Flattened look
                div.style.transform = 'scaleX(1.2)';
            } else {
                div.innerText = item.display;
            }

            div.style.position = 'absolute';
            div.style.bottom = '100%'; // Sit on top
            div.style.left = (20 + idx * 60) + 'px';
            div.style.width = '50px';
            div.style.height = '50px';
            div.style.background = item.color;
            div.style.border = '2px solid #555';
            div.style.borderRadius = '8px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.fontSize = '0.8rem';
            div.style.textAlign = 'center';
            div.style.transition = 'all 0.5s';

            if (item.type === 'dissolved_salt') {
                div.style.opacity = '0'; // Invisible but present
                div.style.height = '0';
            }

            zone.appendChild(div);
        });

        display.innerText = totalWeight;
    },

    start() {
        if (this.state.tab === 'phases') {
            clearInterval(this.interval);
            this.interval = setInterval(() => this.tickPhases(), 30);
        }
    },

    stop() {
        clearInterval(this.interval);
    }
};


/* --- 4. Genetics Lab (Inherited vs Acquired) --- */
const GeneticsLab = {
    state: {
        tab: 'inherited',
        // Inherited (DNA)
        color: '#8b5cf6', // Violet default
        horns: 0,
        eyes: 2,

        // Acquired (Environment/Learning)
        skill: null, // 'music', 'cooking'
        tan: false,
        scar: false,

        // Challenge Mode
        currentChallengeIndex: 0,
        completed: false
    },

    challenges: [
        {
            text: "Create a **Green Monster** with **3 Eyes**.",
            hint: "These are Inherited Traits (DNA). Check the first tab!",
            check: (s) => s.color === '#10b981' && s.eyes == 3
        },
        {
            text: "Create a monster that **Learned Music**.",
            hint: "Music is a Skill (Acquired Trait). Check the second tab!",
            check: (s) => s.skill === 'music'
        },
        {
            text: "Create a **Red Monster** with a **Scar**.",
            hint: "Red color is Inherited, but a Scar is Acquired active life!",
            check: (s) => s.color === '#ef4444' && s.scar === true
        },
        {
            text: "Create a **Blue Monster** with **Unicorn Horn** who can **Cook**.",
            hint: "Mix Inherited (Blue, Horn) and Acquired (Cooking) traits!",
            check: (s) => s.color === '#8b5cf6' && s.horns == 1 && s.skill === 'cooking'
        }
    ],

    container: null,

    render(container) {
        this.container = container;
        // Reset state but keep challenge progress if we want, 
        // OR reset everything. Let's reset for fresh start.
        this.state = {
            tab: 'inherited',
            color: '#8b5cf6',
            horns: 0,
            eyes: 2,
            skill: null,
            tan: false,
            scar: false,
            currentChallengeIndex: 0,
            completed: false
        };
        this.renderTabs();
    },

    renderTabs() {
        const challenge = this.challenges[this.state.currentChallengeIndex];
        const progress = Math.round((this.state.currentChallengeIndex / this.challenges.length) * 100);

        this.container.innerHTML = `
            <div class="sim-header">
                <h2>🧬 Genetics: Inherited vs Acquired</h2>
                <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 0.5rem;">
                    <button onclick="GeneticsLab.switchTab('inherited')" class="sim-tab-btn ${this.state.tab === 'inherited' ? 'active' : ''}">🧬 Inherited (DNA)</button>
                    <button onclick="GeneticsLab.switchTab('acquired')" class="sim-tab-btn ${this.state.tab === 'acquired' ? 'active' : ''}">🏋️ Acquired (Learned)</button>
                </div>
            </div>
            
            <!-- Challenge Bar -->
            <div style="background: #e0f2fe; border-bottom: 2px solid #bae6fd; padding: 10px 20px; text-align: center;">
                <h4 style="margin: 0; color: #0369a1;">🎯 Mission: ${challenge.text}</h4>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #0c4a6e;">💡 ${challenge.hint}</p>
                <div style="width: 100%; height: 6px; background: #e2e8f0; margin-top: 10px; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: #0ea5e9; transition: width 0.5s;"></div>
                </div>
            </div>

            <div style="display: flex; height: 55vh; padding: 1rem; gap: 2rem; justify-content: center;">
                <!-- Monster Preview -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; border-radius: 16px; border: 2px dashed #cbd5e1; position: relative;">
                    <h3 style="color: #64748b; margin-bottom: 1rem;">Your Monster</h3>
                    
                    <div id="monster-preview" style="position: relative; width: 200px; height: 200px; transition: all 0.5s;">
                        <!-- Body -->
                        <div id="m-body" style="width: 100%; height: 100%; border-radius: 40px; background: ${this.state.tan ? '#d97706' : this.state.color}; transition: background 0.5s; position: relative; overflow: visible;">
                            
                            <!-- Eyes -->
                            <div id="m-eyes" style="position: absolute; top: 30%; width: 100%; display: flex; justify-content: center; gap: 10px;">
                                ${this.getEyesHTML()}
                            </div>

                            <!-- Mouth -->
                            <div style="position: absolute; bottom: 20%; left: 50%; transform: translateX(-50%); width: 60px; height: 20px; background: #333; border-radius: 0 0 20px 20px;"></div>

                            <!-- Horns -->
                            ${this.getHornsHTML()}

                            <!-- Scar (Acquired) -->
                            ${this.state.scar ? '<div style="position: absolute; top: 60%; left: 20%; font-size: 2rem;">🩹</div>' : ''}
                            
                            <!-- Skill (Acquired) -->
                            ${this.getSkillHTML()}
                        </div>
                    </div>

                    <!-- Success Overlay -->
                    ${this.state.completed ? `
                    <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16px; animation: popIn 0.5s ease;">
                        <div style="font-size: 4rem;">🎉</div>
                        <h2 style="color: #16a34a;">Match Found!</h2>
                        <button onclick="GeneticsLab.nextChallenge()" class="sim-btn" style="background: #16a34a; color: white; margin-top: 1rem;">Next Level ➡</button>
                    </div>
                    ` : ''}

                </div>

                <!-- Controls -->
                <div style="flex: 1; background: white; padding: 1rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    ${this.state.tab === 'inherited' ? this.renderInheritedControls() : this.renderAcquiredControls()}
                </div>
            </div>
        `;

        if (!document.getElementById('anim-style')) {
            const s = document.createElement('style');
            s.id = 'anim-style';
            s.innerHTML = `@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }`;
            document.head.appendChild(s);
        }

        this.checkValues();
    },

    switchTab(tab) {
        this.state.tab = tab;
        this.renderTabs();
    },

    /* --- HTML Helpers --- */
    getEyesHTML() {
        let eyes = '';
        for (let i = 0; i < this.state.eyes; i++) {
            eyes += `<div style="width: 30px; height: 30px; background: white; border-radius: 50%; border: 3px solid #333; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 10px; height: 10px; background: black; border-radius: 50%;"></div>
                     </div>`;
        }
        return eyes;
    },

    getHornsHTML() {
        if (this.state.horns == 0) return '';
        if (this.state.horns == 1) return '<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 40px solid #fcd34d;"></div>'; // Unicorn
        if (this.state.horns == 2) return `
            <div style="position: absolute; top: -20px; left: 10px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 30px solid #fcd34d; transform: rotate(-20deg);"></div>
            <div style="position: absolute; top: -20px; right: 10px; width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 30px solid #fcd34d; transform: rotate(20deg);"></div>
        `;
        return '';
    },

    getSkillHTML() {
        if (!this.state.skill) return '';
        if (this.state.skill === 'music') return '<div style="position: absolute; bottom: -10px; right: -20px; font-size: 3rem;">🎸</div>';
        if (this.state.skill === 'cooking') return '<div style="position: absolute; bottom: -10px; right: -20px; font-size: 3rem;">🍳</div>';
        if (this.state.skill === 'sports') return '<div style="position: absolute; bottom: -10px; right: -20px; font-size: 3rem;">🏀</div>';
        return '';
    },

    /* --- Controls Renderers --- */
    renderInheritedControls() {
        return `
            <h3 style="color: #3b82f6;">🧬 Inherited Traits (DNA)</h3>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">These traits come from the parents and are determined before birth.</p>
            
            <div class="control-group">
                <label>Fur Color (Genetics)</label>
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button onclick="GeneticsLab.setTrait('color', '#8b5cf6')" style="width: 30px; height: 30px; background: #8b5cf6; border-radius: 50%; border: 2px solid #ddd; cursor: pointer; ${this.state.color === '#8b5cf6' ? 'box-shadow: 0 0 0 3px #bfdbfe;' : ''}"></button>
                    <button onclick="GeneticsLab.setTrait('color', '#ef4444')" style="width: 30px; height: 30px; background: #ef4444; border-radius: 50%; border: 2px solid #ddd; cursor: pointer; ${this.state.color === '#ef4444' ? 'box-shadow: 0 0 0 3px #bfdbfe;' : ''}"></button>
                    <button onclick="GeneticsLab.setTrait('color', '#10b981')" style="width: 30px; height: 30px; background: #10b981; border-radius: 50%; border: 2px solid #ddd; cursor: pointer; ${this.state.color === '#10b981' ? 'box-shadow: 0 0 0 3px #bfdbfe;' : ''}"></button>
                </div>
            </div>

            <div class="control-group" style="margin-top: 1.5rem;">
                <label>Eye Count</label>
                <input type="range" min="1" max="3" value="${this.state.eyes}" oninput="GeneticsLab.setTrait('eyes', this.value)" style="width: 100%;">
                <div style="text-align: right; color: #666;">${this.state.eyes} Eyes</div>
            </div>

            <div class="control-group" style="margin-top: 1.5rem;">
                <label>Horns</label>
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button class="sim-btn ${this.state.horns == 0 ? 'active' : ''}" onclick="GeneticsLab.setTrait('horns', 0)">None</button>
                    <button class="sim-btn ${this.state.horns == 1 ? 'active' : ''}" onclick="GeneticsLab.setTrait('horns', 1)">Unicorn</button>
                    <button class="sim-btn ${this.state.horns == 2 ? 'active' : ''}" onclick="GeneticsLab.setTrait('horns', 2)">Devil</button>
                </div>
            </div>
        `;
    },

    renderAcquiredControls() {
        return `
            <h3 style="color: #d97706;">🏋️ Acquired Traits (Environment)</h3>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">These traits are learned or happen during the monster's life.</p>
            
            <div class="control-group">
                <label>Learn a Skill</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
                    <button class="sim-btn ${this.state.skill === 'music' ? 'active' : ''}" onclick="GeneticsLab.setTrait('skill', 'music')">🎸 Guitar</button>
                    <button class="sim-btn ${this.state.skill === 'cooking' ? 'active' : ''}" onclick="GeneticsLab.setTrait('skill', 'cooking')">🍳 Cooking</button>
                    <button class="sim-btn ${this.state.skill === 'sports' ? 'active' : ''}" onclick="GeneticsLab.setTrait('skill', 'sports')">🏀 Sports</button>
                    <button class="sim-btn ${!this.state.skill ? 'active' : ''}" onclick="GeneticsLab.setTrait('skill', null)">❌ None</button>
                </div>
            </div>

            <div class="control-group" style="margin-top: 1.5rem;">
                <label>Environment Events</label>
                <div style="margin-top: 5px;">
                    <button class="sim-btn ${this.state.tan ? 'active' : ''}" onclick="GeneticsLab.toggleTrait('tan')" style="width: 100%; margin-bottom: 0.5rem; text-align: left;">
                        ☀️ Go to the Beach (Get Tan) ${this.state.tan ? '✅' : ''}
                    </button>
                    <button class="sim-btn ${this.state.scar ? 'active' : ''}" onclick="GeneticsLab.toggleTrait('scar')" style="width: 100%; text-align: left;">
                        🩹 Fall off Skateboard (Get Scar) ${this.state.scar ? '✅' : ''}
                    </button>
                </div>
            </div>
        `;
    },

    setTrait(key, value) {
        this.state[key] = value;
        this.renderTabs(); // Loops back to checkValues
    },

    toggleTrait(key) {
        this.state[key] = !this.state[key];
        this.renderTabs(); // Loops back to checkValues
    },

    checkValues() {
        if (this.state.completed) return; // Already done

        const currentChallenge = this.challenges[this.state.currentChallengeIndex];
        if (currentChallenge.check(this.state)) {
            // Success!
            this.state.completed = true;
            this.renderTabs(); // Re-render to show success overlay
        }
    },

    nextChallenge() {
        this.state.currentChallengeIndex++;
        if (this.state.currentChallengeIndex >= this.challenges.length) {
            this.state.currentChallengeIndex = 0; // Loop or Finish? Let's loop for now
            alert("All Challenges Completed! Restarting.");
        }
        this.state.completed = false;
        // Reset monster? Maybe keep it.
        this.renderTabs();
    },

    start() { },
    stop() { }
};


/* --- 5. Microbiology Lab (Viruses vs Bacteria) --- */
const MicrobiologyLab = {
    state: {
        slide: 'blood', // 'blood', 'pond', 'soil'
        zoom: 1, // 1x, 10x, 100x
        focus: 50, // 0-100
        identified: [] // ['flu', 'strep']
    },
    container: null,

    render(container) {
        this.container = container;
        this.state = { slide: 'blood', zoom: 1, focus: 50, identified: [] };
        this.renderUI();
    },

    renderUI() {
        this.container.innerHTML = `
            <div class="sim-header">
                <h2>🔬 Microbiology Lab: Pathogens</h2>
                <p>Zoom in to identify the pathogen causing the illness!</p>
            </div>
            
            <div style="display: flex; gap: 1rem; height: 65vh; padding: 1rem;">
                
                <!-- Microscope View -->
                <div style="flex: 2; display: flex; flex-direction: column; align-items: center;">
                    <div id="microscope-view" style="
                        width: 400px; height: 400px; 
                        border-radius: 50%; 
                        border: 20px solid #334155; 
                        background: #fecaca; 
                        position: relative; 
                        overflow: hidden; 
                        box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
                        cursor: crosshair;
                    ">
                        <!-- Content rendered by updateView -->
                        <div id="slide-content" style="width: 100%; height: 100%; position: absolute; transition: transform 0.5s;"></div>
                        
                        <!-- Crosshair -->
                        <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: rgba(0,255,0,0.3); pointer-events: none;"></div>
                        <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 100%; background: rgba(0,255,0,0.3); pointer-events: none;"></div>
                    </div>

                    <!-- Controls -->
                    <div style="margin-top: 1rem; display: flex; gap: 2rem; align-items: center; background: #e2e8f0; padding: 1rem; border-radius: 12px;">
                        <div>
                            <label>🔎 Zoom Level</label><br>
                            <div style="display: flex; gap: 5px; margin-top: 5px;">
                                <button class="sim-btn" onclick="MicrobiologyLab.setZoom(1)">1x</button>
                                <button class="sim-btn" onclick="MicrobiologyLab.setZoom(10)">40x</button>
                                <button class="sim-btn" onclick="MicrobiologyLab.setZoom(100)">100x</button>
                            </div>
                        </div>
                        <div>
                            <label>⚙️ Focus Knob</label><br>
                            <input type="range" min="0" max="100" value="50" oninput="MicrobiologyLab.setFocus(this.value)">
                        </div>
                    </div>
                </div>

                <!-- Lab Notebook / Slide Tray -->
                <div style="flex: 1; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow-y: auto;">
                    <h3>📂 Case Files</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 2rem;">
                        <button onclick="MicrobiologyLab.loadSlide('blood')" class="sim-btn" style="text-align: left; border-left: 5px solid #ef4444;">
                            🩸 <b>Patient A (Blood)</b><br>
                            <small>Symptoms: High Fever, Body Aches</small>
                        </button>
                        <button onclick="MicrobiologyLab.loadSlide('pond')" class="sim-btn" style="text-align: left; border-left: 5px solid #22c55e;">
                            💧 <b>Pond Water sample</b><br>
                            <small>Source: Local Park Lake</small>
                        </button>
                        <button onclick="MicrobiologyLab.loadSlide('swab')" class="sim-btn" style="text-align: left; border-left: 5px solid #f59e0b;">
                            🧴 <b>Throat Swab</b><br>
                            <small>Symptoms: Sore Throat</small>
                        </button>
                    </div>

                    <h3>📝 Observations</h3>
                    <div id="notebook-entry" style="font-family: monospace; color: #475569; font-size: 0.9rem;">
                        No pathogen selected.
                    </div>
                </div>
            </div>
        `;
        this.updateView();
    },

    loadSlide(type) {
        this.state.slide = type;
        this.state.zoom = 1;
        this.state.focus = 50;
        this.state.identified = [];
        this.renderUI();
    },

    setZoom(level) {
        this.state.zoom = level;
        this.updateView();
    },

    setFocus(val) {
        this.state.focus = parseInt(val);
        const content = document.getElementById('slide-content');
        if (content) {
            // Blur logic: Optimal focus is 50.
            const blur = Math.abs(50 - this.state.focus) / 5;
            content.style.filter = `blur(${blur}px)`;
        }
    },

    updateView() {
        const content = document.getElementById('slide-content');
        if (!content) return;

        content.innerHTML = '';
        const z = this.state.zoom;

        // Background Color based on slide
        if (this.state.slide === 'blood') content.style.background = '#fee2e2'; // Reddish
        if (this.state.slide === 'pond') content.style.background = '#dcfce7'; // Greenish
        if (this.state.slide === 'swab') content.style.background = '#f1f5f9'; // Grayish

        // Generate Pathogens based on Zoom Level
        if (z === 1) {
            content.style.display = 'flex';
            content.style.alignItems = 'center';
            content.style.justifyContent = 'center';
            content.innerHTML = `<div style="font-size: 1.2rem; color: #999;">(Sample Visible - Zoom In)</div>`;
        }
        else if (z === 10) {
            // Cells visible
            this.generateCells(content);
        }
        else if (z === 100) {
            // Pathogens visible
            this.generatePathogens(content);
        }
    },

    generateCells(container) {
        // Just abstract blobs
        for (let i = 0; i < 20; i++) {
            const d = document.createElement('div');
            d.style.position = 'absolute';
            d.style.left = Math.random() * 350 + 'px';
            d.style.top = Math.random() * 350 + 'px';
            d.style.width = '40px';
            d.style.height = '40px';
            d.style.borderRadius = '50%';
            d.style.opacity = '0.5';

            if (this.state.slide === 'blood') d.style.background = '#ef4444'; // RBC
            else if (this.state.slide === 'pond') d.style.background = '#22c55e'; // Algae
            else d.style.background = '#94a3b8'; // Epithelial

            container.appendChild(d);
        }
    },

    generatePathogens(container) {
        // Clear first
        container.innerHTML = '';

        let pathogens = [];

        if (this.state.slide === 'blood') {
            // Flu Virus
            pathogens.push({ type: 'virus', name: 'Influenza Virus', icon: '🦠', color: 'purple', info: 'Needs a host cell to replicate. Antibiotics do not work!' });
        }
        else if (this.state.slide === 'swab') {
            // Strep Bacteria
            pathogens.push({ type: 'bacteria', name: 'Streptococcus', icon: '🐛', color: 'orange', info: 'Living single-celled organism. Treatable with antibiotics.' });
        }
        else if (this.state.slide === 'pond') {
            // Amoeba/Parasite
            pathogens.push({ type: 'parasite', name: 'Amoeba', icon: '🐙', color: 'green', info: 'Single-celled eukaryote. Hunts for food.' });
        }

        // Add correct pathogens
        for (let i = 0; i < 5; i++) {
            const pData = pathogens[0];
            const p = document.createElement('div');
            p.innerText = pData.icon;
            p.style.fontSize = '3rem';
            p.style.position = 'absolute';
            p.style.left = Math.random() * 300 + 50 + 'px';
            p.style.top = Math.random() * 300 + 50 + 'px';
            p.style.cursor = 'pointer';
            p.style.animation = 'float 3s infinite ease-in-out';

            p.onclick = () => {
                this.identify(pData);
            };

            container.appendChild(p);
        }

        // Add some deco RBCs/Cells in background
        for (let i = 0; i < 10; i++) {
            const d = document.createElement('div');
            d.style.position = 'absolute';
            d.style.zIndex = '-1';
            d.style.left = Math.random() * 400 + 'px';
            d.style.top = Math.random() * 400 + 'px';
            d.style.width = '80px';
            d.style.height = '80px';
            d.style.borderRadius = '50%';
            d.style.opacity = '0.2';
            d.style.background = (this.state.slide === 'blood' ? 'red' : 'gray');
            container.appendChild(d);
        }
    },

    identify(data) {
        const nb = document.getElementById('notebook-entry');
        if (nb) {
            nb.innerHTML = `
                <div style="background: #eff6ff; padding: 10px; border-left: 4px solid #3b82f6;">
                    <h4 style="margin: 0; color: #1e3a8a;">${data.name} Identified!</h4>
                    <p><b>Type:</b> ${data.type.toUpperCase()}</p>
                    <p>${data.info}</p>
                    <button class="sim-btn" style="margin-top:5px; font-size:0.8rem;" onclick="alert('Lab Report Saved!')">💾 Save to Report</button>
                </div>
            `;
        }
    },

    start() { },
    stop() { }
};

/* --- 6. Earth History Lab (Fossils & Rock Layers) --- */
const EarthHistoryLab = {
    state: {
        draggedItem: null
    },
    container: null,

    render(container) {
        this.container = container;
        this.renderUI();
    },

    renderUI() {
        this.container.innerHTML = `
            <div class="sim-header">
                <h2>🦕 Earth History: Law of Superposition</h2>
                <p>Drag fossils to the correct rock layer based on their age!</p>
            </div>
            
            <div style="display: flex; gap: 2rem; height: 60vh; padding: 1rem; align-items: flex-start;">
                
                <!-- Rock Layers (Drop Zones) -->
                <div style="flex: 2; display: flex; flex-direction: column-reverse; border: 4px solid #475569; width: 100%; height: 100%; background: #e2e8f0; position: relative;">
                    <!-- Ruler -->
                    <div style="position: absolute; left: -40px; height: 100%; display: flex; flex-direction: column-reverse; justify-content: space-around; color: #64748b; font-size: 0.8rem;">
                        <span>Oldest</span>
                        <span>Old</span>
                        <span>New</span>
                        <span>Newest</span>
                    </div>

                    <!-- Layers -->
                    <div class="rock-layer" id="layer-1" ondrop="EarthHistoryLab.drop(event)" ondragover="EarthHistoryLab.allowDrop(event)" style="flex: 1; background: #78350f; border-bottom: 2px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; position: relative;">
                        <span style="position: absolute; left: 10px; color: rgba(255,255,255,0.5);">Layer 1 (Deepest)</span>
                    </div>
                    <div class="rock-layer" id="layer-2" ondrop="EarthHistoryLab.drop(event)" ondragover="EarthHistoryLab.allowDrop(event)" style="flex: 1; background: #b45309; border-bottom: 2px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; position: relative;">
                        <span style="position: absolute; left: 10px; color: rgba(255,255,255,0.5);">Layer 2</span>
                    </div>
                    <div class="rock-layer" id="layer-3" ondrop="EarthHistoryLab.drop(event)" ondragover="EarthHistoryLab.allowDrop(event)" style="flex: 1; background: #d97706; border-bottom: 2px dashed rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; position: relative;">
                        <span style="position: absolute; left: 10px; color: rgba(255,255,255,0.5);">Layer 3</span>
                    </div>
                    <div class="rock-layer" id="layer-4" ondrop="EarthHistoryLab.drop(event)" ondragover="EarthHistoryLab.allowDrop(event)" style="flex: 1; background: #fcd34d; display: flex; align-items: center; justify-content: center; position: relative;">
                        <span style="position: absolute; left: 10px; color: rgba(0,0,0,0.3);">Layer 4 (Surface)</span>
                    </div>
                </div>

                <!-- Fossil Collection (Draggables) -->
                <div style="flex: 1; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3>🦴 Fossil Collection</h3>
                    <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1rem;">Drag these to where they belong!</p>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        <div draggable="true" ondragstart="EarthHistoryLab.drag(event)" id="fossil-dino" data-age="oldest" class="sim-fossil" style="font-size: 2.5rem; cursor: grab;">🦖</div>
                        <div draggable="true" ondragstart="EarthHistoryLab.drag(event)" id="fossil-shell" data-age="old" class="sim-fossil" style="font-size: 2.5rem; cursor: grab;">🐚</div>
                        <div draggable="true" ondragstart="EarthHistoryLab.drag(event)" id="fossil-fish" data-age="new" class="sim-fossil" style="font-size: 2.5rem; cursor: grab;">🐟</div>
                        <div draggable="true" ondragstart="EarthHistoryLab.drag(event)" id="fossil-mammal" data-age="newest" class="sim-fossil" style="font-size: 2.5rem; cursor: grab;">🐅</div>
                    </div>

                    <div id="history-feedback" style="margin-top: 2rem; padding: 1rem; background: #f1f5f9; border-radius: 8px; font-size: 0.9rem;">
                        Feedback will appear here.
                    </div>
                    
                    <button onclick="EarthHistoryLab.reset()" class="sim-btn" style="margin-top: 1rem; width: 100%; background: #cbd5e1;">↺ Reset</button>
                </div>
            </div>
        `;
    },

    allowDrop(ev) {
        ev.preventDefault();
        ev.target.style.background = "#fff"; // Temporary highlight
        setTimeout(() => {
            // Restore original colors roughly (hacky but works for visual feedback)
            if (ev.target.id.includes('layer-1')) ev.target.style.background = '#78350f';
            if (ev.target.id.includes('layer-2')) ev.target.style.background = '#b45309';
            if (ev.target.id.includes('layer-3')) ev.target.style.background = '#d97706';
            if (ev.target.id.includes('layer-4')) ev.target.style.background = '#fcd34d';
        }, 300);
    },

    drag(ev) {
        ev.dataTransfer.setData("text", ev.target.id);
        this.state.draggedItem = ev.target.id;
    },

    drop(ev) {
        ev.preventDefault();
        const data = ev.dataTransfer.getData("text");
        const el = document.getElementById(data);
        const target = ev.target; // The layer

        if (!target.classList.contains('rock-layer')) return;

        // Visual Move
        target.appendChild(el);
        el.style.cursor = 'default';
        el.draggable = false;

        // Validation Logic
        const fossilAge = el.getAttribute('data-age'); // oldest, old, new, newest
        const layerId = target.id; // layer-1 (oldest) to layer-4 (newest)

        let correct = false;
        if (fossilAge === 'oldest' && layerId === 'layer-1') correct = true;
        if (fossilAge === 'old' && layerId === 'layer-2') correct = true;
        if (fossilAge === 'new' && layerId === 'layer-3') correct = true;
        if (fossilAge === 'newest' && layerId === 'layer-4') correct = true;

        const fb = document.getElementById('history-feedback');
        if (correct) {
            fb.innerHTML = `<span style="color: green;">✅ Correct!</span> The fossil matched the layer's age.`;
            fb.style.background = "#dcfce7";
            target.style.border = "2px solid #22c55e";
        } else {
            fb.innerHTML = `<span style="color: red;">❌ Incorrect.</span> Remember: Newer layers are on TOP.`;
            fb.style.background = "#fee2e2";
            setTimeout(() => {
                // Reset item back to tray
                this.renderUI();
            }, 1500);
        }
    },

    reset() {
        this.renderUI();
    },

    start() { },
    stop() { }
};

/* --- 7. Ecosystems Lab (Food Web) --- */
const EcosystemsLab = {
    state: {
        connections: [], // [{from: 'grass', to: 'rabbit'}]
        score: 0
    },
    container: null,

    render(container) {
        this.container = container;
        this.state.connections = [];
        this.state.score = 0;
        this.renderUI();
    },

    renderUI() {
        this.container.innerHTML = `
            <div class="sim-header">
                <h2>🕸️ Ecosystems: Food Web Balance</h2>
                <p>Connect the organisms to create a balanced food web! (Click Producer -> Click Consumer)</p>
            </div>
            
            <div style="display: flex; gap: 2rem; height: 65vh; padding: 1rem;">
                
                <!-- Canvas Area -->
                <div id="eco-canvas" style="flex: 2; position: relative; background: #ecfccb; border: 4px solid #84cc16; border-radius: 12px; overflow: hidden;">
                    <!-- Organisms placed absolutely -->
                    <div id="org-sun" class="eco-node" onclick="EcosystemsLab.clickNode('sun')" style="top: 20px; left: 20px; background: #fde047;">☀️ Sun</div>
                    
                    <div id="org-grass" class="eco-node" onclick="EcosystemsLab.clickNode('grass')" style="top: 150px; left: 50px; background: #bef264;">🌿 Grass</div>
                    <div id="org-tree" class="eco-node" onclick="EcosystemsLab.clickNode('tree')" style="top: 100px; left: 150px; background: #22c55e;">🌳 Tree</div>
                    
                    <div id="org-rabbit" class="eco-node" onclick="EcosystemsLab.clickNode('rabbit')" style="top: 250px; left: 250px; background: #e5e7eb;">🐇 Rabbit</div>
                    <div id="org-deer" class="eco-node" onclick="EcosystemsLab.clickNode('deer')" style="top: 180px; left: 350px; background: #b45309; color: white;">🦌 Deer</div>
                    
                    <div id="org-wolf" class="eco-node" onclick="EcosystemsLab.clickNode('wolf')" style="top: 350px; left: 450px; background: #475569; color: white;">🐺 Wolf</div>
                    
                    <div id="org-fungi" class="eco-node" onclick="EcosystemsLab.clickNode('fungi')" style="top: 400px; left: 100px; background: #78350f; color: white;">🍄 Fungi</div>

                    <!-- SVG Lines Layer -->
                    <svg id="eco-lines" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; z-index: 0;"></svg>
                </div>

                <!-- Info Panel -->
                <div style="flex: 1; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3>🔗 Connections</h3>
                    <div id="connection-list" style="height: 200px; overflow-y: auto; background: #f8fafc; padding: 5px; margin-bottom: 10px; border: 1px solid #cbd5e1;">
                        <p style="color: #94a3b8; font-size: 0.8rem;">No connections yet.</p>
                    </div>

                    <div id="eco-feedback" style="padding: 1rem; background: #f0f9ff; border-radius: 8px; font-size: 0.9rem; margin-bottom: 1rem;">
                        Select a source (Producer), then a target (Consumer).
                    </div>
                    
                    <button onclick="EcosystemsLab.checkBalance()" class="sim-btn" style="width: 100%; background: #22c55e; margin-bottom: 5px;">✅ Check Balance</button>
                    <button onclick="EcosystemsLab.reset()" class="sim-btn" style="width: 100%; background: #ef4444;">↺ Reset Web</button>
                </div>
            </div>
            
            <style>
                .eco-node {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                    z-index: 2;
                    transition: transform 0.2s;
                    border: 2px solid white;
                }
                .eco-node:hover { transform: scale(1.1); }
                .eco-node.selected { border: 4px solid #3b82f6; transform: scale(1.1); }
            </style>
        `;
    },

    selectedNode: null,

    clickNode(id) {
        const el = document.getElementById('org-' + id);

        if (!this.selectedNode) {
            // Select Source
            this.selectedNode = id;
            el.classList.add('selected');
            document.getElementById('eco-feedback').innerHTML = `Selected <b>${id}</b>. Now click who eats it (or gets energy from it).`;
        } else {
            // Select Target
            if (this.selectedNode === id) {
                // Deselect
                this.selectedNode = null;
                el.classList.remove('selected');
                document.getElementById('eco-feedback').innerHTML = "Selection cancelled.";
                return;
            }

            this.addConnection(this.selectedNode, id);

            // Cleanup UI
            document.getElementById('org-' + this.selectedNode).classList.remove('selected');
            this.selectedNode = null;
        }
    },

    addConnection(from, to) {
        // Check duplicate
        if (this.state.connections.find(c => c.from === from && c.to === to)) {
            document.getElementById('eco-feedback').innerHTML = "❌ Connection already exists.";
            return;
        }

        // PREVENT REVERSE CONNECTIONS (Pedagogical Fix)
        // We want Energy Flow: Eaten -> Eater
        // If user tries: Eater -> Eaten (e.g., Deer -> Tree), warn them.

        // Simple Trophic Levels map
        const level = {
            'sun': 0,
            'grass': 1, 'tree': 1, 'fungi': 1, // Decomposers like Fungi are special, but for valid links...
            'rabbit': 2, 'deer': 2,
            'wolf': 3
        };

        // If 'from' level is higher than 'to' level, it's likely backwards (except decomposers)
        // Exception: Wolf -> Fungi is valid (3 -> 1 technically if Fungi eats dead wolf)
        // But Deer (2) -> Tree (1) is definitely wrong.

        if (level[from] > level[to] && to !== 'fungi') {
            document.getElementById('eco-feedback').innerHTML = `
                ⚠️ <b>Wait!</b> Does <b>${to}</b> eat <b>${from}</b>?<br>
                The arrow shows <b>Energy Flow</b>.<br>
                It should go: <b>Biomass (Food) ➔ Eater</b>.
            `;
            return;
        }

        this.state.connections.push({ from, to });
        this.renderLines();
        this.updateList();
        document.getElementById('eco-feedback').innerHTML = `🔗 Connected: <b>${from}</b> ➔ <b>${to}</b>`;
    },

    renderLines() {
        const svg = document.getElementById('eco-lines');
        svg.innerHTML = ''; // Clear

        this.state.connections.forEach(c => {
            const el1 = document.getElementById('org-' + c.from);
            const el2 = document.getElementById('org-' + c.to);

            // Get centers
            const rect1 = el1.getBoundingClientRect();
            const rect2 = el2.getBoundingClientRect();
            const parent = document.getElementById('eco-canvas').getBoundingClientRect();

            const x1 = rect1.left + rect1.width / 2 - parent.left;
            const y1 = rect1.top + rect1.height / 2 - parent.top;
            const x2 = rect2.left + rect2.width / 2 - parent.left;
            const y2 = rect2.top + rect2.height / 2 - parent.top;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#475569');
            line.setAttribute('stroke-width', '3');
            line.setAttribute('marker-end', 'url(#arrow)');

            svg.appendChild(line);
        });

        // Add Arrow Marker
        if (!document.getElementById('arrow-marker-def')) {
            svg.innerHTML += `
                <defs id="arrow-marker-def">
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="25" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
                    </marker>
                </defs>
            `;
        }
    },

    updateList() {
        const list = document.getElementById('connection-list');
        list.innerHTML = this.state.connections.map(c =>
            `<div style="padding: 2px; border-bottom: 1px solid #eee;">${c.from} ➔ ${c.to}</div>`
        ).join('');
        // Auto scroll
        list.scrollTop = list.scrollHeight;
    },

    checkBalance() {
        // Simple logic for 5th grade
        // Correct relations:
        // Sun -> Grass, Sun -> Tree
        // Grass -> Rabbit, Grass -> Deer
        // Tree -> Deer
        // Rabbit -> Wolf, Deer -> Wolf (Wolf eats both)
        // Wolf -> Fungi, Tree -> Fungi (Decomposers)

        const correctMap = [
            'sun-grass', 'sun-tree',
            'grass-rabbit', 'grass-deer',
            'tree-deer',
            'rabbit-wolf', 'deer-wolf'
        ];

        let correctCount = 0;
        let incorrectCount = 0;

        this.state.connections.forEach(c => {
            const key = `${c.from}-${c.to}`;
            if (correctMap.includes(key)) {
                correctCount++;
            } else if (c.to === 'fungi') {
                // Bonus for decomposers
                correctCount++;
            } else {
                incorrectCount++;
            }
        });

        const fb = document.getElementById('eco-feedback');

        if (correctCount >= 5 && incorrectCount === 0) {
            fb.innerHTML = `<span style="color:green; font-weight:bold;">Example Ecosystem Stable!</span><br>Good energy flow found.`;
            fb.style.background = "#dcfce7";

            // Celebration
            if (!this.state.completed) {
                const canvas = document.getElementById('eco-canvas');
                canvas.style.border = "4px solid gold";
                canvas.innerHTML += `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:5rem; animation:popIn 0.5s;">🌟</div>`;
                this.state.completed = true;
            }

        } else if (incorrectCount > 0) {
            fb.innerHTML = `<b>Unstable!</b> You have ${incorrectCount} incorrect connection(s).<br>Make sure animals eat the right food.`;
            fb.style.background = "#fee2e2";
        } else {
            fb.innerHTML = `<b>Building...</b> You have ${correctCount} connections.<br>An ecosystem needs more interactions (at least 5) to be stable!`;
            fb.style.background = "#fff7ed"; // Orange warning
        }
    },

    reset() {
        this.render(this.container);
    },

    start() { },
    stop() { }
};

/* --- 8. Hydrosphere Lab (Water Quality) --- */
const HydrosphereLab = {
    state: {
        sample: null, // 'ocean', 'river', 'tap'
        tool: null, // 'ph_strip', 'oxygen_meter', 'nitrate_test'
        results: {}
    },
    container: null,

    render(container) {
        this.container = container;
        this.state = { sample: null, tool: null, results: {} };
        this.renderUI();
    },

    renderUI() {
        this.container.innerHTML = `
            <div class="sim-header">
                <h2>🌊 Hydrosphere: Water Quality Testing</h2>
                <p>Select a water source and test its health parameters!</p>
            </div>
            
            <div style="display: flex; gap: 2rem; height: 65vh; padding: 1rem;">
                
                <!-- Samples -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
                    <h3>1. Select Water Source</h3>
                    
                    <div onclick="HydrosphereLab.selectSample('ocean')" class="sim-card ${this.state.sample === 'ocean' ? 'selected' : ''}" style="cursor: pointer; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 8px;">
                        🌊 <b>Ocean Water</b>
                        <div style="font-size: 0.8rem; color: #64748b;">(Atlantic Coast)</div>
                    </div>
                    
                    <div onclick="HydrosphereLab.selectSample('river')" class="sim-card ${this.state.sample === 'river' ? 'selected' : ''}" style="cursor: pointer; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 8px;">
                        🏞️ <b>River Water</b>
                        <div style="font-size: 0.8rem; color: #64748b;">(Near Factory)</div>
                    </div>
                    
                    <div onclick="HydrosphereLab.selectSample('tap')" class="sim-card ${this.state.sample === 'tap' ? 'selected' : ''}" style="cursor: pointer; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 8px;">
                        🚰 <b>Tap Water</b>
                        <div style="font-size: 0.8rem; color: #64748b;">(School Fountain)</div>
                    </div>
                </div>

                <!-- Testing Station -->
                <div style="flex: 2; background: #f1f5f9; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid #cbd5e1;">
                    <div id="beaker" style="width: 150px; height: 200px; border: 4px solid #475569; border-top: none; background: linear-gradient(to top, ${this.getWaterColor()} 80%, transparent 80%); border-radius: 0 0 20px 20px; position: relative; margin-bottom: 2rem; transition: background 0.5s;">
                        <span style="position: absolute; bottom: 10px; width: 100%; text-align: center; color: rgba(255,255,255,0.7); font-weight: bold;">
                            ${this.state.sample ? this.state.sample.toUpperCase() : 'EMPTY'}
                        </span>
                    </div>

                    <h3>2. Use a Test Tool</h3>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="HydrosphereLab.test('ph')" class="sim-btn" ${!this.state.sample ? 'disabled' : ''} style="background: #f472b6;">🧪 pH Strip</button>
                        <button onclick="HydrosphereLab.test('do')" class="sim-btn" ${!this.state.sample ? 'disabled' : ''} style="background: #38bdf8;">🫧 Oxygen Meter</button>
                        <button onclick="HydrosphereLab.test('nitrate')" class="sim-btn" ${!this.state.sample ? 'disabled' : ''} style="background: #facc15;">🚜 Nitrate Test</button>
                    </div>
                </div>

                <!-- Results -->
                <div style="flex: 1; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h3>📊 Lab Report</h3>
                    <div id="hydro-report">
                        ${this.renderReport()}
                    </div>
                    <button onclick="HydrosphereLab.analyze()" class="sim-btn" style="margin-top: 2rem; width: 100%; background: #3b82f6;">🧠 Analyze Health</button>
                </div>
            </div>
            
            <style>
                .sim-card.selected { border-color: #3b82f6 !important; background: #eff6ff; }
            </style>
        `;
    },

    getWaterColor() {
        if (!this.state.sample) return 'transparent';
        if (this.state.sample === 'ocean') return '#0ea5e9'; // Blue
        if (this.state.sample === 'river') return '#94a3b8'; // Murky
        if (this.state.sample === 'tap') return '#e0f2fe'; // Clear
        return 'transparent';
    },

    selectSample(s) {
        this.state.sample = s;
        this.state.results = {}; // Reset results on new sample
        this.renderUI();
    },

    test(tool) {
        if (!this.state.sample) return;

        // Mock Data
        let val = '';
        if (this.state.sample === 'ocean') {
            if (tool === 'ph') val = '8.1 (Basic)';
            if (tool === 'do') val = '7.5 mg/L (Good)';
            if (tool === 'nitrate') val = '0.5 ppm (Low)';
        }
        else if (this.state.sample === 'river') {
            if (tool === 'ph') val = '6.2 (Acidic)';
            if (tool === 'do') val = '3.0 mg/L (Critical)';
            if (tool === 'nitrate') val = '15.0 ppm (High - Runoff)';
        }
        else if (this.state.sample === 'tap') {
            if (tool === 'ph') val = '7.0 (Neutral)';
            if (tool === 'do') val = '9.0 mg/L (Excellent)';
            if (tool === 'nitrate') val = '0.0 ppm (None)';
        }

        this.state.results[tool] = val;
        this.renderUI();
    },

    renderReport() {
        if (Object.keys(this.state.results).length === 0) return '<p style="color:#94a3b8;">No tests run yet.</p>';

        let html = '<ul style="padding-left: 20px;">';
        if (this.state.results.ph) html += `<li><b>pH:</b> ${this.state.results.ph}</li>`;
        if (this.state.results.do) html += `<li><b>Dissolved O2:</b> ${this.state.results.do}</li>`;
        if (this.state.results.nitrate) html += `<li><b>Nitrates:</b> ${this.state.results.nitrate}</li>`;
        html += '</ul>';
        return html;
    },

    analyze() {
        if (!this.state.sample) return;
        let msg = "";
        if (this.state.sample === 'ocean') msg = "The ocean water is healthy! pH is stable and oxygen is good for marine life.";
        if (this.state.sample === 'river') msg = "⚠️ DANGER: This river is polluted! Low oxygen and high nitrates suggest fertilizer runoff and eutrophication.";
        if (this.state.sample === 'tap') msg = "Safe to drink! Neutral pH and no contaminants found.";

        alert("🔬 Analysis Result:\n\n" + msg);
    },

    start() { },
    stop() { }
};

/* --- 6. Generic Lab (Placeholder) --- */
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
