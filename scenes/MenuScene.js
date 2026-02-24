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
    this.title = this.add
      .text(0, 0, "THERAHERO", {
        fontSize: "48px",
        fill: "#333",
      })
      .setOrigin(0.5);

    this.reactionText = this.add
      .text(0, 0, "Press 1 - Reaction Mode", {
        fontSize: "24px",
        fill: "#555",
      })
      .setOrigin(0.5);

    this.updateLayout();

    this.input.keyboard.on("keydown-ONE", () => {
      this.scene.start("ReactionScene");
    });
  }

  updateLayout() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.drawBackground();

    this.title.setPosition(width / 2, height * 0.3);
    this.reactionText.setPosition(width / 2, height * 0.5);

    this.title.setFontSize(Math.floor(width * 0.05));
    this.reactionText.setFontSize(Math.floor(width * 0.02));
  }
}
