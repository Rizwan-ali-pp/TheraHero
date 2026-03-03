class LoginScene extends Phaser.Scene {
    constructor() {
        super("LoginScene");
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a0533).setOrigin(0);

        // Title
        this.add.text(width / 2, height * 0.2, "TheraHero Login", {
            fontFamily: 'Poppins',
            fontSize: '48px',
            color: '#ffd93d',
            fontStyle: 'bold',
            shadow: { blur: 10, color: '#ffd93d', fill: true }
        }).setOrigin(0.5);

        // Feedback Text
        this.feedbackText = this.add.text(width / 2, height * 0.35, "", {
            fontFamily: 'Poppins',
            fontSize: '20px',
            color: '#ff4444'
        }).setOrigin(0.5);

        // DOM Element for Inputs (Email & Password)
        const formHtml = `
            <div style="display: flex; flex-direction: column; gap: 15px; width: 300px;">
                <input type="email" name="email" placeholder="Email Address" 
                       style="padding: 12px; font-size: 18px; border-radius: 8px; border: 2px solid #ffd93d; background: #2a0845; color: white; outline: none; font-family: 'Poppins', sans-serif;" />
                <div style="position: relative; width: 100%;">
                    <input type="password" name="password" placeholder="Password" 
                           style="box-sizing: border-box; width: 100%; padding: 12px; padding-right: 40px; font-size: 18px; border-radius: 8px; border: 2px solid #ffd93d; background: #2a0845; color: white; outline: none; font-family: 'Poppins', sans-serif;" />
                    <span id="togglePassword" style="position: absolute; right: 12px; top: 14px; cursor: pointer; font-size: 18px;">👁️</span>
                </div>
                <a href="#" id="forgotPassword" style="color: #ffd93d; text-align: right; font-size: 14px; text-decoration: none; font-family: 'Poppins', sans-serif; margin-top: -5px;">Forgot Password?</a>
            </div>
        `;
        
        this.formDom = this.add.dom(width / 2, height * 0.5).createFromHTML(formHtml);

        this.formDom.addListener('click');
        this.formDom.on('click', (event) => {
            if (event.target.id === 'togglePassword') {
                const passInput = this.formDom.getChildByName('password');
                if (passInput) {
                    if (passInput.type === 'password') {
                        passInput.type = 'text';
                        event.target.innerText = '🙈';
                    } else {
                        passInput.type = 'password';
                        event.target.innerText = '👁️';
                    }
                }
            } else if (event.target.id === 'forgotPassword') {
                event.preventDefault();
                this.handleForgotPassword();
            }
        });

        // Buttons
        const btnWidth = 200;
        this.signInBtn = new Button(this, width / 2 - 110, height * 0.7, "Sign In", 0x4a1080, () => this.handleSignIn(), btnWidth);
        this.signUpBtn = new Button(this, width / 2 + 110, height * 0.7, "Sign Up", 0x1a0533, () => this.handleSignUp(), btnWidth);
        this.signUpBtn.bg.setStrokeStyle(2, 0xffd93d);

        // Check if user is already logged in
        this.checkAuth();
    }

    async checkAuth() {
        const isLoggedIn = await authManager.init();
        if (isLoggedIn) {
            SceneTransitionManager.transitionTo(this, "MenuScene");
        }
    }

    getCredentials() {
        const emailInput = this.formDom.getChildByName('email');
        const passwordInput = this.formDom.getChildByName('password');
        
        if (!emailInput || !passwordInput) return null;

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            this.showFeedback("Please enter email and password.", "#ff4444");
            return null;
        }

        return { email, password };
    }

    showFeedback(message, color = "#ff4444") {
        this.feedbackText.setText(message);
        this.feedbackText.setColor(color);
    }

    async handleSignIn() {
        const creds = this.getCredentials();
        if (!creds) return;

        this.showFeedback("Signing in...", "#ffffff");
        const result = await authManager.signIn(creds.email, creds.password);

        if (result.success) {
            this.showFeedback("Success!", "#44ff44");
            // Proceed to MenuScene
            SceneTransitionManager.transitionTo(this, "MenuScene");
        } else {
            this.showFeedback(result.error || "Sign in failed");
        }
    }

    async handleSignUp() {
        const creds = this.getCredentials();
        if (!creds) return;

        this.showFeedback("Creating account...", "#ffffff");
        const result = await authManager.signUp(creds.email, creds.password);

        if (result.success) {
            this.showFeedback("Account created! You can now log in.", "#44ff44");
            // If they are auto logged in, transition:
            if (authManager.getUser()) {
               setTimeout(() => {
                   SceneTransitionManager.transitionTo(this, "MenuScene");
               }, 1000);
            }
        } else {
            this.showFeedback(result.error || "Sign up failed");
        }
    }

    async handleForgotPassword() {
        const emailInput = this.formDom.getChildByName('email');
        if (!emailInput) return;
        const email = emailInput.value.trim();
        if (!email) {
            this.showFeedback("Please enter your email to reset password.", "#ff4444");
            return;
        }

        this.showFeedback("Sending reset email...", "#ffffff");
        const result = await authManager.resetPassword(email);

        if (result.success) {
            this.showFeedback("Password reset email sent!", "#44ff44");
        } else {
            this.showFeedback(result.error || "Failed to send reset email.", "#ff4444");
        }
    }
}
