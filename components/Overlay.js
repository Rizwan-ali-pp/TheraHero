class Overlay extends Phaser.GameObjects.Rectangle {
  constructor(scene) {
    const width = scene.scale.width;
    const height = scene.scale.height;
    
    super(scene, width / 2, height / 2, width, height, 0x1a0533, 0.72);
    
    this.setInteractive(); // Blocks input to elements below it
    this.setDepth(2000);
    scene.add.existing(this);
  }
}
