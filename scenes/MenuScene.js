class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.createBackground();
    this.createLayout();
    this.scale.on("resize", this.updateLayout, this);
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

  createLayout() {
    this.title = this.add.text(0, 0, "THERAHERO", {
      fontFamily: "Poppins",
      fontSize: "64px",
      fontStyle: "800",
      color: "#333"
    }).setOrigin(0.5);

    this.mode1Button = this.add.text(0, 0, "🎈 Pop the Balloon!", {
      fontFamily: "Poppins",
      fontSize: "28px",
      fontStyle: "600",
      color: "#ffffff",
      backgroundColor: "#4CAF50",
      padding: { x: 25, y: 12 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    this.mode2Button = this.add.text(0, 0, "🖐 Four Finger Rush", {
      fontFamily: "Poppins",
      fontSize: "24px",
      fontStyle: "600",
      color: "#ffffff",
      backgroundColor: "#2196F3",
      padding: { x: 25, y: 12 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    // Attach listeners ONCE here
    this.mode1Button.on("pointerdown", () => {
      this.scene.start("ReactionScene");
    });

    this.mode2Button.on("pointerdown", () => {
      this.scene.start("FourFingerScene");
    });

    this.updateLayout();
  }

  updateLayout() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.drawBackground();

    this.title.setPosition(width / 2, height * 0.28);
    this.mode1Button.setPosition(width / 2, height * 0.5);
    this.mode2Button.setPosition(width / 2, height * 0.62);

    this.title.setFontSize(Math.floor(width * 0.06));
    this.mode1Button.setFontSize(Math.floor(width * 0.025));
    this.mode2Button.setFontSize(Math.floor(width * 0.02));
  }
}