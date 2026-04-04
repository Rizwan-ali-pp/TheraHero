class DataManager {
    constructor() {
        this.db = firebase.firestore();
    }

    async saveGameResult(gameName, scoreOrData) {
        const user = authManager.getUser();
        if (!user) {
            console.warn("No user logged in, cannot save score out to Firestore.");
            return;
        }

        try {
            const data = {
                game: gameName,
                data: scoreOrData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.db.collection('users').doc(user.uid).collection('plays').add(data);
            console.log("Successfully saved game result to Firestore:", data);
            
            // Increment total plays for this user document
            await this.db.collection('users').doc(user.uid).set({
                email: user.email,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error saving game result to Firestore:", error);
        }
    }

    async getUserStats() {
        const user = authManager.getUser();
        if (!user) return null;

        try {
            const playsSnapshot = await this.db.collection('users').doc(user.uid).collection('plays')
                                         .orderBy('timestamp', 'desc')
                                         .limit(100)
                                         .get();

            const parsedStats = {
                pop_the_balloon: { count: 0, accuracySum: 0, reactionSum: 0 },
                color_sort: { count: 0, scoreSum: 0, accuracySum: 0, reactionSum: 0 },
                four_finger_rush: { count: 0, scoreSum: 0, accuracySum: 0, reactionSum: 0 },
                trace_path: { count: 0, errorsSum: 0, timeSum: 0 },
                picture_puzzle: { count: 0, errorsSum: 0, timeSum: 0 }
            };

            let totalPlays = 0;

            playsSnapshot.forEach(doc => {
                const gameDoc = doc.data();
                const gameName = gameDoc.game;
                const data = gameDoc.data;

                if (parsedStats[gameName]) {
                    totalPlays++;
                    const s = parsedStats[gameName];
                    s.count++;
                    
                    if (gameName === "pop_the_balloon") {
                        s.accuracySum += data.accuracy || 0;
                        s.reactionSum += parseFloat(data.avgReaction) || 0;
                    } 
                    else if (gameName === "color_sort" || gameName === "four_finger_rush") {
                        s.scoreSum += data.score || 0;
                        s.accuracySum += data.accuracy || 0;
                        s.reactionSum += parseFloat(data.avgReaction) || 0;
                    } 
                    else if (gameName === "trace_path" || gameName === "picture_puzzle") {
                        s.errorsSum += data.errors || 0;
                        s.timeSum += data.timeInSeconds || 0;
                    }
                }
            });

            // Calculate averages
            const finalStats = {
                email: user.email,
                totalPlays: totalPlays,
                detailed: {}
            };

            for (const [key, s] of Object.entries(parsedStats)) {
                if (s.count > 0) {
                    finalStats.detailed[key] = {
                        plays: s.count,
                        avgAccuracy: (typeof s.accuracySum === 'number' && !isNaN(s.accuracySum)) ? (s.accuracySum / s.count).toFixed(2) : "0.00",
                        avgReaction: (typeof s.reactionSum === 'number' && !isNaN(s.reactionSum)) ? (s.reactionSum / s.count).toFixed(2) : "0.00",
                        avgScore: (typeof s.scoreSum === 'number' && !isNaN(s.scoreSum)) ? (s.scoreSum / s.count).toFixed(2) : "0.00",
                        avgErrors: (typeof s.errorsSum === 'number' && !isNaN(s.errorsSum)) ? (s.errorsSum / s.count).toFixed(2) : "0.00",
                        avgTime: (typeof s.timeSum === 'number' && !isNaN(s.timeSum)) ? (s.timeSum / s.count).toFixed(2) : "0.00",
                    };
                }
            }

            return finalStats;
            
        } catch (error) {
            console.error("Error fetching user stats from Firestore:", error);
            return null;
        }
    }
    async getSessionHistory() {
        const user = authManager.getUser();
        if (!user) return null;

        try {
            const snap = await this.db.collection('users').doc(user.uid).collection('plays').get();
            const docs = [];

            snap.forEach(doc => {
                const d = doc.data();
                // Handle both Firestore Timestamps and native Dates
                let ts = new Date(0);
                if (d.timestamp) {
                    ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
                }
                docs.push({ game: d.game, data: d.data || {}, timestamp: ts });
            });

            // Sort ascending (oldest first) client-side — no Firestore index needed
            docs.sort((a, b) => a.timestamp - b.timestamp);

            console.log('[DataManager] getSessionHistory:', docs.length, 'sessions');
            return docs;

        } catch (error) {
            console.error('[DataManager] getSessionHistory error:', error.code, error.message);
            return null;
        }
    }
}

// Create global instance
const dataManager = new DataManager();
window.dataManager = dataManager;
