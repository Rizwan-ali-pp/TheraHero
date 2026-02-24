class ReactionScene extends Phaser.Scene {
  constructor() {
    super("ReactionScene");
  }

  create() {
    this.totalRounds = 10;
    this.currentRound = 0;
    this.missedBalloons = 0;
    this.reactionTimes = [];

    this.balloonTimeLimit = 3000;
    this.fastThreshold = 400;

    this.createBackground();

    this.modeTitle = this.add
      .text(this.scale.width / 2, 40, "Pop the Balloon!", {
        fontSize: "36px",
        fill: "#333",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 🎯 Title Floating
    this.tweens.add({
      targets: this.modeTitle,
      y: 45,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.scoreText = this.add
      .text(this.scale.width / 2, 90, "Reaction Time: -- ms", {
        fontSize: "26px",
        fill: "#444",
      })
      .setOrigin(0.5);

    this.roundText = this.add
      .text(
        this.scale.width / 2,
        130,
        "Popped: 0 | Missed: 0 / " + this.totalRounds,
        { fontSize: "20px", fill: "#555" },
      )
      .setOrigin(0.5);

    this.scale.on("resize", this.updateLayout, this);

    this.startRound();
  }

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
  }

  startRound() {
    const totalShown = this.currentRound + this.missedBalloons;

    if (totalShown >= this.totalRounds) {
      this.endSession();
      return;
    }

    const delay = Phaser.Math.Between(1000, 3000);

    this.time.delayedCall(delay, () => {
      this.spawnBalloon();
    });
  }

  spawnBalloon() {
    const colors = [0xff6fa5, 0xffb347, 0x77dd77, 0x84b6f4, 0xcba0ff];
    const randomColor = Phaser.Utils.Array.GetRandom(colors);
    const darkerColor =
      Phaser.Display.Color.ValueToColor(randomColor).darken(30).color;

    const width = this.scale.width;
    const height = this.scale.height;

    const x = Phaser.Math.Between(200, width - 200);
    const y = Phaser.Math.Between(250, height - 150);

    this.balloon = this.add.container(x, y);
    this.balloon.setAlpha(0);
    this.balloon.setScale(0.8);

    const body = this.add
      .ellipse(0, -20, 100, 130, randomColor)
      .setStrokeStyle(4, darkerColor);

    const shine = this.add.ellipse(-20, -40, 25, 40, 0xffffff, 0.3);
    const knot = this.add.triangle(0, 50, 0, 0, 12, 25, -12, 25, darkerColor);
    const string = this.add.line(0, 90, 0, 0, 0, 60, 0xaaaaaa).setLineWidth(2);

    this.balloon.add([body, shine, knot, string]);
    body.setInteractive();

    // ✨ Smooth fade-in + scale-in
    this.tweens.add({
      targets: this.balloon,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });

    // 🎈 Floating movement
    this.tweens.add({
      targets: this.balloon,
      y: y - 15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 🔄 Slight rotation
    this.tweens.add({
      targets: this.balloon,
      angle: 2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 💨 String sway
    this.tweens.add({
      targets: string,
      angle: 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 💓 Subtle pulse
    this.tweens.add({
      targets: this.balloon,
      scale: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.startTime = this.time.now;

    this.balloonTimer = this.time.delayedCall(
      this.balloonTimeLimit,
      () => {
        if (this.balloon) {
          this.missedBalloons++;
          this.updateCounter();
          this.tweens.killTweensOf(this.balloon);
          this.balloon.destroy();
          this.startRound();
        }
      },
      [],
      this,
    );

    body.once("pointerdown", () => {
      this.handleClick(x, y, randomColor);
    });
  }

  handleClick(x, y, color) {
    const reactionTime = Math.floor(this.time.now - this.startTime);

    if (this.balloonTimer) this.balloonTimer.remove();

    this.reactionTimes.push(reactionTime);
    this.currentRound++;

    this.updateCounter();
    this.scoreText.setText("Reaction Time: " + reactionTime + " ms");

    if (this.currentRound === 5) {
      const total = this.reactionTimes.reduce((a, b) => a + b, 0);
      const average = total / this.reactionTimes.length;

      if (average < this.fastThreshold) {
        this.balloonTimeLimit = 2500;
      }
    }

    this.sound.play("pop", {
      volume: 0.6,
      rate: Phaser.Math.FloatBetween(0.95, 1.05),
    });

    this.createPopEffect(x, y, color);

    this.tweens.killTweensOf(this.balloon);

    this.tweens.add({
      targets: this.balloon,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.balloon.destroy();
      },
    });

    this.time.delayedCall(500, () => {
      this.startRound();
    });
  }

  createPopEffect(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(x, y, 5, color);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(50, 150);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
  }

  updateCounter() {
    this.roundText.setText(
      "Popped: " +
        this.currentRound +
        " | Missed: " +
        this.missedBalloons +
        " / " +
        this.totalRounds,
    );
  }

  endSession() {
    const total = this.reactionTimes.reduce((a, b) => a + b, 0);
    const average =
      this.reactionTimes.length > 0
        ? Math.floor(total / this.reactionTimes.length)
        : 0;

    let message =
      "🎉 Session Complete!\n\nAverage Reaction: " + average + " ms\n\n";

    if (this.missedBalloons > 0) {
      message += "❌ You missed " + this.missedBalloons + " balloons!";
    } else {
      message += "🔥 Perfect! You didn't miss any balloons!";
    }

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 80, message, {
        fontSize: "28px",
        fill: "#333",
        align: "center",
      })
      .setOrigin(0.5);

    const playAgain = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 60, "Play Again", {
        fontSize: "28px",
        fill: "#0077cc",
        backgroundColor: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playAgain.on("pointerdown", () => {
      this.scene.restart();
    });

    const backToMenu = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 120, "Back to Menu", {
        fontSize: "26px",
        fill: "#cc0000",
        backgroundColor: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backToMenu.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
