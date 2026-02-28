class FourFingerScene extends Phaser.Scene {
  constructor() {
    super("FourFingerScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();
    
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    this.round = 0;
    this.score = 0;
    this.missed = 0;
    this.maxRounds = 10;
    this.timeLimit = 2000;
    this.reactionTimes = [];
    
    this.isPaused = false;

    this.createPads();
    this.createUI();
    this.createPauseButton();
    this.startCountdown();

    this.inputManager.on("PAD_PRESSED", (index) => {
      if (!this.isCountingDown) this.handlePadPress(index);
    });
    this.inputManager.on("PAUSE", () => {
      if (!this.isPaused) this.showPauseMenu();
    });

    this.events.once("shutdown", () => {
      if (this.inputManager) this.inputManager.destroy();
    });
  }

  createBackground() {
    this.bg = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;
    // Premium dark clinical background (Deep Slate / Navy)
    this.bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  createPads() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.pads = [];
    const labels = ["Index\n(A)", "Middle\n(S)", "Ring\n(D)", "Pinky\n(F)"];
    
    // Draw a stylized hand silhouette background
    this.handGraphics = this.add.graphics();
    this.handGraphics.fillStyle(0x1e293b, 0.6);
    this.handGraphics.lineStyle(2, 0x334155, 1);
    
    // Draw abstract palm and wrist
    this.handGraphics.fillRoundedRect(width * 0.35, height * 0.6, width * 0.3, height * 0.3, 20);
    this.handGraphics.strokeRoundedRect(width * 0.35, height * 0.6, width * 0.3, height * 0.3, 20);

    for (let i = 0; i < 4; i++) {
      // Create circular pads that look like fingertips
      const x = width * (0.2 + i * 0.2);
      const y = height * 0.5 - (i === 1 || i === 2 ? 30 : 0); // Middle/Ring fingers slightly higher

      const pad = this.add.circle(x, y, 60, 0x1e293b).setStrokeStyle(4, 0x334155);
      
      this.handGraphics.fillRoundedRect(x - 20, y, 40, height * 0.6 - y + 20, 20); // Finger connecting to palm
      this.handGraphics.strokeRoundedRect(x - 20, y, 40, height * 0.6 - y + 20, 20);

      const text = this.add
        .text(pad.x, pad.y, labels[i], {
          fontFamily: "Poppins",
          fontSize: "18px",
          color: "#e2e8f0",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5);

      this.pads.push({ pad, text });
    }
    
    // Push graphics behind pads
    this.handGraphics.setDepth(-1);
  }

  createUI() {
    this.infoText = this.add
      .text(this.scale.width / 2, this.scale.height * 0.85, "", {
        fontFamily: "Poppins",
        fontSize: "22px",
        color: "#e2e8f0",
      })
      .setOrigin(0.5);
  }

  startCountdown() {
    this.isCountingDown = true;
    let count = 3;
    
    const countdownText = this.add.text(this.scale.width / 2, this.scale.height / 2, count.toString(), {
      fontFamily: "Poppins",
      fontSize: "80px",
      color: "#ffffff",
      fontStyle: "bold",
      shadow: { blur: 15, color: '#00e5ff', fill: true }
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          countdownText.setText(count.toString());
          this.tweens.add({ targets: countdownText, scale: { from: 1.5, to: 1 }, duration: 200 });
        } else if (count === 0) {
          countdownText.setText("GO!");
          countdownText.setColor("#4CAF50");
          this.tweens.add({ targets: countdownText, scale: { from: 1.5, to: 1 }, duration: 200 });
        } else {
          countdownText.destroy();
          this.isCountingDown = false;
          this.startRound();
        }
      }
    });
  }

  startRound() {
    if (this.round >= this.maxRounds) {
      this.endGame();
      return;
    }

    this.round++;
    this.roundHandled = false;
    this.roundStartTime = this.time.now;
    
    // Dynamic difficulty: Timer speeds up as round progresses
    const currentTimerLimit = Math.max(800, this.timeLimit - (this.round * 100));

    this.activeIndex = Phaser.Math.Between(0, 3);
    this.highlightPad(this.activeIndex);

    if (this.roundTimer) {
      this.roundTimer.remove(false);
    }

    this.roundTimer = this.time.delayedCall(currentTimerLimit, () => {
      if (!this.roundHandled && !this.isPaused) {
        this.missed++;
        this.clearHighlight();
        this.startRound();
      }
    });
  }

  highlightPad(index) {
    this.pads[index].pad.setStrokeStyle(6, 0x00e5ff);
    this.pads[index].pad.setFillStyle(0x00e5ff, 0.2);
  }

  clearHighlight() {
    this.pads.forEach((p) => {
      p.pad.setStrokeStyle(4, 0x334155);
      p.pad.setFillStyle(0x1e293b, 1);
    });
  }

  handlePadPress(pressedIndex) {
    if (this.roundHandled || this.isPaused || this.isCountingDown) return;

    this.roundHandled = true;

    if (this.roundTimer) {
      this.roundTimer.remove(false);
    }

    this.clearHighlight();

    // Visual press animation
    const pressedPad = this.pads[pressedIndex].pad;
    this.tweens.add({
      targets: pressedPad,
      scale: 0.8,
      duration: 100,
      yoyo: true,
    });

    if (pressedIndex === this.activeIndex) {
      this.score++;
      
      this.audioManager.playPop();

      const reaction = this.time.now - this.roundStartTime;
      this.reactionTimes.push(reaction);
    } else {
      this.missed++;
    }

    this.startRound();
  }

  endGame() {
    this.inputManager.removeAllListeners();

    const accuracy = Helpers.calculateAccuracy(this.score, this.maxRounds);

    const avgReaction =
      this.reactionTimes.length > 0
        ? (
            this.reactionTimes.reduce((a, b) => a + b, 0) /
            this.reactionTimes.length /
            1000
          ).toFixed(2)
        : 0;

    this.showResultPanel(accuracy, avgReaction);
  }

  showResultPanel(accuracy, avgReaction) {
    const width = this.scale.width;
    const height = this.scale.height;

    this.overlay = UIManager.createOverlay(this);
    const panel = UIManager.createPanel(this, width / 2, height + 300, 400, 320, "Session Complete");

    const resultText = this.add
      .text(0, -30,
        `Score: ${this.score}\nMissed: ${this.missed}\nAccuracy: ${accuracy}%\nAvg Reaction: ${avgReaction}s`,
        {
          fontFamily: "Poppins",
          fontSize: "22px",
          color: "#444",
          align: "center",
        })
      .setOrigin(0.5);

    const restartBtn = UIManager.createButton(this, 0, 60, "Restart", 0x4CAF50, () => {
      this.scene.restart();
    });

    const menuBtn = UIManager.createButton(this, 0, 120, "Main Menu", 0x2196F3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    });
    
    restartBtn.setFontSize('20px');
    menuBtn.setFontSize('20px');

    panel.add([resultText, restartBtn, menuBtn]);

    // Animate panel slide up
    this.tweens.add({
      targets: panel,
      y: height / 2,
      scale: 1,
      alpha: 1,
      duration: 600,
      ease: "Back.easeOut",
    });
  }

  /* ---------------- PAUSE SYSTEM ---------------- */

  createPauseButton() {
    const x = this.scale.width - 65;
    this.pauseBtn = UIManager.createButton(this, x, 35, "Pause", 0xffaa00, () => {
      this.showPauseMenu();
    }, 110, 38);
    this.pauseBtn.setFontSize(15);
    this.pauseBtn.setDepth(1000);
  }

  showPauseMenu() {
    if (this.isPaused) return;

    this.isPaused = true;

    if (this.roundTimer) this.roundTimer.paused = true;

    const width = this.scale.width;
    const height = this.scale.height;

    this.overlay = UIManager.createOverlay(this);
    this.pausePanel = UIManager.createPanel(this, width / 2, height / 2, 320, 300, "⏸  PAUSED");

    const resumeBtn = UIManager.createButton(this, 0, -50, "▶  Resume", 0x00c853, () => {
      this.resumeGame();
    }, 220, 44);
    resumeBtn.setFontSize(16);

    const restartBtn = UIManager.createButton(this, 0, 6, "↺  Restart", 0xff9800, () => {
      this.scene.restart();
    }, 220, 44);
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(this, 0, 62, "⌂  Main Menu", 0x2196f3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 220, 44);
    menuBtn.setFontSize(16);

    this.pausePanel.add([resumeBtn, restartBtn, menuBtn]);
    this.pausePanel.show();
  }

  resumeGame() {
    this.pausePanel.hide(() => {
      this.pausePanel.destroy();
      this.overlay.destroy();

      if (this.roundTimer) this.roundTimer.paused = false;

      this.isPaused = false;
    });
  }
}