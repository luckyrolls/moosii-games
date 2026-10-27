// Generates the three fixture images in fixtures/jigsaw/images/ (1600x900 PNG).
// Original, programmatic artwork: soft gradients and simple shapes, with enough distinct
// regions that jigsaw tiles can be told apart. No dependencies: shapes are drawn with
// anti-aliased signed distances into an RGB buffer and encoded with node:zlib.
//
//   node scripts/generate-jigsaw-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const W = 1600;
const H = 900;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'jigsaw', 'images');

// ---------- tiny raster toolkit ----------

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Coverage from a signed distance (negative = inside), 1px soft edge. */
const cover = (d) => clamp01(0.5 - d);

function canvas() {
  return new Float32Array(W * H * 3);
}

function fill(img, colorAt) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = colorAt(x, y);
      const i = (y * W + x) * 3;
      img[i] = c[0];
      img[i + 1] = c[1];
      img[i + 2] = c[2];
    }
  }
}

/** Paint `color` wherever `sdf(x, y)` < 0, blended by coverage and alpha. Only scans a bounding box. */
function paint(img, sdf, color, alpha = 1, box = [0, 0, W, H]) {
  const [x0, y0, x1, y1] = box.map((v, i) => Math.round(Math.min(Math.max(v, 0), i % 2 ? H : W)));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const a = cover(sdf(x + 0.5, y + 0.5)) * alpha;
      if (a <= 0) continue;
      const i = (y * W + x) * 3;
      img[i] += (color[0] - img[i]) * a;
      img[i + 1] += (color[1] - img[i + 1]) * a;
      img[i + 2] += (color[2] - img[i + 2]) * a;
    }
  }
}

const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
const ellipse = (cx, cy, rx, ry) => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const below = (f) => (x, y) => f(x) - y; // inside when y > f(x)
const roundRect = (x0, y0, x1, y1, r) => (x, y) => {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const qx = Math.abs(x - cx) - (x1 - x0) / 2 + r;
  const qy = Math.abs(y - cy) - (y1 - y0) / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const triangle = (ax, ay, bx, by, cx, cy) => (x, y) => {
  // Max of the three edge distances (positive outside).
  const edge = (px, py, qx, qy) => {
    const nx = qy - py;
    const ny = px - qx;
    const len = Math.hypot(nx, ny);
    return ((x - px) * nx + (y - py) * ny) / len;
  };
  const s = Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  return Math.max(edge(ax, ay, bx, by) * s, edge(bx, by, cx, cy) * s, edge(cx, cy, ax, ay) * s);
};

function verticalGradient(img, stops) {
  fill(img, (_x, y) => {
    const t = y / (H - 1);
    for (let i = 1; i < stops.length; i++) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      if (t <= t1) return mix(hex(c0), hex(c1), (t - t0) / (t1 - t0));
    }
    return hex(stops[stops.length - 1][1]);
  });
}

function tree(img, x, baseY, h, leaf, trunk) {
  paint(img, roundRect(x - h * 0.05, baseY - h * 0.45, x + h * 0.05, baseY, 4), hex(trunk), 1, [x - 40, baseY - h, x + 40, baseY + 2]);
  paint(img, circle(x, baseY - h * 0.62, h * 0.3), hex(leaf), 1, [x - h, baseY - h * 1.1, x + h, baseY]);
  paint(img, circle(x - h * 0.17, baseY - h * 0.5, h * 0.2), hex(leaf), 1, [x - h, baseY - h, x + h, baseY]);
  paint(img, circle(x + h * 0.18, baseY - h * 0.52, h * 0.21), hex(leaf), 1, [x - h, baseY - h, x + h, baseY]);
}

function flower(img, x, y, r, petal, centre) {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    paint(img, circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75), hex(petal), 1, [x - r * 3, y - r * 3, x + r * 3, y + r * 3]);
  }
  paint(img, circle(x, y, r * 0.7), hex(centre), 1, [x - r * 2, y - r * 2, x + r * 2, y + r * 2]);
}

// ---------- scenes ----------

/** Park afternoon: sky, sun, kite, hills, trees, a path. */
function park() {
  const img = canvas();
  verticalGradient(img, [[0, '#9fd3f2'], [0.55, '#e4f2fb'], [1, '#e4f2fb']]);
  paint(img, circle(1300, 190, 95), hex('#ffd36b'));
  paint(img, circle(1300, 190, 140), hex('#fff1c4'), 0.35);
  for (const [cx, cy, s] of [[320, 150, 1], [760, 110, 0.8], [1010, 230, 0.7]]) {
    for (const [dx, dy, r] of [[0, 0, 55], [55, 10, 45], [-50, 12, 42], [20, -25, 40]]) paint(img, circle(cx + dx * s, cy + dy * s, r * s), hex('#ffffff'), 0.92);
  }
  // Kite with a tail.
  paint(img, triangle(560, 260, 640, 330, 560, 420), hex('#e86f8a'));
  paint(img, triangle(560, 260, 480, 330, 560, 420), hex('#7a5cc9'));
  for (let i = 0; i < 6; i++) paint(img, circle(560 + Math.sin(i) * 14, 440 + i * 26, 7), hex('#7a5cc9'));
  paint(img, below((x) => 560 + 70 * Math.sin(x / 260) + 30 * Math.sin(x / 90)), hex('#9cc98a'));
  paint(img, below((x) => 650 + 60 * Math.sin(x / 210 + 1.7)), hex('#7fb26f'));
  paint(img, below((x) => 760 + 40 * Math.sin(x / 300 + 0.5)), hex('#6a9e5e'));
  paint(img, (x, y) => Math.abs(x - (900 + (y - 900) * 0.9 + 60 * Math.sin(y / 70))) - (20 + (y - 600) * 0.12), hex('#e8d9b5'), 1, [600, 600, 1400, 900]);
  tree(img, 230, 640, 260, '#4f8a4a', '#7b5a3c');
  tree(img, 1450, 700, 300, '#3f7a44', '#6e4f33');
  tree(img, 1150, 610, 180, '#5e9a52', '#7b5a3c');
  for (const [x, y] of [[420, 780], [470, 820], [1240, 830], [1320, 790], [700, 860]]) flower(img, x, y, 11, '#f6f0ff', '#f2c14e');
  return img;
}

/** Growing savings: warm wall, shelf, three jars with rising coins, a sprouting plant. */
function savings() {
  const img = canvas();
  verticalGradient(img, [[0, '#fde7d3'], [0.68, '#f7d2b5'], [0.69, '#b98a62'], [1, '#a4774f']]);
  for (let i = 0; i < 6; i++) paint(img, roundRect(80 + i * 260, 70, 220 + i * 260, 74, 2), hex('#f2c9a6'));
  paint(img, circle(1440, 150, 70), hex('#ffffff'), 0.5);
  paint(img, roundRect(60, 600, 1540, 630, 10), hex('#8a6240'));
  const jars = [
    [330, 3, '#cfe6f2'],
    [640, 6, '#d9e9d1'],
    [950, 9, '#e7dcf2'],
  ];
  for (const [x, n, glass] of jars) {
    paint(img, roundRect(x - 110, 300, x + 110, 600, 34), hex(glass), 0.9);
    paint(img, roundRect(x - 80, 270, x + 80, 305, 10), hex('#9a7653'));
    for (let k = 0; k < n; k++) {
      const cy = 580 - k * 30;
      paint(img, ellipse(x + (k % 2 ? 12 : -12), cy, 70, 16), hex(k % 3 === 2 ? '#e0a93b' : '#f2c14e'));
      paint(img, ellipse(x + (k % 2 ? 12 : -12), cy - 4, 56, 9), hex('#f7d97c'), 0.8);
    }
    paint(img, roundRect(x - 95, 320, x - 75, 560, 10), hex('#ffffff'), 0.35);
  }
  // Pot and sprout.
  paint(img, (x, y) => roundRect(1225, 470, 1395, 600, 18)(x + (x - 1310) * ((y - 470) / 130) * 0.25, y), hex('#c8734a'));
  paint(img, roundRect(1200, 440, 1420, 480, 12), hex('#d9865b'));
  paint(img, roundRect(1303, 250, 1317, 445, 6), hex('#4f8a4a'));
  paint(img, ellipse(1250, 300, 60, 26), hex('#6aa75b'));
  paint(img, ellipse(1372, 250, 66, 28), hex('#5e9a52'));
  paint(img, ellipse(1262, 380, 48, 20), hex('#7fb26f'));
  // Floor boards.
  for (let i = 0; i < 7; i++) paint(img, roundRect(i * 240 - 20, 700 + (i % 2) * 70, i * 240 + 200, 704 + (i % 2) * 70, 2), hex('#8f6644'));
  // A striped rug, so the floor tiles differ from one another.
  const rug = ellipse(800, 800, 520, 70);
  paint(img, rug, hex('#5f7fa8'), 1, [260, 720, 1340, 880]);
  for (const [ry, col] of [[-36, '#e9c46a'], [-12, '#f4efe6'], [12, '#e07a5f'], [36, '#f4efe6']]) {
    paint(img, (x, y) => Math.max(rug(x, y), Math.abs(y - 800 - ry) - 6), hex(col), 1, [260, 720, 1340, 880]);
  }
  return img;
}

/** Quiet garden at sunrise: soft sky, low sun, distant hills, a bench, flower beds, stepping stones. */
function garden() {
  const img = canvas();
  verticalGradient(img, [[0, '#f8c9a8'], [0.35, '#fbe3c8'], [0.58, '#eef3e6'], [1, '#eef3e6']]);
  paint(img, circle(420, 470, 120), hex('#ffe2a8'));
  paint(img, circle(420, 470, 190), hex('#fff3d6'), 0.3);
  paint(img, below((x) => 470 + 50 * Math.sin(x / 230 + 2)), hex('#b9cfe0'));
  paint(img, below((x) => 530 + 45 * Math.sin(x / 180)), hex('#a6c49a'));
  paint(img, below((x) => 610 + 25 * Math.sin(x / 260 + 1)), hex('#8db57f'));
  // Birds.
  for (const [x, y] of [[980, 170], [1060, 210], [1150, 160]]) {
    paint(img, (px, py) => Math.abs(Math.hypot(px - x + 18, py - y) - 18) - 2.5 + (py > y ? 0 : 0) + (py > y ? 99 : 0), hex('#6d6a86'), 1, [x - 40, y - 30, x, y + 5]);
    paint(img, (px, py) => Math.abs(Math.hypot(px - x - 18, py - y) - 18) - 2.5 + (py > y ? 99 : 0), hex('#6d6a86'), 1, [x, y - 30, x + 40, y + 5]);
  }
  // Bench.
  paint(img, roundRect(980, 560, 1340, 590, 8), hex('#9b6f4a'));
  paint(img, roundRect(980, 610, 1340, 636, 8), hex('#8a613f'));
  for (const x of [1010, 1310]) paint(img, roundRect(x - 10, 590, x + 10, 700, 4), hex('#6e4d33'));
  // Flower beds.
  const colours = [['#f4b6c2', '#f2c14e'], ['#c9b6e8', '#f7e08a'], ['#ffffff', '#e8a33b']];
  for (let i = 0; i < 22; i++) {
    const x = 90 + i * 70 + (i % 3) * 9;
    const y = 760 + Math.sin(i * 1.7) * 40;
    const [p, c] = colours[i % 3];
    paint(img, roundRect(x - 3, y, x + 3, y + 90, 3), hex('#5e9a52'));
    flower(img, x, y, 14, p, c);
  }
  // Stepping stones.
  for (const [x, y, rx] of [[640, 700, 70], [760, 760, 80], [600, 830, 90]]) paint(img, ellipse(x, y, rx, rx * 0.4), hex('#d8d2c4'));
  return img;
}

// ---------- PNG encoding (RGB, Paeth filter) ----------

function crc32(buf) {
  let c;
  const table = crc32.table ??= Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(img) {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  const px = Buffer.alloc(stride * H);
  for (let i = 0; i < img.length; i++) px[i] = Math.round(Math.min(255, Math.max(0, img[i])));
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 4; // Paeth
    for (let x = 0; x < stride; x++) {
      const a = x >= 3 ? px[y * stride + x - 3] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= 3 && y > 0 ? px[(y - 1) * stride + x - 3] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      raw[y * (stride + 1) + 1 + x] = (px[y * stride + x] - pred) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, scene] of [['park-afternoon', park], ['growing-savings', savings], ['quiet-garden', garden]]) {
  const png = encodePng(scene());
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`${name}.png ${W}x${H} ${(png.length / 1024).toFixed(0)} KB`);
}
