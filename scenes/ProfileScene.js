class ProfileScene extends Phaser.Scene {
    constructor() {
        super("ProfileScene");
    }

    create() {
        this.cameras.main.fadeIn(500);
        this.createBackground();
        this.createLayout();
        
        // Fetch stats
        this.loadStats();

        this.scale.on("resize", this.updateLayout, this);
    }

    createBackground() {
        this.bg = this.add.graphics();
        this.drawBackground();
    }

    drawBackground() {
        const { width, height } = this.scale;
        this.bg.clear();
        // Deep purple to navy gradient
        this.bg.fillGradientStyle(0x1a0b2e, 0x1a0b2e, 0x0f172a, 0x0f172a, 1);
        this.bg.fillRect(0, 0, width, height);
    }

    createLayout() {
        const { width, height } = this.scale;

        // Title Header
        this.title = this.add.text(width / 2, 60, "PLAYER PROFILE", {
            fontFamily: "Poppins",
            fontSize: "48px",
            color: "#ffffff",
            fontStyle: "800",
            shadow: { blur: 15, color: '#e0b0ff', fill: true }
        }).setOrigin(0.5);

        // User Email Text (placeholder until load)
        const user = authManager.getUser();
        this.emailText = this.add.text(width / 2, 110, user ? user.email : "Loading...", {
            fontFamily: "Poppins",
            fontSize: "20px",
            color: "#cbd5e1",
            letterSpacing: 2
        }).setOrigin(0.5);


        // Change Password Button (Top Right)
        this.pwdToggleBtn = new Button(this, width - 110, 45, "Change Password", 0x4a1080, () => {
            this.showPasswordModal();
        }, 180, 40);
        this.pwdToggleBtn.setFontSize(16);

        // Modal Background Overlay
        this.modalOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive()
            .setVisible(false)
            .setDepth(1500);

        // Password Modal Panel
        this.pwdModal = new Panel(this, width / 2, height / 2, 450, 280, "UPDATE PASSWORD");
        this.pwdModal.hide();
        this.pwdModal.setDepth(1600);

        // Simple DOM Form for the Modal
        const pwdFormHtml = `
            <div id="pwdModalForm" style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 350px;">
                <div style="position: relative; width: 100%;">
                    <input type="password" name="newPassword" placeholder="Enter new password" 
                           style="box-sizing: border-box; width: 100%; padding: 12px; padding-right: 40px; font-size: 16px; border-radius: 8px; border: 2px solid #e0b0ff; background: #1a0533; color: white; outline: none; font-family: 'Poppins', sans-serif;" />
                    <span id="toggleNewPassword" style="position: absolute; right: 12px; top: 12px; cursor: pointer; font-size: 18px;">👁️</span>
                </div>
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button id="submitPwdBtn" style="flex: 2; padding: 12px; font-size: 16px; border-radius: 8px; border: none; background: #6bcb77; color: white; font-family: 'Poppins', sans-serif; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Update Password</button>
                    <button id="closePwdBtn" style="flex: 1; padding: 12px; font-size: 16px; border-radius: 8px; border: none; background: #ff4444; color: white; font-family: 'Poppins', sans-serif; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Cancel</button>
                </div>
                <p id="pwdFeedback" style="text-align: center; color: #ff4444; font-family: 'Poppins', sans-serif; font-size: 14px; margin: 0; min-height: 20px;"></p>
            </div>
        `;
        
        this.pwdFormDom = this.add.dom(width / 2, height / 2 + 30).createFromHTML(pwdFormHtml);
        this.pwdFormDom.setDepth(1700).setVisible(false);

        this.pwdFormDom.addListener('click');
        this.pwdFormDom.on('click', (event) => {
            if (event.target.id === 'toggleNewPassword') {
                const passInput = this.pwdFormDom.getChildByName('newPassword');
                if (passInput) {
                    if (passInput.type === 'password') {
                        passInput.type = 'text';
                        event.target.innerText = '🙈';
                    } else {
                        passInput.type = 'password';
                        event.target.innerText = '👁️';
                    }
                }
            } else if (event.target.id === 'submitPwdBtn') {
                event.preventDefault();
                this.handleChangePassword();
            } else if (event.target.id === 'closePwdBtn') {
                this.hidePasswordModal();
            }
        });

        // Container for Stat Cards
        this.cardsContainer = this.add.container(0, 0);

        // Back Button
        this.backBtn = UIManager.createButton(this, width / 2, height - 60, "⌂  Main Menu", 0x4a1080, () => {
            SceneTransitionManager.transitionTo(this, "MenuScene");
        }, 200, 50);
        this.backBtn.setFontSize(18);

        this.updateLayout();
    }

    async loadStats() {
        this.stats = await dataManager.getUserStats();
        if (this.stats) {
            this.emailText.setText(this.stats.email);
            this.renderStatCards();
        }
    }

    renderStatCards() {
        if (!this.stats || !this.stats.detailed) return;
        
        // Clear previous cards if any
        this.cardsContainer.removeAll(true);

        const { width, height } = this.scale;
        
        // Define details for each game
        const gameDefs = [
            { id: "pop_the_balloon", title: "🎈 Pop the Balloon", color: 0xff6fa5 },
            { id: "four_finger_rush", title: "🖐 Four Finger Rush", color: 0x6bcb77 },
            { id: "trace_path", title: "〰️ Trace the Path", color: 0xffd93d },
            { id: "color_sort", title: "🎨 Color Sort", color: 0x4d96ff }
        ];

        let index = 0;
        const startY = height * 0.32; // Moved up since pwd form moved to top right
        const cardWidth = Math.min(width * 0.4, 350);
        const cardHeight = 160;
        const gapX = cardWidth + 40;
        const gapY = cardHeight + 40;

        // Calculate a centered grid based on how many cards are generated
        const startX = width / 2 - (gapX / 2);

        gameDefs.forEach(def => {
            const data = this.stats.detailed[def.id];
            if (data) {
                // Layout 2x2 grid
                const col = index % 2;
                const row = Math.floor(index / 2);
                
                const x = startX + (col * gapX);
                const y = startY + (row * gapY);

                const cardBox = this.add.graphics();
                cardBox.fillStyle(0x1e293b, 0.8);
                cardBox.lineStyle(3, def.color, 1);
                cardBox.fillRoundedRect(x - cardWidth/2, y, cardWidth, cardHeight, 16);
                cardBox.strokeRoundedRect(x - cardWidth/2, y, cardWidth, cardHeight, 16);

                const cardTitle = this.add.text(x, y + 25, def.title, {
                    fontFamily: "Poppins", fontSize: "20px", fontStyle: "bold", color: "#ffffff"
                }).setOrigin(0.5);

                const countText = this.add.text(x, y + 60, `Plays: ${data.plays}`, {
                    fontFamily: "Poppins", fontSize: "16px", color: "#94a3b8"
                }).setOrigin(0.5);

                let metricTextStr = "";
                if (def.id === "pop_the_balloon") {
                    metricTextStr = `Avg Accuracy: ${data.avgAccuracy}%\nAvg Time: ${data.avgReaction}s`;
                } else if (def.id === "color_sort" || def.id === "four_finger_rush") {
                    metricTextStr = `Avg Score: ${data.avgScore}\nAvg Accuracy: ${data.avgAccuracy}%`;
                } else if (def.id === "trace_path") {
                    metricTextStr = `Avg Errors: ${data.avgErrors}\nAvg Time: ${data.avgTime}s`;
                }

                const metricsText = this.add.text(x, y + 105, metricTextStr, {
                    fontFamily: "Poppins", fontSize: "18px", color: "#e2e8f0", align: "center"
                }).setOrigin(0.5);

                this.cardsContainer.add([cardBox, cardTitle, countText, metricsText]);
                
                // Add minor pop-in animation
                cardBox.setAlpha(0);
                this.tweens.add({ targets: [cardBox, cardTitle, countText, metricsText], alpha: 1, duration: 400, delay: index * 100 });

                index++;
            }
        });
    }

    updateLayout() {
        const { width, height } = this.scale;

        this.drawBackground();

        if (this.title) this.title.setPosition(width / 2, Math.max(60, height * 0.12));
        if (this.emailText) this.emailText.setPosition(width / 2, Math.max(110, height * 0.17));
        
        if (this.pwdToggleBtn) this.pwdToggleBtn.setPosition(width - 110, 45);
        if (this.pwdModal) this.pwdModal.setPosition(width / 2, height / 2);
        if (this.modalOverlay) this.modalOverlay.setSize(width, height);
        if (this.pwdFormDom) this.pwdFormDom.setPosition(width / 2, height / 2 + 30);

        if (this.backBtn) this.backBtn.setPosition(width / 2, height - Math.max(40, height * 0.05));
        
        // Re-render cards if size changes to maintain center constraints
        if (this.stats && this.stats.detailed) {
            this.renderStatCards();
        }
    }

    async handleChangePassword() {
        const passInput = this.pwdFormDom.getChildByName('newPassword');
        const feedbackText = this.pwdFormDom.getChildByID('pwdFeedback');
        
        if (!passInput || !feedbackText) return;

        const newPwd = passInput.value.trim();

        if (!newPwd || newPwd.length < 6) {
            feedbackText.style.color = "#ff4444";
            feedbackText.innerText = "Password must be at least 6 characters.";
            return;
        }

        feedbackText.style.color = "#ffffff";
        feedbackText.innerText = "Updating password...";

        const result = await authManager.changePassword(newPwd);

        if (result.success) {
            feedbackText.style.color = "#44ff44";
            feedbackText.innerText = "Password updated successfully!";
            passInput.value = ""; // clear input
            
            // Auto close after 1.5s
            this.time.delayedCall(1500, () => {
                this.hidePasswordModal();
            });
        } else {
            feedbackText.style.color = "#ff4444";
            feedbackText.innerText = result.error || "Failed to update password.";
        }
    }

    showPasswordModal() {
        this.modalOverlay.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: this.modalOverlay, alpha: 1, duration: 300 });

        this.pwdModal.show();
        this.pwdFormDom.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: this.pwdFormDom, alpha: 1, duration: 300, delay: 100 });
    }

    hidePasswordModal() {
        this.tweens.add({ targets: this.modalOverlay, alpha: 0, duration: 200, onComplete: () => this.modalOverlay.setVisible(false) });
        this.pwdModal.hide();
        this.tweens.add({ targets: this.pwdFormDom, alpha: 0, duration: 200, onComplete: () => this.pwdFormDom.setVisible(false) });
        
        // Clear feedback and input
        const feedback = this.pwdFormDom.getChildByID('pwdFeedback');
        if (feedback) feedback.innerText = '';
        const input = this.pwdFormDom.getChildByName('newPassword');
        if (input) input.value = '';
    }
}
