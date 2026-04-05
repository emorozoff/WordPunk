import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nlpModule = require('../node_modules/compromise/builds/three/compromise-three.cjs');
const nlp = nlpModule.default || nlpModule;

const content = readFileSync('./src/data/words.ts', 'utf-8');

// Extract all english values
const matches = [...content.matchAll(/english:\s*'([^']+)'/g)];
const words = matches.map(m => m[1]);

const totalCards = words.length;

// Get unique base forms using compromise
const baseForms = new Set();
for (const word of words) {
  const doc = nlp(word);
  // Try to get base/infinitive form
  const verbs = doc.verbs().toInfinitive().out('array');
  if (verbs.length > 0 && verbs[0]) {
    baseForms.add(verbs[0].toLowerCase());
  } else {
    baseForms.add(word.toLowerCase());
  }
}

const uniqueCount = baseForms.size;

console.log(`\nWordPunk word count`);
console.log(`===================`);
console.log(`Total cards:         ${totalCards}`);
console.log(`Unique base words:   ${uniqueCount}`);
console.log(`Verb forms merged:   ${totalCards - uniqueCount}`);
console.log(``);

// Per topic
const topicMatches = [...content.matchAll(/topicId:\s*'([^']+)'/g)];
const topics = {};
for (const m of topicMatches) {
  const t = m[1];
  topics[t] = (topics[t] || 0) + 1;
}
const sorted = Object.entries(topics).sort((a, b) => b[1] - a[1]);
console.log('Per topic:');
for (const [topic, count] of sorted) {
  console.log(`  ${topic.padEnd(12)} ${count}`);
}
