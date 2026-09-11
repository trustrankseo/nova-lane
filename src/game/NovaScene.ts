import Phaser from 'phaser';

export type RunResult = { score: number; level: number; shards: number; nearMisses: number };

type FallingObject = Phaser.Physics.Arcade.Image & { kind?: 'hazard' | 'shard' | 'shield' };

export class NovaScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private hazards!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private stars: Phaser.GameObjects.Arc[] = [];
  private laneXs = [0, 0, 0];
  private lane = 1;
  private level = 1;
  private score = 0;
  private shards = 0;
  private nearMisses = 0;
  private lives = 3;
  private shield = false;
  private ended = false;
  private levelElapsed = 0;
  private spawnElapsed = 0;
  private pickupElapsed = 0;
  private pointerStartX = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private shardText!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Rectangle;
  private riftLabel!: Phaser.GameObjects.Text;
  private speed = 265;

  constructor() { super('NovaScene'); }

  create(): void {
    this.createTextures();
    this.createWorld();
    this.createHud();
    this.configureScale(this.scale.width, this.scale.height);

    this.hazards = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.player = this.physics.add.image(this.laneXs[1], this.scale.height - 105, 'ship').setDepth(5);
    this.player.setCircle(19, 13, 12).setCollideWorldBounds(true);

    this.physics.add.overlap(this.player, this.hazards, (_, object) => this.hitHazard(object as FallingObject));
    this.physics.add.overlap(this.player, this.pickups, (_, object) => this.collect(object as FallingObject));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.pointerStartX = pointer.x; });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.ended) return;
      const delta = pointer.x - this.pointerStartX;
      if (Math.abs(delta) > 28) this.shift(delta > 0 ? 1 : -1);
      else this.shift(pointer.x >= this.scale.width / 2 ? 1 : -1);
    });
    this.input.keyboard?.on('keydown-LEFT', () => this.shift(-1));
    this.input.keyboard?.on('keydown-A', () => this.shift(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.shift(1));
    this.input.keyboard?.on('keydown-D', () => this.shift(1));
    this.scale.on('resize', (size: Phaser.Structs.Size) => this.configureScale(size.width, size.height));
    this.announceLevel();
  }

  update(_: number, delta: number): void {
    if (this.ended) return;
    const seconds = delta / 1000;
    this.levelElapsed += seconds;
    this.spawnElapsed += delta;
    this.pickupElapsed += delta;
    this.score += Math.ceil(seconds * (14 + this.level * 1.4));
    this.speed = Math.min(680, 250 + this.level * 10 + (this.isRift() ? 95 : 0));

    const spawnEvery = Math.max(315, 1050 - this.level * 25) * (this.isRift() ? .68 : 1);
    if (this.spawnElapsed >= spawnEvery) {
      this.spawnElapsed = 0;
      this.spawnPattern();
    }
    if (this.pickupElapsed >= Math.max(1200, 2450 - this.level * 10)) {
      this.pickupElapsed = 0;
      this.spawnPickup();
    }
    this.moveFalling(this.hazards, delta);
    this.moveFalling(this.pickups, delta * .88);
    this.animateBackground(delta);
    this.updateHud();

    const duration = this.isRift() ? 22 : 17;
    this.progress.width = (this.scale.width - 36) * Math.min(1, this.levelElapsed / duration);
    if (this.levelElapsed >= duration) this.nextLevel();
  }

  private createTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x84f7ff).fillTriangle(32, 0, 62, 62, 32, 48).fillTriangle(32, 0, 2, 62, 32, 48);
    graphics.fillStyle(0x9c73ff).fillTriangle(32, 18, 48, 55, 32, 47).fillTriangle(32, 18, 16, 55, 32, 47);
    graphics.fillStyle(0xffffff).fillCircle(32, 27, 6);
    graphics.generateTexture('ship', 64, 68).clear();
    graphics.fillStyle(0xff3f69).fillRoundedRect(0, 0, 54, 54, 14);
    graphics.lineStyle(3, 0xff8ca2).strokeRoundedRect(2, 2, 50, 50, 12);
    graphics.fillStyle(0x461020).fillCircle(27, 27, 10);
    graphics.generateTexture('hazard', 54, 54).clear();
    graphics.fillStyle(0x79f7ff).fillPoints([{x:18,y:0},{x:36,y:18},{x:18,y:36},{x:0,y:18}], true);
    graphics.fillStyle(0xffffff).fillCircle(18, 18, 5);
    graphics.generateTexture('shard', 36, 36).clear();
    graphics.lineStyle(4, 0xffd76d).strokeCircle(24, 24, 18);
    graphics.lineStyle(2, 0xffffff).strokeCircle(24, 24, 10);
    graphics.generateTexture('shield', 48, 48).destroy();
  }

  private createWorld(): void {
    for (let i = 0; i < 80; i += 1) {
      const star = this.add.circle(Math.random() * this.scale.width, Math.random() * this.scale.height, Math.random() * 1.7 + .4, i % 8 === 0 ? 0x7af1ff : 0xffffff, Math.random() * .55 + .15);
      star.setData('speed', Math.random() * .14 + .04);
      this.stars.push(star);
    }
    const lanes = this.add.graphics().setDepth(0).setAlpha(.22);
    lanes.lineStyle(1, 0x7689ce);
    lanes.lineBetween(0, 0, 0, this.scale.height);
    lanes.setName('lanes');
  }

  private createHud(): void {
    const style = { fontFamily: 'Exo 2, sans-serif', color: '#ffffff', fontStyle: 'bold' };
    this.scoreText = this.add.text(18, 26, '0', { ...style, fontSize: '24px' }).setDepth(10);
    this.levelText = this.add.text(18, 57, 'LEVEL 1', { ...style, fontSize: '10px', color: '#7bf7ff', letterSpacing: 2 }).setDepth(10);
    this.livesText = this.add.text(18, 82, '◆ ◆ ◆', { ...style, fontSize: '12px', color: '#ff758f', letterSpacing: 4 }).setDepth(10);
    this.shardText = this.add.text(this.scale.width - 76, 79, '◇ 0', { ...style, fontSize: '12px', color: '#80f5ff' }).setDepth(10);
    this.progress = this.add.rectangle(18, 110, 1, 3, 0x7bf7ff).setOrigin(0, .5).setDepth(10);
    this.riftLabel = this.add.text(this.scale.width / 2, 142, '', { ...style, fontSize: '11px', color: '#ffca70', letterSpacing: 3 }).setOrigin(.5).setDepth(10);
  }

  private configureScale(width: number, height: number): void {
    const roadWidth = Math.min(width * .82, 430);
    const center = width / 2;
    this.laneXs = [center - roadWidth / 3, center, center + roadWidth / 3];
    const lanes = this.children.getByName('lanes') as Phaser.GameObjects.Graphics | null;
    if (lanes) {
      lanes.clear().lineStyle(1, 0x7689ce);
      lanes.lineBetween(center - roadWidth / 6, 125, center - roadWidth / 6, height);
      lanes.lineBetween(center + roadWidth / 6, 125, center + roadWidth / 6, height);
      lanes.lineStyle(2, 0x705fe0, .6).strokeRoundedRect(center - roadWidth / 2, 124, roadWidth, Math.max(1, height - 124), 20);
    }
    if (this.player) {
      this.player.setPosition(this.laneXs[this.lane], height - 105);
    }
    this.shardText?.setX(width - 76);
    this.riftLabel?.setX(center);
  }

  private shift(direction: number): void {
    const target = Phaser.Math.Clamp(this.lane + direction, 0, 2);
    if (target === this.lane) return;
    this.lane = target;
    this.tweens.killTweensOf(this.player);
    this.tweens.add({ targets: this.player, x: this.laneXs[this.lane], duration: 115, ease: 'Sine.Out' });
  }

  private spawnPattern(): void {
    const lane = Phaser.Math.Between(0, 2);
    this.spawnHazard(lane);
    const doubleChance = Math.min(.66, .08 + this.level * .018 + (this.isRift() ? .25 : 0));
    if (Math.random() < doubleChance) {
      const other = (lane + Phaser.Math.Between(1, 2)) % 3;
      this.time.delayedCall(this.isRift() ? 70 : 150, () => this.spawnHazard(other));
    }
  }

  private spawnHazard(lane: number): void {
    if (this.ended) return;
    const hazard = this.hazards.create(this.laneXs[lane], 130, 'hazard') as FallingObject;
    hazard.kind = 'hazard';
    hazard.setData('lane', lane).setData('counted', false);
    hazard.setScale(this.isRift() ? 1.08 : .92 + Math.min(.18, this.level * .004));
    hazard.setAngularVelocity(Phaser.Math.Between(-85, 85));
  }

  private spawnPickup(): void {
    const lane = Phaser.Math.Between(0, 2);
    const shieldDrop = !this.shield && Math.random() < .12;
    const pickup = this.pickups.create(this.laneXs[lane], 130, shieldDrop ? 'shield' : 'shard') as FallingObject;
    pickup.kind = shieldDrop ? 'shield' : 'shard';
    pickup.setData('lane', lane).setAngularVelocity(shieldDrop ? 40 : 130);
  }

  private moveFalling(group: Phaser.Physics.Arcade.Group, delta: number): void {
    group.children.each((child) => {
      const object = child as FallingObject;
      object.y += this.speed * delta / 1000;
      if (object.kind === 'hazard' && !object.getData('counted') && object.y > this.player.y + 30) {
        object.setData('counted', true);
        if (Math.abs(Number(object.getData('lane')) - this.lane) === 1) {
          this.nearMisses += 1;
          this.score += 35 + this.level * 3;
          this.flashText('NEAR MISS +35', this.player.x, this.player.y - 45, '#ffd870');
        }
      }
      if (object.y > this.scale.height + 70) object.destroy();
      return true;
    });
  }

  private hitHazard(hazard: FallingObject): void {
    if (!hazard.active) return;
    hazard.destroy();
    if (this.shield) {
      this.shield = false;
      this.player.clearTint();
      this.flashText('SHIELD SAVED YOU', this.player.x, this.player.y - 50, '#ffd76d');
      this.cameras.main.shake(120, .006);
      return;
    }
    this.lives -= 1;
    this.events.emit('impact');
    this.cameras.main.shake(210, .014);
    this.cameras.main.flash(130, 255, 45, 85, false);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(110, () => this.player?.clearTint());
    if (this.lives <= 0) this.endRun();
  }

  private collect(pickup: FallingObject): void {
    if (!pickup.active) return;
    const kind = pickup.kind;
    pickup.destroy();
    if (kind === 'shield') {
      this.shield = true;
      this.player.setTint(0xffd76d);
      this.flashText('SHIELD ONLINE', this.player.x, this.player.y - 50, '#ffd76d');
    } else {
      const value = this.isRift() ? 3 : 1;
      this.shards += value;
      this.score += 75 * value;
      this.flashText(`+${75 * value}`, this.player.x, this.player.y - 42, '#7bf7ff');
    }
  }

  private nextLevel(): void {
    this.level += 1;
    this.levelElapsed = 0;
    this.score += 300 + this.level * 30;
    this.hazards.clear(true, true);
    this.announceLevel();
  }

  private announceLevel(): void {
    const rift = this.isRift();
    this.riftLabel.setText(rift ? '⚡ RIFT LEVEL · 3× SHARDS' : '');
    if (rift) this.cameras.main.setBackgroundColor('#130716');
    else this.cameras.main.setBackgroundColor('#070916');
    const title = this.add.text(this.scale.width / 2, this.scale.height / 2, rift ? `RIFT ${this.level}` : `LEVEL ${this.level}`, {
      fontFamily: 'Exo 2, sans-serif', fontSize: rift ? '36px' : '31px', fontStyle: 'bold', color: rift ? '#ffcc73' : '#ffffff', letterSpacing: 3
    }).setOrigin(.5).setDepth(20).setAlpha(0).setScale(.75);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 250, yoyo: true, hold: 600, onComplete: () => title.destroy() });
  }

  private isRift(): boolean { return this.level % 10 === 0; }

  private updateHud(): void {
    this.scoreText.setText(Math.floor(this.score).toLocaleString());
    this.levelText.setText(`LEVEL ${this.level}`);
    this.livesText.setText(Array.from({ length: Math.max(0, this.lives) }, () => '◆').join(' '));
    this.shardText.setText(`◇ ${this.shards}`);
  }

  private animateBackground(delta: number): void {
    for (const star of this.stars) {
      star.y += this.speed * Number(star.getData('speed')) * delta / 1000;
      if (star.y > this.scale.height) { star.y = -4; star.x = Math.random() * this.scale.width; }
    }
  }

  private flashText(text: string, x: number, y: number, color: string): void {
    const label = this.add.text(x, y, text, { fontFamily: 'Exo 2, sans-serif', fontSize: '11px', fontStyle: 'bold', color }).setOrigin(.5).setDepth(15);
    this.tweens.add({ targets: label, y: y - 25, alpha: 0, duration: 700, onComplete: () => label.destroy() });
  }

  private endRun(): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    this.time.delayedCall(350, () => this.events.emit('run-ended', {
      score: Math.floor(this.score), level: this.level, shards: this.shards, nearMisses: this.nearMisses
    } satisfies RunResult));
  }
}
