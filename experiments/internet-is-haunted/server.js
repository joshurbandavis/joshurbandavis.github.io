'use strict';
// Local preview uses the production Worker and schema, with SQLite in place of D1.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
async function start(){
 const directory=path.join(__dirname,'.data');fs.mkdirSync(directory,{recursive:true});
 const sql=new DatabaseSync(path.join(directory,'reliquary.sqlite'));sql.exec(fs.readFileSync(path.join(__dirname,'migrations/0001_reliquary.sql'),'utf8'));
 const db={prepare(query){let values=[];return{bind(...args){values=args;return this},async first(){return sql.prepare(query).get(...values)||null},async all(){return{results:sql.prepare(query).all(...values)}},async run(){return sql.prepare(query).run(...values)}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
 const cache=new Map();global.caches={default:{async match(key){const entry=cache.get(key.url);if(entry&&entry.expires>Date.now())return entry.response.clone();cache.delete(key.url);},async put(key,response){if(cache.size>=200)cache.delete(cache.keys().next().value);const seconds=Number(/max-age=(\d+)/.exec(response.headers.get('Cache-Control'))?.[1]||300);cache.set(key.url,{response,expires:Date.now()+seconds*1000});}}};
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'worker.js'))).toString('base64'))).default;
 const port=Number(process.env.PORT||5173),origin='http://127.0.0.1:'+port;
 http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/')){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413);res.end();return;}}
   const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,...(body?{body}:{})}),{RELIQUARY:db},{waitUntil:p=>p.catch(console.error)});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','reliquary.css','reliquary.js'].includes(name)){res.writeHead(404);res.end('not found');return;}
  let text=fs.readFileSync(path.join(__dirname,name),'utf8');if(name==='index.html')text=text.replace("var WORKER_URL = 'https://internet-is-haunted.joshurbandavis.workers.dev';","var WORKER_URL = ''; ");
  res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store'});res.end(text);
 }catch(error){console.error(error.message);res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:'temporarily_unavailable'}));}}).listen(port,'127.0.0.1',()=>console.log('The Internet Is Haunted — '+origin));
}
start().catch(error=>{console.error(error);process.exitCode=1;});
