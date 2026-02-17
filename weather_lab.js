/* Weather Lab Simulation Logic */

const WeatherLab = {
    isOpen: false,
    interval: null,
    elements: {},
    state: {
        temperature: 20, // Initial temp (Celsius)
        vaporLevel: 0,
        cloudLevel: 0,
        rainLevel: 0
    },

    init() {
        if (document.getElementById('weather-lab-overlay')) return; // Already exists

        // Create Overlay
        const overlay = document.createElement('div');
        overlay.id = 'weather-lab-overlay';
        overlay.className = 'sim-overlay';
        overlay.style.display = 'none';

        overlay.innerHTML = `
            <div class="sim-container">
                <button class="sim-close-btn" onclick="WeatherLab.close()">❌ Close Lab</button>
                <div class="sim-header">
                    <h2>💧 Water Cycle Simulator</h2>
                    <p>Adjust the temperature to see how water changes state and creates weather!</p>
                </div>
                
                <div class="sim-scene" id="sim-scene">
                    <div class="sim-sky"></div>
                    <div class="sim-sun" id="sim-sun"></div>
                    <div class="sim-clouds" id="sim-clouds"></div>
                    <div class="sim-rain-container" id="sim-rain"></div>
                    <div class="sim-ocean" id="sim-ocean">
                        <div class="ocean-label">Ocean (Liquid)</div>
                    </div>
                    <div class="sim-vapor-container" id="sim-vapor"></div>
                </div>

                <div class="sim-controls">
                    <label>🌡️ Temperature: <span id="temp-val">20</span>°C</label>
                    <input type="range" id="temp-slider" min="-10" max="100" value="20" step="1">
                    <div class="sim-status" id="sim-status">Status: Normal conditions.</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bind Elements
        this.elements = {
            overlay: overlay,
            sun: document.getElementById('sim-sun'),
            clouds: document.getElementById('sim-clouds'),
            rain: document.getElementById('sim-rain'),
            vapor: document.getElementById('sim-vapor'),
            tempSlider: document.getElementById('temp-slider'),
            tempVal: document.getElementById('temp-val'),
            status: document.getElementById('sim-status'),
            scene: document.getElementById('sim-scene')
        };

        // Event Listeners
        this.elements.tempSlider.oninput = (e) => this.updateTemp(e.target.value);
    },

    open() {
        this.init();
        this.elements.overlay.style.display = 'flex';
        this.isOpen = true;
        this.startLoop();
    },

    close() {
        if (this.elements.overlay) {
            this.elements.overlay.style.display = 'none';
        }
        this.isOpen = false;
        this.stopLoop();
    },

    updateTemp(val) {
        this.state.temperature = parseInt(val);
        this.elements.tempVal.textContent = this.state.temperature;

        // Update Sun Visuals
        const sunIntensity = Math.max(0.4, (this.state.temperature + 10) / 110);
        this.elements.sun.style.opacity = sunIntensity;
        this.elements.sun.style.boxShadow = `0 0 ${this.state.temperature * 1.5}px orange`;

        // Update Background (Sky Color)
        if (this.state.temperature < 0) {
            this.elements.scene.style.background = 'linear-gradient(to bottom, #dbeafe, #eff6ff)'; // Icy/Cold
        } else if (this.state.temperature > 30) {
            this.elements.scene.style.background = 'linear-gradient(to bottom, #fef3c7, #fed7aa)'; // Warm/Hot
        } else {
            this.elements.scene.style.background = 'linear-gradient(to bottom, #bfdbfe, #dbeafe)'; // Normal
        }
    },

    startLoop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => this.tick(), 100); // 10 ticks per second
    },

    stopLoop() {
        clearInterval(this.interval);
        this.elements.vapor.innerHTML = '';
        this.elements.rain.innerHTML = '';
        this.elements.clouds.style.opacity = 0;
    },

    tick() {
        const T = this.state.temperature;

        // --- Logic Engine ---

        // 1. Evaporation (Requires heat > 10C, faster if hotter)
        if (T > 10) {
            // Chance to spawn vapor particle
            const evaporationRate = (T - 10) / 100; // 0.1 to 0.9 roughly
            if (Math.random() < evaporationRate) {
                this.spawnVapor();
                this.state.vaporLevel = Math.min(100, this.state.vaporLevel + 0.5);
            }
        } else {
            // Vapor dissipates if cold
            this.state.vaporLevel = Math.max(0, this.state.vaporLevel - 0.5);
        }

        // 2. Condensation (Vapor turns to clouds if vapor is high enough)
        if (this.state.vaporLevel > 20) {
            this.state.cloudLevel = Math.min(100, this.state.cloudLevel + 0.2);
        } else {
            this.state.cloudLevel = Math.max(0, this.state.cloudLevel - 0.1);
        }

        // 3. Precipitation (Rain if clouds are heavy/full and temp > 0)
        // Snow if temp <= 0
        if (this.state.cloudLevel > 60 && Math.random() < (this.state.cloudLevel / 200)) {
            this.spawnPrecipitation(T <= 0 ? 'snow' : 'rain');
        }

        // --- Visual Updates ---

        // Clouds Opacity/Darkness
        const cloudOpacity = this.state.cloudLevel / 100;
        this.elements.clouds.style.opacity = cloudOpacity;
        // Darker clouds if ready to rain
        const grayScale = 255 - (this.state.cloudLevel * 1.5);
        this.elements.clouds.style.filter = `brightness(${grayScale}%)`;

        // Status Text
        let status = "";
        if (T <= 0) status = "❄️ Freezing! Water is turning to ice. Low evaporation.";
        else if (T < 20) status = "☁️ Cool. Mild evaporation.";
        else if (T < 60) status = "☀️ Warm! Water is evaporating and forming clouds.";
        else status = "🔥 Hot! Rapid evaporation! Heavy rain likely.";

        if (this.state.cloudLevel > 60) status += " 🌧️ Raining!";

        this.elements.status.textContent = status;
    },

    spawnVapor() {
        const p = document.createElement('div');
        p.className = 'sim-particle vapor';
        p.style.left = Math.random() * 100 + '%';
        p.style.bottom = '10%'; // Start at ocean surface
        // Animation handled by CSS? Or JS. Let's use CSS animation for rising.
        this.elements.vapor.appendChild(p);

        // Remove after animation
        setTimeout(() => {
            if (p.parentNode) p.parentNode.removeChild(p);
        }, 3000);
    },

    spawnPrecipitation(type) {
        const p = document.createElement('div');
        p.className = `sim-particle ${type}`;
        p.style.left = Math.random() * 100 + '%';
        p.style.top = '10%'; // Start at cloud level
        this.elements.rain.appendChild(p);

        setTimeout(() => {
            if (p.parentNode) p.parentNode.removeChild(p);
        }, 2000);
    }
};
