#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;
uniform float uBurning;

// Simplex 3D noise
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec2 uv = vUv;

  // No fire when intensity is 0
  if (uIntensity < 0.01) {
    // Show faint embers
    float ember = snoise(vec3(uv * 8.0, uTime * 0.5));
    ember = smoothstep(0.8, 1.0, ember);
    float flicker = sin(uTime * 3.0 + uv.x * 10.0) * 0.5 + 0.5;
    vec3 emberColor = vec3(1.0, 0.3, 0.05);
    float alpha = ember * flicker * 0.15;
    fragColor = vec4(emberColor * alpha, alpha);
    return;
  }

  // Flame shape: wider at base, narrower at top
  float flameHeight = 0.6 + uIntensity * 0.35;
  float flameWidth = 0.25 + uIntensity * 0.15;

  // Vertical profile: strong at base, tapering to point
  float heightProfile = 1.0 - smoothstep(0.0, flameHeight, uv.y);

  // Horizontal profile: narrow at top
  float widthAtY = flameWidth * (1.0 - uv.y / flameHeight * 0.6);
  float widthProfile = 1.0 - smoothstep(0.0, widthAtY, abs(uv.x - 0.5));

  float flameShape = heightProfile * widthProfile;

  // Multi-layer noise for organic movement
  float t = uTime;
  float n1 = snoise(vec3(uv * 2.5, t * 1.2)) * 0.5 + 0.5;
  float n2 = snoise(vec3(uv * 5.0, t * 2.0 + 100.0)) * 0.5 + 0.5;
  float n3 = snoise(vec3(uv * 10.0, t * 3.0 + 200.0)) * 0.5 + 0.5;
  float n4 = snoise(vec3(uv.x * 15.0, uv.y * 3.0 - t * 2.5, t * 1.5)) * 0.5 + 0.5;

  float turbulence = n1 * 0.45 + n2 * 0.3 + n3 * 0.15 + n4 * 0.1;

  // Base flame intensity
  float flame = flameShape * turbulence;
  flame = pow(flame, 1.3 - uIntensity * 0.4);

  // Height gradient: color changes from bottom to top
  float heightRatio = uv.y / flameHeight;

  // Color palette: deep red → orange → yellow → white
  vec3 colorDeep = vec3(0.5, 0.02, 0.0);    // Dark red base
  vec3 colorRed = vec3(0.9, 0.1, 0.02);      // Bright red
  vec3 colorOrange = vec3(1.0, 0.45, 0.05);  // Orange
  vec3 colorYellow = vec3(1.0, 0.85, 0.2);   // Yellow
  vec3 colorWhite = vec3(1.0, 0.98, 0.9);    // White-hot tip

  vec3 flameColor;
  if (heightRatio < 0.2) {
    flameColor = mix(colorDeep, colorRed, heightRatio / 0.2);
  } else if (heightRatio < 0.5) {
    flameColor = mix(colorRed, colorOrange, (heightRatio - 0.2) / 0.3);
  } else if (heightRatio < 0.8) {
    flameColor = mix(colorOrange, colorYellow, (heightRatio - 0.5) / 0.3);
  } else {
    flameColor = mix(colorYellow, colorWhite, (heightRatio - 0.8) / 0.2);
  }

  // Intensity affects color brightness
  float brightness = 0.6 + uIntensity * 0.4;
  flameColor *= brightness;

  // Inner core glow (bottom center)
  float coreDist = length(vec2((uv.x - 0.5) * 2.0, uv.y / flameHeight));
  float core = smoothstep(0.5, 0.0, coreDist) * (1.0 - heightRatio * 0.8);
  vec3 coreColor = mix(colorYellow, colorWhite, 0.5);
  flameColor = mix(flameColor, coreColor, core * uIntensity * 0.6);

  // Spark particles (high intensity)
  float sparks = 0.0;
  if (uIntensity > 0.4) {
    float sparkThreshold = 0.97 - (uIntensity - 0.4) * 0.05;
    float sparkNoise = snoise(vec3(uv * 25.0, t * 4.0));
    float sparkMask = smoothstep(sparkThreshold, 1.0, sparkNoise);
    float sparkShape = heightProfile * (1.0 - smoothstep(flameHeight * 1.2, flameHeight * 1.5, uv.y));
    sparks = sparkMask * sparkShape * uIntensity;
  }

  // Burning effect: more turbulent
  float burnBoost = uBurning > 0.5 ? sin(t * 8.0 + uv.x * 20.0) * 0.15 + 0.15 : 0.0;

  // Final alpha
  float alpha = flame * (0.5 + uIntensity * 0.5) + sparks * 0.8 + burnBoost * flameShape;
  alpha = clamp(alpha, 0.0, 1.0);

  // Composite
  vec3 finalColor = flameColor + sparks * vec3(1.0, 0.9, 0.6) * 0.5;

  // Screen shake / heat distortion effect at high intensity
  if (uIntensity > 0.7) {
    float distortion = sin(uv.y * 30.0 + t * 10.0) * 0.02 * (uIntensity - 0.7) * 3.33;
    finalColor += distortion * vec3(0.5, 0.2, 0.0);
  }

  fragColor = vec4(finalColor, alpha);
}
