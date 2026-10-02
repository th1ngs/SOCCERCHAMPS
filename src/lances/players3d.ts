// Jogadores dos lances 3D: modelo estilizado (cabeça grande, corpo arredondado, sombreamento em faixas e
// contorno, como em jogo de celular), com joelhos e cotovelos articulados e as animações do lance.
import * as THREE from "three";
import type { Actor, Chance, LanceKit } from "./engine";
import { canvasTex, hash, luminance } from "./tex";

const SKINS = ["#f6d0b1", "#e2ad84", "#c68a5e", "#9a6442", "#764a33", "#553524"];
const HAIR = ["#1b1512", "#3a2416", "#6b4424", "#b07d45", "#2a2a2a", "#d9b06a"];
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
    glove: new THREE.SphereGeometry(0.072, 10, 8),
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
    if (pattern === "v") for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 14, 128);
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
}

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
    const hand = part(gk ? G.glove : G.hand, gk ? toon(sec) : skin);
    hand.position.y = -0.245;
    elbow.add(fore, hand);
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
  return { root, body, torso, head, legL: L.hip, legR: R.hip, kneeL: L.knee, kneeR: R.knee, armL: AL.sh, armR: AR.sh, elbowL: AL.elbow, elbowR: AR.elbow, ring, label, style: h % 3 };
}

// ---------- Animação ----------
/** Pose do jogador a cada quadro: corrida, chute, finta, marcação, carrinho, queda, comemoração e goleiro. */
export function poseRig(r: PlayerRig, a: Actor, ch: Chance, pulse: number, now: number): void {
  r.root.position.set(a.x, a.y, a.z);
  r.root.rotation.set(0, a.heading, 0);
  const b = r.body, t = r.torso;
  b.rotation.set(0, 0, 0); b.position.set(0, 0, 0);
  t.rotation.set(0, 0, 0);
  r.head.rotation.set(0, 0, 0);
  const sp = Math.min(1, Math.sqrt(a.vx * a.vx + a.vz * a.vz) / 7);
  const cyc = a.stride;
  // Corrida: coxas alternadas, joelho dobra quando a perna vai para trás, braços opostos com cotovelo dobrado.
  const swing = Math.sin(cyc) * 0.95 * sp;
  r.legL.rotation.set(swing, 0, 0); r.legR.rotation.set(-swing, 0, 0);
  r.kneeL.rotation.set((0.12 + Math.max(0, Math.sin(cyc)) * 1.25) * sp + 0.04, 0, 0);
  r.kneeR.rotation.set((0.12 + Math.max(0, -Math.sin(cyc)) * 1.25) * sp + 0.04, 0, 0);
  r.armL.rotation.set(-swing * 0.85, 0, -0.1 - sp * 0.05); r.armR.rotation.set(swing * 0.85, 0, 0.1 + sp * 0.05);
  r.elbowL.rotation.set(-0.35 - sp * 0.75, 0, 0); r.elbowR.rotation.set(-0.35 - sp * 0.75, 0, 0);
  b.position.y = Math.abs(Math.cos(cyc)) * 0.06 * sp - sp * 0.03;
  b.rotation.x = sp * 0.2;
  t.rotation.y = Math.sin(cyc) * 0.16 * sp;
  if (sp < 0.08) {
    // Parado: respira e balança de leve.
    t.position.y = Math.sin(now * 2.2 + a.i) * 0.008;
    r.armL.rotation.z = -0.14; r.armR.rotation.z = 0.14;
  }

  if (a.state === "celebrate") {
    const tt = ch.doneT;
    if (r.style === 1) {
      // Aviãozinho.
      r.armL.rotation.set(0, 0, -1.45); r.armR.rotation.set(0, 0, 1.45);
      r.elbowL.rotation.x = 0; r.elbowR.rotation.x = 0;
      b.rotation.z = Math.sin(tt * 3) * 0.28;
    } else if (r.style === 2 && tt < 2.2) {
      // De joelhos, braços para cima.
      b.position.y = -0.36; b.rotation.x = -0.3;
      r.legL.rotation.x = -0.25; r.legR.rotation.x = -0.25; r.kneeL.rotation.x = 1.75; r.kneeR.rotation.x = 1.75;
      r.armL.rotation.set(-2.9, 0, -0.3); r.armR.rotation.set(-2.9, 0, 0.3);
      r.elbowL.rotation.x = -0.2; r.elbowR.rotation.x = -0.2;
    } else {
      // Pulo com os braços para o alto.
      r.armL.rotation.set(-2.85, 0, -0.35); r.armR.rotation.set(-2.85, 0, 0.35);
      r.elbowL.rotation.x = -0.25; r.elbowR.rotation.x = -0.25;
      r.legL.rotation.x = 0.25; r.legR.rotation.x = -0.1; r.kneeL.rotation.x = 0.6;
    }
  } else if (a.state === "sad") {
    // Mãos na cabeça.
    b.rotation.x = 0.12; r.head.rotation.x = 0.35;
    r.armL.rotation.set(-2.5, 0, -0.55); r.armR.rotation.set(-2.5, 0, 0.55);
    r.elbowL.rotation.x = -2.1; r.elbowR.rotation.x = -2.1;
  } else if (a.state === "tackle") {
    // Carrinho: deitado para trás, perna da frente esticada.
    b.rotation.x = -1.15; b.position.y = 0.28;
    r.legR.rotation.x = -1.35; r.kneeR.rotation.x = 0.05; r.legL.rotation.x = -0.4; r.kneeL.rotation.x = 1.3;
    r.armL.rotation.set(-0.3, 0, -1.1); r.armR.rotation.set(-0.3, 0, 1.1);
  } else if (a.state === "down" || a.stunT > 0) {
    // No chão (driblado ou desarmado).
    b.rotation.x = 1.42; b.position.y = 0.16; b.position.z = 0.25;
    r.armL.rotation.set(-2.6, 0, -0.4); r.armR.rotation.set(-2.6, 0, 0.4);
    r.kneeL.rotation.x = 0.3; r.kneeR.rotation.x = 0.1;
  } else if (a.role === "gk") {
    if (a.state === "dive" && a.dive) {
      const f = Math.max(0, Math.min(1, a.dive.t / a.dive.dur));
      if (a.dive.y > 2.2 && Math.abs(a.dive.x - a.dive.x0) < 1.2) {
        // Bola por cima: salto para trás com os braços para o alto.
        b.rotation.x = -0.25 * f; b.position.y = Math.sin(f * Math.PI) * 0.45;
        r.armL.rotation.set(-3, 0, -0.2); r.armR.rotation.set(-3, 0, 0.2);
      } else {
        // Mergulho de lado, braços esticados para a bola.
        b.rotation.z = a.dive.side * Math.min(1.4, f * 2);
        b.position.y = Math.min(0.5, f * 0.75);
        r.armL.rotation.set(-3.05, 0, -0.18); r.armR.rotation.set(-3.05, 0, 0.18);
        r.elbowL.rotation.x = 0; r.elbowR.rotation.x = 0;
        r.legL.rotation.x = 0.1; r.legR.rotation.x = -0.25;
      }
    } else {
      // Base do goleiro: joelhos flexionados, braços abertos à frente.
      b.position.y -= 0.08; b.rotation.x = 0.18;
      r.kneeL.rotation.x = 0.5; r.kneeR.rotation.x = 0.5; r.legL.rotation.x -= 0.25; r.legR.rotation.x -= 0.25;
      r.armL.rotation.set(-0.55, 0, -0.75); r.armR.rotation.set(-0.55, 0, 0.75);
      r.elbowL.rotation.x = -0.45; r.elbowR.rotation.x = -0.45;
    }
  } else if (a.role === "def") {
    // Marcador perto de quem tem a bola: agachado, de lado, braços abertos.
    const c = ch.actors[ch.carrier];
    if (Math.hypot(c.x - a.x, c.z - a.z) < 3.5 && ch.phase === "play") {
      b.position.y -= 0.07; b.rotation.x += 0.15;
      r.kneeL.rotation.x += 0.35; r.kneeR.rotation.x += 0.35; r.legL.rotation.x -= 0.2; r.legR.rotation.x -= 0.2;
      r.armL.rotation.z = -0.55; r.armR.rotation.z = 0.55;
    }
  }

  // Chute/passe: perna direita vai atrás e chicoteia à frente; braços abrem para equilibrar.
  if (a.kickT >= 0 && a.kickT < 0.5 && a.state !== "celebrate" && a.state !== "sad") {
    const f = a.kickT / 0.5;
    const back = 0.32;
    if (f < back) { r.legR.rotation.x = 1.0 * (f / back); r.kneeR.rotation.x = 1.3 * (f / back); }
    else { const g = (f - back) / (1 - back); r.legR.rotation.x = 1.0 - 2.4 * Math.min(1, g * 1.6) + Math.max(0, g - 0.62) * 1.6; r.kneeR.rotation.x = 1.3 * (1 - Math.min(1, g * 2)) + 0.05; }
    r.legL.rotation.x = -0.1; r.kneeL.rotation.x = 0.25;
    r.armL.rotation.set(-0.4, 0, -0.9); r.armR.rotation.set(0.3, 0, 0.6);
    b.rotation.x = -0.12;
  }
  // Finta do drible: corpo pende para um lado e volta.
  if (a.feintT >= 0 && a.feintT < 0.4) {
    const s = a.i % 2 ? 1 : -1;
    b.rotation.z = Math.sin((a.feintT / 0.4) * Math.PI) * 0.4 * s;
    b.position.x = Math.sin((a.feintT / 0.4) * Math.PI) * 0.15 * s;
  }

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
