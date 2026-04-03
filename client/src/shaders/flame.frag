precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uIntensity;
uniform vec2  uResolution;
uniform float uBurning;
uniform float uDropPulse;
uniform float uAshAmount;
uniform float uDragSense;
uniform float uCumulative;

// ── Simplex 3D noise (GLSL 1.0 compatible) ──────────────────────────────────
vec3 mod289v3(vec3 x){ return x - floor(x*(1./289.))*289.; }
vec4 mod289v4(vec4 x){ return x - floor(x*(1./289.))*289.; }
vec4 permute(vec4 x){ return mod289v4(((x*34.)+1.)*x); }
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
  i = mod289v3(i);
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
  return clamp(42. * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))), -1.0, 1.0);
}

// ── Fractal Brownian Motion ──────────────────────────────────────────────────
float fbm(vec3 p, int octaves){
  float v = 0., a = .5;
  vec3 shift = vec3(100.);
  for(int i = 0; i < 7; i++){
    if(i >= octaves) break;
    v += a * snoise(p);
    p = p * 2.05 + shift;
    a *= .46;
  }
  return v;
}

// ── Hash for randomness ──────────────────────────────────────────────────────
float hash(float n){ return fract(sin(n) * 43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec2 uv = vUv;
  float t = uTime;
  float ar = uResolution.x / uResolution.y;

  float intensity = clamp(uIntensity, 0., 1.);
  float burning   = clamp(uBurning, 0., 1.);
  float dropPulse = clamp(uDropPulse, 0., 1.);
  float cumul     = clamp(uCumulative / 8., 0., 1.);

  // Combined fire "power" — intensifies when burning or file dropped
  float power = intensity + burning * 0.5 + dropPulse * 0.4 + cumul * 0.25;
  power = clamp(power, 0., 1.5);

  // ── 1. Very dark background — almost pure black ──────────────────────────
  // The fire scene should look like a dark night around a bonfire
  vec3 bg = vec3(0.005, 0.003, 0.002);

  // ── 2. Ground embers / ash layer at the very bottom ─────────────────────
  float ashLevel = clamp(uAshAmount, 0., 1.);
  float ashY = smoothstep(0.07, 0.0, uv.y); // strip at very bottom
  vec3 emberCol = mix(vec3(0.08, 0.03, 0.01), vec3(0.25, 0.10, 0.02), ashLevel);
  // Pulsing ember glow in ash
  float emberPulse = 0.5 + 0.5 * sin(t * 1.4 + uv.x * 18.0);
  emberPulse *= 0.5 + 0.5 * sin(t * 2.1 - uv.x * 9.0);
  emberCol = mix(emberCol, vec3(0.9, 0.35, 0.05), emberPulse * ashLevel * 0.5);
  bg = mix(bg, emberCol, ashY * ashLevel * 0.85);

  // ── 3. Wide environmental glow at the base (subtle orange on ground) ─────
  // Campfire casts a pool of warm light downward - smaller, moves with fire
  float envGlowDist = length(vec2((uv.x - 0.5) * ar * 0.8, (uv.y - power * 0.02) * 0.5));
  float envGlow = exp(-envGlowDist * envGlowDist * 5.0) * (0.04 + power * 0.08);
  bg += vec3(0.8, 0.25, 0.04) * envGlow;

  // ── 4. Fire basin / source: tight ellipse at bottom center ───────────────
  // The fire SOURCE is small like a real campfire base
  float sourceR = 0.06 + power * 0.04; // smaller base radius
  float sourceCx = (uv.x - 0.5) * ar;
  // Light source moves up slightly with fire intensity
  float sourceCy = uv.y - 0.035 - power * 0.015; 
  float sourceDist = length(vec2(sourceCx / sourceR, sourceCy / (sourceR * 0.45)));
  float sourceGlow = exp(-sourceDist * sourceDist * 2.0) * (0.4 + power * 0.9);
  bg += vec3(1.0, 0.6, 0.1) * sourceGlow;

  // ── 5. Flame computation ──────────────────────────────────────────────────
  // Map UVs so the flame is centered horizontally, base at bottom
  vec2 fuv = uv;

  // Wind / turbulence distortion — sharper, less blur
  float warp = 1. - uv.y;
  float d1 = snoise(vec3(uv * vec2(4.0, 6.0), t * 1.2)) * 0.06;
  float d2 = snoise(vec3(uv * vec2(9.0, 12.0), t * 2.2)) * 0.025;
  float d3 = snoise(vec3(uv * vec2(2.0, 3.0), t * 0.5)) * 0.04;
  fuv.x += (d1 + d2 + d3) * (0.25 + power * 0.20) * (1. - uv.y * 0.6);

  // Flame height: campfire flames are tall and narrow
  float flameH = 0.18 + power * 0.40;  // 18%..58% of screen height
  float fv = fuv.y / flameH;           // 0=base 1=tip, >1=above flame

  // Flame width profile — sharper edges, less blur
  float cx = abs(fuv.x - 0.5) * 2.0;
  float wProfile = mix(0.18, 0.035, pow(clamp(fv, 0., 1.), 0.55));
  float flameMask = 1. - smoothstep(wProfile - 0.04, wProfile + 0.06, cx);
  flameMask *= smoothstep(-0.01, 0.05, fv);
  flameMask *= 1. - smoothstep(0.80, 1.05, fv);

  // High-frequency noise for turbulent flame tongues - sharper details
  vec3 nCoord = vec3(fuv.x * 6.0, fv * 8.0 - t * 3.0, t * 0.9);
  float n1 = fbm(nCoord, 4);
  float n2 = fbm(nCoord * 2.0 + vec3(7.0, -t * 1.5, t * 0.6), 3);
  float n3 = snoise(vec3(fuv.x * 10., fv * 12. - t * 4.0, t * 1.5));

  float flame = flameMask * smoothstep(-0.1, 0.45, n1 + n2 * 0.3 + n3 * 0.1);
  flame *= smoothstep(-0.05, 0.35, snoise(vec3(fuv * vec2(6., 10.) + vec2(0., -t * 3.0), t * 1.5)));
  flame = pow(max(flame, 0.001), mix(0.9, 0.6, clamp(power * 0.7, 0., 1.)));

  // ── 6. Inner core — the blazing white-hot heart ──────────────────────────
  // Real campfire has a white/light-yellow core near the base
  float coreCx = abs(fuv.x - 0.5) * 3.5;
  float coreFv = fv; // relative height
  float core = exp(-coreCx * coreCx * 3.0) * exp(-coreFv * coreFv * 2.8);
  core *= (0.7 + power * 0.9);
  // Flicker the core
  float flicker = 0.85 + 0.15 * sin(t * 11.0 + hash(floor(t * 7.0)) * 6.28);
  core *= flicker;

  // ── 7. Floating sparks / embers ──────────────────────────────────────────
  float sparks = 0.0;
  for(int si = 0; si < 12; si++){
    float sid = float(si);
    float sLife = fract(t * (0.18 + hash(sid) * 0.22) + hash(sid + 0.5));
    float sX = 0.5 + (hash(sid + 1.0) - 0.5) * 0.18 * sourceR * 12.0;
    // Sparks rise upward with slight drift
    float sY = sLife * (0.55 + hash(sid + 2.0) * 0.35) * flameH * 1.6;
    sX += (hash(sid + 3.0) - 0.5) * 0.04 * sLife;
    vec2 sPos = vec2(sX, sY);
    float sDist = length((uv - sPos) * vec2(ar * 1.5, 1.0));
    float sSize = 0.002 + hash(sid + 4.0) * 0.003; // smaller, sharper sparks
    float sGlow = exp(-sDist * sDist / (sSize * sSize));
    float sFade = (1.0 - sLife) * sLife * 4.0;
    float sBright = 0.6 + power * 0.8;
    sparks += sGlow * sFade * sBright * (0.7 + hash(sid + 5.0) * 0.3);
  }
  sparks = clamp(sparks, 0., 1.);

  // ── 8. Fire color gradient ────────────────────────────────────────────────
  // Real campfire: white-yellow core → orange mid → deep red at edges → transparent tips
  float fvClamped = clamp(fv, 0., 1.);

  vec3 cBase  = vec3(0.15, 0.02, 0.005);  // dark deep red/brown at base edge
  vec3 cDeep  = vec3(0.60, 0.08, 0.01);   // red
  vec3 cMid   = vec3(0.98, 0.30, 0.02);   // vivid orange
  vec3 cOuter = vec3(1.00, 0.60, 0.05);   // bright orange-yellow
  vec3 cHot   = vec3(1.00, 0.88, 0.35);   // yellow
  vec3 cCore  = vec3(1.00, 0.97, 0.90);   // near-white hot core

  vec3 flameColor = cBase;
  flameColor = mix(flameColor, cDeep,  smoothstep(0.00, 0.14, fvClamped));
  flameColor = mix(flameColor, cMid,   smoothstep(0.10, 0.32, fvClamped));
  flameColor = mix(flameColor, cOuter, smoothstep(0.25, 0.55, fvClamped));
  flameColor = mix(flameColor, cHot,   smoothstep(0.45, 0.78, fvClamped));
  // Only reach near-white near the very bright tip area
  flameColor = mix(flameColor, cCore,  smoothstep(0.68, 0.92, fvClamped) * clamp(power * 0.9, 0., 1.));

  // Core blast overrides color to near-white/light-yellow
  flameColor = mix(flameColor, cCore, core * 0.75);

  // ── 9. Drop pulse flash — file fed into fire, big energy burst ───────────
  if(dropPulse > 0.02){
    // Bright orange burst at the fire base
    float pDist = length(vec2((uv.x - 0.5) * ar * 0.5, uv.y - 0.08));
    float pFlash = exp(-pDist * pDist * 5.0) * dropPulse;
    bg += vec3(1.0, 0.55, 0.1) * pFlash * 2.5;
    flame = max(flame, pFlash * 0.85);
    flameColor = mix(flameColor, vec3(1., 0.9, 0.5), pFlash * 0.7);
  }

  // ── 10. Composite ─────────────────────────────────────────────────────────
  float fireAlpha = clamp(flame * (0.82 + power * 0.35), 0., 1.);
  vec3 col = mix(bg, flameColor, fireAlpha);

  // Add sparks on top
  col = mix(col, vec3(1.0, 0.85, 0.3), sparks * 0.9);
  col += vec3(1.0, 0.7, 0.2) * sparks * 0.4; // glow halo around sparks

  // ── 11. Bloom / tone-map ──────────────────────────────────────────────────
  // Filmic tone-map so the bright core actually looks DAZZLING
  // First add a bloom pass on the bright flame
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 bloom = col * max(0., lum - 0.55) * (1.8 + power * 1.2);
  col += bloom * 0.6; // reduced bloom for less blur

  // Simpler tone-mapping for sharper image
  col = col / (col + 0.8);
  col = pow(max(col, vec3(0.)), vec3(0.9)); // slightly higher gamma for more contrast

  // Vignette — stronger dark edges for more dramatic feel
  float vigDist = length((uv - 0.5) * vec2(ar, 1.0));
  float vignette = 1.0 - smoothstep(0.45, 1.25, vigDist * 0.95);
  col *= mix(0.05, 1.0, vignette);

  gl_FragColor = vec4(col, 1.);
}
