class TracePathScene extends Phaser.Scene {
  constructor() {
    super("TracePathScene");
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();

    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);

    // Game variables
    this.isPlaying = false;
    this.isPaused = false;
    this.errors = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.pathWidth = 60;
    this.isOutOfBounds = false;

    this.createUI();
    this.createPath();
    this.createCursor();
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

  createPath() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Define points for a curved path
    const points = [
        new Phaser.Math.Vector2(width * 0.15, height * 0.6),
        new Phaser.Math.Vector2(width * 0.3, height * 0.3),
        new Phaser.Math.Vector2(width * 0.5, height * 0.8),
        new Phaser.Math.Vector2(width * 0.7, height * 0.3),
        new Phaser.Math.Vector2(width * 0.85, height * 0.6)
    ];

    this.path = new Phaser.Curves.Spline(points);
    this.pathPoints = this.path.getDistancePoints(10); // get points every 10 pixels roughly for collision

    // Draw the path outline
    this.pathGraphics = this.add.graphics();
    
    // Draw outer glow
    this.pathGraphics.lineStyle(this.pathWidth + 10, 0x00e5ff, 0.3);
    this.path.draw(this.pathGraphics, 128);
    
    // Draw main track
    this.pathGraphics.lineStyle(this.pathWidth, 0x1e293b, 1);
    this.path.draw(this.pathGraphics, 128);
    
    // Draw inner thin line
    this.pathGraphics.lineStyle(4, 0x334155, 1);
    this.path.draw(this.pathGraphics, 128);

    // Start Zone
    this.startZone = this.add.circle(points[0].x, points[0].y, this.pathWidth / 2 + 5, 0x4caf50);
    this.add.text(points[0].x, points[0].y - 50, "START", {
      fontFamily: "Poppins", fontSize: "16px", color: "#4caf50", fontStyle: "bold"
    }).setOrigin(0.5);

    // End Zone
    this.endZone = this.add.circle(points[points.length - 1].x, points[points.length - 1].y, this.pathWidth / 2 + 5, 0xff9800);
    this.add.text(points[points.length - 1].x, points[points.length - 1].y - 50, "FINISH", {
      fontFamily: "Poppins", fontSize: "16px", color: "#ff9800", fontStyle: "bold"
    }).setOrigin(0.5);
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
        
        gameObject.x = dragX;
        gameObject.y = dragY;

        this.checkBounds(dragX, dragY);
        this.checkFinish(dragX, dragY);
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
      for (let i = 0; i < this.pathPoints.length; i++) {
          const pt = this.pathPoints[i];
          const dist = Phaser.Math.Distance.Between(x, y, pt.x, pt.y);
          if (dist < minDistance) {
              minDistance = dist;
          }
      }

      // If outside the path width (radius) minus the cursor radius (16)
      const maxAllowedDistance = (this.pathWidth / 2) - 16; 
      
      if (minDistance > maxAllowedDistance) {
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
    this.showResultPanel();
  }

  showResultPanel() {
    this.overlay = new Overlay(this);
    const finalSeconds = (this.elapsedTime / 1000).toFixed(2);
    
    // Panel wide enough for two side-by-side buttons
    this.resultPanel = new Panel(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      500,
      320,
      "Trace Complete!"
    );

    const stats = this.add
      .text(
        0,
        -20,
        `Time: ${finalSeconds}s\nWall Hits (Errors): ${this.errors}`,
        { fontFamily: "Poppins", fontSize: "22px", color: "#e2e8f0", align: "center" }
      )
      .setOrigin(0.5);

    // Buttons side-by-side: each 180px wide, spaced 110px apart from center
    const restartBtn = UIManager.createButton(
      this,
      -105,
      80,
      "Restart",
      0x4caf50,
      () => {
        this.resultPanel.hide(() => {
          this.overlay.destroy();
          this.scene.restart();
        });
      },
      180,
      46
    );
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(
      this,
      105,
      80,
      "Main Menu",
      0x2196f3,
      () => {
        this.resultPanel.hide();
        this.overlay.destroy();
        SceneTransitionManager.transitionTo(this, "MenuScene");
      },
      180,
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
