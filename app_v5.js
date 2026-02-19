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

    // Show Dashboard Grid
    const dbGrid = document.getElementById('dashboard-grid');
    if (dbGrid) dbGrid.style.display = 'flex';

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

    const studentName = state.currentUser ? state.currentUser.name : 'Scientist';
    const welcomeMsg = `Welcome Scientist ${studentName}. ${pedagogyData.intro_message}`;

    addMessage(welcomeMsg, 'sestin');
    speak(welcomeMsg, () => {
        // CHECK FOR ACTIVE QUIZ
        const activeQuiz = localStorage.getItem('tmsa_active_quiz');
        if (activeQuiz) {
            const quiz = JSON.parse(activeQuiz);
            // Optional: Check if already taken? For now, just show it.
            addMessage(`📢 <strong>Assignment Alert:</strong> Teacher has assigned a quiz: "${quiz.title}"`, 'sestin');

            const btn = document.createElement('button');
            btn.className = 'start-btn';
            btn.style.background = '#f59e0b';
            btn.style.marginTop = '1rem';
            btn.innerHTML = '📝 Take Quiz Now';
            btn.onclick = () => startStudentQuiz(quiz);
            document.querySelector('.controls').appendChild(btn);

            // Also add to Dashboard if not clicked immediately
        }

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
            const warningMsg = `Attention ${studentName}. We have 5 minutes remaining in today's session. Let's make them count!`;
            addMessage(`⏰ ${warningMsg}`, 'sestin');
            speak(warningMsg);
        }

        // End Session
        if (elapsed >= SESSION_DURATION) {
            clearInterval(state.sessionInterval);
            const studentName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'Scientist';
            const endMsg = `Great work today, ${studentName}! Session complete. Logging out now...`;
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
    // Purpose Statement Removed from here


    const grid = document.createElement('div');
    grid.className = 'options-grid';

    // Show Dashboard Grid
    const dbGrid = document.getElementById('dashboard-grid');
    if (dbGrid) dbGrid.style.display = 'flex';

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

    // Hide Dashboard Grid 
    const dbGrid = document.getElementById('dashboard-grid');
    if (dbGrid) dbGrid.style.display = 'none';

    // topBar definition removed as it is no longer needed for the back button structure


    // --- Back Button ---
    // --- Back Button (Top of Controls) ---
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '⬅ Back';
    backBtn.onclick = () => {
        window.speechSynthesis.cancel();
        // Hide sidebar when going back
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.style.display = 'none';
        renderGrades();
    };
    controlsEl.appendChild(backBtn);
    // ---------------------------------------

    // --- EXTERNAL SIDEBAR LOGIC ---
    const appSidebar = document.getElementById('app-sidebar');
    if (appSidebar) {
        appSidebar.innerHTML = ''; // Clear previous content
        appSidebar.innerHTML = ''; // Clear previous content
        appSidebar.style.display = 'flex'; // Show it and use flex layout!
        appSidebar.style.flexDirection = 'column';

        // Sidebar Header
        const sbHeader = document.createElement('h3');
        sbHeader.textContent = "📚 Standards";
        sbHeader.style.color = "#a5b4fc";
        sbHeader.style.marginBottom = "1rem";
        sbHeader.style.textAlign = "center";
        appSidebar.appendChild(sbHeader);

        // Populate Sidebar
        state.currentGrade.strands.forEach(s => {
            const card = document.createElement('div');
            card.className = 'strand-card';
            card.style.marginBottom = '1rem';

            const header = document.createElement('div');
            header.className = 'strand-header';
            header.innerHTML = `<span>${s.code || ''}</span> ${s.title}`;
            card.appendChild(header);

            card.appendChild(header);

            const list = document.createElement('ul');
            list.className = 'topic-list';
            const visibleQuestions = s.questions.slice(0, 5);

            visibleQuestions.forEach((q, idx) => {
                const item = document.createElement('li');
                item.className = 'topic-item';
                const topicDisplay = q.topic ? q.topic : `Question ${idx + 1}`;
                item.textContent = `🔬 ${topicDisplay}`;
                item.onclick = () => {
                    selectTopic(q, s);
                };
                list.appendChild(item);
            });

            // --- Interactive Simulation / Literacy Activity ---
            let simType = 'generic'; // Default

            // Specific overrides
            if (s.title.includes('Weather') || s.code.includes('ESS.5.1') || s.code.includes('E.1')) simType = 'weather';
            if (s.title.includes('Force') || s.code.includes('P.5.1')) simType = 'forces';
            if (s.title.includes('Matter') || s.code.includes('PS.5.1')) simType = 'matter';
            if (s.title.includes('Genetics') || s.title.includes('Inherited') || s.code.includes('LS.5.3') || s.code.includes('LS.8.3')) simType = 'genetics';
            if (s.title.includes('Disease') || s.code.includes('LS.8.1')) simType = 'microbio';
            if (s.title.includes('Earth History') || s.code.includes('ESS.8.1')) simType = 'earth_history';
            if (s.title.includes('Ecosystems') || s.code.includes('LS.5.2') || s.code.includes('LS.8.2')) simType = 'ecosystems';
            if (s.title.includes('Hydrosphere') || s.code.includes('ESS.8.2') || s.code.includes('ESS.8.3')) simType = 'hydrosphere';

            // SciELA / Literacy Override
            const isLiteracy = state.currentGrade.id === 'SciELA' || s.title.includes('Vocabulary') || s.title.includes('Literacy');

            if (simType || isLiteracy) {
                const simItem = document.createElement('li');
                simItem.className = 'topic-item';

                if (isLiteracy) {
                    simItem.innerHTML = '🧩 <b>Science & Literacy Skills</b>';
                    simItem.style.background = 'rgba(16, 185, 129, 0.1)';
                    simItem.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                    simItem.style.color = '#34d399';
                } else {
                    simItem.innerHTML = '🧪 <b>Interactive Simulation</b>';
                    simItem.style.background = 'rgba(59, 130, 246, 0.1)';
                    simItem.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                    simItem.style.color = '#60a5fa';
                }

                simItem.onclick = () => {
                    if (typeof SimManager !== 'undefined') {
                        // Log Activity
                        if (window.fbManager && state.currentUser) {
                            window.fbManager.saveActivityLog(state.currentUser.username, 'simulation_open', {
                                simulation: simType,
                                strand: s.title
                            });
                        }
                        // pass 'literacy' type if it is literacy, else simType
                        SimManager.open(isLiteracy ? 'literacy' : simType, s.title);
                    } else {
                        alert("Module module loading...");
                    }
                };
                list.appendChild(simItem);
            }

            if (s.questions.length > 5) {
                const more = document.createElement('li');
                more.className = 'topic-item';
                more.style.fontStyle = 'italic';
                more.innerText = `...and ${s.questions.length - 5} more questions (Random)`;
                more.onclick = () => startRandomQuestion();
                list.appendChild(more);
            }

            card.appendChild(list);
            appSidebar.appendChild(card);
        });
    }

    // --- MAIN CONTENT AREA (Inside Controls) ---

    // Intro Text
    const introText = document.createElement('div');
    introText.style.background = '#1e293b';
    introText.style.padding = '1rem';
    introText.style.borderRadius = '10px';
    introText.style.color = '#e2e8f0';
    introText.style.fontStyle = 'italic';
    introText.style.borderLeft = '4px solid #3b82f6';
    introText.style.marginTop = '1rem';
    introText.style.marginBottom = '2rem';
    introText.innerHTML = `"${overrideSpeech || state.currentGrade.intro_message}"`;
    controlsEl.appendChild(introText);

    // Purpose Statement (SciELA only)
    if (state.currentGrade.id === 'SciELA') {
        const purposeBox = document.createElement('div');
        purposeBox.style.background = 'linear-gradient(135deg, #1e293b, #334155)';
        purposeBox.style.padding = '1.5rem';
        purposeBox.style.borderRadius = '12px';
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
        controlsEl.appendChild(purposeBox);
    }

    // --- Scroll Indicator Logic ---
    const scrollInd = document.getElementById('scroll-indicator');
    if (scrollInd) {
        scrollInd.style.display = 'flex'; // Show it
        scrollInd.onclick = () => {
            // Scroll to chat area or avatar
            const avatar = document.querySelector('.avatar-container');
            if (avatar) avatar.scrollIntoView({ behavior: 'smooth' });
            // Hide it after clicking? Optional. Use a timeout or scroll listener.
            // For now, let's keep it visible until they interact or leave.
        };
    }

    // Hide scroll indicator if we leave this view (handled by rendering other views or re-rendering)
    // But we should ensure it's hidden when we go to question view.
    // I'll add a helper to hide it in `renderComprehensionControls` later or generally.

    if (overrideSpeech) {
        speak(overrideSpeech);
    } else {
        // Default speech triggers
        if (state.currentGrade.id === 'SciELA') {
            speak("Welcome to the Science and Literacy Lab. Please select a topic from the left.");
        } else {
            speak(state.currentGrade.intro_message);
        }
    }

    // Update activity log
    updateDailyActivity();
}

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
        `Okay, we're tackling ${cleanTitle}.`,
        `Alright, focusing on ${cleanTitle}.`
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
    // Hide scroll indicator in question view
    const scrollInd = document.getElementById('scroll-indicator');
    if (scrollInd) scrollInd.style.display = 'none';

    const controlsEl = document.querySelector('.controls');
    const grid = document.createElement('div');
    grid.className = 'options-grid';

    // --- Back Button (Top) ---
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '⬅ Back';
    backBtn.style.marginBottom = '1rem';

    // Explicitly set style if CSS fails to load or conflict
    backBtn.style.color = '#fff';
    backBtn.style.fontWeight = 'bold';

    backBtn.onclick = () => {
        cancelSpeech();
        renderStrands();
    };
    controlsEl.appendChild(backBtn);
    // -------------------------

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


    // Back button removed from here


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
    speak("Here are the choices. Which one calls out to you?");
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
    const correctVal = q.correct_answer || q.answer || "";
    const selectedVal = state.selectedOption || "";

    // Safety check to prevent crash
    if (!correctVal || !selectedVal) {
        console.error("Missing answer or selection", { correctVal, selectedVal });
        addMessage("Let's try another one.", 'sestin');
        setTimeout(renderStrands, 2000);
        return;
    }

    const isCorrect = selectedVal.toLowerCase().startsWith(correctVal.toLowerCase().charAt(0));

    if (isCorrect) {
        addMessage("Correct! Amazing work.", 'sestin');
        speak("You nailed it! That is scientifically accurate.");
        state.consecutiveCorrect++;

        // Log Activity
        if (window.fbManager && state.currentUser) {
            window.fbManager.saveActivityLog(state.currentUser.username, 'question_correct', {
                topic: q.topic || "General",
                strand: state.currentStrand ? state.currentStrand.title : "Unknown"
            });
        }

        if (state.consecutiveCorrect >= 3) {
            // Offer challenge - implementation simplified for this refactor
            // offerChallenge(); 
            // Just auto upgrade difficulty for now
            if (state.currentDifficulty === "Easy") state.currentDifficulty = "Medium";
        }
    } else {
        addMessage(`Not quite. The correct answer was ${correctVal}.`, 'sestin');
        speak(`Actually, the evidence points to ${correctVal}. Let's learn from this.`);
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

// --- SIGN UP LOGIC (UPDATED FOR FIREBASE) ---

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

window.handleSignUp = async function () {
    const nameInput = document.getElementById('signup-name');
    const surnameInput = document.getElementById('signup-surname');
    const schoolInput = document.getElementById('signup-school');

    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();
    const school = schoolInput.value;

    if (!name || !surname || !school) {
        alert("Please fill in all fields! 📝");
        return;
    }

    // Generate Username: ali.yilmaz
    let baseUsername = `${name.toLowerCase()}.${surname.toLowerCase()}`
        .trim()
        .replace(/[^a-z0-9.]/g, '')
        .replace(/\s+/g, '');

    const password = "123"; // Default simple password

    const newUser = {
        username: baseUsername,
        password: password,
        name: `${name} ${surname}`,
        school: school
    };

    // Try Cloud Registration first
    if (window.fbManager && window.fbManager.isReady) {
        const success = await window.fbManager.registerStudent(newUser);
        if (!success) return; // User exists or error
    } else {
        alert("⚠️ Cloud Database Offline. Saving locally only.");
        // Fallback to local (old logic simplified)
        if (!window.studentRoster) window.studentRoster = [];
        window.studentRoster.push(newUser);
    }

    alert(`✅ Registration Complete!\n\nUsername: ${baseUsername}\nPassword: 123`);

    // Auto Login
    state.currentUser = newUser;
    proceedToApp(newUser);
};


// --- INITIALIZATION ---

const initApp = () => {
    console.log("🚀 initApp Started");
    const robotEl = document.querySelector('.avatar-img');

    // Login Elements
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    if (loginBtn) {
        console.log("✅ Login Button Found");
        loginBtn.onclick = function () {
            console.log("🖱️ Login Button Clicked");
            window.checkLogin();
        };
    } else {
        console.error("❌ Login Button NOT Found");
    }

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.checkLogin();
        });
    }

    window.checkLogin = async function () {
        console.log("🔍 checkLogin Called");

        // Data Check inside login with RETRY
        if (!window.pedagogyData || window.pedagogyData.grades.length === 0) {
            console.warn("⚠️ Pedagogy Data missing during login check. Retrying load...");

            // Attempt to force reload if loader.js didn't finish? 
            // Or just alert user
            // The loadPedagogyData is now called at the start of initApp, so this block is mostly for a very rare race condition or error.
            // if (typeof loadPedagogyData === 'function') {
            //     loadPedagogyData(); // Try to kick it
            // }

            alert("⚠️ Content is still loading... Please wait 5 seconds and try again.");
            return;
        }

        const user = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
        const pass = passwordInput ? passwordInput.value.trim() : "";
        const gradeSelect = document.getElementById('login-grade-select');
        const selectedGrade = gradeSelect ? gradeSelect.value : "";

        if (user && pass && !selectedGrade) {
            alert("Please select your grade level before entering.");
            return;
        }

        loginBtn.innerText = "Checking... ⏳";
        // ... rest of logic


        let foundUser = null;

        // 1. Try Local Roster First (Static Roster like Bryan)
        if (window.studentRoster) {
            foundUser = window.studentRoster.find(u => u.username === user && u.password === pass);
        }

        // 2. Try Firebase Cloud (if not found in local)
        if (!foundUser && window.fbManager && window.fbManager.isReady) {
            foundUser = await window.fbManager.loginStudent(user, pass);
        }

        loginBtn.innerText = "Enter Lab 🧪";

        if (foundUser) {
            // Attach selected grade to user object
            foundUser.grade = selectedGrade;
            proceedToApp(foundUser);
        } else {
            // Fail
            if (loginError) {
                loginError.style.display = 'block';
                loginError.innerHTML = "🚫 <b>Access Denied</b><br>Incorrect Username or Password.";
            }
            alert("🔒 Access Denied\n\nPlease check your username and password.");
            if (passwordInput) passwordInput.value = '';
        }
    };

    // Helper to transition UI after login
    function proceedToApp(user) {
        state.currentUser = user;
        const loginOverlay = document.getElementById('login-overlay');
        const mainDashboard = document.getElementById('main-dashboard');
        const welcomeHeader = document.getElementById('welcome-header');

        if (loginOverlay) loginOverlay.style.display = 'none';
        if (mainDashboard) mainDashboard.style.display = 'flex'; // Show new dashboard

        if (welcomeHeader) welcomeHeader.textContent = `Ready, Scientist ${user.name.split(' ')[0]}?`;

        let introMsg = `Welcome Scientist ${user.name}. `;

        if (user.grade) {
            introMsg += `I see you are in ${user.grade}th grade. Excellent! `;
            // Pre-select grade in logic if possible, or just note it
            const gradeObj = pedagogyData.grades.find(g => g.id === user.grade || g.title.includes(user.grade));
            if (gradeObj) {
                state.currentGrade = gradeObj;
                state.currentPhase = 'grade_confirmed'; // Skip selection?
                introMsg += `We are ready to explore ${gradeObj.title} topics. Click 'Start Session' to begin.`;
            }
        } else {
            introMsg += "Please select your grade to begin!";
        }

        pedagogyData.intro_message = introMsg;
        const welcomeSpeech = `Welcome Scientist ${user.name}. Let's get ready!`;
        speak(welcomeSpeech);

        // Show Fixed Logout Button
        const fixedLogoutBtn = document.getElementById('fixed-logout-btn');
        if (fixedLogoutBtn) {
            fixedLogoutBtn.style.display = 'block';
            fixedLogoutBtn.onclick = () => {
                if (confirm("Are you sure you want to log out?")) {
                    window.speechSynthesis.cancel();
                    window.location.reload();
                }
            };
        }
    }

    window.handleInput = function (text) {
        if (!text) return;
        text = text.toLowerCase();
        // ... (rest of handleInput remains same)
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
};


// --- GLOBAL UI HELPERS ---
window.toggleJournal = function () {
    renderJournal();
};

window.toggleStats = function () {
    renderProgressReport();
};


// --- JOURNAL UI ---
function renderJournal() {
    const existingOverlay = document.getElementById('journal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
        return;
    }

    // Hide other views
    const container = document.querySelector('.container');
    // const existingOverlay = document.getElementById('journal-overlay'); // This line is now redundant
    // if (existingOverlay) existingOverlay.remove(); // This line is now redundant

    const overlay = document.createElement('div');
    overlay.id = 'journal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(15, 23, 42, 0.95)';
    overlay.style.zIndex = '2000';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.padding = '2rem';
    overlay.style.overflowY = 'auto';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.maxWidth = '800px';
    header.style.margin = '0 auto 2rem auto';
    header.style.width = '100%';

    const title = document.createElement('h2');
    title.innerHTML = `📓 Scientist's Log: ${state.currentUser.name}`;
    title.style.color = '#fff';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close ❌';
    closeBtn.className = 'option-btn';
    closeBtn.onclick = () => overlay.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);
    overlay.appendChild(header);

    // Content Wrapper
    const content = document.createElement('div');
    content.style.maxWidth = '800px';
    content.style.width = '100%';
    content.style.margin = '0 auto';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '2rem';

    // New Entry Section
    const newEntryDiv = document.createElement('div');
    newEntryDiv.style.background = 'rgba(255,255,255,0.05)';
    newEntryDiv.style.padding = '1.5rem';
    newEntryDiv.style.borderRadius = '12px';
    newEntryDiv.innerHTML = `
        <h3 style="color:#a5b4fc; margin-bottom:1rem;">New Entry ✍️</h3>
        <input type="text" id="journal-title" placeholder="Title (e.g., Ecosystems Reflection)" style="width:100%; padding:10px; margin-bottom:10px; background:#1e293b; color:white; border:1px solid #475569; border-radius:8px;">
        <textarea id="journal-content" rows="4" placeholder="What did you understand deeply today? Where did you struggle?" style="width:100%; padding:10px; background:#1e293b; color:white; border:1px solid #475569; border-radius:8px; font-family:inherit;"></textarea>
        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
            <button id="save-journal-btn" class="option-btn" style="background:#4ade80; color:#0f172a;">Save to Cloud ☁️</button>
        </div>
    `;
    content.appendChild(newEntryDiv);

    // Past Entries Section
    const historyDiv = document.createElement('div');
    historyDiv.id = 'journal-history';
    historyDiv.innerHTML = `<h3 style="color:#a5b4fc; margin-bottom:1rem;">Past Reflections 🕰️</h3><p>Loading...</p>`;
    content.appendChild(historyDiv);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Bind Save
    document.getElementById('save-journal-btn').onclick = async () => {
        const titleVal = document.getElementById('journal-title').value;
        const contentVal = document.getElementById('journal-content').value;
        if (!titleVal || !contentVal) return alert("Please write something!");

        if (window.fbManager) {
            const success = await window.fbManager.saveJournalEntry(state.currentUser.username, {
                date: new Date().toLocaleDateString(),
                title: titleVal,
                content: contentVal
            });
            if (success) {
                alert("Saved!");
                document.getElementById('journal-title').value = '';
                document.getElementById('journal-content').value = '';
                loadEntries();
            }
        }
    };

    // Load Entries
    async function loadEntries() {
        if (window.fbManager) {
            const historyEl = document.getElementById('journal-history');
            const entries = await window.fbManager.getJournalEntries(state.currentUser.username);

            if (entries.length === 0) {
                historyEl.innerHTML = `<h3 style="color:#a5b4fc; margin-bottom:1rem;">Past Reflections 🕰️</h3><p style="opacity:0.7;">No entries yet. Start writing!</p>`;
                return;
            }

            historyEl.innerHTML = `<h3 style="color:#a5b4fc; margin-bottom:1rem;">Past Reflections 🕰️</h3>`;
            entries.forEach(e => {
                const card = document.createElement('div');
                card.style.background = 'rgba(255,255,255,0.03)';
                card.style.padding = '1rem';
                card.style.marginBottom = '1rem';
                card.style.borderRadius = '8px';
                card.style.borderLeft = '3px solid #818cf8';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <strong>${e.title}</strong>
                        <span style="font-size:0.8rem; opacity:0.7;">${e.date}</span>
                    </div>
                    <p style="white-space:pre-wrap; opacity:0.9;">${e.content}</p>
                `;
                historyEl.appendChild(card);
            });
        }
    }

    loadEntries();
}



// --- PROGRESS REPORT UI ---
async function renderProgressReport() {
    // Hide other views
    const existingOverlay = document.getElementById('progress-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'progress-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(15, 23, 42, 0.98)';
    overlay.style.zIndex = '2000';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.padding = '2rem';
    overlay.style.overflowY = 'auto';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.maxWidth = '800px';
    header.style.margin = '0 auto 2rem auto';
    header.style.width = '100%';

    const title = document.createElement('h2');
    title.innerHTML = `📊 Weekly Progress: ${state.currentUser.name}`;
    title.style.color = '#fff';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close ❌';
    closeBtn.className = 'option-btn';
    closeBtn.onclick = () => overlay.remove();

    header.appendChild(title);
    header.appendChild(closeBtn);
    overlay.appendChild(header);

    // Fetch Data
    const loading = document.createElement('p');
    loading.textContent = "Analyzing your data... 🧠";
    loading.style.color = "#ccc";
    loading.style.textAlign = 'center';
    overlay.appendChild(loading);

    let logs = [];
    if (window.fbManager) {
        logs = await window.fbManager.getActivityLogs(state.currentUser.username, 7); // Last 7 days
    }

    loading.remove();

    // Analyze Data
    const correctAnswers = logs.filter(l => l.action === 'question_correct').length;
    const simsOpened = logs.filter(l => l.action === 'simulation_open').length;

    // Most practiced topic
    const topicCounts = {};
    logs.forEach(l => {
        if (l.details && l.details.topic) {
            topicCounts[l.details.topic] = (topicCounts[l.details.topic] || 0) + 1;
        }
    });
    let topTopic = "None yet";
    let maxCount = 0;
    for (const [topic, count] of Object.entries(topicCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topTopic = topic;
        }
    }

    // Grid Layout
    const grid = document.createElement('div');
    grid.style.maxWidth = '800px';
    grid.style.margin = '0 auto';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    grid.style.gap = '1.5rem';

    // Cards
    const createCard = (label, value, color) => {
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.padding = '1.5rem';
        card.style.borderRadius = '12px';
        card.style.borderTop = `4px solid ${color}`;
        card.innerHTML = `<div style="font-size:0.9rem; color:#94a3b8; margin-bottom:5px;">${label}</div><div style="font-size:2rem; font-weight:bold; color:white;">${value}</div>`;
        return card;
    };

    grid.appendChild(createCard("Questions Mastered", correctAnswers, "#4ade80"));
    grid.appendChild(createCard("Simulations Explored", simsOpened, "#60a5fa"));
    grid.appendChild(createCard("Top Focus Topic", topTopic, "#f472b6"));

    overlay.appendChild(grid);

    // Motivational Message
    const msg = document.createElement('div');
    msg.style.maxWidth = '800px';
    msg.style.margin = '2rem auto';
    msg.style.padding = '1rem';
    msg.style.borderRadius = '8px';
    msg.style.background = 'rgba(74, 222, 128, 0.1)';
    msg.style.border = '1px solid rgba(74, 222, 128, 0.3)';
    msg.style.color = '#4ade80';
    msg.style.textAlign = 'center';

    if (correctAnswers > 5) {
        msg.innerHTML = "🌟 <b>You are on fire!</b> Keep up the great scientific thinking!";
    } else if (correctAnswers > 0) {
        msg.innerHTML = "👍 <b>Good start!</b> Try a few more questions to build your streak.";
    } else {
        msg.innerHTML = "👋 <b>Welcome!</b> Start a topic to see your stats grow.";
    }
    overlay.appendChild(msg);

    // Simple List of recent activity
    const listHeader = document.createElement('h3');
    listHeader.textContent = "Recent Activity";
    listHeader.style.marginTop = "2rem";
    listHeader.style.color = "#fff";
    listHeader.style.textAlign = 'center';
    overlay.appendChild(listHeader);

    const list = document.createElement('div');
    list.style.maxWidth = '800px';
    list.style.margin = '0 auto';

    // Safe access to logs
    const activityLogs = window.logs || [];

    activityLogs.slice(0, 5).forEach(log => {
        const item = document.createElement('div');
        item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        item.style.padding = '10px 0';
        item.style.color = '#ccc';
        let icon = '🔹';
        if (log.action === 'question_correct') icon = '✅';
        if (log.action === 'simulation_open') icon = '🧪';

        let desc = log.action;
        if (log.details && log.details.topic) desc = `Mastered: ${log.details.topic}`;
        if (log.details && log.details.simulation) desc = `Opened: ${log.details.simulation}`;

        item.innerHTML = `${icon} ${desc} <span style="font-size:0.8rem; opacity:0.5; float:right;">Recent</span>`;
        list.appendChild(item);
    });
    overlay.appendChild(list);

    document.body.appendChild(overlay);
};

// --- STUDENT QUIZ LOGIC ---

window.startStudentQuiz = function (quiz) {
    state.currentPhase = 'quiz';
    state.currentQuiz = quiz;
    state.quizAnswers = {};

    const ctrl = document.querySelector('.controls');
    ctrl.innerHTML = '';

    // Create Quiz Container
    const quizContainer = document.createElement('div');
    quizContainer.style.background = 'rgba(0,0,0,0.5)';
    quizContainer.style.padding = '2rem';
    quizContainer.style.borderRadius = '16px';
    quizContainer.style.maxWidth = '800px';
    quizContainer.style.margin = '0 auto';
    quizContainer.style.marginTop = '2rem';

    let html = `<h2 style="color:#f59e0b; margin-bottom: 2rem;">📝 ${quiz.title}</h2>`;

    // Add Questions
    quiz.questions.forEach((q, index) => {
        html += `<div style="margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 2rem;">`;
        html += `<p style="font-size: 1.1rem; margin-bottom: 1rem;"><strong>${index + 1}. ${q.text}</strong></p>`;

        if (q.type === 'MC') {
            q.options.forEach(opt => {
                html += `
                    <label style="display: block; margin: 0.8rem 0; cursor: pointer; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                        <input type="radio" name="q${index}" value="${opt}" style="margin-right: 10px;"> ${opt}
                    </label>
                `;
            });
        } else {
            html += `
                <textarea id="q${index}" rows="4" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: white; padding: 1rem; font-family: inherit;" placeholder="Type your answer here..."></textarea>
            `;
        }
        html += `</div>`;
    });

    html += `<button onclick="submitStudentQuiz()" class="start-btn" style="background: #10b981; width: 100%; font-size: 1.2rem;">Submit Quiz ✅</button>`;

    quizContainer.innerHTML = html;
    ctrl.appendChild(quizContainer);

    // Hide dashboard while taking quiz
    const dbGrid = document.getElementById('dashboard-grid');
    if (dbGrid) dbGrid.style.display = 'none';
};

window.submitStudentQuiz = function () {
    const quiz = state.currentQuiz;
    let score = 0;
    let mcCount = 0;
    let feedbackHTML = '<div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; max-height: 300px; overflow-y: auto;">';

    // Collect Answers
    const answers = [];

    quiz.questions.forEach((q, index) => {
        if (q.type === 'MC') {
            mcCount++;
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            const val = selected ? selected.value : null;
            answers.push({ q: index, val: val, correct: val === q.correct });

            if (val === q.correct) {
                score++;
                feedbackHTML += `<p style="color:#4ade80; margin-bottom: 0.5rem;">✅ Q${index + 1}: Correct!</p>`;
            } else {
                feedbackHTML += `<p style="color:#ef4444; margin-bottom: 0.5rem;">❌ Q${index + 1}: Incorrect. Answer: ${q.correct}<br><small style="color: #ccc;">${q.explanation}</small></p>`;
            }
        } else {
            // OE - Just save
            const val = document.getElementById(`q${index}`).value;
            answers.push({ q: index, val: val, type: 'OE' });
            feedbackHTML += `<p style="color:#f59e0b; margin-bottom: 0.5rem;">⏳ Q${index + 1}: Submitted for Teacher Review.</p>`;
        }
    });

    feedbackHTML += '</div>';

    const grade = mcCount > 0 ? Math.round((score / mcCount) * 100) : 0;

    // Calculate final grade
    const finalGrade = grade;

    const ctrl = document.querySelector('.controls');
    ctrl.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 2rem; border-radius: 16px; margin-top: 2rem;">
            <h1 style="color:white; margin-bottom: 1rem;">Quiz Completed! 🏁</h1>
            <div style="font-size: 4rem; color: ${finalGrade >= 70 ? '#4ade80' : '#ef4444'}; font-weight: 800; margin-bottom: 1rem;">${finalGrade}%</div>
            <p style="color: #cbd5e1; margin-bottom: 2rem;">(Multiple Choice Score)</p>
            
            ${feedbackHTML}
            
            <button onclick="renderGrades()" class="start-btn" style="margin-top:2rem; background: #3b82f6;">Return to Dashboard</button>
        </div>
    `;

    speak(`Quiz submitted! You got ${score} out of ${mcCount} on the multiple choice questions. I've sent your open-ended answers to your teacher.`);
};

document.addEventListener('DOMContentLoaded', initApp);


window.submitStudentQuiz = function () {
    const quiz = state.currentQuiz;
    let score = 0;
    let mcCount = 0;
    let feedbackHTML = '<div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; max-height: 300px; overflow-y: auto;">';

    // Collect Answers
    const answers = [];

    quiz.questions.forEach((q, index) => {
        if (q.type === 'MC') {
            mcCount++;
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            const val = selected ? selected.value : null;
            answers.push({ q: index, val: val, correct: val === q.correct });

            if (val === q.correct) {
                score++;
                feedbackHTML += `<p style="color:#4ade80; margin-bottom: 0.5rem;">✅ Q${index + 1}: Correct!</p>`;
            } else {
                feedbackHTML += `<p style="color:#ef4444; margin-bottom: 0.5rem;">❌ Q${index + 1}: Incorrect. Answer: ${q.correct}<br><small style="color: #ccc;">${q.explanation}</small></p>`;
            }
        } else {
            // OE - Just save
            const val = document.getElementById(`q${index}`).value;
            answers.push({ q: index, val: val, type: 'OE' });
            feedbackHTML += `<p style="color:#f59e0b; margin-bottom: 0.5rem;">⏳ Q${index + 1}: Submitted for Teacher Review.</p>`;
        }
    });

    feedbackHTML += '</div>';

    const grade = mcCount > 0 ? Math.round((score / mcCount) * 100) : 0;

    // Calculate final grade
    const finalGrade = grade;

    const ctrl = document.querySelector('.controls');
    ctrl.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 2rem; border-radius: 16px; margin-top: 2rem;">
            <h1 style="color:white; margin-bottom: 1rem;">Quiz Completed! 🏁</h1>
            <div style="font-size: 4rem; color: ${finalGrade >= 70 ? '#4ade80' : '#ef4444'}; font-weight: 800; margin-bottom: 1rem;">${finalGrade}%</div>
            <p style="color: #cbd5e1; margin-bottom: 2rem;">(Multiple Choice Score)</p>
            
            ${feedbackHTML}
            
            <button onclick="renderGrades()" class="start-btn" style="margin-top:2rem; background: #3b82f6;">Return to Dashboard</button>
        </div>
    `;
};

document.addEventListener('DOMContentLoaded', initApp);
