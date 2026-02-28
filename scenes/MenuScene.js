class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
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
    // Premium dark clinical background (Deep Slate / Navy)
    this.bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  createLayout() {
    this.title = this.add.text(0, 0, "THERAHERO", {
      fontFamily: "Poppins",
      fontSize: "64px",
      fontStyle: "800",
      color: "#ffffff",
      shadow: { blur: 15, color: '#00e5ff', fill: true }
    }).setOrigin(0.5);

    // Add a subtitle for clinical feel
    this.subtitle = this.add.text(0, 0, "CLINICAL REHABILITATION SUITE", {
      fontFamily: "Poppins",
      fontSize: "18px",
      letterSpacing: 4,
      color: "#8892b0"
    }).setOrigin(0.5);

    this.mode1Button = UIManager.createButton(
      this, 0, 0, "🎈  Pop the Balloon!", 0x00e5ff, 
      () => SceneTransitionManager.transitionTo(this, "ReactionScene")
    );

    this.mode2Button = UIManager.createButton(
      this, 0, 0, "🖐  Four Finger Rush", 0xbb86fc, 
      () => SceneTransitionManager.transitionTo(this, "FourFingerScene")
    );

    this.mode3Button = UIManager.createButton(
      this, 0, 0, "〰️  Trace the Path", 0xffb74d, 
      () => SceneTransitionManager.transitionTo(this, "TracePathScene")
    );

    this.mode4Button = UIManager.createButton(
      this, 0, 0, "🎨  Color Sort", 0xa78bfa,
      () => SceneTransitionManager.transitionTo(this, "ColorSortScene")
    );

    this.updateLayout();
  }

  updateLayout() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.drawBackground();

    this.title.setPosition(width / 2, height * 0.18);
    this.subtitle.setPosition(width / 2, height * 0.25);
    
    // Position 4 buttons evenly
    this.mode1Button.setPosition(width / 2, height * 0.40);
    this.mode2Button.setPosition(width / 2, height * 0.52);
    this.mode3Button.setPosition(width / 2, height * 0.64);
    this.mode4Button.setPosition(width / 2, height * 0.76);

    this.title.setFontSize(Math.floor(width * 0.06));
    this.subtitle.setFontSize(Math.floor(width * 0.015));
    
    this.mode1Button.setFontSize(Math.floor(width * 0.022));
    this.mode2Button.setFontSize(Math.floor(width * 0.022));
    this.mode3Button.setFontSize(Math.floor(width * 0.022));
    this.mode4Button.setFontSize(Math.floor(width * 0.022));
  }
}