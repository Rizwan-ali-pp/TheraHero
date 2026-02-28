class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text, color, callback, width = 300, height = 60) {
    super(scene, x, y);

    this.txt = scene.add.text(0, 0, text, {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Auto-contrast text
    const brightness = Phaser.Display.Color.ValueToColor(color).gray;
    if (brightness > 180) {
      this.txt.setColor('#121212');
    }

    // Flexible width
    const w = width || Math.max(200, this.txt.width + 40);
    const h = height || 60; 

    this.btnWidth = w;
    this.btnHeight = h;

    // Drop Shadow
    this.shadow = scene.add.rectangle(0, 6, w, h, 0x000000, 0.4).setOrigin(0.5);
    
    // Main Button
    this.bg = scene.add.rectangle(0, 0, w, h, color).setOrigin(0.5);
    this.baseColor = Phaser.Display.Color.ValueToColor(color);

    this.add([this.shadow, this.bg, this.txt]);
    
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    scene.add.existing(this);

    // Hover effect (Game button style: slides up slightly, brightens, adds outline)
    this.on('pointerover', () => {
      this.bg.setStrokeStyle(4, 0xffffff); // White outline on hover
      this.bg.setFillStyle(this.baseColor.clone().lighten(20).color); // Brighten color
      
      this.scene.tweens.add({ 
        targets: [this.bg, this.txt], 
        y: -4, // Slide up
        duration: 150, 
        ease: 'Power2' 
      });
      // Shadow gets bigger to imply floating
      this.scene.tweens.add({ 
        targets: this.shadow, 
        y: 10, 
        scaleX: 1.05,
        alpha: 0.2, 
        duration: 150, 
        ease: 'Power2' 
      });
    });

    this.on('pointerout', () => {
      this.bg.setStrokeStyle(); // Remove outline
      this.bg.setFillStyle(this.baseColor.color); // Restore color
      
      this.scene.tweens.add({ 
        targets: [this.bg, this.txt], 
        y: 0, 
        duration: 150, 
        ease: 'Power2' 
      });
      this.scene.tweens.add({ 
        targets: this.shadow, 
        y: 6, 
        scaleX: 1,
        alpha: 0.4, 
        duration: 150, 
        ease: 'Power2' 
      });
    });

    this.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: [this.bg, this.txt],
        y: 4, // Press down visually into the shadow
        duration: 80,
        yoyo: true,
        onComplete: () => {
          if (callback) callback();
        }
      });
      // Shadow flattens
      this.scene.tweens.add({
        targets: this.shadow,
        y: 6,
        alpha: 0.6,
        duration: 80,
        yoyo: true
      });
    });
  }

  setFontSize(size) {
    this.txt.setFontSize(size);
    // Respect the width set at construction
    const w = Math.max(this.btnWidth, this.txt.width + 40);
    const h = this.btnHeight;
    this.bg.setDisplaySize(w, h);
    this.shadow.setDisplaySize(w, h);
    this.setSize(w, h);
  }
}
