// Build src/data/words.ts from data/raw/*.csv
// Each CSV: english,russian,sentence,difficulty
// The "sentence" field contains **target_word** highlighting markers — kept as-is.

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const RAW_DIR = 'data/raw';
const OUT = 'src/data/words.ts';
const LEVELS_FILE = 'data/levels.json';

// Load freqLevels map (word → level 1-10)
let freqLevels = {};
try {
  freqLevels = JSON.parse(readFileSync(LEVELS_FILE, 'utf-8'));
  console.log(`Loaded freqLevels for ${Object.keys(freqLevels).length} words`);
} catch {
  console.warn(`WARN: ${LEVELS_FILE} not found — run scripts/assign-levels.mjs first`);
}

// Parse a CSV line respecting double-quote escaping
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') { fields.push(cur); cur = ''; }
      else if (ch === '"' && cur === '') { inQuote = true; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields;
}

const allCards = [];
const files = readdirSync(RAW_DIR).filter(f => f.endsWith('.csv')).sort();

for (const file of files) {
  const topicId = file.replace('.csv', '');
  const content = readFileSync(join(RAW_DIR, file), 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  // Skip header
  const dataLines = lines.slice(1);

  let idx = 0;
  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length < 4) {
      console.warn(`SKIP malformed line in ${file}: ${line.slice(0, 60)}`);
      continue;
    }
    const [english, russian, sentence, difficulty, extraTopics] = fields;
    if (!english || !russian || !sentence) {
      console.warn(`SKIP empty fields in ${file}: ${line.slice(0, 60)}`);
      continue;
    }
    idx++;
    const enTrim = english.trim();
    const freqLevel = freqLevels[enTrim.toLowerCase()] ?? 9;
    // topicIds: primary (filename) + optional extras from 5th CSV column (pipe-separated)
    const extraIds = extraTopics
      ? extraTopics.trim().split('|').map(t => t.trim()).filter(Boolean)
      : [];
    const topicIds = [topicId, ...extraIds.filter(t => t !== topicId)];
    allCards.push({
      id: `${topicId}_${String(idx).padStart(3, '0')}`,
      english: enTrim,
      russian: russian.trim(),
      sentence: sentence.trim(),
      topicId,
      topicIds,
      isCustom: false,
      difficulty: parseInt(difficulty, 10) || 1,
      freqLevel,
    });
  }
}

console.log(`Built ${allCards.length} cards from ${files.length} topics`);

// Stats
const byTopic = {};
for (const c of allCards) byTopic[c.topicId] = (byTopic[c.topicId] || 0) + 1;
console.log('\nPer topic:');
for (const [t, n] of Object.entries(byTopic).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${t}: ${n}`);
}

const uniqueEng = new Set(allCards.map(c => c.english.toLowerCase()));
console.log(`\nUnique English words: ${uniqueEng.size}`);

// Write words.ts
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const lines = allCards.map(c => {
  const topicIdsStr = c.topicIds.map(t => `'${esc(t)}'`).join(', ');
  return `  { id: '${esc(c.id)}', english: '${esc(c.english)}', russian: '${esc(c.russian)}', synonyms: [], example: '${esc(c.sentence)}', topicId: '${esc(c.topicId)}', topicIds: [${topicIdsStr}], isCustom: ${c.isCustom}, difficulty: ${c.difficulty}, freqLevel: ${c.freqLevel} },`;
});
const output = `import type { Card } from '../types';\n\nexport const WORDS: Card[] = [\n${lines.join('\n')}\n];\n`;
writeFileSync(OUT, output);
console.log(`\nWrote ${OUT}`);
