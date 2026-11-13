// Driftwake - Save/Load System

import { STORAGE_KEY } from './config.js';

export function saveGame(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      gold: state.gold | 0,
      up: state.up || {},
      best: state.bestTime || 0,
      diff: state.diffKey || 'storm'
    }));
  } catch (e) {}
}

export function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (s) return {
      gold: s.gold | 0,
      up: s.up || {},
      bestTime: s.best || 0,
      diffKey: s.diff || 'storm'
    };
  } catch (e) {}
  return null;
}

export function resetSave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}