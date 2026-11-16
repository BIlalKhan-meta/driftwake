# 🏴‍☠️ Driftwake - Development Roadmap

## Current State
- **Game**: Driftwake - Babylon.js pirate sailing prototype
- **Tech Stack**: Single-page HTML + Babylon.js 7.30.0 CDN + ES6 modules
- **Location**: `/Users/rehan/workspace/driftwake`
- **Live**: https://driftwake.netlify.app

## Progress Tracking
- [ ] Phase 1: Visual Polish
- [ ] Phase 2: UI/UX Overhaul
- [ ] Phase 3: Game Feel & Juice
- [ ] Phase 4: Lightweight Decorative Effects
- [ ] Phase 5: Advanced Features

---

## Phase 1: Visual Polish (Week 1-2)

**Goal**: Make the game look professional with PBR materials, post-processing, and particles

### Task 1.1: PBR Ship Materials
- [ ] Replace basic StandardMaterial with PBRMaterial for ship hull
- [ ] Add wood material for ship body
- [ ] Add cloth material for sails
- [ ] Add metal material for cannons
- [ ] Set proper metallic/roughness values

**Files**: `src/ship.js`, `src/engine.js`

### Task 1.2: Post-Processing Pipeline
- [ ] Add DefaultRenderingPipeline with bloom enabled
- [ ] Configure bloom threshold and weight for treasure glow
- [ ] Add color grading for day/night cycle enhancement
- [ ] Enable FXAA for smoother edges

**Files**: `src/game.js`, `src/engine.js`

### Task 1.3: Particle Systems
- [ ] Cannon smoke puffs on fire
- [ ] Water splash particles when ship moves
- [ ] Treasure sparkle particles when collecting chests
- [ ] Explosion particles on enemy destruction

**Files**: `src/effects.js`, `src/combat.js`

### Task 1.4: Improved Shadows
- [ ] Upgrade to exponential shadow maps
- [ ] Add shadow cascades for distant objects
- [ ] Configure shadow darkness and blur

**Files**: `src/engine.js`

### Task 1.5: Glow Effects
- [ ] Add GlowLayer for treasure chests
- [ ] Add glow on UI buttons when hovered
- [ ] Add glow on locked enemies

**Files**: `src/game.js`, `index.html`

---

## Phase 2: UI/UX Overhaul (Week 3-4)

**Goal**: Premium, modern interface with glassmorphism and Babylon.js GUI

### Task 2.1: Babylon.js GUI Integration
- [ ] Replace HTML pill UI with AdvancedDynamicTexture GUI
- [ ] Create in-scene HUD (health, gold, treasure count)
- [ ] Create quest tracker panel
- [ ] Create difficulty selector in GUI

**Files**: `index.html`, `src/game.js`

### Task 2.2: Glassmorphism Panels
- [ ] Frosted glass effect for shop/pause menus
- [ ] Semi-transparent backgrounds with backdrop blur
- [ ] Glass buttons with hover states
- [ ] Glass panels for inventory and quests

**Files**: `index.html`, `src/game.js`

### Task 2.3: Micro-Interactions
- [ ] Button hover scale (1.05x)
- [ ] Smooth transitions (200-300ms)
- [ ] Haptic-style feedback on clicks
- [ ] Cursor transformations for interactive elements

**Files**: `index.html`, `src/game.js`

### Task 2.4: Fluid Typography
- [ ] Use clamp() for responsive font sizes
- [ ] Modern font pairing (Fredoka + system-ui)
- [ ] Readable contrast ratios (WCAG AAA)

**Files**: `index.html`

### Task 2.5: OKLCH Color System
- [ ] Define primary, accent, neutral colors in OKLCH
- [ ] Ensure 7:1 contrast ratio for text
- [ ] Dark mode support

**Files**: `index.html`

---

## Phase 3: Game Feel & Juice (Week 5-6)

**Goal**: Make every action feel impactful and satisfying

### Task 3.1: Screen Shake System
- [ ] Trauma-based screen shake
- [ ] Shake on cannon hits
- [ ] Shake on explosions
- [ ] Shake intensity based on damage

**Files**: `src/gamefeel.js`, `src/combat.js`

### Task 3.2: Hit-Stop / Freeze Frames
- [ ] Brief freeze on cannon impact
- [ ] Freeze duration based on hit power
- [ ] Visual flash on impact

**Files**: `src/combat.js`, `src/gamefeel.js`

### Task 3.3: Squash & Stretch
- [ ] Ship buoyancy exaggeration on waves
- [ ] Ship lean on sharp turns
- [ ] Ship bounce on island collision

**Files**: `src/ship.js`, `src/game.js`

### Task 3.4: Juicy UI
- [ ] Pop animations on buttons
- [ ] Bounce effects on notifications
- [ ] Smooth slide-in/out for panels
- [ ] Particle bursts on achievements

**Files**: `index.html`, `src/game.js`

### Task 3.5: Screen Effects
- [ ] Vignette on low health
- [ ] Chromatic aberration on damage
- [ ] Screen flash on taking hit
- [ ] Color shift on day/night transition

**Files**: `src/game.js`, `src/water.js`

---

## Phase 4: Lightweight Decorative Effects (Week 7)

**Goal**: Add visual flair without heavy frameworks

### Task 4.1: Vanta.js Background
- [ ] Ocean wave background for main menu
- [ ] Subtle water movement on loading screens
- [ ] Interactive mouse response

**Files**: `index.html`

### Task 4.2: Vanilla-Tilt UI
- [ ] Parallax tilt on shop cards
- [ ] Parallax tilt on quest cards
- [ ] Mouse-responsive UI elements

**Files**: `index.html`

### Task 4.3: Zdog Illustrations
- [ ] Decorative icons for skills/menu
- [ ] Small vector animations for UI
- [ ] Pirate-themed illustrations

**Files**: `index.html`

---

## Phase 5: Advanced Features (Week 8+)

**Goal**: Transform prototype into full game

### Task 5.1: GLTF Ship Models
- [ ] Replace box ships with real 3D models
- [ ] Add ship animations (sail movement, cannon recoil)
- [ ] Add multiple ship types

**Files**: `src/ship.js`

### Task 5.2: Havok Physics
- [ ] Realistic boat physics
- [ ] Collision detection with islands
- [ ] Water interaction physics

**Files**: `src/engine.js`, `src/ship.js`

### Task 5.3: Dynamic Shadow Maps
- [ ] Shadows from ships on water
- [ ] Shadows from islands
- [ ] Time-of-day shadow direction

**Files**: `src/engine.js`, `src/water.js`

### Task 5.4: LOD System
- [ ] Level of detail for distant islands
- [ ] Simplified meshes at distance
- [ ] Performance optimization for mobile

**Files**: `src/world.js`

### Task 5.5: WebXR Support
- [ ] VR mode for immersive sailing
- [ ] WebXR controller input
- [ ] Comfort mode options

**Files**: `src/game.js`, `index.html`

---

## Completed Tasks ✅

### UI Polish (Damage Numbers & Combo Counter)
- [x] Damage number system with floating text
- [x] Combo counter for consecutive hits
- [x] Visual feedback on enemy hits
- [x] Quest system with Old Tarn
- [x] Tarn encounter modal with claim rewards

---

## How to Use This File

1. Check off tasks as you complete them
2. Focus on one phase at a time
3. Test each feature before moving to the next
4. Playtest after each phase to ensure game feel is right

---

**Recommended Starting Point**: Phase 1, Task 1.1 (PBR Ship Materials) - biggest visual impact with minimal code changes.
