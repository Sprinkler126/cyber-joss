#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uIntensity;    // 0..1  fire size / heat
uniform vec2  uResolution;
uniform float uBurning;      // 0..1  active burn phase
uniform float uDropPulse;    // 0..1  flashes on each file drop, decays
uniform float uAshAmount;    // 0..1  post-burn ash accumulation
uniform float uDragSense;    // 0..1  proximity of dragged paper to fire
uniform float uCumulative;   // 0..N  cumulative burns — grows ember pile, smoke, light

/* ── simplex 3-D noise ── */
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159-0.85373472095314*r; }

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0,.5,1,2);
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
  float n_=1./7.;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

/* ── flame shape mask ── */
float flameMask(vec2 uv, float inten){
  float cx=abs(uv.x-.5)*2.;
  float ht=smoothstep(0.,.92,uv.y);
  float bw=mix(1.1,.88,inten);
  float w=mix(bw,.12,pow(uv.y,.68+inten*.22));
  float msk=1.-smoothstep(w,w+.18,cx);
  float lb=smoothstep(0.,.18,uv.y)*(1.-smoothstep(.18,.45,uv.y));
  return msk*ht+lb*(.55+inten*.45);
}

/* ────────────────────────── main ────────────────────────── */
void main(){
  vec2 uv=vUv;
  float t=uTime;
  float intensity=clamp(uIntensity,0.,1.);
  float burning=clamp(uBurning,0.,1.);
  float dropPulse=clamp(uDropPulse,0.,1.);
  float ash=clamp(uAshAmount,0.,1.);
  float drag=clamp(uDragSense,0.,1.);
  float cumul=max(uCumulative,0.);

  // Cumulative factor: saturates around 10 burns
  float cFactor=1.-1./(1.+cumul*.12);

  // base fire level: always at least a low flame
  // Drag makes flame briefly intensify; cumulative makes base larger
  float dragBoost=drag*.18;
  float cumulBoost=cFactor*.15;
  float base=.22+(intensity+dragBoost+cumulBoost)*.78;
  base=clamp(base,0.,1.);

  /* ── 1. Coal bed — always glowing at bottom, grows with cumulative ── */
  float coalWidth=.62+cFactor*.15;
  float coalMask=smoothstep(.52,.88,1.-uv.y)
                *smoothstep(coalWidth,0.,abs(uv.x-.5));
  float coalPulse=.85+.15*sin(t*.9+snoise(vec3(uv*4.,t*.3))*2.);
  // Drag makes coals glow brighter
  float coalGlow=.22+drag*.12+cFactor*.08;
  float coal=coalMask*coalGlow*coalPulse;

  /* ── 2. Ember sparkle layer (shader-based, NOT particles) ── */
  float enoise=snoise(vec3(uv*vec2(10.,20.),t*.18));
  float ember=smoothstep(.68,1.,enoise)*(1.-uv.y)*(.14+cFactor*.08);

  /* ── 3. Main flame body — grows on drag proximity ── */
  float d1=snoise(vec3(uv*vec2(3.,5.2),t*.75))*.14;
  float d2=snoise(vec3(uv*vec2(5.,8.),t*1.2))*.07;
  vec2 fuv=uv;
  fuv.x+=(d1+d2)*(.32+base*.38)*(1.-uv.y);
  fuv.y*=1.12+base*.48;

  // Drag: flame widens and heightens slightly
  float dragWiden=drag*.08;
  vec2 dfuv=fuv;
  dfuv.x=mix(dfuv.x,.5,dragWiden);

  float mask=flameMask(dfuv,base);

  float n1=snoise(vec3(dfuv*vec2(3.5,6.2)+vec2(0,-t*1.6),t*.65));
  float n2=snoise(vec3(dfuv*vec2(7.,12.)+vec2(0,-t*2.8),t*1.1));
  float n3=snoise(vec3(dfuv*vec2(14.,22.)+vec2(0,-t*4.2),t*1.8));
  float curl=snoise(vec3(dfuv.x*11.,dfuv.y*6.+t*.7,t*.35));

  float flame=mask;
  flame*=smoothstep(-.55,.75,n1+n2*.42+n3*.18+curl*.22);
  flame*=1.-smoothstep(.82+base*.26,1.14+base*.28,dfuv.y);
  flame=pow(max(flame,0.),mix(1.45,.82,base));

  float core=max(0.,1.-length(vec2((dfuv.x-.5)*2.6,dfuv.y*1.3-.22)));
  core=pow(core,2.8)*(.48+base*.62);

  /* ── 4. Smoke wisps — thickens with cumulative burns ── */
  float smokeN=smoothstep(.22,1.,snoise(vec3(uv*vec2(3.2,2.8)+vec2(0,-t*.22),t*.12)));
  float smokeBase=.14+cFactor*.12+drag*.05;
  float smoke=smokeN*smoothstep(.32,1.12,uv.y)*smokeBase;

  /* ── 5. Sparks (shader points, not particles) ── */
  float sparks=0.;
  if(base>.30){
    vec2 su=uv*vec2(14.,32.);
    float sn=snoise(vec3(su+vec2(0,-t*5.5),t*2.4));
    sparks=smoothstep(.86,1.,sn)*smoothstep(.08,1.1,uv.y)*base;
  }
  // Extra spark burst from drop pulse
  if(dropPulse>.01){
    vec2 su2=uv*vec2(18.,40.);
    float sn2=snoise(vec3(su2+vec2(0,-t*8.),t*3.));
    sparks+=smoothstep(.80,1.,sn2)*smoothstep(.05,1.,uv.y)*dropPulse*.9;
  }
  // Extra sparks when dragging close
  if(drag>.3){
    vec2 su3=uv*vec2(12.,28.);
    float sn3=snoise(vec3(su3+vec2(0,-t*6.),t*2.8));
    sparks+=smoothstep(.88,1.,sn3)*smoothstep(.1,.9,uv.y)*drag*.4;
  }

  /* ── 6. Burning pulse (during active burn phase) ── */
  float pulse=burning*(sin(t*8.)*.05+sin(t*13.)*.025+.07);

  /* ── 7. Paper flare flicker (quick bright flashes during burn) ── */
  float paperFlare=0.;
  if(burning>.1){
    float fl1=snoise(vec3(uv*6.,t*4.5));
    float fl2=snoise(vec3(uv*12.,t*7.));
    paperFlare=smoothstep(.72,1.,fl1*.6+fl2*.4)*mask*burning*.35;
  }

  /* ── 8. DROP PULSE — bright flash when files are thrown in ── */
  float dropFlash=dropPulse*mask*1.2;
  // Radial burst from center-bottom
  float dropRadial=dropPulse*max(0.,1.-length(vec2((uv.x-.5)*1.6,uv.y-.15))*2.2)*.6;

  /* ── 9. DRAG RESPONSE — flame brightens and light radius expands ── */
  // Warm glow that expands outward from the fire center
  float dragGlowRadius=.35+drag*.25;
  float dragGlow=drag*max(0.,1.-length(vec2((uv.x-.5)*1.2,(uv.y-.3)*.8))/dragGlowRadius)*.25;
  // Flame height boost
  float dragFlameBoost=drag*mask*.2;

  /* ── 10. ASH layer — post-burn glowing ember field ── */
  float ashNoise1=snoise(vec3(uv*vec2(16.,8.),t*.15));
  float ashNoise2=snoise(vec3(uv*vec2(28.,14.),t*.25));
  float ashSpread=.7+cFactor*.18; // ash pile grows
  float ashField=smoothstep(.45,1.,ashNoise1*.6+ashNoise2*.4)
                *(1.-smoothstep(0.,.35,uv.y))
                *smoothstep(ashSpread,0.,abs(uv.x-.5))
                *ash;
  float ashEdge=smoothstep(.3,.7,ashNoise1)
               *smoothstep(.6,.9,ashNoise2)
               *(1.-smoothstep(0.,.28,uv.y))
               *ash*.35
               *(0.7+0.3*sin(t*1.2+ashNoise1*4.));

  /* ── 11. LIGHT BLOOM — cumulative warm light from fire ── */
  float bloomRadius=.6+cFactor*.3+drag*.15;
  float bloom=max(0.,1.-length(vec2((uv.x-.5)*.8,(uv.y-.25)*.6))/bloomRadius);
  bloom=bloom*bloom*(.04+cFactor*.06+burning*.04);

  /* ── Color palette ── */
  vec3 deepRed =vec3(.20,.02,.01);
  vec3 crimson =vec3(.58,.08,.02);
  vec3 red     =vec3(.78,.14,.03);
  vec3 orange  =vec3(.96,.42,.05);
  vec3 gold    =vec3(1.,.78,.24);
  vec3 whiteHot=vec3(1.,.94,.82);

  float v=clamp(dfuv.y,0.,1.);
  vec3 flameColor=mix(deepRed,crimson,smoothstep(0.,.15,v));
  flameColor=mix(flameColor,red,smoothstep(.10,.30,v));
  flameColor=mix(flameColor,orange,smoothstep(.22,.55,v));
  flameColor=mix(flameColor,gold,smoothstep(.48,.82,v));
  flameColor=mix(flameColor,whiteHot,smoothstep(.75,1.,v)*base);
  flameColor=mix(flameColor,whiteHot,core*.52);

  /* ── Compose alpha ── */
  float alpha=clamp(
    flame*(.55+base*.48)
    +coal
    +ember
    +smoke
    +sparks*.75
    +pulse*mask
    +paperFlare
    +dropFlash
    +dropRadial
    +dragGlow
    +dragFlameBoost
    +ashField*.5
    +ashEdge*.4
    +bloom
  ,0.,1.);

  /* ── Compose color ── */
  vec3 coalColor  =vec3(.62,.16,.04);
  vec3 emberColor =vec3(.85,.28,.06);
  vec3 smokeColor =vec3(.38,.36,.34);
  vec3 sparkColor =vec3(1.,.88,.55);
  vec3 flareColor =vec3(1.,.92,.68);
  vec3 ashColor   =vec3(.55,.22,.08);
  vec3 ashEdgeCol =vec3(.85,.35,.10);
  vec3 bloomColor =vec3(.95,.55,.15);
  vec3 dragGlowCol=vec3(.90,.45,.12);

  vec3 fc=flameColor*(flame+dragFlameBoost)
    +coalColor*coal
    +emberColor*ember
    +smokeColor*smoke
    +sparkColor*sparks
    +flareColor*(paperFlare+dropFlash+dropRadial)
    +ashColor*ashField
    +ashEdgeCol*ashEdge
    +bloomColor*bloom
    +dragGlowCol*dragGlow;

  fragColor=vec4(fc,alpha);
}
