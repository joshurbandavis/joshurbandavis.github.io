// Offline build for in-other-words.
//
// Downloads each voice's source text (cached in .cache/), cuts it into small
// units -- a line plus the line after it, or one verse -- embeds every unit
// with the same sentence model the page runs in the browser, and writes two
// files per voice into ../data/:
//
//   <id>.json  the text of every unit, plus where it came from
//   <id>.bin   the vectors: count float32 scales, then count*DIM int8 values
//              (each vector is stored as int8 * its own scale -- a quarter the
//              size of float32, and plenty accurate for ranking)
//
// Usage:  npm install && npm run build            (all voices)
//         npm run build -- swift sonnets          (just these)

import { pipeline } from '@huggingface/transformers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.cache');
const OUT = path.join(HERE, '..', 'data');

// Must match MODEL / DTYPE in ../index.html, or query and corpus vectors
// won't live in the same space.
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const DTYPE = 'q8';
const DIM = 384;
const BATCH = 64;

async function fetchCached(name, url) {
  const file = path.join(CACHE, name);
  try { return await fs.readFile(file, 'utf8'); } catch {}
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(file, text);
  return text;
}

// Gutenberg texts: keep only what's between the START and END markers.
function gutenbergBody(text) {
  const start = text.indexOf('\n', text.indexOf('*** START OF'));
  const end = text.indexOf('*** END OF');
  return text.slice(start, end).replace(/\r/g, '');
}

const clean = (s) => s.replace(/_/g, '').replace(/\s+/g, ' ').trim();

// Consecutive line pairs within one block (a stanza, a sonnet, a song).
function pairs(lines, src) {
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) out.push({ a: lines[i], b: lines[i + 1], src });
  if (lines.length === 1) out.push({ a: lines[0], b: '', src });
  return out;
}

const VOICES = {
  swift: {
    name: 'Taylor Swift',
    credit: 'lyrics via github.com/shaynak/taylor-swift-lyrics',
    async units() {
      const data = JSON.parse(await fetchCached('swift.json',
        'https://raw.githubusercontent.com/shaynak/taylor-swift-lyrics/main/lyrics.json'));
      const out = [];
      for (const [album, songs] of Object.entries(data)) {
        for (const [song, lines] of Object.entries(songs)) {
          const src = `${song} · ${album}`;
          for (const l of lines) {
            const a = clean(l.lyric), b = clean(l.next || '');
            if (a) out.push({ a, b: b === a ? '' : b, src });
          }
        }
      }
      return out;
    },
  },

  sonnets: {
    name: 'Shakespeare',
    credit: "Shakespeare's Sonnets, Project Gutenberg #1041",
    async units() {
      const body = gutenbergBody(await fetchCached('sonnets.txt',
        'https://www.gutenberg.org/cache/epub/1041/pg1041.txt'));
      const out = [];
      // Each sonnet starts at a line that is only a roman numeral.
      const parts = body.split(/\n\s*([IVXLC]+)\s*\n/);
      for (let i = 1; i < parts.length; i += 2) {
        const lines = parts[i + 1].split('\n').map(clean).filter(Boolean);
        out.push(...pairs(lines, `Sonnet ${parts[i]}`));
      }
      return out;
    },
  },

  dickinson: {
    name: 'Emily Dickinson',
    credit: 'Poems, Three Series, Project Gutenberg #12242',
    async units() {
      let body = gutenbergBody(await fetchCached('dickinson.txt',
        'https://www.gutenberg.org/cache/epub/12242/pg12242.txt'));
      body = body.slice(body.indexOf('I. LIFE.'));
      const out = [];
      let firstLine = null;
      // Stanzas are blank-line-separated blocks. A lone roman numeral starts a
      // new poem; Dickinson's poems go by their first line, so that's the credit.
      for (const block of body.split(/\n\s*\n/)) {
        const raw = block.split('\n').filter((l) => l.trim());
        if (!raw.length) continue;
        const first = raw[0].trim();
        if (/^[IVXLC]+\.$/.test(first)) { firstLine = null; continue; }
        if (/^[IVXLC]+\. [A-Z .,'-]+$/.test(first)) continue;       // section header
        if (/^[A-Z][A-Z .,'!?-]+$/.test(first) && raw.length === 1) continue; // poem title
        if (first.startsWith('[') || raw.some((l) => l.length > 72)) continue; // notes, prose
        if (/SERIES|PREFACE|Gutenberg/i.test(block)) continue;
        const lines = raw.map(clean);
        if (!firstLine) firstLine = lines[0].replace(/[\s,;:.!?-]+$/, '');
        out.push(...pairs(lines, `“${firstLine}”`));
      }
      return out;
    },
  },

  solomon: {
    name: 'Proverbs',
    credit: 'Proverbs & Ecclesiastes, King James Version, Project Gutenberg #10',
    async units() {
      const text = await fetchCached('kjv.txt', 'https://www.gutenberg.org/cache/epub/10/pg10.txt');
      const out = [];
      const books = [['Proverbs', 'The Proverbs', 'Ecclesiastes'],
                     ['Ecclesiastes', 'Ecclesiastes', 'The Song of Solomon']];
      for (const [label, startTitle, endTitle] of books) {
        // Titles appear once in the contents and again as the book heading;
        // the second occurrence is the book itself.
        const re = (t) => new RegExp(`^${t}\\s*$`, 'gm');
        const starts = [...text.matchAll(re(startTitle))];
        const ends = [...text.matchAll(re(endTitle))];
        const book = text.slice(starts[1].index, ends[1].index).replace(/\s+/g, ' ');
        const verses = book.split(/(\d+:\d+) /);
        for (let i = 1; i < verses.length; i += 2) {
          const verse = verses[i + 1].trim();
          if (verse.length > 220) continue;
          out.push({ a: verse, b: '', src: `${label} ${verses[i]}` });
        }
      }
      return out;
    },
  },
};

function dedupe(units) {
  const seen = new Set();
  return units.filter((u) => {
    const key = (u.a + ' ' + u.b).toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (key.replace(/ /g, '').length < 8 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildVoice(id, embed) {
  const voice = VOICES[id];
  console.log(`${voice.name}`);
  const units = dedupe(await voice.units());
  console.log(`  ${units.length} units`);

  const scales = new Float32Array(units.length);
  const ints = new Int8Array(units.length * DIM);
  for (let i = 0; i < units.length; i += BATCH) {
    const batch = units.slice(i, i + BATCH).map((u) => (u.b ? `${u.a} ${u.b}` : u.a));
    const out = await embed(batch, { pooling: 'mean', normalize: true });
    for (let j = 0; j < batch.length; j++) {
      const v = out.data.subarray(j * DIM, (j + 1) * DIM);
      let max = 0;
      for (const x of v) max = Math.max(max, Math.abs(x));
      const scale = max / 127 || 1;
      scales[i + j] = scale;
      for (let k = 0; k < DIM; k++) ints[(i + j) * DIM + k] = Math.round(v[k] / scale);
    }
    process.stdout.write(`\r  embedded ${Math.min(i + BATCH, units.length)}/${units.length}`);
  }
  process.stdout.write('\n');

  // Sources are repeated a lot (every line of a song), so store each once.
  const sources = [...new Set(units.map((u) => u.src))];
  const srcIndex = new Map(sources.map((s, i) => [s, i]));
  const json = {
    id, name: voice.name, credit: voice.credit, model: MODEL, dim: DIM, count: units.length,
    sources,
    items: units.map((u) => (u.b ? [u.a, u.b, srcIndex.get(u.src)] : [u.a, srcIndex.get(u.src)])),
  };
  await fs.writeFile(path.join(OUT, `${id}.json`), JSON.stringify(json));
  await fs.writeFile(path.join(OUT, `${id}.bin`),
    Buffer.concat([Buffer.from(scales.buffer), Buffer.from(ints.buffer)]));
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(VOICES);
for (const id of ids) if (!VOICES[id]) throw new Error(`unknown voice "${id}" (have: ${Object.keys(VOICES).join(', ')})`);

await fs.mkdir(OUT, { recursive: true });
const embed = await pipeline('feature-extraction', MODEL, { dtype: DTYPE });
for (const id of ids) await buildVoice(id, embed);

// The page reads this to know which voices exist and in what order.
const manifest = [];
for (const id of Object.keys(VOICES)) {
  try {
    const { name, credit, count } = JSON.parse(await fs.readFile(path.join(OUT, `${id}.json`), 'utf8'));
    manifest.push({ id, name, credit, count });
  } catch {}
}
await fs.writeFile(path.join(OUT, 'voices.json'), JSON.stringify({ model: MODEL, dtype: DTYPE, dim: DIM, voices: manifest }, null, 2));
console.log('wrote data/voices.json');
