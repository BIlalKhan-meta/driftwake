// Driftwake - Game Feel (Trauma Shake, Hit-Stop)

export function createGameFeel() {
  let trauma = 0;
  let hitStopId = 0;
  let shakeX = 0, shakeY = 0, shakeR = 0;
  
  const TRAUMA_DECAY = 0.6;
  const MAX_OFFSET = 5;
  const MAX_ROLL = 0.015;
  
  return {
    trauma,
    hitStopId,
    shakeX, shakeY, shakeR,
    TRAUMA_DECAY, MAX_OFFSET, MAX_ROLL,
    
    addTrauma(amount) {
      this.trauma = Math.min(1, this.trauma + amount);
    },
    
    hitStop(dur = 0.07) {
      this.hitStopId++;
      const myId = this.hitStopId;
      setTimeout(() => { if (this.hitStopId === myId) this.trauma *= 0.3; }, dur * 1000);
    },
    
    update(dt, t, camera, realDt) {
      if (this.trauma > 0) {
        this.trauma = Math.max(0, this.trauma - this.TRAUMA_DECAY * realDt);
        const sh = this.trauma * this.trauma;
        
        const targetX = Math.sin(t * 4) * this.MAX_OFFSET * sh;
        const targetY = Math.cos(t * 3.5) * this.MAX_OFFSET * sh * 0.4;
        const targetR = Math.sin(t * 4.5) * this.MAX_ROLL * sh;
        
        this.shakeX += (targetX - this.shakeX) * Math.min(1, realDt * 15);
        this.shakeY += (targetY - this.shakeY) * Math.min(1, realDt * 15);
        this.shakeR += (targetR - this.shakeR) * Math.min(1, realDt * 15);
        
        camera.position.x += this.shakeX;
        camera.position.y += this.shakeY;
        camera.rotation.z = this.shakeR;
      } else {
        this.shakeX = this.shakeY = this.shakeR = 0;
      }
    },
    
    reset() {
      this.trauma = 0;
      this.shakeX = this.shakeY = this.shakeR = 0;
    }
  };
}