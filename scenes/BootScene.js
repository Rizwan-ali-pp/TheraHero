class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.audio("pop", "assets/sounds/pop.mp3");
  }

  create() {
    SceneTransitionManager.transitionTo(this, "LoginScene", 0);
  }
}
