// Clean up the word database
import { readFileSync, writeFileSync } from 'fs';

const file = readFileSync('src/data/words.ts', 'utf-8');
const startIdx = file.indexOf('[');
const endIdx = file.lastIndexOf(']');
const arrayBody = file.slice(startIdx + 1, endIdx);

// Parse cards via Function() eval — handles all edge cases
const cards = [];
let depth = 0, start = -1;
for (let i = 0; i < arrayBody.length; i++) {
  if (arrayBody[i] === '{') { if (depth === 0) start = i; depth++; }
  else if (arrayBody[i] === '}') {
    depth--;
    if (depth === 0 && start >= 0) {
      try { cards.push(new Function('return ' + arrayBody.slice(start, i + 1))()); }
      catch (e) { console.warn('SKIP:', arrayBody.slice(start, start + 80)); }
      start = -1;
    }
  }
}
console.log(`Parsed ${cards.length} cards`);

const allEnglish = new Set(cards.map(c => c.english.toLowerCase()));

// --- TRANSLITERATION CHECK ---
// Only flag words where Russian is a direct borrowing (sounds the same, similar length)
function isTransliteration(c) {
  const en = c.english.toLowerCase().replace(/[\s\-]/g, '');
  const ru = c.russian.toLowerCase().replace(/[\s\-]/g, '');

  // Russian contains mostly Latin characters (LinkedIn, GDPR, etc.)
  const latinInRu = (ru.match(/[a-z0-9]/g) || []).length;
  if (latinInRu > ru.length * 0.5 && ru.length > 1) return true;

  const enL = en.replace(/[^a-z]/g, '');
  const ruL = ru.replace(/[^а-яё]/g, '');
  if (enL.length < 3 || ruL.length < 3) return false;

  // Length ratio check: real transliterations have similar length
  // "burger"(6) vs "бургер"(6) = ratio 1.0 ✓
  // "sort"(4) vs "сортировать"(11) = ratio 2.75 ✗
  const ratio = Math.max(enL.length, ruL.length) / Math.min(enL.length, ruL.length);
  if (ratio > 1.6) return false;

  // Transliteration similarity
  const tr = {
    'a':'а','b':'б','v':'в','g':'г','d':'д','e':'е','z':'з','i':'и',
    'k':'к','l':'л','m':'м','n':'н','o':'о','p':'п','r':'р','s':'с',
    't':'т','u':'у','f':'ф','h':'х','c':'к','y':'й','x':'кс',
  };
  let t = '';
  for (const ch of enL) t += tr[ch] || ch;
  const shorter = Math.min(t.length, ruL.length);
  let same = 0;
  for (let i = 0; i < shorter; i++) if (t[i] === ruL[i]) same++;

  return same / shorter > 0.7;
}

// --- -ED DUPLICATE CHECK ---
function isEdDuplicate(c) {
  const en = c.english.toLowerCase();
  if (!en.endsWith('ed')) return false;
  const base = en.slice(0, -2); // walked -> walk
  if (allEnglish.has(base)) return true;
  if (allEnglish.has(base + 'e')) return true; // baked -> bake
  // doubled consonant: stopped -> stop
  if (en.length >= 5 && en[en.length - 3] === en[en.length - 4]) {
    if (allEnglish.has(en.slice(0, -3))) return true;
  }
  return false;
}

// --- OTHER FILTERS ---
function hasParenthetical(c) {
  return c.russian.includes('(') && c.russian.includes(')');
}

function isLongPhrase(c) {
  return c.english.trim().split(/\s+/).length >= 3 && c.russian.trim().split(/\s+/).length >= 3;
}

function isMultiWordPair(c) {
  return c.english.trim().split(/\s+/).length >= 2 && c.russian.trim().split(/\s+/).length >= 2;
}

// --- APPLY FILTERS ---
const stats = { translit: 0, ed: 0, parens: 0, longPhrase: 0, multiWord: 0 };
const examples = { translit: [], ed: [], parens: [], longPhrase: [], multiWord: [] };

const clean = cards.filter(c => {
  for (const [key, fn] of [['translit', isTransliteration], ['ed', isEdDuplicate], ['parens', hasParenthetical], ['longPhrase', isLongPhrase], ['multiWord', isMultiWordPair]]) {
    if (fn(c)) {
      stats[key]++;
      if (examples[key].length < 8) examples[key].push(`${c.english} = ${c.russian}`);
      return false;
    }
  }
  return true;
});

console.log('\n--- REMOVAL STATS ---');
for (const [k, v] of Object.entries(stats)) {
  console.log(`\n${k}: ${v}`);
  examples[k].forEach(e => console.log(`  ${e}`));
}
console.log(`\nTotal removed: ${cards.length - clean.length}`);
console.log(`Remaining: ${clean.length}`);

const byTopic = {};
for (const c of clean) byTopic[c.topicId] = (byTopic[c.topicId] || 0) + 1;
console.log('\n--- CARDS PER TOPIC ---');
for (const [t, n] of Object.entries(byTopic).sort((a, b) => a[0].localeCompare(b[0]))) console.log(`${t}: ${n}`);

// --- WRITE ---
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const lines = clean.map(c => {
  const syns = c.synonyms.length ? c.synonyms.map(s => `'${esc(s)}'`).join(', ') : '';
  const diff = c.difficulty ? `, difficulty: ${c.difficulty}` : '';
  const ex = c.example ? `'${esc(c.example)}'` : "''";
  return `  { id: '${esc(c.id)}', english: '${esc(c.english)}', russian: '${esc(c.russian)}', synonyms: [${syns}], example: ${ex}, topicId: '${esc(c.topicId)}', isCustom: ${c.isCustom}${diff} },`;
});

const output = `import type { Card } from '../types';\n\nexport const WORDS: Card[] = [\n${lines.join('\n')}\n];\n`;
writeFileSync('src/data/words.ts', output);
console.log('\nWrote cleaned words.ts');
