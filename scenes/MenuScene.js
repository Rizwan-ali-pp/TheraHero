class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();
    this.createLayout();
    this.createHeaderButtons();
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
    // Vibrant purple-to-deep-violet gradient
    this.bg.fillGradientStyle(0x1a0533, 0x1a0533, 0x3d0f6b, 0x3d0f6b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  createHeaderButtons() {
    const width = this.scale.width;
    // Small buttons in the top right
    this.profileBtn = new Button(this, width - 240, 50, "Profile", 0x4a1080, () => {
        SceneTransitionManager.transitionTo(this, "ProfileScene");
    }, 120, 40);
    this.profileBtn.setFontSize(18);

    this.signOutBtn = new Button(this, width - 100, 50, "Sign Out", 0xff4444, async () => {
        await authManager.signOut();
        SceneTransitionManager.transitionTo(this, "LoginScene");
    }, 120, 40);
    this.signOutBtn.setFontSize(18);

    // Webcam Toggle (Top Left)
    const isCamOn = (typeof cameraManager !== 'undefined' && cameraManager.isInitialized);
    const camText = isCamOn ? "📷 Disable Camera" : "📷 Enable Camera";
    const camColor = isCamOn ? 0xff4444 : 0x00c853; 

    this.webcamToggleBtn = new Button(this, 120, 50, camText, camColor, () => {
        if (!cameraManager.isInitialized) {
            cameraManager.init();
            this.webcamToggleBtn.txt.setText("📷 Disable Camera");
            this.webcamToggleBtn.bg.setFillStyle(0xff4444);
            this.webcamToggleBtn.baseColor = Phaser.Display.Color.ValueToColor(0xff4444);
        } else {
            cameraManager.stop();
            this.webcamToggleBtn.txt.setText("📷 Enable Camera");
            this.webcamToggleBtn.bg.setFillStyle(0x00c853);
            this.webcamToggleBtn.baseColor = Phaser.Display.Color.ValueToColor(0x00c853);
        }
    }, 220, 40);
    this.webcamToggleBtn.setFontSize(16);
  }

  createLayout() {
    this.title = this.add.text(0, 0, "THERAHERO", {
      fontFamily: "Poppins",
      fontSize: "64px",
      fontStyle: "800",
      color: "#ffffff",
      shadow: { blur: 20, color: '#ffd93d', fill: true }
    }).setOrigin(0.5);

    // Subtitle
    this.subtitle = this.add.text(0, 0, "REHABILITATION TRAINING SUITE", {
      fontFamily: "Poppins",
      fontSize: "18px",
      letterSpacing: 4,
      color: "#e0b0ff"
    }).setOrigin(0.5);

    this.mode1Button = UIManager.createButton(
      this, 0, 0, "🎈  Pop the Balloon!", 0xff6b6b, 
      () => SceneTransitionManager.transitionTo(this, "ReactionScene")
    );

    this.mode2Button = UIManager.createButton(
      this, 0, 0, "🖐  8-Finger Rush", 0x6bcb77, 
      () => SceneTransitionManager.transitionTo(this, "EightFingerRushScene")
    );

    this.mode3Button = UIManager.createButton(
      this, 0, 0, "〰️  Trace the Path", 0xffd93d, 
      () => SceneTransitionManager.transitionTo(this, "TracePathScene")
    );

    this.mode4Button = UIManager.createButton(
      this, 0, 0, "🎨  Color Sort", 0x4d96ff,
      () => SceneTransitionManager.transitionTo(this, "ColorSortScene")
    );

    this.mode5Button = UIManager.createButton(
      this, 0, 0, "🖼️  Picture Puzzle", 0x9b59b6,
      () => SceneTransitionManager.transitionTo(this, "PicturePuzzleScene")
    );

    this.updateLayout();
  }

  updateLayout() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.drawBackground();

    if (this.profileBtn) this.profileBtn.setPosition(width - 240, 50);
    if (this.signOutBtn) this.signOutBtn.setPosition(width - 100, 50);

    this.title.setPosition(width / 2, height * 0.18);
    this.subtitle.setPosition(width / 2, height * 0.25);
    
    // Position 5 buttons evenly
    this.mode1Button.setPosition(width / 2, height * 0.35);
    this.mode2Button.setPosition(width / 2, height * 0.47);
    this.mode3Button.setPosition(width / 2, height * 0.59);
    this.mode4Button.setPosition(width / 2, height * 0.71);
    this.mode5Button.setPosition(width / 2, height * 0.83);

    this.title.setFontSize(Math.floor(width * 0.06));
    this.subtitle.setFontSize(Math.floor(width * 0.015));
    
    this.mode1Button.setFontSize(Math.floor(width * 0.022));
    this.mode2Button.setFontSize(Math.floor(width * 0.022));
    this.mode3Button.setFontSize(Math.floor(width * 0.022));
    this.mode4Button.setFontSize(Math.floor(width * 0.022));
    this.mode5Button.setFontSize(Math.floor(width * 0.022));
  }
}
