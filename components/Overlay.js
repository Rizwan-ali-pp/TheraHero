class Overlay extends Phaser.GameObjects.Rectangle {
  constructor(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    
    super(scene, width / 2, height / 2, width, height, 0x000000, 0.5);
    
    this.setInteractive(); // Blocks input to elements below it
    this.setDepth(2000);
    scene.add.existing(this);
  }
}
