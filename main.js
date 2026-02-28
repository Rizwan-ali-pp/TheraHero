const config = {
    type: Phaser.AUTO,
    backgroundColor: "#f0f8ff",
    scene: [BootScene, MenuScene, ReactionScene, FourFingerScene, TracePathScene, ColorSortScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

new Phaser.Game(config);