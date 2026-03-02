class ReactionScene extends Phaser.Scene {
  constructor() {
    super("ReactionScene");
  }

  create() {
    this.cameras.main.fadeIn(500);

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    this.totalRounds = 10;
    this.currentRound = 0;
    this.missedBalloons = 0;
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
        "Popped: 0 | Missed: 0 / " + this.totalRounds,
        { fontFamily: "Poppins", fontSize: "20px", color: "#e0b0ff" },
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

    const totalShown = this.currentRound + this.missedBalloons;

    if (totalShown >= this.totalRounds) {
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
        this.updateCounter();
        this.balloon.destroy();
        this.startRound();
      }
    });

    body.once("pointerdown", () => {
      if (!this.isPaused) this.handleClick();
    });
  }

  handleClick() {
    const reactionTime = Math.floor(this.time.now - this.startTime);

    if (this.balloonTimer) this.balloonTimer.remove();
    if (this.roundTimer) this.roundTimer.remove();

    this.reactionTimes.push(reactionTime);
    this.currentRound++;

    this.updateCounter();
    this.scoreText.setText("Reaction Time: " + reactionTime + " ms");

    this.audioManager.playPop();

    this.balloon.destroy();
    this.time.delayedCall(500, () => this.startRound());
  }

  updateCounter() {
    this.roundText.setText(
      `Popped: ${this.currentRound} | Missed: ${this.missedBalloons} / ${this.totalRounds}`,
    );
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
    this.audioManager.playPop(); // Optional final sound or custom sound
    const accuracy = Helpers.calculateAccuracy(this.currentRound, this.totalRounds);

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
        `Popped: ${this.currentRound}\nMissed: ${this.missedBalloons}\nAccuracy: ${accuracy}%\nAvg Reaction: ${avgReaction}s`,
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
}
