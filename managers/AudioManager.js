class AudioManager {
  constructor(scene) {
    this.scene = scene;
  }

  playPop() {
    this.scene.sound.play("pop", { volume: 0.6 });
  }

  static playSound(scene, key, config = {}) {
    try {
      if (scene.cache.audio.exists(key)) {
        scene.sound.play(key, config);
      }
    } catch (e) {
      // Silently skip missing sounds — never let audio crash game logic
    }
  }
}
