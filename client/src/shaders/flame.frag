#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uIntensity;   // 0‥1 fire size / heat
uniform vec2  uResolution;
uniform float uBurning;     // 0‥1 active burn phase
uniform float uDropPulse;   // 0‥1 flash on file drop
uniform float uAshAmount;   // 0‥1 post‑burn ash
uniform float uDragSense;   // 0‥1 drag proximity
uniform float uCumulative;  // 0‥N cumulative burns

// ───────────────── noise helpers ─────────────────
vec3 mod289(vec3 x){ return x - floor(x*(1./289.))*289.; }
vec4 mod289(vec4 x){ return x - floor(x*(1./289.))*289.; }
vec4 permute(vec4 x){ return mod289(((x*34.)+1.)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - .85373472095314*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1./6., 1./3.);
  const vec4 D = vec4(0., .5, 1., 2.);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1. - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0., i1.z, i2.z, 1.)) +
    i.y + vec4(0., i1.y, i2.y, 1.)) +
    i.x + vec4(0., i1.x, i2.x, 1.));
  float n_ = 1./7.;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49. * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_);
  vec4 x4 = x_ * ns.x + ns.yyyy;
  vec4 y4 = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x4) - abs(y4);
  vec4 b0 = vec4(x4.xy, y4.xy);
  vec4 b1 = vec4(x4.zw, y4.zw);
  vec4 s0 = floor(b0)*2. + 1.;
  vec4 s1 = floor(b1)*2. + 1.;
  vec4 sh = -step(h, vec4(0.));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.);
  m = m * m;
  return 42. * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

// Multi‑octave FBM for rich fire detail
float fbm(vec3 p, int octaves){
  float v = 0., a = .5;
  vec3 shift = vec3(100.);
  for(int i = 0; i < 6; i++){
    if(i >= octaves) break;
    v += a * snoise(p);
    p = p * 2.02 + shift;
    a *= .48;
  }
  return v;
}

// Hash for random sparkle positions
float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ───────────────── main ─────────────────
void main(){
  vec2 uv = vUv;
  float t = uTime;
  float ar = uResolution.x / uResolution.y;

  float intensity = clamp(uIntensity, 0., 1.);
  float burning   = clamp(uBurning, 0., 1.);
  float pulse     = clamp(uDropPulse, 0., 1.);
  float ash       = clamp(uAshAmount, 0., 1.);
  float drag      = clamp(uDragSense, 0., 1.);
  float cumul     = max(uCumulative, 0.);

  // Cumulative factor: saturates around 8‑10 burns
  float cF = 1. - 1./(1. + cumul * .14);

  // Effective fire level: always at least a gentle idle flame
  float base = .25 + (intensity + drag * .15 + cF * .12) * .75;
  base = clamp(base, 0., 1.);

  // ─── Dark background: solemn deep brown‑black ───
  vec3 bgTop    = vec3(.028, .018, .014);
  vec3 bgBottom = vec3(.05, .03, .02);
  vec3 bg = mix(bgBottom, bgTop, uv.y);

  // Warm glow around fire base — gets brighter with intensity
  float glowR = .55 + base * .25 + cF * .15;
  vec2 glowCenter = vec2(.5, .08);
  float glowDist = length(vec2((uv.x - glowCenter.x) * ar * .6, uv.y - glowCenter.y));
  float glow = exp(-glowDist * glowDist / (glowR * glowR)) * (.08 + base * .14 + drag * .06);
  vec3 glowColor = vec3(.6, .18, .04);
  bg += glowColor * glow;

  // ─── 1. Coal bed at bottom ───
  float coalW = .38 + cF * .1;
  float coalMask = smoothstep(.06, 0., uv.y) * smoothstep(coalW, 0., abs(uv.x - .5));
  float coalN = snoise(vec3(uv * 8., t * .4));
  float coalPulse = .7 + .3 * sin(t * .8 + coalN * 3.);
  float coal = coalMask * (.3 + base * .25 + drag * .1) * coalPulse;
  vec3 coalColor = mix(vec3(.25, .06, .02), vec3(.7, .22, .05), coalPulse * .5 + coalN * .3);

  // ─── 2. Ember / ash bed ───
  float emberN = snoise(vec3(uv * vec2(14., 8.), t * .2));
  float emberMask = smoothstep(.10, 0., uv.y) * smoothstep(.45 + cF * .1, 0., abs(uv.x - .5));
  float ember = smoothstep(.3, .8, emberN) * emberMask * (.15 + cF * .1 + ash * .08);
  vec3 emberColor = vec3(.75, .25, .06);

  // ─── 3. MAIN FLAME — the hero effect ───
  // Remap UV: center horizontally, anchor flame at bottom
  vec2 fuv = uv;

  // Turbulent displacement
  float d1 = snoise(vec3(uv * vec2(2.5, 4.), t * .8)) * .13;
  float d2 = snoise(vec3(uv * vec2(5., 7.), t * 1.4)) * .06;
  float d3 = snoise(vec3(uv * vec2(9., 14.), t * 2.5)) * .03;
  fuv.x += (d1 + d2 + d3) * (.4 + base * .35) * (1. - uv.y);

  // Flame height: scales with base
  float flameH = .25 + base * .45 + drag * .08;
  fuv.y = fuv.y / flameH;

  // Flame width: wide at base, tapers
  float cx = abs(fuv.x - .5) * 2.;
  float baseW = .85 + base * .25;
  float w = mix(baseW, .05, pow(clamp(fuv.y, 0., 1.), .55 + base * .2));
  float flameMask = 1. - smoothstep(w - .12, w + .12, cx);
  flameMask *= smoothstep(0., .06, fuv.y);  // fade at ground
  flameMask *= 1. - smoothstep(.8, 1.1, fuv.y); // fade at tip

  // Multi‑octave fire noise
  vec3 noiseCoord = vec3(fuv.x * 3., fuv.y * 5. - t * 1.8, t * .6);
  float n = fbm(noiseCoord, 5);
  float detailN = fbm(noiseCoord * 2.5 + vec3(0., -t * .8, t * .3), 4);

  float flame = flameMask * smoothstep(-.4, .6, n + detailN * .35);
  flame *= smoothstep(-.3, .5, snoise(vec3(fuv * vec2(3., 6.) + vec2(0., -t * 2.), t * .9)));
  flame = pow(max(flame, 0.), mix(1.3, .7, base));

  // Inner core: bright white‑hot center
  float coreX = abs(fuv.x - .5) * 3.;
  float coreY = fuv.y * 1.2;
  float core = max(0., 1. - length(vec2(coreX, coreY - .15)));
  core = pow(core, 2.5) * (.35 + base * .55);

  // Combine flame and core
  float fireAmount = clamp(flame + core * .6, 0., 1.);

  // ─── Flame color: rich gradient from deep red to white‑hot ───
  float fv = clamp(fuv.y, 0., 1.);
  vec3 c1 = vec3(.15, .02, .005);  // deep ember
  vec3 c2 = vec3(.55, .08, .015);  // dark red
  vec3 c3 = vec3(.85, .18, .03);   // red‑orange
  vec3 c4 = vec3(1., .48, .06);    // orange
  vec3 c5 = vec3(1., .78, .28);    // gold
  vec3 c6 = vec3(1., .95, .85);    // white‑hot

  vec3 flameColor = c1;
  flameColor = mix(flameColor, c2, smoothstep(0., .12, fv));
  flameColor = mix(flameColor, c3, smoothstep(.08, .28, fv));
  flameColor = mix(flameColor, c4, smoothstep(.2, .48, fv));
  flameColor = mix(flameColor, c5, smoothstep(.4, .72, fv));
  flameColor = mix(flameColor, c6, smoothstep(.65, .95, fv) * base);
  // Core tints hot
  flameColor = mix(flameColor, c6, core * .55);

  // ─── 4. Smoke ───
  float smokeN = fbm(vec3(uv * vec2(3., 2.) + vec2(0., -t * .15), t * .1), 3);
  float smokeMask = smoothstep(.25 + flameH * .7, 1.1, uv.y) * smoothstep(.5, 0., abs(uv.x - .5));
  float smoke = smoothstep(.1, .7, smokeN) * smokeMask * (.06 + cF * .08 + burning * .04);
  vec3 smokeColor = vec3(.22, .2, .18);

  // ─── 5. Sparks / flying embers ───
  float sparks = 0.;
  if(base > .3){
    for(int i = 0; i < 3; i++){
      vec2 sp = uv * vec2(12. + float(i)*5., 28. + float(i)*8.);
      float sn = snoise(vec3(sp + vec2(0., -t * (4.5 + float(i)*2.)), t * (2. + float(i))));
      sparks += smoothstep(.88, 1., sn) * smoothstep(.06, .9, uv.y) * base * .25;
    }
  }
  // Drop pulse spark burst
  if(pulse > .01){
    for(int i = 0; i < 2; i++){
      vec2 sp2 = uv * vec2(16. + float(i)*6., 38. + float(i)*10.);
      float sn2 = snoise(vec3(sp2 + vec2(0., -t * (7. + float(i)*3.)), t * (3. + float(i))));
      sparks += smoothstep(.82, 1., sn2) * smoothstep(.04, .85, uv.y) * pulse * .5;
    }
  }
  // Drag sparks
  if(drag > .2){
    vec2 sp3 = uv * vec2(10., 24.);
    float sn3 = snoise(vec3(sp3 + vec2(0., -t * 6.), t * 2.8));
    sparks += smoothstep(.87, 1., sn3) * smoothstep(.08, .8, uv.y) * drag * .35;
  }
  vec3 sparkColor = vec3(1., .85, .5);

  // ─── 6. Burning phase pulse ───
  float burnPulse = burning * (.06 + sin(t * 7.) * .03 + sin(t * 12.) * .02);

  // ─── 7. Paper flare flicker ───
  float flare = 0.;
  if(burning > .1){
    float fl = snoise(vec3(uv * 7., t * 5.));
    float fl2 = snoise(vec3(uv * 13., t * 8.));
    flare = smoothstep(.7, 1., fl * .6 + fl2 * .4) * flameMask * burning * .3;
  }
  vec3 flareColor = vec3(1., .9, .65);

  // ─── 8. Drop pulse flash ───
  float dropGlow = pulse * exp(-length(vec2((uv.x - .5) * ar, uv.y - .12)) * 3.) * .8;
  vec3 dropColor = vec3(1., .7, .3);

  // ─── 9. Drag response: warm aura ───
  float dragGlowR = .4 + drag * .2;
  float dragGlow = drag * exp(-length(vec2((uv.x - .5) * ar * .7, (uv.y - .15) * .7)) / (dragGlowR * dragGlowR)) * .12;
  vec3 dragColor = vec3(.85, .4, .1);

  // ─── 10. Ash field at bottom ───
  float ashN1 = snoise(vec3(uv * vec2(16., 8.), t * .15));
  float ashN2 = snoise(vec3(uv * vec2(26., 12.), t * .22));
  float ashW = .4 + cF * .15;
  float ashField = smoothstep(.35, .85, ashN1 * .6 + ashN2 * .4)
                  * smoothstep(.12, 0., uv.y)
                  * smoothstep(ashW, 0., abs(uv.x - .5))
                  * ash;
  float ashEdge = smoothstep(.25, .65, ashN1) * smoothstep(.5, .85, ashN2)
                 * smoothstep(.10, 0., uv.y) * ash * .25
                 * (.7 + .3 * sin(t * 1.1 + ashN1 * 4.));
  vec3 ashColor = vec3(.4, .15, .06);
  vec3 ashEdgeColor = vec3(.7, .3, .1);

  // ─── 11. Light bloom: ambient warm illumination ───
  float bloomR = .5 + base * .3 + cF * .2 + drag * .1;
  float bloomDist = length(vec2((uv.x - .5) * ar * .5, (uv.y - .1) * .5));
  float bloom = exp(-bloomDist * bloomDist / (bloomR * bloomR)) * (.03 + base * .06 + cF * .04 + burning * .03);
  vec3 bloomColor = vec3(.8, .35, .1);

  // ═══════════════ COMPOSITE ═══════════════

  vec3 col = bg;

  // Add light bloom first (behind everything)
  col += bloomColor * bloom;

  // Coal bed
  col += coalColor * coal;

  // Ember / ash bed
  col += emberColor * ember;
  col += ashColor * ashField * .5;
  col += ashEdgeColor * ashEdge;

  // Main fire: alpha‑composite flame over background
  float fireAlpha = clamp(fireAmount * (.6 + base * .45) + burnPulse * flameMask, 0., 1.);
  col = mix(col, flameColor, fireAlpha);

  // Smoke (darken / overlay)
  col = mix(col, smokeColor, smoke * .5);

  // Sparks (additive)
  col += sparkColor * sparks * .8;

  // Paper flare (additive)
  col += flareColor * flare;

  // Drop pulse flash (additive)
  col += dropColor * dropGlow;

  // Drag glow (additive)
  col += dragColor * dragGlow;

  // ─── Vignette: darkens edges for cinematic feel ───
  float vig = 1. - smoothstep(.4, 1.2, length((uv - .5) * vec2(ar * .8, 1.)));
  col *= mix(.55, 1., vig);

  // ─── Tone‑mapping & final output ───
  // Simple Reinhard to prevent blowout
  col = col / (col + .9);
  // Slight contrast boost
  col = pow(col, vec3(.92));

  fragColor = vec4(col, 1.);
}
