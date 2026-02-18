// Firebase Manager
// Handles all interactions with Firestore (Save/Load Students)

class FirebaseManager {
    constructor() {
        this.db = null;
        this.isReady = false;

        // Wait for Firebase SDK to load
        if (window.firebase && window.firebaseConfig) {
            this.init();
        } else {
            console.log("Firebase SDK not yet loaded...");
            window.addEventListener('firebaseLoaded', () => this.init());
        }
    }

    init() {
        try {
            // Initialize App
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            this.db = firebase.firestore();
            this.isReady = true;
            console.log("🔥 Firebase Firestore Initialized!");
        } catch (e) {
            console.error("Firebase Init Error:", e);
        }
    }

    // Register a new student
    async registerStudent(studentData) {
        if (!this.isReady) {
            alert("Database connection not ready. Please refresh.");
            return false;
        }

        try {
            // Check if username exists
            const docRef = this.db.collection("students").doc(studentData.username);
            const doc = await docRef.get();

            if (doc.exists) {
                alert("❌ Username already taken! Please try another.");
                return false;
            }

            // Save new student
            await docRef.set({
                name: studentData.name,
                password: studentData.password, // Simple text for now (school project)
                school: studentData.school,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                progress: {},
                customQuestions: []
            });

            console.log("✅ User registered in Cloud:", studentData.username);
            return true;
        } catch (error) {
            console.error("Registration Error:", error);
            alert("Error registering user: " + error.message);
            return false;
        }
    }

    // --- JOURNAL FEATURES ---

    // Save a journal entry
    async saveJournalEntry(username, entry) {
        if (!this.isReady) return false;
        try {
            // entry = { date: "...", title: "...", content: "...", mood: "..." }
            await this.db.collection("students").doc(username).collection("journal").add({
                ...entry,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ Journal Saved");
            return true;
        } catch (e) {
            console.error("Journal Save Error:", e);
            return false;
        }
    }

    // Get journal entries
    async getJournalEntries(username) {
        if (!this.isReady) return [];
        try {
            const snapshot = await this.db.collection("students").doc(username).collection("journal")
                .orderBy("timestamp", "desc")
                .limit(20)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error("Journal Load Error:", e);
            return [];
        }
    }

    // --- ACTIVITY LOG features ---

    // Save an activity log (e.g., Question Correct, Simulation Opened)
    async saveActivityLog(username, action, details) {
        if (!this.isReady) return false;
        try {
            await this.db.collection("students").doc(username).collection("activity_logs").add({
                action: action, // 'question_correct', 'simulation_open', 'login'
                details: details, // { topic: 'Ecosystems', difficulty: 'Medium' }
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ Activity Logged:", action);
            return true;
        } catch (e) {
            console.error("Activity Log Error:", e);
            return false;
        }
    }

    // Get activity logs for the last N days
    async getActivityLogs(username, days = 7) {
        if (!this.isReady) return [];
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const snapshot = await this.db.collection("students").doc(username).collection("activity_logs")
                .where("timestamp", ">=", startDate)
                .orderBy("timestamp", "desc")
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error("Activity Load Error:", e);
            return [];
        }
    }

    // Login a student
    async loginStudent(username, password) {
        if (!this.isReady) return null;

        try {
            const docRef = this.db.collection("students").doc(username);
            const doc = await docRef.get();

            if (doc.exists) {
                const data = doc.data();
                if (data.password === password) {
                    console.log("✅ Cloud Login Success:", username);
                    return {
                        username: username,
                        name: data.name,
                        school: data.school,
                        isCloud: true
                    };
                } else {
                    console.warn("❌ Incorrect Cloud Password");
                }
            } else {
                console.warn("❌ User not found in Cloud");
            }
        } catch (error) {
            console.error("Login Check Error:", error);
        }
        return null;
    }
}

// Global Instance
window.fbManager = new FirebaseManager();
