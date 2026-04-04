class ReactionScene extends Phaser.Scene {
  constructor() {
    super("ReactionScene");
  }

  create() {
    this.cameras.main.fadeIn(500);

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    this.totalRounds = 10;
    this.currentRound = 0; // Number of balloons spawned/processed
    this.poppedBalloons = 0; // Counter for successful pops
    this.missedBalloons = 0;
    this.score = 0;
    this.reactionTimes = [];

    this.balloonTimeLimit = 3000;

    this.isPaused = false;

    this.createBackground();

    this.modeTitle = this.add
      .text(this.scale.width / 2, 40, "🎈  Pop the Balloon!", {
        fontFamily: "Poppins",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { blur: 14, color: '#ff6b6b', fill: true }
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(this.scale.width / 2, 90, "Reaction Time: -- ms", {
        fontFamily: "Poppins",
        fontSize: "26px",
        color: "#ffd93d",
      })
      .setOrigin(0.5);

    this.roundText = this.add
      .text(
        this.scale.width / 2,
        130,
        "Score: 0",
        { fontFamily: "Poppins", fontSize: "24px", color: "#e0b0ff", fontStyle: "bold" },
      )
      .setOrigin(0.5);

    this.createPauseButton();

    // Manager event support
    this.inputManager.on("PAUSE", () => {
      if (!this.isPaused) {
        this.showPauseMenu();
      }
    });

    // Clean up managers on shutdown
    this.events.once("shutdown", () => {
      if (this.inputManager) this.inputManager.destroy();
    });

    this.scale.on("resize", this.updateLayout, this);

    this.startRound();
  }

  /* ---------------- BACKGROUND ---------------- */

  createBackground() {
    this.bg = this.add.graphics();
    this.drawBackground();
  }

  drawBackground() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.bg.clear();
    // Vibrant deep violet to purple
    this.bg.fillGradientStyle(0x1a0533, 0x1a0533, 0x3d0f6b, 0x3d0f6b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  updateLayout() {
    const width = this.scale.width;

    this.drawBackground();

    this.modeTitle.setPosition(width / 2, 40);
    this.scoreText.setPosition(width / 2, 90);
    this.roundText.setPosition(width / 2, 130);

    this.pauseBtn.setPosition(width - 80, 40);
  }

  /* ---------------- GAME LOGIC ---------------- */

  startRound() {
    if (this.isPaused) return;

    if (this.currentRound >= this.totalRounds) {
      this.endSession();
      return;
    }

    const delay = Phaser.Math.Between(1000, 3000);

    this.roundTimer = this.time.delayedCall(delay, () => {
      if (!this.isPaused) this.spawnBalloon();
    });
  }

  spawnBalloon() {
    if (this.isPaused) return;

    const colors = [0xff6fa5, 0xffb347, 0x77dd77, 0x84b6f4, 0xcba0ff];
    const randomColor = Phaser.Utils.Array.GetRandom(colors);
    const darkerColor =
      Phaser.Display.Color.ValueToColor(randomColor).darken(30).color;

    const x = Phaser.Math.Between(200, this.scale.width - 200);
    const y = Phaser.Math.Between(250, this.scale.height - 150);

    this.balloon = this.add.container(x, y).setAlpha(0).setScale(0.8);

    const body = this.add
      .ellipse(0, -20, 100, 130, randomColor)
      .setStrokeStyle(4, darkerColor)
      .setInteractive();

    const shine = this.add.ellipse(-20, -40, 25, 40, 0xffffff, 0.3);
    const knot = this.add.triangle(0, 50, 0, 0, 12, 25, -12, 25, darkerColor);
    const string = this.add.line(0, 90, 0, 0, 0, 60, 0xaaaaaa).setLineWidth(2);

    this.balloon.add([body, shine, knot, string]);

    this.tweens.add({
      targets: this.balloon,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
      onComplete: () => {
        // Continuous floating effect
        this.tweens.add({
          targets: this.balloon,
          y: y - Phaser.Math.Between(15, 25),
          duration: Phaser.Math.Between(800, 1200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Slight rotation to simulate swinging
        this.tweens.add({
          targets: this.balloon,
          angle: Phaser.Math.Between(-5, 5),
          duration: Phaser.Math.Between(1000, 1500),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    this.startTime = this.time.now;

    this.balloonTimer = this.time.delayedCall(this.balloonTimeLimit, () => {
      if (this.balloon && !this.isPaused) {
        this.missedBalloons++;
        this.currentRound++;
        this.score = Math.max(0, this.score - 1);
        this.showFloatingText(this.balloon.x, this.balloon.y, "-1", "#ff4757");
        this.updateCounter();
        this.balloon.destroy();
        this.startRound();
      }
    });

    body.once("pointerdown", () => {
      if (!this.isPaused) this.handleClick(randomColor);
    });
  }

  handleClick(popColor) {
    const reactionTime = Math.floor(this.time.now - this.startTime);

    if (this.balloonTimer) this.balloonTimer.remove();
    if (this.roundTimer) this.roundTimer.remove();

    this.reactionTimes.push(reactionTime);
    this.currentRound++;
    this.poppedBalloons++;
    this.score++;

    const popX = this.balloon.x;
    const popY = this.balloon.y - 20; // Focus on the balloon body, not the knot

    this.showFloatingText(popX, popY, "+1", "#2ed573");
    this.createPopEffect(popX, popY, popColor || 0xff6fa5);

    this.updateCounter();
    this.scoreText.setText("Reaction Time: " + reactionTime + " ms");

    this.audioManager.playPop();

    this.tweens.add({
      targets: this.balloon,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        if (this.balloon) this.balloon.destroy();
      }
    });
    
    this.time.delayedCall(500, () => this.startRound());
  }

  updateCounter() {
    this.roundText.setText(`Score: ${this.score}`);
    
    // Animate score text on change
    this.tweens.add({
        targets: this.roundText,
        scale: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut'
    });
  }

  showFloatingText(x, y, text, color) {
    const floatText = this.add.text(x, y, text, {
        fontFamily: "Poppins",
        fontSize: "32px",
        color: color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
        targets: floatText,
        y: y - 80,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => floatText.destroy()
    });
  }

  createPopEffect(x, y, color) {
    // 1. Central Shockwave
    const circle = this.add.circle(x, y, 10, 0xffffff, 0.9).setDepth(200);
    this.tweens.add({
        targets: circle,
        radius: 80,
        alpha: 0,
        duration: 300,
        onComplete: () => circle.destroy()
    });

    // 2. Fragment Particles
    for (let i = 0; i < 15; i++) {
        const angle = Phaser.Math.Between(0, 360);
        const rad = Phaser.Math.DegToRad(angle);
        const dist = Phaser.Math.Between(50, 150);
        
        const part = this.add.rectangle(x, y, 10, 10, color).setDepth(199);
        part.setAngle(angle);

        this.tweens.add({
            targets: part,
            x: x + Math.cos(rad) * dist,
            y: y + Math.sin(rad) * dist,
            alpha: 0,
            scale: 0.1,
            rotation: 2,
            duration: Phaser.Math.Between(400, 600),
            ease: 'Cubic.easeOut',
            onComplete: () => part.destroy()
        });
    }
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

    // Stop timers
    if (this.balloonTimer) this.balloonTimer.paused = true;
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

      if (this.balloonTimer) this.balloonTimer.paused = false;
      if (this.roundTimer) this.roundTimer.paused = false;

      this.isPaused = false;
    });
  }

  /* ---------------- END ---------------- */

  endSession() {
    const accuracy = Helpers.calculateAccuracy(this.poppedBalloons, this.totalRounds);

    const avgReaction =
      this.reactionTimes.length > 0
        ? (
            this.reactionTimes.reduce((a, b) => a + b, 0) /
            this.reactionTimes.length /
            1000
          ).toFixed(2)
        : 0;

    dataManager.saveGameResult("pop_the_balloon", { accuracy, avgReaction, score: this.score });
    this.showResultPanel(accuracy, avgReaction);
  }

  showResultPanel(accuracy, avgReaction) {
    const width = this.scale.width;
    const height = this.scale.height;

    this.overlay = UIManager.createOverlay(this);
    const panel = UIManager.createPanel(this, width / 2, height + 300, 400, 320, "Session Complete");

    const resultText = this.add
      .text(0, -30,
        `Final Score: ${this.score}\nAccuracy: ${accuracy}%\nAvg Reaction: ${avgReaction}s`,
        {
          fontFamily: "Poppins",
          fontSize: "24px",
          color: "#ffffff",
          align: "center",
          lineSpacing: 10
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
}
