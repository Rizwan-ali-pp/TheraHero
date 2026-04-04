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
    // Vibrant deep violet to rich purple
    this.bg.fillGradientStyle(0x1a0533, 0x1a0533, 0x3d0f6b, 0x3d0f6b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  createPads() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.pads = [];
    
    // 8 labels matching Left to Right in anatomical order
    const labels = [
        "L-Pinky", "L-Ring", "L-Middle", "L-Index", 
        "R-Index", "R-Middle", "R-Ring", "R-Pinky"
    ];
    
    this.handGraphics = this.add.graphics();
    this.handGraphics.fillStyle(0x4a1080, 0.5);
    this.handGraphics.lineStyle(2, 0x9b59b6, 1);
    
    // Draw Left Palm
    this.handGraphics.fillRoundedRect(width * 0.15, height * 0.6, width * 0.25, height * 0.3, 20);
    this.handGraphics.strokeRoundedRect(width * 0.15, height * 0.6, width * 0.25, height * 0.3, 20);

    // Draw Right Palm
    this.handGraphics.fillRoundedRect(width * 0.60, height * 0.6, width * 0.25, height * 0.3, 20);
    this.handGraphics.strokeRoundedRect(width * 0.60, height * 0.6, width * 0.25, height * 0.3, 20);

    for (let i = 0; i < 8; i++) {
        const isLeftHand = i < 4;
        const handOffset = isLeftHand ? width * 0.10 : width * 0.55;
        const fingerIndex = isLeftHand ? i : (i - 4); // 0 to 3 within the hand
        
        // Dynamic horizontal spread
        const x = handOffset + (width * (0.05 + fingerIndex * 0.065));
        
        // Adjust height to create a natural curved keyboard setup
        let yOffset = 0;
        if (isLeftHand) {
            if (i === 0) yOffset = 40; // Pinky lowest
            if (i === 1) yOffset = 10; // Ring
            if (i === 2) yOffset = -20; // Middle highest
            if (i === 3) yOffset = 10; // Index
        } else {
            if (i === 7) yOffset = 40; // Pinky lowest
            if (i === 6) yOffset = 10; // Ring
            if (i === 5) yOffset = -20; // Middle highest
            if (i === 4) yOffset = 10; // Index
        }

        const y = height * 0.45 + yOffset;

        const pad = this.add.circle(x, y, 40, 0x2d0a50).setStrokeStyle(4, 0x9b59b6);
        
        this.handGraphics.fillRoundedRect(x - 15, y, 30, height * 0.6 - y + 20, 15);
        this.handGraphics.strokeRoundedRect(x - 15, y, 30, height * 0.6 - y + 20, 15);

        const text = this.add
            .text(pad.x, pad.y, labels[i], {
                fontFamily: "Poppins", fontSize: "14px", color: "#e0b0ff", fontStyle: "bold", align: "center",
            }).setOrigin(0.5);

        this.pads.push({ pad, text });
    }
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
    
    const currentTimerLimit = Math.max(800, this.timeLimit - (this.round * 100));

    // Choose out of 8 fingers now!
    this.activeIndex = Phaser.Math.Between(0, 7);
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
    this.pads[index].pad.setStrokeStyle(6, 0xff6b6b);
    this.pads[index].pad.setFillStyle(0xff6b6b, 0.25);
    this.tweens.add({ targets: this.pads[index].pad, scale: 1.12, duration: 120, ease: 'Back.easeOut' });
  }

  clearHighlight() {
    this.pads.forEach((p) => {
      p.pad.setStrokeStyle(4, 0x9b59b6);
      p.pad.setFillStyle(0x2d0a50, 1);
      this.tweens.add({ targets: p.pad, scale: 1, duration: 120, ease: 'Power2' });
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
      AudioManager.playSound(this, "error", { volume: 0.5 });
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

    dataManager.saveGameResult("four_finger_rush", { score: this.score, accuracy, avgReaction });
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
          color: "#f6f3f3ff",
          align: "center",
        })
      .setOrigin(0.5);

    const restartBtn = UIManager.createButton(this, 0, 60, "Restart", 0x4CAF50, () => {
      this.scene.restart();
    }, 180, 44);

    const menuBtn = UIManager.createButton(this, 0, 120, "Main Menu", 0x2196F3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 180, 44);
    
    restartBtn.setFontSize(20);
    menuBtn.setFontSize(20);

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