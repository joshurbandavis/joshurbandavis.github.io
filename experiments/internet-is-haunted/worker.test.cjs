const fs=require('node:fs'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
(async()=>{
 const source=fs.readFileSync(__dirname+'/worker.js','utf8');
 const worker=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {fetchWithTimeout};').toString('base64'));
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(__dirname+'/migrations/0001_reliquary.sql','utf8'));
 const db={prepare(query){let args=[];return {bind(...values){args=values;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return sql.prepare(query).run(...args)}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
 const cache=new Map();global.caches={default:{async match(k){return cache.get(k.url)?.clone()},async put(k,v){cache.set(k.url,v.clone())}}};
 const jobs=[],ctx={waitUntil(p){jobs.push(p)}},env={RELIQUARY:db};let outage=false,requests=0;
 global.fetch=async url=>{requests++;if(outage)return new Response('unavailable',{status:503});if(url.includes('/wayback/available')){const u=new URL(url),first=u.searchParams.get('timestamp').startsWith('1996');return Response.json({archived_snapshots:{closest:{available:true,timestamp:first?'19970102030405':'20050102030405',url:'http://web.archive.org/web/20050102030405/http://example.org/',status:'200'}}});}return new Response('<title>A recovered page</title><p>A small sentence from a forgotten page, long enough to be recovered honestly.</p>',{headers:{'Content-Type':'text/html'}});};
 async function call(path,options={},bindings=env){const res=await worker.default.fetch(new Request('https://worker.test'+path,options),bindings,ctx);return {status:res.status,data:await res.json()};}
 const lookup=await call('/api/memorial?url=example.org');assert.equal(lookup.status,200);assert.equal(lookup.data.archived,true);assert(lookup.data.saveToken);assert.equal(lookup.data.title,'A recovered page');await Promise.all(jobs);
 const post={method:'POST',headers:{Origin:'https://joshurbandavis.com','Content-Type':'application/json'},body:JSON.stringify({token:lookup.data.saveToken})};
 assert.equal((await call('/api/reliquary')).data.entries.length,0,'lookup is not public until explicitly preserved');
 const saved=await call('/api/reliquary',post);assert.equal(saved.status,200);assert.equal(saved.data.entry.id,1);
 assert.equal((await call('/api/reliquary',post)).data.entry.id,1,'retry deduplicates');
 const calls=requests;outage=true;
 assert.equal((await call('/api/reliquary/1')).data.entry.memorial.title,'A recovered page');assert.equal(requests,calls,'saved entries do not contact Wayback');
 assert.equal((await call('/api/memorial?url=https://example.org/#section')).data.relicId,1,'canonical URL reuses saved record');
 assert.equal((await call('/api/reliquary/random?exclude=1')).status,404);
 assert.equal((await call('/api/reliquary',{...post,headers:{Origin:'https://other.example','Content-Type':'application/json'}})).status,403);
 assert.equal((await call('/api/reliquary',{...post,body:JSON.stringify({token:'invented',snapshot:{title:'fake'}})})).status,410);
 assert.equal((await call('/api/memorial?url=javascript:alert(1)')).status,400);
 assert.equal((await call('/api/memorial?url=https://user:password@example.org')).status,400);
 assert.equal((await call('/api/memorial?url=never-seen.example')).status,503,'outage is not absence');
 assert.equal((await call('/api/reliquary',{},{})).status,503);
 assert.equal((await call('/api/reliquary?before=garbage')).status,400);
 for(let i=0;i<24;i++)sql.prepare('INSERT INTO relics(url,snapshot) VALUES(?,?)').run('https://site'+i+'.example/',JSON.stringify(lookup.data));
 const page=await call('/api/reliquary');assert.equal(page.data.entries.length,20);const page2=await call('/api/reliquary?before='+page.data.next);assert.equal(page2.data.entries.length,5);assert.equal(new Set([...page.data.entries,...page2.data.entries].map(e=>e.id)).size,25);
 sql.prepare('UPDATE discoveries SET expires=0').run();assert.equal((await call('/api/reliquary',post)).status,410);
 // A failed Availability service and empty CDX cannot establish that a page never existed.
 global.fetch=async url=>url.includes('/wayback/available')?new Response('bad',{status:503}):Response.json([]);
 assert.equal((await call('/api/memorial?url=uncertain.example')).status,503);
 global.fetch=async (url,options)=>new Response(new ReadableStream({start(controller){options.signal.addEventListener('abort',()=>controller.error(new Error('aborted body')));}}));
 await assert.rejects(worker.fetchWithTimeout('https://archive.org/stalled',{},20),/aborted body/,'timeout includes a stalled response body');
 console.log('PASS: response-body deadline');
 console.log('PASS: real SQLite persistence, opt-in publication, immutable snapshots, retry deduplication, offline reads, pagination, URL validation, expired tokens, origin checks and upstream failure handling');
})().catch(e=>{console.error(e);process.exitCode=1});
