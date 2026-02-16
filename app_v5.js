// Debug Services
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorBox = document.createElement('div');
    errorBox.style.position = 'fixed';
    errorBox.style.bottom = '0';
    errorBox.style.left = '0';
    errorBox.style.width = '100%';
    errorBox.style.background = 'red';
    errorBox.style.color = 'white';
    errorBox.style.padding = '10px';
    errorBox.style.zIndex = '10000';
    errorBox.innerHTML = `<strong>Error:</strong> ${msg} <br> at ${lineNo}:${columnNo}`;
    document.body.appendChild(errorBox);
    console.error(error);
    return false;
};

// STOP SPEECH ON LOAD (Fix for refresh issue)
if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
}
window.onbeforeunload = function () {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

const debugBanner = document.createElement('div');
debugBanner.style.position = 'fixed';
debugBanner.style.top = '0';
debugBanner.style.right = '0';
debugBanner.style.background = 'blue'; // New version color
debugBanner.style.color = 'white';
debugBanner.style.zIndex = '9999';
debugBanner.style.padding = '5px';
debugBanner.innerText = 'v5 REFACTORED';
document.body.appendChild(debugBanner);

// Application Constants
// secrets object is loaded from secrets.js

// pedagogicalData is handled by loader.js
const pedagogyData = window.pedagogyData;

// Application State
const state = {
    currentPhase: 'intro',
    currentGrade: null,
    currentStrand: null,
    currentQuestionIndex: 0,
    isListening: false,
    isSpeaking: false,
    voices: [],
    autoListen: false,
    currentDifficulty: "Medium", // Default difficulty
    consecutiveCorrect: 0,
    speechGenId: 0
};

// HYBRID CONFIGURATION
// Voice: False = Browser TTS (Free)
// Generation: False = Local Questions Only (Free)
// Chat: True = OpenAI Analysis (Paid but Cheap)
const appConfig = {
    useElevenLabs: false,
    useOpenAIGeneration: false,
    useOpenAIChat: true
};

// --- GLOBAL HELPER FUNCTIONS ---

function fallbackSpeak(text, callback) {
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    if (!state.voices || state.voices.length === 0) {
        state.voices = synth.getVoices();
    }

    const preferredVoice = state.voices.find(v =>
        v.name.includes('Zira') ||
        v.name.includes('Google US English') ||
        v.name.includes('Female')
    ) || state.voices.find(v => v.lang.includes('en'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log("Selected Voice:", preferredVoice.name);
    } else {
        console.log("Using Browser Default Voice");
    }

    utterance.onend = () => {
        if (callback) callback();
        // Access recognition reliably via window or state if needed
        if (state.wasAuto_temp && window.recognition) {
            try { window.recognition.start(); } catch (e) { }
        }
    };

    synth.speak(utterance);
}

async function speak(text, callback) {
    const robotEl = document.querySelector('.avatar-img');
    const synth = window.speechSynthesis;

    // Pre-process text for better pronunciation
    // Pre-process text for better pronunciation and natural flow
    let speechText = text
        .replace(/[\u00B0\u00BA]F/g, " degrees Fahrenheit")
        .replace(/[\u00B0\u00BA]C/g, " degrees Celsius")
        .replace(/(\d+)\s?F\b/g, "$1 degrees Fahrenheit")
        .replace(/(\d+)\s?C\b/g, "$1 degrees Celsius")
        .replace(/\bNC\b/g, "North Carolina")
        .replace(/\bvs\./g, "versus")
        .replace(/Awesome/g, "Great"); // Fix "Awesome" sounding like "Some"

    // Intelligently remove "Scientist" if it was just said recently (simple heuristic)
    // or if it appears at the end of a sentence too frequently.
    if (state.lastSpokenText && state.lastSpokenText.includes("Scientist") && speechText.includes("Scientist")) {
        // If we just said it, maybe remove it this time to be less repetitive
        // Only remove if it's a standalone address like ", Scientist" or "Scientist, "
        speechText = speechText.replace(/,\s*Scientist\b/gi, "").replace(/\bScientist,\s*/gi, "");
    }

    // Update last spoken text for next time
    state.lastSpokenText = speechText;

    console.log("Speaking:", speechText);

    if (!state.speechGenId) state.speechGenId = 0;
    state.speechGenId++;
    const myGenId = state.speechGenId;

    if (synth.speaking) synth.cancel();

    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }

    if (state.isListening && window.recognition) {
        state.wasAuto_temp = state.autoListen;
        window.recognition.stop();
    }

    state.isSpeaking = true;
    if (robotEl) robotEl.classList.add('speaking');

    if (!appConfig.useElevenLabs) {
        fallbackSpeak(speechText, callback);
        return;
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${secrets.elevenLabsVoiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': secrets.elevenLabsApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: `... ${speechText}`, // Add detailed pause for "Awesome" issue
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                    stability: 0.35,
                    similarity_boost: 0.8,
                    style: 0.5,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) throw new Error(`ElevenLabs API Error: ${response.status}`);
        const blob = await response.blob();
        if (myGenId !== state.speechGenId) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        state.currentAudio = audio;

        audio.onended = () => {
            if (state.currentAudio === audio) {
                state.isSpeaking = false;
                state.currentAudio = null;
                if (robotEl) robotEl.classList.remove('speaking');
                if (callback) callback();
                if (state.wasAuto_temp && window.recognition) {
                    setTimeout(() => { try { window.recognition.start(); } catch (e) { } }, 500);
                }
            }
        };

        if (robotEl) robotEl.classList.add('speaking');
        audio.play();

    } catch (error) {
        if (myGenId !== state.speechGenId) return;
        console.error("TTS Error:", error);
        state.isSpeaking = false;
        if (robotEl) robotEl.classList.remove('speaking');
        fallbackSpeak(speechText, callback);
    }
}

function addMessage(text, sender) {
    const messagesEl = document.querySelector('.messages');
    if (!messagesEl) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.textContent = text;
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- CORE APP FUNCTIONS (GLOBAL) ---

window.startApp = function () {
    console.log("Start button clicked!");
    state.autoListen = true;
    const startOverlay = document.getElementById('start-overlay');
    if (startOverlay) startOverlay.style.display = 'none';

    // Show Chat Area (hidden initially)
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) chatArea.classList.add('visible');

    // Make Avatar Clickable to Stop Speech
    const avatar = document.querySelector('.avatar-img');
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.title = "Click to stop speaking";
        avatar.onclick = () => {
            window.speechSynthesis.cancel();
            if (state.currentAudio) {
                state.currentAudio.pause();
                state.currentAudio = null;
            }
            state.isSpeaking = false;
            if (avatar) avatar.classList.remove('speaking');
        };
    }

    addMessage(pedagogyData.intro_message, 'sestin');
    speak(pedagogyData.intro_message, () => {
        renderGrades();
    });

    // --- SESSION TIMER LOGIC (ROBUST) ---
    const SESSION_DURATION = 30 * 60 * 1000; // 30 mins
    const WARNING_TIME = 25 * 60 * 1000;     // 25 mins
    const startTime = Date.now();
    let warningShown = false;

    // Check every second
    state.sessionInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // Warning
        if (elapsed >= WARNING_TIME && !warningShown) {
            warningShown = true;
            const studentName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'Scientist';
            const warningMsg = `Attention Scientist ${studentName}. We have 5 minutes remaining in today's session. Let's make them count!`;
            addMessage(`⏰ ${warningMsg}`, 'sestin');
            speak(warningMsg);
        }

        // End Session
        if (elapsed >= SESSION_DURATION) {
            clearInterval(state.sessionInterval);
            const studentName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'Scientist';
            const endMsg = `Great work today, Scientist ${studentName}! Session complete. Logging out now...`;
            speak(endMsg);
            addMessage(`🛑 ${endMsg}`, 'sestin');

            // Wait for speech to start then reload
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    }, 1000);

    // --- DAILY ACTIVITY TRACKING ---
    // Update every 1 minute (60,000 ms)
    setInterval(() => {
        if (typeof updateDailyActivity === 'function') {
            updateDailyActivity();
        }
    }, 60000);
    // Log immediately on start
    if (typeof updateDailyActivity === 'function') {
        updateDailyActivity();
    }
};

function renderGrades() {
    state.currentPhase = 'grade_selection';
    const ctrl = document.querySelector('.controls');
    if (!ctrl) return;
    ctrl.innerHTML = '';

    // Purpose Statement
    const purposeBox = document.createElement('div');
    purposeBox.style.background = 'linear-gradient(135deg, #1e293b, #334155)';
    purposeBox.style.padding = '1.5rem';
    purposeBox.style.borderRadius = '12px';
    purposeBox.style.marginBottom = '2rem';
    purposeBox.style.borderLeft = '5px solid #4ade80';
    purposeBox.style.color = '#e2e8f0';
    purposeBox.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    purposeBox.innerHTML = `
        <h3 style="margin-top:0; color:#4ade80; display:flex; align-items:center; gap:10px;">
            <span>🧬</span> Science & Literacy Lab
        </h3>
        <p style="margin-bottom:0; line-height:1.6;">
            This platform is designed to help you practice for your <strong>EOG Science</strong> exams 
            while strengthening the connection between <strong>Science and Literacy skills</strong>.
        </p>
    `;
    ctrl.appendChild(purposeBox);

    const grid = document.createElement('div');
    grid.className = 'options-grid';

    pedagogyData.grades.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = g.title;
        btn.onclick = () => { addMessage(g.title, 'user'); selectGrade(g); };
        grid.appendChild(btn);
    });
    ctrl.appendChild(grid);
}

function selectGrade(grade) {
    state.currentGrade = grade;
    // Don't auto-add message to chat to avoid clutter/overlap if that's the issue
    // addMessage(grade.intro_message, 'sestin'); 
    // Instead, just speak it.
    speak(grade.intro_message);
    renderStrands(grade.intro_message);
}

function renderStrands(overrideSpeech = null) {
    state.currentPhase = 'topic_selection';
    const controlsEl = document.querySelector('.controls');
    controlsEl.innerHTML = '';

    // Create a wrapper for the top controls to ensure spacing
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.marginBottom = '1.5rem';
    topBar.style.width = '100%';

    // --- Back Button ---
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '⬅ Grades'; // Shorter text
    backBtn.onclick = () => {
        window.speechSynthesis.cancel();
        renderGrades();
    };
    topBar.appendChild(backBtn);

    // --- Speech Replay Button (Requested) ---
    const speechBtn = document.createElement('button');
    speechBtn.className = 'option-btn'; // Recycle style
    speechBtn.style.padding = '0.5rem 1rem';
    speechBtn.style.fontSize = '1rem';
    speechBtn.style.background = '#3b82f6'; // Blue
    speechBtn.innerHTML = '🔊 Listen';
    speechBtn.onclick = () => {
        if (overrideSpeech) speak(overrideSpeech);
    };
    topBar.appendChild(speechBtn);
    // -------------------------

    const container = document.createElement('div');
    container.className = 'strands-container';
    container.style.width = '100%';

    // Add the top bar to the container
    container.appendChild(topBar);

    // Intro Text Display (To fix overlap, putting it IN the flow, not as a chat bubble)
    const introText = document.createElement('div');
    introText.style.background = '#1e293b';
    introText.style.padding = '1rem';
    introText.style.borderRadius = '10px';
    introText.style.marginBottom = '2rem';
    introText.style.color = '#e2e8f0';
    introText.style.fontStyle = 'italic';
    introText.style.borderLeft = '4px solid #3b82f6';
    introText.innerHTML = `"${overrideSpeech || state.currentGrade.intro_message}"`;
    container.appendChild(introText);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'strand-card';
    randomBtn.style.background = 'linear-gradient(135deg, #ec4899, #8b5cf6)';
    randomBtn.style.textAlign = 'center';
    randomBtn.style.display = 'block';
    randomBtn.style.width = '100%';
    randomBtn.style.padding = '1.5rem';
    randomBtn.style.textAlign = 'center';
    randomBtn.style.marginBottom = '2rem';
    randomBtn.innerHTML = `<span style="font-size:1.5rem; color: white; font-weight: 800;">📚 Vocabulary</span>`;
    randomBtn.style.cursor = 'pointer';

    randomBtn.onclick = () => startRandomQuestion();
    container.appendChild(randomBtn);

    // ... (rest of renderStrands) ...

    // Helper for Daily Tracking
    function updateDailyActivity() {
        if (!state.currentUser) return;
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const log = JSON.parse(localStorage.getItem('tmsa_activity_log') || '{}');
            const user = state.currentUser.username;

            if (!log[user]) log[user] = { history: {} };
            if (!log[user].history[today]) log[user].history[today] = 0;

            log[user].last_active = Date.now();
            log[user].history[today] += 1; // Add 1 minute

            localStorage.setItem('tmsa_activity_log', JSON.stringify(log));
            console.log(`Activity logged for ${user}: ${log[user].history[today]} mins`);
        } catch (e) {
            console.error("Tracking Error:", e);
        }
    }

    state.currentGrade.strands.forEach(s => {
        const card = document.createElement('div');
        card.className = 'strand-card';
        const header = document.createElement('div');
        header.className = 'strand-header';
        header.innerHTML = `<span>${s.code || ''}</span> ${s.title}`;
        card.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'topic-list';
        const visibleQuestions = s.questions.slice(0, 5);

        visibleQuestions.forEach((q, idx) => {
            const item = document.createElement('li');
            item.className = 'topic-item';
            const topicDisplay = q.topic ? q.topic : `Question ${idx + 1}`;
            item.textContent = `🔬 ${topicDisplay}`;
            item.onclick = () => selectTopic(q, s);
            list.appendChild(item);
        });

        if (s.questions.length > 5) {
            const more = document.createElement('li');
            more.className = 'topic-item';
            more.style.fontStyle = 'italic';
            more.innerText = `...and ${s.questions.length - 5} more questions (Use Random Button)`;
            list.appendChild(more);
        }

        card.appendChild(list);
        container.appendChild(card);
    });

    controlsEl.appendChild(container);

    if (overrideSpeech) {
        speak(overrideSpeech);
    } else {
        speak("Scientist, here are the topics. Pick one and let's get started!");
    }
}

function selectTopic(q, s) {
    if (!q || !s) return;

    state.currentPhase = 'discussion';
    state.currentQuestion = q;
    state.currentStrand = s;
    state.questionAttempts = 0;

    startComprehensionPhase();
}

function startComprehensionPhase() {
    state.discussionPhase = 'comprehension';
    const q = state.currentQuestion;
    const s = state.currentStrand;
    const controlsEl = document.querySelector('.controls');
    controlsEl.innerHTML = '';

    addMessage(`🎯 Standard: ${s.code || ''} - ${s.title}`, 'sestin');
    addMessage(q.text, 'sestin');

    const cleanTitle = s.title;
    const intros = [
        `Okay Scientist, we're tackling ${cleanTitle}.`,
        `Alright Scientist, focusing on ${cleanTitle}.`
    ];
    const intro = intros[Math.floor(Math.random() * intros.length)];
    const hooks = [
        "What is your first thought?",
        "What immediately jumps out at you?",
        "What do you think?" // Removed "What are they actually looking for?" to allow redundancy removal
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    // Removed "Scientist" suffix from reading the question
    speak(`${intro} ${q.text} ${hook}`);
    addMessage(hook, 'sestin');
    renderComprehensionControls();

    // --- INACTIVITY TIMER (10s) ---
    if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
    state.inactivityTimer = setTimeout(() => {
        if (state.discussionPhase === 'comprehension') {
            const prompt = "It is okay if you are stuck! You can try a different question if you like.";
            speak(prompt);
            addMessage(`🤔 ${prompt}`, 'sestin');
        }
    }, 10000); // 10 seconds
}

function renderComprehensionControls() {
    const controlsEl = document.querySelector('.controls');
    const grid = document.createElement('div');
    grid.className = 'options-grid';

    // Helper: Stop speech on any interaction
    const cancelSpeech = () => {
        window.speechSynthesis.cancel();
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
    };

    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.style.background = '#4b5563';
    btn.textContent = "💡 Show Options (I've analyzed it)";
    btn.onclick = () => {
        cancelSpeech();
        presentOptions();
    };

    const speakBtn = document.createElement('button');
    speakBtn.id = 'mic-btn';
    speakBtn.className = 'option-btn';
    speakBtn.textContent = "🎤 Voice Answer";
    speakBtn.onclick = () => {
        cancelSpeech();
        toggleMic();
    };

    const decomposeBtn = document.createElement('button');
    decomposeBtn.className = 'option-btn';
    decomposeBtn.style.background = '#8b5cf6';
    decomposeBtn.textContent = "🧩 Decompose: Break it down";
    decomposeBtn.onclick = () => {
        cancelSpeech();
        decomposeQuestion();
    };

    const newQBtn = document.createElement('button');
    newQBtn.className = 'option-btn';
    newQBtn.style.background = '#f59e0b'; // Amber color
    newQBtn.textContent = "🔄 Try Different Question";
    newQBtn.onclick = () => {
        cancelSpeech();
        startRandomQuestion();
    };

    const typeBtn = document.createElement('button');
    typeBtn.className = 'option-btn';
    typeBtn.textContent = "⌨️ Type Answer";
    typeBtn.onclick = () => {
        cancelSpeech();
        toggleTextInput();
    };


    grid.appendChild(speakBtn);
    grid.appendChild(typeBtn); // Added Type Button
    grid.appendChild(decomposeBtn);
    grid.appendChild(btn);
    grid.appendChild(newQBtn);

    controlsEl.appendChild(grid);

    // Text Input Container (Hidden by default)
    const textContainer = document.createElement('div');
    textContainer.id = 'text-input-container';
    textContainer.innerHTML = `
        <input type="text" id="keyboard-input" placeholder="Type your answer here..." autocomplete="off">
        <button id="send-text-btn">Send 🚀</button>
    `;
    controlsEl.appendChild(textContainer);

    // Bind Send Button
    setTimeout(() => {
        const sendBtn = document.getElementById('send-text-btn');
        const input = document.getElementById('keyboard-input');
        if (sendBtn && input) {
            sendBtn.onclick = () => {
                const text = input.value.trim();
                if (text) {
                    addMessage(text, 'user');
                    handleInput(text);
                    input.value = '';
                    textContainer.style.display = 'none'; // Hide after send
                }
            };
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendBtn.click();
            });
        }
    }, 100);
}

function toggleTextInput() {
    const container = document.getElementById('text-input-container');
    if (container) {
        const isHidden = container.style.display === 'none' || container.style.display === '';
        container.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            setTimeout(() => document.getElementById('keyboard-input').focus(), 100);
        }
    }
}

function decomposeQuestion() {
    const controlsEl = document.querySelector('.controls');
    const msgDisplay = "Time to break it down! 🧩 Think about baking a cake. Sugar is needed for the cake mix (Important -> Highlight it). The Serving Plate is for AFTER the cake is baked (Not Important Now -> Ignore it). In this question, what is the 'Sugar' we need to highlight?";
    const msgSpeak = "Alright, Time to break it down! Think about baking a cake. Sugar is needed for the cake mix, which is important, so we need to highlight it. The Serving Plate is for AFTER the cake is baked, so it is not important right now and we can ignore it. In this question, what is the 'Sugar' we need to highlight?";

    addMessage(msgDisplay, 'sestin');
    speak(msgSpeak, () => {
        if (state.silenceTimer) clearTimeout(state.silenceTimer);
        state.silenceTimer = setTimeout(() => {
            if (appConfig.useOpenAIChat) {
                addMessage("(Thinking... Scanning for signals...)", 'sestin');
                // Assume chatWithAI is globally available or defined below
                if (typeof chatWithAI === 'function') {
                    chatWithAI(state.currentQuestion.text, {
                        question: state.currentQuestion.text,
                        topic: state.currentStrand.title,
                        mode: 'hint'
                    }).then(aiHint => {
                        if (aiHint) {
                            const finalHint = `Here is a hint: ${aiHint}`;
                            speak(finalHint);
                            addMessage(finalHint, 'sestin');
                        } else {
                            // Fallback with definitions
                            const topic = state.currentQuestion.topic || state.currentStrand.title;

                            const TOPIC_DEFINITIONS = {
                                "Producers": "Producers are plants that make their own food from the sun. Think of grass or trees!",
                                "Consumers": "Consumers are animals that need to eat other living things to survive.",
                                "Decomposers": "Decomposers break down dead things and turn them back into soil. Like mushrooms!",
                                "Inertia": "Inertia means an object keeps doing what it's doing until something stops it.",
                                "Gravity": "Gravity is the invisible force that pulls everything down towards the Earth.",
                                "Friction": "Friction is a force that slows things down when they rub against each other.",
                                "Conduction": "Conduction is when heat moves through something solid, like a metal spoon getting hot.",
                                "Convection": "Convection is when heat moves through liquids or air, like boiling water.",
                                "Radiation": "Radiation is heat moving through empty space, like the sun warming your face."
                            };

                            let hintMsg = `Focus on: ${topic}`;

                            // Check for direct match or partial match
                            const defKey = Object.keys(TOPIC_DEFINITIONS).find(k => topic.includes(k));
                            if (defKey) {
                                hintMsg += `. Remember: ${TOPIC_DEFINITIONS[defKey]}`;
                            } else {
                                hintMsg += ". Use the 'Show Options' button if you are stuck!";
                            }

                            speak(hintMsg);
                            addMessage(`(Thinking... ${hintMsg})`, 'sestin');
                        }
                    });
                }
            } else {
                const topicHint = state.currentQuestion.topic || state.currentStrand.title.replace(/^[0-9A-Z\.]+/, '').trim();

                const TOPIC_DEFINITIONS = {
                    "Producers": "Producers are plants that make their own food from the sun. Think of grass or trees!",
                    "Consumers": "Consumers are animals that need to eat other living things to survive.",
                    "Decomposers": "Decomposers break down dead things and turn them back into soil. Like mushrooms!",
                    "Inertia": "Inertia means an object keeps doing what it's doing until something stops it.",
                    "Gravity": "Gravity is the invisible force that pulls everything down towards the Earth.",
                    "Friction": "Friction is a force that slows things down when they rub against each other.",
                    "Conduction": "Conduction is when heat moves through something solid, like a metal spoon getting hot.",
                    "Convection": "Convection is when heat moves through liquids or air, like boiling water.",
                    "Radiation": "Radiation is heat moving through empty space, like the sun warming your face."
                };

                let hintMsg = `What is this question really asking us? It looks like it is asking us about ${topicHint}.`;

                // Check for direct match or partial match
                const defKey = Object.keys(TOPIC_DEFINITIONS).find(k => topicHint.includes(k));
                if (defKey) {
                    hintMsg += ` Remember: ${TOPIC_DEFINITIONS[defKey]}`;
                }

                speak(hintMsg);
                addMessage(`(Thinking... ${hintMsg})`, 'sestin');
            }
        }, 4000);
    });

    const note = document.createElement('div');
    note.style.margin = "10px";
    note.style.padding = "10px";
    note.style.border = "1px dashed #a78bfa";
    note.innerHTML = `<strong>Abstraction Strategy:</strong><br>✅ Important -> Highlight it<br>❌ Not Important -> Ignore it now (think later)`;
    controlsEl.prepend(note);
}

function presentOptions() {
    state.discussionPhase = 'selection';
    const q = state.currentQuestion;
    addMessage("Hypothesis Mode: Which one feels right?", 'sestin');
    renderOptions(q.options);
    speak("Scientist, here are the choices. Which one calls out to you?");
}

function renderOptions(options) {
    const controlsEl = document.querySelector('.controls');
    const grid = document.createElement('div');
    grid.className = 'options-grid';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => selectOption(opt);
        grid.appendChild(btn);
    });
    controlsEl.appendChild(grid);
}

function selectOption(optionText) {
    state.selectedOption = optionText;
    const q = state.currentQuestion;
    const correctVal = q.correct_answer || q.answer || "";

    // Check for K-4 Science-ELA Mode
    if (state.currentGrade && state.currentGrade.id === 'SciELA') {
        // Immediate Validation
        // Check if selected option contains the correct answer text (simple heuristic)
        // or matches the stored correct answer string
        const isCorrect = optionText.includes(correctVal) || correctVal.includes(optionText) || optionText.startsWith("*");

        addMessage(`You selected: ${optionText}`, 'user');

        if (isCorrect) {
            // Correct - Immediate Praise
            const praise = "Very good job.";
            addMessage(praise, 'sestin');
            speak(praise);
            state.consecutiveCorrect++;

            // Return to menu after short delay
            setTimeout(() => {
                renderStrands();
            }, 3000);
            return;
        } else {
            // Incorrect - Ask Why (Specific Prompt)
            state.discussionPhase = 'reasoning';
            const challenge = `Interesting choice. Why do you think ${optionText} is the answer?`;
            addMessage(challenge, 'sestin');
            speak(challenge, () => {
                if (state.silenceTimer) clearTimeout(state.silenceTimer);
                // No silence scaffolding needed for this specific prompt style as per request?
                // Or keep it? keeping it for consistency but maybe longer delay
            });

            // Proceed to setup Mic for reasoning
            setupReasoningUI();
            return;
        }
    }

    // Default Behavior (5th/8th Grade) - Always Reasoning First
    state.discussionPhase = 'reasoning';
    addMessage(`You selected: ${optionText}`, 'user');
    const challenge = `Interesting choice. Why do you think ${optionText} is the answer?`;
    addMessage(challenge, 'sestin');
    speak(challenge, () => {
        if (state.silenceTimer) clearTimeout(state.silenceTimer);
        state.silenceTimer = setTimeout(() => {
            if (state.discussionPhase === 'reasoning') {
                showReasoningScaffolds();
            }
        }, 4000);
    });

    setupReasoningUI();
}

function setupReasoningUI() {
    const controlsEl = document.querySelector('.controls');
    controlsEl.innerHTML = '';
    const note = document.createElement('p');
    note.textContent = "🎤 Tell me your reason using 'Because'...";
    note.style.textAlign = 'center';
    controlsEl.appendChild(note);

    const micBtn = document.createElement('button');
    micBtn.id = 'mic-btn';
    micBtn.className = 'option-btn active';
    micBtn.innerHTML = 'Listening...';
    micBtn.onclick = toggleMic;
    controlsEl.appendChild(micBtn);

    if (!state.isListening && window.recognition) window.recognition.start();
}

function showReasoningScaffolds() {
    if (document.getElementById('scaffold-container')) return;

    // Silence Scaffolding (Rule 4.1 from Pedagogical Rules)
    const brainstormMsgDisplay = "You are a Scientist. Let's use an abstraction strategy. Take a moment to think.";
    const brainstormMsgSpeak = "You are a Scientist. Let's use an abstraction strategy. Focus on what is important, and ignore the rest for now. I'll be right here waiting.";

    addMessage(brainstormMsgDisplay, 'sestin');

    speak(brainstormMsgSpeak, () => {
        if (state.silenceTimer) clearTimeout(state.silenceTimer);
        state.silenceTimer = setTimeout(() => {
            const topicHint = state.currentQuestion.topic || state.currentStrand.title.replace(/^[0-9A-Z\.]+/, '').trim();
            const hintMsg = `What is this question really asking us? It looks like it is asking us about ${topicHint}.`;
            speak(hintMsg);
            addMessage(`(Thinking... ${hintMsg})`, 'sestin');
        }, 5000); // Increased to 5s to give more thinking time
    });

    const container = document.createElement('div');
    container.id = 'scaffold-container';
    container.className = 'options-grid';
    container.style.marginTop = '1rem';
    container.style.animation = 'fadeIn 0.5s';

    const starters = [
        "Because it has...",
        "The evidence shows...",
        "I chose this because...",
        "It matches the definition..."
    ];
    starters.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.style.fontSize = '0.9rem';
        btn.textContent = text;
        btn.onclick = () => { addMessage(text + "...", 'user'); };
        container.appendChild(btn);
    });
    const controlsEl = document.querySelector('.controls');
    controlsEl.appendChild(container);
}

function finalizeAnswer() {
    const q = state.currentQuestion;
    const isCorrect = state.selectedOption.toLowerCase().startsWith(q.answer.toLowerCase().charAt(0));

    if (isCorrect) {
        addMessage("Correct! Amazing work.", 'sestin');
        speak("You nailed it! That is scientifically accurate.");
        state.consecutiveCorrect++;
        if (state.consecutiveCorrect >= 3) {
            // Offer challenge - implementation simplified for this refactor
            // offerChallenge(); 
            // Just auto upgrade difficulty for now
            if (state.currentDifficulty === "Easy") state.currentDifficulty = "Medium";
        }
    } else {
        addMessage(`Not quite. The correct answer was ${q.answer}.`, 'sestin');
        speak(`Actually, the evidence points to ${q.answer}. Let's learn from this.`);
        state.consecutiveCorrect = 0;
    }

    setTimeout(() => {
        renderStrands(); // Go back to menu
    }, 4000);
}

function toggleMic() {
    if (!window.recognition) return;
    if (state.isListening) {
        window.recognition.stop();
    } else {
        window.recognition.start();
    }
}

function updateMicButton() {
    const btn = document.getElementById('mic-btn');
    if (btn) {
        if (state.isListening) {
            btn.innerHTML = '🛑 Stop Listening';
            btn.style.background = '#ef4444';
        } else {
            btn.innerHTML = '🎤 Voice Answer';
            btn.style.background = '#2563eb';
        }
    }
}

function startRandomQuestion() {
    // Basic implementation for safety
    if (!state.currentGrade) return;
    const allQ = state.currentGrade.strands.flatMap(s => s.questions.map(q => ({ q, s })));
    const random = allQ[Math.floor(Math.random() * allQ.length)];
    selectTopic(random.q, random.s);
}

// Real AI Chat Implementation (Netlify Function + Local Fallback)
async function chatWithAI(text, context) {
    console.log("AI Chat Request:", text, context);

    if (!appConfig.useOpenAIChat) {
        console.warn("OpenAI Chat is disabled in config.");
        return null;
    }

    // Construct System Prompt
    let systemPrompt = "You are Sestin, a helpful and encouraging AI science tutor for middle school students.";
    if (context) {
        if (context.grade) systemPrompt += ` The student is in ${context.grade}.`;
        if (context.topic) systemPrompt += ` The current topic is ${context.topic}.`;

        if (context.mode === 'hint') {
            systemPrompt += " The student is stuck on a question. Provide a helpful, scaffolding hint without giving away the direct answer. Use an analogy if possible. Keep it short (2-3 sentences max).";
        } else if (context.mode === 'decompose') {
            systemPrompt += " Help the student break down the question. Identify the key terms and what the question is asking. Do not answer it yet.";
        } else if (context.mode === 'explain') {
            systemPrompt += " Explain the concept clearly and simply.";
        }
    }

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ],
        temperature: 0.7,
        max_tokens: 150
    };

    // 1. Try Netlify Function (Secure Production Way)
    try {
        const response = await fetch("/.netlify/functions/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            const aiMessage = data.choices[0].message.content.trim();
            console.log("AI Response (via Netlify):", aiMessage);
            return aiMessage;
        } else {
            console.warn("Netlify Function failed, trying local fallback...", response.status);
        }
    } catch (e) {
        console.warn("Netlify Function unreachable, trying local fallback...", e);
    }

    // 2. Local Fallback (Dev Mode with secrets.js)
    try {
        if (typeof secrets !== 'undefined' && secrets.openaiApiKey) {
            console.log("Using Local API Key");
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secrets.openaiApiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`OpenAI API Error: ${errData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const aiMessage = data.choices[0].message.content.trim();
            console.log("AI Response (via Local Key):", aiMessage);
            return aiMessage;
        } else {
            throw new Error("No local API key found.");
        }
    } catch (error) {
        console.error("ChatWithAI Failed (All methods):", error);
        addMessage(`(System: AI connection failed. Check console for details.)`, 'system');
        return null;
    }
}


// --- PHASE HANDLERS UTILIZED BY HANDLEINPUT ---
// (Already defined above)


// --- SIGN UP LOGIC ---

window.toggleSignUp = function () {
    const loginSec = document.getElementById('login-section');
    const signupSec = document.getElementById('signup-section');
    if (!loginSec || !signupSec) return;

    if (loginSec.style.display === 'none') {
        loginSec.style.display = 'block';
        signupSec.style.display = 'none';
    } else {
        loginSec.style.display = 'none';
        signupSec.style.display = 'block';
    }
};

window.handleSignUp = function () {
    const nameInput = document.getElementById('signup-name');
    const surnameInput = document.getElementById('signup-surname');
    const schoolInput = document.getElementById('signup-school');

    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();
    const school = schoolInput.value;

    if (!name || !surname || !school) {
        alert("Lütfen tüm alanları doldurun! 📝 (Please fill all fields)");
        return;
    }

    // Generate Username: ali.yilmaz
    let baseUsername = `${name.toLowerCase()}.${surname.toLowerCase()}`
        .trim()
        .replace(/[^a-z0-9.]/g, '')
        .replace(/\s+/g, '');

    console.log(`[Security Check] Attempting to register: '${baseUsername}'`);

    // --- SECURITY CHECK (Added per user request) ---
    // Only allow "semiha.yildiz"
    if (baseUsername !== "semiha.yildiz") {
        console.warn(`[Security Check] Denied access to '${baseUsername}'`);
        alert("🔒 Access Restricted\n\nOnly authorized scientists can register at this time.\n\nPlease request access from the administrator.");
        return;
    }

    let username = baseUsername;

    // Check for duplicates (though now only one person can enter, this handles re-registration if cleared)
    const currentCustom = JSON.parse(localStorage.getItem('tmsa_custom_students') || '[]');
    let counter = 2;
    while (currentCustom.find(u => u.username === username)) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    const password = "123"; // Default simple password

    const newUser = {
        username: username,
        password: password,
        name: `${name} ${surname}`,
        school: school,
        isCustom: true
    };

    // Add to runtime
    if (!window.studentRoster) window.studentRoster = [];
    window.studentRoster.push(newUser);

    // Persist
    currentCustom.push(newUser);
    localStorage.setItem('tmsa_custom_students', JSON.stringify(currentCustom));

    alert(`✅ Kayıt Başarılı! (Registration Complete)\n\nKullanıcı Adın: ${username}\nŞifre: 123`);

    // Auto Login
    state.currentUser = newUser;
    const loginOverlay = document.getElementById('login-overlay');
    const startOverlay = document.getElementById('start-overlay');
    const welcomeHeader = document.getElementById('welcome-header');

    if (loginOverlay) loginOverlay.style.display = 'none';
    if (startOverlay) startOverlay.style.display = 'flex';

    if (welcomeHeader) welcomeHeader.textContent = `Ready, Scientist ${name}?`;
    pedagogyData.intro_message = `This platform is designed to help you practice for your EOG Science exams. You can speak your answers, or use 'Show Options' to see choices. If you need help, try the 'Decompose' button. You can also skip questions. Now, please select your grade to begin!`;

    console.log("Logged in new user:", newUser);
};


// --- INITIALIZATION ---

const initApp = () => {
    // Load Custom Students from LocalStorage
    try {
        const storedRoster = JSON.parse(localStorage.getItem('tmsa_custom_students') || '[]');
        if (storedRoster.length > 0) {
            if (!window.studentRoster) window.studentRoster = [];

            // Avoid duplicates based on username
            storedRoster.forEach(s => {
                if (!window.studentRoster.find(existing => existing.username === s.username)) {
                    window.studentRoster.push(s);
                }
            });
            console.log("Loaded custom students:", storedRoster.length);
        }
    } catch (e) {
        console.error("Error loading custom roster:", e);
    }

    // Check if data is ready
    if (!window.pedagogyData || window.pedagogyData.grades.length === 0) {
        console.log("Waiting for data...");
        document.addEventListener('pedagogyDataReady', initApp);
        return;
    }

    const robotEl = document.querySelector('.avatar-img');

    // Login Elements
    // Login Logic
    const loginOverlay = document.getElementById('login-overlay');
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    // Start Elements
    const startOverlay = document.getElementById('start-overlay');
    const welcomeHeader = document.getElementById('welcome-header');

    window.checkLogin = function () {
        // Updated Access Control: Only "semiha yildiz" allowed
        const user = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
        const pass = passwordInput ? passwordInput.value.trim() : "";

        // Check if user is exactly "semiha yildiz" (allowing for semiha.yildiz format too if desired, user said "semiha yildiz")
        // User request: "artik sadece semiha yildiz die girenlere izin ver" (now only allow those who enter as semiha yildiz)
        // Also supports standard "ad.soyad" format if they enter "semiha.yildiz"
        const allowedUser = "semiha yildiz";
        const allowedUserAlt = "semiha.yildiz";

        if ((user === allowedUser || user === allowedUserAlt) && pass === "123") {
            // Success!
            let displayName = "Semiha Yildiz";
            state.currentUser = { name: displayName, username: user };

            if (loginOverlay) loginOverlay.style.display = 'none';
            if (startOverlay) startOverlay.style.display = 'flex';
            if (welcomeHeader) welcomeHeader.textContent = `Ready, Scientist ${displayName}?`;

            if (pedagogyData) {
                pedagogyData.intro_message = `This platform is designed to help you practice for your EOG Science exams and to strengthen the connection between science and literacy skills. You can speak your answers, or use 'Show Options' to see choices. If you need help, try the 'Decompose' button. You can also skip questions. Now, please select your grade to begin!`;
            }

            const welcomeMsg = `Welcome Scientist ${displayName}. Let's get ready!`;
            speak(welcomeMsg);

        } else {
            // Fail - Access Request Mode
            if (loginError) {
                loginError.style.display = 'block';
                loginError.innerHTML = "🚫 <b>Access Restricted</b><br>This lab is currently locked.<br>Please contact the administrator to request access.";
            }
            alert("🔒 Access Restricted\n\nOnly authorized scientists can enter at this time.\n\nPlease request access from the administrator if you believe this is an error.");
            if (passwordInput) passwordInput.value = '';
        }
    };

    window.handleInput = function (text) {
        if (!text) return;
        text = text.toLowerCase();
        console.log("Handling Input:", text, "Phase:", state.currentPhase);

        // Global Commands
        if (text.includes("stop") || text.includes("cancel")) {
            window.speechSynthesis.cancel();
            state.isSpeaking = false;
            return;
        }

        if (state.currentPhase === 'grade_selection') {
            const grade = pedagogyData.grades.find(g => text.includes(g.title.toLowerCase()) || text.includes(g.id.toLowerCase()));
            if (grade) {
                selectGrade(grade);
            }
        } else if (state.currentPhase === 'topic_selection') {
            if (text.includes("vocabulary") || text.includes("random")) {
                startRandomQuestion();
                return;
            }
            if (text.includes("back") || text.includes("grade")) {
                renderGrades();
                return;
            }
            // Check visible strands/topics
            // Since we don't have easy access to the list check, we rely on click for specific topics mostly, 
            // but we can try to match strand titles
            if (state.currentGrade) {
                const strand = state.currentGrade.strands.find(s => text.includes(s.title.toLowerCase()));
                if (strand) {
                    // Pick the first question of the strand or random? 
                    // Let's pick the first for now as a default action
                    if (strand.questions.length > 0) {
                        selectTopic(strand.questions[0], strand);
                    }
                }
            }
        } else if (state.currentPhase === 'discussion') {
            if (state.discussionPhase === 'comprehension') {
                if (text.includes("option") || text.includes("choice")) {
                    presentOptions();
                } else if (text.includes("decompose") || text.includes("break")) {
                    decomposeQuestion();
                } else if (text.includes("different") || text.includes("skip") || text.includes("change")) {
                    startRandomQuestion();
                }
            } else if (state.discussionPhase === 'selection') {
                // Match options
                if (state.currentQuestion && state.currentQuestion.options) {
                    const matchedOpt = state.currentQuestion.options.find(opt => text.includes(opt.toLowerCase()));
                    if (matchedOpt) {
                        selectOption(matchedOpt);
                    }
                }
            } else if (state.discussionPhase === 'reasoning') {
                // Any input here is the reasoning
                // We assume the user has spoken their reason
                // We stop listening and finalize
                if (state.isListening) {
                    window.recognition.stop();
                }
                // Add a small delay to ensure the user is done
                setTimeout(() => {
                    finalizeAnswer();
                }, 1000);
            }
        }
    };

    if (loginBtn) loginBtn.onclick = window.checkLogin;
    if (passwordInput) passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.checkLogin();
    });


    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        window.recognition = new SpeechRecognition(); // Global for access
        window.recognition.lang = 'en-US';
        window.recognition.continuous = false;
        window.recognition.interimResults = false;

        window.recognition.onstart = () => {
            state.isListening = true;
            updateMicButton();
            if (robotEl) robotEl.classList.add('listening');
        };

        window.recognition.onend = () => {
            state.isListening = false;
            updateMicButton();
            if (robotEl) robotEl.classList.remove('listening');
        };

        window.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, 'user');
            handleInput(transcript);
        };

        window.recognition.onerror = (event) => {
            console.log("Speech Error:", event.error);
            state.isListening = false;
            updateMicButton();
        };
    }

    // Voices
    window.speechSynthesis.onvoiceschanged = () => {
        state.voices = window.speechSynthesis.getVoices();
    };
    state.voices = window.speechSynthesis.getVoices();

    // Add Logout Button to Header
    const header = document.querySelector('header');
    if (header && !document.querySelector('.logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = () => {
            if (confirm("Are you sure you want to log out?")) {
                window.speechSynthesis.cancel(); // Stop speaking immediately
                window.location.reload();
            }
        };
        header.appendChild(logoutBtn);
    }
};

document.addEventListener('DOMContentLoaded', initApp);
