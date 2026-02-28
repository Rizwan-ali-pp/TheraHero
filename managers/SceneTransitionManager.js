class SceneTransitionManager {
  static transitionTo(currentScene, targetSceneKey, duration = 500) {
    currentScene.cameras.main.fadeOut(duration);
    currentScene.time.delayedCall(duration, () => {
      currentScene.scene.start(targetSceneKey);
    });
  }
}
