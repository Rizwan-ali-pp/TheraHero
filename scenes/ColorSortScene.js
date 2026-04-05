class ColorSortScene extends Phaser.Scene {
  constructor() {
    super("ColorSortScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    // Game state
    this.totalRounds = 10;
    this.currentRound = 0;
    this.errors = 0;
    this.score = 0;
    this.reactionTimes = [];
    this.roundStartTime = 0;
    this.isPaused = false;
    this.isDragging = false;
    this.roundActive = false;
    this.ball = null;
    this.boxes = [];
    this.ballTween = null;
    this.ballOrigin = { x: 0, y: 0 };
    this.correctColor = null;

    // Color palette – 6 vibrant, distinct colors
    this.palette = [
      { name: "Red",    hex: 0xe74c3c },
      { name: "Blue",   hex: 0x3498db },
      { name: "Green",  hex: 0x2ecc71 },
      { name: "Yellow", hex: 0xf39c12 },
      { name: "Purple", hex: 0x9b59b6 },
      { name: "Cyan",   hex: 0x00e5ff  },
    ];

    this.createUI();
    this.createPauseButton();
    this.setupDragListeners(); // ← register ONCE, not per round

    this.inputManager.on("PAUSE", () => {
      if (!this.isPaused) this.showPauseMenu();
    });

    this.events.once("shutdown", () => {
      if (this.inputManager) this.inputManager.destroy();
    });

    this.time.delayedCall(400, () => this.startRound());
  }

  /* ─── BACKGROUND ─────────────────────────────────────────── */

  createBackground() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    g.fillRect(0, 0, width, height);
  }

  /* ─── UI HEADER ──────────────────────────────────────────── */

  createUI() {
    const cx = this.scale.width / 2;

    this.add.text(cx, 40, "🎨  Color Sort", {
      fontFamily: "Poppins", fontSize: "36px", fontStyle: "bold",
      color: "#ffffff", shadow: { blur: 10, color: "#00e5ff", fill: true }
    }).setOrigin(0.5);

    this.roundText = this.add.text(cx, 90, "Round: 0 / 10", {
      fontFamily: "Poppins", fontSize: "22px", color: "#e2e8f0"
    }).setOrigin(0.5);

    this.scoreText = this.add.text(cx, 125, "Score: 0  |  Errors: 0", {
      fontFamily: "Poppins", fontSize: "18px", color: "#94a3b8"
    }).setOrigin(0.5);

    this.add.text(cx, this.scale.height - 30,
      "Drag the ball into the matching colored box!", {
        fontFamily: "Poppins", fontSize: "16px", color: "#64748b"
      }).setOrigin(0.5);
  }

  /* ─── PAUSE BUTTON ───────────────────────────────────────── */

  createPauseButton() {
    this.pauseBtn = UIManager.createButton(
      this, this.scale.width - 65, 35, "Pause", 0xffa000,
      () => this.showPauseMenu(), 110, 38
    );
    this.pauseBtn.setFontSize(15);
    this.pauseBtn.setDepth(100);
  }

  /* ─── DRAG LISTENERS (registered ONCE in create) ────────── */

  setupDragListeners() {
    this.input.on("dragstart", (pointer, obj) => {
      if (!this.ball || obj !== this.ball || !this.roundActive || this.isPaused) return;
      this.isDragging = true;
      if (this.ballTween) this.ballTween.pause();
      this.tweens.add({ targets: this.ball, scale: 1.12, duration: 120, ease: "Power2" });
    });

    this.input.on("drag", (pointer, obj, dragX, dragY) => {
      if (!this.ball || obj !== this.ball || !this.roundActive || this.isPaused) return;
      obj.x = dragX;
      obj.y = dragY;
      this.highlightBoxUnder(dragX, dragY);
    });

    this.input.on("dragend", (pointer, obj) => {
      if (!this.ball || obj !== this.ball || !this.roundActive || this.isPaused) return;
      this.isDragging = false;
      this.tweens.add({ targets: this.ball, scale: 1, duration: 120 });
      this.clearHighlights();
      this.checkDrop(obj.x, obj.y);
    });
  }

  /* ─── ROUND LOGIC ────────────────────────────────────────── */

  startRound() {
    if (this.isPaused) return;

    // Clean up previous round objects
    if (this.ball)  { this.ball.destroy(); this.ball = null; }
    if (this.boxes) { this.boxes.forEach(b => b.container.destroy()); this.boxes = []; }
    if (this.feedbackText) { this.feedbackText.destroy(); this.feedbackText = null; }

    this.currentRound++;

    if (this.currentRound > this.totalRounds) {
      this.endSession();
      return;
    }

    this.roundActive = true;
    this.roundStartTime = this.time.now;
    this.roundText.setText(`Round: ${this.currentRound} / ${this.totalRounds}`);

    // Pick 6 random distinct colors – one is the "correct" answer
    const shuffled = Phaser.Utils.Array.Shuffle([...this.palette]);
    const boxColors = shuffled.slice(0, 6);
    this.correctColor = Phaser.Utils.Array.GetRandom(boxColors);

    this.spawnBoxes(boxColors);
    this.spawnBall(this.correctColor);
  }

  /* ─── BOXES ──────────────────────────────────────────────── */

  spawnBoxes(boxColors) {
    const { width, height } = this.scale;
    const boxSize = 90;

    // Arrange 6 boxes into two clean columns (3 left, 3 right)
    // This perfectly prevents them from overlapping the central HUD text at the top!
    this.boxes = boxColors.map((color, i) => {
      const isLeft = i < 3;
      // Brought them closer to the center ball (previously 140)
      const x = isLeft ? 210 : width - 210; 
      
      const rowIndex = i % 3;
      const y = 200 + (rowIndex * 135); // Rows at Y: 200, 335, 470

      const container = this.add.container(x, y).setScale(0).setAlpha(0);

      // Circular box instead of square for a cleaner look
      const glow = this.add.circle(0, 0, boxSize / 2 + 10, color.hex, 0.2);
      const box  = this.add.circle(0, 0, boxSize / 2, color.hex, 0.4);
      box.setStrokeStyle(4, color.hex);

      const label = this.add.text(0, boxSize / 2 + 18, color.name, {
        fontFamily: "Poppins", fontSize: "14px", color: "#e2e8f0", fontStyle: "bold"
      }).setOrigin(0.5);

      container.add([glow, box, label]);

      this.tweens.add({
        targets: container, scale: 1, alpha: 1,
        duration: 350, delay: i * 60, ease: "Back.easeOut"
      });

      return { container, box, glow, color, x, y, size: boxSize };
    });
  }


  /* ─── BALL ───────────────────────────────────────────────── */

  spawnBall(color) {
    const cx = this.scale.width  / 2;
    const cy = this.scale.height / 2 + 10;
    const radius = 44;

    this.ballOrigin = { x: cx, y: cy };

    const g = this.add.graphics();
    g.fillStyle(color.hex, 0.25);
    g.fillCircle(0, 0, radius + 14);
    g.fillStyle(color.hex, 1);
    g.fillCircle(0, 0, radius);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(-radius * 0.28, -radius * 0.28, radius * 0.35);

    this.ball = this.add.container(cx, cy, [g]).setDepth(10);
    this.ball.setSize(radius * 2, radius * 2);
    this.ball.setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.ball);

    // Idle float tween
    this.ballTween = this.tweens.add({
      targets: this.ball, y: cy - 12,
      duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
    });

    // Pop-in
    this.ball.setScale(0);
    this.tweens.add({ targets: this.ball, scale: 1, duration: 350, ease: "Back.easeOut" });
  }

  /* ─── HIGHLIGHT BOX ON HOVER ─────────────────────────────── */

  highlightBoxUnder(bx, by) {
    this.boxes.forEach(b => {
      const dist = Math.hypot(bx - b.x, by - b.y);
      const inside = dist < b.size / 2 + 12;
      b.box.setAlpha(inside ? 0.75 : 0.4);
      b.glow.setAlpha(inside ? 0.45 : 0.20);
    });
  }

  clearHighlights() {
    this.boxes.forEach(b => {
      b.box.setAlpha(0.4);
      b.glow.setAlpha(0.20);
    });
  }

  /* ─── DROP CHECK ─────────────────────────────────────────── */

  checkDrop(bx, by) {
    if (!this.roundActive) return;

    let droppedOn = null;
    for (const b of this.boxes) {
      const dist = Math.hypot(bx - b.x, by - b.y);
      if (dist < b.size / 2 + 10) {
        droppedOn = b;
        break;
      }
    }


    if (!droppedOn) {
      this.snapBallBack();
      return;
    }

    if (droppedOn.color.name === this.correctColor.name) {
      this.handleCorrect(droppedOn);
    } else {
      this.handleWrong(droppedOn);
    }
  }

  /* ─── CORRECT ────────────────────────────────────────────── */

  handleCorrect(targetBox) {
    this.roundActive = false;
    this.score++;
    const reaction = this.time.now - this.roundStartTime;
    this.reactionTimes.push(reaction);

    this.tweens.add({
      targets: this.ball, x: targetBox.x, y: targetBox.y, scale: 0,
      duration: 280, ease: "Back.easeIn"
    });
    this.tweens.add({
      targets: targetBox.box, alpha: 1,
      duration: 120, yoyo: true, repeat: 2
    });

    AudioManager.playSound(this, "pop",   { volume: 0.6 });
    this.showFeedback("✓  Correct!", "#2ecc71");
    this.updateHUD();
    this.time.delayedCall(700, () => this.startRound());
  }

  /* ─── WRONG ──────────────────────────────────────────────── */

  handleWrong(targetBox) {
    this.roundActive = false;
    this.errors++;

    // Shake wrong box
    this.tweens.add({
      targets: targetBox.container,
      x: targetBox.x + 8, duration: 50, yoyo: true, repeat: 4,
      onComplete: () => targetBox.container.setX(targetBox.x)
    });

    // Shrink ball away
    this.tweens.add({
      targets: this.ball, scale: 0, duration: 260, ease: "Back.easeIn"
    });

    AudioManager.playSound(this, "error", { volume: 0.5 });
    this.showFeedback("✗  Wrong box!", "#e74c3c");
    this.updateHUD();
    this.time.delayedCall(700, () => this.startRound());
  }

  /* ─── SNAP BACK ──────────────────────────────────────────── */

  snapBallBack() {
    this.tweens.add({
      targets: this.ball,
      x: this.ballOrigin.x, y: this.ballOrigin.y, scale: 1,
      duration: 320, ease: "Back.easeOut",
      onComplete: () => { if (this.ballTween) this.ballTween.resume(); }
    });
  }

  /* ─── FEEDBACK TEXT ──────────────────────────────────────── */

  showFeedback(msg, color) {
    if (this.feedbackText) this.feedbackText.destroy();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.feedbackText = this.add.text(cx, cy + 100, msg, {
      fontFamily: "Poppins", fontSize: "28px", fontStyle: "bold",
      color, shadow: { blur: 8, color: "#000", fill: true }
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: this.feedbackText, y: cy + 70, alpha: 0,
      duration: 700, delay: 300, ease: "Power2",
      onComplete: () => {
        if (this.feedbackText) { this.feedbackText.destroy(); this.feedbackText = null; }
      }
    });
  }

  /* ─── HUD ────────────────────────────────────────────────── */

  updateHUD() {
    this.scoreText.setText(`Score: ${this.score}  |  Errors: ${this.errors}`);
  }

  /* ─── END SESSION ────────────────────────────────────────── */

  endSession() {
    this.roundActive = false;
    const accuracy = Helpers.calculateAccuracy(this.score, this.totalRounds);
    const avgReaction = this.reactionTimes.length > 0
      ? (this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length / 1000).toFixed(2)
      : "N/A";
    
    dataManager.saveGameResult("color_sort", { score: this.score, accuracy, avgReaction });
    this.showResultPanel(accuracy, avgReaction);
  }

  showResultPanel(accuracy, avgReaction) {
    const { width, height } = this.scale;
    this.overlay = UIManager.createOverlay(this);
    const panel = UIManager.createPanel(this, width / 2, height + 300, 440, 340, "Session Complete");

    const resultText = this.add.text(0, -30,
      `Score:  ${this.score} / ${this.totalRounds}\nErrors:  ${this.errors}\nAccuracy:  ${accuracy}%\nAvg Reaction:  ${avgReaction}s`,
      { fontFamily: "Poppins", fontSize: "20px", color: "#e2e8f0", align: "center" }
    ).setOrigin(0.5);

    const restartBtn = UIManager.createButton(this, 0, 70, "↺  Restart", 0x4caf50, () => {
      this.scene.restart();
    }, 190, 44);
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(this, 0, 126, "⌂  Main Menu", 0x2196f3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 190, 44);
    menuBtn.setFontSize(16);

    panel.add([resultText, restartBtn, menuBtn]);

    this.tweens.add({
      targets: panel, y: height / 2, scale: 1, alpha: 1,
      duration: 600, ease: "Back.easeOut"
    });
  }

  /* ─── PAUSE ──────────────────────────────────────────────── */

  showPauseMenu() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.roundActive = false;

    const { width, height } = this.scale;
    this.overlay = UIManager.createOverlay(this);
    this.pausePanel = UIManager.createPanel(this, width / 2, height / 2, 320, 300, "⏸  PAUSED");

    const resumeBtn = UIManager.createButton(this, 0, -50, "▶  Resume", 0x00c853, () => {
      this.pausePanel.hide(() => {
        this.overlay.destroy();
        this.pausePanel.destroy();
        this.isPaused = false;
        this.roundActive = true;
        if (this.ballTween && !this.isDragging) this.ballTween.resume();
      });
    }, 220, 44);
    resumeBtn.setFontSize(16);

    const restartBtn = UIManager.createButton(this, 0, 6, "↺  Restart", 0xff9800, () => {
      this.pausePanel.hide();
      this.overlay.destroy();
      this.scene.restart();
    }, 220, 44);
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(this, 0, 62, "⌂  Main Menu", 0x2196f3, () => {
      this.pausePanel.hide();
      this.overlay.destroy();
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 220, 44);
    menuBtn.setFontSize(16);

    this.pausePanel.add([resumeBtn, restartBtn, menuBtn]);
    this.pausePanel.show();
  }
}
