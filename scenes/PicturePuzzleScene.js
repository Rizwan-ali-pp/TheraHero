class PicturePuzzleScene extends Phaser.Scene {
  constructor() {
    super("PicturePuzzleScene");
  }

  preload() {
    // Beautiful highly-contrasted nature image perfectly sized at 600x600 for a 3x3 grid
    // The spritesheet loader instantly slices this into 9 perfect pieces!
    this.load.spritesheet('puzzlePieces', 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=600&q=80', {
      frameWidth: 200,
      frameHeight: 200
    });
  }

  create() {
    this.cameras.main.fadeIn(500);
    this.createBackground();
    
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    
    // Grid settings
    this.gridSize = 3;
    this.pieceSize = 200;
    this.placedCount = 0;
    
    // UI
    this.createUI();
    this.createPauseButton();

    this.isPaused = false;
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
      .text(this.scale.width / 2, 40, "🖼️  Picture Puzzle", {
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

  /* ---------------- GAMEPLAY ---------------- */
  drawBoxes() {
     const graphics = this.add.graphics();
     
     // 1. Draw the left box area background (Scrambled pile area)
     graphics.fillStyle(0x1e293b, 0.5);
     graphics.fillRoundedRect(this.leftBoxX - 320, this.leftBoxY - 320, 640, 640, 20);
     graphics.lineStyle(4, 0x334155, 1);
     graphics.strokeRoundedRect(this.leftBoxX - 320, this.leftBoxY - 320, 640, 640, 20);

     // 2. Draw the empty grid on the right (Destination)
     graphics.lineStyle(4, 0x475569, 1);
     
     // Calculate top-left corner of the 3x3 grid relative to rightBoxX/Y
     const startX = this.rightBoxX - (this.pieceSize * 1.5);
     const startY = this.rightBoxY - (this.pieceSize * 1.5);

     for(let i = 0; i <= this.gridSize; i++) {
        // Vertical Lines
        graphics.moveTo(startX + i * this.pieceSize, startY);
        graphics.lineTo(startX + i * this.pieceSize, startY + (this.gridSize * this.pieceSize));
        // Horizontal Lines
        graphics.moveTo(startX, startY + i * this.pieceSize);
        graphics.lineTo(startX + (this.gridSize * this.pieceSize), startY + i * this.pieceSize);
     }
     graphics.strokePath();
  }

  createPuzzle() {
      this.pieces = [];
      
      const startX = this.rightBoxX - this.pieceSize; // Center of top-left square
      const startY = this.rightBoxY - this.pieceSize;

      let frameIndex = 0;
      for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
             
             // The perfect mathematical destination for this piece
             const targetX = startX + (col * this.pieceSize);
             const targetY = startY + (row * this.pieceSize);

             // Spawn the piece randomly within the left box
             const rx = this.leftBoxX + Phaser.Math.Between(-200, 200);
             const ry = this.leftBoxY + Phaser.Math.Between(-200, 200);

             const piece = this.add.sprite(rx, ry, 'puzzlePieces', frameIndex);
             piece.setInteractive({ useHandCursor: true });
             this.input.setDraggable(piece);

             // Inject custom properties for snapping logic
             piece.targetX = targetX;
             piece.targetY = targetY;
             piece.isSnapped = false;

             // Add a random slight rotation to make it feel like a messy pile of pieces
             piece.setAngle(Phaser.Math.Between(-20, 20));
             
             // Add a slight drop shadow inside the sprite pipeline or keep it simple
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
          
          // 80px is a very generous and forgiving tolerance for motor rehabilitation
          if (dist < 80) { 
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
             // Dropped in the wrong place or randomly in the pile
             this.errors++;
             AudioManager.playSound(this, "error", {volume: 0.3});
             // Let it fall back slightly slanted
             this.tweens.add({targets: obj, angle: Phaser.Math.Between(-15, 15), duration: 200});
          }
      });
  }

  checkWin() {
     if (this.placedCount >= (this.gridSize * this.gridSize)) {
         AudioManager.playSound(this, "pop", {volume: 0.8}); // Victory sound
         const timeTaken = parseFloat(((this.time.now - this.startTime) / 1000).toFixed(2));
         
         dataManager.saveGameResult("picture_puzzle", { timeInSeconds: timeTaken, errors: this.errors });
         this.time.delayedCall(800, () => this.showResultPanel(timeTaken));
     }
  }

  /* ---------------- PAUSE AND RESULTS ---------------- */
  showResultPanel(timeTaken) {
    this.overlay = UIManager.createOverlay(this);
    const width = this.scale.width;
    const height = this.scale.height;

    const panel = UIManager.createPanel(this, width / 2, height / 2, 440, 320, "Puzzle Complete!");

    const resultText = this.add.text(0, -30,
      `Time:  ${timeTaken}s\nErrors:  ${this.errors}`,
      { fontFamily: "Poppins", fontSize: "22px", color: "#e2e8f0", align: "center", lineSpacing: 10 }
    ).setOrigin(0.5);

    const restartBtn = UIManager.createButton(this, -100, 70, "↺  Restart", 0x4caf50, () => {
      this.scene.restart();
    }, 180, 44);
    restartBtn.setFontSize(16);

    const menuBtn = UIManager.createButton(this, 100, 70, "⌂  Main Menu", 0x2196f3, () => {
      SceneTransitionManager.transitionTo(this, "MenuScene");
    }, 180, 44);
    menuBtn.setFontSize(16);

    panel.add([resultText, restartBtn, menuBtn]);
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
      this.scene.restart();
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
