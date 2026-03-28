const config = {
    type: Phaser.AUTO,
    backgroundColor: "#1a0533",
    parent: "game-container",
    dom: {
        createContainer: true
    },
    scene: [BootScene, LoginScene, ProfileScene, MenuScene, ReactionScene, FourFingerScene, TracePathScene, ColorSortScene, PicturePuzzleScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

window.game = new Phaser.Game(config);