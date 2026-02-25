class ReactionScene extends Phaser.Scene {
  constructor() {
    super("ReactionScene");
  }

  create() {
    this.cameras.main.fadeIn(500);

    this.totalRounds = 10;
    this.currentRound = 0;
    this.missedBalloons = 0;
    this.reactionTimes = [];

    this.balloonTimeLimit = 3000;

    this.isPaused = false;

    this.createBackground();

    this.modeTitle = this.add
      .text(this.scale.width / 2, 40, "Pop the Balloon!", {
        fontFamily: "Poppins",
        fontSize: "36px",
        color: "#333",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.scoreText = this.add
      .text(this.scale.width / 2, 90, "Reaction Time: -- ms", {
        fontFamily: "Poppins",
        fontSize: "26px",
        color: "#444",
      })
      .setOrigin(0.5);

    this.roundText = this.add
      .text(
        this.scale.width / 2,
        130,
        "Popped: 0 | Missed: 0 / " + this.totalRounds,
        { fontFamily: "Poppins", fontSize: "20px", color: "#555" },
      )
      .setOrigin(0.5);

    this.createPauseButton();

    // ESC key support
    this.input.keyboard.on("keydown-ESC", () => {
      if (!this.isPaused) {
        this.showPauseMenu();
      }
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
    this.bg.fillGradientStyle(0xd0f4ff, 0xd0f4ff, 0xffffff, 0xffffff, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  updateLayout() {
    const width = this.scale.width;

    this.drawBackground();

    this.modeTitle.setPosition(width / 2, 40);
    this.scoreText.setPosition(width / 2, 90);
    this.roundText.setPosition(width / 2, 130);

    this.pauseBtn.setPosition(width - 20, 20);
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

    this.sound.play("pop", { volume: 0.6 });

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
    this.pauseBtn = this.add
      .text(this.scale.width - 20, 20, "Pause", {
        fontFamily: "Poppins",
        fontSize: "18px",
        backgroundColor: "#ffaa00",
        color: "#ffffff",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.pauseBtn.on("pointerdown", () => {
      this.showPauseMenu();
    });
  }

  showPauseMenu() {
    if (this.isPaused) return;

    this.isPaused = true;

    // Stop timers
    if (this.balloonTimer) this.balloonTimer.paused = true;
    if (this.roundTimer) this.roundTimer.paused = true;

    const width = this.scale.width;
    const height = this.scale.height;

    // Input-blocking overlay
    this.overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setDepth(2000)
      .setInteractive();

    this.pausePanel = this.add
      .container(width / 2, height / 2)
      .setDepth(2001)
      .setScale(0.8)
      .setAlpha(0);

    const bg = this.add
      .rectangle(0, 0, 400, 260, 0xffffff)
      .setStrokeStyle(4, 0xffaa00);

    const title = this.add
      .text(0, -80, "Paused", {
        fontFamily: "Poppins",
        fontSize: "28px",
        color: "#000",
      })
      .setOrigin(0.5);

    const resumeBtn = this.createPauseButtonItem("Resume", -10, () => {
      this.resumeGame();
    });

    const restartBtn = this.createPauseButtonItem("Restart", 50, () => {
      this.scene.restart();
    });

    const menuBtn = this.createPauseButtonItem("Main Menu", 110, () => {
      this.scene.start("MenuScene");
    });

    this.pausePanel.add([bg, title, resumeBtn, restartBtn, menuBtn]);

    this.tweens.add({
      targets: this.pausePanel,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: "Back.easeOut",
    });
  }

  resumeGame() {
    this.overlay.destroy();
    this.pausePanel.destroy();

    if (this.balloonTimer) this.balloonTimer.paused = false;
    if (this.roundTimer) this.roundTimer.paused = false;

    this.isPaused = false;
  }

  createPauseButtonItem(label, y, callback) {
    const btn = this.add
      .text(0, y, label, {
        fontFamily: "Poppins",
        fontSize: "22px",
        backgroundColor: "#2196F3",
        color: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerdown", callback);
    return btn;
  }

  /* ---------------- END ---------------- */

  endSession() {
    this.scene.start("MenuScene");
  }
}
