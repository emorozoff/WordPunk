import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const RAW = join(ROOT, 'data/raw');

function parseLine(line) {
  const cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

const words = new Set();
for (const f of readdirSync(RAW)) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(join(RAW, f), 'utf8');
  const lines = text.split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    const en = (cells[0] || '').trim().toLowerCase();
    if (en) words.add(en);
  }
}

const sorted = [...words].sort();
const out = join(ROOT, 'data/stoplists/wave4.txt');
writeFileSync(out, sorted.join('\n') + '\n');
console.log(`Wrote ${sorted.length} words to ${out}`);
