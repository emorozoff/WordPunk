import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = '/Users/egor/Desktop/Claude Code/wordpunk';
const STAGING = join(ROOT, 'data/staging/wave4');
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

function csvEscape(s) {
  if (s.includes(',') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const byTopic = new Map();
let total = 0;

for (const f of readdirSync(STAGING).sort()) {
  if (!f.endsWith('.csv')) continue;
  const text = readFileSync(join(STAGING, f), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cells = parseLine(line);
    if (cells.length !== 5) {
      console.error(`[${f}] skip bad row: ${line}`);
      continue;
    }
    const [en, ru, sentence, diff, topic] = cells.map(s => s.trim());
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push({ en, ru, sentence, diff });
    total++;
  }
}
console.log(`Loaded ${total} rows from ${byTopic.size} topics`);

for (const [topic, rows] of byTopic) {
  const path = join(RAW, `${topic}.csv`);
  let existing;
  try {
    existing = readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`No raw file for topic=${topic}, skipping ${rows.length} rows`);
    continue;
  }
  if (!existing.endsWith('\n')) existing += '\n';

  const appended = rows.map(r =>
    [r.en, r.ru, csvEscape(r.sentence), r.diff].join(',')
  ).join('\n') + '\n';

  writeFileSync(path, existing + appended);
  console.log(`[${topic}.csv] +${rows.length} rows`);
}

console.log(`\nMerge complete: ${total} rows added across ${byTopic.size} topics`);
