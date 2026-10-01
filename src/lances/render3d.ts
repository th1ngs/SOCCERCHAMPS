// Render 3D dos lances (three.js): estádio noturno, gramado listrado, gol com rede, jogadores animados
// nas cores dos clubes, bola com rastro, câmera que acompanha a jogada e comemoração de gol.
import * as THREE from "three";
import { BALL_R, BAR, GOAL_HALF, GOAL_Z, type Actor, type Chance, type LanceKit } from "./engine";

const SKINS = ["#f1c7a5", "#d9a47c", "#b97d55", "#8c5a3c", "#6b4330", "#4b2f22"];
const HAIR = ["#1d1714", "#3b2618", "#6b4424", "#a0703f", "#2a2a2a", "#c79a5c"];
const GK_KITS: [string, string][] = [["#f4c20d", "#1b1b1b"], ["#16a34a", "#0b3d1d"], ["#7c3aed", "#f5f3ff"], ["#ef4444", "#1b1b1b"]];

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 9) >>> 0;
const luminance = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d") as CanvasRenderingContext2D;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- Texturas ----------
/** Gramado: faixas de corte e linhas da metade ofensiva do campo (plano de x −50..50, z −20..80). */
function pitchTexture(): THREE.CanvasTexture {
  const S = 2048, PX = S / 100; // pixels por metro
  return canvasTex(S, S, (c) => {
    const X = (x: number) => (x + 50) * PX, Z = (z: number) => (80 - z) * PX;
    // Fora do campo: verde mais escuro.
    c.fillStyle = "#1d4d22"; c.fillRect(0, 0, S, S);
    for (let k = 0; k < 20; k++) {
      c.fillStyle = k % 2 ? "#2f7a33" : "#2a6f2e";
      const z0 = -20 + k * 5.5;
      c.fillRect(X(-34), Z(z0 + 5.5), 68 * PX, 5.5 * PX);
    }
    // Ruído suave para não parecer chapado.
    const img = c.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n * 1.2; img.data[i + 2] += n * 0.6;
    }
    c.putImageData(img, 0, 0);
    c.strokeStyle = "rgba(255,255,255,0.92)"; c.lineWidth = 0.12 * PX; c.fillStyle = "rgba(255,255,255,0.92)";
    const line = (x1: number, z1: number, x2: number, z2: number) => { c.beginPath(); c.moveTo(X(x1), Z(z1)); c.lineTo(X(x2), Z(z2)); c.stroke(); };
    line(-34, GOAL_Z, 34, GOAL_Z); line(-34, -20, -34, GOAL_Z); line(34, -20, 34, GOAL_Z); line(-34, 0, 34, 0);
    const box = (hw: number, d: number) => { line(-hw, GOAL_Z, -hw, GOAL_Z - d); line(hw, GOAL_Z, hw, GOAL_Z - d); line(-hw, GOAL_Z - d, hw, GOAL_Z - d); };
    box(20.16, 16.5); box(9.16, 5.5);
    c.beginPath(); c.arc(X(0), Z(GOAL_Z - 11), 0.2 * PX, 0, Math.PI * 2); c.fill();
    // Meia-lua: arco de raio 9,15 m em volta da marca do pênalti, fora da área.
    const a = Math.acos(5.5 / 9.15);
    c.beginPath(); c.arc(X(0), Z(GOAL_Z - 11), 9.15 * PX, Math.PI / 2 - a, Math.PI / 2 + a); c.stroke();
    c.beginPath(); c.arc(X(0), Z(0), 9.15 * PX, Math.PI, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(X(0), Z(0), 0.2 * PX, 0, Math.PI * 2); c.fill();
    // Escanteios.
    c.beginPath(); c.arc(X(-34), Z(GOAL_Z), 1 * PX, -Math.PI / 2, 0); c.stroke();
    c.beginPath(); c.arc(X(34), Z(GOAL_Z), 1 * PX, Math.PI, Math.PI * 1.5); c.stroke();
  });
}

function netTexture(): THREE.CanvasTexture {
  return canvasTex(256, 256, (c) => {
    c.clearRect(0, 0, 256, 256);
    c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 2;
    for (let i = 0; i <= 256; i += 16) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(256, i); c.stroke();
    }
  });
}

function crowdTexture(colors: string[]): THREE.CanvasTexture {
  return canvasTex(1024, 256, (c) => {
    c.fillStyle = "#0d1522"; c.fillRect(0, 0, 1024, 256);
    for (let row = 0; row < 16; row++) { c.fillStyle = row % 2 ? "#162133" : "#111a29"; c.fillRect(0, row * 16, 1024, 16); }
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 128; col++) {
        if (Math.random() < 0.08) continue;
        const x = col * 8 + (row % 2) * 4 + Math.random() * 2, y = row * 16 + 4;
        c.fillStyle = Math.random() < 0.45 ? colors[Math.floor(Math.random() * colors.length)] : ["#c9b8a6", "#7a6a5a", "#e8e2d8", "#3a3f4a"][Math.floor(Math.random() * 4)];
        c.beginPath(); c.arc(x + 3, y + 3, 3, 0, Math.PI * 2); c.fill();
        c.fillRect(x, y + 6, 6, 6);
      }
    }
  });
}

function boardTexture(text: string, a: string, b: string): THREE.CanvasTexture {
  return canvasTex(1024, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 1024, 0);
    g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, a);
    c.fillStyle = g; c.fillRect(0, 0, 1024, 64);
    c.fillStyle = "#ffffff"; c.font = "italic 900 34px Arial Narrow, Arial, sans-serif"; c.textBaseline = "middle"; c.textAlign = "center";
    c.fillText(text, 256, 34); c.fillText(text, 768, 34);
  });
}

function ballTexture(): THREE.CanvasTexture {
  return canvasTex(512, 256, (c) => {
    c.fillStyle = "#f7f7f7"; c.fillRect(0, 0, 512, 256);
    c.fillStyle = "#151515";
    const pent = (x: number, y: number, r: number) => {
      c.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      c.closePath(); c.fill();
    };
    [[64, 64], [192, 64], [320, 64], [448, 64], [0, 192], [128, 192], [256, 192], [384, 192], [512, 192], [128, 128], [384, 128]].forEach(([x, y]) => pent(x, y, 26));
    c.strokeStyle = "#9a9a9a"; c.lineWidth = 2;
    for (let x = 0; x < 512; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 32, 256); c.stroke(); }
  });
}

/** Camisa: cor, padrão (listras/faixa) e número nas costas. */
function shirtTexture(kit: LanceKit, num: number, gk: [string, string] | null): THREE.CanvasTexture {
  const [p, s] = gk ?? kit.colors;
  const pattern = gk ? "solid" : kit.pattern;
  return canvasTex(256, 128, (c) => {
    c.fillStyle = p; c.fillRect(0, 0, 256, 128);
    c.fillStyle = s;
    if (pattern === "v") for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 14, 128);
    else if (pattern === "h") for (let y = 0; y < 128; y += 28) c.fillRect(0, y, 256, 12);
    else if (pattern === "half") c.fillRect(0, 0, 128, 128);
    else if (pattern === "sash") { c.beginPath(); c.moveTo(150, 0); c.lineTo(190, 0); c.lineTo(110, 128); c.lineTo(70, 128); c.fill(); }
    else { c.fillRect(0, 0, 256, 8); c.fillRect(0, 120, 256, 8); }
    // Número nas costas (metade de trás do cilindro: u ~ 0,5) e pequeno no peito.
    const ink = luminance(p) > 0.55 ? "#111" : "#fff";
    c.fillStyle = ink; c.strokeStyle = luminance(p) > 0.55 ? "#fff" : "#000"; c.lineWidth = 3;
    c.font = "900 64px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.strokeText(String(num || ""), 128, 66); c.fillText(String(num || ""), 128, 66);
    c.font = "900 22px Arial, sans-serif";
    c.fillText(String(num || ""), 30, 46); c.fillText(String(num || ""), 226, 46);
  });
}

function labelTexture(text: string, color: string): THREE.CanvasTexture {
  return canvasTex(256, 64, (c) => {
    c.font = "800 30px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const w = Math.min(250, c.measureText(text).width + 28);
    c.fillStyle = "rgba(5,10,18,0.78)";
    c.beginPath(); c.roundRect(128 - w / 2, 8, w, 46, 12); c.fill();
    c.strokeStyle = color; c.lineWidth = 3; c.stroke();
    c.fillStyle = "#fff"; c.fillText(text, 128, 32);
  });
}

// ---------- Jogador ----------
interface PlayerRig {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Mesh;
  ring: THREE.Mesh;
  label: THREE.Sprite | null;
}

function buildPlayer(kit: LanceKit, num: number, id: string, gk: [string, string] | null, showLabel: string | null, labelColor: string): PlayerRig {
  const h = hash(id);
  const skin = SKINS[h % SKINS.length], hair = HAIR[(h >>> 4) % HAIR.length];
  const [, sec] = gk ?? kit.colors;
  const shortsColor = gk ? gk[1] : luminance(kit.colors[0]) > 0.7 ? kit.colors[1] : "#f2f2f2";
  const sockColor = gk ? gk[0] : kit.colors[0];
  const std = (color: string, rough = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  const skinMat = std(skin, 0.6);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Tronco com a camisa.
  const shirt = new THREE.MeshStandardMaterial({ map: shirtTexture(kit, num, gk), roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.56, 18, 1), shirt);
  torso.position.y = 1.24; torso.scale.z = 0.72; torso.rotation.y = Math.PI / 2;
  torso.castShadow = true;
  body.add(torso);
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 14), std(shortsColor));
  shorts.position.y = 0.9; shorts.scale.z = 0.8; shorts.castShadow = true;
  body.add(shorts);
  // Cabeça e cabelo.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), skinMat);
  head.position.y = 1.67; head.castShadow = true;
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), std(hair, 0.9));
  hairMesh.position.y = 0.01; hairMesh.rotation.x = -0.25;
  head.add(hairMesh);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skinMat);
  neck.position.y = 1.55;
  body.add(head, neck);
  // Pernas (pivô no quadril) e braços (pivô no ombro).
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.09, 0.86, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 10), skinMat);
    thigh.position.y = -0.2; thigh.castShadow = true;
    const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 10), std(sockColor));
    sock.position.y = -0.56; sock.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.24), std("#121212", 0.4));
    boot.position.set(0, -0.78, 0.04); boot.castShadow = true;
    g.add(thigh, sock, boot);
    return g;
  };
  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.26, 1.46, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 8), std(gk ? gk[0] : kit.colors[0]));
    sleeve.position.y = -0.1; sleeve.castShadow = true;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 4, 8), gk ? std(sec) : skinMat);
    fore.position.y = -0.34; fore.castShadow = true;
    g.add(sleeve, fore);
    return g;
  };
  const legL = leg(-1), legR = leg(1), armL = arm(-1), armR = arm(1);
  body.add(legL, legR, armL, armR);
  // Anel no gramado (indicador de quem conduz e de quem pode receber).
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
  root.add(ring);
  let label: THREE.Sprite | null = null;
  if (showLabel) {
    label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(showLabel, labelColor), depthTest: false, transparent: true }));
    label.scale.set(1.6, 0.4, 1); label.position.y = 2.25; label.renderOrder = 10;
    root.add(label);
  }
  return { root, body, legL, legR, armL, armR, head, ring, label };
}

// ---------- Cena ----------
export class LanceScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private rigs: PlayerRig[] = [];
  private ball: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private trail: THREE.Line;
  private trailPts: THREE.Vector3[] = [];
  private aim: THREE.Mesh;
  private moveMark: THREE.Mesh;
  private netBack!: THREE.Mesh;
  private keyLight: THREE.DirectionalLight;
  private confetti: THREE.Points | null = null;
  private confettiVel: Float32Array | null = null;
  private camPos = new THREE.Vector3(0, 30, -10);
  private camLook = new THREE.Vector3(0, 0, 40);
  private shake = 0;
  private orbit = 0;
  private chance: Chance | null = null;
  private lastEvents = { goal: false, save: false };
  private disposables: { dispose: () => void }[] = [];
  private w = 1;
  private h = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
    const s = this.scene;
    s.background = new THREE.Color("#0a1424");
    s.fog = new THREE.Fog("#0a1424", 90, 190);

    // Céu noturno em degradê.
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(220, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { top: { value: new THREE.Color("#050b16") }, bottom: { value: new THREE.Color("#1b3554") } },
        vertexShader: "varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.0); }",
        fragmentShader: "uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }",
      }),
    );
    s.add(sky);

    s.add(new THREE.HemisphereLight("#bcd6ff", "#1c3a1c", 0.75));
    const key = new THREE.DirectionalLight("#fff6e8", 2.4);
    key.position.set(-22, 40, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 110;
    key.shadow.bias = -0.0004;
    s.add(key, key.target);
    this.keyLight = key;
    const fill = new THREE.DirectionalLight("#cfe0ff", 0.8);
    fill.position.set(30, 30, 60);
    s.add(fill);

    // Gramado.
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.set(0, 0, 30);
    pitch.receiveShadow = true;
    s.add(pitch);

    this.buildGoal();
    this.buildStadium();

    // Bola, sombra e rastro.
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 16), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.45 }));
    this.ball.castShadow = true;
    s.add(this.ball);
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.35, depthWrite: false }));
    this.ballShadow.rotation.x = -Math.PI / 2;
    s.add(this.ballShadow);
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#fff3b0", transparent: true, opacity: 0.55 }));
    s.add(this.trail);
    // Mira no gol e marcador de condução.
    this.aim = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 32), new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
    this.aim.visible = false; this.aim.renderOrder = 20;
    s.add(this.aim);
    this.moveMark = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 32), new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.8, depthWrite: false }));
    this.moveMark.rotation.x = -Math.PI / 2; this.moveMark.position.y = 0.03; this.moveMark.visible = false;
    s.add(this.moveMark);
  }

  private buildGoal(): void {
    const s = this.scene;
    const white = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, metalness: 0.1 });
    const post = (x: number) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BAR, 14), white);
      m.position.set(x, BAR / 2, GOAL_Z); m.castShadow = true; s.add(m);
    };
    post(-GOAL_HALF); post(GOAL_HALF);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_HALF * 2 + 0.12, 14), white);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, BAR, GOAL_Z); bar.castShadow = true;
    s.add(bar);
    const netMat = new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
    const depth = 2;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_HALF * 2, BAR, 8, 4), netMat);
    back.position.set(0, BAR / 2, GOAL_Z + depth);
    this.netBack = back;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_HALF * 2, depth), netMat);
    top.rotation.x = Math.PI / 2; top.position.set(0, BAR, GOAL_Z + depth / 2);
    const side = (x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(depth, BAR), netMat);
      m.rotation.y = Math.PI / 2; m.position.set(x, BAR / 2, GOAL_Z + depth / 2); s.add(m);
    };
    side(-GOAL_HALF); side(GOAL_HALF);
    s.add(back, top);
  }

  private buildStadium(): void {
    const s = this.scene;
    const crowd = crowdTexture(["#ffd23f", "#ef4444", "#3b82f6", "#22c55e", "#ffffff"]);
    crowd.wrapS = THREE.RepeatWrapping;
    const stand = (w: number, x: number, z: number, ry: number) => {
      const tex = crowd.clone(); tex.needsUpdate = true; tex.repeat.set(w / 13, 1.6); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 18), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: new THREE.Color("#141b28"), emissiveMap: tex, emissiveIntensity: 0.55 }));
      m.position.set(x, 7, z); m.rotation.set(-0.85, ry, 0, "YXZ");
      s.add(m);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 7), new THREE.MeshStandardMaterial({ color: "#1d2533", roughness: 0.8 }));
      roof.position.set(x - Math.sin(ry) * 6, 14.5, z - Math.cos(ry) * 6); roof.rotation.y = ry;
      s.add(roof);
    };
    stand(120, 0, GOAL_Z + 20, Math.PI); // atrás do gol
    stand(110, -50, 25, Math.PI / 2);
    stand(110, 50, 25, -Math.PI / 2);
    // Placas de publicidade (LED).
    const boards: [number, number, number, number, string][] = [[0, GOAL_Z + 4, 72, Math.PI, "SOCCER CHAMPS"], [-36.5, 25, 70, Math.PI / 2, "LANCES 3D"], [36.5, 25, 70, -Math.PI / 2, "SOCCER CHAMPS"]];
    for (const [x, z, w, ry, text] of boards) {
      const tex = boardTexture(text, "#0b3d91", "#1d4ed8");
      tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(w / 24, 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.2), new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.6 }));
      m.position.set(x, 0.45, z); m.rotation.y = ry; m.castShadow = true;
      s.add(m);
    }
    // Torres de refletores com brilho.
    const glowTex = canvasTex(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,240,1)"); g.addColorStop(0.3, "rgba(255,245,210,0.55)"); g.addColorStop(1, "rgba(255,240,200,0)");
      c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    });
    for (const [x, z] of [[-44, GOAL_Z + 10], [44, GOAL_Z + 10], [-48, -5], [48, -5]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 34, 8), new THREE.MeshStandardMaterial({ color: "#2b3445" }));
      pole.position.set(x, 17, z);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.5), new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: new THREE.Color("#fffbe8"), emissiveIntensity: 1.6 }));
      panel.position.set(x, 35, z); panel.lookAt(0, 0, 30);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(22, 22, 1); glow.position.set(x, 35, z);
      s.add(pole, panel, glow);
    }
  }

  // ---------- Lance ----------
  setChance(chance: Chance): void {
    for (const r of this.rigs) this.scene.remove(r.root);
    this.rigs = [];
    this.chance = chance;
    const gkKit = GK_KITS[hash(chance.setup.defense.kit.name) % GK_KITS.length];
    for (const a of chance.actors) {
      const kit = a.role === "att" ? chance.setup.attack.kit : chance.setup.defense.kit;
      const label = a.role === "att" ? `${a.p.num || ""} ${a.p.name}`.trim() : null;
      const rig = buildPlayer(kit, a.p.num, a.p.id, a.role === "gk" ? gkKit : null, label, "#ffd23f");
      this.scene.add(rig.root);
      this.rigs.push(rig);
    }
    this.trailPts = [];
    this.lastEvents = { goal: false, save: false };
    this.orbit = 0;
    if (this.confetti) { this.scene.remove(this.confetti); this.confetti = null; }
    this.netBack.position.z = GOAL_Z + 2;
    // Câmera começa alta e desce até o lance.
    const c = chance.actors[chance.carrier];
    this.camPos.set(c.x * 0.5, 14, c.z - 18);
    this.camLook.set(0, 0, GOAL_Z - 8);
  }

  resize(w: number, h: number, dpr: number): void {
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(Math.min(2, dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.9 ? 64 : 50;
    this.camera.updateProjectionMatrix();
  }

  setAim(p: { x: number; y: number } | null): void {
    this.aim.visible = !!p;
    if (p) this.aim.position.set(p.x, Math.max(0.05, p.y), GOAL_Z - 0.05);
  }

  /** Converte um ponto do mundo para pixels CSS do canvas. */
  toScreen(x: number, y: number, z: number): { x: number; y: number; behind: boolean } {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h, behind: v.z > 1 };
  }

  private ray(sx: number, sy: number): THREE.Ray {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1), this.camera);
    return rc.ray;
  }

  /** Ponto do gramado sob o pixel (ou null se apontar para o céu). */
  groundAt(sx: number, sy: number): { x: number; z: number } | null {
    const hit = this.ray(sx, sy).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    return hit ? { x: hit.x, z: hit.z } : null;
  }

  /** Ponto no plano da linha do gol sob o pixel. */
  goalPlaneAt(sx: number, sy: number): { x: number; y: number } | null {
    const hit = this.ray(sx, sy).intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1), GOAL_Z), new THREE.Vector3());
    return hit ? { x: hit.x, y: hit.y } : null;
  }

  // ---------- Quadro ----------
  render(dt: number, now: number): void {
    const ch = this.chance;
    if (ch) this.sync(ch, dt, now);
    this.renderer.render(this.scene, this.camera);
  }

  private sync(ch: Chance, dt: number, now: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(now * 6);
    ch.actors.forEach((a, i) => this.poseRig(this.rigs[i], a, ch, pulse));
    // Bola.
    const b = ch.ball;
    this.ball.position.set(b.x, b.y, b.z);
    const sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (sp > 0.05) {
      const axis = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
      this.ball.rotateOnWorldAxis(axis, (sp * dt) / BALL_R);
    }
    this.ballShadow.position.set(b.x, 0.015, b.z);
    const sh = Math.max(0.3, 1 - b.y / 4);
    this.ballShadow.scale.setScalar(sh);
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.35 * sh;
    // Rastro dos chutes e passes fortes.
    const fast = (ch.phase === "shot" || ch.phase === "done") && sp + Math.abs(b.vy) > 8;
    if (fast) { this.trailPts.push(new THREE.Vector3(b.x, b.y, b.z)); if (this.trailPts.length > 26) this.trailPts.shift(); }
    else if (this.trailPts.length) this.trailPts.shift();
    this.trail.geometry.setFromPoints(this.trailPts.length > 1 ? this.trailPts : [new THREE.Vector3(), new THREE.Vector3()]);
    this.trail.visible = this.trailPts.length > 1;
    // Marcador de condução.
    this.moveMark.visible = !!ch.moveTarget && ch.phase === "play";
    if (ch.moveTarget) { this.moveMark.position.x = ch.moveTarget.x; this.moveMark.position.z = ch.moveTarget.z; this.moveMark.scale.setScalar(0.8 + pulse * 0.3); }
    // Gol: rede estufa, confete e câmera em volta do gol.
    const goal = !!ch.result?.goal;
    if (goal && !this.lastEvents.goal) { this.lastEvents.goal = true; this.spawnConfetti(ch); }
    if (ch.result?.outcome === "save" && !this.lastEvents.save) { this.lastEvents.save = true; this.shake = 0.35; }
    if (goal) this.netBack.position.z = GOAL_Z + 2 + Math.min(0.6, ch.doneT * 3) * Math.max(0, 1 - ch.doneT * 0.6);
    this.updateConfetti(dt);
    this.updateCamera(ch, dt);
    // Luz de sombra acompanha a bola.
    this.keyLight.position.set(b.x - 22, 40, b.z - 12);
    this.keyLight.target.position.set(b.x, 0, b.z + 4);
  }

  private poseRig(r: PlayerRig, a: Actor, ch: Chance, pulse: number): void {
    r.root.position.set(a.x, a.y, a.z);
    r.root.rotation.set(0, a.heading, 0);
    r.body.rotation.set(0, 0, 0);
    r.body.position.set(0, 0, 0);
    const sp = Math.min(1, Math.sqrt(a.vx * a.vx + a.vz * a.vz) / 7);
    const swing = Math.sin(a.stride) * 0.85 * sp;
    r.legL.rotation.x = swing; r.legR.rotation.x = -swing;
    r.armL.rotation.set(-swing * 0.8, 0, -0.08); r.armR.rotation.set(swing * 0.8, 0, 0.08);
    r.body.position.y = Math.abs(Math.cos(a.stride)) * 0.05 * sp;
    r.body.rotation.x = sp * 0.12;
    if (a.state === "celebrate") {
      r.armL.rotation.set(Math.PI * 0.9, 0, -0.4); r.armR.rotation.set(Math.PI * 0.9, 0, 0.4);
      r.legL.rotation.x = 0.2; r.legR.rotation.x = -0.1;
    } else if (a.state === "sad") {
      r.body.rotation.x = 0.35; r.armL.rotation.set(0.1, 0, 0.1); r.armR.rotation.set(0.1, 0, -0.1);
    } else if (a.state === "tackle") {
      r.body.rotation.x = -1.2; r.body.position.y = 0.25; r.legL.rotation.x = -1.2; r.legR.rotation.x = -0.6;
    } else if (a.state === "down") {
      r.body.rotation.x = 1.35; r.body.position.y = 0.2;
    } else if (a.role === "gk") {
      if (a.state === "dive" && a.dive) {
        const f = Math.max(0, Math.min(1, a.dive.t / a.dive.dur));
        // Mergulho para o lado (o goleiro olha para o campo: lado invertido).
        r.body.rotation.z = a.dive.side * Math.min(1.35, f * 1.9);
        r.body.position.y = Math.min(0.5, f * 0.7);
        r.armL.rotation.set(Math.PI, 0, -0.2); r.armR.rotation.set(Math.PI, 0, 0.2);
      } else {
        // Base de goleiro: joelhos flexionados, braços abertos.
        r.armL.rotation.set(-0.4, 0, -0.7); r.armR.rotation.set(-0.4, 0, 0.7);
        r.body.position.y -= 0.06;
      }
    }
    // Anéis: quem conduz (dourado) e quem pode receber (branco pulsando).
    const ring = r.ring.material as THREE.MeshBasicMaterial;
    const isCarrier = a.i === ch.carrier && ch.phase !== "done" && ch.ball.owner === a.i;
    if (a.role === "att" && ch.phase === "play") {
      ring.color.set(isCarrier ? "#ffd23f" : "#ffffff");
      ring.opacity = isCarrier ? 0.95 : 0.35 + pulse * 0.45;
      r.ring.scale.setScalar(isCarrier ? 1 : 1 + pulse * 0.15);
    } else ring.opacity = 0;
    if (r.label) r.label.visible = a.role === "att" && ch.phase !== "done" && !isCarrier;
  }

  private updateCamera(ch: Chance, dt: number): void {
    const b = ch.ball;
    const portrait = this.w / this.h < 0.9;
    const back = portrait ? 10.5 : 8, high = portrait ? 6.2 : 4.6;
    const pos = new THREE.Vector3(), look = new THREE.Vector3();
    let rate = 3.2;
    if (ch.phase === "done" && ch.result?.goal) {
      // Gol: câmera gira devagar atrás do gol, olhando a rede e os jogadores comemorando.
      this.orbit += dt * 0.35;
      const ang = -0.9 + this.orbit;
      pos.set(Math.sin(ang) * 11, 3.6, GOAL_Z - 6 + Math.cos(ang) * -4);
      look.set(b.x * 0.5, 1.2, GOAL_Z - 1);
      rate = 1.6;
    } else if (ch.phase === "shot" || ch.phase === "done") {
      pos.set(b.x * 0.6, Math.max(3.4, high - 2), Math.min(GOAL_Z - 9, b.z - back * 0.75));
      look.set(b.x * 0.35, 1.1, GOAL_Z);
      rate = 2.4;
    } else {
      pos.set(b.x * 0.72, high, b.z - back);
      look.set(b.x * 0.5, 0.9, Math.min(GOAL_Z + 2, b.z + 13));
      rate = ch.phase === "intro" ? 2.2 : 3.4;
    }
    const k = 1 - Math.exp(-rate * dt);
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.3;
    }
    this.camera.lookAt(this.camLook);
  }

  private spawnConfetti(ch: Chance): void {
    const n = 420;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    const palette = [...ch.setup.attack.kit.colors, "#ffd23f", "#ffffff"].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20; pos[i * 3 + 1] = 8 + Math.random() * 8; pos[i * 3 + 2] = GOAL_Z - 6 + (Math.random() - 0.5) * 14;
      vel[i * 3] = (Math.random() - 0.5) * 2; vel[i * 3 + 1] = -1.5 - Math.random() * 2; vel[i * 3 + 2] = (Math.random() - 0.5) * 2;
      const c = palette[i % palette.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.confetti = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true }));
    this.confettiVel = vel;
    this.scene.add(this.confetti);
  }

  private updateConfetti(dt: number): void {
    if (!this.confetti || !this.confettiVel) return;
    const attr = this.confetti.geometry.getAttribute("position") as THREE.BufferAttribute;
    const p = attr.array as Float32Array, v = this.confettiVel;
    for (let i = 0; i < p.length; i += 3) {
      p[i] += (v[i] + Math.sin(p[i + 1] * 2 + i) * 0.8) * dt; p[i + 1] = Math.max(0.02, p[i + 1] + v[i + 1] * dt); p[i + 2] += v[i + 2] * dt;
    }
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
      for (const x of mats) {
        const withMap = x as THREE.MeshStandardMaterial;
        withMap.map?.dispose();
        x.dispose();
      }
    });
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}
