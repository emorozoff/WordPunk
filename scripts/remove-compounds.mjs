// Remove compound nouns from the database, keep phrasal verbs and common expressions
import { readFileSync, writeFileSync } from 'fs';

const file = readFileSync('src/data/words.ts', 'utf-8');
const startIdx = file.indexOf('[');
const endIdx = file.lastIndexOf(']');
const body = file.slice(startIdx + 1, endIdx);

const cards = [];
let depth = 0, start = -1;
for (let i = 0; i < body.length; i++) {
  if (body[i] === '{') { if (depth === 0) start = i; depth++; }
  else if (body[i] === '}') {
    depth--;
    if (depth === 0 && start >= 0) {
      try { cards.push(new Function('return ' + body.slice(start, i + 1))()); }
      catch (e) { console.warn('SKIP:', body.slice(start, start + 80)); }
      start = -1;
    }
  }
}
console.log(`Parsed ${cards.length} cards`);

// Phrasal verb particles
const particles = new Set([
  'up','down','in','out','on','off','away','back','over','through',
  'around','along','about','by','for','to','into','onto','upon'
]);

// Common expressions starting with these words are idiomatic — keep
const expressionStarters = new Set([
  'a','an','the','in','on','at','by','for','of','no','not','so','too'
]);

// Specific whitelist of useful multi-word entries
const whitelist = new Set([
  'good luck', 'well done', 'come on', 'hang on', 'hold on',
  'go ahead', 'take care', 'of course', 'of course not',
  'on time', 'lose weight', 'side dish', 'short story',
]);

function shouldRemove(c) {
  const words = c.english.trim().split(/\s+/);
  if (words.length < 2) return false; // single word — keep

  const en = c.english.toLowerCase().trim();

  // Whitelist
  if (whitelist.has(en)) return false;

  // Expression starting with article/preposition — keep (a lot, in front of, by the way)
  if (expressionStarters.has(words[0].toLowerCase())) return false;

  // Phrasal verb: 2 words, last word is particle — keep
  if (words.length === 2 && particles.has(words[1].toLowerCase())) return false;

  // Everything else with 2+ words is a compound noun — remove
  return true;
}

const removed = [];
const clean = cards.filter(c => {
  if (shouldRemove(c)) {
    removed.push(`${c.english} = ${c.russian}`);
    return false;
  }
  return true;
});

console.log(`\nRemoved ${removed.length} compound nouns:`);
removed.forEach(r => console.log(`  ${r}`));
console.log(`\nRemaining: ${clean.length}`);

// Write
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const lines = clean.map(c => {
  const syns = c.synonyms.length ? c.synonyms.map(s => `'${esc(s)}'`).join(', ') : '';
  const diff = c.difficulty ? `, difficulty: ${c.difficulty}` : '';
  const ex = c.example ? `'${esc(c.example)}'` : "''";
  return `  { id: '${esc(c.id)}', english: '${esc(c.english)}', russian: '${esc(c.russian)}', synonyms: [${syns}], example: ${ex}, topicId: '${esc(c.topicId)}', isCustom: ${c.isCustom}${diff} },`;
});
const output = `import type { Card } from '../types';\n\nexport const WORDS: Card[] = [\n${lines.join('\n')}\n];\n`;
writeFileSync('src/data/words.ts', output);
console.log('Wrote cleaned words.ts');
