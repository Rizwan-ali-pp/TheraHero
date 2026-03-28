class ProfileScene extends Phaser.Scene {
    constructor() {
        super("ProfileScene");
    }

    create() {
        this.cameras.main.fadeIn(500);
        this.drawBackground();
        this.createLayout();
        
        this.loadStats();

        this.scale.on("resize", this.updateLayout, this);
    }

    drawBackground() {
        if (!this.bg) this.bg = this.add.graphics();
        const { width, height } = this.scale;
        this.bg.clear();
        
        // Deep mesmerizing nebula background for absolute premium UX
        this.bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x24243e, 1);
        this.bg.fillRect(0, 0, width, height);

        // Add some glowing ambient accent orbs
        this.bg.fillStyle(0x4a00e0, 0.15);
        this.bg.fillCircle(width * 0.2, height * 0.3, 300);
        this.bg.fillStyle(0x8e2de2, 0.15);
        this.bg.fillCircle(width * 0.8, height * 0.7, 400);
    }

    createLayout() {
        const { width, height } = this.scale;

        // Title Header
        this.title = this.add.text(width / 2, 50, "Player Dashboard", {
            fontFamily: "Poppins",
            fontSize: "48px",
            color: "#ffffff",
            fontStyle: "800",
            shadow: { blur: 20, color: '#00e5ff', fill: true }
        }).setOrigin(0.5);

        // User Email Text
        const user = authManager.getUser();
        this.emailText = this.add.text(width / 2, 100, user ? user.email.toUpperCase() : "LOADING...", {
            fontFamily: "Poppins", fontSize: "16px", color: "#a8b2d1", letterSpacing: 4, fontStyle: "bold"
        }).setOrigin(0.5);

        // Hero Stat (Total Plays)
        this.heroStatCircle = this.add.graphics();
        this.heroStatText = this.add.text(width / 2, 180, "0\nSessions", {
            fontFamily: "Poppins", fontSize: "28px", color: "#ffffff", align: "center", fontStyle: "bold"
        }).setOrigin(0.5);

        // Change Password Button (Top Right corner)
        this.pwdToggleBtn = new Button(this, width - 110, 45, "Change Password", 0x1a0533, () => {
            this.showPasswordModal();
        }, 180, 40);
        this.pwdToggleBtn.setFontSize(14);
        this.pwdToggleBtn.bg.setStrokeStyle(2, 0x00e5ff);

        // Modals
        this.createPasswordModal();

        // Container for Stat Cards
        this.cardsContainer = this.add.container(0, 0);

        // Back Button (Bottom Center)
        this.backBtn = UIManager.createButton(this, width / 2, height - 50, "⌂ Return to Menu", 0x24243e, () => {
            SceneTransitionManager.transitionTo(this, "MenuScene");
        }, 220, 50);
        this.backBtn.bg.setStrokeStyle(2, 0x9b59b6);
        this.backBtn.setFontSize(16);
    }

    createPasswordModal() {
        const { width, height } = this.scale;
        this.modalOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0).setInteractive().setVisible(false).setDepth(1500);
        this.pwdModal = new Panel(this, width / 2, height / 2, 450, 280, "UPDATE PASSWORD");
        this.pwdModal.hide();
        this.pwdModal.setDepth(1600);

        const pwdFormHtml = `
            <form id="pwdModalForm" style="display: flex; flex-direction: column; gap: 15px; align-items: center; width: 350px;" onsubmit="return false;">
                <div style="position: relative; width: 100%;">
                    <input type="password" name="newPassword" placeholder="Enter new password" 
                           style="box-sizing: border-box; width: 100%; padding: 12px; padding-right: 40px; font-size: 16px; border-radius: 8px; border: 2px solid #00e5ff; background: #0f0c29; color: white; outline: none; font-family: 'Poppins', sans-serif;" />
                </div>
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button id="submitPwdBtn" style="flex: 2; padding: 12px; font-size: 16px; border-radius: 8px; border: none; background: #00c853; color: white; font-family: 'Poppins', sans-serif; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Update</button>
                    <button id="closePwdBtn" style="flex: 1; padding: 12px; font-size: 16px; border-radius: 8px; border: none; background: #ff4444; color: white; font-family: 'Poppins', sans-serif; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Cancel</button>
                </div>
                <p id="pwdFeedback" style="text-align: center; color: #ff4444; font-family: 'Poppins', sans-serif; font-size: 14px; margin: 0; min-height: 20px;"></p>
            </form>
        `;
        
        this.pwdFormDom = this.add.dom(width / 2, height / 2 + 30).createFromHTML(pwdFormHtml);
        this.pwdFormDom.setDepth(1700).setVisible(false);

        this.pwdFormDom.addListener('click');
        this.pwdFormDom.on('click', (event) => {
            if (event.target.id === 'submitPwdBtn') {
                event.preventDefault();
                this.handleChangePassword();
            } else if (event.target.id === 'closePwdBtn') {
                this.hidePasswordModal();
            }
        });
    }

    async loadStats() {
        this.stats = await dataManager.getUserStats();
        if (this.stats) {
            this.emailText.setText(this.stats.email.toUpperCase());
            this.drawHeroStat(this.stats.totalPlays);
            this.renderStatCards();
        }
    }

    drawHeroStat(totalPlays) {
        const { width } = this.scale;
        this.heroStatCircle.clear();
        
        const boxW = 160;
        const boxH = 90;
        const boxX = (width / 2) - (boxW / 2);
        const boxY = 180 - (boxH / 2);

        this.heroStatCircle.lineStyle(3, 0x00e5ff, 1);
        this.heroStatCircle.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);
        this.heroStatCircle.fillStyle(0x00e5ff, 0.1);
        this.heroStatCircle.fillRoundedRect(boxX, boxY, boxW, boxH, 16);
        
        this.heroStatText.setText(`${totalPlays}\nSessions`);

        // Gentle therapeutic pulsing animation
        this.tweens.add({
            targets: this.heroStatCircle,
            alpha: 0.5,
            yoyo: true,
            repeat: -1,
            duration: 1500
        });
    }

    renderStatCards() {
        if (!this.stats || !this.stats.detailed) return;
        this.cardsContainer.removeAll(true);
        const { width, height } = this.scale;
        
        const gameDefs = [
            { id: "pop_the_balloon", title: "🎈 Balloon Pop", color: 0xff4757 },
            { id: "four_finger_rush", title: "🖐 8-Finger Rush", color: 0x2ed573 },
            { id: "trace_path", title: "〰️ Trace Path", color: 0xffa502 },
            { id: "color_sort", title: "🎨 Color Sort", color: 0x1e90ff },
            { id: "picture_puzzle", title: "🖼️ Pic Puzzle", color: 0x9b59b6 }
        ];

        let index = 0;
        const startY = 280;
        const cardWidth = Math.min(width * 0.3, 260); // Sleek, narrow profile cards
        const cardHeight = 140;
        const gapX = cardWidth + 20;
        const gapY = cardHeight + 20;

        gameDefs.forEach(def => {
            const data = this.stats.detailed[def.id];
            if (data) {
                // Layout: 3 cards centered in the top row, 2 cards centered in bottom row
                let row = index < 3 ? 0 : 1;
                let col = index < 3 ? index : (index - 3);
                
                let startX = (width / 2) - gapX; // Top row width distribution
                if (row === 1) {
                    startX = (width / 2) - (gapX / 2); // Bottom row width distribution
                }
                
                const x = startX + (col * gapX);
                const y = startY + (row * gapY);

                const cardBox = this.add.graphics();
                
                // Sleek glassmorphic background
                cardBox.fillStyle(0x130f40, 0.6);
                cardBox.fillRoundedRect(x - cardWidth/2, y, cardWidth, cardHeight, 16);
                
                // Glowing accent color edge
                cardBox.fillStyle(def.color, 1);
                cardBox.fillRoundedRect(x - cardWidth/2, y, cardWidth, 6, 16);
                cardBox.fillRect(x - cardWidth/2, y + 4, cardWidth, 2); 
                
                // Text Rendering
                const cardTitle = this.add.text(x, y + 25, def.title, {
                    fontFamily: "Poppins", fontSize: "18px", fontStyle: "bold", color: "#ffffff",
                    shadow: { blur: 10, color: Phaser.Display.Color.IntegerToColor(def.color).rgba, fill: true }
                }).setOrigin(0.5);

                const countText = this.add.text(x, y + 55, `Rounds: ${data.plays}`, {
                    fontFamily: "Poppins", fontSize: "14px", color: "#a8b2d1", fontStyle: "bold"
                }).setOrigin(0.5);

                let metricTextStr = "";
                if (def.id === "pop_the_balloon") metricTextStr = `🎯 Acc: ${data.avgAccuracy}%\n⏱ Time: ${data.avgReaction}s`;
                else if (def.id === "color_sort" || def.id === "four_finger_rush") metricTextStr = `⭐ Score: ${data.avgScore}\n🎯 Acc: ${data.avgAccuracy}%`;
                else if (def.id === "trace_path" || def.id === "picture_puzzle") metricTextStr = `❌ Err: ${data.avgErrors}\n⏱ Time: ${data.avgTime}s`;

                const metricsText = this.add.text(x, y + 100, metricTextStr, {
                    fontFamily: "Courier New", fontSize: "15px", color: "#00e5ff", align: "center", fontStyle: "bold"
                }).setOrigin(0.5);

                this.cardsContainer.add([cardBox, cardTitle, countText, metricsText]);
                
                // Entrance animations
                cardBox.setAlpha(0);
                cardBox.y += 20; 
                this.tweens.add({ targets: [cardBox, cardTitle, countText, metricsText], alpha: 1, y: "-=20", duration: 500, delay: index * 100, ease: 'Back.easeOut' });

                index++;
            }
        });
    }

    updateLayout() {
        const { width, height } = this.scale;
        this.drawBackground();
        if (this.title) this.title.setPosition(width / 2, 50);
        if (this.emailText) this.emailText.setPosition(width / 2, 100);
        if (this.heroStatCircle) this.drawHeroStat(this.stats ? this.stats.totalPlays : 0);
        if (this.pwdToggleBtn) this.pwdToggleBtn.setPosition(width - 110, 45);
        if (this.pwdModal) this.pwdModal.setPosition(width / 2, height / 2);
        if (this.modalOverlay) this.modalOverlay.setSize(width, height);
        if (this.pwdFormDom) this.pwdFormDom.setPosition(width / 2, height / 2 + 30);
        if (this.backBtn) this.backBtn.setPosition(width / 2, height - 50);
        if (this.stats && this.stats.detailed) this.renderStatCards();
    }

    async handleChangePassword() {
        const passInput = this.pwdFormDom.getChildByName('newPassword');
        const feedbackText = this.pwdFormDom.getChildByID('pwdFeedback');
        if (!passInput || !feedbackText) return;

        const newPwd = passInput.value;
        if (!newPwd || newPwd.length < 6) {
            feedbackText.style.color = "#ff4444";
            feedbackText.innerText = "Password must be at least 6 characters.";
            return;
        }

        feedbackText.style.color = "#00e5ff";
        feedbackText.innerText = "Updating...";

        const result = await authManager.changePassword(newPwd);
        if (result.success) {
            feedbackText.style.color = "#00c853";
            feedbackText.innerText = "Success!";
            passInput.value = "";
            this.time.delayedCall(1000, () => this.hidePasswordModal());
        } else {
            feedbackText.style.color = "#ff4444";
            feedbackText.innerText = result.error || "Failed.";
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
        const feedback = this.pwdFormDom.getChildByID('pwdFeedback');
        if (feedback) feedback.innerText = '';
        const input = this.pwdFormDom.getChildByName('newPassword');
        if (input) input.value = '';
    }
}
