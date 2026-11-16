// Driftwake - Configuration Constants

export const GAME_CONFIG = {
  SEA_SIZE: 160,
  SEA_DIVISIONS: 56,
  TOTAL_CHESTS: 8,
  ISLAND_COUNT: 10,
  INITIAL_RAIDERS: 3,
  MAX_RAIDER_HP: 3,
  BOSS_HP: 12,
  PLAYER_MAX_HP: 5,
  PLAYER_BASE_SPEED: 8,
  BOOST_SPEED: 15,
};

export const DIFFICULTY = {
  soft: {
    name: 'Soft Tide',
    autoAim: true,
    aggro: 78,
    ideal: 34,
    chase: 5.2,
    orbit: 2.4,
    turn: 0.55,
    fire: 3.8,
    spread: 11,
    lead: 0.55,
    bossNext: 4,
    bossTurn: 0.55,
    bossChase: 0.55,
    bossFire: 1.05,
    bossShots: 3,
  },
  storm: {
    name: 'Storm Wake',
    autoAim: true,
    aggro: 110,
    ideal: 30,
    chase: 7.0,
    orbit: 3.2,
    turn: 1.05,
    fire: 2.6,
    spread: 4.5,
    lead: 0.95,
    bossNext: 3,
    bossTurn: 0.9,
    bossChase: 0.9,
    bossFire: 0.7,
    bossShots: 3,
  },
  dread: {
    name: 'Dreadwake',
    autoAim: false,
    aggro: 165,
    ideal: 22,
    chase: 9.5,
    orbit: 5.2,
    turn: 1.65,
    fire: 1.15,
    spread: 16,
    lead: 0,
    bossNext: 1,
    bossTurn: 1.55,
    bossChase: 1.35,
    bossFire: 0.32,
    bossShots: 5,
  },
};

export const UPGRADE_COSTS = { cannon: 30, hull: 40, sail: 35 };
export const UPGRADE_MAX_LEVEL = 8;

export const STORAGE_KEY = 'driftwake_v1';

export const COLORS = {
  water: { deep: '#012240', mid: '#074565', shallow: '#206080' },
  ship: { wood: '#7b4a2b', deck: '#c99a63', cloth: '#f5e9c8', red: '#e4572e', gold: '#ffc857' },
  enemy: { hull: '#3a2a2a', dark: '#1d1d26', sail: '#a3202e' },
  ui: { gold: '#ffc857', coral: '#e4572e', text: '#f7ebc6', ink: '#0b2a35', panel: 'rgba(11,42,53,.68)' },
  particles: { splash: '#b8e4f0', foam: '#ffffff', vwake: '#ffffff', splinter: '#7b4a2b', fire: { emissive: '#ff4400', diffuse: '#ff8800' } },
};

export const CAPTAIN_LINES = [
  'Fine haul!', 'That one is ours!', 'Pip, did you see that?', 'Gold, gold, gold!',
  'Steady as she goes.', 'Another one for the hold!', 'Almost there!',
];