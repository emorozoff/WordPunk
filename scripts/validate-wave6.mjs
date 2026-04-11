import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const STAGING = join(ROOT, 'data/staging/wave6');
const RAW = join(ROOT, 'data/raw');

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

// 1. Build existing stop set
const existing = new Set();
for (const f of readdirSync(RAW)) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(join(RAW, f), 'utf8');
  const lines = text.split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    const en = (cells[0] || '').trim().toLowerCase();
    if (en) existing.add(en);
  }
}
console.log(`Existing DB headwords: ${existing.size}`);

// 2. Validate each wave4 staging CSV
const files = readdirSync(STAGING).filter(f => f.endsWith('.csv')).sort();
let total = 0;
const wordToFiles = new Map();
const badRows = [];
const collisions = [];
const boldCountIssues = [];
const topicCounts = new Map();

for (const f of files) {
  const text = readFileSync(join(STAGING, f), 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    rows.push(parseLine(line));
  }
  console.log(`\n=== ${f} (${rows.length} rows) ===`);
  total += rows.length;
  let bad = 0;
  let coll = 0;
  let boldIssue = 0;

  for (const cells of rows) {
    if (cells.length !== 5) {
      bad++;
      badRows.push({ file: f, issue: `cols=${cells.length}`, cells });
      continue;
    }
    const [en, ru, sentence, diff, topic] = cells.map(s => (s || '').trim());
    const enLower = en.toLowerCase();

    if (!en || !ru || !sentence || !diff || !topic) {
      bad++;
      badRows.push({ file: f, issue: 'empty', cells });
      continue;
    }
    if (!/^[1-5]$/.test(diff)) {
      bad++;
      badRows.push({ file: f, issue: `diff=${diff}`, cells });
      continue;
    }
    if (!VALID_TOPICS.has(topic)) {
      bad++;
      badRows.push({ file: f, issue: `topic=${topic}`, cells });
      continue;
    }

    // Count bold markers
    const boldMatches = sentence.match(/\*\*[^*]+\*\*/g) || [];
    if (boldMatches.length === 0) {
      bad++;
      badRows.push({ file: f, issue: 'no bold', cells });
      continue;
    }
    if (boldMatches.length !== 1) {
      boldIssue++;
      boldCountIssues.push({ file: f, word: en, count: boldMatches.length, sentence });
    }

    // Track for cross-file analysis
    if (!wordToFiles.has(enLower)) wordToFiles.set(enLower, []);
    wordToFiles.get(enLower).push({ file: f, topic, ru, sentence });

    // DB collision
    if (existing.has(enLower)) {
      coll++;
      collisions.push({ file: f, word: enLower, topic, ru });
    }

    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }

  console.log(`  bad format: ${bad}`);
  console.log(`  bold-count issues: ${boldIssue}`);
  console.log(`  DB collisions: ${coll}`);
}

// 3. Cross-file dupes
const crossFile = [];
for (const [word, occs] of wordToFiles) {
  if (occs.length > 1) crossFile.push({ word, occs });
}
console.log(`\n=== CROSS-FILE DUPES (${crossFile.length}) ===`);
for (const c of crossFile.slice(0, 40)) {
  console.log(`  ${c.word}: ${c.occs.map(o => `${o.file.replace('.csv','')}→${o.topic}`).join(' | ')}`);
}
if (crossFile.length > 40) console.log(`  ...and ${crossFile.length - 40} more`);

// 4. DB collisions
console.log(`\n=== DB COLLISIONS (${collisions.length}) ===`);
for (const c of collisions.slice(0, 30)) {
  console.log(`  ${c.word} [${c.file.replace('.csv','')}→${c.topic}] (${c.ru})`);
}
if (collisions.length > 30) console.log(`  ...and ${collisions.length - 30} more`);

// 5. Bold count issues
if (boldCountIssues.length > 0) {
  console.log(`\n=== BOLD-COUNT ISSUES (${boldCountIssues.length}) — expected 1 bold per sentence ===`);
  for (const b of boldCountIssues.slice(0, 20)) {
    console.log(`  [${b.file}] ${b.word} (${b.count} bolds): ${b.sentence.slice(0, 100)}`);
  }
  if (boldCountIssues.length > 20) console.log(`  ...and ${boldCountIssues.length - 20} more`);
}

// 6. Bad rows
if (badRows.length > 0) {
  console.log(`\n=== BAD ROWS (${badRows.length}) ===`);
  for (const b of badRows.slice(0, 20)) {
    console.log(`  [${b.file}] ${b.issue}: ${JSON.stringify(b.cells).slice(0, 120)}`);
  }
}

// 7. Topic distribution
console.log('\n=== TOPIC DISTRIBUTION ===');
const sorted = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [t, n] of sorted) console.log(`  ${t}: ${n}`);

console.log(`\nTotal rows: ${total}`);
console.log(`Unique words across all files: ${wordToFiles.size}`);
console.log(`Net additions (after removing DB collisions + cross-file dupes): ${wordToFiles.size - collisions.length}`);
