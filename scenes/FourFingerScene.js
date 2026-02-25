class FourFingerScene extends Phaser.Scene {
  constructor() {
    super("FourFingerScene");
  }

  create() {
    this.round = 0;
    this.score = 0;
    this.missed = 0;
    this.maxRounds = 10;
    this.timeLimit = 2000;
    this.reactionTimes = [];

    this.createPads();
    this.createUI();
    this.startRound();

    this.input.keyboard.on("keydown", this.handleKeyPress, this);

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  createPads() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.pads = [];
    const labels = ["A\nIndex", "S\nMiddle", "D\nRing", "F\nPinky"];

    for (let i = 0; i < 4; i++) {
      const pad = this.add.rectangle(
        width * (0.2 + i * 0.2),
        height * 0.5,
        120,
        120,
        0xcccccc
      );

      const text = this.add
        .text(pad.x, pad.y, labels[i], {
          fontFamily: "Poppins",
          fontSize: "18px",
          color: "#000",
          align: "center",
        })
        .setOrigin(0.5);

      this.pads.push({ pad, text });
    }
  }

  createUI() {
    this.infoText = this.add
      .text(this.scale.width / 2, this.scale.height * 0.8, "", {
        fontFamily: "Poppins",
        fontSize: "22px",
        color: "#333",
      })
      .setOrigin(0.5);
  }

  startRound() {
    if (this.round >= this.maxRounds) {
      this.endGame();
      return;
    }

    this.round++;
    this.roundHandled = false;
    this.roundStartTime = this.time.now;

    this.activeIndex = Phaser.Math.Between(0, 3);
    this.highlightPad(this.activeIndex);

    if (this.roundTimer) {
      this.roundTimer.remove(false);
    }

    this.roundTimer = this.time.delayedCall(this.timeLimit, () => {
      if (!this.roundHandled) {
        this.missed++;
        this.clearHighlight();
        this.startRound();
      }
    });
  }

  highlightPad(index) {
    this.pads[index].pad.setFillStyle(0x4caf50);
  }

  clearHighlight() {
    this.pads.forEach((p) => p.pad.setFillStyle(0xcccccc));
  }

  handleKeyPress(event) {
    if (this.roundHandled) return;

    const keyMap = { A: 0, S: 1, D: 2, F: 3 };
    const pressedIndex = keyMap[event.key.toUpperCase()];
    if (pressedIndex === undefined) return;

    this.roundHandled = true;

    if (this.roundTimer) {
      this.roundTimer.remove(false);
    }

    this.clearHighlight();

    if (pressedIndex === this.activeIndex) {
      this.score++;

      const reaction = this.time.now - this.roundStartTime;
      this.reactionTimes.push(reaction);
    } else {
      this.missed++;
    }

    this.startRound();
  }

  endGame() {
    this.input.keyboard.removeAllListeners();

    const accuracy = Math.round(
      (this.score / this.maxRounds) * 100
    );

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

    const panel = this.add.container(width / 2, height + 300);

    const bg = this.add.rectangle(0, 0, 400, 300, 0xffffff)
      .setStrokeStyle(3, 0x4caf50);

    const resultText = this.add
      .text(0, -60,
        `Session Complete\n\nScore: ${this.score}\nMissed: ${this.missed}\nAccuracy: ${accuracy}%\nAvg Reaction: ${avgReaction}s`,
        {
          fontFamily: "Poppins",
          fontSize: "20px",
          color: "#000",
          align: "center",
        })
      .setOrigin(0.5);

    const restartBtn = this.add
      .text(0, 60, "Restart", {
        fontFamily: "Poppins",
        fontSize: "22px",
        backgroundColor: "#4CAF50",
        color: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const menuBtn = this.add
      .text(0, 110, "Back to Menu", {
        fontFamily: "Poppins",
        fontSize: "20px",
        backgroundColor: "#2196F3",
        color: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    panel.add([bg, resultText, restartBtn, menuBtn]);

    // Animate panel slide up
    this.tweens.add({
      targets: panel,
      y: height / 2,
      duration: 600,
      ease: "Back.easeOut",
    });

    restartBtn.on("pointerdown", () => {
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(500, () => {
        this.scene.restart();
      });
    });

    menuBtn.on("pointerdown", () => {
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(500, () => {
        this.scene.start("MenuScene");
      });
    });
  }
}