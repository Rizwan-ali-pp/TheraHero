class TracePathScene extends Phaser.Scene {
  constructor() {
    super("TracePathScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    // Level data
    this.currentLevel = 0;
    this.levels = [
      {
        name: "Level 1: Simple Arc",
        width: 70,
        points: (w, h) => [
          new Phaser.Math.Vector2(w * 0.15, h * 0.6),
          new Phaser.Math.Vector2(w * 0.5, h * 0.35),
          new Phaser.Math.Vector2(w * 0.85, h * 0.6)
        ]
      },
      {
        name: "Level 2: Rolling Hills",
        width: 65,
        points: (w, h) => [
          new Phaser.Math.Vector2(w * 0.1, h * 0.6),
          new Phaser.Math.Vector2(w * 0.3, h * 0.35),
          new Phaser.Math.Vector2(w * 0.5, h * 0.85),
          new Phaser.Math.Vector2(w * 0.7, h * 0.35),
          new Phaser.Math.Vector2(w * 0.9, h * 0.6)
        ]
      },
      {
        name: "Level 3: Ocean Waves",
        width: 60,
        points: (w, h) => [
          new Phaser.Math.Vector2(w * 0.1, h * 0.6),
          new Phaser.Math.Vector2(w * 0.2, h * 0.35),
          new Phaser.Math.Vector2(w * 0.35, h * 0.85),
          new Phaser.Math.Vector2(w * 0.5, h * 0.35),
          new Phaser.Math.Vector2(w * 0.65, h * 0.85),
          new Phaser.Math.Vector2(w * 0.8, h * 0.35),
          new Phaser.Math.Vector2(w * 0.9, h * 0.6)
        ]
      },
      {
        name: "Level 4: Winding River",
        width: 55,
        points: (w, h) => [
          new Phaser.Math.Vector2(w * 0.1, h * 0.6),
          new Phaser.Math.Vector2(w * 0.2, h * 0.35),
          new Phaser.Math.Vector2(w * 0.3, h * 0.85),
          new Phaser.Math.Vector2(w * 0.4, h * 0.35),
          new Phaser.Math.Vector2(w * 0.5, h * 0.85),
          new Phaser.Math.Vector2(w * 0.6, h * 0.35),
          new Phaser.Math.Vector2(w * 0.7, h * 0.85),
          new Phaser.Math.Vector2(w * 0.8, h * 0.35),
          new Phaser.Math.Vector2(w * 0.9, h * 0.6)
        ]
      },
      {
        name: "Level 5: Serpentine Flow",
        width: 50,
        points: (w, h) => [
          new Phaser.Math.Vector2(w * 0.1, h * 0.6),
          new Phaser.Math.Vector2(w * 0.18, h * 0.35),
          new Phaser.Math.Vector2(w * 0.26, h * 0.85),
          new Phaser.Math.Vector2(w * 0.34, h * 0.35),
          new Phaser.Math.Vector2(w * 0.42, h * 0.85),
          new Phaser.Math.Vector2(w * 0.5, h * 0.35),
          new Phaser.Math.Vector2(w * 0.58, h * 0.85),
          new Phaser.Math.Vector2(w * 0.66, h * 0.35),
          new Phaser.Math.Vector2(w * 0.74, h * 0.85),
          new Phaser.Math.Vector2(w * 0.82, h * 0.35),
          new Phaser.Math.Vector2(w * 0.9, h * 0.6)
        ]
      }
    ];

    this.isPlaying = false;
    this.isPaused = false;
    this.errors = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.pathWidth = this.levels[this.currentLevel].width;
    this.isOutOfBounds = false;

    this.createUI();
    this.setupLevel(this.currentLevel);
    this.createPauseButton();

    this.inputManager.on("PAUSE", () => {
      if (!this.isPaused) this.showPauseMenu();
    });
  }

  createBackground() {
    this.bg = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;
    // Premium dark clinical background
    this.bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  createUI() {
    this.modeTitle = this.add
      .text(this.scale.width / 2, 40, "〰️ Trace the Path 〰️", {
        fontFamily: "Poppins",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { blur: 10, color: '#00e5ff', fill: true }
      })
      .setOrigin(0.5);

    this.timerText = this.add
      .text(this.scale.width / 2, 90, "Time: 0.0s", {
        fontFamily: "Poppins",
        fontSize: "26px",
        color: "#e2e8f0",
      })
      .setOrigin(0.5);

    this.errorText = this.add
      .text(
        this.scale.width / 2,
        130,
        "Errors: 0",
        { fontFamily: "Poppins", fontSize: "20px", color: "#f87171" }, // Red for errors
      )
      .setOrigin(0.5);
  }

  createPauseButton() {
    this.pauseBtn = UIManager.createButton(
      this,
      this.scale.width - 65,
      35,
      "Pause",
      0xffa000,
      () => this.showPauseMenu(),
      110,
      38
    );
    this.pauseBtn.setFontSize(15);
  }

  setupLevel(levelIndex) {
    this.currentLevel = levelIndex;
    const levelData = this.levels[levelIndex];
    this.pathWidth = levelData.width;
    this.modeTitle.setText(levelData.name);

    // Clean up previous path if it exists
    if (this.pathGraphics) {
        this.pathGraphics.clear();
        this.startZone.destroy();
        this.endZone.destroy();
        this.startText.destroy();
        this.finishText.destroy();
        this.cursor.destroy();
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const points = levelData.points(width, height);

    this.path = new Phaser.Curves.Spline(points);
    this.pathPoints = this.path.getDistancePoints(8); // Finer points for collision

    this.pathGraphics = this.add.graphics();
    
    // Draw outer glows for "premium" feel
    this.pathGraphics.lineStyle(this.pathWidth + 12, 0x00e5ff, 0.1);
    this.path.draw(this.pathGraphics, 128);
    this.pathGraphics.lineStyle(this.pathWidth + 6, 0x00e5ff, 0.2);
    this.path.draw(this.pathGraphics, 128);
    
    // Draw main track
    this.pathGraphics.lineStyle(this.pathWidth, 0x1e293b, 1);
    this.path.draw(this.pathGraphics, 128);
    
    // Draw inner guide line
    this.pathGraphics.lineStyle(2, 0x475569, 0.4);
    this.path.draw(this.pathGraphics, 128);

    // Start Zone
    this.startZone = this.add.circle(points[0].x, points[0].y, this.pathWidth / 2 + 3, 0x4caf50);
    this.startText = this.add.text(points[0].x, points[0].y - 45, "START", {
      fontFamily: "Poppins", fontSize: "14px", color: "#4caf50", fontStyle: "bold"
    }).setOrigin(0.5);

    // End Zone
    this.endZone = this.add.circle(points[points.length - 1].x, points[points.length - 1].y, this.pathWidth / 2 + 3, 0xff9800);
    this.finishText = this.add.text(points[points.length - 1].x, points[points.length - 1].y - 45, "FINISH", {
      fontFamily: "Poppins", fontSize: "14px", color: "#ff9800", fontStyle: "bold"
    }).setOrigin(0.5);

    this.createCursor();
    
    // Reset game state for new level
    this.isPlaying = false;
    this.elapsedTime = 0;
    this.errors = 0;
    this.timerText.setText("Time: 0.0s");
    this.errorText.setText("Errors: 0");
    this.isOutOfBounds = false;
  }

  createCursor() {
    const startPoint = this.pathPoints[0];
    
    // The player's cursor
    this.cursor = this.add.circle(startPoint.x, startPoint.y, 16, 0x00e5ff);
    this.cursor.setStrokeStyle(4, 0xffffff);
    this.cursor.setInteractive({ useHandCursor: true });
    
    // Make cursor draggable
    this.input.setDraggable(this.cursor);

    this.input.on("dragstart", (pointer, gameObject) => {
        if (!this.isPlaying) {
            this.startGame();
        }
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
        if (!this.isPlaying || this.isPaused) return;
        
        const constrainedPos = this.checkBounds(dragX, dragY);
        gameObject.x = constrainedPos.x;
        gameObject.y = constrainedPos.y;

        this.checkFinish(gameObject.x, gameObject.y);
    });

    this.input.on("dragend", (pointer, gameObject) => {
       // Ensure that if the user drops the cursor inside the finish zone, they win
       if (this.isPlaying && !this.isPaused) {
           this.checkFinish(gameObject.x, gameObject.y);
       }
    });
  }
  
  startGame() {
      this.isPlaying = true;
      this.startTime = this.time.now;
      this.errors = 0;
      this.errorText.setText(`Errors: ${this.errors}`);
  }

  checkBounds(x, y) {
      // Find distance to closest point on the path
      let minDistance = Number.MAX_VALUE;
      let closestPoint = null;
      for (let i = 0; i < this.pathPoints.length; i++) {
          const pt = this.pathPoints[i];
          const dist = Phaser.Math.Distance.Between(x, y, pt.x, pt.y);
          if (dist < minDistance) {
              minDistance = dist;
              closestPoint = pt;
          }
      }

      // If outside the path width (radius) minus the cursor radius (16)
      const maxAllowedDistance = (this.pathWidth / 2) - 16; 
      
      let finalX = x;
      let finalY = y;

      if (minDistance > maxAllowedDistance && closestPoint) {
          const angle = Phaser.Math.Angle.Between(closestPoint.x, closestPoint.y, x, y);
          finalX = closestPoint.x + Math.cos(angle) * maxAllowedDistance;
          finalY = closestPoint.y + Math.sin(angle) * maxAllowedDistance;

          if (!this.isOutOfBounds) {
              this.isOutOfBounds = true;
              this.errors++;
              this.errorText.setText(`Errors: ${this.errors}`);
              
              // Visual warning: cursor turns red
              this.cursor.setFillStyle(0xf87171);
              this.cursor.setStrokeStyle(4, 0x991b1b);
              
              // Audio feedback
              AudioManager.playSound(this, "error", { volume: 0.5 });
          }
      } else {
          if (this.isOutOfBounds) {
              this.isOutOfBounds = false;
              // Return to normal color
              this.cursor.setFillStyle(0x00e5ff);
              this.cursor.setStrokeStyle(4, 0xffffff);
          }
      }

      return { x: finalX, y: finalY };
  }

  checkFinish(cursorX, cursorY) {
      if (this.isPaused || !this.isPlaying) return;
      
      const cursorCircle = new Phaser.Geom.Circle(cursorX, cursorY, 16);
      const endCircle = new Phaser.Geom.Circle(this.endZone.x, this.endZone.y, this.pathWidth / 2 + 5);

      if (Phaser.Geom.Intersects.CircleToCircle(cursorCircle, endCircle)) {
          this.endGame();
      }
  }

  update(time, delta) {
      if (this.isPlaying && !this.isPaused) {
          this.elapsedTime = time - this.startTime;
          this.timerText.setText(`Time: ${(this.elapsedTime / 1000).toFixed(1)}s`);
      }
  }

  endGame() {
    this.isPlaying = false;
    // Play success sound
    AudioManager.playSound(this, "pop", { volume: 0.6 });
    const finalSeconds = parseFloat((this.elapsedTime / 1000).toFixed(2));
    
    dataManager.saveGameResult("trace_path", { 
        level: this.currentLevel + 1,
        levelName: this.levels[this.currentLevel].name,
        timeInSeconds: finalSeconds, 
        errors: this.errors 
    });
    this.showResultPanel();
  }

  showResultPanel() {
    this.overlay = new Overlay(this);
    const finalSeconds = (this.elapsedTime / 1000).toFixed(2);
    
    // Perfectly balanced result panel
    this.resultPanel = new Panel(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      520,
      440,
      "Trace Complete!"
    );

    // Check if there is a next level
    const hasNextLevel = this.currentLevel < this.levels.length - 1;

    const stats = this.add
      .text(
        0,
        -55,
        `Level: ${this.levels[this.currentLevel].name}\nTime: ${finalSeconds}s\nErrors: ${this.errors}`,
        { fontFamily: "Poppins", fontSize: "22px", color: "#e2e8f0", align: "center", lineSpacing: 12 }
      )
      .setOrigin(0.5);

    const btnY = 145;
    const btnSpacing = 160;

    if (hasNextLevel) {
        // Next Level Button - positioned centrally with ample vertical air
        const nextBtn = UIManager.createButton(
            this,
            0,
            50,
            "Next Level ➔",
            0x6bcb77,
            () => {
              this.resultPanel.hide(() => {
                this.overlay.destroy();
                this.setupLevel(this.currentLevel + 1);
              });
            },
            260,
            55
        );
        nextBtn.setFontSize(22);
        this.resultPanel.add(nextBtn);
    }

    const restartBtn = UIManager.createButton(
      this,
      hasNextLevel ? -btnSpacing / 2 : -105,
      btnY,
      "Restart",
      0xff9800,
      () => {
        this.resultPanel.hide(() => {
          this.overlay.destroy();
          this.setupLevel(this.currentLevel);
        });
      },
      hasNextLevel ? 150 : 180,
      46
    );
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(
      this,
      hasNextLevel ? btnSpacing / 2 : 105,
      btnY,
      "Main Menu",
      0x2196f3,
      () => {
        this.resultPanel.hide();
        this.overlay.destroy();
        SceneTransitionManager.transitionTo(this, "MenuScene");
      },
      hasNextLevel ? 150 : 180,
      46
    );
    menuBtn.setFontSize(16);

    this.resultPanel.add([stats, restartBtn, menuBtn]);
    this.resultPanel.show();
  }

  showPauseMenu() {
    this.isPaused = true;
    this.overlay = new Overlay(this);
    
    this.pausePanel = new Panel(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      320,
      300,
      "⏸  PAUSED"
    );

    const resumeBtn = UIManager.createButton(this, 0, -50, "▶  Resume", 0x00c853, () => {
      this.pausePanel.hide(() => {
        this.overlay.destroy();
        this.pausePanel.destroy();
        this.isPaused = false;
      });
    }, 220, 44);
    resumeBtn.setFontSize(16);

    const restartBtn = UIManager.createButton(this, 0, 8, "↺  Restart Level", 0xff9800, () => {
      this.pausePanel.hide();
      this.overlay.destroy();
      this.setupLevel(this.currentLevel);
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
