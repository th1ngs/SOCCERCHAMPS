// Jogadores dos lances 3D: modelo estilizado (cabeça grande, corpo arredondado, sombreamento em faixas e
// contorno, como em jogo de celular), com joelhos e cotovelos articulados e as animações do lance.
import * as THREE from "three";
import type { Actor, Chance, LanceKit } from "./engine";
import { canvasTex, hash, luminance } from "./tex";

const SKINS = ["#f6d0b1", "#e2ad84", "#c68a5e", "#9a6442", "#764a33", "#553524"];
const HAIR = ["#1b1512", "#3a2416", "#6b4424", "#b07d45", "#2a2a2a", "#d9b06a"];
const GLOVES = ["#f8fafc", "#a3e635", "#22d3ee", "#f472b6", "#fb923c"];
const BOOTS = ["#111418", "#f4f4f4", "#ff6a1a", "#1e88ff", "#e11d48", "#22c55e"];

// ---------- Materiais e geometrias compartilhados ----------
let gradient: THREE.DataTexture | null = null;
/** Rampa de 3 tons do sombreamento "cartoon". */
function toonRamp(): THREE.DataTexture {
  if (gradient) return gradient;
  const t = new THREE.DataTexture(new Uint8Array([105, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  gradient = t;
  return t;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
const toon = (color: string): THREE.MeshToonMaterial => {
  let m = toonCache.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp() }); toonCache.set(color, m); }
  return m;
};

let outlineMat: THREE.ShaderMaterial | null = null;
/** Contorno: a malha empurrada para fora pela normal, só as faces de trás (espessura constante). */
function outline(): THREE.ShaderMaterial {
  outlineMat ??= new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { color: { value: new THREE.Color("#0b0f16") }, thickness: { value: 0.016 } },
    vertexShader: "uniform float thickness; void main(){ vec3 p = position + normal * thickness; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
    fragmentShader: "uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }",
  });
  return outlineMat;
}

const lathe = (pts: [number, number][], segs: number, zScale: number) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  g.scale(1, 1, zScale);
  g.computeVertexNormals();
  return g;
};

function makeGeo() {
  return {
    torso: lathe([[0.155, 0], [0.17, 0.08], [0.2, 0.24], [0.222, 0.38], [0.215, 0.46], [0.17, 0.53], [0.09, 0.575], [0.001, 0.58]], 24, 0.74),
    shorts: lathe([[0.16, 0], [0.195, 0.03], [0.207, 0.15], [0.188, 0.25], [0.12, 0.27]], 20, 0.82),
    collar: new THREE.TorusGeometry(0.075, 0.022, 8, 20).rotateX(Math.PI / 2),
    neck: new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10),
    head: new THREE.SphereGeometry(0.16, 24, 18).scale(1, 1.05, 1),
    eye: new THREE.SphereGeometry(0.021, 8, 6),
    hairCap: new THREE.SphereGeometry(0.168, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairBuzz: new THREE.SphereGeometry(0.163, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    afro: new THREE.SphereGeometry(0.21, 18, 14),
    bun: new THREE.SphereGeometry(0.07, 12, 10),
    mohawk: new THREE.BoxGeometry(0.05, 0.09, 0.3),
    band: new THREE.TorusGeometry(0.162, 0.022, 6, 24).rotateX(Math.PI / 2),
    thigh: new THREE.CapsuleGeometry(0.074, 0.26, 4, 12),
    shin: new THREE.CapsuleGeometry(0.06, 0.27, 4, 12),
    boot: new THREE.SphereGeometry(1, 14, 10).scale(0.078, 0.058, 0.14),
    sleeve: new THREE.CapsuleGeometry(0.068, 0.08, 4, 10),
    upper: new THREE.CapsuleGeometry(0.052, 0.14, 4, 10),
    fore: new THREE.CapsuleGeometry(0.047, 0.17, 4, 10),
    hand: new THREE.SphereGeometry(0.054, 10, 8),
    glove: new THREE.SphereGeometry(1, 14, 10).scale(0.085, 0.095, 0.06),
    cuff: new THREE.TorusGeometry(0.055, 0.02, 6, 16).rotateX(Math.PI / 2),
    ring: new THREE.RingGeometry(0.5, 0.62, 40),
  };
}
let GEO: ReturnType<typeof makeGeo> | null = null;
const geo = () => (GEO ??= makeGeo());

// ---------- Texturas ----------
/** Camisa (mapeada no torno: u = 0,5 são as costas): cor, padrão, número grande nas costas e pequeno no peito. */
function shirtTexture(kit: LanceKit, num: number, gk: [string, string] | null): THREE.CanvasTexture {
  const [p, s] = gk ?? kit.colors;
  const pattern = gk ? "solid" : kit.pattern;
  return canvasTex(512, 256, (c) => {
    c.scale(2, 2);
    c.fillStyle = p; c.fillRect(0, 0, 256, 128);
    c.fillStyle = s;
    if (gk) {
      // Goleiro: degradê de cima para baixo, faixas diagonais finas e ombros na cor secundária.
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "rgba(255,255,255,0.28)"); g.addColorStop(0.55, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,0.25)");
      c.fillStyle = g; c.fillRect(0, 0, 256, 128);
      c.strokeStyle = s; c.globalAlpha = 0.35; c.lineWidth = 3;
      for (let x = -128; x < 256; x += 14) { c.beginPath(); c.moveTo(x, 128); c.lineTo(x + 128, 0); c.stroke(); }
      c.globalAlpha = 1; c.fillStyle = s; c.fillRect(0, 0, 256, 16);
    } else if (pattern === "v") for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 14, 128);
    else if (pattern === "h") for (let y = 0; y < 128; y += 28) c.fillRect(0, y, 256, 12);
    else if (pattern === "half") c.fillRect(0, 0, 128, 128);
    else if (pattern === "sash") { c.beginPath(); c.moveTo(150, 0); c.lineTo(190, 0); c.lineTo(110, 128); c.lineTo(70, 128); c.fill(); }
    else { c.fillRect(0, 0, 256, 7); c.fillRect(0, 121, 256, 7); }
    const ink = luminance(p) > 0.55 ? "#111" : "#fff";
    c.fillStyle = ink; c.strokeStyle = luminance(p) > 0.55 ? "#fff" : "#000"; c.lineWidth = 4; c.lineJoin = "round";
    c.font = "900 58px Arial Black, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.strokeText(String(num || ""), 128, 64); c.fillText(String(num || ""), 128, 64);
    c.font = "900 18px Arial, sans-serif"; c.lineWidth = 2;
    c.fillText(String(num || ""), 22, 52); c.fillText(String(num || ""), 234, 52);
  });
}

function labelTexture(text: string, color: string): THREE.CanvasTexture {
  return canvasTex(512, 128, (c) => {
    c.font = "800 60px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const w = Math.min(500, c.measureText(text).width + 56);
    c.fillStyle = "rgba(5,10,18,0.8)";
    c.beginPath(); c.roundRect(256 - w / 2, 16, w, 92, 24); c.fill();
    c.strokeStyle = color; c.lineWidth = 6; c.stroke();
    c.fillStyle = "#fff"; c.fillText(text, 256, 64);
  });
}

// ---------- Montagem ----------
export interface PlayerRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  ring: THREE.Mesh;
  label: THREE.Sprite | null;
  /** Comemoração preferida (0 = pulo, 1 = aviãozinho, 2 = joelhos). */
  style: number;
  /** Pose atual (misturada suavemente rumo à pose alvo a cada quadro). */
  pose: Pose;
  /** Rumo do quadro anterior e velocidade de giro suavizada (inclinação nas curvas). */
  prevHeading: number;
  turn: number;
}

/** Ângulos das articulações (rad) e deslocamento do corpo (m). */
interface Pose {
  bx: number; by: number; bz: number; brx: number; brz: number;
  ty: number; hx: number; hy: number;
  lLx: number; lLz: number; lRx: number; lRz: number; kL: number; kR: number;
  aLx: number; aLz: number; aRx: number; aRz: number; eL: number; eR: number;
}
const POSE_KEYS: (keyof Pose)[] = ["bx", "by", "bz", "brx", "brz", "ty", "hx", "hy", "lLx", "lLz", "lRx", "lRz", "kL", "kR", "aLx", "aLz", "aRx", "aRz", "eL", "eR"];
const neutral = (): Pose => ({
  bx: 0, by: 0, bz: 0, brx: 0, brz: 0, ty: 0, hx: 0, hy: 0,
  lLx: 0, lLz: 0, lRx: 0, lRz: 0, kL: 0.06, kR: 0.06,
  aLx: 0, aLz: -0.12, aRx: 0, aRz: 0.12, eL: -0.35, eR: -0.35,
});

/** Malha com contorno (filho com a mesma geometria e o material de contorno). */
function part(g: THREE.BufferGeometry, m: THREE.Material, edge = true, shadow = true): THREE.Mesh {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = shadow;
  if (edge) mesh.add(new THREE.Mesh(g, outline()));
  return mesh;
}

export function buildPlayer(kit: LanceKit, num: number, id: string, gk: [string, string] | null, showLabel: string | null, labelColor: string): PlayerRig {
  const G = geo();
  const h = hash(id);
  const skin = toon(SKINS[h % SKINS.length]);
  const hairColor = HAIR[(h >>> 4) % HAIR.length];
  const hair = toon(hairColor);
  const [prim, sec] = gk ?? kit.colors;
  const shortsColor = gk ? gk[1] : luminance(kit.colors[0]) > 0.7 ? kit.colors[1] : luminance(kit.colors[1]) > 0.7 ? "#f2f2f2" : kit.colors[1];
  const sock = toon(gk ? gk[0] : kit.colors[0]);
  const boot = toon(BOOTS[(h >>> 8) % BOOTS.length]);
  const shirtMap = shirtTexture(kit, num, gk);
  const shirt = new THREE.MeshToonMaterial({ map: shirtMap, gradientMap: toonRamp() });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Pernas: quadril → coxa → joelho → canela com meião → chuteira.
  const leg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, 0.9, 0);
    const thigh = part(G.thigh, skin);
    thigh.position.y = -0.18;
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    const shin = part(G.shin, sock);
    shin.position.y = -0.18;
    const b = part(G.boot, boot);
    b.position.set(0, -0.41, 0.04);
    knee.add(shin, b);
    hip.add(thigh, knee);
    return { hip, knee };
  };
  const L = leg(-1), R = leg(1);
  body.add(L.hip, R.hip);

  // Tronco (gira um pouco na corrida): shorts, camisa, gola, pescoço, cabeça e braços.
  const torso = new THREE.Group();
  body.add(torso);
  const shorts = part(G.shorts, toon(shortsColor));
  shorts.position.y = 0.76;
  const chest = part(G.torso, shirt);
  chest.position.y = 0.96;
  const collar = part(G.collar, toon(sec), false, false);
  collar.position.y = 1.53;
  const neck = part(G.neck, skin, false);
  neck.position.y = 1.58;
  torso.add(shorts, chest, collar, neck);

  const head = new THREE.Group();
  head.position.y = 1.74;
  head.add(part(G.head, skin));
  const eyeMat = toon("#14161a");
  for (const s of [-1, 1]) { const e = new THREE.Mesh(G.eye, eyeMat); e.position.set(s * 0.056, 0.015, 0.145); head.add(e); }
  // Cabelo: curto, máquina, black power, moicano, coque ou careca com faixa.
  const style = (h >>> 12) % 6;
  if (style === 0) { const c = part(G.hairCap, hair, false); c.rotation.x = -0.28; head.add(c); }
  else if (style === 1) { const c = part(G.hairBuzz, hair, false); c.rotation.x = -0.32; head.add(c); }
  else if (style === 2) { const a = part(G.afro, hair); a.position.set(0, 0.06, -0.035); head.add(a); }
  else if (style === 3) {
    const c = part(G.hairBuzz, toon(new THREE.Color(hairColor).lerp(new THREE.Color("#000"), 0.35).getStyle()), false); c.rotation.x = -0.32; head.add(c);
    const m = part(G.mohawk, hair); m.position.set(0, 0.15, -0.02); head.add(m);
  } else if (style === 4) {
    const c = part(G.hairCap, hair, false); c.rotation.x = -0.22; head.add(c);
    const b = part(G.bun, hair); b.position.set(0, 0.08, -0.15); head.add(b);
  } else { const band = part(G.band, toon(sec), false); band.position.y = 0.06; head.add(band); }
  torso.add(head);

  // Braços: ombro → manga → braço → cotovelo → antebraço → mão (goleiro: manga longa e luvas).
  const arm = (side: number) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.235, 1.43, 0);
    const sleeve = part(G.sleeve, toon(prim));
    sleeve.position.y = -0.07;
    const up = part(G.upper, gk ? toon(prim) : skin);
    up.position.y = -0.17;
    const elbow = new THREE.Group();
    elbow.position.y = -0.27;
    const fore = part(G.fore, gk ? toon(prim) : skin);
    fore.position.y = -0.11;
    const hand = part(gk ? G.glove : G.hand, gk ? toon(GLOVES[(h >>> 16) % GLOVES.length]) : skin);
    hand.position.y = gk ? -0.26 : -0.245;
    elbow.add(fore, hand);
    if (gk) { const cuff = part(G.cuff, toon("#111418"), false); cuff.position.y = -0.2; elbow.add(cuff); }
    sh.add(sleeve, up, elbow);
    return { sh, elbow };
  };
  const AL = arm(-1), AR = arm(1);
  torso.add(AL.sh, AR.sh);

  // Anel no gramado (quem conduz, quem pode receber, quem está impedido).
  const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
  root.add(ring);
  let label: THREE.Sprite | null = null;
  if (showLabel) {
    label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(showLabel, labelColor), depthTest: false, transparent: true }));
    label.scale.set(2.2, 0.55, 1); label.position.y = 2.35; label.renderOrder = 10;
    root.add(label);
  }
  return { root, body, torso, head, legL: L.hip, legR: R.hip, kneeL: L.knee, kneeR: R.knee, armL: AL.sh, armR: AR.sh, elbowL: AL.elbow, elbowR: AR.elbow, ring, label, style: h % 3, pose: neutral(), prevHeading: 0, turn: 0 };
}

// ---------- Animação ----------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (f: number) => f * f * (3 - 2 * f);
const wrap = (x: number) => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };

/**
 * Pose do jogador a cada quadro. Calcula a pose alvo (marcha conforme a direção do movimento em relação ao corpo,
 * estados e gestos) e mistura a pose atual rumo a ela, para nada mudar de uma vez.
 */
export function poseRig(r: PlayerRig, a: Actor, ch: Chance, pulse: number, now: number, dt: number): void {
  r.root.position.set(a.x, a.y, a.z);
  r.root.rotation.set(0, a.heading, 0);
  // Giro (para inclinar o corpo para dentro da curva).
  const w = dt > 0 ? wrap(a.heading - r.prevHeading) / dt : 0;
  r.prevHeading = a.heading;
  r.turn += (clamp(w, -8, 8) - r.turn) * Math.min(1, dt * 8);

  const T = neutral();
  const v = Math.sqrt(a.vx * a.vx + a.vz * a.vz);
  const sp = Math.min(1, v / 7);
  const sh = Math.sin(a.heading), chd = Math.cos(a.heading);
  // Velocidade no corpo: para a frente e para o lado (+x local).
  const fw = v > 0.05 ? (a.vx * sh + a.vz * chd) / v : 1;
  const lat = v > 0.05 ? (a.vx * chd - a.vz * sh) / v : 0;
  const cyc = a.stride;
  const s1 = Math.sin(cyc);
  const side = Math.abs(lat);
  // Marcha: passadas para a frente (de costas mais curtas) e, andando de lado, pernas abrindo e fechando.
  const amp = 0.95 * sp * (fw >= 0 ? 1 : 0.6) * (1 - side * 0.75);
  T.lLx = s1 * amp; T.lRx = -s1 * amp;
  T.kL = 0.06 + (0.12 + Math.max(0, s1) * 1.2) * sp * (1 - side * 0.5);
  T.kR = 0.06 + (0.12 + Math.max(0, -s1) * 1.2) * sp * (1 - side * 0.5);
  T.lLz = -(0.06 + 0.24 * Math.max(0, s1)) * side * sp * 1.6;
  T.lRz = (0.06 + 0.24 * Math.max(0, -s1)) * side * sp * 1.6;
  T.aLx = -s1 * amp * 0.9; T.aRx = s1 * amp * 0.9;
  T.aLz = -0.12 - sp * 0.06 - side * sp * 0.4; T.aRz = 0.12 + sp * 0.06 + side * sp * 0.4;
  T.eL = T.eR = -0.35 - sp * 0.8;
  T.by = Math.abs(Math.cos(cyc)) * 0.06 * sp - sp * 0.03;
  T.brx = sp * 0.22 * fw;
  T.brz = clamp(-r.turn * 0.07 * sp, -0.3, 0.3) - lat * sp * 0.12;
  T.ty = s1 * 0.16 * sp * (1 - side);
  if (sp < 0.08) T.by += Math.sin(now * 2.2 + a.i) * 0.006; // respira parado
  // Cabeça acompanha a bola.
  const b = ch.ball;
  const bdx = b.x - a.x, bdz = b.z - a.z, bd = Math.sqrt(bdx * bdx + bdz * bdz);
  if (bd > 0.3) {
    const lx = bdx * chd - bdz * sh, lz = bdx * sh + bdz * chd;
    const ang = Math.atan2(lx, lz);
    T.hy = clamp(ang, -1.1, 1.1) * 0.85;
    T.ty += clamp(ang, -1, 1) * 0.15;
    T.hx = clamp(0.45 - bd * 0.06, 0, 0.4);
  }
  let rate = 16;

  if (a.state === "celebrate") {
    const tt = ch.doneT;
    T.hx = -0.2; T.hy = 0;
    if (r.style === 1) {
      // Aviãozinho.
      T.aLx = 0; T.aRx = 0; T.aLz = -1.45; T.aRz = 1.45; T.eL = T.eR = -0.05;
      T.brz = Math.sin(tt * 3) * 0.3;
    } else if (r.style === 2 && tt < 2.2) {
      // De joelhos, braços para cima.
      T.by = -0.36; T.brx = -0.3;
      T.lLx = -0.25; T.lRx = -0.25; T.kL = 1.75; T.kR = 1.75;
      T.aLx = -2.9; T.aRx = -2.9; T.aLz = -0.3; T.aRz = 0.3; T.eL = T.eR = -0.2;
    } else {
      // Pulo com os braços para o alto.
      T.aLx = -2.85; T.aRx = -2.85; T.aLz = -0.35; T.aRz = 0.35; T.eL = T.eR = -0.25;
      T.lLx = 0.25; T.lRx = -0.1; T.kL = 0.6;
    }
    rate = 10;
  } else if (a.state === "sad") {
    // Mãos na cabeça.
    T.brx = 0.12; T.hx = 0.35; T.hy = 0;
    T.aLx = -2.5; T.aRx = -2.5; T.aLz = -0.55; T.aRz = 0.55; T.eL = T.eR = -2.1;
    rate = 7;
  } else if (a.state === "tackle") {
    // Carrinho: deitado para trás, perna da frente esticada.
    T.brx = -1.15; T.by = 0.28; T.brz = 0;
    T.lRx = -1.35; T.kR = 0.05; T.lLx = -0.4; T.kL = 1.3; T.lLz = T.lRz = 0;
    T.aLx = -0.3; T.aRx = -0.3; T.aLz = -1.1; T.aRz = 1.1;
    rate = 14;
  } else if (a.state === "down" || a.stunT > 0) {
    // Driblado: cai para o lado em que mordeu a finta (sentado de lado, apoiado no braço).
    const fs = a.role === "def" ? (a.fallSide * chd >= 0 ? 1 : -1) : 0;
    if (fs) {
      T.brz = -fs * 1.25; T.by = 0.08; T.bx = fs * 0.35; T.brx = 0.2;
      T.lLx = -0.6; T.lRx = -0.9; T.kL = 0.8; T.kR = 0.4;
      T.aLz = -0.9; T.aRz = 0.9; T.aLx = -0.4; T.aRx = -0.4; T.hx = 0.2; T.hy = 0;
    } else {
      T.brx = 1.42; T.by = 0.16; T.bz = 0.25;
      T.aLx = -2.6; T.aRx = -2.6; T.aLz = -0.4; T.aRz = 0.4; T.kL = 0.3; T.kR = 0.1;
    }
    rate = 11;
  } else if (a.role === "gk") {
    const holding = ch.ball.owner === a.i;
    if (a.dive && a.dive.t >= 0 && !a.dive.stand) {
      const f = clamp(a.dive.t / a.dive.dur, 0, 1);
      const e = ease(Math.min(1, f * 1.25));
      if (a.dive.y > 2.2 && Math.abs(a.dive.x - a.dive.x0) < 1.2) {
        // Bola por cima: volta e salta para trás com os braços esticados.
        T.brx = -0.3 * e; T.by = Math.sin(f * Math.PI) * 0.45;
        T.aLx = -3; T.aRx = -3; T.aLz = -0.2; T.aRz = 0.2; T.eL = T.eR = -0.05;
        T.lLx = 0.3; T.lRx = -0.2; T.kL = 0.5; T.kR = 0.2;
      } else {
        // Mergulho: impulsão na perna de dentro, corpo deita no ar com os dois braços esticados para a bola
        // (baixa: mãos rente ao chão; alta: braços acima da cabeça); depois cai de lado e fica no chão.
        const s = a.dive.side;
        const low = a.dive.y < 0.6, high = a.dive.y > 1.6;
        T.brz = s * (high ? 1.25 : 1.5) * e;
        T.brx = low ? 0.2 : -0.08;
        T.by = f < 1 ? Math.min(0.6, e * (high ? 0.85 : 0.6)) : 0.2;
        T.aLx = T.aRx = low ? -2.5 : -3.1;
        T.aLz = -0.1 + s * 0.12; T.aRz = 0.1 + s * 0.12; T.eL = T.eR = -0.04;
        // Perna de impulsão estica, a outra encolhe.
        T.lLx = 0.15; T.lRx = -0.35; T.kL = s > 0 ? 0.1 : 1; T.kR = s > 0 ? 1 : 0.1;
        T.lLz = -0.3; T.lRz = 0.3;
        T.hy = 0; T.hx = -0.15;
        if (holding) { T.eL = T.eR = -1.2; T.aLx = T.aRx = -2.2; }
      }
      rate = 24;
    } else if (a.dive && a.dive.t >= 0) {
      // Bola em cima dele: mãos na altura dela, sem mergulhar.
      const y = a.dive.y;
      T.by = y < 0.5 ? -0.25 : -0.05; T.brx = y < 0.5 ? 0.45 : -0.05;
      T.kL = T.kR = y < 0.5 ? 1.1 : 0.3;
      T.aLx = T.aRx = -(0.6 + Math.min(1.9, y) * 1.15); T.aLz = -0.2; T.aRz = 0.2; T.eL = T.eR = -0.25;
      if (holding) { T.aLx = T.aRx = -1.1; T.eL = T.eR = -1.5; T.aLz = -0.35; T.aRz = 0.35; T.hx = 0.25; }
      rate = 22;
    } else if (holding) {
      // Encaixou em pé: bola no peito.
      T.aLx = T.aRx = -1.1; T.eL = T.eR = -1.5; T.aLz = -0.35; T.aRz = 0.35; T.hx = 0.25; T.brx = 0.05;
    } else {
      // Base: agachado, mãos à frente na altura da cintura, quicando nas pontas dos pés; lendo o chute, agacha mais.
      const ready = a.dive && a.dive.t < 0 ? 1 : 0;
      const hop = Math.abs(Math.sin(now * 5.5 + a.i)) * 0.03 * (1 - side) * (1 - ready);
      T.by = -0.1 - ready * 0.08 + hop; T.brx = 0.22 + ready * 0.08;
      T.kL += 0.5 + ready * 0.25; T.kR += 0.5 + ready * 0.25; T.lLx -= 0.28 + ready * 0.12; T.lRx -= 0.28 + ready * 0.12;
      T.aLx = T.aRx = -0.85 - ready * 0.15; T.aLz = -0.5; T.aRz = 0.5; T.eL = T.eR = -0.75;
      // Passadas de lado: abre e fecha as pernas.
      T.lLz = -(0.14 + 0.22 * Math.max(0, s1)) * Math.min(1, side * v / 2.2);
      T.lRz = (0.14 + 0.22 * Math.max(0, -s1)) * Math.min(1, side * v / 2.2);
      rate = 18;
    }
  } else if (a.role === "def") {
    // Marcador perto de quem tem a bola: agachado, de frente para ela, braços abertos.
    const c = ch.actors[ch.carrier];
    if (Math.hypot(c.x - a.x, c.z - a.z) < 4 && ch.phase === "play") {
      T.by -= 0.08; T.brx = 0.22 + Math.max(0, fw) * 0.1;
      T.kL += 0.4; T.kR += 0.4; T.lLx -= 0.22; T.lRx -= 0.22;
      T.aLz = -0.6; T.aRz = 0.6; T.aLx = -0.3; T.aRx = -0.3; T.eL = T.eR = -0.5;
    }
  }

  // Bote do marcador: estica a perna na bola e volta.
  if (a.lungeT >= 0 && a.lungeT < 0.42 && a.state !== "tackle" && a.stunT <= 0) {
    const f = Math.sin((a.lungeT / 0.42) * Math.PI);
    T.lRx = -1.1 * f; T.kR = 0.15; T.lLx = 0.35 * f; T.kL = 0.6 * f + 0.2;
    T.brx = 0.3 * f + 0.1; T.by = -0.12 * f; T.bz = 0.18 * f;
    T.aLz = -0.8; T.aRz = 0.5;
    rate = 22;
  }
  // Chute/passe: perna direita vai atrás e chicoteia à frente; braços abrem para equilibrar.
  if (a.kickT >= 0 && a.kickT < 0.5 && a.state !== "celebrate" && a.state !== "sad") {
    const f = a.kickT / 0.5;
    const back = 0.32;
    if (f < back) { T.lRx = 1.0 * (f / back); T.kR = 1.3 * (f / back); }
    else { const g = (f - back) / (1 - back); T.lRx = 1.0 - 2.4 * Math.min(1, g * 1.6) + Math.max(0, g - 0.62) * 1.6; T.kR = 1.3 * (1 - Math.min(1, g * 2)) + 0.05; }
    T.lLx = -0.1; T.kL = 0.25; T.lRz = 0; T.lLz = 0;
    T.aLx = -0.4; T.aLz = -0.9; T.aRx = 0.3; T.aRz = 0.6;
    T.brx = -0.12; T.brz = 0;
    rate = 30;
  }
  // Dribles (só de quem conduz): pedalada, corte, chapéu e roleta.
  const sk = a.i === ch.carrier ? ch.skill : null;
  let spin = 0;
  if (sk) {
    const f = Math.min(1, sk.t / sk.dur);
    const lx = sk.dx * chd - sk.dz * sh; // lado (local) da saída: + = esquerda do corpo
    if (sk.move === "toque") {
      // Pedalada: a perna do lado oposto contorna a bola; o corpo ginga para o lado falso e arranca para o outro.
      const s = sk.side * chd >= 0 ? -1 : 1;
      const over = Math.sin(Math.min(1, f / 0.5) * Math.PI);
      if (s > 0) { T.lLx = -0.55 * over; T.lLz = 0.35 * over; T.kL = 0.9 * over + 0.1; }
      else { T.lRx = -0.55 * over; T.lRz = -0.35 * over; T.kR = 0.9 * over + 0.1; }
      const sway = f < 0.45 ? Math.sin((f / 0.45) * Math.PI) * -s : Math.sin(((f - 0.45) / 0.55) * Math.PI) * s;
      T.brz = -sway * 0.38; T.bx = sway * 0.16; T.by -= 0.06 * Math.sin(f * Math.PI);
      T.brx = 0.25; T.aLz = -0.7; T.aRz = 0.7; T.hy = 0;
    } else if (sk.move === "corte") {
      // Corte: finca o pé de fora, abaixa e inclina forte para o novo lado.
      const e = Math.sin(Math.min(1, f * 1.3) * Math.PI);
      const sd = lx >= 0 ? 1 : -1;
      T.brz = -sd * 0.5 * e; T.by -= 0.1 * e; T.brx = 0.32;
      if (sd > 0) { T.lRz = -0.45 * e; T.kR = 0.6 * e + 0.1; T.lLx = -0.5 * e; T.kL = 0.9 * e; }
      else { T.lLz = 0.45 * e; T.kL = 0.6 * e + 0.1; T.lRx = -0.5 * e; T.kR = 0.9 * e; }
      T.aLz = -0.9; T.aRz = 0.9; T.hy = 0;
    } else if (sk.move === "chapeu") {
      // Chapéu: calcanhar levanta a bola por trás e por cima; corpo inclina à frente, braços abertos.
      const e = Math.sin(Math.min(1, f * 1.6) * Math.PI);
      T.lRx = 1.35 * e; T.kR = 1.9 * e + 0.1; T.lLx = -0.15; T.kL = 0.35;
      T.brx = 0.35 * e + 0.1; T.by -= 0.05 * e;
      T.aLz = -1.0; T.aRz = 1.0; T.aLx = -0.3; T.aRx = -0.3; T.hx = -0.25;
    } else {
      // Roleta: gira o corpo inteiro com a sola na bola, curvado e de braços abertos.
      spin = ease(f) * Math.PI * 2 * (lx >= 0 ? 1 : -1);
      T.brx = 0.28; T.by -= 0.06; T.lRx = -0.4 * Math.sin(f * Math.PI); T.kR = 0.5;
      T.aLz = -0.8; T.aRz = 0.8; T.hy = 0;
    }
    rate = 26;
  }

  // Mistura suave rumo à pose alvo.
  const P = r.pose, k = 1 - Math.exp(-rate * Math.max(0, Math.min(0.1, dt)));
  for (const key of POSE_KEYS) P[key] += (T[key] - P[key]) * k;
  r.root.rotation.y = a.heading + spin;
  r.body.position.set(P.bx, P.by, P.bz);
  r.body.rotation.set(P.brx, 0, P.brz);
  r.torso.rotation.set(0, P.ty, 0);
  r.head.rotation.set(P.hx, P.hy, 0);
  r.legL.rotation.set(P.lLx, 0, P.lLz); r.legR.rotation.set(P.lRx, 0, P.lRz);
  r.kneeL.rotation.set(P.kL, 0, 0); r.kneeR.rotation.set(P.kR, 0, 0);
  r.armL.rotation.set(P.aLx, 0, P.aLz); r.armR.rotation.set(P.aRx, 0, P.aRz);
  r.elbowL.rotation.set(P.eL, 0, 0); r.elbowR.rotation.set(P.eR, 0, 0);

  // Anéis: quem conduz (dourado), quem pode receber (branco pulsando) e quem está impedido (vermelho).
  const ring = r.ring.material as THREE.MeshBasicMaterial;
  const isCarrier = a.i === ch.carrier && ch.phase !== "done" && ch.ball.owner === a.i;
  const live = ch.phase === "play" || ch.phase === "pass";
  const offside = live && ch.isOffside(a);
  if (a.role === "att" && live) {
    ring.color.set(isCarrier ? "#ffd23f" : offside ? "#ff4d4d" : "#ffffff");
    ring.opacity = isCarrier ? 0.95 : offside ? 0.85 : 0.35 + pulse * 0.45;
    r.ring.scale.setScalar(isCarrier ? 1 : 1 + pulse * 0.15);
  } else ring.opacity = 0;
  if (r.label) {
    r.label.visible = a.role === "att" && ch.phase !== "done" && !isCarrier;
    (r.label.material as THREE.SpriteMaterial).color.set(offside ? "#ff9a9a" : "#ffffff");
  }
}
