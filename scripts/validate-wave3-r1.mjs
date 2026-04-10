import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const STAGING = join(ROOT, 'data/staging/wave3');
const RAW = join(ROOT, 'data/raw');

const VALID_TOPICS = new Set([
  'basic','family','home','work','school','kitchen','restaurant',
  'shopping','nature','sports','leisure','party','doctor','health',
  'driving','airport','hotel','bank','internet','science','politics'
]);

// Parse CSV (5 cols, may have quoted fields)
function parseCSV(text, expectedCols) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

// 1. Build existing stop set from raw CSVs (english column, lowercase)
const existing = new Set();
for (const f of readdirSync(RAW)) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(join(RAW, f), 'utf8');
  const lines = text.split('\n').slice(1); // skip header
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseCSV(line, 4)[0];
    if (!cells) continue;
    const en = (cells[0] || '').trim().toLowerCase();
    if (en) existing.add(en);
  }
}
console.log(`Existing headwords in DB: ${existing.size}`);

// 2. Load all wave3 batches
const batches = {};
for (const f of readdirSync(STAGING).sort()) {
  if (!f.startsWith('batch') || !f.endsWith('.csv')) continue;
  const text = readFileSync(join(STAGING, f), 'utf8');
  const rows = parseCSV(text, 5);
  batches[f] = rows;
}

// 3. Per-batch report
let total = 0;
const wordToBatches = new Map();
const topicCounts = new Map();
const badRows = [];
const collisionsWithDB = [];

for (const [name, rows] of Object.entries(batches)) {
  console.log(`\n=== ${name} (${rows.length} rows) ===`);
  total += rows.length;
  const seenInBatch = new Set();
  let dupInBatch = 0;
  let badTopicCount = 0;
  let badFormatCount = 0;
  let collisionCount = 0;

  for (const r of rows) {
    if (r.length !== 5) {
      badFormatCount++;
      badRows.push({ batch: name, row: r, issue: `cols=${r.length}` });
      continue;
    }
    const [en, ru, sentence, diff, topic] = r.map(s => (s || '').trim());
    const enLower = en.toLowerCase();

    // Format checks
    if (!en || !ru || !sentence || !diff || !topic) {
      badFormatCount++;
      badRows.push({ batch: name, row: r, issue: 'empty field' });
      continue;
    }
    if (!/^[1-5]$/.test(diff)) {
      badFormatCount++;
      badRows.push({ batch: name, row: r, issue: `bad diff=${diff}` });
      continue;
    }
    if (!VALID_TOPICS.has(topic)) {
      badTopicCount++;
      badRows.push({ batch: name, row: r, issue: `bad topic=${topic}` });
      continue;
    }
    // Sentence must contain **word** (markdown bold)
    if (!/\*\*[^*]+\*\*/.test(sentence)) {
      badFormatCount++;
      badRows.push({ batch: name, row: r, issue: 'no bold marker' });
      continue;
    }

    // In-batch dup
    if (seenInBatch.has(enLower)) {
      dupInBatch++;
    }
    seenInBatch.add(enLower);

    // Cross-batch tracking
    if (!wordToBatches.has(enLower)) wordToBatches.set(enLower, []);
    wordToBatches.get(enLower).push({ batch: name, topic, russian: ru });

    // Collision with existing DB
    if (existing.has(enLower)) {
      collisionCount++;
      collisionsWithDB.push({ batch: name, word: enLower, topic, ru });
    }

    // Topic counts
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }

  console.log(`  bad format: ${badFormatCount}`);
  console.log(`  bad topic:  ${badTopicCount}`);
  console.log(`  in-batch dups: ${dupInBatch}`);
  console.log(`  collisions with existing DB: ${collisionCount}`);
}

// 4. Cross-batch dupes
console.log('\n=== CROSS-BATCH DUPES ===');
let cbCount = 0;
for (const [word, occs] of wordToBatches) {
  if (occs.length > 1) {
    cbCount++;
    console.log(`  ${word}: ${occs.map(o => `${o.batch.replace('.csv','')}→${o.topic}`).join(' | ')}`);
  }
}
if (cbCount === 0) console.log('  (none)');

// 5. Collisions with existing DB
console.log(`\n=== COLLISIONS WITH EXISTING DB (${collisionsWithDB.length}) ===`);
for (const c of collisionsWithDB.slice(0, 30)) {
  console.log(`  ${c.word} [${c.batch.replace('.csv','')}→${c.topic}] (${c.ru})`);
}
if (collisionsWithDB.length > 30) console.log(`  ...and ${collisionsWithDB.length - 30} more`);

// 6. Topic distribution
console.log('\n=== TOPIC DISTRIBUTION ===');
const sortedTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [t, n] of sortedTopics) console.log(`  ${t}: ${n}`);

// 7. Bad rows detail
if (badRows.length > 0) {
  console.log(`\n=== BAD ROWS (${badRows.length}) ===`);
  for (const b of badRows.slice(0, 20)) {
    console.log(`  [${b.batch}] ${b.issue}: ${JSON.stringify(b.row).slice(0, 120)}`);
  }
}

console.log(`\nTotal rows across 5 batches: ${total}`);
console.log(`Unique new words: ${wordToBatches.size}`);
console.log(`Net additions (after removing collisions): ${wordToBatches.size - collisionsWithDB.length}`);
