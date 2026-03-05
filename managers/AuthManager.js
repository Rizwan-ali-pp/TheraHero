class AuthManager {
    constructor() {
        const firebaseConfig = {
            apiKey: "AIzaSyCnlPrl61eB1oPqp65iNj0EYoZ0UaF8EtU",
            authDomain: "therahero.firebaseapp.com",
            projectId: "therahero",
            storageBucket: "therahero.firebasestorage.app",
            messagingSenderId: "793762122295",
            appId: "1:793762122295:web:13a4f6e1c77ad7935e8db2"
        };
        
        // Initialize Firebase (Compat)
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        this.auth = firebase.auth();
        this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);
        this.currentUser = null;
        
        // Keep currentUser continuously updated across the app
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
        });
    }

    init() {
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(!!user);
            });
        });
    }

    async signUp(email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error("SignUp Error:", error.message);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error("SignIn Error:", error.message);
            // Provide friendlier errors
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                return { success: false, error: "Invalid email or password" };
            }
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error("Reset Password Error:", error.message);
            return { success: false, error: error.message };
        }
    }

    async changePassword(newPassword) {
        try {
            if (!this.currentUser) throw new Error("No user is logged in.");
            await this.currentUser.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            console.error("Change Password Error:", error.message);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
        } catch (error) {
            console.error("SignOut Error:", error.message);
        }
    }

    getUser() {
        return this.currentUser;
    }
}

// Create a global instance
const authManager = new AuthManager();
window.authManager = authManager;

