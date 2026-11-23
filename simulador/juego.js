// Simulador de conducción Clase B (Chile) — juego educativo original.
import * as THREE from './three.module.min.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;

/* ================= MAPA ================= */
const S = 80, N = 5, W = 9, HW = 4.5, LO = 2.25, SWK = 3, MAXC = (N - 1) * S;
const RB = { i: 2, j: 2, x: 2 * S, z: 2 * S, out: 16, isl: 7, path: 11.5 };
const RBH = Math.sqrt(RB.out * RB.out - LO * LO);
const DIRS = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
const right = d => ({ x: -d.z, z: d.x });
const isRB = (i, j) => i === RB.i && j === RB.j;
const half = (i, j) => isRB(i, j) ? RBH : HW;
const inGrid = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const axisOf = d => Math.abs(d.x) > Math.abs(d.z) ? 'H' : 'V';
const snap = (x, z) => Math.abs(x) > Math.abs(z) ? { x: Math.sign(x), z: 0 } : { x: 0, z: Math.sign(z) };
const same = (a, b) => a.x === b.x && a.z === b.z;
const isLeft = (a, b) => b.x === a.z && b.z === -a.x;
const isRight = (a, b) => b.x === -a.z && b.z === a.x;
const segKeyOf = (i, j, d) => d.x ? 'H' + j + '_' + Math.min(i, i + d.x) : 'V' + i + '_' + Math.min(j, j + d.z);

const LIGHTS = ['1,1', '3,1', '1,3', '3,3'];
const CTRL = {};
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const k = i + ',' + j; let c;
  if (isRB(i, j)) c = { t: 'rb' };
  else if (LIGHTS.includes(k)) c = { t: 'light', off: Math.random() * 31 };
  else if ((i === 0 || i === N - 1) && (j === 0 || j === N - 1)) c = { t: 'none' };
  else if (j === 0 || j === N - 1) c = { t: 'stop', ax: 'V' };
  else if (i === 0 || i === N - 1) c = { t: 'stop', ax: 'H' };
  else c = ({ '2,1': { t: 'stop', ax: 'V' }, '1,2': { t: 'yield', ax: 'H' }, '3,2': { t: 'stop', ax: 'H' }, '2,3': { t: 'yield', ax: 'V' } })[k];
  CTRL[k] = c;
}
const ONEWAY = { H0_0: { x: 1, z: 0 }, H0_1: { x: 1, z: 0 }, H0_2: { x: 1, z: 0 }, H0_3: { x: 1, z: 0 }, V4_0: { x: 0, z: 1 } };
const SEG_LIMIT = { V1_2: 30 };
const NOPARK = 'H2_0';
const NOLEFT = [{ i: 3, j: 3, d: { x: 1, z: 0 } }];
const noLeftAt = (i, j, d) => NOLEFT.some(n => n.i === i && n.j === j && same(n.d, d));
const edgeAllowed = (i, j, d) => { const r = ONEWAY[segKeyOf(i, j, d)]; return !r || same(r, d); };
const CROSSWALKS = [['H1_0', .5], ['V3_0', .5], ['H3_3', .5], ['V1_2', .5, true], ['V0_1', .45], ['H2_2', .42], ['V2_3', .5]];
const BAY = { x0: 2 * S + 20, z0: 4 * S + HW, n: 5, len: 6, w: 2.6, free: 2 };
const inBay = (x, z) => x > BAY.x0 && x < BAY.x0 + BAY.n * BAY.len && z > BAY.z0 - .1 && z < BAY.z0 + BAY.w;
const spotC = k => ({ x: BAY.x0 + k * BAY.len + BAY.len / 2, z: BAY.z0 + BAY.w / 2 });

function lightState(i, j, ax, t) {
  const c = CTRL[i + ',' + j]; let u = (t + c.off) % 31;
  if (ax === 'V') u = (u + 15.5) % 31;
  return u < 11 ? 'g' : u < 14 ? 'y' : 'r';
}

function locate(x, z) {
  const dxr = x - RB.x, dzr = z - RB.z, rr = Math.hypot(dxr, dzr);
  if (rr < RB.out) return rr < RB.isl ? { k: 'island' } : { k: 'rb', r: rr, i: RB.i, j: RB.j };
  const i = Math.round(x / S), j = Math.round(z / S);
  const nearV = i >= 0 && i < N && Math.abs(x - i * S) < HW && z > -HW && z < MAXC + HW;
  const nearH = j >= 0 && j < N && Math.abs(z - j * S) < HW && x > -HW && x < MAXC + HW;
  if (nearV && nearH) return { k: 'node', i, j };
  if (nearH) { const si = clamp(Math.floor(x / S), 0, N - 2); return { k: 'H', j, i: si, key: 'H' + j + '_' + si, lat: z - j * S, along: x - si * S }; }
  if (nearV) { const sj = clamp(Math.floor(z / S), 0, N - 2); return { k: 'V', i, j: sj, key: 'V' + i + '_' + sj, lat: x - i * S, along: z - sj * S }; }
  if (inBay(x, z)) return { k: 'bay' };
  if (rr < RB.out + SWK) return { k: 'walk' };
  const ci = clamp(Math.round(x / S), 0, N - 1), cj = clamp(Math.round(z / S), 0, N - 1);
  const inZ = z > -HW - SWK && z < MAXC + HW + SWK, inX = x > -HW - SWK && x < MAXC + HW + SWK;
  const d = Math.min(inZ ? Math.abs(x - ci * S) : 1e9, inX ? Math.abs(z - cj * S) : 1e9);
  return d < HW + SWK ? { k: 'walk' } : { k: 'bldg' };
}

/* ================= RENDER ================= */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc3e6);
scene.fog = new THREE.Fog(0x9cc3e6, 70, 280);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(80, 140, 40); scene.add(sun);
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 75 : 60; camera.updateProjectionMatrix();
  $('rot').classList.toggle('hidden', !(w < h && w < 700 && running));
}
addEventListener('resize', resize);

const M = c => new THREE.MeshLambertMaterial({ color: c });
const matRoad = M(0x3d3f44), matWalk = M(0xbdbcb5), matLot = M(0x8fae6a), matWhite = M(0xf4f4f4), matYellow = M(0xf2c200);
function plane(w, h, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, y, z); scene.add(m); return m;
}

function buildWorld() {
  plane(MAXC + 160, MAXC + 160, matWalk, MAXC / 2, 0, MAXC / 2);
  for (let j = 0; j < N; j++) plane(MAXC + W, W, matRoad, MAXC / 2, 0.02, j * S);
  for (let i = 0; i < N; i++) plane(W, MAXC + W, matRoad, i * S, 0.021, MAXC / 2);
  const rbd = new THREE.Mesh(new THREE.CircleGeometry(RB.out, 48), matRoad); rbd.rotation.x = -Math.PI / 2; rbd.position.set(RB.x, 0.025, RB.z); scene.add(rbd);
  const isl = new THREE.Mesh(new THREE.CylinderGeometry(RB.isl, RB.isl, 0.35, 40), M(0x5f9e45)); isl.position.set(RB.x, 0.17, RB.z); scene.add(isl);
  const curb = new THREE.Mesh(new THREE.TorusGeometry(RB.isl, 0.18, 6, 40), matWhite); curb.rotation.x = Math.PI / 2; curb.position.set(RB.x, 0.3, RB.z); scene.add(curb);
  const mon = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.1, 6, 8), M(0xd8cdb5)); mon.position.set(RB.x, 3.2, RB.z); scene.add(mon);

  // demarcación (instanciada)
  const dashes = [], stripes = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N - 1; i++) {
    const a = i * S + half(i, j) + 3, b = (i + 1) * S - half(i + 1, j) - 3;
    for (let x = a; x < b; x += 6) dashes.push([x + 1.5, j * S, 0]);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N - 1; j++) {
    const a = j * S + half(i, j) + 3, b = (j + 1) * S - half(i, j + 1) - 3;
    for (let z = a; z < b; z += 6) dashes.push([i * S, z + 1.5, 1]);
  }
  const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 3), matWhite, dashes.length);
  const o = new THREE.Object3D();
  dashes.forEach((d, k) => { o.position.set(d[0], 0.04, d[1]); o.rotation.set(-Math.PI / 2, 0, d[2] ? 0 : Math.PI / 2); o.updateMatrix(); dm.setMatrixAt(k, o.matrix); });
  scene.add(dm);
  // pasos de cebra
  for (const cw of CW) for (let s = -HW + 0.5; s <= HW - 0.4; s += 1.0) stripes.push([cw.cx + cw.a.x * s, cw.cz + cw.a.z * s, cw.u.x ? 1 : 0]);
  // cebras en cruces con semáforo
  for (const k of LIGHTS) {
    const [i, j] = k.split(',').map(Number);
    for (const d of DIRS) {
      if (!inGrid(i - d.x, j - d.z)) continue;
      const cx = i * S - d.x * (HW + 2.2), cz = j * S - d.z * (HW + 2.2), a = right(d);
      for (let s = -HW + 0.5; s <= HW - 0.4; s += 1.0) stripes.push([cx + a.x * s, cz + a.z * s, d.x ? 1 : 0]);
    }
  }
  const sm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 3.2), matWhite, stripes.length);
  stripes.forEach((d, k) => { o.position.set(d[0], 0.041, d[1]); o.rotation.set(-Math.PI / 2, 0, d[2] ? Math.PI / 2 : 0); o.updateMatrix(); sm.setMatrixAt(k, o.matrix); });
  scene.add(sm);
  // líneas de detención
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const c = CTRL[i + ',' + j]; if (c.t === 'none') continue;
    for (const d of DIRS) {
      if (!inGrid(i - d.x, j - d.z) || !edgeAllowed(i - d.x, j - d.z, d)) continue;
      const ax = axisOf(d);
      if (!(c.t === 'light' || c.t === 'rb' || c.ax === ax)) continue;
      const r = right(d), back = c.t === 'light' ? HW + 4.4 : half(i, j) + 0.4;
      const l = new THREE.Mesh(new THREE.PlaneGeometry(c.t === 'rb' || c.t === 'yield' ? 4.2 : 4.2, c.t === 'yield' || c.t === 'rb' ? 0.25 : 0.45), c.t === 'yield' || c.t === 'rb' ? matWhite : matWhite);
      l.rotation.x = -Math.PI / 2; l.rotation.z = d.x ? Math.PI / 2 : 0;
      l.position.set(i * S - d.x * back + r.x * LO, 0.042, j * S - d.z * back + r.z * LO); scene.add(l);
      if (c.t === 'stop') { const t = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), new THREE.MeshLambertMaterial({ map: textTex('PARE', '#ffffff'), transparent: true }));
        t.rotation.x = -Math.PI / 2; t.rotation.z = Math.atan2(-d.x, -d.z) ; t.position.set(i * S - d.x * (back + 3) + r.x * LO, 0.043, j * S - d.z * (back + 3) + r.z * LO); scene.add(t); }
    }
  }
  // estacionamientos
  plane(BAY.n * BAY.len, BAY.w, matRoad, BAY.x0 + BAY.n * BAY.len / 2, 0.03, BAY.z0 + BAY.w / 2);
  for (let k = 0; k <= BAY.n; k++) plane(0.15, BAY.w, matWhite, BAY.x0 + k * BAY.len, 0.045, BAY.z0 + BAY.w / 2);

  // manzanas
  const winTex = windowTex();
  const pal = [0xe8dcc8, 0xc9d6df, 0xd9b99b, 0xb8c4a6, 0xe0c9c9, 0xcfcfcf, 0xa9b8c9, 0xf0e2b6];
  const trees = [];
  for (let bi = -1; bi < N; bi++) for (let bj = -1; bj < N; bj++) {
    const x0 = bi < 0 ? -70 : bi * S + 7.5, x1 = bi >= N - 1 ? MAXC + 70 : (bi + 1) * S - 7.5;
    const z0 = bj < 0 ? -70 : bj * S + 7.5, z1 = bj >= N - 1 ? MAXC + 70 : (bj + 1) * S - 7.5;
    addLot(x0, z0, x1, z1);
    // árboles en el borde
    const edge = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az); for (let t = 6; t < L - 4; t += 13) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L; if (Math.hypot(x - RB.x, z - RB.z) > 22) trees.push([x, z]); } };
    const ix0 = x0 + 1.4, ix1 = x1 - 1.4, iz0 = z0 + 1.4, iz1 = z1 - 1.4;
    if (bi >= 0) edge(ix0, iz0, ix0, iz1); if (bi < N - 1) edge(ix1, iz0, ix1, iz1);
    if (bj >= 0) edge(ix0, iz0, ix1, iz0); if (bj < N - 1) edge(ix0, iz1, ix1, iz1);
    if (bi === 0 && bj === 2) { addSchool(); continue; }
    if (bi === 2 && bj === 1) { addPark(x0, z0, x1, z1); continue; }
    // edificios
    const bx0 = Math.max(x0, bi * S - 40) + 4, bx1 = Math.min(x1, (bi + 1) * S + 40) - 4;
    const bz0 = Math.max(z0, bj * S - 40) + 4, bz1 = Math.min(z1, (bj + 1) * S + 40) - 4;
    const nx = 2, nz = 2, cw = (bx1 - bx0) / nx, cd = (bz1 - bz0) / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const w = cw * rnd(.6, .9), d = cd * rnd(.6, .9), h = rnd(7, 30);
      const cx = bx0 + cw * (a + .5) + rnd(-2, 2), cz = bz0 + cd * (b + .5) + rnd(-2, 2);
      if (Math.hypot(cx - RB.x, cz - RB.z) < 26 + Math.max(w, d) / 2) continue;
      const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 3.5)));
      const side = new THREE.MeshLambertMaterial({ map: t, color: pick(pal) }), top = M(0x8a8a8a);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
      m.position.set(cx, h / 2 + 0.3, cz); scene.add(m);
    }
  }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .25, 2.4, 6), M(0x6b4a2b), trees.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 0), M(0x3f8a3a), trees.length);
  trees.forEach((p, k) => { o.rotation.set(0, 0, 0); o.position.set(p[0], 1.5, p[1]); o.scale.set(1, 1, 1); o.updateMatrix(); trunk.setMatrixAt(k, o.matrix); o.position.y = 3.6; const s = rnd(.8, 1.2); o.scale.set(s, s, s); o.updateMatrix(); crown.setMatrixAt(k, o.matrix); });
  scene.add(trunk, crown);
}
function addLot(x0, z0, x1, z1) {
  const near = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].some(([x, z]) => Math.hypot(x - RB.x, z - RB.z) < RB.out + SWK + 1);
  let geo;
  if (!near) { geo = new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0); const m = new THREE.Mesh(geo, matLot); m.position.set((x0 + x1) / 2, 0.15, (z0 + z1) / 2); scene.add(m); return; }
  const pts = [], R = RB.out + SWK, seg = (ax, az, bx, bz) => { for (let t = 0; t < 1; t += 1 / 40) { let x = ax + (bx - ax) * t, z = az + (bz - az) * t; const dx = x - RB.x, dz = z - RB.z, r = Math.hypot(dx, dz); if (r < R) { x = RB.x + dx / r * R; z = RB.z + dz / r * R; } pts.push(new THREE.Vector2(x, -z)); } };
  seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.3, bevelEnabled: false });
  const m = new THREE.Mesh(geo, matLot); m.rotation.x = -Math.PI / 2; scene.add(m);
}
function addSchool() {
  const wall = M(0xf3d38a), roof = M(0xb5523b);
  const tex = textTex('ESCUELA', '#1f4e79', '#f3d38a');
  const front = new THREE.MeshLambertMaterial({ map: tex });
  const m = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 40), [front, wall, roof, wall, wall, wall]);
  m.position.set(58, 4.8, 200); scene.add(m);
  plane(26, 30, M(0xc96b4a), 30, 0.32, 200); // patio
  for (const z of [190, 210]) { const arco = new THREE.Mesh(new THREE.BoxGeometry(.2, 2, 3), matWhite); arco.position.set(19, 1.3, z - 5); scene.add(arco); }
}
function addPark(x0, z0, x1, z1) {
  plane(x1 - x0 - 4, z1 - z0 - 4, M(0x6fb04f), (x0 + x1) / 2, 0.32, (z0 + z1) / 2);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 1, 20), M(0xcfd8dc)); f.position.set((x0 + x1) / 2, 0.8, (z0 + z1) / 2); scene.add(f);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 20), M(0x4aa3df)); w.position.set((x0 + x1) / 2, 1.3, (z0 + z1) / 2); scene.add(w);
}
function windowTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#5b6f86'; g.fillRect(12, 14, 40, 30); g.fillStyle = '#8fa6bf'; g.fillRect(12, 14, 40, 8);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textTex(txt, col, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 512, 256); }
  g.fillStyle = col; g.font = 'bold 150px Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 135, 490);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ================= SEÑALES ================= */
function person(g, x, y, s, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.13; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y - s * 0.86, s * 0.13, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x, y - s * 0.7); g.lineTo(x, y - s * 0.32);
  g.moveTo(x, y - s * 0.32); g.lineTo(x - s * 0.2, y); g.moveTo(x, y - s * 0.32); g.lineTo(x + s * 0.22, y - s * 0.02);
  g.moveTo(x, y - s * 0.62); g.lineTo(x - s * 0.24, y - s * 0.4); g.moveTo(x, y - s * 0.62); g.lineTo(x + s * 0.22, y - s * 0.44); g.stroke();
}
function poly(g, pts) { g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function ring(g, c, r, wr) { g.fillStyle = '#c8102e'; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, r - wr, 0, TAU); g.fill(); }
function signCanvas(type, p) {
  const c = document.createElement('canvas'); const wide = type === 'sentido'; c.width = 256; c.height = wide ? 128 : 256;
  const g = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  const txt = (s, y, size, col) => { g.fillStyle = col; g.font = `bold ${size}px Arial,Helvetica,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, cx, y); };
  const oct = r => Array.from({ length: 8 }, (_, k) => [cx + r * Math.cos(Math.PI / 8 + k * Math.PI / 4), cy + r * Math.sin(Math.PI / 8 + k * Math.PI / 4)]);
  const diamond = (fill) => { poly(g, [[cx, 6], [250, cy], [cx, 250], [6, cy]]); g.fillStyle = '#111'; g.fill(); poly(g, [[cx, 18], [238, cy], [cx, 238], [18, cy]]); g.fillStyle = fill; g.fill(); poly(g, [[cx, 28], [228, cy], [cx, 228], [28, cy]]); g.strokeStyle = '#111'; g.lineWidth = 4; g.stroke(); };
  switch (type) {
    case 'pare': poly(g, oct(126)); g.fillStyle = '#fff'; g.fill(); poly(g, oct(114)); g.fillStyle = '#c8102e'; g.fill(); txt('PARE', cy + 4, 80, '#fff'); break;
    case 'ceda': poly(g, [[4, 10], [252, 10], [128, 248]]); g.fillStyle = '#c8102e'; g.fill(); poly(g, [[44, 34], [212, 34], [128, 200]]); g.fillStyle = '#fff'; g.fill(); txt('CEDA EL', 70, 27, '#111'); txt('PASO', 102, 30, '#111'); break;
    case 'vel': ring(g, cx, 124, 24); txt(String(p), cy + 6, p >= 100 ? 92 : 112, '#111'); break;
    case 'escolar': diamond('#c6e21a'); person(g, 100, 182, 110, '#111'); person(g, 158, 186, 84, '#111'); g.lineWidth = 9; g.beginPath(); g.moveTo(114, 120); g.lineTo(140, 128); g.stroke(); break;
    case 'peaton': g.fillStyle = '#1d4fa0'; g.fillRect(6, 6, 244, 244); poly(g, [[cx, 30], [228, 214], [28, 214]]); g.fillStyle = '#fff'; g.fill();
      g.fillStyle = '#111'; for (let k = 0; k < 5; k++) g.fillRect(70 + k * 24, 196, 14, 12); person(g, cx, 186, 120, '#111'); break;
    case 'noizq': ring(g, cx, 124, 24); g.strokeStyle = '#111'; g.lineWidth = 22; g.beginPath(); g.moveTo(150, 200); g.lineTo(150, 120); g.quadraticCurveTo(150, 90, 120, 90); g.lineTo(100, 90); g.stroke();
      poly(g, [[60, 90], [108, 54], [108, 126]]); g.fillStyle = '#111'; g.fill(); g.strokeStyle = '#c8102e'; g.lineWidth = 22; g.beginPath(); g.moveTo(52, 52); g.lineTo(204, 204); g.stroke(); break;
    case 'noentrar': g.fillStyle = '#c8102e'; g.beginPath(); g.arc(cx, cy, 124, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(40, cy - 20, 176, 40); break;
    case 'sentido': g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.fillRect(6, 6, w - 12, h - 12);
      g.save(); if (p === 'l') { g.translate(w, 0); g.scale(-1, 1); } g.fillStyle = '#fff'; g.fillRect(30, 52, 140, 24); poly(g, [[230, 64], [160, 24], [160, 104]]); g.fill(); g.restore(); break;
    case 'rotonda': diamond('#f6c600'); g.strokeStyle = '#111'; g.lineWidth = 14;
      for (let k = 0; k < 3; k++) { const a0 = k * TAU / 3 + 0.35, a1 = a0 + TAU / 3 - 0.75; g.beginPath(); g.arc(cx, cy, 48, a0, a1); g.stroke(); const ax = cx + 48 * Math.cos(a0), az = cy + 48 * Math.sin(a0); const t = a0 - Math.PI / 2;
        poly(g, [[ax + 20 * Math.cos(t), az + 20 * Math.sin(t)], [ax + 14 * Math.cos(a0), az + 14 * Math.sin(a0)], [ax - 14 * Math.cos(a0), az - 14 * Math.sin(a0)]]); g.fillStyle = '#111'; g.fill(); } break;
    case 'noest': ring(g, cx, 124, 24); txt('E', cy + 8, 150, '#111'); g.strokeStyle = '#c8102e'; g.lineWidth = 22; g.beginPath(); g.moveTo(52, 52); g.lineTo(204, 204); g.stroke(); break;
    case 'est': g.fillStyle = '#1d4fa0'; g.fillRect(6, 6, 244, 244); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(18, 18, 220, 220); txt('E', cy + 8, 170, '#fff'); break;
    case 'semaforo': diamond('#f6c600'); g.fillStyle = '#111'; g.fillRect(cx - 26, 64, 52, 128); [['#e02424', 88], ['#f6c600', 128], ['#21a346', 168]].forEach(([col, y]) => { g.fillStyle = col; g.beginPath(); g.arc(cx, y, 15, 0, TAU); g.fill(); }); break;
  }
  return c;
}
const texCache = {}, matCache = {};
function signMat(type, p) {
  const k = type + (p ?? '');
  if (!matCache[k]) {
    const t = new THREE.CanvasTexture(signCanvas(type, p)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[k] = t;
    matCache[k] = [new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, transparent: false }), new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, color: 0x50565c })];
  }
  return matCache[k];
}
const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), poleMat = M(0x9aa1a8);
const signGeo = new THREE.PlaneGeometry(0.95, 0.95), signGeoW = new THREE.PlaneGeometry(1.3, 0.65);
function addSign(type, p, x, z, n) {
  const g = new THREE.Group(); const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 1.3; g.add(pole);
  const [mf, mb] = signMat(type, p), geo = type === 'sentido' ? signGeoW : signGeo;
  const f = new THREE.Mesh(geo, mf); f.position.set(0, 2.45, 0.04); g.add(f);
  const b = new THREE.Mesh(geo, mb); b.position.set(0, 2.45, 0.03); b.rotation.y = Math.PI; g.add(b);
  g.position.set(x, 0.3, z); g.rotation.y = Math.atan2(n.x, n.z); scene.add(g); return g;
}
// señal para quien circula en dirección d, en el punto (cx,cz) del eje de la calzada
const signFor = (type, p, cx, cz, d, off = HW + 1.2) => { const r = right(d); return addSign(type, p, cx + r.x * off, cz + r.z * off, { x: -d.x, z: -d.z }); };
const segPoint = (key, t) => { const ax = key[0], a = +key.slice(1).split('_')[0], b = +key.split('_')[1];
  return ax === 'H' ? { x: (b + t) * S, z: a * S, u: { x: 1, z: 0 } } : { x: a * S, z: (b + t) * S, u: { x: 0, z: 1 } }; };

const LIGHT_HEADS = [];
function addTrafficLight(i, j, d) {
  const r = right(d), x = i * S + d.x * (HW + 0.9) + r.x * (HW + 0.9), z = j * S + d.z * (HW + 0.9) + r.z * (HW + 0.9);
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 4.2, 6), M(0x333333)); pole.position.y = 2.1; g.add(pole);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.4, .35), M(0x161616)); box.position.y = 4.4; g.add(box);
  const mats = ['r', 'y', 'g'].map(() => new THREE.MeshBasicMaterial({ color: 0x222222 }));
  mats.forEach((m, k) => { const s = new THREE.Mesh(new THREE.CircleGeometry(.17, 14), m); s.position.set(0, 4.85 - k * 0.45, 0.18); g.add(s); });
  // segunda cabeza (cerca de la línea) para verla desde el auto detenido
  g.position.set(x, 0, z); g.rotation.y = Math.atan2(-d.x, -d.z); scene.add(g);
  LIGHT_HEADS.push({ i, j, ax: axisOf(d), mats });
}
const LCOL = { r: 0xff2a1a, y: 0xffc400, g: 0x22dd55 };

function buildSigns() {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const c = CTRL[i + ',' + j], h = half(i, j);
    for (const d of DIRS) {
      if (!inGrid(i - d.x, j - d.z) || !edgeAllowed(i - d.x, j - d.z, d)) continue;
      const ax = axisOf(d), cx = i * S - d.x * (h + 2.5), cz = j * S - d.z * (h + 2.5);
      if (c.t === 'light') { addTrafficLight(i, j, d); signFor('semaforo', null, i * S - d.x * (HW + 38), j * S - d.z * (HW + 38), d); }
      else if (c.t === 'stop' && c.ax === ax) signFor('pare', null, cx, cz, d);
      else if (c.t === 'yield' && c.ax === ax) signFor('ceda', null, cx, cz, d);
      else if (c.t === 'rb') { signFor('ceda', null, cx, cz, d); signFor('rotonda', null, i * S - d.x * (h + 28), j * S - d.z * (h + 28), d); }
      if (noLeftAt(i, j, d)) signFor('noizq', null, i * S - d.x * (h + 12), j * S - d.z * (h + 12), d);
    }
  }
  // una vía
  for (let i = 1; i < N - 1; i++) { addSign('sentido', 'r', i * S + HW + 1.3, -HW - 1.3, { x: 0, z: 1 }); }
  for (let i = 1; i < N; i++) signFor('noentrar', null, i * S - HW - 2, 0, { x: -1, z: 0 });
  addSign('sentido', 'r', 4 * S - HW - 1.3, S - HW - 1.3, { x: -1, z: 0 });
  signFor('noentrar', null, 4 * S, S - HW - 2, { x: 0, z: -1 });
  // zona escolar (V1_2)
  signFor('escolar', null, S, 2 * S + 14, { x: 0, z: 1 }); signFor('vel', 30, S, 2 * S + 19, { x: 0, z: 1 });
  signFor('escolar', null, S, 3 * S - 14, { x: 0, z: -1 }); signFor('vel', 30, S, 3 * S - 19, { x: 0, z: -1 });
  signFor('vel', 50, S, 3 * S + 12, { x: 0, z: 1 }); signFor('vel', 50, S, 2 * S - 12, { x: 0, z: -1 });
  // velocidad urbana
  [['H4_0', .2, 1], ['H0_1', .2, 1], ['V4_2', .2, 1], ['V0_2', .8, -1], ['H2_3', .5, 1], ['H1_2', .6, -1]].forEach(([k, t, s]) => { const p = segPoint(k, t); signFor('vel', 50, p.x, p.z, { x: p.u.x * s, z: p.u.z * s }); });
  // pasos peatonales
  for (const cw of CW) for (const s of [1, -1]) { const d = { x: cw.u.x * s, z: cw.u.z * s }; signFor('peaton', null, cw.cx - d.x * 3, cw.cz - d.z * 3, d); }
  // no estacionar / estacionamiento
  for (const t of [.3, .7]) { const p = segPoint(NOPARK, t); signFor('noest', null, p.x, p.z, { x: 1, z: 0 }); signFor('noest', null, p.x, p.z, { x: -1, z: 0 }); }
  signFor('est', null, BAY.x0 - 2, 4 * S, { x: 1, z: 0 }, HW + BAY.w + 0.8);
}

/* ================= VEHÍCULOS ================= */
const gBody = new THREE.BoxGeometry(1.8, 0.7, 4.2), gCab = new THREE.BoxGeometry(1.6, 0.62, 2.1), gWheel = new THREE.CylinderGeometry(.36, .36, .28, 12);
const gLamp = new THREE.BoxGeometry(.32, .16, .06), gInd = new THREE.BoxGeometry(.18, .14, .08);
const mWin = M(0x22313f), mTyre = M(0x151515), mHead = new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), mTail = new THREE.MeshBasicMaterial({ color: 0xb01010 });
gWheel.rotateZ(Math.PI / 2);
function makeCar(color) {
  const g = new THREE.Group(), body = new THREE.Mesh(gBody, M(color)); body.position.y = .62; g.add(body);
  const cab = new THREE.Mesh(gCab, mWin); cab.position.set(0, 1.27, -.25); g.add(cab);
  for (const [x, z] of [[-.85, 1.35], [.85, 1.35], [-.85, -1.35], [.85, -1.35]]) { const w = new THREE.Mesh(gWheel, mTyre); w.position.set(x, .36, z); g.add(w); }
  for (const x of [-.6, .6]) { const l = new THREE.Mesh(gLamp, mHead); l.position.set(x, .7, 2.11); g.add(l); const t = new THREE.Mesh(gLamp, mTail); t.position.set(x, .72, -2.11); g.add(t); }
  const ind = { l: new THREE.MeshBasicMaterial({ color: 0x553300 }), r: new THREE.MeshBasicMaterial({ color: 0x553300 }) };
  for (const [x, z, s] of [[.8, 2.12, 'l'], [-.8, 2.12, 'r'], [.8, -2.12, 'l'], [-.8, -2.12, 'r']]) { const m = new THREE.Mesh(gInd, ind[s]); m.position.set(x, .9, z); g.add(m); }
  scene.add(g); return { g, ind };
}
function setInd(car, side, on) { car.ind.l.color.setHex(side === 'l' && on ? 0xffa000 : 0x553300); car.ind.r.color.setHex(side === 'r' && on ? 0xffa000 : 0x553300); }
function makeAmbulance() {
  const g = new THREE.Group(), white = M(0xffffff);
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 5.2), white); b.position.y = 1.35; g.add(b);
  const st = new THREE.Mesh(new THREE.BoxGeometry(2.14, .35, 5.0), M(0xd32f2f)); st.position.y = 1.2; g.add(st);
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.9, .7, .05), mWin); ws.position.set(0, 1.9, 2.61); g.add(ws);
  for (const [x, z] of [[-.95, 1.7], [.95, 1.7], [-.95, -1.7], [.95, -1.7]]) { const w = new THREE.Mesh(gWheel, mTyre); w.position.set(x, .38, z); g.add(w); }
  const lr = new THREE.MeshBasicMaterial({ color: 0xff0000 }), lb = new THREE.MeshBasicMaterial({ color: 0x0044ff });
  const a = new THREE.Mesh(new THREE.BoxGeometry(.7, .25, .4), lr); a.position.set(-.45, 2.6, 2.0); g.add(a);
  const c = new THREE.Mesh(new THREE.BoxGeometry(.7, .25, .4), lb); c.position.set(.45, 2.6, 2.0); g.add(c);
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#d32f2f'; x.fillRect(24, 6, 16, 52); x.fillRect(6, 24, 52, 16); const t = new THREE.CanvasTexture(cv); return t; })() }));
  cross.position.set(1.06, 1.8, 0); cross.rotation.y = Math.PI / 2; g.add(cross);
  const c2 = cross.clone(); c2.position.x = -1.06; c2.rotation.y = -Math.PI / 2; g.add(c2);
  g.visible = false; scene.add(g); return { g, lr, lb };
}
const COLORS = [0xd32f2f, 0xf5f5f5, 0x1e293b, 0x9e9e9e, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6d4c41, 0x00838f, 0x8e24aa, 0xc0c0c0];

function mkPath(pts) { const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z)); return { pts, cum, len: cum[cum.length - 1] }; }
function samplePath(p, s, out) {
  s = clamp(s, 0, p.len); let k = 1; while (k < p.cum.length - 1 && p.cum[k] < s) k++;
  const a = p.pts[k - 1], b = p.pts[k], L = (p.cum[k] - p.cum[k - 1]) || 1, t = (s - p.cum[k - 1]) / L;
  out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; out.tx = (b.x - a.x) / L; out.tz = (b.z - a.z) / L; return out;
}
function lanePts(i, j, d) {
  const r = right(d), hA = half(i, j), hB = half(i + d.x, j + d.z);
  return [{ x: i * S + d.x * hA + r.x * LO, z: j * S + d.z * hA + r.z * LO }, { x: (i + d.x) * S - d.x * hB + r.x * LO, z: (j + d.z) * S - d.z * hB + r.z * LO }];
}
function bez(P0, P1, P2, n = 8) { const a = []; for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; a.push({ x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x, z: u * u * P0.z + 2 * u * t * P1.z + t * t * P2.z }); } return a; }
function crossPts(i, j, din, dout) {
  if (isRB(i, j)) return rbPts(din, dout);
  const C = { x: i * S, z: j * S }, ri = right(din), ro = right(dout);
  const P0 = { x: C.x - din.x * HW + ri.x * LO, z: C.z - din.z * HW + ri.z * LO }, P2 = { x: C.x + dout.x * HW + ro.x * LO, z: C.z + dout.z * HW + ro.z * LO };
  if (same(din, dout)) return [P0, P2];
  if (din.x === -dout.x && din.z === -dout.z) return [P0, { x: C.x + din.x * 2 + ri.x * LO, z: C.z + din.z * 2 + ri.z * LO }, { x: C.x + din.x * 3, z: C.z + din.z * 3 }, { x: C.x + din.x * 2 + ro.x * LO, z: C.z + din.z * 2 + ro.z * LO }, P2];
  const t = (P2.x - P0.x) * din.x + (P2.z - P0.z) * din.z;
  return bez(P0, { x: P0.x + din.x * t, z: P0.z + din.z * t }, P2);
}
const rbEntryAngle = din => { const r = right(din); return Math.atan2(-din.z * RBH + r.z * LO, -din.x * RBH + r.x * LO); };
function rbPts(din, dout) {
  const ri = right(din), ro = right(dout);
  const P0 = { x: RB.x - din.x * RBH + ri.x * LO, z: RB.z - din.z * RBH + ri.z * LO }, P3 = { x: RB.x + dout.x * RBH + ro.x * LO, z: RB.z + dout.z * RBH + ro.z * LO };
  const a0 = Math.atan2(P0.z - RB.z, P0.x - RB.x), a1 = Math.atan2(P3.z - RB.z, P3.x - RB.x);
  let D = ((a0 - a1) % TAU + TAU) % TAU; if (D < 0.9) D += TAU;
  const s0 = a0 - 0.35, s1 = a1 + 0.35, DD = D - 0.7, n = Math.ceil(DD / 0.22), pts = [P0];
  for (let k = 0; k <= n; k++) { const a = s0 - DD * k / n; pts.push({ x: RB.x + Math.cos(a) * RB.path, z: RB.z + Math.sin(a) * RB.path }); }
  pts.push(P3); return pts;
}

let ents = []; // entidades dinámicas: {x,z,vx,vz}
function nodeClear(i, j, ax, self) {
  for (const e of ents) {
    if (e === self) continue;
    const dx = i * S - e.x, dz = j * S - e.z, sp = Math.hypot(e.vx, e.vz);
    if (Math.abs(dx) < HW + .3 && Math.abs(dz) < HW + .3) { const along = ax === 'H' ? Math.abs(e.vz) : Math.abs(e.vx); if (along > 0.5 || sp < 0.3) return false; continue; }
    if (sp < 1) continue;
    if (ax === 'H') { if (Math.abs(dx) < HW && Math.abs(dz) < HW + 18 && dz * e.vz > 0) return false; }
    else if (Math.abs(dz) < HW && Math.abs(dx) < HW + 18 && dx * e.vx > 0) return false;
  }
  return true;
}
function rbClear(theta, self) {
  for (const e of ents) {
    if (e === self) continue;
    const rx = e.x - RB.x, rz = e.z - RB.z, rr = Math.hypot(rx, rz); if (rr > RB.out || rr < RB.isl) continue;
    const diff = ((Math.atan2(rz, rx) - theta) % TAU + TAU) % TAU;
    if ((diff < 1.6 && Math.hypot(e.vx, e.vz) > 0.5) || diff < 0.3 || diff > TAU - 0.3) return false;
  }
  return true;
}

class AI {
  constructor() { this.car = makeCar(pick(COLORS)); this.v = 0; this.vx = this.vz = 0; this.tmp = {}; this.hold = 0; this.stuck = 0; this.ignore = 0; this.spd = rnd(.85, 1.1); }
  setLane(i, j, d, frac) { this.i = i + d.x; this.j = j + d.z; this.d = d; this.seg = segKeyOf(i, j, d); this.path = mkPath(lanePts(i, j, d)); this.s = this.path.len * frac; this.mode = 'lane'; this.stopT = 0; this.place(1); }
  place(a) { const p = samplePath(this.path, this.s, this.tmp); this.x = p.x; this.z = p.z; const th = Math.atan2(p.tx, p.tz);
    if (a >= 1) this.h = th; else { let df = ((th - this.h + Math.PI) % TAU + TAU) % TAU - Math.PI; this.h += df * a; }
    this.vx = Math.sin(this.h) * this.v; this.vz = Math.cos(this.h) * this.v; this.car.g.position.set(this.x, 0, this.z); this.car.g.rotation.y = this.h; }
  ctrl() { return CTRL[this.i + ',' + this.j]; }
  needStop() { const c = this.ctrl(), ax = axisOf(this.d);
    if (c.t === 'light') return lightState(this.i, this.j, ax, simT) === 'g' ? 0 : 2;
    if (c.t === 'stop' && c.ax === ax) return 2; if ((c.t === 'yield' && c.ax === ax) || c.t === 'rb') return 1; return 0; }
  permit(dt) { const c = this.ctrl(), ax = axisOf(this.d);
    if (c.t === 'light') return lightState(this.i, this.j, ax, simT) === 'g';
    if (c.t === 'stop' && c.ax === ax) { if (this.v > 0.3) return false; this.stopT += dt; return this.stopT > 1 && nodeClear(this.i, this.j, ax, this); }
    if (c.t === 'yield' && c.ax === ax) return nodeClear(this.i, this.j, ax, this);
    if (c.t === 'rb') return rbClear(rbEntryAngle(this.d), this);
    return true; }
  go() {
    const din = this.d, i = this.i, j = this.j;
    let opts = DIRS.filter(d => inGrid(i + d.x, j + d.z) && edgeAllowed(i, j, d) && !(d.x === -din.x && d.z === -din.z) && !(noLeftAt(i, j, din) && isLeft(din, d)));
    if (!opts.length) opts = [{ x: -din.x, z: -din.z }];
    let dout = opts.find(d => same(d, din)); if (!dout || Math.random() < 0.45) dout = pick(opts);
    this.path = mkPath(crossPts(i, j, din, dout)); this.s = 0; this.mode = 'cross'; this.nd = dout; this.turn = isLeft(din, dout) ? 'l' : isRight(din, dout) ? 'r' : null;
    if (this.turn) setInd(this.car, this.turn, true);
  }
  update(dt) {
    if (this.hold > 0) { this.hold -= dt; this.v = 0; this.vx = this.vz = 0; return; }
    let target = (this.seg === 'V1_2' ? 7.5 : 11.5) * this.spd;
    if (this.mode === 'lane') {
      const dist = this.path.len - this.s, need = this.needStop();
      if (need === 2) target = Math.min(target, Math.sqrt(Math.max(0, dist - 0.1) * 4.5) + (dist > 0.6 ? 0.4 : 0));
      else if (need === 1) target = Math.min(target, 3 + dist * 0.4);
      if (dist <= 0.5) { this.mode = 'wait'; this.stopT = 0; }
    }
    if (this.mode === 'wait') { if (this.permit(dt)) this.go(); else target = 0; }
    if (this.mode === 'cross') target = Math.min(target, this.turn ? 6 : 9.5);
    // seguimiento
    const fx = Math.sin(this.h), fz = Math.cos(this.h), look = 7 + this.v * 1.6; let blocked = false;
    if (this.ignore > 0) this.ignore -= dt; else {
      const chk = (ox, oz, ped) => { const rx = ox - this.x, rz = oz - this.z, ah = rx * fx + rz * fz; if (ah <= 0 || ah > look) return;
        if (Math.abs(rx * fz - rz * fx) > (ped ? 2.6 : 2.0)) return; const t = Math.max(0, ah - (ped ? 4 : 6)) * 0.9; if (t < target) { target = t; blocked = true; } };
      for (const e of ents) if (e !== this) chk(e.x, e.z, false);
      for (const p of PEDS) if (p.onRoad) chk(p.x, p.z, true);
    }
    if (blocked && this.v < 0.1 && this.mode !== 'wait') { this.stuck += dt; if (this.stuck > 5) { this.ignore = 2; this.stuck = 0; } } else this.stuck = 0;
    this.v += clamp(target - this.v, -7 * dt, 2.6 * dt); if (this.v < 0) this.v = 0;
    this.s += this.v * dt;
    if (this.mode === 'lane' && this.s > this.path.len) this.s = this.path.len;
    if (this.mode === 'cross' && this.s >= this.path.len) {
      const extra = this.s - this.path.len, i = this.i, j = this.j, d = this.nd;
      if (this.turn) setInd(this.car, this.turn, false);
      this.i = i + d.x; this.j = j + d.z; this.d = d; this.seg = segKeyOf(i, j, d); this.path = mkPath(lanePts(i, j, d)); this.s = Math.min(extra, this.path.len); this.mode = 'lane';
    }
    this.place(Math.min(1, dt * 12));
  }
}

/* ================= PEATONES ================= */
const CW = CROSSWALKS.map(([key, t, kids]) => { const p = segPoint(key, t); return { key, kids: !!kids, cx: p.x, cz: p.z, u: p.u, a: right(p.u), lastInf: -99 }; });
const PEDS = [];
const gPedBody = new THREE.CylinderGeometry(.22, .26, 1, 8), gPedHead = new THREE.SphereGeometry(.2, 10, 8), gPedLeg = new THREE.BoxGeometry(.32, .8, .22);
function makePed(child, cw) {
  const g = new THREE.Group(), sc = child ? .65 : 1;
  const leg = new THREE.Mesh(gPedLeg, M(0x2b3a55)); leg.position.y = .4; g.add(leg);
  const body = new THREE.Mesh(gPedBody, M(child ? pick([0xffeb3b, 0xff7043, 0x42a5f5]) : pick([0xe53935, 0x43a047, 0x1e88e5, 0xfdd835, 0x8e24aa, 0xf4511e]))); body.position.y = 1.3; g.add(body);
  const head = new THREE.Mesh(gPedHead, M(pick([0xf1c27d, 0xc68642, 0xe0ac69, 0x8d5524]))); head.position.y = 2.0; g.add(head);
  g.scale.setScalar(sc); scene.add(g);
  const side = Math.random() < .5 ? -1 : 1;
  const p = { g, cw, child, s: side * (HW + 1.6), dir: -side, state: 'wait', t: rnd(2, 8), off: rnd(-1.2, 1.2), onRoad: false, x: 0, z: 0, ph: rnd(0, 6) };
  PEDS.push(p); return p;
}
function updPeds(dt) {
  for (const p of PEDS) {
    const cw = p.cw;
    if (p.state === 'wait') {
      p.t -= dt;
      if (p.t <= 0) {
        let ok = true;
        for (const e of ents) { const rx = cw.cx - e.x, rz = cw.cz - e.z, al = Math.abs(rx * cw.u.x + rz * cw.u.z), ac = Math.abs(rx * cw.a.x + rz * cw.a.z), sp = Math.hypot(e.vx, e.vz);
          if (ac > HW + 1) continue; if (al < 4) { ok = false; break; } if (sp > 1.5 && al < 9 + sp * 1.6 && (e.vx * rx + e.vz * rz) > 0) { ok = false; break; } }
        if (ok) { p.state = 'cross'; } else p.t = 0.5;
      }
    } else {
      p.s += p.dir * (p.child ? 1.15 : 1.3) * dt;
      if (Math.abs(p.s) >= HW + 1.6) { p.s = Math.sign(p.s) * (HW + 1.6); p.dir *= -1; p.state = 'wait'; p.t = rnd(4, 12); }
    }
    p.onRoad = Math.abs(p.s) < HW + 0.6;
    p.x = cw.cx + cw.a.x * p.s + cw.u.x * p.off; p.z = cw.cz + cw.a.z * p.s + cw.u.z * p.off;
    p.ph += dt * 8;
    p.g.position.set(p.x, (p.state === 'cross' ? Math.abs(Math.sin(p.ph)) * 0.08 : 0) + (p.onRoad ? 0 : 0.3), p.z);
    p.g.rotation.y = Math.atan2(cw.a.x * p.dir, cw.a.z * p.dir);
  }
}

/* ================= INFRACCIONES ================= */
const INF = {
  rojo: { t: 'Pasaste con luz roja', d: 'La luz roja obliga a detenerse antes de la línea de detención y esperar la luz verde. Es una infracción gravísima.', p: 25 },
  pare: { t: 'No respetaste el PARE', d: 'Con la señal PARE debes detener completamente el vehículo antes de la línea de detención, aunque no venga nadie, y luego ceder el paso a quienes circulan por la vía transversal.', p: 20 },
  preferencia: { t: 'No cediste el paso', d: 'Con PARE o CEDA EL PASO debes dejar pasar a los vehículos que circulan por la vía preferente antes de entrar al cruce.', p: 20 },
  velocidad: { t: 'Exceso de velocidad', d: 'En zona urbana la velocidad máxima general es 50 km/h, salvo que una señal indique otra. Debes adecuar tu velocidad a la señalización.', p: 10 },
  velEscolar: { t: 'Exceso de velocidad en zona escolar', d: 'En la zona escolar señalizada la velocidad máxima es 30 km/h. Atento a niños que cruzan.', p: 15 },
  peaton: { t: 'No respetaste al peatón', d: 'En un paso de cebra el peatón tiene derecho preferente de paso. Debes detenerte y esperar a que termine de cruzar.', p: 25 },
  atropello: { t: 'Atropellaste a un peatón', d: 'Debes reducir la velocidad cerca de los pasos peatonales y estar siempre atento a los peatones.', p: 50 },
  pista: { t: 'Circulaste por la pista contraria', d: 'En Chile se conduce por la derecha. No se puede adelantar en cruces, pasos peatonales ni sus cercanías, y la pista izquierda solo se usa para adelantar de forma breve y segura.', p: 15 },
  contramano: { t: 'Contra el sentido del tránsito', d: 'Esta calle es de un solo sentido (señal con flecha). Circular en sentido contrario es una infracción gravísima.', p: 25 },
  vereda: { t: 'Subiste a la vereda', d: 'La vereda es para los peatones. El vehículo debe mantenerse en la calzada.', p: 15 },
  choque: { t: 'Chocaste', d: 'Mantén una distancia razonable y prudente con los otros vehículos y obstáculos, y adecua la velocidad a las condiciones.', p: 30 },
  senal: { t: 'No señalizaste el viraje', d: 'Antes de virar debes activar el intermitente con anticipación, antes de llegar al cruce, para avisar a los demás conductores y peatones.', p: 5 },
  noizq: { t: 'Viraje prohibido', d: 'La señal "No virar a la izquierda" prohíbe ese viraje en el cruce.', p: 15 },
  rotondaCeda: { t: 'No cediste el paso en la rotonda', d: 'Al llegar a una rotonda debes ceder el paso a los vehículos que ya circulan por ella.', p: 20 },
  rotondaSentido: { t: 'Rotonda en sentido contrario', d: 'En la rotonda se circula en sentido contrario a los punteros del reloj, dejando la isla central a la izquierda.', p: 25 },
  ambulancia: { t: 'No cediste el paso a la ambulancia', d: 'Ante un vehículo de emergencia con sirena y balizas debes orillarte a la derecha y detenerte o reducir la velocidad para dejarlo pasar.', p: 20 },
  cinturon: { t: 'Partiste sin cinturón', d: 'El cinturón de seguridad es obligatorio para el conductor y todos los pasajeros. Abróchalo antes de iniciar la marcha.', p: 10 },
  noest: { t: 'Detenido en zona de NO ESTACIONAR', d: 'La señal "No estacionar" (E tachada) prohíbe dejar el vehículo detenido en ese tramo.', p: 5 },
};

/* ================= ESTADO ================= */
let running = false, paused = false, mode = 'free', simT = 0, score = 100, log = [], camMode = 0;
const P = { x: 0, z: 0, h: 0, v: 0, steer: 0 };
let player, amb, ais = [];
const PL = {};
const inp = { l: 0, r: 0, gas: 0, brake: 0 };
const PLACES = [
  { n: 'Zona escolar', x: S - LO, z: 2.5 * S }, { n: 'Rotonda (salida oriente)', x: 2 * S + 32, z: 2 * S + LO },
  { n: 'Calle de un solo sentido', x: 3.5 * S, z: LO }, { n: 'Avenida oriente', x: 4 * S - LO, z: 2.5 * S },
  { n: 'Plaza', x: 2.5 * S, z: S + LO }, { n: 'Barrio poniente', x: LO, z: 3.5 * S }, { n: 'Esquina norte', x: S + 40, z: -LO },
];
const EXAM = [PLACES[0], PLACES[1], PLACES[2], PLACES[3], { n: 'Estaciona en el lugar marcado', park: true, ...spotC(BAY.free) }];
let cps = [], cpi = 0, cpMesh, parkMark, parked = [];

function resetPL() { Object.assign(PL, { inNode: false, entry: null, stoppedAt: null, signal: null, belt: false, beltInf: false, wrongT: 0, owT: 0, rbT: 0, walkT: 0, spT: 0, npT: 0, parkT: 0, limit: 50, cool: {}, revT: 0, ambDone: false, nextAmb: 70, hornT: 0 }); }

function infr(code) {
  const now = simT; if ((PL.cool[code] || -99) > now - 5) return; PL.cool[code] = now;
  const I = INF[code]; log.push({ code, t: now }); beep(220, .35);
  if (mode === 'exam') { endExam(false, code); return; }
  score = Math.max(0, score - I.p); toast(`⚠️ ${I.t} (−${I.p})`, 'bad', 3200); $('score').textContent = 'Puntaje ' + score;
}
let toastT = 0;
function toast(msg, cls = 'bad', ms = 2500) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (cls === 'bad' ? '' : cls); toastT = ms / 1000; }

/* ================= JUGADOR ================= */
const prev = { x: 0, z: 0 };
function corners(x, z, h) { const fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx; return [[2.1, .9], [2.1, -.9], [-2.1, .9], [-2.1, -.9]].map(([a, b]) => ({ x: x + fx * a + rx * b, z: z + fz * a + rz * b })); }
function circles(x, z, h) { const fx = Math.sin(h), fz = Math.cos(h); return [{ x: x + fx * 1.2, z: z + fz * 1.2 }, { x: x - fx * 1.2, z: z - fz * 1.2 }]; }
function hitCar(ax, az, ah, bx, bz, bh, rb = 1) { for (const a of circles(ax, az, ah)) for (const b of (rb > 1 ? [{ x: bx + Math.sin(bh) * 1.6, z: bz + Math.cos(bh) * 1.6 }, { x: bx, z: bz }, { x: bx - Math.sin(bh) * 1.6, z: bz - Math.cos(bh) * 1.6 }] : circles(bx, bz, bh))) if (Math.hypot(a.x - b.x, a.z - b.z) < 2.0) return true; return false; }

function updPlayer(dt) {
  prev.x = P.x; prev.z = P.z;
  const steerT = inp.l ? 1 : inp.r ? -1 : 0; P.steer += (steerT - P.steer) * Math.min(1, dt * 5);
  let acc = 0;
  if (inp.gas) acc += P.v < -0.2 ? 9 : 4.3 * (1 - P.v / 24);
  if (inp.brake) { if (P.v > 0.25) acc -= 9.5; else { PL.revT += dt; if (PL.revT > 0.5) acc -= 2.5; else { P.v = Math.max(P.v, 0); } } } else PL.revT = 0;
  if (!inp.gas && !inp.brake) acc -= Math.sign(P.v) * 0.9;
  if (inp.gas && P.v < -0.2) acc = 9;
  P.v += acc * dt; P.v = clamp(P.v, -4.5, 26);
  if (!inp.gas && Math.abs(P.v) < 0.25 && !(inp.brake && PL.revT > 0.5)) P.v = 0;
  const delta = P.steer * 0.6 / (1 + Math.abs(P.v) / 14);
  P.h += P.v / 2.6 * Math.tan(delta) * dt;
  P.x += Math.sin(P.h) * P.v * dt; P.z += Math.cos(P.h) * P.v * dt;
  // colisiones con edificios/isla
  let hit = corners(P.x, P.z, P.h).some(c => { const k = locate(c.x, c.z).k; return k === 'bldg' || k === 'island'; });
  let carHit = false;
  for (const a of ais) if (hitCar(P.x, P.z, P.h, a.x, a.z, a.h)) { carHit = true; a.hold = 2; }
  for (const c of parked) if (hitCar(P.x, P.z, P.h, c.x, c.z, c.h)) carHit = true;
  if (amb.on && hitCar(P.x, P.z, P.h, amb.x, amb.z, amb.h, 2)) carHit = true;
  if (hit || carHit) { if (Math.abs(P.v) > 1.5) infr('choque'); P.x = prev.x; P.z = prev.z; P.v = -P.v * 0.25; }
  for (const p of PEDS) if (Math.hypot(p.x - P.x, p.z - P.z) < 1.6 && Math.abs(P.v) > 0.8) { infr('atropello'); p.s = Math.sign(p.s || 1) * (HW + 1.6); p.state = 'wait'; p.t = 6; P.v = 0; }
  player.g.position.set(P.x, 0, P.z); player.g.rotation.y = P.h;
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  player.vx = fx * P.v; player.vz = fz * P.v; player.x = P.x; player.z = P.z;
  rules(dt, fx, fz);
}

function rules(dt, fx, fz) {
  const v = P.v, kmh = Math.abs(v) * 3.6, loc = locate(P.x, P.z);
  const mx = fx * Math.sign(v || 1), mz = fz * Math.sign(v || 1);
  if (!PL.belt && Math.abs(v) > 1 && !PL.beltInf) { PL.beltInf = true; infr('cinturon'); }
  // nodos
  const inNode = loc.k === 'node' || loc.k === 'rb';
  if (inNode && !PL.inNode) {
    PL.inNode = true; const d = snap(mx, mz); PL.entry = { i: loc.i, j: loc.j, d, sig: PL.signal };
    if (v > 0.5) {
      if (loc.k === 'rb') { if (!rbClear(Math.atan2(P.z - RB.z, P.x - RB.x), player)) infr('rotondaCeda'); }
      else { const c = CTRL[loc.i + ',' + loc.j], ax = axisOf(d), key = loc.i + ',' + loc.j;
        if (c.t === 'light' && lightState(loc.i, loc.j, ax, simT) === 'r') infr('rojo');
        else if (c.t === 'stop' && c.ax === ax) { if (PL.stoppedAt !== key) infr('pare'); else if (!nodeClear(loc.i, loc.j, ax, player)) infr('preferencia'); }
        else if (c.t === 'yield' && c.ax === ax && !nodeClear(loc.i, loc.j, ax, player)) infr('preferencia'); }
    }
  } else if (!inNode && PL.inNode && (loc.k === 'H' || loc.k === 'V')) {
    PL.inNode = false; const e = PL.entry; PL.stoppedAt = null;
    if (e && Math.abs(v) > 0.3) {
      const dout = snap(mx, mz), turn = isLeft(e.d, dout) ? 'l' : isRight(e.d, dout) ? 'r' : null;
      if (!isRB(e.i, e.j) && turn) { if (e.sig !== turn) infr('senal'); if (turn === 'l' && noLeftAt(e.i, e.j, e.d)) infr('noizq'); }
      if (turn || isRB(e.i, e.j)) setSignal(null);
    }
  }
  // tramo
  if (loc.k === 'H' || loc.k === 'V') {
    PL.limit = SEG_LIMIT[loc.key] || 50;
    const H = loc.k === 'H', along = H ? mx : mz, sgn = Math.sign(along);
    // detención antes del cruce
    if (Math.abs(v) < 0.45) { const fwd = snap(fx, fz), s2 = H ? fwd.x : fwd.z, ni = H ? (s2 > 0 ? loc.i + 1 : loc.i) : loc.i, nj = H ? loc.j : (s2 > 0 ? loc.j + 1 : loc.j);
      const dist = H ? Math.abs(P.x - ni * S) - half(ni, nj) : Math.abs(P.z - nj * S) - half(ni, nj); if (dist < 11) PL.stoppedAt = ni + ',' + nj; }
    const ow = ONEWAY[loc.key];
    if (ow) { if (Math.abs(v) > 1 && (mx * ow.x + mz * ow.z) < -0.5) { PL.owT += dt; if (PL.owT > 0.6) { infr('contramano'); PL.owT = -4; } } else PL.owT = Math.min(PL.owT, 0) + 0; }
    else if (Math.abs(v) > 1.5 && Math.abs(along) > 0.6) {
      const wrong = H ? loc.lat * sgn < -0.5 : loc.lat * sgn > 0.5;
      const dn = Math.min(loc.along, S - loc.along), nearCW = CW.some(c => c.key === loc.key && Math.hypot(c.cx - P.x, c.cz - P.z) < 22);
      if (wrong) { PL.wrongT += dt; if (PL.wrongT > ((dn < 28 || nearCW) ? 0.7 : 4)) { infr('pista'); PL.wrongT = -3; } } else if (PL.wrongT > 0) PL.wrongT = 0;
    }
    if (loc.key === NOPARK && Math.abs(v) < 0.3) { PL.npT += dt; if (PL.npT > 5) { infr('noest'); PL.npT = -10; } } else if (PL.npT > 0) PL.npT = 0;
  }
  if (loc.k === 'rb' && Math.abs(v) > 1) { const r = loc.r, tx = (P.z - RB.z) / r, tz = -(P.x - RB.x) / r; if (mx * tx + mz * tz < -0.3) { PL.rbT += dt; if (PL.rbT > 0.8) { infr('rotondaSentido'); PL.rbT = -4; } } else PL.rbT = 0; }
  if (loc.k === 'walk' && Math.abs(v) > 0.5) { PL.walkT += dt; if (PL.walkT > 0.35) { infr('vereda'); PL.walkT = -3; } } else if (PL.walkT > 0) PL.walkT = 0;
  // velocidad
  if (kmh > PL.limit + 4) { PL.spT += dt; if (PL.spT > 1.5) { infr(PL.limit === 30 ? 'velEscolar' : 'velocidad'); PL.spT = -6; } } else if (PL.spT > 0) PL.spT = 0;
  // pasos de cebra
  for (const cw of CW) {
    const rx = P.x - cw.cx, rz = P.z - cw.cz, al = Math.abs(rx * cw.u.x + rz * cw.u.z), ac = Math.abs(rx * cw.a.x + rz * cw.a.z);
    if (al < 2.4 && ac < HW && Math.abs(v) > 0.5 && PEDS.some(p => p.cw === cw && p.state === 'cross' && p.onRoad)) infr('peaton');
  }
}

function setSignal(s) { PL.signal = s; $('sigL').classList.toggle('on', s === 'l'); $('sigR').classList.toggle('on', s === 'r'); $('sigL').classList.toggle('blk', s === 'l'); $('sigR').classList.toggle('blk', s === 'r'); if (!s) setInd(player, 'l', false); }

/* ================= AMBULANCIA ================= */
function updAmb(dt) {
  const wantSpawn = !amb.on && (mode === 'free' ? simT > PL.nextAmb : (cpi >= 2 && !PL.ambDone));
  if (wantSpawn) {
    const loc = locate(P.x, P.z);
    if ((loc.k === 'H' && loc.j !== 2) || (loc.k === 'V' && loc.i !== 2)) {
      const H = loc.k === 'H', fx = Math.sin(P.h), fz = Math.cos(P.h), s = Math.sign(H ? fx : fz);
      if (P.v > 3 && Math.abs(H ? fx : fz) > 0.8) {
        const d = H ? { x: s, z: 0 } : { x: 0, z: s }, r = right(d);
        const cx = H ? P.x : loc.i * S, cz = H ? loc.j * S : P.z;
        amb.x = cx - d.x * 55 - r.x * LO; amb.z = cz - d.z * 55 - r.z * LO; amb.d = d; amb.h = Math.atan2(d.x, d.z);
        if (amb.x > -10 && amb.x < MAXC + 10 && amb.z > -10 && amb.z < MAXC + 10) { amb.on = true; amb.passed = false; amb.g.visible = true; PL.ambDone = true; }
        else if (mode === 'free') PL.nextAmb = simT + 10;
      }
    }
  }
  if (!amb.on) { $('emerg').classList.add('hidden'); if (sirG) sirG.gain.value = 0; return; }
  amb.x += amb.d.x * 17 * dt; amb.z += amb.d.z * 17 * dt;
  amb.vx = amb.d.x * 17; amb.vz = amb.d.z * 17;
  amb.g.position.set(amb.x, 0, amb.z); amb.g.rotation.y = amb.h;
  const bl = Math.floor(simT * 6) % 2; amb.lr.color.setHex(bl ? 0xff0000 : 0x330000); amb.lb.color.setHex(bl ? 0x000833 : 0x0044ff);
  const rel = (P.x - amb.x) * amb.d.x + (P.z - amb.z) * amb.d.z, dist = Math.hypot(P.x - amb.x, P.z - amb.z);
  $('emerg').classList.toggle('hidden', !(rel > -5 && rel < 60));
  if (!amb.passed && rel < 0) { amb.passed = true; if (Math.abs(P.v) * 3.6 > 20 && dist < 12) infr('ambulancia'); else toast('✅ Bien: cediste el paso a la ambulancia', 'ok'); }
  if (sirG && soundOn) { sirG.gain.value = clamp(0.05 * (1 - dist / 120), 0, .05); sir.frequency.value = Math.floor(simT * 1.6) % 2 ? 960 : 700; }
  if (rel < -90 || amb.x < -40 || amb.x > MAXC + 40 || amb.z < -40 || amb.z > MAXC + 40) { amb.on = false; amb.g.visible = false; amb.vx = amb.vz = 0; PL.nextAmb = simT + rnd(60, 100); }
}

/* ================= MISIONES ================= */
function setCP(k) {
  cpi = k; const c = cps[k];
  if (!c) return;
  cpMesh.visible = !c.park; parkMark.visible = !!c.park;
  if (!c.park) cpMesh.position.set(c.x, 0, c.z);
  $('msnT').textContent = (mode === 'exam' ? `Destino ${k + 1} de ${cps.length}: ` : 'Destino: ') + c.n;
}
function updMission(dt) {
  const c = cps[cpi]; if (!c) return;
  const dx = c.x - P.x, dz = c.z - P.z, dist = Math.hypot(dx, dz), fx = Math.sin(P.h), fz = Math.cos(P.h);
  const lr = dx * -fz + dz * fx, lf = dx * fx + dz * fz;
  $('arrow').style.transform = `rotate(${Math.atan2(lr, lf) * 180 / Math.PI}deg)`;
  $('msnD').textContent = c.park ? (dist < 15 ? 'Detente dentro del rectángulo verde, alineado con la calle' : Math.round(dist) + ' m') : Math.round(dist) + ' m';
  if (c.park) {
    if (Math.abs(dx) < 1.7 && Math.abs(dz) < 0.85 && Math.abs(fz) < 0.26 && Math.abs(P.v) < 0.2) { PL.parkT += dt; if (PL.parkT > 1.2) endExam(true); } else PL.parkT = 0;
  } else if (dist < 7) {
    beep(880, .15);
    if (mode === 'exam') { toast('✅ Destino alcanzado', 'ok', 1500); setCP(cpi + 1); }
    else { score += 10; $('score').textContent = 'Puntaje ' + score; toast('✅ Destino alcanzado (+10)', 'ok', 1500); let n; do n = pick(PLACES); while (n === c); cps = [n]; setCP(0); }
  }
  cpMesh.rotation.y += dt;
}

/* ================= HUD ================= */
const miniBg = document.createElement('canvas'); miniBg.width = miniBg.height = 256;
const W0 = -20, W1 = MAXC + 20, msc = 256 / (W1 - W0), mm = v => (v - W0) * msc;
function drawMiniBg() {
  const g = miniBg.getContext('2d'); g.fillStyle = '#6f9257'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#d9d9d9'; g.lineWidth = W * msc;
  for (let k = 0; k < N; k++) { g.beginPath(); g.moveTo(mm(-HW), mm(k * S)); g.lineTo(mm(MAXC + HW), mm(k * S)); g.stroke(); g.beginPath(); g.moveTo(mm(k * S), mm(-HW)); g.lineTo(mm(k * S), mm(MAXC + HW)); g.stroke(); }
  g.fillStyle = '#d9d9d9'; g.beginPath(); g.arc(mm(RB.x), mm(RB.z), RB.out * msc, 0, TAU); g.fill(); g.fillStyle = '#5f9e45'; g.beginPath(); g.arc(mm(RB.x), mm(RB.z), RB.isl * msc, 0, TAU); g.fill();
  g.fillStyle = 'rgba(198,226,26,.8)'; g.fillRect(mm(S - HW), mm(2 * S + HW), W * msc, (S - W) * msc);
  g.fillStyle = '#1d4fa0'; g.fillRect(mm(BAY.x0), mm(BAY.z0), BAY.n * BAY.len * msc, BAY.w * msc + 1);
  for (const k of LIGHTS) { const [i, j] = k.split(',').map(Number); g.fillStyle = '#111'; g.fillRect(mm(i * S) - 3, mm(j * S) - 3, 6, 6); }
}
function drawMini() {
  const g = $('mini').getContext('2d'); g.drawImage(miniBg, 0, 0);
  g.fillStyle = '#fff'; for (const a of ais) { g.fillRect(mm(a.x) - 1.5, mm(a.z) - 1.5, 3, 3); }
  if (amb.on) { g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(mm(amb.x), mm(amb.z), 4, 0, TAU); g.fill(); }
  const c = cps[cpi]; if (c) { g.fillStyle = '#facc15'; g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.arc(mm(c.x), mm(c.z), 6, 0, TAU); g.fill(); g.stroke(); }
  g.save(); g.translate(mm(P.x), mm(P.z)); g.rotate(-P.h + Math.PI); g.fillStyle = '#ff3b30'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke(); g.restore();
}
let lastLim = 0;
function updHUD(dt) {
  $('kmh').textContent = Math.round(Math.abs(P.v) * 3.6);
  $('gear').textContent = P.v < -0.1 ? 'R' : P.v > 0.1 ? 'D' : 'N';
  if (lastLim !== PL.limit) { lastLim = PL.limit; $('lim').src = signCanvas('vel', PL.limit).toDataURL(); }
  // semáforo cercano
  let tl = null; const fx = Math.sin(P.h), fz = Math.cos(P.h);
  for (const k of LIGHTS) { const [i, j] = k.split(',').map(Number), rx = i * S - P.x, rz = j * S - P.z, ah = rx * fx + rz * fz; if (ah > 0 && ah < 45 && Math.abs(rx * fz - rz * fx) < 6) tl = lightState(i, j, axisOf(snap(fx, fz)), simT); }
  $('tlight').classList.toggle('hidden', !tl); if (tl) $('tlight').querySelectorAll('i').forEach(e => e.classList.toggle('on', e.classList.contains(tl)));
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  $('belt').classList.toggle('need', !PL.belt); $('belt').textContent = PL.belt ? '✅ Cinturón' : '🔒 Cinturón';
  // intermitente del auto
  if (PL.signal) setInd(player, PL.signal, Math.floor(simT * 3) % 2 === 0);
  for (const h of LIGHT_HEADS) { const s = lightState(h.i, h.j, h.ax, simT); h.mats.forEach((m, k) => m.color.setHex(['r', 'y', 'g'][k] === s ? LCOL[s] : 0x262626)); }
  drawMini();
}

/* ================= SONIDO ================= */
let AC = null, eng, engG, sir, sirG, soundOn = true;
function audioInit() {
  if (AC) { AC.resume?.(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    eng = AC.createOscillator(); eng.type = 'sawtooth'; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    engG = AC.createGain(); engG.gain.value = 0; eng.connect(lp); lp.connect(engG); engG.connect(AC.destination); eng.start();
    sir = AC.createOscillator(); sir.type = 'triangle'; sirG = AC.createGain(); sirG.gain.value = 0; sir.connect(sirG); sirG.connect(AC.destination); sir.start();
  } catch (e) { AC = null; }
}
function beep(f = 440, d = .25) { if (!AC || !soundOn) return; const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d); }
function updSound() { if (!engG) return; engG.gain.value = soundOn && running && !paused ? 0.035 : 0; eng.frequency.value = 38 + Math.abs(P.v) * 5 + (inp.gas ? 12 : 0); if (!soundOn || paused) sirG.gain.value = 0; }

/* ================= CICLO ================= */
function update(dt) {
  simT += dt;
  ents = [player, ...ais]; if (amb.on) ents.push(amb);
  updPeds(dt);
  for (const a of ais) a.update(dt);
  updPlayer(dt);
  if (!running) return;
  updAmb(dt);
  updMission(dt);
  updHUD(dt);
}
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updCamera(dt, snapCam) {
  const fx = Math.sin(P.h), fz = Math.cos(P.h);
  if (camMode === 0) {
    const tgt = new THREE.Vector3(P.x - fx * 8, 3.6, P.z - fz * 8);
    // evita que la cámara quede dentro de un edificio
    if (locate(tgt.x, tgt.z).k === 'bldg') tgt.set(P.x - fx * 4, 5.5, P.z - fz * 4);
    if (snapCam) camPos.copy(tgt); else camPos.lerp(tgt, 1 - Math.exp(-dt * 5));
    camera.position.copy(camPos); camLook.set(P.x + fx * 6, 1.2, P.z + fz * 6); camera.lookAt(camLook);
  } else if (camMode === 1) {
    camera.position.set(P.x + fx * 0.2 + Math.cos(P.h) * 0.35, 1.35, P.z + fz * 0.2 - Math.sin(P.h) * 0.35); camLook.set(P.x + fx * 20, 1.1, P.z + fz * 20); camera.lookAt(camLook);
  } else {
    camera.position.set(P.x - fx * 4, 32, P.z - fz * 4); camera.lookAt(P.x + fx * 6, 0, P.z + fz * 6);
  }
}
let last = performance.now(), menuAng = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (running && !paused) { update(dt); updCamera(dt); }
  else if (!running) { // vista de menú
    simT += dt; menuAng += dt * 0.05; ents = [player, ...ais]; updPeds(dt); for (const a of ais) a.update(dt);
    for (const h of LIGHT_HEADS) { const s = lightState(h.i, h.j, h.ax, simT); h.mats.forEach((m, k) => m.color.setHex(['r', 'y', 'g'][k] === s ? LCOL[s] : 0x262626)); }
    camera.position.set(RB.x + Math.cos(menuAng) * 120, 70, RB.z + Math.sin(menuAng) * 120); camera.lookAt(RB.x, 0, RB.z);
  }
  updSound();
  renderer.render(scene, camera);
}

/* ================= PARTIDA ================= */
function spawnAIs(n) {
  let guard = 0;
  while (ais.length < n && guard++ < 500) {
    const i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N), d = pick(DIRS);
    if (!inGrid(i + d.x, j + d.z) || !edgeAllowed(i, j, d)) continue;
    const a = new AI(); a.setLane(i, j, d, rnd(.1, .8));
    if (Math.hypot(a.x - P.x, a.z - P.z) < 30 || ais.some(b => Math.hypot(a.x - b.x, a.z - b.z) < 14)) { scene.remove(a.car.g); continue; }
    a.v = 8; ais.push(a);
  }
}
function startGame(m) {
  mode = m; running = true; paused = false; score = 100; log = []; simT = 0; resetPL();
  P.x = 18; P.z = 4 * S + LO; P.h = Math.PI / 2; P.v = 0; P.steer = 0;
  for (const a of ais) scene.remove(a.car.g); ais = []; spawnAIs(16);
  amb.on = false; amb.g.visible = false;
  cps = m === 'exam' ? EXAM.slice() : [pick(PLACES.slice(0, 5))]; setCP(0);
  setSignal(null); $('score').textContent = m === 'exam' ? 'Examen: 0 faltas' : 'Puntaje 100'; $('score').classList.toggle('hidden', false);
  show(null); $('hud').classList.remove('hidden'); $('ctl').classList.remove('hidden');
  updCamera(0, true); resize(); last = performance.now();
  toast(m === 'exam' ? 'Abróchate el cinturón 🔒 antes de partir' : 'Abróchate el cinturón 🔒 y a manejar', 'info', 3500);
  try { if (innerWidth < innerHeight && screen.orientation?.lock) document.documentElement.requestFullscreen?.().then(() => screen.orientation.lock('landscape')).catch(() => { }); } catch (e) { }
}
function endExam(ok, code) {
  running = false; $('hud').classList.add('hidden'); $('ctl').classList.add('hidden'); $('rot').classList.add('hidden');
  for (const k in inp) inp[k] = 0;
  const st = JSON.parse(localStorage.getItem('sim_stats') || '{"intentos":0,"aprobados":0}'); st.intentos++; if (ok) st.aprobados++; try { localStorage.setItem('sim_stats', JSON.stringify(st)); } catch (e) { }
  if (ok) {
    beep(660, .2); setTimeout(() => beep(990, .3), 200);
    $('resT').textContent = '🎉 ¡Examen práctico aprobado!';
    $('resB').innerHTML = `<div class="card good"><b>100% — sin infracciones</b><p>Completaste los ${cps.length} destinos respetando todas las señales y estacionaste correctamente.</p></div><p style="font-size:13px;opacity:.8">Intentos: ${st.intentos} · Aprobados: ${st.aprobados}</p>`;
  } else {
    const I = INF[code];
    $('resT').textContent = '❌ Examen reprobado';
    $('resB').innerHTML = `<div class="card bad"><b>${I.t}</b><p>${I.d}</p></div><p>Llegaste al destino ${cpi + 1} de ${cps.length}. Para aprobar debes completar la ruta al 100%, sin ninguna infracción. Repite el examen.</p><p style="font-size:13px;opacity:.8">Intentos: ${st.intentos} · Aprobados: ${st.aprobados}</p>`;
  }
  $('again').onclick = () => brief('exam');
  show('result');
}
function endFree() {
  running = false; $('hud').classList.add('hidden'); $('ctl').classList.add('hidden');
  const cnt = {}; log.forEach(l => cnt[l.code] = (cnt[l.code] || 0) + 1);
  $('resT').textContent = `Puntaje final: ${score}`;
  $('resB').innerHTML = log.length ? '<p>Infracciones cometidas:</p>' + Object.keys(cnt).map(k => `<div class="card bad"><b>${INF[k].t} ×${cnt[k]}</b><p>${INF[k].d}</p></div>`).join('') : '<div class="card good"><b>¡Sin infracciones!</b></div>';
  $('again').onclick = () => brief('free'); show('result');
}

function show(id) { for (const s of ['menu', 'signs', 'help', 'brief', 'pause', 'result']) $(s).classList.toggle('hidden', s !== id); }
function brief(m) {
  $('briefT').textContent = m === 'exam' ? '🎓 Examen práctico' : '🌆 Conducción libre';
  $('briefB').innerHTML = (m === 'exam'
    ? `<p>Recorre 5 destinos en orden y termina estacionando en el lugar marcado. Sigue la flecha amarilla y el mapa.</p><div class="card"><b>Para aprobar (100%)</b><ul class="ck">
      <li>Abrocha el cinturón antes de partir.</li><li>Respeta semáforos, PARE (detención total), CEDA EL PASO y la rotonda.</li>
      <li>Usa el intermitente antes de cada viraje.</li><li>Máximo 50 km/h; 30 km/h en la zona escolar.</li><li>Detente ante peatones en los pasos de cebra.</li>
      <li>Si escuchas una sirena, oríllate y frena (menos de 20 km/h).</li><li>Mantente en tu pista (derecha) y no subas a la vereda.</li></ul></div>
      <p>Una sola infracción reprueba el examen y deberás repetirlo.</p>`
    : `<p>Maneja libremente por la ciudad. Cada destino alcanzado suma 10 puntos y cada infracción descuenta según su gravedad. Aparecerán ambulancias de vez en cuando.</p>`);
  $('briefGo').onclick = () => { audioInit(); startGame(m); };
  show('brief');
}
function buildSignList() {
  const L = [['pare', null, 'PARE', 'Detención total antes de la línea. Luego cede el paso a la vía transversal.'], ['ceda', null, 'CEDA EL PASO', 'Reduce y, si viene alguien por la vía preferente, detente y déjalo pasar.'],
    ['semaforo', null, 'Semáforo más adelante', 'Rojo: detenerse. Amarillo: detenerse si es posible hacerlo con seguridad. Verde: avanzar con precaución.'],
    ['vel', 50, 'Velocidad máxima 50 km/h', 'Límite general en zona urbana.'], ['vel', 30, 'Velocidad máxima 30 km/h', 'Se usa en la zona escolar del simulador.'],
    ['escolar', null, 'Zona escolar', 'Niños cruzando. Baja a 30 km/h y extrema la precaución.'], ['peaton', null, 'Paso peatonal', 'Paso de cebra: el peatón tiene preferencia. Detente si hay alguien cruzando.'],
    ['rotonda', null, 'Rotonda más adelante', 'Cede el paso a quienes ya circulan por ella. Se gira dejando la isla a la izquierda.'],
    ['sentido', 'r', 'Sentido del tránsito', 'La calle es de un solo sentido, en la dirección de la flecha.'], ['noentrar', null, 'No entrar', 'Prohibido ingresar: esa calle viene en sentido contrario.'],
    ['noizq', null, 'No virar a la izquierda', 'Prohibido el viraje a la izquierda en ese cruce.'], ['noest', null, 'No estacionar', 'No puedes dejar el vehículo detenido en ese tramo.'], ['est', null, 'Estacionamiento', 'Lugar habilitado para estacionar.']];
  $('signList').innerHTML = L.map(([t, p, n, d]) => `<div class="sg"><img src="${signCanvas(t, p).toDataURL()}" alt=""><div><b>${n}</b><span>${d}</span></div></div>`).join('') +
    `<div class="card"><b>🚑 Vehículos de emergencia</b><p style="font-size:14px">Si se acerca una ambulancia con sirena, oríllate a la derecha y reduce a menos de 20 km/h o detente hasta que pase.</p></div>
     <div class="card"><b>↪️ Intermitentes</b><p style="font-size:14px">Activa el intermitente antes de entrar al cruce donde vas a virar. Se apaga solo al terminar el viraje.</p></div>`;
}

/* ================= ENTRADA ================= */
function hold(id, key) {
  const el = $(id); const on = e => { e.preventDefault(); inp[key] = 1; el.classList.add('on'); audioInit(); }, off = e => { e.preventDefault(); inp[key] = 0; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
hold('bL', 'l'); hold('bR', 'r'); hold('bGas', 'gas'); hold('bBrake', 'brake');
const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
tap('sigL', () => setSignal(PL.signal === 'l' ? null : 'l'));
tap('sigR', () => setSignal(PL.signal === 'r' ? null : 'r'));
tap('belt', () => { if (!PL.belt) { PL.belt = true; beep(1200, .08); toast('Cinturón abrochado ✅', 'ok', 1200); } });
tap('cam', () => { camMode = (camMode + 1) % 3; updCamera(0, true); });
tap('horn', () => { beep(330, .3); beep(415, .3); });
tap('snd', () => { soundOn = !soundOn; $('snd').textContent = soundOn ? '🔊' : '🔇'; });
tap('pauseB', () => { if (running) { paused = true; show('pause'); } });
$('resume').onclick = () => { paused = false; show(null); last = performance.now(); };
$('restart').onclick = () => { startGame(mode); };
document.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => { if (running && mode === 'free' && paused) { paused = false; endFree(); return; } running = false; paused = false; $('hud').classList.add('hidden'); $('ctl').classList.add('hidden'); $('rot').classList.add('hidden'); show('menu'); });
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => show('menu'));
$('mExam').onclick = () => brief('exam'); $('mFree').onclick = () => brief('free');
$('mSigns').onclick = () => show('signs'); $('mHelp').onclick = () => show('help');
const KEYS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake' };
addEventListener('keydown', e => {
  if (KEYS[e.code]) { inp[KEYS[e.code]] = 1; e.preventDefault(); }
  if (!running || e.repeat) return;
  if (e.code === 'KeyQ') setSignal(PL.signal === 'l' ? null : 'l');
  if (e.code === 'KeyE') setSignal(PL.signal === 'r' ? null : 'r');
  if (e.code === 'KeyB' && !PL.belt) { PL.belt = true; toast('Cinturón abrochado ✅', 'ok', 1200); }
  if (e.code === 'KeyC') { camMode = (camMode + 1) % 3; updCamera(0, true); }
  if (e.code === 'KeyH') beep(330, .3);
  if (e.code === 'KeyP') { paused = !paused; show(paused ? 'pause' : null); }
});
addEventListener('keyup', e => { if (KEYS[e.code]) inp[KEYS[e.code]] = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) { paused = true; show('pause'); } });

/* ================= INICIO ================= */
buildWorld(); buildSigns(); drawMiniBg(); buildSignList();
player = makeCar(0x1f6feb); player.x = 0; player.z = 0; player.vx = player.vz = 0;
amb = makeAmbulance(); Object.assign(amb, { on: false, x: -999, z: -999, vx: 0, vz: 0, h: 0 });
for (const cw of CW) { const n = cw.kids ? 3 : 2; for (let k = 0; k < n; k++) makePed(cw.kids || (k === 1 && Math.random() < .3), cw); }
// autos estacionados
for (let k = 0; k < BAY.n; k++) { if (k === BAY.free) continue; const c = makeCar(pick(COLORS)), p = spotC(k); c.g.position.set(p.x, 0, p.z); c.g.rotation.y = Math.PI / 2; parked.push({ x: p.x, z: p.z, h: Math.PI / 2 }); }
parkMark = new THREE.Mesh(new THREE.PlaneGeometry(BAY.len - 0.4, BAY.w - 0.3), new THREE.MeshBasicMaterial({ color: 0x22dd55, transparent: true, opacity: .55 }));
parkMark.rotation.x = -Math.PI / 2; const sc = spotC(BAY.free); parkMark.position.set(sc.x, 0.05, sc.z); parkMark.visible = false; scene.add(parkMark);
cpMesh = new THREE.Group();
const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
beam.position.y = 7; cpMesh.add(beam);
const ringM = new THREE.Mesh(new THREE.TorusGeometry(3.2, .15, 6, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15 })); ringM.rotation.x = Math.PI / 2; ringM.position.y = .2; cpMesh.add(ringM);
cpMesh.visible = false; scene.add(cpMesh);
P.x = 18; P.z = 4 * S + LO; P.h = Math.PI / 2; player.g.position.set(P.x, 0, P.z); player.g.rotation.y = P.h;
resetPL(); spawnAIs(16);
resize(); requestAnimationFrame(frame);
window.__sim = { setCP, P, PL, inp, CTRL, PEDS, lightState, get simT() { return simT; }, get amb() { return amb; }, get ais() { return ais; }, get log() { return log; }, startGame, locate, get running() { return running; }, get cpi() { return cpi; } };
