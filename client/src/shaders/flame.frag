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
  return clamp(42. * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))), -1.0, 1.0);
}

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

void main(){
  vec2 uv = vUv;
  float t = uTime;
  float ar = uResolution.x / uResolution.y;

  float intensity = clamp(uIntensity, 0., 1.);
  float base = .25 + intensity * .45;

  vec3 bg = vec3(0.02, 0.01, 0.005);

  float glowR = .5 + base * .3;
  vec2 glowCenter = vec2(.5, .06);
  float glowDist = length(vec2((uv.x - glowCenter.x) * ar * .6, uv.y - glowCenter.y));
  float glow = exp(-glowDist * glowDist / (glowR * glowR)) * (.12 + base * .2);
  vec3 glowColor = vec3(.9, .35, .1);
  bg += glowColor * glow;

  vec2 fuv = uv;
  float d1 = snoise(vec3(uv * vec2(2.5, 4.), t * .8)) * .13;
  float d2 = snoise(vec3(uv * vec2(5., 7.), t * 1.4)) * .06;
  fuv.x += (d1 + d2) * (.4 + base * .35) * (1. - uv.y);

  float flameH = .15 + base * .45;
  fuv.y = fuv.y / flameH;

  float cx = abs(fuv.x - .5) * 2.;
  float w = mix(.9, .05, pow(clamp(fuv.y, 0., 1.), .55));
  float flameMask = 1. - smoothstep(w - .12, w + .12, cx);
  flameMask *= smoothstep(0., .06, fuv.y);
  flameMask *= 1. - smoothstep(.8, 1.1, fuv.y);

  vec3 noiseCoord = vec3(fuv.x * 3., fuv.y * 5. - t * 1.8, t * .6);
  float n = fbm(noiseCoord, 5);
  float detailN = fbm(noiseCoord * 2.5 + vec3(0., -t * .8, t * .3), 4);

  float flame = flameMask * smoothstep(-.2, .5, n + detailN * .3);
  flame *= smoothstep(-.2, .4, snoise(vec3(fuv * vec2(3., 6.) + vec2(0., -t * 2.), t * .9)));
  flame = pow(max(flame, 0.001), mix(1.2, .8, base));

  float coreX = abs(fuv.x - .5) * 2.5;
  float coreY = fuv.y * 1.0;
  float core = max(0., 1. - length(vec2(coreX, coreY - .12)));
  core = pow(core, 2.0) * (.6 + base * .7);

  float fireAmount = clamp(flame + core * .6, 0., 1.);

  float fv = clamp(fuv.y, 0., 1.);
  vec3 c1 = vec3(.2, .03, .005);
  vec3 c2 = vec3(.6, .1, .02);
  vec3 c3 = vec3(.9, .2, .03);
  vec3 c4 = vec3(1., .5, .05);
  vec3 c5 = vec3(1., .8, .3);
  vec3 c6 = vec3(1., .95, .85);

  vec3 flameColor = c1;
  flameColor = mix(flameColor, c2, smoothstep(0., .12, fv));
  flameColor = mix(flameColor, c3, smoothstep(.08, .28, fv));
  flameColor = mix(flameColor, c4, smoothstep(.2, .48, fv));
  flameColor = mix(flameColor, c5, smoothstep(.4, .72, fv));
  flameColor = mix(flameColor, c6, smoothstep(.65, .95, fv) * base);
  flameColor = mix(flameColor, c6, core * .55);

  float fireAlpha = clamp(fireAmount * (.7 + base * .5), 0., 1.);
  vec3 col = mix(bg, flameColor, fireAlpha);

  col = col / (col + 1.0);
  col = pow(col, vec3(1.0));

  gl_FragColor = vec4(col, 1.);
}
