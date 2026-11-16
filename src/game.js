// Driftwake - Main Game Loop & State


import { GAME_CONFIG, DIFFICULTY, COLORS, CAPTAIN_LINES, STORAGE_KEY } from './config.js';
import { createEngine, createMaterial, flat, enableShadows } from './engine.js';
import { registerSeaShaders } from './shaders.js';
import { createWater, updateWater, wave } from './water.js';
import { createShip, updateShipBuoyancy } from './ship.js';
import { createCaptain, createPip, createTarn, updateCharacters } from './characters.js';
import { createIslands, updateIslandFoam, spawnChests, updateChests } from './world.js';
import { createEnemies, placeEnemy, updateEnemies } from './enemies.js';
import { createProjectiles, shoot, boom, tryFire, updateProjectiles } from './combat.js';
import { createSplashSystem, createVWakeSystem, createSplinterSystem, createFireSystem,
  updateSplashes, updateVWake, updateSplinters, updateFirePuffs,
  spawnSplinters, spawnFire, createDamageNumbers, updateDamageNumbers, spawnDamageNumber,
  createSmokeSystem, updateSmoke, spawnSmoke,
  createSparkleSystem, updateSparkles, spawnSparkles } from './effects.js';
import { createGameFeel } from './gamefeel.js';
import { initAudio, resumeAudio, playSfx, sfxHitEnemy, sfxHitPlayer, toggleMute, isMuted, setMuted } from './audio.js';
import { saveGame, loadGame, resetSave } from './save.js';
import { createInput } from './input.js';
import { createQuestSystem, getAvailableQuest, updateQuestProgress, checkQuestCompletion, QUEST_LIST } from './quests.js';

const { SEA_SIZE, SEA_DIVISIONS, TOTAL_CHESTS, ISLAND_COUNT } = GAME_CONFIG;
const CELL = SEA_SIZE / SEA_DIVISIONS;

export class DriftwakeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.paused = false;
    this.tradeOpen = false;
    
    // Register shaders first
    registerSeaShaders();
    
    // Engine & scene
    const { engine, scene, camera, hemi, sun, lamp, skyColor, shadowGenerator } = createEngine(canvas);
    this.shadowGenerator = shadowGenerator;
    
    // beamMat for day/night (used before chests exist)
    this.beamMat = createMaterial(scene, '#ffc857', '#ffc857');
    this.beamMat.disableLighting = true; this.beamMat.alpha = 0.35; this.beamMat.fogEnabled = false;
    this.engine = engine;
    this.scene = scene;
    this.camera = camera;
    this.hemi = hemi;
    this.sun = sun;
    this.lamp = lamp;
    this.skyColor = skyColor;
    
    // Post-Processing Pipeline
    this.postProcessPipeline = new BABYLON.DefaultRenderingPipeline(
      'postProcess',
      true,
      this.scene,
      [camera],
      1.0
    );
    
    // Configure Bloom
    this.postProcessPipeline.bloomEnabled = true;
    this.postProcessPipeline.bloomThreshold = 0.8;
    this.postProcessPipeline.bloomWeight = 0.4;
    this.postProcessPipeline.bloomKernel = 64;
    
    // Configure Color Grading (enhances day/night cycle)
    this.postProcessPipeline.colorGradingEnabled = true;
    this.postProcessPipeline.colorGradingTexture = null;
    
    // Enable FXAA for smoother edges
    this.postProcessPipeline.fxaaEnabled = true;
    
    // Glow Layer for treasure chests, locked enemies, UI highlights
    this.glowLayer = new BABYLON.GlowLayer('glow', this.scene, {
      mainTextureRatio: 2,
      blurWidth: 1.5, // Reduced from 2 to decrease glow intensity
    });
    this.dayK = 1; // Track day/night for glow reduction (1=day, 0=night)
    
    // Babylon.js GUI - AdvancedDynamicTexture for HUD (with fallback)
    this.guiTexture = null;
    this.hudScore = null;
    this.hudTime = null;
    this.hudHP = null;
    this.hudGold = null;
    this.hudCombo = null;
    this.hudQuest = null;
    
    try {
      if (BABYLON.GUI && BABYLON.GUI.AdvancedDynamicTexture) {
        this.guiTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('HUD');
        
        const createHudText = (name, text, fontSize, color, top, left) => {
          const tb = new BABYLON.GUI.TextBlock(name, text);
          tb.fontSize = fontSize;
          tb.color = color;
          tb.fontFamily = 'Fredoka';
          tb.top = top;
          tb.left = left;
          tb.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
          tb.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
          this.guiTexture.addControl(tb);
          return tb;
        };
        
        this.hudScore = createHudText('hudScore', 'Treasure 0/8', 'clamp(16px, 2vw, 24px)', '#ffc857', '10px', '12px');
        this.hudTime = createHudText('hudTime', '0:00', 'clamp(16px, 2vw, 24px)', '#f7ebc6', '10px', '50%');
        this.hudHP = createHudText('hudHP', 'Hull 5/5', 'clamp(14px, 1.8vw, 20px)', '#6fdc8c', '56px', '12px');
        this.hudGold = createHudText('hudGold', 'Gold 0', 'clamp(14px, 1.8vw, 20px)', '#ffc857', '100px', '12px');
        this.hudCombo = createHudText('hudCombo', '', 'clamp(18px, 2.5vw, 32px)', '#e4572e', '180px', '12px');
        this.hudQuest = createHudText('hudQuest', '', 'clamp(12px, 1.5vw, 18px)', '#f7ebc6', '220px', '12px');
      }
    } catch (e) {
      console.warn('Babylon.js GUI not available, using HTML fallback:', e.message);
    }
    
    // Dev/cheat state
    this.dev = { god: false, d: -1, fast: false };
    
    // Game state
    this.flashTimer = 0;
    this.st = {
      run: false, won: false, got: 0, time: 0,
      h: 0, sp: 0, lean: 0, x: 0, z: 0,
      fx: 0, fz: 1, spd: 1, splashT: 0,
      hp: 5, hpMax: 5, gold: 0, kills: 0, combo: 0,
      diffKey: 'storm', up: { cannon: 0, hull: 0, sail: 0 },
      bestTime: 0, waveT: 0, tarnSeen: false,
      dt: 0, shipY: 0,
    };
    this.chests = [];
    this.enemies = [];
    
    // Systems
    this.D = DIFFICULTY.storm;
    this.fireCd = 0;
    this.lockT = null;
    this.lockCam = true;
    this.splashI = 0;
    this.vwakeI = 0;
    this.splI = 0;
    this.fireI = 0;
    
    // Quest system
    this.quests = createQuestSystem();
    this.tarnEncountered = false;
    this.tarnHasQuest = false;
    
    // Input
    this.input = createInput();
    this.setupInput();
    
    // Game feel
    this.gameFeel = createGameFeel();
    
    // Audio
    ['pointerdown', 'keydown'].forEach(n => addEventListener(n, () => { initAudio(); resumeAudio(); }));
  }
  
  setupInput() {
    const callbacks = {
      onOrbit: (dx, dy) => {
        this.orb.yaw += dx;
        this.orb.pitch = Math.min(1.3, Math.max(0.12, this.orb.pitch + dy));
        this.orb.idle = 0;
      },
      onZoom: (factor) => {
        this.orb.dist = Math.min(40, Math.max(7, this.orb.dist * factor));
        this.orb.idle = 0;
      },
      onPointerDown: () => { this.orb.idle = 0; },
      onEscape: () => {
        const tarnModal = this.$('tarnModal');
        if (tarnModal && tarnModal.style.display === 'flex') {
          this.closeTarnModal();
        } else if (this.paused) this.closePause();
        else if (this.st.run && !this.tradeOpen) this.openPause();
      },
    };
    
    const inputState = this.input.setup(this.canvas, callbacks);
    this.keys = inputState.keys;
    this.held = inputState.held;
    this.getLockCam = inputState.getLockCam;
    this.setLockCam = inputState.setLockCam;
  }
  
  init() {
    // Initialize all game objects
    this.createWorld();
    this.createEntities();
    this.createEffects();
    this.loadSave();
    this.syncUI();
    
    // Start render loop
    this.runRenderLoop();
  }
  
  createWorld() {
    const rnd = this.makeRNG();
    
    // Water
    const water = createWater(this.scene, this.camera, this.skyColor, this.scene.fogDensity);
    this.sea = water.sea;
    this.seaMat = water.seaMat;
    this.seaPositions = water.positions;
    this.seaBasePositions = water.basePositions;
    this.seaIndices = water.indices;
    this.seaNormals = water.normals;
    this.CELL = water.CELL;
    
    // Islands
    this.islands = createIslands(this.scene, rnd);
    
    // Old Tarn (first island)
    const ti = this.islands[0];
    this.tarnX = ti.x + ti.r * 0.2;
    this.tarnZ = ti.z;
    this.tarn = createTarn(this.scene, this.tarnX, ti.r * 0.28, this.tarnZ);
  }
  
  createEntities() {
    // Ship
    const ship = createShip(this.scene, this.shadowGenerator);
    this.ship = ship.ship;
    this.shipBody = ship.body;
    this.lamp.parent = this.shipBody;
    
    // Characters
    this.captain = createCaptain(this.scene, this.shipBody);
    this.pip = createPip(this.scene);
    this.pip.pipA = 0;
    
    // Enemies (raiders + Iron Warden) — hidden until a run places them
    this.enemies = createEnemies(this.scene, this.D);
    this.enemies.forEach(e => e.n.setEnabled(false));
    
    // Camera orbit state
    this.orb = { yaw: 0, pitch: 0.42, dist: 17, h: 0, idle: 9, y: 0, lk: 0, la: 0, dd: 0 };
  }
  
  createEffects() {
    // Particle systems
    const { splashes } = createSplashSystem(this.scene);
    const { vwake } = createVWakeSystem(this.scene);
    const splinters = createSplinterSystem(this.scene);
    const firePuffs = createFireSystem(this.scene);
    
    this.splashes = splashes;
    this.vwake = vwake;
    this.splinters = splinters;
    this.firePuffs = firePuffs;
    
    // Projectiles
    const { balls, booms, ballMat, boomMat } = createProjectiles(this.scene);
    this.balls = balls;
    this.booms = booms;
    this.ballMat = ballMat;
    this.boomMat = boomMat;
    
    // Damage numbers system
    this.damageNumbers = createDamageNumbers();
    
    // Cannon smoke system
    const { smokes: smokeSystem } = createSmokeSystem(this.scene);
    this.smokeSystem = smokeSystem;
    
    // Treasure sparkle system
    const { sparkles: sparkleSystem } = createSparkleSystem(this.scene);
    this.sparkleSystem = sparkleSystem;
  }
  
  makeRNG() {
    let seed = 11;
    return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  }
  
  loadSave() {
    const saved = loadGame();
    if (saved) {
      this.st.gold = saved.gold;
      this.st.up = { cannon: 0, hull: 0, sail: 0, ...(saved.up || {}) };
      this.st.bestTime = saved.bestTime;
      this.st.diffKey = saved.diffKey || 'storm';
      this.D = DIFFICULTY[this.st.diffKey] || DIFFICULTY.storm;
      this.st.hpMax = 5 + 2 * (this.st.up.hull | 0);
      this.st.hp = this.st.hpMax;
    }
    this.st.spd = 1 + 0.12 * (this.st.up.sail | 0);
    this.syncModes();
  }
  
  syncUI() {
    this.updHud();
    this.syncMute();
    this.syncModes();
  }
  
  // ===== UI Helpers =====
  $(id) { return document.getElementById(id); }
  
  updHud() {
    // Update HTML HUD pills (screen-fixed)
    this.$('hpP').textContent = `Hull ${this.st.hp}/${this.st.hpMax}`;
    this.$('goldP').textContent = `Gold ${this.st.gold} · Sunk ${this.st.kills}`;
    this.$('score').textContent = `Treasure ${this.st.got}/${TOTAL_CHESTS}`;

    // Screen effects - vignette on low HP
    const vignette = this.$('vignette');
    const hpRatio = this.st.hp / this.st.hpMax;
    if (hpRatio < 0.4 && vignette) {
      vignette.style.display = 'block';
      vignette.style.opacity = (0.4 - hpRatio) / 0.4;
    } else if (vignette) {
      vignette.style.display = 'none';
    }
    
    // Update Babylon.js GUI HUD elements (supplementary)
    if (this.hudGold) this.hudGold.text = `Gold ${this.st.gold} · Sunk ${this.st.kills}`;
    if (this.hudHP) this.hudHP.text = `Hull ${this.st.hp}/${this.st.hpMax}`;
    if (this.hudScore) this.hudScore.text = `Treasure ${this.st.got}/${TOTAL_CHESTS}`;
    
    if (this.st.combo > 2 && this.hudCombo) {
      this.hudCombo.text = `×${this.st.combo}`;
      this.hudCombo.isVisible = true;
    } else if (this.hudCombo) {
      this.hudCombo.isVisible = false;
    }

    // Update floating combo pill
    if (this.st.combo > 2) {
      this.$('combo').textContent = `×${this.st.combo}`;
      this.$('combo').style.display = 'block';
      this.$('combo').classList.add('on');
    } else {
      this.$('combo').style.display = 'none';
      this.$('combo').classList.remove('on');
    }
  }
  
  syncMute() {
    this.$('muteBtn').textContent = isMuted() ? '🔇 Sound off' : '🔊 Sound on';
  }
  
  syncModes() {
    document.querySelectorAll('.mode').forEach(b => 
      b.classList.toggle('on', b.dataset.m === this.st.diffKey)
    );
  }
  
  say(who, text, ms) {
    const e = this.$('toast');
    e.textContent = `${who}: ${text}`;
    e.style.opacity = 1;
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => { e.style.opacity = 0; }, ms || 2800);
  }
  
  fmt(s) { s = Math.floor(s); return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }
  
  // ===== Quest System =====
  startQuest() {
    const quest = getAvailableQuest.call(this.quests, this.st.diffKey);
    if (quest) {
      this.quests.activeQuest = { ...quest };
      this.quests.questProgress[quest.id] = 0;
      this.say('Old Tarn', `Ahoy! I've a task for ye: ${quest.description} - complete it and the gold be yours!`, 4000);
      this.updQuestHUD();
    }
  }
  
  completeQuest() {
    const result = checkQuestCompletion(this.quests);
    if (result.type === 'completed') {
      const reward = result.quest.reward;
      this.st.gold += reward;
      this.say('Old Tarn', `Well done! Heres ${reward} gold for completing the quest!`, 3000);
      this.quests.activeQuest = null;
      this.updQuestHUD();
      return reward;
    }
    return 0;
  }
  
  updQuestHUD() {
    const questEl = this.$('quest');
    const questHUD = this.$('questHUD');
    if (!questEl || !questHUD) return;
    
    if (this.quests.activeQuest) {
      const result = checkQuestCompletion(this.quests);
      questEl.style.display = 'block';
      questEl.textContent = `${this.quests.activeQuest.icon} ${this.quests.activeQuest.description} (${result.progress}/${result.target})`;
      
      questHUD.style.display = 'block';
      questHUD.innerHTML = `${this.quests.activeQuest.icon} <span style="color:var(--gold)">${this.quests.activeQuest.description}</span> <span style="color:var(--coral)">${result.progress}/${result.target}</span>`;
    } else {
      questEl.style.display = 'none';
      questHUD.style.display = 'none';
    }
  }
  
  checkTarnEncounter() {
    // Check if player is near Tarn with treasure - only shows Trade button, no auto-modal
    const nearTarn = Math.hypot(this.tarnX - this.st.x, this.tarnZ - this.st.z) < 38;
    const hasTreasure = this.st.got > 0;
    
    // Trade button appears when near
    if (nearTarn && hasTreasure) {
      this.tarnHasQuest = this.quests.activeQuest !== null;
    }
  }
  

  showTarnModal() {
    const modal = this.$('tarnModal');
    modal.style.display = 'flex';
      modal.classList.add('pop-in');
    this.paused = true;
    
    // Reset to quests tab
    this.switchTarnTab('quests');
    this.renderQuestList();
    this.renderTarnUpgrades();
  }
  
  closeTarnModal() {
    const modal = this.$('tarnModal');
    modal.style.display = 'none';
    this.paused = false;
  }
  
  switchTarnTab(tab) {
    document.querySelectorAll('.tarn-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.style.background = isActive ? 'var(--gold)' : 'var(--panel)';
      btn.style.color = isActive ? 'var(--ink)' : 'var(--text)';
      btn.style.border = isActive ? '0' : '2px solid var(--gold)';
    });
    document.querySelectorAll('.tarn-panel').forEach(panel => {
      panel.style.display = panel.id === 'tarn-' + tab + '-panel' ? 'block' : 'none';
    });
    if (tab === 'quests') this.renderQuestList();
    else this.renderTarnUpgrades();
    
    // Clear success message
    const successEl = this.$('tarnUpgradeSuccess');
    if (successEl) successEl.style.opacity = '0';
  }
  
  renderQuestList() {
    const container = this.$('tarn-quest-list');
    const quests = this.getAvailableQuests();
    
    if (!quests.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text);opacity:.7;padding:20px">No quests available for this sea.</p>';
      return;
    }
    
    const activeQuest = this.quests.activeQuest;
    const completed = this.quests.completedQuests || [];
    
    container.innerHTML = quests.map(q => {
      const isActive = activeQuest?.id === q.id;
      const isCompleted = completed.includes(q.id);
      const progress = this.quests.questProgress[q.id] || 0;
      
      let statusHtml = '';
      if (isActive) {
        statusHtml = '<div class="quest-progress"><div style="background:var(--gold);height:6px;border-radius:3px;width:' + Math.min(100, progress/q.target*100) + '%"></div><span>' + progress + '/' + q.target + '</span></div>';
      } else if (isCompleted) {
        statusHtml = '<span style="color:#6fdc8c;font-weight:700">✓ Completed</span>';
      } else {
        statusHtml = '<span style="opacity:.6">Available</span>';
      }
      
      return '\n        <div class="quest-item" style="background:var(--panel);border:2px solid ' + (isActive ? 'var(--gold)' : isCompleted ? '#6fdc8c' : 'transparent') + ';border-radius:10px;padding:12px;margin-bottom:8px;' + (isActive ? 'box-shadow:0 0 10px rgba(255,200,87,.3)' : '') + '">\n          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">\n            <span style="font-size:20px">' + q.icon + '</span>\n            ' + statusHtml + '\n          </div>\n          <div style="font:700 15px Fredoka,system-ui,sans-serif;color:var(--text);margin-bottom:4px">' + q.description + '</div>\n          <div style="font:500 12px Fredoka,system-ui,sans-serif;color:var(--gold)">Reward: ' + q.reward + ' gold</div>\n          ' + (isActive ? '\n            <button type="button" class="quest-action" data-quest-id="' + q.id + '" style="margin-top:8px;width:100%;font:700 14px Fredoka,system-ui,sans-serif;background:var(--panel);color:var(--text);border:2px solid var(--gold);border-radius:999px;padding:8px;cursor:pointer">\n              ' + (isCompleted ? 'Claim Reward' : 'In Progress') + '\n            </button>\n          ' : isCompleted ? '' : '\n            <button type="button" class="quest-action" data-quest-id="' + q.id + '" style="margin-top:8px;width:100%;font:700 14px Fredoka,system-ui,sans-serif;background:var(--gold);color:var(--ink);border:0;border-radius:999px;padding:8px;cursor:pointer">\n              Start Quest\n            </button>\n          ') + '\n        </div>\n      ';
    }).join('');
    
    // Bind quest action buttons
    container.querySelectorAll('.quest-action').forEach(btn => {
      btn.onclick = () => this.handleQuestAction(btn.dataset.questId);
    });
  }
  
  getAvailableQuests() {
    const allQuests = QUEST_LIST.filter(q => q.difficulty === this.st.diffKey);
    return allQuests;
  }
  
  handleQuestAction(questId) {
    const quest = QUEST_LIST.find(q => q.id === questId);
    if (!quest) return;
    
    const activeQuest = this.quests.activeQuest;
    const isActive = activeQuest?.id === questId;
    const completed = this.quests.completedQuests || [];
    const isCompleted = completed.includes(questId);
    
    if (isActive && isCompleted) {
      // Claim reward
      const reward = quest.reward;
      this.st.gold += reward;
      this.showQuestCompleteModal(quest, reward);
      this.quests.activeQuest = null;
      this.updQuestHUD();
      this.renderQuestList();
      this.updHud();
    } else if (!isActive && !isCompleted) {
      // Start new quest
      this.quests.activeQuest = { ...quest };
      this.quests.questProgress[questId] = 0;
      this.say('Old Tarn', "Ahoy! I've a task for ye: " + quest.description + " - complete it and the gold be yours!", 4000);
      this.updQuestHUD();
      this.renderQuestList();
    }
  }
  
  showQuestCompleteModal(quest, reward) {
    const modal = this.$('questCompleteModal');
    const textEl = this.$('questCompleteText');
    const rewardEl = this.$('questCompleteReward');
    if (!modal || !textEl || !rewardEl) return;
    
    textEl.textContent = 'You completed: ' + quest.description;
    rewardEl.textContent = 'Reward: ' + reward + ' Gold';
    
    modal.style.display = 'flex';
      modal.classList.add('pop-in');
    this.paused = true;
    
    const closeBtn = this.$('questCompleteClose');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
        this.paused = false;
        this.st.gold += reward;
        this.updHud();
        this.say('Old Tarn', 'Well done! Heres ' + reward + ' gold for completing the quest!', 3000);
      };
    }
  }
  
  renderTarnUpgrades() {
    this.$('tarnShopGold').textContent = 'Gold: ' + this.st.gold;
    const maxLevel = 8;
    ['cannon', 'hull', 'sail'].forEach(k => {
      const b = this.$('tarn_b_' + k);
      const cost = (30 + (k === 'hull' ? 10 : k === 'sail' ? 5 : 0)) * (this.st.up[k] + 1);
      if (this.st.up[k] >= maxLevel) {
        b.textContent = b.dataset.n + ' · MAX';
        b.disabled = true;
      } else {
        b.textContent = b.dataset.n + ' · Lv ' + this.st.up[k] + ' · ' + cost + ' gold';
        b.disabled = this.st.gold < cost;
      }
    });
  }

  
  // ===== Game Flow =====
  newRun() {
    window.__rerr = 0;
    window.__eb = 0;
    const banner = document.querySelector('[data-game-error]');
    if (banner) banner.remove();
    this.paused = false;
    this.$('pauseM').style.display = 'none';
    this.st.got = 0; this.st.time = 0; this.st.won = false; this.st.run = true;
    this.st.x = 0; this.st.z = 0; this.st.h = 0; this.st.sp = 0; this.st.lean = 0;
    this.st.tarnSeen = false; this.st.waveT = 0; this.st.splashT = 0;
    this.st.combo = 0;
    this.chests = spawnChests(this.scene, this.makeRNG(), this.islands, this.chests);
    
    // Add chests to glow layer
    if (this.glowLayer) {
      this.chests.forEach(c => {
        if (c.node && c.node.getChildMeshes) {
          c.node.getChildMeshes().forEach(m => this.glowLayer.addIncludedOnlyMesh(m));
        }
      });
    }
    
    this.resetCombat();
    if (this.hudScore) this.hudScore.text = `Treasure 0/${TOTAL_CHESTS}`;
    this.$('ov').style.display = 'none';
    this.canvas.focus();
    this.say('Captain Mara', `All hands — ${this.D.name}! Eight chests are out there.`, 3500);
  }
  
  win() {
    this.st.won = true; this.st.run = false;
    if (!this.st.bestTime || this.st.time < this.st.bestTime) { this.st.bestTime = this.st.time; saveGame(this.st); }
    this.$('ttl').textContent = 'Sea cleared';
    this.$('msg').textContent = `All 8 chests aboard in ${this.fmt(this.st.time)}. Best: ${this.fmt(this.st.bestTime)}. The next chests are already glowing out there.`;
    this.$('go').textContent = 'Sail again';
    this.$('ov').style.display = 'flex';
  }
  
  sunk() {
    this.st.run = false;
    this.$('ttl').textContent = 'Ship sunk';
    this.$('msg').textContent = `The raiders sank you with ${this.st.got} of ${TOTAL_CHESTS} chests aboard on ${this.D.name}. Pick a sea and try again.`;
    this.$('go').textContent = 'Try again';
    this.$('ov').style.display = 'flex';
  }
  
  resetCombat() {
    this.st.hp = this.st.hpMax;
    this.tradeOpen = false;
    this.$('shop').style.display = 'none';
    this.st.kills = 0;
    this.lockT = null;
    (this.enemies || []).forEach(e => {
      e._pendingShots = [];
      if (e.boss) { e.dead = 1e9; e.next = this.D.bossNext; e.n.setEnabled(false); }
      else placeEnemy(e, this.st, this.islands, this.D);
    });
    (this.balls || []).forEach(b => { b.on = false; b.m.setEnabled(false); });
    (this.booms || []).forEach(b => { b.l = 0; b.m.setEnabled(false); });
    this.updHud();
  }
  
  setDifficulty(key) {
    if (!DIFFICULTY[key] || key === this.st.diffKey) return;
    const mid = this.st.run && !this.st.won;
    this.st.diffKey = key; this.D = DIFFICULTY[key];
    this.syncModes(); saveGame(this.st);
    if (mid) {
      this.$('diffWarn').style.display = 'block';
      this.say('Captain Mara', `Sea shifted to ${this.D.name}. You may need to restart this voyage.`, 3400);
    }
  }
  
  openPause() {
    if (this.tradeOpen || this.$('ov').style.display === 'flex') return;
    this.paused = true;
    this.$('diffWarn').style.display = 'none';
    this.syncMute(); this.syncModes();
    this.$('pauseM').style.display = 'flex';
  }
  
  closePause() {
    this.paused = false;
    this.$('pauseM').style.display = 'none';
    this.canvas.focus();
  }
  
  openShop() {
    this.tradeOpen = true;
    this.renderShop();
    this.$('shop').style.display = 'flex';
  }
  
  closeShop() {
    this.tradeOpen = false;
    this.$('shop').style.display = 'none';
  }
  
  renderShop() {
    ['cannon', 'hull', 'sail'].forEach(k => {
      const b = this.$('b_' + k);
      const cost = (30 + (k === 'hull' ? 10 : k === 'sail' ? 5 : 0)) * (this.st.up[k] + 1);
      b.textContent = `${b.dataset.n} · Lv ${this.st.up[k]} · ${cost} gold`;
      b.disabled = this.st.gold < cost || this.st.up[k] >= 4;
    });
    this.$('shopGold').textContent = `Gold: ${this.st.gold}`;
  }
  
  buyUpgrade(k) {
    const cost = (30 + (k === 'hull' ? 10 : k === 'sail' ? 5 : 0)) * (this.st.up[k] + 1);
    if (this.st.gold < cost) return;

    // Instant feedback: disable button + loading state
    const btn = this.$('tarn_b_' + k);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Upgrading...';
      btn.style.opacity = '0.7';
    }

    this.st.gold -= cost; this.st.up[k]++;
    if (k === 'hull') { this.st.hpMax += 2; this.st.hp = this.st.hpMax; }
    if (k === 'sail') this.st.spd = 1 + 0.12 * this.st.up.sail;

    // Re-render shop immediately
    this.updHud();
    this.renderShop();
    this.renderTarnUpgrades();
    playSfx('buy');
    saveGame(this.st);

    // Show success feedback
    const upgradeNames = { cannon: 'Cannons', hull: 'Hull', sail: 'Sails' };
    this.say('Old Tarn', upgradeNames[k] + ' upgraded to Lv ' + this.st.up[k] + '!', 2000);
    
    // Show success in Tarn modal if open
    const successEl = this.$('tarnUpgradeSuccess');
    if (successEl) {
      successEl.textContent = '✓ ' + upgradeNames[k] + ' upgraded to Lv ' + this.st.up[k] + '!';
      successEl.style.opacity = '1';
      setTimeout(() => { successEl.style.opacity = '0'; }, 2000);
    }

    // Re-enable button after short delay - recalculate with NEW cost
    const newCost = (30 + (k === 'hull' ? 10 : k === 'sail' ? 5 : 0)) * (this.st.up[k] + 1);
    const maxLevel = 8;
    if (btn) {
      setTimeout(() => {
        btn.disabled = this.st.gold < newCost || this.st.up[k] >= maxLevel;
        if (this.st.up[k] >= maxLevel) {
          btn.textContent = btn.dataset.n + ' · MAX';
        } else {
          btn.textContent = btn.dataset.n + ' · Lv ' + this.st.up[k] + ' · ' + newCost + ' gold';
        }
        btn.style.opacity = '1';
      }, 600);
    }
  }
  
  // ===== Main Update =====
  update(dt, t) {
    this.st.dt = dt;
    this.st.shipY = wave(this.st.x, this.st.z, t);
    
    // Water
    updateWater(this.sea, this.seaMat, this.seaPositions, this.seaBasePositions, 
      this.seaIndices, this.seaNormals, this.CELL, this.camera, this.st.x, this.st.z, t);
    
    // Input & Motion
    this.handleInput(dt);
    this.updateShipMotion(dt);
    const wy = wave(this.st.x, this.st.z, t);
    this.updateCamera(dt, t, wy);
    
    // Effects
    const splash = updateSplashes(this.splashes, this.st, dt, t, wave, this.splashI);
    this.splashI = splash.nextI; this.st.splashT = splash.splashT;
    this.vwakeI = updateVWake(this.vwake, this.st, dt, t, wave, this.vwakeI);
    updateSplinters(this.splinters, dt);
    updateFirePuffs(this.firePuffs, dt);
    
    // Island foam
    updateIslandFoam(this.islands, t, wave);
    
    // Forward vector (Pip + motion helpers)
    this.st.fx = Math.sin(this.st.h);
    this.st.fz = Math.cos(this.st.h);

    // Characters
    updateCharacters(this.captain, this.pip, this.tarn, this.st.x, this.st.z, this.st.h, wave, t, this.st, (who, text, ms) => this.say(who, text, ms), () => {
      if (!this.quests.activeQuest) this.startQuest();
    });
    
    // Tarn encounter check
    this.checkTarnEncounter();
    
    // Treasure
    const chest = updateChests(this.chests, this.st, wave, t, dt,
      (who, text, ms) => this.say(who, text, ms),
      (name) => playSfx(name),
      () => this.updHud(),
      () => saveGame(this.st),
      () => this.win(),
      (got) => { if (this.hudScore) this.hudScore.text = `Treasure ${got}/${TOTAL_CHESTS}`; },
      (type, amount) => {
        const result = updateQuestProgress(this.quests, type, amount);
        if (result === 'completed') {
          const reward = this.quests.activeQuest.reward;
          this.showQuestCompleteModal(this.quests.activeQuest, reward);
          this.quests.activeQuest = null;
          this.updQuestHUD();
        }
        this.updQuestHUD();
      },
      (x, y, z) => spawnSparkles(this.sparkleSystem, x, y, z)
    );
    
    if (chest.near && this.st.run) {
      const rel = Math.atan2(chest.near.x - this.st.x, chest.near.z - this.st.z) - this.st.h;
      this.$('arrow').style.transform = `rotate(${rel * 180 / Math.PI}deg)`;
      this.$('dist').textContent = `${Math.round(chest.nd)} m`;
    } else {
      this.$('dist').textContent = '–';
    }
    
    if (this.st.run && !this.st.won) { this.st.time += dt; if (this.hudTime) this.hudTime.text = this.fmt(this.st.time); }
    
    // Day/Night
    this.updateDayNight(t);
    
    // Adaptive quality
    this.adaptQuality(dt);
  }
  
  handleInput(dt) {
    let steer = 0, target = 0, rate = 0.8;
    
    if (this.st.run) {
      if (this.keys.KeyA || this.keys.ArrowLeft || this.held.left) steer -= 1;
      if (this.keys.KeyD || this.keys.ArrowRight || this.held.right) steer += 1;
      if (this.keys.KeyW || this.keys.ArrowUp || this.held.sail) { target = 8 * this.st.spd; rate = 1.2; }
      if (this.keys.Space || this.held.boost) { target = 15 * this.st.spd; rate = 1.5; }
      if (this.keys.KeyS || this.keys.ArrowDown) { target = 0; rate = 3; }
      if (this.keys.KeyQ) { this.orb.yaw -= dt * 1.6; this.orb.idle = 0; }
      if (this.keys.KeyE) { this.orb.yaw += dt * 1.6; this.orb.idle = 0; }
      if (this.keys.KeyL && !this.keys._lPressed) { 
        this.keys._lPressed = true;
        this.lockCam = !this.lockCam;
        this.say('Camera', this.lockCam ? 'Target lock ON' : 'Target lock off', 1400);
      } else if (!this.keys.KeyL) { this.keys._lPressed = false; }
      if (this.keys.KeyF || this.held.fire) {
        const fired = tryFire(this.st, this.scene, this.balls, this.ballMat,
          this.lockCam, this.lockT, this.D, this.fireCd, this.st.up, playSfx, this.st.waveT,
          (x, y, z) => spawnSmoke(this.smokeSystem, x, y, z));
        this.fireCd = fired.fireCd;
        if (fired.waveT != null) this.st.waveT = Math.max(this.st.waveT, fired.waveT);
      }
    }
    
    this.st.sp += (target - this.st.sp) * Math.min(1, dt * rate);
    if (target === 0 && this.st.sp < 0.1) this.st.sp = 0;
    this.st.h += steer * dt * 1.15 * (0.4 + this.st.sp / 14 * 0.6);
    this.st.lean += (steer - this.st.lean) * Math.min(1, dt * 4);
    this.st.x += Math.sin(this.st.h) * this.st.sp * dt;
    this.st.z += Math.cos(this.st.h) * this.st.sp * dt;
    
    // Island collision
    for (const i of this.islands) {
      const dx = this.st.x - i.x, dz = this.st.z - i.z, d = Math.hypot(dx, dz), lim = i.r * 0.95 + 1.6;
      if (d < lim) { this.st.x = i.x + dx / d * lim; this.st.z = i.z + dz / d * lim; this.st.sp *= 0.6; }
    }
  }
  
  updateShipMotion(dt) {
    const wy = wave(this.st.x, this.st.z, this.T);
    this.ship.position.set(this.st.x, wy + 0.1, this.st.z);
    this.ship.rotation.y = this.st.h;
    updateShipBuoyancy(this.shipBody, this.st.x, this.st.z, this.st.h, wave, this.T, dt, this.st.lean, this.st.sp);
  }
  
  updateCamera(dt, t, wy) {
    const fx = Math.sin(this.st.h), fz = Math.cos(this.st.h);
    this.orb.idle += dt;
    this.orb.yaw = Math.atan2(Math.sin(this.orb.yaw), Math.cos(this.orb.yaw));
    
    const lk = this.lockCam && this.lockT && this.st.run && this.orb.idle > 1.2;
    if (lk) {
      const w = Math.atan2(this.lockT.x - this.st.x, this.lockT.z - this.st.z) - this.orb.h;
      const dy = Math.atan2(Math.sin(w - this.orb.yaw), Math.cos(w - this.orb.yaw));
      this.orb.yaw += dy * (1 - Math.exp(-dt * 4));
      this.orb.pitch += (0.38 - this.orb.pitch) * (1 - Math.exp(-dt * 2));
    } else if (this.orb.idle > 3.5) {
      const r = 1 - Math.exp(-dt * 1.4);
      this.orb.yaw -= this.orb.yaw * r;
      this.orb.pitch += (0.42 - this.orb.pitch) * r;
    }
    this.orb.lk += ((lk ? 1 : 0) - this.orb.lk) * (1 - Math.exp(-dt * 3));
    this.orb.h += Math.atan2(Math.sin(this.st.h - this.orb.h), Math.cos(this.st.h - this.orb.h)) * (1 - Math.exp(-dt * 3));
    this.orb.y += (wy - this.orb.y) * (1 - Math.exp(-dt * 3));
    
    const ca = this.orb.h + this.orb.yaw;
    const hz = this.orb.dist * Math.cos(this.orb.pitch);
    this.camera.position.set(this.st.x - Math.sin(ca) * hz, this.orb.y + 2.2 + this.orb.dist * Math.sin(this.orb.pitch), this.st.z - Math.cos(ca) * hz);
    
    if (this.lockT) { this.orb.la = Math.atan2(this.lockT.x - this.st.x, this.lockT.z - this.st.z); this.orb.dd = Math.min(Math.hypot(this.lockT.x - this.st.x, this.lockT.z - this.st.z), 45); }
    const ld = (this.lockT ? this.orb.dd : 0) * 0.42 * this.orb.lk;
    this.camera.setTarget(new BABYLON.Vector3(this.st.x + Math.sin(this.orb.la || this.st.h) * ld, this.orb.y + 2.4, this.st.z + Math.cos(this.orb.la || this.st.h) * ld));
    
    // Tarn compass strip
    this.updateTarnStrip();
  }
  
  updateTarnStrip() {
    const strip = this.$('strip');
    const stripT = this.$('stripT');
    const stripD = this.$('stripD');
    const tdist = Math.hypot(this.tarnX - this.st.x, this.tarnZ - this.st.z);
    
    if (!this.st.run || this.tradeOpen) { strip.style.display = 'none'; return; }
    strip.style.display = 'block';
    
    const fw = this.camera.getTarget().subtract(this.camera.position);
    const camYaw = Math.atan2(fw.x, fw.z);
    const want = Math.atan2(this.tarnX - this.st.x, this.tarnZ - this.st.z);
    let rel = Math.atan2(Math.sin(want - camYaw), Math.cos(want - camYaw));
    const half = 1.05;
    const u = Math.max(0, Math.min(1, 0.5 + rel / (2 * half)));
    stripT.style.left = `${u * 100}%`;
    stripD.textContent = tdist < 38 ? 'Trade (T)' : `${Math.round(tdist)} m`;
    stripT.classList.toggle('near', tdist < 38);
  }
  
  updateDayNight(t) {
    const d = this.dev?.d >= 0 ? this.dev.d : Math.max(0, Math.min(1, 0.5 + 0.8 * Math.sin(t * 0.042 + 1.2)));
    const du = 1 - Math.abs(2 * d - 1);
    const tmpC = new BABYLON.Color3();
    const night = BABYLON.Color3.FromHexString('#0b1a33');
    const dusk = BABYLON.Color3.FromHexString('#f2a36b');
    BABYLON.Color3.LerpToRef(night, this.skyColor, d, tmpC);
    BABYLON.Color3.LerpToRef(tmpC, dusk, du * 0.45, tmpC);
    this.scene.clearColor.set(tmpC.r, tmpC.g, tmpC.b, 1);
    this.scene.fogColor.copyFrom(tmpC);
    this.seaMat.setColor3('fogCol', tmpC);
    this.hemi.intensity = 0.3 + 0.7 * d;
    this.sun.intensity = 0.1 + 0.45 * d;
    this.seaMat.setFloat('dayK', d);
    this.dayK = d; // Track day/night for glow reduction
    this.beamMat.alpha = 0.3 + 0.2 * (1 - d); // Reduced night alpha from 0.8 to 0.5
    
    // Reduce glow intensity - much weaker overall
    if (this.glowLayer) {
      // Very subtle glow: 0.1 at night, 0.15 at day
      const glowIntensity = 0.1 + 0.05 * d;
      this.glowLayer.intensity = glowIntensity;
    }
    
    this.chests.forEach(c => {
      const mats = c.node.getChildMeshes(false).map(m => m.material).filter(Boolean);
      mats.forEach(m => { if (m.disableLighting && m.alpha != null) m.alpha = this.beamMat.alpha; });
    });
    this.lamp.intensity = 1.4 * (1 - d);
  }
  
  adaptQuality(dt) {
    this.fpsT = (this.fpsT || 0) + dt;
    if (this.fpsT < 2.5) return;
    this.fpsT = 0;
    const f = this.engine.getFps();
    const l = this.engine.getHardwareScalingLevel();
    const mobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
    const scMin = mobile ? Math.max(l, 0.67) : l;
    const scMax = Math.max(1.6, scMin * 2.2);
    if (f < 38 && l < scMax) this.engine.setHardwareScalingLevel(Math.min(scMax, l + 0.25));
    else if (f > 57 && l > scMin) this.engine.setHardwareScalingLevel(Math.max(scMin, l - 0.25));
  }
  
  extra(dt, t) {
    this.updateDayNight(t);
    this.adaptQuality(dt);
    this.fireCd -= dt;
    
    // Enemies (only while sailing — they are placed in resetCombat/newRun)
    if (this.st.run && this.enemies.length) {
      updateEnemies(this.enemies, this.st, this.islands, this.D, dt, t, this.st.kills,
        (booms, scene, mat, x, y, z) => boom(booms, scene, mat, x, y, z),
        playSfx,
        (who, text, ms) => this.say(who, text, ms),
        () => this.updHud(),
        () => saveGame(this.st)
      );

      // Fire pending enemy shots
      this.enemies.forEach(e => {
        if (!e._pendingShots || !e._pendingShots.length) return;
        e._pendingShots.forEach(s => {
          shoot(this.balls, this.scene, this.ballMat, s.x, s.y, s.z, s.tx, s.tz, false);
        });
        e._pendingShots.length = 0;
      });
    }
    
    // Projectiles
    if (this.balls) {
      updateProjectiles(this.balls, this.booms, this.st, this.enemies, dt, t, wave,
        (booms, scene, mat, x, y, z) => boom(this.booms, this.scene, this.boomMat, x, y, z),
        playSfx,
        sfxHitEnemy,
        sfxHitPlayer,
        () => this.updHud(),
        (who, text, ms) => this.say(who, text, ms),
        () => this.sunk(),
        () => saveGame(this.st),
        (x, y, z, dir) => spawnSplinters(this.splinters, x, y, z, dir),
        (x, y, z) => spawnFire(this.firePuffs, x, y, z),
        this.dev,
        (x, y, z, text, color) => spawnDamageNumber(this.damageNumbers, x, y, z, text, color),
        this.gameFeel
      );
    }
    
    // Screen flash on damage
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const flash = this.$('screenFlash');
      if (flash) {
        flash.style.display = 'block';
        flash.style.opacity = Math.max(0, this.flashTimer / 0.3);
      }
    } else {
      const flash = this.$('screenFlash');
      if (flash) flash.style.display = 'none';
    }

    // Flash on damage
    if (this.st.hp < this.lastHp) {
      this.flashTimer = 0.3;
    }
    this.lastHp = this.st.hp;

    // Trade prompt
    const near = Math.hypot(this.tarnX - this.st.x, this.tarnZ - this.st.z) < 38;
    this.$('trade').style.display = near && this.st.run && !this.tradeOpen ? 'block' : 'none';
    
    // HUD 3D
    // Damage numbers
    if (this.damageNumbers) updateDamageNumbers(this.damageNumbers, dt);
    
    // Cannon smoke
    if (this.smokeSystem) updateSmoke(this.smokeSystem, dt);
    
    // Treasure sparkles
    if (this.sparkleSystem) updateSparkles(this.sparkleSystem, dt);
    
    this.hud3d();
  }
  
  hud3d() {
    const scr = (x, y, z) => {
      const f = this.camera.getTarget().subtract(this.camera.position);
      if (BABYLON.Vector3.Dot(f, new BABYLON.Vector3(x - this.camera.position.x, y - this.camera.position.y, z - this.camera.position.z)) <= 0) return null;
      const vp = this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight());
      const p = BABYLON.Vector3.Project(new BABYLON.Vector3(x, y, z), BABYLON.Matrix.Identity(), this.scene.getTransformMatrix(), vp);
      const k = this.canvas.clientWidth / this.engine.getRenderWidth();
      return { x: p.x * k, y: p.y * k };
    };
    
    const put = (el, p) => { if (!p) { el.style.display = 'none'; return; } el.style.display = 'block'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; };
    
    // Player HP bar
    put(this.$('meBar'), this.st.run ? scr(this.st.x, this.ship.position.y + 7.4, this.st.z) : null);
    this.$('meBar').firstChild.style.width = Math.max(0, this.st.hp / this.st.hpMax * 100) + '%';
    this.$('meBar').lastChild.textContent = `Hull ${this.st.hp}/${this.st.hpMax}`;
    
    // Enemy HP bars & lock crosshair
    let tgt = null, bd = 60;
    (this.enemies || []).forEach(e => {
      if (e.x == null || e.z == null) return;
      if (!e.bar) {
        e.bar = document.createElement('div');
        e.bar.className = 'hpb' + (e.boss ? ' boss' : '');
        e.bar.innerHTML = '<i></i>' + (e.boss ? '<b>Iron Warden</b>' : '');
        this.$('bars').appendChild(e.bar);
      }
      const d = Math.hypot(e.x - this.st.x, e.z - this.st.z);
      put(e.bar, !e.dead && this.st.run && d < 130 ? scr(e.x, e.n.position.y + (e.boss ? 14 : 7.2), e.z) : null);
      e.bar.firstChild.style.width = Math.max(0, e.hp / (e.max || 3) * 100) + '%';
      if (!e.dead && d < bd) { bd = d; tgt = e; }
    });
    put(this.$('xh'), this.st.run && tgt ? scr(tgt.x, tgt.n.position.y + (tgt.boss ? 4.5 : 2.4), tgt.z) : null);
    this.lockT = this.st.run ? tgt : null;
    
    // Glow locked enemy
    if (this.glowLayer && this.lockT && this.lockT.n) {
      if (this.lockT.n.getChildMeshes) {
        this.lockT.n.getChildMeshes().forEach(m => this.glowLayer.addIncludedOnlyMesh(m));
      }
    }
  }
  
  // ===== Render Loop =====
  runRenderLoop() {
    this.T = 0;
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      try {
        if (!this.paused) { this.T += dt; this.update(dt, this.T); this.extra(dt, this.T); this.gameFeel.update(dt, this.T, this.camera, this.engine.getDeltaTime() / 1000); }
        else { this.updateDayNight(this.T); this.hud3d(); }
        this.scene.render();
      } catch (err) { if (!window.__rerr) { window.__rerr = 1; console.error(err); window.dispatchEvent(new ErrorEvent('error', { message: err.message, error: err })); } }
    });
    addEventListener('resize', () => this.engine.resize());
  }
  
  // Dev cheat menu
  initDev() {
    const dev = this.dev;
    const act = {
      god: b => { dev.god = !dev.god; b.textContent = `God mode: ${dev.god ? 'ON' : 'off'}`; },
      gold: () => { this.st.gold += 100; this.updHud(); },
      heal: () => { this.st.hp = this.st.hpMax; this.updHud(); },
      sink: () => { this.enemies.forEach(e => { if (!e.dead) { e.dead = 25; this.st.kills++; } }); this.updHud(); },
      tp: () => { let c = null, bd = 1e9; (this.chests || []).forEach(q => { const d = Math.hypot(q.x - this.st.x, q.z - this.st.z); if (d < bd) { bd = d; c = q; } }); if (c) { this.st.x = c.x - 12; this.st.z = c.z - 12; } },
      day: () => { dev.d = 1; }, night: () => { dev.d = 0; }, auto: () => { dev.d = -1; },
      tpt: () => { this.st.x = this.tarnX - this.islands[0].r - 8; this.st.z = this.tarnZ - this.islands[0].r - 8; },
      reset: () => { resetSave(); this.st.gold = 0; this.st.up = { cannon: 0, hull: 0, sail: 0 }; this.st.hpMax = 5; this.st.spd = 1; this.st.bestTime = 0; this.resetCombat(); },
      fast: b => { dev.fast = !dev.fast; this.st.spd = dev.fast ? 3 : 1 + 0.12 * this.st.up.sail; b.textContent = `Turbo: ${dev.fast ? 'ON' : 'off'}`; }
    };
    if (/[?&]dev(=|&|$)/.test(location.search) || !/(netlify|vercel)\.app$/.test(location.hostname)) this.$('dev').style.display = 'flex';
    document.querySelectorAll('#devP button').forEach(b => { b.onclick = () => { act[b.dataset.a](b); b.blur(); } });
    this.$('devT').onclick = e => { const p = this.$('devP'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; e.target.blur(); };
  }
}