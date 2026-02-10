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
    const speechText = text
        .replace(/[\u00B0\u00BA]F/g, " degrees Fahrenheit")
        .replace(/[\u00B0\u00BA]C/g, " degrees Celsius")
        .replace(/(\d+)\s?F\b/g, "$1 degrees Fahrenheit")
        .replace(/(\d+)\s?C\b/g, "$1 degrees Celsius")
        .replace(/\bNC\b/g, "North Carolina")
        .replace(/\bvs\./g, "versus");

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

    addMessage(pedagogyData.intro_message, 'sestin');
    speak(pedagogyData.intro_message, () => {
        renderGrades();
    });

    // --- SESSION TIMER LOGIC ---
    const SESSION_DURATION = 30 * 60 * 1000; // 30 mins
    const WARNING_TIME = 25 * 60 * 1000;     // 25 mins

    // Warning
    setTimeout(() => {
        const studentName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'Scientist';
        const warningMsg = `Attention Scientist ${studentName}. We have 5 minutes remaining in today's session. Let's make them count!`;
        addMessage(`⏰ ${warningMsg}`, 'sestin');
        speak(warningMsg);
    }, WARNING_TIME);

    // End Session (Logout)
    setTimeout(() => {
        const studentName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'Scientist';
        const endMsg = `Great work today, Scientist ${studentName}! Session complete. Logging out now...`;
        speak(endMsg);
        addMessage(`🛑 ${endMsg}`, 'sestin');

        // Wait for speech to start then reload
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }, SESSION_DURATION);

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
    addMessage(grade.intro_message, 'sestin');
    renderStrands(grade.intro_message);
}

function renderStrands(overrideSpeech = null) {
    state.currentPhase = 'topic_selection';
    const controlsEl = document.querySelector('.controls');
    controlsEl.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'strands-container';
    // Removed direct style manipulation to let CSS handle it via .controls
    container.style.width = '100%';

    const randomBtn = document.createElement('button');
    randomBtn.className = 'strand-card';
    randomBtn.style.background = 'linear-gradient(135deg, #ec4899, #8b5cf6)';
    randomBtn.style.textAlign = 'center';
    randomBtn.style.display = 'block';
    randomBtn.style.width = '100%';
    randomBtn.style.padding = '1.5rem';
    randomBtn.style.textAlign = 'center';
    randomBtn.style.marginBottom = '3rem'; // Added Strong Margin
    randomBtn.innerHTML = `<span style="font-size:1.5rem; color: white; font-weight: 800;">🎲 Quick Random Question</span>`;
    randomBtn.style.cursor = 'pointer';
    randomBtn.style.marginBottom = '2.5rem'; // Force margin to prevent overlap

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
        speak("Here are the topics. Pick one and let's get started, Scientist!");
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
        "What do you think? What are they actually looking for?"
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    speak(`${intro} ${q.text} ${hook}`);
    addMessage(hook, 'sestin');
    renderComprehensionControls();

    // --- INACTIVITY TIMER (10s) ---
    // Kept only for the verbal prompt, but buttons are now always visible
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

    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.style.background = '#4b5563';
    btn.textContent = "💡 Show Options (I've analyzed it)";
    btn.onclick = () => {
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        presentOptions();
    };

    const speakBtn = document.createElement('button');
    speakBtn.id = 'mic-btn';
    speakBtn.className = 'option-btn';
    speakBtn.textContent = "🎤 Voice Answer";
    speakBtn.onclick = () => {
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        toggleMic();
    };

    const decomposeBtn = document.createElement('button');
    decomposeBtn.className = 'option-btn';
    decomposeBtn.style.background = '#8b5cf6';
    decomposeBtn.textContent = "🧩 Decompose: Break it down";
    decomposeBtn.onclick = () => {
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        decomposeQuestion();
    };

    const newQBtn = document.createElement('button');
    newQBtn.className = 'option-btn';
    newQBtn.style.background = '#f59e0b'; // Amber color
    newQBtn.textContent = "🔄 Try Different Question";
    newQBtn.onclick = () => {
        if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
        startRandomQuestion();
    };


    grid.appendChild(speakBtn);
    grid.appendChild(decomposeBtn);
    grid.appendChild(btn);
    grid.appendChild(newQBtn);

    controlsEl.appendChild(grid);
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
    speak("Here are the choices. Which one calls out to you, Scientist?");
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
    const brainstormMsgDisplay = "Let's do this. You are a Scientist. Science is about understanding what is happening in the world. So we will understand what is happening here now. But let's start small. Let's do some abstraction strategy. Take 4 or 5 seconds to think. I'll be right here waiting for you.";
    const brainstormMsgSpeak = "Let's do this. You are a Scientist. Science is about understanding what is happening in the world. So we will understand what is happening here now. But let's start small. Let's do some abstraction strategy. Remember what that is? We focus on what is important, and for now we ignore concepts that are not very important. Take 4 or 5 seconds to think. I'll be right here waiting for you.";

    addMessage(brainstormMsgDisplay, 'sestin');

    speak(brainstormMsgSpeak, () => {
        if (state.silenceTimer) clearTimeout(state.silenceTimer);
        state.silenceTimer = setTimeout(() => {
            const topicHint = state.currentQuestion.topic || state.currentStrand.title.replace(/^[0-9A-Z\.]+/, '').trim();
            const hintMsg = `What is this question really asking us? It looks like it is asking us about ${topicHint}.`;
            speak(hintMsg);
            addMessage(`(Thinking... ${hintMsg})`, 'sestin');
        }, 4000);
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

    // Generate Username: ali.yilmaz (lowercase, turkish chars replaced ideally but simple replacement okay)
    const username = `${name.toLowerCase()}.${surname.toLowerCase()}`
        .replace(/[^a-z0-9.]/g, '')
        .replace(/\s+/g, '');

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
    const currentCustom = JSON.parse(localStorage.getItem('tmsa_custom_students') || '[]');
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
    pedagogyData.intro_message = `Welcome Scientist ${name} from ${school} to TMSA Curie. Please select your grade.`;

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
        // Simple Bypass for "123"
        const pass = passwordInput ? passwordInput.value.trim() : "";
        const user = usernameInput ? usernameInput.value.trim() : "Scientist";

        // Check password (123) OR if user exists in roster
        let validUser = window.studentRoster?.find(s => s.username.toLowerCase() === user.toLowerCase() && s.password === pass);

        if (pass === "123" || validUser) {
            // Success!
            const displayName = validUser ? validUser.name : (user || "Scientist");
            state.currentUser = { name: displayName, username: user || "guest" };

            if (loginOverlay) loginOverlay.style.display = 'none';
            if (startOverlay) startOverlay.style.display = 'flex';
            if (welcomeHeader) welcomeHeader.textContent = `Ready, Scientist ${displayName}?`;

            // Set detailed Intro Message for StartApp (EOG Practice Instructions)
            if (pedagogyData) {
                pedagogyData.intro_message = `Welcome Scientist ${displayName}! This platform is designed to help you practice for your EOG Science exams. You can speak your answers, or use 'Show Options' to see choices. If you need help, try the 'Decompose' button. You can also skip questions. Now, please select your grade to begin!`;
            }

            // Speak short welcome immediately
            const welcomeMsg = `Welcome Scientist ${displayName}. Let's get ready!`;
            speak(welcomeMsg);

        } else {
            // Fail
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = "Incorrect Access Code. Try '123'.";
            }
            if (passwordInput) passwordInput.value = '';
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
};

document.addEventListener('DOMContentLoaded', initApp);
