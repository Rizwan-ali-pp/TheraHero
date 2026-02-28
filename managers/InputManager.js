class InputManager extends Phaser.Events.EventEmitter {
  constructor(scene) {
    super();
    this.scene = scene;
    this.enabled = true;

    // Use keyboard adapter by default. Future sensor adapters can be plugged in here.
    this.adapter = new KeyboardInputAdapter(scene, this);
  }

  emitEvent(eventName, data) {
    if (this.enabled) {
      this.emit(eventName, data);
    }
  }

  destroy() {
    if (this.adapter) {
      this.adapter.destroy();
    }
    this.removeAllListeners();
  }
}

class KeyboardInputAdapter {
  constructor(scene, manager) {
    this.scene = scene;
    this.manager = manager;

    // Setup keys mapping
    this.keys = {
      ESC: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      SPACE: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      F: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    };

    // Bind listeners and normalize to semantic events
    this.keys.ESC.on('down', () => manager.emitEvent('PAUSE'));
    this.keys.SPACE.on('down', () => manager.emitEvent('ACTION_PRESS'));
    
    // Four finger rush pads
    this.keys.A.on('down', () => manager.emitEvent('PAD_PRESSED', 0));
    this.keys.S.on('down', () => manager.emitEvent('PAD_PRESSED', 1));
    this.keys.D.on('down', () => manager.emitEvent('PAD_PRESSED', 2));
    this.keys.F.on('down', () => manager.emitEvent('PAD_PRESSED', 3));
  }

  destroy() {
    Object.values(this.keys).forEach(k => k.removeAllListeners());
  }
}
