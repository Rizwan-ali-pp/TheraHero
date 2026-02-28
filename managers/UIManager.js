class UIManager {
  static createButton(scene, x, y, text, colorCSS, callback, width, height) {
    let colorHex = colorCSS;
    if (typeof colorCSS === 'string' && colorCSS.startsWith('#')) {
      colorHex = parseInt(colorCSS.replace('#', '0x'));
    }
    return new Button(scene, x, y, text, colorHex, callback, width, height);
  }

  static createOverlay(scene) {
    return new Overlay(scene);
  }

  static createPanel(scene, x, y, width, height, title) {
    return new Panel(scene, x, y, width, height, title);
  }
}
