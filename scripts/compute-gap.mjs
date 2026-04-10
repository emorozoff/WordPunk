import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const RAW = join(ROOT, 'data/raw');
const FREQ = join(ROOT, 'data/freq');

// Parse CSV row (handles quoted fields)
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

// 1. Build existing set from all raw CSVs (english headword column, lowercased)
const existing = new Set();
for (const f of readdirSync(RAW)) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(join(RAW, f), 'utf8');
  const lines = text.split('\n').slice(1); // skip header
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    const en = (cells[0] || '').trim().toLowerCase();
    if (en) existing.add(en);
  }
}
console.log(`Existing headwords in DB: ${existing.size}`);

// 2. Closed-class function words / structural words to always skip
const STOP_FUNCTION = new Set([
  'the','a','an','is','am','are','was','were','be','been','being',
  'have','has','had','do','does','did','doing',
  'will','would','can','could','shall','should','may','might','must',
  'of','to','in','on','at','by','for','with','from','as','into','onto',
  'and','or','but','nor','yet','so','if','because','although','though',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','mine','yours','hers','ours','theirs',
  'this','that','these','those','there','here','where','when','why','how','what','who','whom','whose','which',
  'not','no','yes'
]);

// 3. Read SUBTLEX 50k (format: "word count" per line, ordered by frequency)
const subText = readFileSync(join(FREQ, 'subtlex_50k.txt'), 'utf8');
const subWords = [];
for (const line of subText.split('\n')) {
  const m = line.match(/^([a-z]+)\s+\d+$/i);
  if (!m) continue;
  const w = m[1].toLowerCase();
  if (w.length < 2) continue; // skip 1-letter
  subWords.push(w);
}
console.log(`SUBTLEX words (alpha-only, len>=2): ${subWords.length}`);

// 4. Gap = subtlex words not in existing and not in function stop
const gap = [];
for (const w of subWords) {
  if (existing.has(w)) continue;
  if (STOP_FUNCTION.has(w)) continue;
  gap.push(w);
}
console.log(`Raw gap (subtlex minus DB minus function words): ${gap.length}`);

writeFileSync(join(FREQ, 'gap_content_v2.txt'), gap.join('\n') + '\n');
console.log('Wrote data/freq/gap_content_v2.txt');

// 5. Coverage stats for top-N
for (const N of [500, 1000, 1500, 2000, 3000, 5000]) {
  const top = subWords.slice(0, N);
  const inDB = top.filter(w => existing.has(w)).length;
  const pct = ((inDB / N) * 100).toFixed(1);
  console.log(`Top-${N} SUBTLEX: ${inDB}/${N} already in DB (${pct}%)`);
}

// 6. First 30 gap words (highest-freq missing content)
console.log('\nFirst 30 gap words (highest-frequency missing):');
console.log('  ' + gap.slice(0, 30).join(', '));
