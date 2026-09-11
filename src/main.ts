import './styles.css';
import Phaser from 'phaser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { NovaScene, type RunResult } from './game/NovaScene';
import { loadSave, writeSave, type SaveData } from './services/storage';
import { monetization } from './services/monetization';

const app = document.querySelector<HTMLDivElement>('#app')!;
let save: SaveData;
let game: Phaser.Game | null = null;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]!));

function shell(content: string): void {
  app.innerHTML = `<main class="app-shell">${content}</main>`;
}

function renderHome(): void {
  destroyGame();
  shell(`
    <div class="aurora"></div>
    <section class="home screen-enter">
      <div class="topbar">
        <button class="icon-btn" id="settings" aria-label="Settings">⚙</button>
        <div class="currency"><span class="shard">◆</span><b>${save.shards.toLocaleString()}</b></div>
      </div>
      <div class="brand">
        <div class="brand-mark"><span></span><i></i></div>
        <p class="eyebrow">ENDLESS COSMIC ARCADE</p>
        <h1>NOVA<br><em>LANE</em></h1>
        <p class="tagline">Shift. Survive. Outrun the rift.</p>
      </div>
      <div class="record-grid">
        <div><span>BEST SCORE</span><strong>${save.highScore.toLocaleString()}</strong></div>
        <div><span>BEST LEVEL</span><strong>${save.bestLevel}</strong></div>
      </div>
      <div class="menu-actions">
        <button class="primary-btn" id="play"><span>PLAY</span><small>Tap or swipe to move</small></button>
        <div class="secondary-row">
          <button class="secondary-btn" id="leaders"><b>♛</b> LEADERS</button>
          <button class="secondary-btn" id="shop"><b>◇</b> HANGAR</button>
        </div>
      </div>
      <p class="milestone-note"><span>⚡</span> Every 10th level is a RIFT level</p>
    </section>
  `);
  document.querySelector('#play')?.addEventListener('click', startGame);
  document.querySelector('#leaders')?.addEventListener('click', renderLeaderboard);
  document.querySelector('#shop')?.addEventListener('click', renderShop);
  document.querySelector('#settings')?.addEventListener('click', renderSettings);
}

function startGame(): void {
  shell(`<section class="game-wrap"><div id="game"></div><button class="pause-btn" id="pause" aria-label="Pause">Ⅱ</button></section>`);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#070916',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false, roundPixels: true },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [NovaScene],
    callbacks: {
      postBoot: (instance) => {
        const scene = instance.scene.getScene('NovaScene') as NovaScene;
        scene.events.on('run-ended', (result: RunResult) => void finishRun(result));
        scene.events.on('impact', () => void vibrate());
      }
    }
  });
  document.querySelector('#pause')?.addEventListener('click', showPause);
}

function showPause(): void {
  const scene = game?.scene.getScene('NovaScene') as NovaScene | undefined;
  if (!scene || scene.scene.isPaused()) return;
  scene.scene.pause();
  const panel = document.createElement('div');
  panel.className = 'modal-backdrop';
  panel.innerHTML = `<div class="modal panel-pop"><p class="eyebrow">FLIGHT PAUSED</p><h2>Catch your breath.</h2><button class="primary-btn compact" id="resume">RESUME</button><button class="text-btn" id="quit">Quit run</button></div>`;
  app.append(panel);
  panel.querySelector('#resume')?.addEventListener('click', () => { panel.remove(); scene.scene.resume(); });
  panel.querySelector('#quit')?.addEventListener('click', renderHome);
}

async function finishRun(result: RunResult): Promise<void> {
  save.highScore = Math.max(save.highScore, result.score);
  save.bestLevel = Math.max(save.bestLevel, result.level);
  save.shards += result.shards;
  save.games += 1;
  await writeSave(save);
  destroyGame();
  shell(`
    <div class="aurora danger"></div>
    <section class="result screen-enter">
      <p class="eyebrow">RUN COMPLETE</p>
      <h2>${result.level % 10 === 0 ? 'The rift fought back.' : 'A brilliant flight.'}</h2>
      <div class="score-orb"><span>SCORE</span><strong>${result.score.toLocaleString()}</strong><small>LEVEL ${result.level}</small></div>
      <div class="run-stats"><div><span>◆</span><b>+${result.shards}</b><small>SHARDS</small></div><div><span>✦</span><b>${result.nearMisses}</b><small>NEAR MISSES</small></div></div>
      <button class="primary-btn" id="again"><span>FLY AGAIN</span><small>Beat ${Math.max(save.highScore, result.score).toLocaleString()}</small></button>
      <button class="reward-btn" id="reward">▶ WATCH REWARD · DOUBLE SHARDS</button>
      <button class="text-btn" id="home">Back to home</button>
    </section>
  `);
  document.querySelector('#again')?.addEventListener('click', startGame);
  document.querySelector('#home')?.addEventListener('click', renderHome);
  document.querySelector('#reward')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    button.textContent = 'OPENING REWARD…';
    if (await monetization.showRewardedAd()) {
      save.shards += result.shards;
      await writeSave(save);
      button.textContent = `✓ ${result.shards} BONUS SHARDS ADDED`;
    }
  });
}

function renderLeaderboard(): void {
  const names = ['Luna', 'Kai', 'Mira', 'Noor', 'Atlas', 'You'];
  const scores = [982450, 741230, 615900, 488120, 329440, save.highScore];
  const rows = names.map((name, index) => ({ name, score: scores[index] })).sort((a, b) => b.score - a.score);
  shell(`<section class="subscreen screen-enter"><header><button class="back-btn" id="back">‹</button><div><p class="eyebrow">GLOBAL</p><h2>Leaderboard</h2></div><span class="season">S01</span></header><div class="podium"><div><i>2</i><b>MIRA</b><span>615K</span></div><div class="winner"><i>1</i><b>LUNA</b><span>982K</span></div><div><i>3</i><b>KAI</b><span>741K</span></div></div><div class="leader-list">${rows.map((row, i) => `<div class="leader-row ${row.name === 'You' ? 'you' : ''}"><span>${i + 1}</span><i>${row.name.slice(0, 1)}</i><b>${escapeHtml(row.name)}</b><strong>${row.score.toLocaleString()}</strong></div>`).join('')}</div><p class="fineprint">Demo board · connect Play Games Services for live global rankings.</p></section>`);
  document.querySelector('#back')?.addEventListener('click', renderHome);
}

function renderShop(): void {
  const ships = [
    { id: 'nova', name: 'Nova', price: 0, color: '#7bf7ff' },
    { id: 'flare', name: 'Solar Flare', price: 750, color: '#ffcf5a' },
    { id: 'vanta', name: 'Vanta', price: 1800, color: '#c083ff' }
  ];
  shell(`<section class="subscreen screen-enter"><header><button class="back-btn" id="back">‹</button><div><p class="eyebrow">CUSTOMIZE</p><h2>Hangar</h2></div><div class="currency"><span class="shard">◆</span><b>${save.shards}</b></div></header><div class="ship-grid">${ships.map((ship) => { const owned = save.unlockedShips.includes(ship.id); const selected = save.selectedShip === ship.id; return `<button class="ship-card ${selected ? 'selected' : ''}" data-ship="${ship.id}" style="--ship:${ship.color}"><div class="mini-ship"><span></span></div><h3>${ship.name}</h3><p>${selected ? 'EQUIPPED' : owned ? 'EQUIP' : `◆ ${ship.price}`}</p></button>`; }).join('')}</div><div class="store-card"><div><p class="eyebrow">STARTER PACK</p><h3>6,000 shards + Vanta</h3><span>One-time offer</span></div><button id="purchase">$2.99</button></div><p class="fineprint">Store uses a safe test adapter until Google Play Billing product IDs are configured.</p></section>`);
  document.querySelector('#back')?.addEventListener('click', renderHome);
  document.querySelectorAll<HTMLButtonElement>('.ship-card').forEach((card) => card.addEventListener('click', async () => {
    const id = card.dataset.ship!;
    const ship = ships.find((item) => item.id === id)!;
    if (!save.unlockedShips.includes(id)) {
      if (save.shards < ship.price) return toast('Collect more shards to unlock this ship.');
      save.shards -= ship.price;
      save.unlockedShips.push(id);
    }
    save.selectedShip = id;
    await writeSave(save);
    renderShop();
  }));
  document.querySelector('#purchase')?.addEventListener('click', async () => {
    const purchase = await monetization.buy('nova_starter_pack');
    if (purchase.ok) {
      save.shards += 6000;
      if (!save.unlockedShips.includes('vanta')) save.unlockedShips.push('vanta');
      await writeSave(save);
      toast('Test purchase complete. Starter pack unlocked!');
      setTimeout(renderShop, 850);
    }
  });
}

function renderSettings(): void {
  shell(`<section class="subscreen screen-enter"><header><button class="back-btn" id="back">‹</button><div><p class="eyebrow">PREFERENCES</p><h2>Settings</h2></div></header><div class="settings-list"><button data-toggle="sound"><span><b>Game sound</b><small>Music and effects</small></span><i class="toggle ${save.sound ? 'on' : ''}"></i></button><button data-toggle="haptics"><span><b>Haptics</b><small>Feedback on impact</small></span><i class="toggle ${save.haptics ? 'on' : ''}"></i></button></div><div class="how-card"><p class="eyebrow">HOW TO PLAY</p><h3>One thumb. Infinite challenge.</h3><p>Tap the left or right half of the screen—or swipe—to shift lanes. Collect shards, grab power-ups, and avoid red hazards. Every 10th level opens a faster, tougher Rift.</p></div><p class="fineprint">Nova Lane v1.0.0 · Made for Android 10+</p></section>`);
  document.querySelector('#back')?.addEventListener('click', renderHome);
  document.querySelector('[data-toggle="sound"]')?.addEventListener('click', async () => { save.sound = !save.sound; await writeSave(save); renderSettings(); });
  document.querySelector('[data-toggle="haptics"]')?.addEventListener('click', async () => { save.haptics = !save.haptics; await writeSave(save); renderSettings(); });
}

function toast(message: string): void {
  document.querySelector('.toast')?.remove();
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  app.append(element);
  setTimeout(() => element.remove(), 2300);
}

async function vibrate(): Promise<void> {
  if (!save.haptics) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch { /* web preview */ }
}

function destroyGame(): void {
  game?.destroy(true);
  game = null;
}

app.innerHTML = '<main class="app-shell"></main>';
void loadSave().then((data) => {
  save = data;
  renderHome();
});
