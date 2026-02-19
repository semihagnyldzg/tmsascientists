const TeacherDashboard = {
    container: null,

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('teacher-dashboard')) {
            const div = document.createElement('div');
            div.id = 'teacher-dashboard';
            div.style.display = 'none';
            div.style.position = 'fixed';
            div.style.top = '0';
            div.style.left = '0';
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.background = 'rgba(15, 23, 42, 0.98)';
            div.style.zIndex = '20000';
            div.style.padding = '2rem';
            div.style.color = 'white';
            div.style.overflowY = 'auto'; // Allow scrolling
            document.body.appendChild(div);
            this.container = div;
        } else {
            this.container = document.getElementById('teacher-dashboard');
        }
    },

    open() {
        this.init();
        this.container.style.display = 'block';
        this.render();
    },

    close() {
        if (this.container) this.container.style.display = 'none';
    },

    render() {
        // Simple authentication check could go here, but for now we trust the button click

        let html = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h1 style="color: #4ade80;">🎓 Teacher Portal</h1>
                    <button onclick="TeacherDashboard.close()" style="background: #ef4444; border: none; color: white; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">Close X</button>
                </div>

                <div class="dashboard-card" style="width: 100%; text-align: left; margin-bottom: 2rem;">
                    <h3>🛠️ Create a New Quiz</h3>
                    <p>Select a grade and topic to generate a 10-question quiz (8 MC + 2 Open-Ended).</p>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <select id="teacher-grade-select" onchange="TeacherDashboard.updateStrands()" style="padding: 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.3); color: white; border: 1px solid #4ade80;">
                            <option value="">-- Select Grade --</option>
                            ${window.pedagogyData.grades.map(g => `<option value="${g.id}">${g.title}</option>`).join('')}
                        </select>
                        
                        <select id="teacher-strand-select" style="padding: 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.3); color: white; border: 1px solid #4ade80;">
                            <option value="">-- Select Topic First --</option>
                        </select>

                        <button onclick="TeacherDashboard.generateQuiz()" style="background: #4ade80; color: #064e3b; font-weight: bold; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; cursor: pointer;">Generate Quiz ⚡</button>
                    </div>
                </div>

                <div id="quiz-preview" style="display: none;">
                    <h3>📝 Quiz Preview</h3>
                    <div id="quiz-questions-list" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;"></div>
                    <button onclick="TeacherDashboard.assignQuiz()" style="width: 100%; background: #3b82f6; color: white; font-size: 1.2rem; padding: 1rem; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">📢 Assign to Class</button>
                </div>

                <div style="margin-top: 3rem; border-top: 1px solid #334155; padding-top: 1rem;">
                    <h3>📊 Active Assignments</h3>
                    <div id="active-assignments" style="color: #94a3b8;">No active quizzes.</div>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        this.updateActiveAssignments();
    },

    updateStrands() {
        const gradeId = document.getElementById('teacher-grade-select').value;
        const strandSelect = document.getElementById('teacher-strand-select');
        strandSelect.innerHTML = '<option value="">-- Select Topic --</option>';

        if (!gradeId) return;

        const grade = window.pedagogyData.grades.find(g => g.id === gradeId);
        if (grade) {
            grade.strands.forEach((s, index) => {
                strandSelect.innerHTML += `<option value="${index}">${s.title} (${s.code})</option>`;
            });
        }
    },

    currentGeneratedQuiz: null,

    generateQuiz() {
        const gradeId = document.getElementById('teacher-grade-select').value;
        const strandIndex = document.getElementById('teacher-strand-select').value;

        if (!gradeId || strandIndex === "") {
            alert("Please select both a Grade and a Topic.");
            return;
        }

        const grade = window.pedagogyData.grades.find(g => g.id === gradeId);
        const strand = grade.strands[strandIndex];

        // Logic to pick 8 MC and 2 Open Ended
        // If we don't have enough questions, we might repeat or use what we have.
        // For Open Ended, we can convert MC questions if needed or use specific ones if marked.

        let mcQuestions = [...strand.questions]; // Copy
        // Shuffle
        mcQuestions.sort(() => Math.random() - 0.5);

        const quizQuestions = [];

        // 1. Select up to 8 Multiple Choice
        const mcCount = Math.min(mcQuestions.length, 8);
        for (let i = 0; i < mcCount; i++) {
            let q = mcQuestions.shift();
            quizQuestions.push({
                type: 'MC',
                text: q.text,
                options: q.options,
                correct: q.correct_answer,
                explanation: q.explanation
            });
        }

        // 2. Add 2 Open Ended
        // We can create OE questions by asking "Explain why..." based on remaining MC questions
        // Or generic critical thinking questions if we run out.

        for (let i = 0; i < 2; i++) {
            let qSrc = mcQuestions.length > 0 ? mcQuestions.shift() : strand.questions[Math.floor(Math.random() * strand.questions.length)];

            // Transform to Open Ended
            quizQuestions.push({
                type: 'OE',
                text: `In your own words, explain the concept behind this question: "${qSrc.text}"`,
                rubric: "Look for keywords: " + qSrc.explanation.split(' ').slice(0, 5).join(' ') + "..."
            });
        }

        this.currentGeneratedQuiz = {
            id: Date.now(),
            title: `${grade.title}: ${strand.title}`,
            standard: strand.code,
            questions: quizQuestions,
            created: new Date().toISOString()
        };

        this.renderPreview();
    },

    renderPreview() {
        const previewDiv = document.getElementById('quiz-preview');
        const listDiv = document.getElementById('quiz-questions-list');

        previewDiv.style.display = 'block';
        listDiv.innerHTML = '';

        this.currentGeneratedQuiz.questions.forEach((q, i) => {
            let content = `<div><strong>${i + 1}. [${q.type}]</strong> ${q.text}</div>`;
            if (q.type === 'MC') {
                content += `<div style="font-size: 0.8rem; color: #aaa; margin-left: 1rem;">Options: ${q.options.join(', ')}</div>`;
            }
            listDiv.innerHTML += `<div style="margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">${content}</div>`;
        });
    },

    assignQuiz() {
        if (!this.currentGeneratedQuiz) return;

        // Save to LocalStorage (Simulated Backend)
        localStorage.setItem('tmsa_active_quiz', JSON.stringify(this.currentGeneratedQuiz));

        alert(`Quiz "${this.currentGeneratedQuiz.title}" assigned successfully! Students will see it on their dashboard.`);
        this.updateActiveAssignments();
        this.close();
    },

    updateActiveAssignments() {
        const active = localStorage.getItem('tmsa_active_quiz');
        const el = document.getElementById('active-assignments');
        if (el) {
            if (active) {
                const quiz = JSON.parse(active);
                el.innerHTML = `
                    <div style="background: rgba(59, 130, 246, 0.2); padding: 1rem; border-radius: 8px; border: 1px solid #3b82f6;">
                        <strong>${quiz.title}</strong>
                        <br><small>Assigned: ${new Date(quiz.created).toLocaleString()}</small>
                        <br><br>
                        <button onclick="TeacherDashboard.clearAssignment()" style="background: #ef4444; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer;">unassign / Clear</button>
                    </div>
                `;
            } else {
                el.innerHTML = "No active quiz assigned.";
            }
        }
    },

    clearAssignment() {
        if (confirm("Are you sure you want to remove the active quiz? Students will no longer see it.")) {
            localStorage.removeItem('tmsa_active_quiz');
            this.updateActiveAssignments();
        }
    }
};

// Expose globally
window.TeacherDashboard = TeacherDashboard;
