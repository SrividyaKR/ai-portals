import*as a from"three";import{makePath as Tt,lerp as T,smoothstep as b,clamp as he}from"../kit/core.js";import*as ke from"../kit/fx.js";import*as Ke from"../kit/fauna.js";import{FLORA_CAUSTIC_GLSL as _t}from"../kit/flora.js";const j=18.5,pt=["#ff7a5a","#ffc04a","#6adf9a","#4aa8ff","#c07aff","#ff8ac0"],Ot=p=>6*Math.sin(p*Math.PI*2.5),Dt=p=>40-160*p,re=[[0,-2.6],[.12,-2.8],[.27,-3.4],[.38,-5.2],[.45,-5.5],[.62,-5.4],[.7,-4.1],[.78,-3.5],[.88,-3.6],[1,-4.6]],Rt=p=>{for(let o=1;o<re.length;o++)if(p<=re[o][0])return T(re[o-1][1],re[o][1],b(re[o-1][0],re[o][0],p));return re[re.length-1][1]},Ce=(p,o,h,U,G)=>b(o,h,p)*(1-b(U,G,p)),x=p=>new a.Color(p),K=`
uniform vec3 uUp, uMid, uLow, uSunDir, uSunCol; uniform float uFogD, uTime, uT; uniform vec4 uWin[5]; uniform vec4 uHole;
vec3 waterTint(float vy){ return vy < 0. ? mix(uMid, uLow, smoothstep(0., -.55, vy)) : mix(uMid, uUp, smoothstep(0., .5, vy)); }
float fogK(vec3 w){ float L = length(w - cameraPosition)*uFogD; return 1. - exp(-L*L); }
vec3 wfog(vec3 col, vec3 w){ vec3 d = w - cameraPosition; return mix(col, waterTint(d.y/max(length(d), 1e-3)), fogK(w)); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.03 + 1.7)*.3 + vn(p*4.1 + 3.1)*.2; }
float winMask(vec2 p){
  float m = 0., e = vn(p*.13) - .5;
  for (int i = 0; i < 5; i++){ float d = length(p - uWin[i].xy) + e*uWin[i].z*.45; m = max(m, uWin[i].w*(1. - smoothstep(uWin[i].z*.5, uWin[i].z, d))); }
  return m;
}
// how much sun reaches a point under the ice: follow the light back up to the ice and read the windows there
float sunAt(vec3 w){ vec2 q = w.xz - uSunDir.xz*(w.y/uSunDir.y); float hd = length(q - uHole.xy); return max(winMask(q), uHole.w*(1. - smoothstep(uHole.z, uHole.z*3., hd))); }
${_t}
`,Et=`
attribute vec3 aTint;
varying vec3 vW, vN, vObj, vTint;
void main(){
  vec4 p = vec4(position, 1.); vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix*p; n = mat3(instanceMatrix)*n;
  #endif
  vec4 w = modelMatrix*p; vW = w.xyz; vN = normalize(mat3(modelMatrix)*n); vObj = position;
  #ifdef TINT
    vTint = aTint;
  #else
    vTint = vec3(1.);
  #endif
  gl_Position = projectionMatrix*viewMatrix*w;
}`,jt=`
uniform vec3 uSilt, uAlgae, uBark; uniform float uGain; uniform vec4 uVent[12];
varying vec3 vW, vN, vObj, vTint;
${K}
void main(){
  vec3 N = normalize(vN); float dist = length(vW - cameraPosition), fine = 1. - smoothstep(14., 45., dist), depth = -vW.y;
  vec3 alb;
#if KIND == 0
  // silt: mottled ochre-grey, old ripples across the current, green algae in patches, pocked rings round the seeps
  float m = vn(vW.xz*.31)*.5 + vn(vW.xz*1.27 + 4.)*.3 + vn(vW.xz*4.3 + 9.)*.2*fine;
  alb = uSilt*(.7 + .55*m);
  float a = smoothstep(.5, .78, vn(vW.xz*.085 + 3.)*.7 + vn(vW.xz*.55)*.3);
  alb = mix(alb, uAlgae*(.75 + .5*m), a*.35);
  float rp = sin(dot(vW.xz, vec2(.83, .52))*2.6 + vn(vW.xz*.35)*5.)*.5 + .5;
  alb *= 1. - .14*rp*fine;
  alb *= .9 + .2*smoothstep(-11.5, -7.5, vW.y);                    // the old channel is darker than the banks
  for (int i = 0; i < 12; i++){
    float d = length(vW.xz - uVent[i].xy)/max(uVent[i].z, .01);
    float ring = exp(-pow((d - .7)/.25, 2.)), pit = 1. - smoothstep(0., .45, d);
    vec2 c = floor(vW.xz*7.); float pock = step(.72, h21(c))*smoothstep(.35, .1, length(fract(vW.xz*7.) - .5))*smoothstep(1.4, .5, d);
    alb *= 1. - uVent[i].w*(.25*ring + .55*pit + .45*pock);
    alb = mix(alb, uSilt*1.25, uVent[i].w*ring*.3);
  }
#elif KIND == 1
  // drowned spruce: grey bark split in long furrows, the broken top paler, furred with green algae on whatever faces up
  float ang = atan(vObj.z, vObj.x);
  float furrow = smoothstep(.25, .65, vn(vec2(ang*4.5, vObj.y*.9)));
  float grain = vn(vec2(ang*11., vObj.y*5.));
  alb = uBark*(.6 + .35*grain)*(.65 + .45*furrow);
  float fur = clamp(smoothstep(-.2, .8, N.y) + (vn(vW.xz*2.1 + vW.y*1.7) - .5)*.7, 0., 1.);
  alb = mix(alb, uAlgae*(.6 + .6*vn(vW.xz*6. + vW.y)), fur*.65);
  alb *= vTint;
#else
  // river cobbles: pale stone, some green with algae on the top
  alb = vTint*(.78 + .35*vn(vW.xz*7. + vW.y*5.));
  alb = mix(alb, uAlgae, smoothstep(.55, .95, N.y)*.35*smoothstep(.4, .7, vn(vW.xz*3.)));
#endif
  // light scattered in the water from everywhere (never black), plus the sun through the windows with its caustic web
  vec3 amb = mix(uLow*.9, uUp*.62, N.y*.5 + .5)*vec3(1.5, 1., .85);
  float sun = .5 + .5*sunAt(vW);
  float cau = floraCaustic(vW.xz*.3 + vW.y*.06, uTime*.42);
  float ndl = max(dot(N, -uSunDir), 0.);
  vec3 L = amb + uSunCol*sun*ndl*(.12 + 1.9*cau*(.35 + .65*fine))*exp(-depth*.03);
  vec3 col = alb*L*uGain;
  col.r *= exp(-depth*.03);                                       // red is the first colour the water takes
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`,Gt=`
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,Lt=`
uniform vec3 uIce, uWinC, uBlack, uCrack;
varying vec3 vW;
${K}
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
vec3 vor(vec2 x){                               // nearest distance, distance to the nearest edge, cell id
  vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){ vec2 g = vec2(float(i), float(j)), r = g + h22(n + g) - f; float d = dot(r, r); if (d < md){ md = d; mr = r; mg = g; } }
  float ed = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){ vec2 g = mg + vec2(float(i), float(j)), r = g + h22(n + g) - f; if (dot(mr - r, mr - r) > 1e-5) ed = min(ed, dot(.5*(mr + r), normalize(r - mr))); }
  return vec3(sqrt(md), ed, h22(n + mg).x);
}
void main(){
  vec2 p = vW.xz; float dist = length(vW - cameraPosition), nearK = 1. - smoothstep(12., 60., dist);
  vec2 wq = vec2(fbm(p*.035), fbm(p*.035 + 7.3));
  vec2 q = p/6.5 + 2.3*wq + .25*vec2(vn(p*.4), vn(p*.4 + 5.));
  vec3 v = vor(q);                                                  // the plates
  float w1 = .005 + fwidth(v.y)*1.;
  float crack = (1. - smoothstep(0., w1, v.y))*smoothstep(.45, .7, vn(p*.07 + 3.))*(1. - .7*smoothstep(30., 120., dist));
  float seam = exp(-v.y*14.)*.5;                                    // the plate edges catch more light
  vec3 v2 = vor(q*3.3 + 11.);                                       // crazing inside the plates
  float craze = (1. - smoothstep(0., .018 + fwidth(v2.y)*1.2, v2.y))*nearK*smoothstep(.4, .7, vn(p*.3 + 5.));
  // the long pressure cracks: wandering lines across many plates, thin
  float s1 = (p.x*.62 + p.y*.78)/48. + 1.1*fbm(p*.022 + 2.) + .15*vn(p*.2), fz = abs(fract(s1) - .5);
  float ridge = (1. - smoothstep(0., .002 + fwidth(s1)*1.2, fz))*smoothstep(.4, .6, vn(p*.03 + 8.));
  float snow = smoothstep(.38, .72, fbm(p*.016 + 1.)*.75 + vn(p*.09)*.25);
  float win = winMask(p);
  vec3 base = uIce*(.55 + .26*v.z + .12*seam)*(.88 + .24*vn(p*.45));
  base = mix(base, vec3(dot(base, vec3(.3, .5, .2)))*vec3(.9, .96, 1.)*.7, snow*.75);     // snow lies on top: milky and dim
  // black ice: dark blue-green, with the sun burning through it in soft moving patches
  float sunny = .45 + .55*smoothstep(.25, .85, fbm(p*.11 + vec2(uTime*.02, -uTime*.013)));
  vec3 blk = mix(uBlack, uWinC*.86, sunny*(.55 + .45*smoothstep(.5, 1., win)));
  vec3 col = mix(base, blk, win);
  col = mix(col, uCrack*.7, clamp(crack*.4 + ridge*.35 + craze*.12, 0., 1.)*(1. - .4*win));
  // air specks frozen in the ice, only near
  vec2 c = floor(p*2.6); vec2 o = h22(c + 3.) - .5;
  float speck = step(.82, h21(c))*smoothstep(.09, .02, length(fract(p*2.6) - .5 - o*.6))*(1. - smoothstep(6., 22., dist));
  col += uCrack*speck*.35;
  // the ice-fishing hole: daylight itself, and the ice round it lit
  float hd = length(p - uHole.xy);
  col += uWinC*.35*uHole.w*exp(-max(hd - uHole.z, 0.)*.45);
  col = mix(col, uWinC*.95, uHole.w*(1. - smoothstep(uHole.z*.85, uHole.z, hd)));
  col = min(col, vec3(.72));
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`,Ht=`
attribute vec4 aI; attribute vec3 aHue;               // aI = time the colour wave reaches the column, place down the column (0 top), column id, seed
uniform vec2 uTouch; uniform float uTime;
varying vec3 vW, vN, vHue; varying vec4 vI; varying float vLY;
void main(){
  vec4 w = modelMatrix*instanceMatrix*vec4(position, 1.);
  float sh = (aI.z == uTouch.x ? 1. : 0.)*uTouch.y*smoothstep(.5, .85, aI.y);           // the lower discs of the touched column shiver
  w.x += sh*.09*sin(uTime*13. + aI.y*17.); w.z += sh*.07*cos(uTime*11. + aI.y*23.);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); vHue = aHue; vI = aI; vLY = position.y/.35;
  gl_Position = projectionMatrix*viewMatrix*w;
}`,Kt=`
uniform vec3 uSilver, uIceB;
varying vec3 vW, vN, vHue; varying vec4 vI; varying float vLY;
${K}
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float ndv = abs(dot(N, V)), fres = pow(1. - ndv, 2.2);
  float top = smoothstep(.15, .9, N.y), under = 1. - smoothstep(0., .06, vLY);
  float sun = .35 + .65*sunAt(vW);
  vec3 col = uIceB*(.42 + .12*fract(vI.w*7.)) + uSilver*(.16 + fres*1.6*.75) + uSilver*top*.5*sun;
  col += uSilver*under*.12*sun;
  float a = mix(.55, .95, fres);
  // the dye: it tints the disc and lights it softly from inside, and a crest runs down the column from the ice
  float dt = uT - vI.x - vI.y*.6;
  float lit = smoothstep(0., .8, dt), crest = exp(-pow((dt - .2)/.2, 2.));
  float lum = dot(col, vec3(.3, .5, .2));
  col = mix(col, vHue*(lum*.9 + .05), .6*lit);
  col += vHue*(.4*lit*(.55 + .45*fres) + .5*crest)*sun;
  a = max(a, .62*lit);
  float rimLine = 1. - smoothstep(.03, .13, ndv);
  col *= 1. - .7*rimLine; a = max(a, rimLine*.9);
  col = min(col, vec3(1.1));
  float fk = fogK(vW);
  vec3 d = vW - cameraPosition;
  gl_FragColor = vec4(mix(col, waterTint(d.y/length(d)), fk), a*(1. - .65*fk));
}`,qt=`
varying vec2 vUv; varying vec3 vW; varying float vS;
void main(){ vUv = position.xz; vec4 w = modelMatrix*instanceMatrix*vec4(position, 1.); vW = w.xyz; vS = instanceMatrix[3].x*.37 + instanceMatrix[3].z*.71; gl_Position = projectionMatrix*viewMatrix*w; }`,Yt=`
uniform vec3 uFrost; varying vec2 vUv; varying vec3 vW; varying float vS;
${K}
void main(){
  float d = length(vUv), an = atan(vUv.y, vUv.x);
  float arms = pow(abs(sin(an*3.5 + vS)), 6.)*(1. - d) + pow(abs(sin(an*6. + vS*2.)), 12.)*(1. - d)*.6;
  float a = (smoothstep(1., .2, d + (vn(vUv*4. + vS) - .5)*.4)*.35 + arms*.5)*(1. - smoothstep(.9, 1., d));
  a *= 1. - fogK(vW);
  if (a < .01) discard;
  gl_FragColor = vec4(uFrost, a*.7);
}`,Qt=`
attribute vec4 aP, aR, aQ;              // aP birth position + birth clock; aR drift x, drift z, size, seed; aQ ceiling, rise speed, period
uniform float uClock, uPx;
varying vec2 vUv; varying float vA, vSeed; varying vec3 vW;
uniform float uTime;
void main(){
  float age = uClock - aP.w; if (aQ.z > 0.) age = mod(age, aQ.z);
  float life = max((aQ.x - aP.y)/aQ.y, .1), k = clamp(age/life, 0., 1.), on = step(0., age)*step(age, life);
  vec3 p = vec3(aP.x + aR.x*k + sin(uTime*2.3 + aR.w*40.)*.05*k, aP.y + age*aQ.y, aP.z + aR.y*k + cos(uTime*2.1 + aR.w*30.)*.05*k);
  float sz = aR.z*(.8 + .5*k);
  vec4 mv = viewMatrix*vec4(p, 1.);
  float grow = max(1., 1.6*max(-mv.z, .1)/max(sz*uPx, 1e-3));
  mv.xy += position.xy*sz*grow;
  vW = p; vUv = position.xy; vSeed = aR.w;
  vA = on*smoothstep(0., .06, k)*(1. - smoothstep(.92, 1., k))*smoothstep(.8, 3., -mv.z)/grow;
  gl_Position = on > .5 ? projectionMatrix*mv : vec4(2., 2., 2., 1.);
}`,$t=`
uniform vec3 uBub; varying vec2 vUv; varying float vA, vSeed; varying vec3 vW;
${K}
void main(){
  float d = length(vUv); if (d > 1.) discard;
  float soft = 1. - smoothstep(0., 1., d); soft *= soft;
  float ring = smoothstep(.5, .8, d)*(1. - smoothstep(.82, 1., d));
  vec2 g = vUv - vec2(-.3, .38); float glint = exp(-dot(g, g)*14.);
  float sun = .45 + .55*sunAt(vW);
  vec3 col = uBub*(.7 + .3*fract(vSeed*5.3))*sun + uSunCol*glint*.7*sun;
  gl_FragColor = vec4(wfog(col, vW), vA*clamp(soft*.3 + ring*.75 + glint*.6, 0., 1.)*(1. - fogK(vW)*.6));
}`,Xt=`
attribute vec4 aPos, aCol; attribute float aSeed;
varying vec2 vUv; varying vec4 vCol; varying float vSeed, vF; varying vec3 vW;
void main(){
  vec4 mv = viewMatrix*vec4(aPos.xyz, 1.);
  float r = aPos.w; mv.xy += position.xy*r;
  vUv = position.xy; vCol = aCol; vSeed = aSeed; vW = aPos.xyz;
  vF = smoothstep(.6 + r*.3, 2.5 + r, -mv.z);                    // the lens passes through the ink without a flat smear
  gl_Position = aCol.a > .002 ? projectionMatrix*mv : vec4(2., 2., 2., 1.);
}`,Zt=`
varying vec2 vUv; varying vec4 vCol; varying float vSeed, vF; varying vec3 vW;
${K}
void main(){
  float d = length(vUv);
  float n = vn(vUv*2.2 + vSeed*13. + uTime*.08)*.6 + vn(vUv*5. - vSeed*7.)*.4;
  float a = smoothstep(1., .15, d + (n - .5)*.75);
  float lit = (.62 + .45*(vUv.y*.5 + .5))*(.7 + .5*sunAt(vW));    // lit from the ice above
  vec3 col = vCol.rgb*lit*(.85 + .3*n);
  float fk = fogK(vW);
  gl_FragColor = vec4(wfog(col, vW), a*vCol.a*vF*(1. - fk*.7));
}`,Jt=`
uniform float uPhase, uAmp, uBend;
varying vec3 vObj, vN, vW, vCol;
void main(){
  vec3 p = position; float zn = p.z/.6, w = .5 - zn;               // 0 at the nose, 1 at the tail
  float a = uAmp*(.012 + .09*w*w);
  p.x += a*sin(uPhase*6.2832 - w*4.2) + uBend*w*w*.12;
  vObj = position; vCol = color;
  vec4 wp = modelMatrix*vec4(p, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*wp;
}`,eo=`
uniform vec3 uWhite, uOrange, uIndigo, uPink; uniform vec3 uDye;
varying vec3 vObj, vN, vW, vCol;
${K}
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float zn = vObj.z/.6, fin = step(.5, vCol.g);
  float pat = vn(vObj.zx*vec2(14., 22.) + vec2(3., 1.))*.7 + vn(vObj.zy*40.)*.3;
  float back = smoothstep(-.04, .03, vObj.y);
  vec3 alb = mix(uWhite, uOrange, smoothstep(.3, .38, pat)*smoothstep(-.07, .0, vObj.y)*(1. - smoothstep(.36, .46, zn)));
  alb = mix(alb, uOrange, smoothstep(.4, .48, zn)*.85*back);                              // the red cap
  float saddle = bell2(zn);
  alb = mix(alb, uIndigo, saddle);
  alb = mix(alb, uPink, smoothstep(.22, .34, zn)*(1. - smoothstep(.4, .47, zn))*smoothstep(.0, .05, abs(vObj.x))*(1. - back*.6)*.7);
  alb = mix(alb, mix(uWhite, uOrange, .35), fin*.85);
  float up = N.y*.5 + .5, fres = pow(1. - abs(dot(N, V)), 2.);
  float sun = .4 + .6*sunAt(vW);
  float cau = floraCaustic(vW.xz*.9, uTime*.5);
  vec3 L = mix(uLow*1.6 + uSunCol*.08, uUp*.9 + uSunCol*.75*sun, up) + uSunCol*smoothstep(.4, 1., N.y)*cau*.35*sun + uUp*fres*.5;
  vec3 col = alb*L;
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`,to=`
float bell2(float zn){ return smoothstep(-.2, -.1, zn)*(1. - smoothstep(.1, .2, zn))*smoothstep(.0, .04, vObj.y)*smoothstep(.35, .55, vn(vObj.zx*vec2(18., 30.) + 7.))*.75; }
`,oo=`
attribute vec4 aF;                       // kind (0 pectoral, 1 streamer), along 0..1, side, across -1..1
uniform float uPhase, uAmp, uSpread, uBend, uTime;
varying float vAlong, vAcross; varying vec3 vW;
void main(){
  vec3 p = position; float s = aF.y;
  if (aF.x < .5){
    float sp = uSpread + .12*sin(uTime*3.1 + aF.z);               // sculling
    float ang = sp*s;
    p.x = position.x + aF.z*s*.26*cos(ang*.5);
    p.y = position.y - s*.09 - s*s*.05*(1. - uSpread);
    p.z = position.z - s*.22*(1.15 - uSpread*.6) + s*s*.04*sin(uTime*4. + aF.z*2.);
  } else {
    float w = 1. + s*.9;                                          // past the tail
    p.x += uAmp*(.012 + .09*w*w)*sin(uPhase*6.2832 - w*4.2 - s*2.2) + uBend*w*w*.12 + .02*s*s*sin(uTime*3. + aF.w*4.);
    p.y += .015*s*sin(uTime*2.2 + aF.w*5.);
  }
  vAlong = s; vAcross = aF.w;
  vec4 wp = modelMatrix*vec4(p, 1.); vW = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`,ao=`
uniform vec3 uWhite, uOrange;
varying float vAlong, vAcross; varying vec3 vW;
${K}
void main(){
  float veins = .8 + .2*sin(vAcross*28.);
  vec3 col = mix(uWhite, uOrange, .3 + .3*vAlong)*(uUp*2.3 + uSunCol*.35)*veins;
  float a = .62*(1. - vAlong*.55)*(1. - smoothstep(.75, 1., abs(vAcross)));
  gl_FragColor = vec4(wfog(col, vW), a);
}`,no="varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }",ro=`varying vec3 vD; ${K} void main(){ gl_FragColor = vec4(waterTint(vD.y/length(vD)), 1.); }`,so=`
varying vec3 vW, vN; varying float vY;
void main(){ vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vY = uv.y; gl_Position = projectionMatrix*viewMatrix*w; }`,io=`
uniform float uK; varying vec3 vW, vN; varying float vY;
${K}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float edge = pow(abs(dot(normalize(vN), V)), 1.6);              // soft across the shaft
  float n = .7 + .3*vn(vec2(atan(vW.z - uHole.y, vW.x - uHole.x)*3., vW.y*.4 - uTime*.15));
  float I = edge*n*smoothstep(0., .35, vY)*uK;
  gl_FragColor = vec4(uSunCol*I*.16*(1. - fogK(vW)*.5), 0.);
}`,co="varying vec2 vUv; varying vec3 vW; void main(){ vUv = position.xz; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",lo=`
uniform vec3 uSilver; uniform float uK; varying vec2 vUv; varying vec3 vW;
${K}
void main(){
  float d = length(vUv) + (vn(vUv*3. + uTime*.6) - .5)*.25;
  if (d > 1.) discard;
  float rip = .5 + .5*sin(d*16. - uTime*5.5 + vn(vUv*5.)*3.);
  vec3 col = uSilver*(.55 + .35*rip + .4*smoothstep(.75, .95, d));
  col *= 1. - .6*smoothstep(.93, 1., d);
  gl_FragColor = vec4(wfog(col, vW), uK*.92);
}`;function gt(p){const o=new a.InstancedBufferGeometry;return o.setAttribute("position",new a.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3)),o.setIndex([0,1,2,0,2,3]),o.instanceCount=p,o}function wt(p){const o=new a.CylinderGeometry(1,1,1,14,9,!1),h=o.attributes.position,U=p.range(0,6.28),G=p.int(4,6),v=Array.from({length:14},()=>p.range(0,.45));for(let _=0;_<h.count;_++){let Q=h.getX(_),z=h.getY(_)+.5,L=h.getZ(_);const C=Math.atan2(L,Q),se=Math.hypot(Q,L),J=(Math.round((C+Math.PI)/(2*Math.PI)*14)%14+14)%14,N=1+1.3*Math.pow(1-b(0,.32,z),2)*(.35+.65*Math.pow(Math.max(0,Math.cos(C*G+U)),3)),$=1-.18*z,R=1+.06*Math.sin(C*9+z*7)*Math.sin(C*3+1),ie=N*$*R;z>.99?z=1-v[J]*(se>.5?1:.4):z>.85&&(z=Math.min(z,1-v[J]*.8+(z-.85))),h.setXYZ(_,Q*ie,z,L*ie)}return o.computeVertexNormals(),o}function uo(){const p=new a.CylinderGeometry(.78,1,1,10,12,!1),o=p.attributes.position;for(let h=0;h<o.count;h++){const U=o.getX(h),G=o.getY(h),v=o.getZ(h),_=Math.atan2(v,U),Q=1+.07*Math.sin(G*19+_*3)+.12*Math.max(0,Math.sin(G*7.3+1))*Math.max(0,Math.cos(_*2+G*3));o.setXYZ(h,U*Q,G,v*Q)}return p.rotateX(Math.PI/2),p.computeVertexNormals(),p}var ho={id:"ice-bubble-lake",name:"Under the Ice",category:"wilderness",weirdness:.6,media:["water"],async build(p){const o=p.rng,h=new a.Scene,U=async()=>{p.yield&&await p.yield()},G=[],v=e=>(G.push(e),e),_=[],Q=[];for(let e=0;e<=60;e++){const t=e/60;Q.push([Ot(t),Rt(t),Dt(t)])}const z=Tt(Q),L=z.length,C=600,se=new Float32Array(C+1),J=new Float32Array(C+1),N=new Float32Array(C+1);{const e=new a.Vector3;for(let t=0;t<=C;t++)z.pointAt(t/C,e),se[t]=e.x,J[t]=e.y,N[t]=e.z}const $=e=>{if(e>=N[0])return[se[0],J[0],-(e-N[0])/L];if(e<=N[C])return[se[C],J[C],1+(N[C]-e)/L];let t=he(Math.floor((N[0]-e)/(N[0]-N[C])*C),0,C-1);for(;t>0&&N[t]<e;)t--;for(;t<C-1&&N[t+1]>e;)t++;const n=(N[t]-e)/Math.max(N[t]-N[t+1],1e-6);return[T(se[t],se[t+1],n),T(J[t],J[t+1],n),(t+n)/C]},R=(e,t)=>{const n=$(t)[0],s=n+3*Math.sin(t*.045+1),r=b(-8,-22,t)*(1-b(-70,-86,t)),c=T(-11.4,-8.9,r),l=T(-7.6,-7,r);let i=c+(l-c)*b(3.5,20,Math.abs(e-s));return i+=.35*Math.sin(e*.21+t*.13)*Math.sin(t*.17-e*.07)+.18*Math.sin(e*.6+1.3)*Math.cos(t*.5),i=T(i,-.3,Math.pow(b(-46,-88,e),1.4)),i=T(i,-4.5,b(60,115,e)*.7),Math.min(i,-.3)},ie=new a.Vector3(.42,-1,.12).normalize(),qe=[[3,21,10,1],[-15,-12,10,.8],[17,-46,9,.8],[2,-90,21,1],[-26,-60,8,.6]],Ye=z.end.clone(),B={uUp:{value:x("#3c86a8")},uMid:{value:x("#2a6a8c")},uLow:{value:x("#1a4a66")},uSunDir:{value:ie},uSunCol:{value:x("#fff4dc")},uFogD:{value:.017},uTime:{value:0},uT:{value:0},uWin:{value:qe.map(e=>new a.Vector4(...e))},uHole:{value:new a.Vector4(Ye.x,Ye.z-1.5,1.1,1)}};h.fog=new a.FogExp2(new a.Color("#2a6a8c"),.017),h.background=new a.Color("#2a6a8c");{const e=v(new a.ShaderMaterial({uniforms:B,vertexShader:no,fragmentShader:ro,side:a.BackSide,depthWrite:!1,depthTest:!1})),t=new a.Mesh(v(new a.SphereGeometry(600,32,16)),e);t.renderOrder=-10,t.frustumCulled=!1,h.add(t)}await U();const ue=[],Qe={value:Array.from({length:12},()=>new a.Vector4(0,0,1,0))},Pe=(e,t={})=>v(new a.ShaderMaterial({vertexShader:Et,fragmentShader:jt,defines:{KIND:e,...t.tint?{TINT:1}:{}},uniforms:{...B,uSilt:{value:x("#8a7a58")},uAlgae:{value:x("#5f7a48")},uBark:{value:x("#7a766a")},uGain:{value:t.gain??1},uVent:Qe}}));{const e=v(new a.PlaneGeometry(220,260,110,130));e.rotateX(-Math.PI/2),e.translate(5,0,-55);const t=e.attributes.position;for(let s=0;s<t.count;s++)t.setY(s,R(t.getX(s),t.getZ(s)));e.computeVertexNormals();const n=new a.Mesh(e,Pe(0));n.frustumCulled=!1,h.add(n)}await U();const q=[],me=2.2,ye=new Map,xt=(e,t)=>Math.floor(e/me)+","+Math.floor(t/me),$e=(e,t,n)=>{const s=Math.ceil(n/me),r=Math.floor(e/me),c=Math.floor(t/me);for(let l=-s;l<=s;l++)for(let i=-s;i<=s;i++){const f=ye.get(r+l+","+(c+i));if(f){for(const m of f)if(Math.hypot(m.x-e,m.z-t)<Math.max(n,m.md))return!0}}return!1},Ie=(e,t,n={})=>{const s=$(t),r=e-s[0],c={x:e,z:t,lat:r,u:s[2],hue:n.hue??o.int(0,5),md:n.md??2.2,id:q.length,opt:n};q.push(c);const l=xt(e,t);return ye.has(l)||ye.set(l,[]),ye.get(l).push(c),c},ee=new a.Vector3,de=new a.Vector3,ce=new a.Vector3,Fe=2.3,ve=.4,yt=e=>{const t=(e+.25)/Fe,n=t-Math.floor(t);return n<ve?b(0,ve,n):1-b(ve,1,n)},Ve=e=>T(4.4,5,b(0,2.2,e))+1*yt(e)-.5+15*Math.pow(Math.max(0,e-16.4),2),Ue=(e,t)=>{const n=e/j*L+Ve(e);z.posAtDist(n+.5,ee),z.posAtDist(n-.5,de);const s=ee.x-de.x,r=ee.z-de.z,c=Math.hypot(s,r)||1,l=-r/c,i=s/c;z.posAtDist(n,t);const f=1.3*Math.sin(e*1.1+.5)+.4*Math.sin(e*2.3);return t.x+=l*f,t.z+=i*f,t.y+=-.25+.45*Math.sin(e*.8+1)+.2*Math.sin(e*1.9),t.rx=l,t.rz=i,t},H=Ue(4.6,new a.Vector3),te=(()=>{const e=new a.Vector3;return z.posAtDist(4.6/j*L+Ve(4.6),e),new a.Vector3(e.x+H.rx*7.6,H.y,e.z+H.rz*7.6)})(),fe=Ie(te.x,te.z,{md:3.2,n:14,bottom:H.y-1.6,r0:1.3,hue:3}),Mt=new a.Vector3(te.x-H.rx*1.75,H.y+.2,te.z-H.rz*1.75),Y=Ue(9.5,new a.Vector3),E=(()=>{const e=new a.Vector3;z.posAtDist(9.5/j*L+Ve(9.5),e);const t=e.x-Y.rx*9.4,n=e.z-Y.rz*9.4;return new a.Vector3(t,R(t,n),n)})(),Be=new a.Vector3(E.x+Y.rx*1.25,E.y+.45,E.z+Y.rz*1.25),Me={x:E.x-Y.rz*2.2-Y.rx*.6,z:E.z+Y.rx*2.2-Y.rz*.6},Xe=Ie(Me.x,Me.z,{md:2.4,bottom:-4.2});for(let e=0;e<2e4&&q.length<460;e++){const t=o.range(64,-170),n=$(t),s=o()<.82?n[0]+(o()<.5?-1:1)*o.range(7,38):o.range(-54,98),r=Math.abs(s-n[0]);if(r<7.1||R(s,t)>-4||o()>.55+.45*b(7,14,r)||r>55&&o()<.45)continue;const c=r<25?2.2+o()*.6:2.4+(r-25)*.07+o()*1.4;$e(s,t,c)||Ie(s,t,{md:c})}ue.push({x:Me.x,z:Me.z,col:Xe});{const e=q.filter(t=>t.z<-14&&t.z>-80&&Math.abs(t.lat)>7&&Math.abs(t.lat)<14&&t!==Xe&&t!==fe);for(let t=0;t<40&&ue.length<11&&e.length;t++){const n=e.splice(o.int(0,e.length-1),1)[0];ue.every(s=>Math.hypot(s.x-n.x,s.z-n.z)>7)&&ue.push({x:n.x+o.range(-.3,.3),z:n.z+o.range(-.3,.3),col:n})}}ue.forEach((e,t)=>{e.y=R(e.x,e.z),e.col.seep=e,Qe.value[t].set(e.x,e.z,o.range(.8,1.2),1)});const bt=.1;for(const e of q){let t=1e4;e.u>=fe.u-.012&&(t=4.6+Math.max(0,e.u-fe.u-.05)/bt+Math.abs(e.lat)*.03+o.range(0,.3)),e.z<-70&&e.z>-118&&Math.abs(e.lat)<45&&(t=Math.min(t,12.4+o.range(0,.9)+Math.abs(e.lat)*.012)),e.tL=e===fe?4.65:t}q.filter(t=>t.z<36&&t.z>14).sort((t,n)=>Math.abs(t.lat)-Math.abs(n.lat)).slice(0,2).forEach((t,n)=>{t.tL=1.1+n*.3,t.hue=n?5:1});const be=[],Ze=(e,t,n,s,r,c,l)=>{const i=o.range(.25,.6),f=[o.range(-.4,.4),o.range(-.4,.4)],m=o.range(.3,.9),P=o.range(0,6.28),I=o.range(.6,1.7);let d=-.18-o.range(0,.1);const g=R(e.x,e.z);for(let F=0;F<s;F++){F>0&&(d-=i*o.range(.8,1.3));const u=s>1?F/(s-1):0;if(d<Math.max(g+1.3,c))break;if(F>1&&o()<.1)continue;const S=he(r*(1-.62*Math.pow(u,I))*o.range(.82,1.15),.3,1.4)*(l?1.1:1),V=f[0]*u+.22*Math.sin(u*6*m+P),ne=f[1]*u+.22*Math.cos(u*5*m+P);be.push({x:e.x+t+V,y:d,z:e.z+n+ne,r:S,th:o.range(.55,.88),f:u,c:e,hue:o()<.25?(e.hue+1)%6:e.hue,tx:o.range(-.08,.08),tz:o.range(-.08,.08),s:o()})}return d};for(const e of q){const t=Math.abs(e.lat),n=t>40,s=!e.opt.n&&o()<.15;let r=e.opt.n??(s?o.int(3,5):o.int(6,25));n&&(r=Math.min(r,o.int(5,11)));const c=e.opt.r0??o.range(.7,1.4);let l=e.opt.bottom??-20;if(e.seep&&(l=Math.max(l,e.seep.y+2.2)),t<11&&(l=Math.max(l,-5.2)),e.seep&&!e.opt.n&&(r=Math.max(r,16)),e.tip=Ze(e,0,0,r,c,l,n),o()<.12&&!e.opt.n){const i=o.range(0,6.28),f=o.range(.55,.95);Ze(e,Math.cos(i)*f,Math.sin(i)*f,Math.round(r*o.range(.4,.8)),c*.8,l,n)}}be.sort((e,t)=>e.z-t.z);const Ne=be.length;{const e=[[.001,0],[.78,0],[.95,.025],[1,.08],[.94,.17],[.74,.26],[.42,.33],[.001,.35]].map(([u,S])=>new a.Vector2(u,S)),t=v(new a.LatheGeometry(e,15)),n=new Float32Array(Ne*4),s=new Float32Array(Ne*3),r=pt.map(x),c=v(new a.ShaderMaterial({vertexShader:Ht,fragmentShader:Kt,transparent:!0,depthWrite:!1,uniforms:{...B,uSilver:{value:x("#dfe9ec")},uIceB:{value:x("#6f9fb4")},uTouch:{value:new a.Vector2(fe.id,0)}}})),l=new a.InstancedMesh(t,c,Ne),i=new a.Matrix4,f=new a.Quaternion,m=new a.Euler,P=new a.Vector3,I=new a.Vector3;be.forEach((u,S)=>{P.set(u.x,u.y,u.z),f.setFromEuler(m.set(u.tx,u.s*6.28,u.tz)),I.set(u.r,u.r*u.th,u.r),l.setMatrixAt(S,i.compose(P,f,I)),n[S*4]=u.c.tL,n[S*4+1]=u.f,n[S*4+2]=u.c.id,n[S*4+3]=u.s;const V=r[u.hue];s[S*3]=V.r,s[S*3+1]=V.g,s[S*3+2]=V.b}),t.setAttribute("aI",new a.InstancedBufferAttribute(n,4)),t.setAttribute("aHue",new a.InstancedBufferAttribute(s,3)),l.frustumCulled=!1,l.renderOrder=4,h.add(l),_.push(u=>{c.uniforms.uTouch.value.y=b(4.45,4.7,u)*(1-b(5.2,6.6,u))});const d=v(new a.CircleGeometry(1,20));d.rotateX(Math.PI/2);const g=v(new a.ShaderMaterial({vertexShader:qt,fragmentShader:Yt,transparent:!0,depthWrite:!1,uniforms:{...B,uFrost:{value:x("#e8f6f4")}}})),F=new a.InstancedMesh(d,g,q.length);q.forEach((u,S)=>{P.set(u.x,-.03,u.z),f.setFromEuler(m.set(0,o.range(0,6.28),0));const V=o.range(1.4,2.6);I.set(V,1,V*o.range(.8,1.2)),F.setMatrixAt(S,i.compose(P,f,I))}),F.frustumCulled=!1,F.renderOrder=2,h.add(F)}await U();{const e=v(new a.PlaneGeometry(700,700));e.rotateX(Math.PI/2),e.translate(0,0,-50);const t=v(new a.ShaderMaterial({vertexShader:Gt,fragmentShader:Lt,side:a.DoubleSide,uniforms:{...B,uIce:{value:x("#7fb6c8")},uWinC:{value:x("#bfe6e0")},uBlack:{value:x("#1d4a52")},uCrack:{value:x("#e8f6f4")}}})),n=new a.Mesh(e,t);n.frustumCulled=!1,h.add(n)}await U();{const e=Pe(1,{tint:!0,gain:1.3}),t=[v(wt(o)),v(wt(o))],n=[[],[]];n[0].push({x:E.x,z:E.z,h:1.5,r:.6,rot:o.range(0,6.28)});for(let M=0;M<900&&n[0].length+n[1].length<36;M++){const W=o()<.72,y=W?o.range(-12,-82):o.range(60,-160),w=W&&o()<.65?$(y)[0]+(o()<.5?-1:1)*o.range(6,12):o.range(-48,80),A=Math.abs(w-$(y)[0]);A<6||!W&&A<9.5||R(w,y)>-5.5||$e(w,y,1.4)||[...n[0],...n[1]].some(O=>Math.hypot(O.x-w,O.z-y)<4)||n[o()<.5?0:1].push({x:w,z:y,h:o.range(.6,1.8),r:o.range(.3,.7),rot:o.range(0,6.28)})}const s=new a.Matrix4,r=new a.Quaternion,c=new a.Euler,l=new a.Vector3,i=new a.Vector3;n.forEach((M,W)=>{const y=new a.InstancedMesh(t[W],e,M.length),w=new Float32Array(M.length*3);M.forEach((A,O)=>{l.set(A.x,R(A.x,A.z)-.12,A.z),r.setFromEuler(c.set(o.range(-.08,.08),A.rot,o.range(-.08,.08))),i.set(A.r,A.h,A.r*o.range(.85,1.15)),y.setMatrixAt(O,s.compose(l,r,i));const k=o.range(.85,1.15);w[O*3]=k,w[O*3+1]=k*o.range(.95,1.05),w[O*3+2]=k*o.range(.9,1)}),t[W].setAttribute("aTint",new a.InstancedBufferAttribute(w,3)),y.frustumCulled=!1,h.add(y)});const f=v(uo()),m=o.int(6,9),P=new a.InstancedMesh(f,e,m),I=new Float32Array(m*3);for(let M=0;M<m;M++){let W,y,w,A=0;do y=M<5?o.range(-14,-84):o.range(40,-150),W=o.range(-44,70),w=Math.abs(W-$(y)[0]),A++;while(((M<2?w<6||w>12:w<16)||R(W,y)>-5.5)&&A<60);const O=o.range(6,14),k=o.range(.22,.42),Bt=o.range(0,6.28),Nt=o.range(-.18,.12);l.set(W,R(W,y)+k*.6,y),r.setFromEuler(c.set(Nt,Bt,o.range(-.2,.2))),i.set(k,k,O),P.setMatrixAt(M,s.compose(l,r,i)),I[M*3]=I[M*3+1]=I[M*3+2]=o.range(.8,1.05)}f.setAttribute("aTint",new a.InstancedBufferAttribute(I,3)),P.frustumCulled=!1,h.add(P);const d=v(new a.IcosahedronGeometry(1,1)),g=360,F=new a.InstancedMesh(d,Pe(2,{tint:!0,gain:1.25}),g),u=new Float32Array(g*3),S=x("#9a9890"),V=x("#6f8a58"),ne=new a.Color;for(let M=0;M<g;M++){let W,y;if(o()<.75)y=o.range(60,-150),W=$(y)[0]+3*Math.sin(y*.045+1)+o.range(-7,7)*o();else{const A=n[0][o.int(0,n[0].length-1)]||E;W=A.x+o.range(-3,3),y=A.z+o.range(-3,3)}const w=.1+.4*Math.pow(o(),2.2);l.set(W,R(W,y)+w*.15,y),r.setFromEuler(c.set(o.range(-.3,.3),o.range(0,6.28),o.range(-.3,.3))),i.set(w,w*o.range(.45,.7),w*o.range(.75,1)),F.setMatrixAt(M,s.compose(l,r,i)),ne.copy(S).lerp(V,o()<.35?o.range(.4,.9):o.range(0,.2)).multiplyScalar(o.range(.8,1.15)),u[M*3]=ne.r,u[M*3+1]=ne.g,u[M*3+2]=ne.b}d.setAttribute("aTint",new a.InstancedBufferAttribute(u,3)),F.frustumCulled=!1,h.add(F)}await U();const zt=e=>v(new a.ShaderMaterial({vertexShader:Qt,fragmentShader:$t,transparent:!0,depthWrite:!1,uniforms:{...B,uClock:e,uPx:{value:1600},uBub:{value:x("#e6f4f6")}}})),Je=(e,t)=>{const n=e.length,s=gt(n),r=new Float32Array(n*4),c=new Float32Array(n*4),l=new Float32Array(n*4);e.forEach((f,m)=>{r.set(f.p,m*4),c.set(f.r,m*4),l.set(f.q,m*4)}),s.setAttribute("aP",new a.InstancedBufferAttribute(r,4)),s.setAttribute("aR",new a.InstancedBufferAttribute(c,4)),s.setAttribute("aQ",new a.InstancedBufferAttribute(l,4)),v(s);const i=new a.Mesh(s,zt(t));return i.frustumCulled=!1,i.renderOrder=6,h.add(i),i},et={value:0},tt={value:0};{const e=[];for(const t of ue){const n=t.col.tip-.1,s=o.range(.9,1.3),r=(n-t.y)/s,c=r+o.range(.4,1.6),l=o.int(18,28);for(let i=0;i<l;i++){const f=Math.floor(i/4),m=(f*.55+i%4*.09+o.range(0,.05))%c;e.push({p:[t.x+o.range(-.12,.12),t.y+.1,t.z+o.range(-.12,.12),m],r:[o.range(-.15,.15),o.range(-.15,.15),o.range(.03,.07),o()],q:[n,s,c,0]})}}Je(e,et)}const ot=te.x-H.rx*1.3,at=te.z-H.rz*1.3;{const e=[];for(let t=0;t<46;t++){const n=4.75+t*.035+o.range(0,.06)+(t>30?.4:0);e.push({p:[ot+o.range(-.15,.15),H.y-.8+o.range(-.2,.2),at+o.range(-.15,.15),n],r:[o.range(-.25,.25),o.range(-.25,.25),o.range(.04,.11),o()],q:[-.12,o.range(1.2,1.7),0,0]})}Je(e,tt)}const nt=(()=>{const e=v(new a.CircleGeometry(1,40));e.rotateX(Math.PI/2);const t=v(new a.ShaderMaterial({vertexShader:co,fragmentShader:lo,transparent:!0,depthWrite:!1,side:a.DoubleSide,uniforms:{...B,uSilver:{value:x("#dfe8ea")},uK:{value:0}}})),n=new a.Mesh(e,t);return n.position.set(ot,-.06,at),n.scale.set(.01,1,.01),n.renderOrder=3,h.add(n),{mesh:n,m:t}})();_.push((e,t)=>{const n=b(6.4,8.6,e);nt.mesh.scale.set(.01+1.5*n*(1+.04*Math.sin(t*5)),1,.01+1.1*n*(1+.04*Math.cos(t*4.3))),nt.m.uniforms.uK.value=b(6.3,7,e)}),await U();const ze=[];qe.forEach((e,t)=>{t!==0&&ze.push(ke.makeGodRays({rng:o,count:t===3?16:9,radius:e[2]*.7,direction:[ie.x,ie.y,ie.z],position:[e[0],-.2,e[1]],length:13,width:[1.2,3.6],color:"#cfeee6",intensity:t===3?.17:.13,near:[3,9],falloff:1.1,speed:.6,fogAmount:.5}))});for(const e of ze)h.add(e.object);{const e=v(new a.CylinderGeometry(1.2,3.4,10.5,28,1,!0));e.translate(0,-5.25,0);const t=v(new a.ShaderMaterial({vertexShader:so,fragmentShader:io,uniforms:{...B,uK:{value:1}},transparent:!0,depthWrite:!1,side:a.DoubleSide,blending:a.CustomBlending,blendSrc:a.OneFactor,blendDst:a.OneFactor})),n=new a.Mesh(e,t);n.position.set(B.uHole.value.x,0,B.uHole.value.y),n.renderOrder=7,h.add(n);const s=v(new a.MeshBasicMaterial({color:"#ff8a3a",fog:!0})),r=new a.Mesh(v(new a.CylinderGeometry(.008,.008,3.6,4)),v(new a.MeshBasicMaterial({color:"#e8d8c0",fog:!0})));r.position.set(B.uHole.value.x+.5,-1.8,B.uHole.value.y+.2),h.add(r);const c=new a.Mesh(v(new a.SphereGeometry(.06,10,8)),s);c.scale.set(1,1.6,1),c.position.set(r.position.x,-3.6,r.position.z),h.add(c),_.push((l,i)=>{c.position.x=r.position.x+.03*Math.sin(i*.9),c.rotation.z=.2*Math.sin(i*1.3)})}await U();const rt=1.85,oe=new a.Group;h.add(oe);const X={uPhase:{value:0},uAmp:{value:1},uBend:{value:0},uSpread:{value:.6}},st={uWhite:{value:x("#f6efe4")},uOrange:{value:x("#ff7a3a")},uIndigo:{value:x("#33357a")},uPink:{value:x("#ff8aa4")},uDye:{value:new a.Color}};{const e=v(Ke.fishGeometry(Ke.FISH_PRESETS.koi,"high")),t=v(new a.ShaderMaterial({vertexShader:Jt,fragmentShader:eo.replace("${COMMON}","").replace("void main(){",to+"void main(){"),vertexColors:!0,side:a.DoubleSide,uniforms:{...B,...X,...st}})),n=new a.Mesh(e,t);n.scale.setScalar(rt),n.frustumCulled=!1,oe.add(n);const s=[],r=[],c=[],l=(d,g,F,u,S,V,ne,M,W=10)=>{const y=s.length/3;for(let w=0;w<=W;w++){const A=w/W,O=T(V,ne,A);for(const k of[-1,1])d===0?s.push(g[0],g[1]+k*O*.5,g[2]+k*O*.3):s.push(g[0],g[1]+M[1]*A*S+k*O*.5,g[2]-A*S),r.push(d,A,F,d===0?k:u+k*.25);if(w<W){const k=y+w*2;c.push(k,k+1,k+3,k,k+3,k+2)}}};for(const d of[-1,1])l(0,[d*.05,-.04,.12],d,0,.26,.07,.03,null);for(let d=0;d<4;d++){const g=T(-.4,.45,d/3);l(1,[0,g*.06,-.27],0,T(-.9,.9,d/3),.28+.06*(1-Math.abs(g)),.07,.02,[0,g*.55,-1])}const i=v(new a.BufferGeometry);i.setAttribute("position",new a.Float32BufferAttribute(s,3)),i.setAttribute("aF",new a.Float32BufferAttribute(r,4)),i.setIndex(c);const f=v(new a.ShaderMaterial({vertexShader:oo,fragmentShader:ao,transparent:!0,depthWrite:!1,side:a.DoubleSide,uniforms:{...B,...X,...st}})),m=new a.Mesh(i,f);m.scale.setScalar(rt),m.frustumCulled=!1,m.renderOrder=5,oe.add(m);const P=v(new a.MeshBasicMaterial({color:"#0c0c12"})),I=v(new a.SphereGeometry(.012,8,6));for(const d of[-1,1]){const g=new a.Mesh(I,P);g.position.set(d*.052,.018,.22),n.add(g)}}const ae=(e,t)=>{Ue(e,t);const n=Ce(e,3.7,4.55,4.85,5.7);t.lerp(Mt,n*.92);const s=Ce(e,7.9,9.2,9.85,11.2);ce.copy(Be),ce.y+=.12*Math.sin(e*9)*Ce(e,9.2,9.4,9.8,10),t.lerp(ce,s*.9);const r=Ce(e,12.2,13.3,15.3,16.3),c=(1-b(12.2,13.5,e))*r;return t.x+=Math.sin((e-12.2)*5)*1.3*c,t.z+=Math.cos((e-12.2)*5)*.8*c,t.y=T(t.y,-.5,r),t},le=new a.Vector3,Ae=new a.Vector3,Se=new a.Vector3,Te=new a.Vector3,Z=new a.Vector3,it=new a.Matrix4,_e=new a.Vector3,ct=new a.Vector3,At=new a.Vector3(0,1,0),lt=new a.Quaternion,St=new a.Vector3(0,0,1),Wt=(e,t)=>(ae(e+.03,ee),ae(e-.03,de),Z.subVectors(ee,de).normalize(),ae(e,t).addScaledVector(Z,-.62));ae(0,Te);const Oe=[];{let e=1;const t=new a.Vector3;for(let n=0;n<=76;n++){const s=n*.25;if(ae(s,t),s>=4.5&&s<5)e=fe.hue;else for(const r of q)if(r.tL<1e3&&Math.abs(r.z-t.z)<4&&Math.hypot(r.x-t.x,r.z-t.z)<8.2){e=r.hue;break}Oe.push(e)}}const kt=e=>Oe[he(Math.floor(e/.25),0,Oe.length-1)],De=84,We=.055,Re=36,ut=16,pe=De+Re+ut,ge=gt(pe),we=new Float32Array(pe*4),xe=new Float32Array(pe*4),Ee=new Float32Array(pe);for(let e=0;e<pe;e++)Ee[e]=o()*10;const je=new a.InstancedBufferAttribute(we,4),Ge=new a.InstancedBufferAttribute(xe,4);je.setUsage(a.DynamicDrawUsage),Ge.setUsage(a.DynamicDrawUsage),ge.setAttribute("aPos",je),ge.setAttribute("aCol",Ge),ge.setAttribute("aSeed",new a.InstancedBufferAttribute(Ee,1)),v(ge);const Le=new a.Mesh(ge,v(new a.ShaderMaterial({vertexShader:Xt,fragmentShader:Zt,transparent:!0,depthWrite:!1,uniforms:B})));Le.frustumCulled=!1,Le.renderOrder=8,h.add(Le);const vt=pt.map(e=>x(e)),ft=[];{const e=["#c8902a","#d86a7a","#3c3c8e","#e0a040","#c05a78"].map(x),t=new a.Vector3;z.pointAt(0,t);for(let n=0;n<Re;n++){const s=o.range(10,30),r=(o()<.5?-1:1)*o.range(2.5,6.5);z.posAtDist(s,ee),ft.push({x:ee.x+r,y:o.range(-1.2,-4.8),z:ee.z+o.range(-1,1),r:o.range(1,3),c:e[n%e.length],a:o.range(.28,.46),dx:o.range(-.5,.5),dy:o.range(-.15,.25),dz:o.range(-.6,.3),ph:o()})}}const Ct=Array.from({length:ut},()=>({dx:o.range(-1,1),dz:o.range(-1,1),b:o.range(0,.4),r:o.range(.3,.9),up:o.range(.4,1.1)})),Pt=x("#a08a5a"),It=e=>{let t=0;const n=(r,c,l,i,f,m)=>{we[t*4]=r,we[t*4+1]=c,we[t*4+2]=l,we[t*4+3]=i,xe[t*4]=f.r,xe[t*4+1]=f.g,xe[t*4+2]=f.b,xe[t*4+3]=m,t++},s=Math.floor(e/We)*We;for(let r=0;r<De;r++){const c=s-r*We,l=e-c;if(c<.05||c>17.1){n(0,0,0,0,vt[0],0);continue}Wt(c,ce);const i=Ee[Re+r]||r*.37,f=.45*(1-Math.exp(-l*.8)),m=ce.x+Math.sin(i*7.1)*f,P=ce.z+Math.cos(i*5.3)*f,I=Math.min(ce.y+.07*l+Math.sin(i*3.3)*f*.5,-.22),d=.4+1.2*(1-Math.exp(-l*1.1)),g=.6*Math.pow(Math.max(0,1-l/(De*We)),1.25)*b(0,.12,l);n(m,I,P,d,vt[kt(c)],g)}for(const r of ft){const c=1-Math.exp(-(e+.6+r.ph)*.55);n(r.x+r.dx*e,r.y+r.dy*e,r.z+r.dz*e,r.r*(.55+.6*c),r.c,r.a*(1-b(3.5,7,e)))}for(const r of Ct){const c=e-9.45-r.b,l=c>0?1:0,i=1-Math.exp(-Math.max(c,0)*1.2);n(Be.x+.3+r.dx*i*1.4,E.y+.15+r.up*i-Math.max(0,c-1.2)*.12,Be.z+r.dz*i*1.4,r.r*(.4+1.1*i),Pt,l*.42*(1-b(2.5,6,c)))}je.needsUpdate=!0,Ge.needsUpdate=!0};await U();const ht=10.5,He=4.2,D=new a.Vector3;z.pointAt(10.5/j+22/L,D);const Ft=[[D.x+25,-4.6,D.z+ht*He],[D.x+25,-4.8,D.z+ht*He*.5],[D.x+25,-5,D.z],[D.x+30,-4.6,D.z-4],[D.x+40,-4.2,D.z-9],[D.x+60,-4,D.z-16]],mt=Ke.makeFishSchool({rng:o,species:"mackerel",count:76,top:"#5f6a44",belly:"#e4ebe8",fin:"#8a9080",route:Ft,closed:!1,start:0,speed:He,size:1,spread:[5,2.2,9]});h.add(mt.object),await U();const dt=[ke.makeParticles({rng:o,count:240,box:[24,14,30],velocity:[.03,-.11,.02],velocityRandom:[.05,.04,.05],turbulence:[.12,.05,.12],size:[.04,.08],colors:["#cfc6b4","#b8b0a0","#e0dccf"],intensity:.9,opacity:.7,additive:.3,near:[.6,2.5],twinkle:0}),ke.makeParticles({rng:o,count:40,box:[20,10,26],velocity:[0,.65,0],velocityRandom:[.05,.25,.05],turbulence:[.15,.05,.15],size:[.015,.035],colors:["#eef8ff"],intensity:1.1,opacity:.8,additive:.7,near:[.5,2]}),ke.makeParticles({rng:o,count:220,box:[30,12,34],velocity:[.02,-.02,.01],velocityRandom:[.04,.03,.04],turbulence:[.2,.1,.2],size:[.012,.028],colors:["#eadcb0","#f4ead0"],intensity:1,opacity:.6,additive:.8,near:[.5,2],twinkle:.2})];for(const e of dt)h.add(e.object);await U();const Vt=new a.Vector3(te.x,H.y+.6,te.z),Ut=new a.Vector3(E.x+Y.rx*.6,E.y+.9,E.z+Y.rz*.6);return{scene:h,path:z,duration:j,title:"Under the Ice",ride:"none",style:"none",companion:"none",camera:{fov:62,near:.3,nearThrough:.5,far:800,lookAhead:14,sway:.25,bank:.04},pois:[{at:Vt,from:4/j,to:6/j,weight:.5,fade:.4},{at:Ut,from:8.5/j,to:10.5/j,weight:.6,fade:.4},{at:Te,from:13/j,to:15/j,weight:.5,fade:.4}],portal:{shape:"circle",style:"ring",radius:4.5,color:"#bfe6e0",veil:"#7fb6c8",glow:.4,halo:!1,revealDistance:70,drawWithin:L*.2,drawIn:8},post:{exposure:1.05,bloom:{strength:.3,radius:.5,threshold:.95},grade:{saturation:1.05,contrast:1.04,tint:"#f6f8f8",shadowTint:"#06202e",vignette:.18,grain:0,aberration:0}},update(e,t,n,s){const r=Math.max(0,(s||0)*j);B.uTime.value=t,B.uT.value=r,et.value=t,tt.value=r;for(const V of _)V(r,t);ae(r,le),ae(r+.05,Ae),ae(r-.05,Se),Te.copy(le),Z.subVectors(Ae,Se),Z.lengthSq()<1e-8&&Z.set(0,0,-1),Z.normalize(),_e.crossVectors(At,Z).normalize(),ct.crossVectors(Z,_e),it.makeBasis(_e,ct,Z),oe.quaternion.setFromRotationMatrix(it);const c=Math.atan2(Ae.x-le.x,Ae.z-le.z),l=Math.atan2(le.x-Se.x,le.z-Se.z);let i=c-l;i>Math.PI&&(i-=2*Math.PI),i<-Math.PI&&(i+=2*Math.PI);const f=he(i/.05,-3,3),m=Math.PI*b(12.9,13.6,r)*(1-b(15,15.7,r));lt.setFromAxisAngle(St,he(-f*.22,-.44,.44)+m),oe.quaternion.multiply(lt),oe.position.copy(le);const P=1-b(17.15,17.45,r);oe.scale.setScalar(Math.max(P,.001)),oe.visible=P>.01;const I=(r+.25)/Fe,d=Math.floor(I),g=I-d,F=(d*ve+Math.min(g,ve))*Fe,u=g<ve?1:0,S=1.2*r+2*F+.4*t*(s>0?0:1);X.uPhase.value=S,X.uAmp.value=T(X.uAmp.value,u?1:.35,Math.min(1,e*8)),X.uSpread.value=T(X.uSpread.value,u?.35:1.05,Math.min(1,e*5)),X.uBend.value=T(X.uBend.value,he(f*.4,-1,1),Math.min(1,e*6)),It(r);for(const V of ze)V.update(e,t,n);for(const V of dt)V.update(e,t,n);mt.update(e,r,n,s)},dispose(){for(const e of G)e.dispose&&e.dispose();for(const e of ze)e.material&&e.material.dispose()}}}};export{ho as default};
