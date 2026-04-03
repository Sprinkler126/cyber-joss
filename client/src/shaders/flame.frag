#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;
uniform float uBurning;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
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
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float flameMask(vec2 uv, float intensity) {
  float centeredX = abs(uv.x - 0.5) * 2.0;
  float height = smoothstep(0.02, 0.94, uv.y);
  float width = mix(0.95, 0.18, uv.y);
  float base = 1.0 - smoothstep(width, width + 0.2, centeredX);
  float lowerBoost = smoothstep(0.0, 0.25, uv.y) * (1.0 - smoothstep(0.25, 0.55, uv.y));
  return base * height + lowerBoost * (0.4 + intensity * 0.4);
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - vec2(0.5, 0.0);
  float intensity = clamp(uIntensity, 0.0, 1.0);
  float t = uTime;

  float emberNoise = snoise(vec3(uv * vec2(8.0, 18.0), t * 0.2));
  float ember = smoothstep(0.72, 1.0, emberNoise) * (1.0 - uv.y) * 0.12;

  if (intensity < 0.02) {
    fragColor = vec4(vec3(0.85, 0.24, 0.05) * ember, ember);
    return;
  }

  float distort = snoise(vec3(uv * vec2(2.8, 4.4), t * 0.9)) * 0.12;
  uv.x += distort * (0.28 + intensity * 0.32) * (1.0 - uv.y);
  uv.y *= 1.18 + intensity * 0.42;

  float mask = flameMask(uv, intensity);
  float bodyNoise = snoise(vec3(uv * vec2(3.2, 5.8) + vec2(0.0, -t * 1.8), t * 0.7));
  float detailNoise = snoise(vec3(uv * vec2(8.0, 13.0) + vec2(0.0, -t * 3.4), t * 1.3));
  float curlNoise = snoise(vec3(vec2(uv.x * 10.0, uv.y * 5.0 + t * 0.8), t * 0.4));

  float flame = mask;
  flame *= smoothstep(-0.5, 0.8, bodyNoise + detailNoise * 0.45 + curlNoise * 0.25);
  flame *= 1.0 - smoothstep(0.88 + intensity * 0.2, 1.18 + intensity * 0.25, uv.y);
  flame = pow(max(flame, 0.0), mix(1.4, 0.9, intensity));

  float core = max(0.0, 1.0 - length(vec2((uv.x - 0.5) * 2.8, uv.y * 1.4 - 0.28)));
  core = pow(core, 3.0) * (0.5 + intensity * 0.6);

  vec3 deepRed = vec3(0.22, 0.02, 0.01);
  vec3 red = vec3(0.74, 0.12, 0.03);
  vec3 orange = vec3(0.96, 0.39, 0.04);
  vec3 gold = vec3(1.0, 0.77, 0.22);
  vec3 whiteHot = vec3(1.0, 0.96, 0.88);

  float vertical = clamp(uv.y, 0.0, 1.0);
  vec3 color = mix(deepRed, red, smoothstep(0.02, 0.24, vertical));
  color = mix(color, orange, smoothstep(0.18, 0.52, vertical));
  color = mix(color, gold, smoothstep(0.42, 0.86, vertical));
  color = mix(color, whiteHot, smoothstep(0.78, 1.0, vertical) * intensity);
  color = mix(color, whiteHot, core * 0.58);

  float smoke = smoothstep(0.28, 1.0, snoise(vec3(uv * vec2(3.0, 2.6) + vec2(0.0, -t * 0.25), t * 0.15)));
  smoke *= smoothstep(0.38, 1.18, uv.y) * 0.18;

  float sparks = 0.0;
  if (intensity > 0.45) {
    vec2 sparkUv = uv * vec2(12.0, 28.0);
    float sparkNoise = snoise(vec3(sparkUv + vec2(0.0, -t * 5.0), t * 2.2));
    sparks = smoothstep(0.9, 1.0, sparkNoise) * smoothstep(0.1, 1.2, uv.y) * intensity;
  }

  float pulse = uBurning * (sin(t * 7.0) * 0.04 + 0.06);
  float alpha = clamp(flame * (0.52 + intensity * 0.5) + ember + smoke + sparks * 0.8 + pulse * mask, 0.0, 1.0);
  vec3 finalColor = color * flame + vec3(0.88, 0.34, 0.08) * ember + vec3(0.42, 0.42, 0.42) * smoke + vec3(1.0, 0.86, 0.55) * sparks;

  fragColor = vec4(finalColor, alpha);
}
