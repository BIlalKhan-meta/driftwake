// Driftwake - Shader Registration

export function registerSeaShaders() {
  if (!BABYLON || !BABYLON.Effect) {
    console.warn('BABYLON.Effect not available, skipping sea shader registration');
    return;
  }
  BABYLON.Effect.ShadersStore['seaVertexShader'] = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    uniform mat4 world;
    uniform mat4 worldViewProjection;
    varying vec3 vW;
    varying vec3 vN;
    void main() {
      vec4 w = world * vec4(position, 1.);
      vW = w.xyz;
      vN = normalize((world * vec4(normal, 0.)).xyz);
      gl_Position = worldViewProjection * vec4(position, 1.);
    }
  `;
  
  BABYLON.Effect.ShadersStore['seaFragmentShader'] = `
    precision highp float;
    varying vec3 vW;
    varying vec3 vN;
    uniform float time;
    uniform vec3 camPos;
    uniform vec3 fogCol;
    uniform float fogD;
    uniform float dayK;
    uniform vec3 ripplePos;
    uniform float rippleTime;
    
    float ridge(vec2 p) {
      float a = sin(p.x + sin(p.y * .8 + time * .4) * 1.3);
      float b = sin(p.y * 1.1 + sin(p.x * .9 - time * .35) * 1.3);
      return 1. - abs(a * b);
    }
    
    void main() {
      vec3 N = normalize(vN);
      vec3 V = normalize(camPos - vW);
      vec3 L = normalize(vec3(-.4, 1., -.3));
      float h = vW.y;
      
      vec3 deep = vec3(.01, .22, .4);
      vec3 mid = vec3(.07, .45, .65);
      vec3 shal = vec3(.2, .6, .8);
      
      float db = clamp(h * .4 + .5, 0., 1.);
      vec3 col = mix(deep, mid, smoothstep(.3, .5, db));
      col = mix(col, shal, smoothstep(.6, .8, db));
      
      col *= .75 + .45 * max(dot(N, L), 0.);
      
      float r = ridge(vW.xz * .26 + time * .065);
      col = mix(col, vec3(1.), smoothstep(.86, .96, r) * .5);
      
      float n = ridge(vW.xz * .62 - time * .14);
      float foam = smoothstep(.78, 1.0, h + (n - .5) * .55);
      col = mix(col, vec3(1.), foam * .6);
      
      col += vec3(1.) * pow(max(dot(N, normalize(L + V)), 0.), 220.) * .45;
      
      float rim = 1.0 - max(dot(N, V), 0.0);
      col += vec3(.1, .2, .3) * rim * .12;
      
      // Ship ripple - expanding ring
      float rd = length(vW.xz - ripplePos.xz);
      float rw = 0.8;
      float ripple = smoothstep(rw, 0.0, abs(rd - rippleTime * 8.0)) * (1.0 - smoothstep(0.0, 25.0, rd));
      col = mix(col, vec3(.4, .75, .9), ripple * .35);
      col += vec3(1., 1., 1.) * ripple * .15;
      
      col *= mix(.35, 1., dayK);
      
      float d = length(vW - camPos);
      col = mix(col, fogCol, clamp(1. - exp(-fogD * fogD * d * d), 0., 1.));
      
      gl_FragColor = vec4(col, 1.);
    }
  `;
}