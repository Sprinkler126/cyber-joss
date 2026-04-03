#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uIntensity;   // 0..1  overall fire intensity
uniform vec2  uResolution;
uniform float uBurning;     // 0..1  active burning pulse

/* ─── Simplex 3D noise ─── */
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159-0.85373472095314*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0,1.0/3.0);
  const vec4 D = vec4(0,0.5,1,2);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g,l.zxy);
  vec3 i2=max(g,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(
    i.z+vec4(0,i1.z,i2.z,1))+
    i.y+vec4(0,i1.y,i2.y,1))+
    i.x+vec4(0,i1.x,i2.x,1));
  float n_=1.0/7.0;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

/* ─── Hash for spark distribution ─── */
float hash(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}

/* ─── Bonfire flame mask — wider at bottom, tapering up ─── */
float flameMask(vec2 uv, float intensity){
  float cx = abs(uv.x - 0.5) * 2.0;
  float height = smoothstep(0.0, 0.92, uv.y);

  // Wider base, tighter top — adjusts with intensity
  float baseWidth = mix(1.1, 0.88, intensity);
  float width = mix(baseWidth, 0.12, pow(uv.y, 0.68 + intensity * 0.22));
  float mask = 1.0 - smoothstep(width, width + 0.18, cx);

  // Boost at lower region (glowing coals / base)
  float lowerBoost = smoothstep(0.0, 0.18, uv.y) * (1.0 - smoothstep(0.18, 0.45, uv.y));
  return mask * height + lowerBoost * (0.55 + intensity * 0.45);
}

void main(){
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  float t = uTime;
  float intensity = clamp(uIntensity, 0.0, 1.0);
  float burning = clamp(uBurning, 0.0, 1.0);

  /* ── Constant ember glow layer (always visible, even at 0 intensity) ── */
  float emberN = snoise(vec3(uv * vec2(10.0, 20.0), t * 0.18));
  float ember = smoothstep(0.68, 1.0, emberN) * (1.0 - uv.y) * 0.14;
  float coalGlow = smoothstep(0.55, 0.85, 1.0 - uv.y)
                 * smoothstep(0.65, 0.0, abs(uv.x - 0.5))
                 * 0.18
                 * (0.85 + 0.15 * sin(t * 0.9));

  /* ── Always-on base fire (persistent bonfire) ── */
  // The bonfire is always burning; intensity only controls *how big*
  // baseLevel: even at 0 input intensity we get a gentle low fire
  float baseLevel = 0.22 + intensity * 0.78;

  // Distortion for organic shape
  float distort1 = snoise(vec3(uv * vec2(3.0, 5.2), t * 0.75)) * 0.14;
  float distort2 = snoise(vec3(uv * vec2(5.0, 8.0), t * 1.2)) * 0.07;
  vec2 fuv = uv;
  fuv.x += (distort1 + distort2) * (0.32 + baseLevel * 0.38) * (1.0 - uv.y);
  fuv.y *= 1.12 + baseLevel * 0.48;

  float mask = flameMask(fuv, baseLevel);

  // Multi-octave turbulence
  float n1 = snoise(vec3(fuv * vec2(3.5, 6.2) + vec2(0, -t * 1.6), t * 0.65));
  float n2 = snoise(vec3(fuv * vec2(7.0, 12.0) + vec2(0, -t * 2.8), t * 1.1));
  float n3 = snoise(vec3(fuv * vec2(14.0, 22.0) + vec2(0, -t * 4.2), t * 1.8));
  float curl = snoise(vec3(fuv.x * 11.0, fuv.y * 6.0 + t * 0.7, t * 0.35));

  float flame = mask;
  flame *= smoothstep(-0.55, 0.75, n1 + n2 * 0.42 + n3 * 0.18 + curl * 0.22);
  flame *= 1.0 - smoothstep(0.82 + baseLevel * 0.26, 1.14 + baseLevel * 0.28, fuv.y);
  flame = pow(max(flame, 0.0), mix(1.45, 0.82, baseLevel));

  // Core hotspot
  float core = max(0.0, 1.0 - length(vec2((fuv.x - 0.5) * 2.6, fuv.y * 1.3 - 0.22)));
  core = pow(core, 2.8) * (0.48 + baseLevel * 0.62);

  /* ── Color palette — deep reds / golds for paper burning ── */
  vec3 deepRed  = vec3(0.20, 0.02, 0.01);
  vec3 crimson  = vec3(0.58, 0.08, 0.02);
  vec3 red      = vec3(0.78, 0.14, 0.03);
  vec3 orange   = vec3(0.96, 0.42, 0.05);
  vec3 gold     = vec3(1.00, 0.78, 0.24);
  vec3 whiteHot = vec3(1.00, 0.94, 0.82);

  float v = clamp(fuv.y, 0.0, 1.0);
  vec3 color = mix(deepRed, crimson, smoothstep(0.0, 0.15, v));
  color = mix(color, red, smoothstep(0.10, 0.30, v));
  color = mix(color, orange, smoothstep(0.22, 0.55, v));
  color = mix(color, gold, smoothstep(0.48, 0.82, v));
  color = mix(color, whiteHot, smoothstep(0.75, 1.0, v) * baseLevel);
  color = mix(color, whiteHot, core * 0.52);

  /* ── Smoke wisps above flame ── */
  float smokeN = smoothstep(0.22, 1.0, snoise(vec3(uv * vec2(3.2, 2.8) + vec2(0, -t * 0.22), t * 0.12)));
  float smoke = smokeN * smoothstep(0.32, 1.12, uv.y) * 0.16;

  /* ── Sparks — more at higher intensity ── */
  float sparks = 0.0;
  if(baseLevel > 0.35){
    vec2 spUv = uv * vec2(14.0, 32.0);
    float spN = snoise(vec3(spUv + vec2(0, -t * 5.5), t * 2.4));
    sparks = smoothstep(0.88, 1.0, spN) * smoothstep(0.08, 1.1, uv.y) * baseLevel;
  }

  /* ── Burning pulse overlay ── */
  float pulse = burning * (sin(t * 8.0) * 0.05 + sin(t * 13.0) * 0.025 + 0.07);

  /* ── Paper-flare flicker (quick bright flashes simulating paper catching) ── */
  float paperFlare = 0.0;
  if(burning > 0.1){
    float fl1 = snoise(vec3(uv * 6.0, t * 4.5));
    float fl2 = snoise(vec3(uv * 12.0, t * 7.0));
    paperFlare = smoothstep(0.72, 1.0, fl1 * 0.6 + fl2 * 0.4)
               * mask * burning * 0.35;
  }

  /* ── Compose final ── */
  float alpha = clamp(
    flame * (0.55 + baseLevel * 0.48)
    + ember + coalGlow
    + smoke
    + sparks * 0.75
    + pulse * mask
    + paperFlare,
    0.0, 1.0
  );

  vec3 emberColor = vec3(0.85, 0.28, 0.06);
  vec3 coalColor  = vec3(0.62, 0.16, 0.04);
  vec3 sparkColor = vec3(1.0, 0.88, 0.55);
  vec3 smokeColor = vec3(0.38, 0.36, 0.34);
  vec3 flareColor = vec3(1.0, 0.92, 0.68);

  vec3 finalColor = color * flame
    + emberColor * ember
    + coalColor * coalGlow
    + smokeColor * smoke
    + sparkColor * sparks
    + flareColor * paperFlare;

  fragColor = vec4(finalColor, alpha);
}
