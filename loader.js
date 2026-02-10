// loader.js: Fetches and parses pedagogical_guides.md

// Global definition to replace the hardcoded one
window.pedagogyData = {
    bot_name: "TMSA Curie",
    intro_message: "Welcome scientists to TMSA Curie. Please select your grade.",
    grades: []
};

async function loadPedagogyData() {
    try {
        const response = await fetch('pedagogical_guides.md');
        if (!response.ok) throw new Error("Could not load pedagogical_guides.md");
        const text = await response.text();
        parseMarkdown(text);
        console.log("Pedagogy Data Loaded:", window.pedagogyData);

        // Signal that data is ready - if initApp was waiting or if we just call it now
        if (typeof window.startAppAfterLoad === 'function') {
            window.startAppAfterLoad();
        } else {
            // Fallback: If app_v5.js loads after this, it will just read the populated object
            document.dispatchEvent(new Event('pedagogyDataReady'));
        }
    } catch (error) {
        console.error("Error loading guides:", error);
        document.body.innerHTML += `<div style="color:red; background:white; padding:20px;">Error loading Brain: ${error.message}. Make sure you are running via start_server.bat</div>`;
    }
}

function parseMarkdown(mdText) {
    const lines = mdText.split('\n');
    let currentGrade = null;
    let currentStrand = null;
    let currentQuestion = null;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 1. Grade Detection (# Grade Name (ID: id))
        if (line.startsWith('# ')) {
            const match = line.match(/# (.*) \(ID: (.*)\)/);
            if (match) {
                currentGrade = {
                    id: match[2],
                    title: match[1],
                    intro_message: "Welcome!",
                    strands: []
                };
                window.pedagogyData.grades.push(currentGrade);
                currentStrand = null; // Reset strand
            }
        }
        // 2. Grade Intro Message
        else if (line.startsWith('Intro: ') && currentGrade && !currentStrand) {
            currentGrade.intro_message = line.replace('Intro: ', '').trim();
        }
        // 3. Strand Detection (## Strand Name (Code: code))
        else if (line.startsWith('## ')) {
            const match = line.match(/## (.*) \(Code: (.*)\)/);
            if (match && currentGrade) {
                currentStrand = {
                    code: match[2],
                    title: match[1],
                    description: "",
                    questions: []
                };
                currentGrade.strands.push(currentStrand);
            }
        }
        // 4. Strand Description
        else if (line.startsWith('Description: ') && currentStrand) {
            currentStrand.description = line.replace('Description: ', '').trim();
        }
        // 5. Question Detection
        else if (line.startsWith('Question: ') && currentStrand) {
            currentQuestion = {
                id: Math.floor(Math.random() * 10000), // Generate temp ID
                text: line.replace('Question: ', '').trim(),
                options: [],
                correct_answer: "",
                explanation: ""
            };
            currentStrand.questions.push(currentQuestion);
        }
        // 5.5 Topic Detection
        else if (line.startsWith('Topic: ') && currentQuestion) {
            currentQuestion.topic = line.replace('Topic: ', '').trim();
        }
        // 6. Options Detection
        else if (line.startsWith('Options: ') && currentQuestion) {
            const rawOptions = line.replace('Options: ', '').split(',');
            currentQuestion.options = rawOptions.map(opt => {
                opt = opt.trim();
                if (opt.startsWith('*')) {
                    currentQuestion.correct_answer = opt.substring(1); // Remove *
                    return opt.substring(1);
                }
                return opt;
            });
        }
        // 7. Explanation Detection
        else if (line.startsWith('Explanation: ') && currentQuestion) {
            currentQuestion.explanation = line.replace('Explanation: ', '').trim();
        }
        // 8. Analogy Detection
        else if (line.startsWith('Analogy: ') && currentQuestion) {
            currentQuestion.analogy = line.replace('Analogy: ', '').trim();
        }
    });
}

// Start loading immediately
loadPedagogyData();
