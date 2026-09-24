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
//         npm run build -- --dry poe              (parse only: counts + samples)

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

// Every song Genius has for one artist, via the Hugging Face datasets server's
// filter endpoint over a ~3M-song Genius dump -- no 5 GB download. The server
// is often still (re)building its index and says so; those replies get retried.
const GENIUS = 'https://datasets-server.huggingface.co/filter?dataset=theelderemo/genius-lyrics-cleaned&config=default&split=train';

async function fetchGenius(artist) {
  const name = `genius-${artist.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  const file = path.join(CACHE, name);
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
  console.log(`  fetching ${artist} from Genius dump`);
  const where = encodeURIComponent(`"artist"='${artist.replace(/'/g, "''")}'`);
  const songs = [];
  for (let offset = 0, total = Infinity; offset < total; offset += 100) {
    for (let attempt = 1; ; attempt++) {
      const j = await fetch(`${GENIUS}&where=${where}&offset=${offset}&length=100`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
      if (j.rows) {
        total = j.num_rows_total;
        songs.push(...j.rows.map(({ row }) => ({ title: row.title, year: row.year, lyrics: row.lyrics })));
        break;
      }
      if (attempt === 30) throw new Error(`${artist}: ${j.error}`);
      process.stdout.write(`\r  waiting on the datasets server (${attempt})… `);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  if (!songs.length) throw new Error(`no songs found for "${artist}"`);
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(file, JSON.stringify(songs));
  return songs;
}

// Alternate takes of a song already in the list; their lines dedupe away
// anyway, but they'd also add stray variant lines and misleading credits.
const VARIANT = /\b(demo|remix|mix|live|voice memo|version|session|spotify|deezer|recorded at|acoustic|instrumental|a ?cappella|edit|reprise|translation|tracklist|liner notes|interview|skit|annotated|script|commentary|tour of \d+|snippet|music video|performance|speech|dialogue|tribute letter)\b/i;

// Unit list for a Genius artist: consecutive line pairs within each section
// ([Verse], [Chorus], ...), minus alternate takes, any covers named in skip,
// and sections Genius credits to someone else ("[Verse 2: Jay Rock]") --
// a guest verse isn't this voice talking. `singers` are the names that count
// as the artist in those credits; `since` drops songs before that year and
// `exclude` drops titles matching a pattern.
async function geniusUnits(artist, { skip = [], singers = [artist], since = 0, exclude = null } = {}) {
  const skipSet = new Set(skip.map((t) => t.toLowerCase()));
  const isArtist = (credit) => singers.some((s) => credit.toLowerCase().includes(s.toLowerCase()));
  const out = [];
  for (const song of await fetchGenius(artist)) {
    const title = song.title.replace(/​/g, '').trim();
    if (VARIANT.test(title) || skipSet.has(title.toLowerCase())) continue;
    if ((song.year || 0) < since || exclude?.test(title)) continue;
    const src = song.year ? `${title} · ${song.year}` : title;
    let mine = true, lines = [];
    const flush = () => { if (mine) out.push(...pairs(lines, src)); lines = []; };
    for (const raw of song.lyrics.split('\n')) {
      const tag = raw.trim().match(/^\[([^\]]*)\]$/);
      if (tag) {
        flush();
        const credit = tag[1].split(':')[1];
        mine = !credit || isArtist(credit);
      } else if (!raw.trim()) {
        flush();
      } else {
        const l = clean(raw);
        if (!/^\(.*\)$/.test(l)) lines.push(l);
      }
    }
    flush();
  }
  return out;
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

  bridgers: {
    name: 'Phoebe Bridgers',
    credit: 'lyrics via the Genius dump at huggingface.co/datasets/theelderemo/genius-lyrics-cleaned',
    units: () => geniusUnits('Phoebe Bridgers', {
      singers: ['Phoebe'],
      skip: ['That Funny Feeling', 'If We Make It Through December', '7 OClock News / Silent Night',
        'Georgia Lee', 'Nothing Else Matters', 'Have Yourself a Merry Little Christmas', 'Christmas Song',
        'Fake Plastic Trees', 'Teenage Dirtbag', 'Im On Fire', 'The House That Heaven Built'],
    }),
  },

  abba: {
    name: 'ABBA',
    credit: 'lyrics via the Genius dump at huggingface.co/datasets/theelderemo/genius-lyrics-cleaned',
    units: () => geniusUnits('ABBA', {
      singers: ['ABBA', 'Agnetha', 'Frida', 'Anni-Frid', 'Björn', 'Benny'],
      skip: ['Pick a Bale of Cotton / On Top of Old Smoky / Midnight Special Medley'],
    }),
  },

  cohen: {
    name: 'Leonard Cohen',
    credit: 'lyrics via the Genius dump at huggingface.co/datasets/theelderemo/genius-lyrics-cleaned',
    units: () => geniusUnits('Leonard Cohen', {
      singers: ['Leonard', 'Cohen'],
      skip: ['Tennessee Waltz', 'Save The Last Dance For Me', 'Passing Through', 'Be for Real',
        'Go No More A-Roving', 'The Partisan', 'Choices'],
    }),
  },

  kendrick: {
    name: 'Kendrick Lamar',
    credit: 'lyrics via the Genius dump at huggingface.co/datasets/theelderemo/genius-lyrics-cleaned',
    // Section.80 (2011) onward, without radio freestyles: the early mixtapes
    // alone would nearly double this voice's download for the least-known work.
    units: () => geniusUnits('Kendrick Lamar', {
      singers: ['Kendrick', 'K.Dot', 'K-Dot'], since: 2011, exclude: /freestyle/i,
    }),
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

  poe: {
    name: 'Edgar Allan Poe',
    credit: 'The Complete Poetical Works, Project Gutenberg #10031',
    async units() {
      let body = gutenbergBody(await fetchCached('poe.txt', 'https://www.gutenberg.org/cache/epub/10031/pg10031.txt'));
      // From the first section of poems up to the "doubtful" attributions,
      // minus the verse drama Politian (dialogue, not Poe's own voice).
      body = body.slice(body.search(/^ +POEMS OF LATER LIFE$/m), body.search(/^ +DOUBTFUL POEMS\.$/m));
      body = body.slice(0, body.indexOf('SCENES FROM "POLITIAN."')) + body.slice(body.search(/^ +POEMS OF YOUTH$/m));
      const out = [];
      let title = null;
      // A title is an unindented all-caps line; verse is indented; prose
      // (prefaces, notes, the letter to Mr. B) is neither and gets skipped.
      for (const block of body.split(/\n\s*\n/)) {
        const raw = block.split('\n').filter((l) => l.trim());
        if (!raw.length) continue;
        if (raw.length === 1 && /^\s*[A-Z][A-Z0-9 ,.'"()!?\[\]-]+$/.test(raw[0])) {
          const heading = raw[0].trim().replace(/\s*\[\d+\]$/, '').replace(/[.,\s]+$/, '');
          // "III" or "PART II" is a section of the poem above, not a new poem.
          if (/^(PART )?[IVXL]+$/.test(heading)) continue;
          title = heading.replace(/--/g, ' — ').toLowerCase()
            .replace(/(^|[\s"(—-])([a-z])/g, (_, p, c) => p + c.toUpperCase())
            .replace(/(?!^)\b(Of|The|In|A|An|To|And|From|On|Within)\b/g, (w) => w.toLowerCase());
          continue;
        }
        if (!title || /^Notes?\b/.test(title) || !raw.every((l) => /^\s/.test(l) && l.length <= 80)) continue;
        out.push(...pairs(raw.map(clean), title));
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

const dry = process.argv.includes('--dry');
const wanted = process.argv.slice(2).filter((a) => a !== '--dry');
const ids = wanted.length ? wanted : Object.keys(VOICES);
for (const id of ids) if (!VOICES[id]) throw new Error(`unknown voice "${id}" (have: ${Object.keys(VOICES).join(', ')})`);

if (dry) {
  for (const id of ids) {
    const units = dedupe(await VOICES[id].units());
    const sources = new Set(units.map((u) => u.src));
    console.log(`\n${VOICES[id].name}: ${units.length} units from ${sources.size} sources`);
    for (let k = 0; k < 8; k++) {
      const u = units[Math.floor((k + 0.5) * units.length / 8)];
      console.log(`  ${u.b ? `${u.a} / ${u.b}` : u.a}  — ${u.src}`);
    }
  }
  process.exit(0);
}

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
