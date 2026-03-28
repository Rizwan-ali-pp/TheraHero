class PicturePuzzleScene extends Phaser.Scene {
  constructor() {
    super("PicturePuzzleScene");
  }

  init(data) {
    // Start at level 0 (Level 1) if no data is passed
    this.currentLevel = data.level || 0;
  }

  preload() {
    // 5 progressive levels of difficulty using breathtaking Unsplash photography
    this.levels = [
      { grid: 2, url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80" }, // 2x2 = 4 easy pieces
      { grid: 3, url: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80" }, // 3x3 = 9 pieces
      { grid: 4, url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80" }, // 4x4 = 16 pieces
      { grid: 5, url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80" }, // 5x5 = 25 tiny pieces
      { grid: 6, url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80" }  // 6x6 = 36 pieces (Expert)
    ];

    const levelData = this.levels[this.currentLevel];
    const frameSize = 600 / levelData.grid; // Perfectly cuts the 600x600 image mathematically
    
    // Load the specific beautiful image for this level and automatically slice it!
    this.load.spritesheet(`puzzlePieces_${this.currentLevel}`, levelData.url, {
      frameWidth: frameSize,
      frameHeight: frameSize
    });

    // Also load it as a single full image for the hint button preview!
    this.load.image(`puzzleFull_${this.currentLevel}`, levelData.url);
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();
    
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    
    this.gridSize = this.levels[this.currentLevel].grid;
    this.pieceSize = 600 / this.gridSize;
    this.placedCount = 0;
    
    this.createUI();
    this.createPauseButton();
    this.createHintButton();

    this.isPaused = false;
    this.isHintActive = false;
    this.startTime = this.time.now;
    this.errors = 0;

    // Boxes centers (Left box = scrambled pile, Right box = empty puzzle grid)
    this.leftBoxX = this.scale.width * 0.25;
    this.leftBoxY = this.scale.height * 0.55;
    
    this.rightBoxX = this.scale.width * 0.75;
    this.rightBoxY = this.scale.height * 0.55;

    this.drawBoxes();
    this.createPuzzle();

    this.inputManager.on("PAUSE", () => {
      if (!this.isPaused) this.showPauseMenu();
    });
  }

  /* ---------------- BACKGROUND ---------------- */
  createBackground() {
    this.bg = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;
    // Elegant dark slate background
    this.bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    this.bg.fillRect(0, 0, width, height);
  }

  /* ---------------- UI ---------------- */
  createUI() {
    this.modeTitle = this.add
      .text(this.scale.width / 2, 40, `🖼️  Picture Puzzle (Level ${this.currentLevel + 1})`, {
        fontFamily: "Poppins",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold",
        shadow: { blur: 14, color: '#3498db', fill: true }
      })
      .setOrigin(0.5);

    this.instructionsText = this.add
      .text(this.scale.width / 2, 90, "Drag the pieces from the pile into the grid!", {
        fontFamily: "Poppins",
        fontSize: "18px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);
  }

  createPauseButton() {
    this.pauseBtn = UIManager.createButton(
      this, this.scale.width - 65, 35, "Pause", 0xffa000,
      () => this.showPauseMenu(), 110, 38
    );
    this.pauseBtn.setFontSize(15);
    this.pauseBtn.setDepth(100);
  }

  createHintButton() {
    this.hintBtn = UIManager.createButton(
      this, this.scale.width / 2, this.scale.height - 40, "👁️  Show Hint", 0x3498db,
      () => this.showHint(), 220, 44
    );
    this.hintBtn.setFontSize(18);
    this.hintBtn.setDepth(100);
  }

  showHint() {
    // Only allow hint if not already showing, not paused, and game isn't won yet
    if (this.isHintActive || this.isPaused || this.placedCount >= (this.gridSize * this.gridSize)) return;

    this.isHintActive = true;
    AudioManager.playSound(this, "pop", {volume: 0.4});
    
    // Fade in the completed image over the grid for exactly 1 second, then fade out
    this.tweens.add({
      targets: this.hintImage,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1000, 
      onComplete: () => {
         this.isHintActive = false;
      }
    });
  }

  /* ---------------- GAMEPLAY ---------------- */
  drawBoxes() {
     const graphics = this.add.graphics();
     
     // 1. Draw the left box area background (Scrambled pile area)
     graphics.fillStyle(0x1e293b, 0.5);
     graphics.fillRoundedRect(this.leftBoxX - 320, this.leftBoxY - 320, 640, 640, 20);
     graphics.lineStyle(4, 0x334155, 1);
     graphics.strokeRoundedRect(this.leftBoxX - 320, this.leftBoxY - 320, 640, 640, 20);

     // 2. Draw the empty grid on the right (Destination)
     graphics.lineStyle(2, 0x475569, 1); // Thinner line for the dense grids
     
     // Calculate top-left corner of the 600x600 grid relative to rightBoxX/Y center
     const startX = this.rightBoxX - 300;
     const startY = this.rightBoxY - 300;

     for(let i = 0; i <= this.gridSize; i++) {
        // Vertical Lines
        graphics.moveTo(startX + i * this.pieceSize, startY);
        graphics.lineTo(startX + i * this.pieceSize, startY + 600);
        // Horizontal Lines
        graphics.moveTo(startX, startY + i * this.pieceSize);
        graphics.lineTo(startX + 600, startY + i * this.pieceSize);
     }
     graphics.strokePath();

     // Thicker outline container
     graphics.lineStyle(6, 0x94a3b8, 1);
     graphics.strokeRect(startX, startY, 600, 600);

     // Pre-load the full hint image over the destination grid (hidden by default)
     this.hintImage = this.add.image(this.rightBoxX, this.rightBoxY, `puzzleFull_${this.currentLevel}`);
     this.hintImage.setDisplaySize(600, 600);
     this.hintImage.setAlpha(0); // Invisible initially
     this.hintImage.setDepth(50); // Shows up on top of puzzle pieces when clicked
  }

  createPuzzle() {
      this.pieces = [];
      
      const startX = this.rightBoxX - 300 + (this.pieceSize / 2); // Center of Top-Left cell
      const startY = this.rightBoxY - 300 + (this.pieceSize / 2);

      // Pre-calculate shuffled grid positions for the left box to keep pieces neatly arranged
      const leftStartX = this.leftBoxX - 300 + (this.pieceSize / 2);
      const leftStartY = this.leftBoxY - 300 + (this.pieceSize / 2);
      
      let leftSpots = [];
      for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
              leftSpots.push({
                  x: leftStartX + (col * this.pieceSize),
                  y: leftStartY + (row * this.pieceSize)
              });
          }
      }
      Phaser.Utils.Array.Shuffle(leftSpots);

      let frameIndex = 0;
      for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
             
             // The perfect mathematical destination for this piece
             const targetX = startX + (col * this.pieceSize);
             const targetY = startY + (row * this.pieceSize);

             // Grab a unique, arranged spot from the shuffled array
             const spawnSpot = leftSpots[frameIndex];
             const rx = spawnSpot.x;
             const ry = spawnSpot.y;

             const piece = this.add.sprite(rx, ry, `puzzlePieces_${this.currentLevel}`, frameIndex);
             piece.setInteractive({ useHandCursor: true });
             this.input.setDraggable(piece);

             // Inject custom properties for snapping logic
             piece.targetX = targetX;
             piece.targetY = targetY;
             piece.spawnX = rx; // Remember original box position
             piece.spawnY = ry;
             piece.isSnapped = false;

             // Ensure pieces are perfectly straight in their grid
             piece.setAngle(0);
             
             this.pieces.push(piece);
             frameIndex++;
          }
      }

      // Drag Physics Hookups
      this.input.on("dragstart", (pointer, obj) => {
          if (obj.isSnapped || this.isPaused) return;
          this.children.bringToTop(obj); // Bring piece to front 
          // Smoothly straighten the piece when picked up
          this.tweens.add({targets: obj, scale: 1.05, angle: 0, duration: 150, ease: 'Power2'}); 
      });

      this.input.on("drag", (pointer, obj, dragX, dragY) => {
          if (obj.isSnapped || this.isPaused) return;
          obj.x = dragX;
          obj.y = dragY;
      });

      this.input.on("dragend", (pointer, obj) => {
          if (obj.isSnapped || this.isPaused) return;
          
          // Revert scale
          this.tweens.add({targets: obj, scale: 1, duration: 150});
          
          // Check snap distance
          const dist = Phaser.Math.Distance.Between(obj.x, obj.y, obj.targetX, obj.targetY);
          
          // Shrink tolerance as level goes up so smaller pieces don't snap incorrectly
          const tolerance = Math.max(30, this.pieceSize * 0.45); 

          if (dist < tolerance) { 
             obj.isSnapped = true;
             this.input.setDraggable(obj, false);
             
             // Snap elegantly into place
             this.tweens.add({
                 targets: obj,
                 x: obj.targetX,
                 y: obj.targetY,
                 duration: 200,
                 ease: 'Back.easeOut',
                 onComplete: () => {
                     AudioManager.playSound(this, "pop", {volume: 0.5});
                     this.placedCount++;
                     this.checkWin();
                 }
             });
          } else {
             // Dropped in the wrong place, drop it firmly but keep it straight
             this.errors++;
             AudioManager.playSound(this, "error", {volume: 0.3});
          }
      });
  }

  checkWin() {
     const totalPieces = this.gridSize * this.gridSize;
     if (this.placedCount >= totalPieces) {
         AudioManager.playSound(this, "pop", {volume: 0.8}); // Victory sound
         const timeTaken = parseFloat(((this.time.now - this.startTime) / 1000).toFixed(2));
         
         dataManager.saveGameResult("picture_puzzle", { 
             level: this.currentLevel + 1,
             grid: `${this.gridSize}x${this.gridSize}`,
             timeInSeconds: timeTaken, 
             errors: this.errors 
         });
         
         // Final beautiful flourish: briefly highlight the whole completed image
         this.tweens.add({
             targets: this.pieces,
             scale: 1.02,
             yoyo: true,
             duration: 150,
             ease: 'Sine.easeInOut'
         });

         this.time.delayedCall(800, () => this.showResultPanel(timeTaken));
     }
  }

  /* ---------------- PAUSE AND RESULTS ---------------- */
  showResultPanel(timeTaken) {
    this.overlay = UIManager.createOverlay(this);
    const width = this.scale.width;
    const height = this.scale.height;

    const panel = UIManager.createPanel(this, width / 2, height / 2, 500, 400, "Puzzle Complete!");

    const hasNextLevel = this.currentLevel < this.levels.length - 1;

    const resultText = this.add.text(0, -60,
      `Level ${this.currentLevel + 1} (${this.gridSize}x${this.gridSize})\nTime: ${timeTaken}s\nErrors: ${this.errors}`,
      { fontFamily: "Poppins", fontSize: "22px", color: "#e2e8f0", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5);

    panel.add(resultText);

    const btnY = 130;

    if (hasNextLevel) {
        const nextBtn = UIManager.createButton(this, 0, 30, "Next Level ➔", 0x6bcb77, () => {
            this.scene.restart({ level: this.currentLevel + 1 });
        }, 220, 50);
        nextBtn.setFontSize(20);
        panel.add(nextBtn);

        const restartBtn = UIManager.createButton(this, -110, btnY, "↺ Restart", 0xff9800, () => {
            this.scene.restart({ level: this.currentLevel });
        }, 180, 44);
        
        const menuBtn = UIManager.createButton(this, 110, btnY, "⌂ Main Menu", 0x2196f3, () => {
            SceneTransitionManager.transitionTo(this, "MenuScene");
        }, 180, 44);
        
        restartBtn.setFontSize(16);
        menuBtn.setFontSize(16);
        panel.add([restartBtn, menuBtn]);

    } else {
        const completionText = this.add.text(0, 20, "★ You beat all levels! ★", {
            fontFamily: "Poppins", fontSize: "28px", color: "#ffd93d", fontStyle: "bold"
        }).setOrigin(0.5);
        panel.add(completionText);

        const restartBtn = UIManager.createButton(this, -110, btnY, "↺ Play Again", 0xff9800, () => {
            this.scene.restart({ level: 0 }); // restart from level 1
        }, 180, 44);
        
        const menuBtn = UIManager.createButton(this, 110, btnY, "⌂ Main Menu", 0x2196f3, () => {
            SceneTransitionManager.transitionTo(this, "MenuScene");
        }, 180, 44);

        restartBtn.setFontSize(16);
        menuBtn.setFontSize(16);
        panel.add([restartBtn, menuBtn]);
    }

    panel.setScale(0).setAlpha(0);
    this.tweens.add({targets: panel, scale: 1, alpha: 1, duration: 600, ease: "Back.easeOut"});
  }

  showPauseMenu() {
    if (this.isPaused) return;
    this.isPaused = true;
    
    this.overlay = UIManager.createOverlay(this);
    const width = this.scale.width;
    const height = this.scale.height;
    
    this.pausePanel = UIManager.createPanel(this, width / 2, height / 2, 320, 300, "⏸  PAUSED");

    const resumeBtn = UIManager.createButton(this, 0, -50, "▶  Resume", 0x00c853, () => {
      this.pausePanel.hide(() => {
        this.overlay.destroy();
        this.pausePanel.destroy();
        this.isPaused = false;
      });
    }, 220, 44);
    resumeBtn.setFontSize(16);

    const restartBtn = UIManager.createButton(this, 0, 8, "↺  Restart", 0xff9800, () => {
      this.scene.restart({ level: this.currentLevel });
    }, 220, 44);
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(this, 0, 62, "⌂  Main Menu", 0x2196f3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 220, 44);
    menuBtn.setFontSize(16);

    this.pausePanel.add([resumeBtn, restartBtn, menuBtn]);
    this.pausePanel.show();
  }
}
