// Driftwake - Procedural Audio System

let AC = null;
let master = null;
let muted = false;
let oceanSource = null;

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = muted ? 0 : 0.42;
    master.connect(AC.destination);
    
    // Ocean ambience - soft noise bed
    const nb = AC.createBuffer(1, AC.sampleRate * 3, AC.sampleRate);
    const data = nb.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    
    const src = AC.createBufferSource();
    const lp = AC.createBiquadFilter();
    const hp = AC.createBiquadFilter();
    const gain = AC.createGain();
    
    src.buffer = nb; src.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = 220;
    hp.type = 'highpass'; hp.frequency.value = 40;
    gain.gain.value = 0.028;
    
    src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(master);
    src.start();
    
    oceanSource = src;
  } catch (e) {
    AC = null;
  }
}

export function resumeAudio() {
  if (AC && AC.state === 'suspended') AC.resume();
}

function tone(freq, dur, type, vol, freqEnd) {
  if (!AC || AC.state !== 'running') return;
  const osc = AC.createOscillator(), gain = AC.createGain(), now = AC.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain); gain.connect(master);
  osc.start(); osc.stop(now + dur + 0.02);
}

function noise(dur, vol, lpFreq, hpFreq = 0) {
  if (!AC || AC.state !== 'running') return;
  const len = Math.max(1, AC.sampleRate * dur | 0);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  
  const src = AC.createBufferSource(), lp = AC.createBiquadFilter(), gain = AC.createGain(), now = AC.currentTime;
  src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = lpFreq;
  
  if (hpFreq) {
    const hp = AC.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = hpFreq;
    src.connect(hp); hp.connect(lp);
  } else src.connect(lp);
  
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  lp.connect(gain); gain.connect(master);
  src.start();
}

export const SFX = {
  cannon: () => {
    noise(0.05, 0.85, 6000, 800);
    noise(0.45, 0.55, 500);
    tone(48, 0.55, 'sine', 0.55, 22);
    tone(90, 0.18, 'triangle', 0.2, 40);
  },
  boom: () => {
    noise(0.7, 0.75, 350);
    noise(0.25, 0.5, 1200, 200);
    tone(36, 0.8, 'sine', 0.65, 18);
  },
  hit: () => {
    noise(0.2, 0.55, 1400, 180);
    tone(70, 0.22, 'sine', 0.35, 30);
    noise(0.12, 0.35, 500);
  },
  splash: () => {
    noise(0.35, 0.28, 2400, 400);
    noise(0.5, 0.18, 900);
  },
  coin: () => {
    noise(0.04, 0.25, 8000, 2500);
    setTimeout(() => noise(0.05, 0.2, 7000, 2000), 55);
  },
  buy: () => {
    noise(0.06, 0.22, 5000, 1500);
    setTimeout(() => noise(0.08, 0.18, 4000, 1200), 70);
  },
};

export function playSfx(name) {
  if (AC && !muted && AC.state === 'running' && SFX[name]) SFX[name]();
}

export function sfxHitEnemy() {
  if (!AC || muted || AC.state !== 'running') return;
  noise(0.15, 0.6, 1800, 200);
  tone(120, 0.18, 'sine', 0.4, 40);
  noise(0.1, 0.4, 800);
}

export function sfxHitPlayer() {
  if (!AC || muted || AC.state !== 'running') return;
  noise(0.25, 0.7, 1000, 150);
  tone(60, 0.25, 'sine', 0.5, 25);
  noise(0.15, 0.5, 400);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() { return muted; }
export function setMuted(m) { muted = m; if (master) master.gain.value = muted ? 0 : 0.5; }