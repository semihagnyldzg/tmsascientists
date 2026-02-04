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
debugBanner.innerText = 'v5 LOADED';
document.body.appendChild(debugBanner);

// Application Constants
// Application Constants
// secrets object is loaded from secrets.js

const pedagogyData = {
    "bot_name": "TMSA Curie",
    "intro_message": "Welcome scientists to TMSA Curie. Please select your grade.",
    "grades": [
        {
            "id": "5th",
            "title": "5th Graders",
            "intro_message": "Awesome! Welcome to 5th grade science. Let's explore a topic.",
            "strands": [
                {
                    "code": "GEN.5",
                    "title": "General Science",
                    "questions": [
                        {
                            "id": 501,
                            "text": "What is the largest planet in our solar system?",
                            "options": ["Earth", "Jupiter"],
                            "correct_answer": "Jupiter",
                            "explanation": "What observations about size differences have you noticed between the inner and outer planets?"
                        }
                    ]
                }
            ]
        },
        {
            "id": "8th",
            "title": "8th Graders",
            "intro_message": "Super! Let's dive into 8th grade science. Which standard would you like to review?",
            "strands": [
                {
                    "code": "PS.8.1",
                    "title": "Matter & Interactions",
                    "description": "Atoms, Periodic Table, Conservation of Mass, Physical/Chemical Changes",
                    "questions": [
                        {
                            "id": "PS.22",
                            "text": "A student pours a cloudy liquid through a thin piece of paper (filter) and into a beaker. The collected liquid is not cloudy. How should the student classify the original cloudy liquid?",
                            "options": ["Mixture (Filtration)", "Compound (Filtration)", "Mixture (Evaporation)"],
                            "correct_answer": "Mixture (Filtration)",
                            "explanation": "What made you think the filter played a key role here? What properties usually allow separation?"
                        },
                        {
                            "id": "PS.23",
                            "text": "A neutral Beryllium (Be) atom has 4 protons. If a model shows 5 protons, what is the error?",
                            "options": ["Too many protons", "Too many electrons", "Wrong location"],
                            "correct_answer": "Too many protons",
                            "explanation": "What determines an element's identity? How would adding a proton change the atom?"
                        },
                        {
                            "id": "PS.24",
                            "text": "How are the properties of Helium (He) and Krypton (Kr) similar?",
                            "options": ["Nonreactive gases", "Reactive gases", "Reactive liquids"],
                            "correct_answer": "Nonreactive gases",
                            "explanation": "What patterns do you notice in that specific group on the periodic table? Do they bond easily?"
                        },
                        {
                            "id": "PS.40",
                            "text": "Methane (CH4) consists of one carbon atom chemically bonded to four hydrogen atoms. How is methane classified?",
                            "options": ["Compound", "Element", "Mixture"],
                            "correct_answer": "Compound",
                            "explanation": "What is the difference between atoms just mixing vs bonding? What clues tell you they are bonded here?"
                        },
                        {
                            "id": "PS.41",
                            "text": "An unidentified element is metallic and reacts vigorously with water. Where is it likely found on the periodic table?",
                            "options": ["Left side (Alkali)", "Right side (Noble)", "Bottom"],
                            "correct_answer": "Left side (Alkali)",
                            "explanation": "What trends in reactivity have you observed across the table? Where are the most reactive metals usually found?"
                        },
                        {
                            "id": "PS.42",
                            "text": "When a hot air balloon inflates: 1) Air is heated and expands. 2) The balloon changes shape. Are these physical or chemical changes?",
                            "options": ["Both Physical", "Both Chemical", "Mixed"],
                            "correct_answer": "Both Physical",
                            "explanation": "What evidence would you look for if a chemical change appeared? Did the substance itself change or just its form?"
                        }
                    ]
                },
                {
                    "code": "LS.8.1",
                    "title": "Diseases & Pathogens",
                    "description": "Viruses, Bacteria, Parasites, Epidemics vs Pandemics",
                    "questions": [
                        {
                            "id": "LS.9",
                            "text": "How are viruses similar to parasites?",
                            "options": ["Require a host", "Multicellular", "Treatable with fungicides"],
                            "correct_answer": "Require a host",
                            "explanation": "What does a parasite need to survive? How does a virus compare to that?"
                        },
                        {
                            "id": "LS.18",
                            "text": "Which situation is most likely to prevent a viral epidemic from becoming a pandemic?",
                            "options": ["Global travel", "Vaccines & Isolation", "Antibiotics"],
                            "correct_answer": "Vaccines & Isolation",
                            "explanation": "What factors usually help a disease spread globally? How would your choice stop that spread?"
                        },
                        {
                            "id": "LS.36",
                            "text": "An illness is caused by a pathogen smaller than a cell that spreads through air and hijacks cells to copy itself. What is it?",
                            "options": ["Virus", "Bacteria", "Fungus"],
                            "correct_answer": "Virus",
                            "explanation": "What clue in the description made you rule out bacteria? How do these pathogens replicate?"
                        }
                    ]
                },
                {
                    "code": "LS.8.2",
                    "title": "Ecosystems",
                    "description": "Biotic/Abiotic Factors, Food Webs, Symbiosis",
                    "questions": [
                        {
                            "id": "LS.11",
                            "text": "Which choice describes a BIOTIC factor in an ecosystem?",
                            "options": ["Plants providing shelter", "Rainfall amount", "Temperature"],
                            "correct_answer": "Plants providing shelter",
                            "explanation": "What does the root 'bio' mean to you? How does that help classify these options?"
                        },
                        {
                            "id": "LS.19",
                            "text": "If wolves (predators of deer) are introduced to a forest, what happens to the deer's other competitors (like rabbits)?",
                            "options": ["More resources available", "Fewer resources", "They die out"],
                            "correct_answer": "More resources available",
                            "explanation": "If the deer population goes down, what enters the system for other animals to use?"
                        },
                        {
                            "id": "LS.37",
                            "text": "Food chain: Plants -> Beetle -> Snake -> Hawk. What happens if snakes are eliminated?",
                            "options": ["Beetles Increase, Hawks Decrease", "Both Increase", "Both Decrease"],
                            "correct_answer": "Beetles Increase, Hawks Decrease",
                            "explanation": "Trace the energy flow. Who eats the beetle? Who eats the snake? How does removing one link affect the others?"
                        },
                        {
                            "id": "LS.30",
                            "text": "How do algae contribute to the cycling of matter in a lake?",
                            "options": ["Produce Oxygen (O2)", "Produce CO2", "Consume O2"],
                            "correct_answer": "Produce Oxygen (O2)",
                            "explanation": "What process do algae use to make energy? What is released during that process?"
                        }
                    ]
                },
                {
                    "code": "LS.8.3",
                    "title": "Evolution & Genetics",
                    "description": "Fossils, Natural Selection, Adaptation",
                    "questions": [
                        {
                            "id": "LS.4",
                            "text": "The forelimbs of a toad (4 fingers) and a dolphin (flipper) have similar bone structures. What does this suggest?",
                            "options": ["Common Ancestry", "Random Chance", "No relation"],
                            "correct_answer": "Common Ancestry",
                            "explanation": "Why do you think animals with such different lifestyles would have similar bone patterns?"
                        },
                        {
                            "id": "LS.20",
                            "text": "What best helps determine if two organisms are the same species?",
                            "options": ["Physical Structures", "Diets", "Habitats"],
                            "correct_answer": "Physical Structures",
                            "explanation": "Is looking similar enough? What other test would usually confirm they are the same species?"
                        },
                        {
                            "id": "LS.21",
                            "text": "Marine iguanas swim and eat algae; land iguanas don't. They share an ancestor. This divergence is due to:",
                            "options": ["Natural Selection", "Human Intervention", "Choice"],
                            "correct_answer": "Natural Selection",
                            "explanation": "What advantage did swimming give the marine iguana? How did that trait get passed exclusively to them?"
                        },
                        {
                            "id": "LS.44",
                            "text": "Apatosaurus (150 MYA) and Diplodocus (154 MYA) are similar. What evidence shows common ancestry?",
                            "options": ["Older similar fossil (160 MYA)", "Newer fossil", "Same age fossil"],
                            "correct_answer": "Older similar fossil (160 MYA)",
                            "explanation": "If they are related, where in the timeline would you expect to find their shared ancestor?"
                        }
                    ]
                },
                {
                    "code": "ESS.8.1",
                    "title": "Earth History",
                    "description": "Fossils, Rock Layers, Earth's Age",
                    "questions": [
                        {
                            "id": "ESS.1",
                            "text": "Rock layers: Top=Short tails, Middle=Round tails, Bottom=Long tails. What happened?",
                            "options": ["Developed shorter tails", "Developed longer tails", "No change"],
                            "correct_answer": "Developed shorter tails",
                            "explanation": "Which layer represents the oldest time? What pattern do you see moving from old to new?"
                        },
                        {
                            "id": "ESS.12",
                            "text": "Water moving over falls formed a cave in the shale layer. Why?",
                            "options": ["Shale weathered faster", "Shale is harder", "Deposited minerals"],
                            "correct_answer": "Shale weathered faster",
                            "explanation": "What does the formation of a cave tell you about how that rock resisted the water compared to others?"
                        },
                        {
                            "id": "ESS.14",
                            "text": "Jody finds a rock downstream. What evidence links it to the falls?",
                            "options": ["Relative Hardness/Composition", "Volume", "Weight"],
                            "correct_answer": "Relative Hardness/Composition",
                            "explanation": "What properties of a rock usually stay the same even after it has moved location?"
                        }
                    ]
                },
                {
                    "code": "ESS.8.2",
                    "title": "Hydrosphere",
                    "description": "Water Cycle, Ocean Currents, Distribution",
                    "questions": [
                        {
                            "id": "ESS.2",
                            "text": "How do plants contribute to the water cycle?",
                            "options": ["Transpiration", "Evaporation", "Precipitation"],
                            "correct_answer": "Transpiration",
                            "explanation": "Where does the water go after the plant takes it in? How does it get back to the air?"
                        },
                        {
                            "id": "ESS.3",
                            "text": "As ocean water moves from the equator to the Arctic, it cools. What happens to its density?",
                            "options": ["Increases", "Decreases", "Stays same"],
                            "correct_answer": "Increases",
                            "explanation": "What happens to the molecules when water cools down? How does that affect how heavy it is for its size?"
                        }
                    ]
                },
                {
                    "code": "ESS.8.3",
                    "title": "Water Quality & Humans",
                    "description": "Stewardship, Bio-indicators, Eutrophication",
                    "questions": [
                        {
                            "id": "ESS.5",
                            "text": "How can people be good stewards of water resources?",
                            "options": ["Limiting nonessential usage", "Building dams", "Using more wells"],
                            "correct_answer": "Limiting nonessential usage",
                            "explanation": "What does 'stewardship' mean to you? Which action helps preserve the resource for the future?"
                        },
                        {
                            "id": "ESS.29",
                            "text": "Nutrient pollution increases algae. Bacteria feed on dying algae. What is the effect of the bacteria?",
                            "options": ["Decrease Dissolved Oxygen", "Increase Oxygen", "Feed on fish"],
                            "correct_answer": "Decrease Dissolved Oxygen",
                            "explanation": "What do bacteria need to survive as they decompose matter? Where do they get it from?"
                        }
                    ]
                },
                {
                    "code": "ESS.8.4",
                    "title": "Energy & Climate",
                    "description": "Renewable/Non-renewable, Global Climate Change",
                    "questions": [
                        {
                            "id": "ESS.6",
                            "text": "Is Geothermal energy renewable or nonrenewable?",
                            "options": ["Renewable", "Nonrenewable"],
                            "correct_answer": "Renewable",
                            "explanation": "What is the source of geothermal energy? Is that source likely to run out soon?"
                        },
                        {
                            "id": "ESS.7",
                            "text": "Permafrost melts due to warming => releases greenhouse gases. What does this cause?",
                            "options": ["More warming (Feedback loop)", "Cooling", "Less gases"],
                            "correct_answer": "More warming (Feedback loop)",
                            "explanation": "If specific gases trap heat, and melting releases more of them, what happens to the temperature?"
                        },
                        {
                            "id": "ESS.35",
                            "text": "Riding a bike instead of driving helps fossil fuels how?",
                            "options": ["Decreases depletion rate", "Increases reserves", "No effect"],
                            "correct_answer": "Decreases depletion rate",
                            "explanation": "Think about supply and demand. If we use less today, what happens to the supply for tomorrow?"
                        },
                        {
                            "id": "ESS.34",
                            "text": "Graph showing temperature anomalies increasing from 1960 to 2023 indicates:",
                            "options": ["Overall Warming Trend", "Overall Cooling Trend", "No Trend"],
                            "correct_answer": "Overall Warming Trend",
                            "explanation": "When you look at the line over many years, which direction is it generally pointing?"
                        }
                    ]
                }
            ]
        }
    ]
};

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
    questionAttempts: 0
};

// Application Logic
const initApp = () => {
    // DOM Elements - Selected Inside Event Listener to ensure they exist
    const robotEl = document.querySelector('.avatar-img');
    const messagesEl = document.querySelector('.messages');
    const controlsEl = document.querySelector('.controls');
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');

    // Speech Synthesis Setup
    const synth = window.speechSynthesis;
    let recognition;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            state.isListening = true;
            updateMicButton();
            robotEl.classList.add('listening');
        };

        recognition.onend = () => {
            state.isListening = false;
            updateMicButton();
            robotEl.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            addMessage(transcript, 'user');
            handleInput(transcript);
        };

        recognition.onerror = (event) => {
            console.log("Speech Error:", event.error);
            state.isListening = false;
            updateMicButton();
        };
    }

    // Helper Functions
    async function speak(text, callback) {
        console.log("Speaking (ElevenLabs Proxy):", text);

        if (state.isListening && recognition) {
            state.wasAuto_temp = state.autoListen;
            recognition.stop();
        }

        state.isSpeaking = true;
        robotEl.classList.add('speaking');

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${secrets.elevenLabsVoiceId}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': secrets.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) throw new Error(`ElevenLabs API Error: ${response.status}`);

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                state.isSpeaking = false;
                robotEl.classList.remove('speaking');
                if (callback) callback();

                if (state.wasAuto_temp && recognition) {
                    setTimeout(() => {
                        try { recognition.start(); } catch (e) { }
                    }, 500);
                }
            };

            audio.play();

        } catch (error) {
            console.error("TTS Error:", error);
            state.isSpeaking = false;
            robotEl.classList.remove('speaking');
            fallbackSpeak(text, callback);
        }
    }

    function fallbackSpeak(text, callback) {
        if (synth.speaking) synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.85; // Slower speed
        const voice = state.voices.find(v =>
            v.name.includes('Zira') ||
            v.name.includes('Google US English') ||
            v.name.includes('Samantha') ||
            v.name.includes('Female')
        ) || state.voices.find(v => v.lang.includes('en'));

        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            if (callback) callback();
            if (state.wasAuto_temp && recognition) recognition.start();
        };

        synth.speak(utterance);
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        messagesEl.appendChild(msgDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function handleInput(text) {
        const lowerText = text.toLowerCase().trim();

        if (state.currentPhase === 'grade_selection') {
            let grade = null;
            if (lowerText.includes('5') || lowerText.includes('five') || lowerText.includes('fifth')) {
                grade = pedagogyData.grades.find(g => g.id === '5th');
            } else if (lowerText.includes('8') || lowerText.includes('eight') || lowerText.includes('eighth')) {
                grade = pedagogyData.grades.find(g => g.id === '8th');
            }

            if (grade) {
                addMessage(`✅ Matched: ${grade.title}`, 'sestin');
                selectGrade(grade);
            } else {
                speak("I heard you, but I need you to choose 5th or 8th Grade.");
            }
        }
        else if (state.currentPhase === 'strand_selection') {
            const strand = state.currentGrade.strands.find(s => lowerText.includes(s.title.toLowerCase()));
            if (strand) {
                selectStrand(strand);
            } else {
                speak("Please select a topic.");
            }
        }
        else if (state.currentPhase === 'topic_selection') {
            speak("Please click the topic you would like to discuss.");
        }
        else if (state.currentPhase === 'question') {
            checkAnswer(text);
        }
    }

    function startApp() {
        console.log("Start button clicked!");
        state.autoListen = true;
        if (startOverlay) startOverlay.style.display = 'none';

        addMessage(pedagogyData.intro_message, 'sestin');
        speak(pedagogyData.intro_message, () => {
            renderGrades();
        });
    }
    // Expose startApp globally for debugging or fallback HTML onclick
    window.startApp = startApp;

    function renderGrades() {
        state.currentPhase = 'grade_selection';
        controlsEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'options-grid';

        pedagogyData.grades.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = g.title;
            btn.onclick = () => { addMessage(g.title, 'user'); selectGrade(g); };
            grid.appendChild(btn);
        });
        controlsEl.appendChild(grid);
    }

    function selectGrade(grade) {
        state.currentGrade = grade;
        addMessage(grade.intro_message, 'sestin');
        renderStrands();
        speak(grade.intro_message);
    }

    function renderStrands() {
        state.currentPhase = 'strand_selection';
        controlsEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'options-grid';

        state.currentGrade.strands.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = s.title;
            btn.onclick = () => { addMessage(s.title, 'user'); selectStrand(s); };
            grid.appendChild(btn);
        });
        controlsEl.appendChild(grid);
    }

    function selectStrand(strand) {
        state.currentStrand = strand;
        addMessage(strand.title, 'sestin');
        renderDiscussionTopics(); // Use the new menu flow
    }

    function renderDiscussionTopics() {
        state.currentPhase = 'topic_selection';
        controlsEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'options-grid';

        const prompt = `Good choice. What specific, scientific phenomenon shall we explore within ${state.currentStrand.title}?`;
        speak(prompt);

        state.currentStrand.questions.forEach((q, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = q.text.length > 50 ? q.text.substring(0, 47) + '...' : q.text;
            btn.onclick = () => { selectTopic(index); };
            grid.appendChild(btn);
        });

        controlsEl.appendChild(grid);
    }

    function selectTopic(index) {
        state.currentPhase = 'question';
        state.currentQuestionIndex = index;
        state.questionAttempts = 0;
        askQuestion();
    }

    function askQuestion() {
        const q = state.currentStrand.questions[state.currentQuestionIndex];
        addMessage(q.text, 'sestin');
        renderOptions(q.options);
        speak(q.text);
    }

    function checkAnswer(answerText) {
        const q = state.currentStrand.questions[state.currentQuestionIndex];
        const correctKeyword = q.correct_answer.toLowerCase().split(' ')[0].toLowerCase();
        const isMatched = answerText.toLowerCase().includes(correctKeyword);

        if (isMatched || answerText.toLowerCase() === q.correct_answer.toLowerCase()) {
            state.questionAttempts = 0;

            const deepeningPrompts = [
                `What evidence have you seen that supports the idea of ${q.correct_answer}?`,
                `How did you figure out that it is specifically ${q.correct_answer}?`,
                "What observations in nature connect to that idea?",
                "Can you think of an example where that applies?"
            ];

            let response = deepeningPrompts[Math.floor(Math.random() * deepeningPrompts.length)];

            if (q.explanation && Math.random() > 0.3) {
                response = q.explanation;
            }

            addMessage(response, 'sestin');
            speak(response, () => {
                nextStep();
            });
        } else {
            state.questionAttempts++;
            if (state.questionAttempts >= 2) {
                const pivotMsg = `If we look closely at the question "${q.text}", what clues do you see? Let's observe a pattern in the next example.`;
                addMessage(pivotMsg, 'sestin');
                speak(pivotMsg, () => {
                    nextStep();
                });
            } else {
                const feedback = `What makes you think that? What have you noticed that supports that idea?`;
                addMessage(feedback, 'sestin');
                speak(feedback);
            }
        }
    }

    function nextStep() {
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex < state.currentStrand.questions.length) {
            askQuestion();
        } else {
            const finishMsg = "Topic complete! Let's choose another.";
            addMessage(finishMsg, 'sestin');
            speak(finishMsg, () => {
                renderStrands();
            });
        }
    }

    function renderOptions(options) {
        controlsEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'options-grid';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => {
                addMessage(opt, 'user');
                checkAnswer(opt);
            };
            grid.appendChild(btn);
        });

        if (recognition) {
            const micBtn = document.createElement('button');
            micBtn.id = 'mic-btn';
            micBtn.innerHTML = '🎤 Speak Now';
            micBtn.onclick = toggleMic;

            const status = document.createElement('div');
            status.id = 'mic-status';
            status.style.fontSize = '0.8rem';
            status.style.opacity = '0.7';
            status.textContent = 'Auto-listening enabled';

            controlsEl.appendChild(grid);
            controlsEl.appendChild(micBtn);
            controlsEl.appendChild(status);
        } else {
            controlsEl.appendChild(grid);
        }
    }

    function updateMicButton() {
        const btn = document.getElementById('mic-btn');
        if (btn) {
            if (state.isListening) {
                btn.classList.add('active');
                btn.textContent = 'Listening...';
            } else {
                btn.classList.remove('active');
                btn.textContent = '🎤 Speak';
            }
        }
    }

    function toggleMic() {
        if (state.isListening) recognition.stop();
        else recognition.start();
    }

    // Init Logic
    window.speechSynthesis.onvoiceschanged = () => {
        state.voices = window.speechSynthesis.getVoices();
    };

    if (startBtn) {
        startBtn.addEventListener('click', startApp);
    } else {
        console.error("Start button not found!");
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
