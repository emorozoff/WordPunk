import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const STAGING = '/Users/egor/Desktop/Claude Code/wordpunk/data/staging/wave4';

const VALID_TOPICS = new Set([
  'basic','family','home','work','school','kitchen','restaurant',
  'shopping','nature','sports','leisure','party','doctor','health',
  'driving','airport','hotel','bank','internet','science','politics'
]);

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

function csvEscape(s) {
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

for (const f of readdirSync(STAGING).sort()) {
  if (!f.endsWith('.csv')) continue;
  const path = join(STAGING, f);
  const lines = readFileSync(path, 'utf8').split('\n');
  const fixed = [];
  let changes = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    if (cells.length === 5) { fixed.push(line); continue; }
    if (cells.length < 5) { fixed.push(line); continue; }

    const en = cells[0].trim();
    const ru = cells[1].trim();
    const topic = cells[cells.length - 1].trim();
    const diff = cells[cells.length - 2].trim();
    if (!/^[1-5]$/.test(diff) || !VALID_TOPICS.has(topic)) {
      fixed.push(line);
      continue;
    }
    const middle = cells.slice(2, cells.length - 2).map(s => s.trim()).join(', ');
    fixed.push([en, ru, csvEscape(middle), diff, topic].join(','));
    changes++;
  }
  if (changes > 0) {
    writeFileSync(path, fixed.join('\n') + '\n');
    console.log(`[${f}] fixed ${changes} rows`);
  }
}
