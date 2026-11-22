// Tiny stack VM for make.fun tiny-stack-vm-01 (ISA v1). Runs each program in
// /input/<id>/ (program.bin + input.bin) and writes /output/<id>/stdout.bin
// and /output/<id>/exit.txt. Semantics follow ISA.md exactly; where the text
// could be read two ways, the reference VM (generator/subject/vm.mjs) rules.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = new Map([[0,[0,0,0]],[1,[1,0,1]],[2,[4,0,1]],[3,[0,1,0]],[4,[0,1,2]],[5,[0,2,2]],[6,[0,2,3]],[7,[0,3,3]],[16,[0,2,1]],[17,[0,2,1]],[18,[0,2,1]],[19,[0,2,1]],[20,[0,2,1]],[21,[0,2,1]],[22,[0,2,1]],[23,[0,1,1]],[24,[0,2,1]],[25,[0,2,1]],[26,[0,2,1]],[27,[0,1,1]],[28,[0,2,1]],[29,[0,2,1]],[30,[0,2,1]],[32,[0,2,1]],[33,[0,2,1]],[34,[0,2,1]],[48,[2,0,0]],[49,[2,1,0]],[50,[2,1,0]],[51,[2,0,0]],[52,[0,0,0]],[64,[0,1,1]],[65,[0,2,0]],[80,[0,1,0]],[81,[0,1,0]],[82,[0,0,1]],[83,[0,1,0]]]);

// Traps (ISA.md): end at once, exit = trap code. All sites throw Trap:
// one exit path. Codes in ISA check order: 10 step, 9 pc, 5 opcode,
// 2 underflow, 3 overflow, 4 div0, 6 address, 7 call overflow, 8 empty
// RET, 11 output.
class Trap extends Error { code; constructor(c) { super(); this.code = c; } }
function trap(c) { throw new Trap(c); }

function dec(O, l, v) {
  let u = v < 0 ? -v : v;
  let d = 1;
  for (let t = u; t >= 10; t = (t / 10) | 0) d++;
  const n = d + (v < 0 ? 1 : 0);
  if (l + n > 65536) return -1;
  let a = l + n;
  if (u === 0) O[--a] = 48;
  while (u > 0) { O[--a] = 48 + (u % 10); u = (u / 10) | 0; }
  if (v < 0) O[l] = 45;
  return l + n;
}

function run(p, g) {
  const S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const O = new Uint8Array(65536);
  let s = 0, c = 0, l = 0, i = 0, pc = 0, t = 0, code = 0;
  const n = p.length;
  try {
  L: for (;;) {
    if (t === 1000000) trap(10);
    if (pc < 0 || pc >= n) trap(9);
    const o = p[pc], f = I.get(o);
    if (f === undefined) trap(5);
    const m = f[0], q = f[1], w = f[2];
    if (pc + m >= n) trap(9);
    t++;
    const nx = pc + 1 + m;
    if (s < q) trap(2);
    if (s - q + w > 256) trap(3);
    pc = nx;
    switch (o) {
      case 0: break L;
      case 1: S[s++] = (p[nx - 1] << 24) >> 24; break;
      case 2: S[s++] = p[nx-4] | (p[nx-3] << 8) | (p[nx-2] << 16) | (p[nx-1] << 24); break;
      case 3: s--; break;
      case 4: S[s] = S[s - 1]; s++; break;
      case 5: { const x = S[s-1]; S[s-1] = S[s-2]; S[s-2] = x; break; }
      case 6: S[s] = S[s - 2]; s++; break;
      case 7: { const x = S[s-3]; S[s-3] = S[s-2]; S[s-2] = S[s-1]; S[s-1] = x; break; }
      case 23: S[s-1] = -S[s-1] | 0; break;
      case 27: S[s-1] = ~S[s-1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32:
      case 33: case 34: {
        const b = S[s-1], a = S[s-2];
        let r;
        if (o === 16) r = (a + b) | 0;
        else if (o === 17) r = (a - b) | 0;
        else if (o === 18) r = Math.imul(a, b);
        else if (o === 19) {
          if (b === 0) trap(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (o === 20) {
          if (b === 0) trap(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (o === 21) {
          if (b === 0) trap(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (o === 22) {
          if (b === 0) trap(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (o === 24) r = a & b;
        else if (o === 25) r = a | b;
        else if (o === 26) r = a ^ b;
        else if (o === 28) r = a << (b & 31);
        else if (o === 29) r = a >> (b & 31);
        else if (o === 30) r = (a >>> (b & 31)) | 0;
        else if (o === 32) r = a === b ? 1 : 0;
        else if (o === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        s -= 2;
        S[s++] = r;
        break;
      }
      case 48: case 49: case 50: {
        const rel = ((p[nx-2] | (p[nx-1] << 8)) << 16) >> 16;
        let take = true;
        if (o !== 48) { const v = S[--s]; take = o === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51:
        if (c === 64) trap(7);
        C[c++] = nx;
        pc = p[nx-2] | (p[nx-1] << 8);
        break;
      case 52:
        if (c === 0) trap(8);
        pc = C[--c];
        break;
      case 64: {
        const a = S[s-1];
        if (a < 0 || a >= 256) trap(6);
        S[s-1] = M[a];
        break;
      }
      case 65: {
        const a = S[s-1], v = S[s-2];
        if (a < 0 || a >= 256) trap(6);
        s -= 2;
        M[a] = v;
        break;
      }
      case 80: {
        const k = dec(O, l, S[s-1]);
        if (k < 0) trap(11);
        s--;
        l = k;
        break;
      }
      case 81:
        if (l + 1 > 65536) trap(11);
        O[l++] = S[--s] & 255;
        break;
      case 82:
        S[s++] = i < g.length ? g[i++] : -1;
        break;
      case 83:
        code = S[--s] & 255;
        break L;
      default: trap(5);
    }
  }
  } catch (e) { if (e instanceof Trap) code = e.code; else throw e; }
  return { out: O.subarray(0, l), code };
}

const A = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const B = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const e of readdirSync(A, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  if (!e.isDirectory()) continue;
  let p;
  try { p = readFileSync(join(A, e.name, 'program.bin')); } catch { continue; }
  let g;
  try { g = readFileSync(join(A, e.name, 'input.bin')); } catch { g = new Uint8Array(0); }
  const r = run(p, g);
  mkdirSync(join(B, e.name), { recursive: true });
  writeFileSync(join(B, e.name, 'stdout.bin'), r.out);
  writeFileSync(join(B, e.name, 'exit.txt'), `${r.code}\n`);
}
