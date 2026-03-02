class Panel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, titleText) {
    super(scene, x, y);

    const hw = width / 2;
    const hh = height / 2;

    // ── Outer glow / bloom shadow ──────────────────────────────
    this.glow = scene.add.rectangle(0, 0, width + 24, height + 24, 0xffd93d, 0.10)
      .setOrigin(0.5);

    // ── Drop shadow ────────────────────────────────────────────
    this.shadow = scene.add.rectangle(6, 10, width, height, 0x000000, 0.55)
      .setOrigin(0.5);

    // ── Main body: deep purple ──────────────────────────────────
    this.bodyBg = scene.add.rectangle(0, 0, width, height, 0x1e0340, 1)
      .setStrokeStyle(2, 0x4a1080)
      .setOrigin(0.5);

    // Accent border (warm gold)
    this.border = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setStrokeStyle(3, 0xffd93d)
      .setOrigin(0.5);

    // Inner top highlight strip (glass feel)
    this.topHighlight = scene.add.rectangle(0, -hh + 4, width - 8, 2, 0xffffff, 0.07)
      .setOrigin(0.5, 0.5);

    // ── Title area background ─────────────────────────────────
    const titleAreaH = 54;
    this.titleBg = scene.add.rectangle(0, -hh + titleAreaH / 2, width, titleAreaH, 0xffd93d, 0.12)
      .setOrigin(0.5);

    // ── Gold accent line below title ──────────────────────────
    this.divider = scene.add.rectangle(0, -hh + titleAreaH + 1, width - 40, 2, 0xffd93d, 0.7)
      .setOrigin(0.5, 0.5);

    // ── Title text ────────────────────────────────────────────
    this.title = scene.add.text(0, -hh + titleAreaH / 2, titleText, {
      fontFamily: 'Poppins',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: { blur: 14, color: '#ffd93d', fill: true }
    }).setOrigin(0.5);

    // ── Corner accents (warm gold) ────────────────────────────
    const cornerSize = 14;
    const cx = hw - cornerSize / 2;
    const cy = hh - cornerSize / 2;
    const makeCorner = (ox, oy) =>
      scene.add.rectangle(ox, oy, cornerSize, cornerSize, 0xffd93d, 0.7).setOrigin(0.5);

    this.c1 = makeCorner(-cx, -cy);
    this.c2 = makeCorner( cx, -cy);
    this.c3 = makeCorner(-cx,  cy);
    this.c4 = makeCorner( cx,  cy);

    this.add([
      this.glow, this.shadow, this.bodyBg, this.border,
      this.topHighlight, this.titleBg, this.divider, this.title,
      this.c1, this.c2, this.c3, this.c4
    ]);

    scene.add.existing(this);
    this.setAlpha(0);
    this.setScale(0.85);
    this.setDepth(2001);
  }

  show() {
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 320,
      ease: 'Back.easeOut'
    });
  }

  hide(onComplete) {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.85,
      duration: 220,
      ease: 'Power2',
      onComplete: () => { if (onComplete) onComplete(); }
    });
  }
}
