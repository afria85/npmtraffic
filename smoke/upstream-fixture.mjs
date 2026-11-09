// Deterministic test-only upstreams. Loaded only by the smoke webServer process.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === 'api.npmjs.org') {
    const match = url.pathname.match(/^\/downloads\/range\/([0-9-]+):([0-9-]+)\/(.+)$/);
    if (!match) return new Response('',{status:404});
    const [,start,end,name]=match;
    const count=(Date.parse(end)-Date.parse(start))/86400000+1;
    return Response.json({start,end,package:decodeURIComponent(name),downloads:Array.from({length:count},(_,i)=>({day:new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),downloads:i*10}))});
  }
  if (url.hostname === 'registry.npmjs.org') return Response.json({name:decodeURIComponent(url.pathname.slice(1)), 'dist-tags':{latest:'1.0.0'},time:{},versions:{}});
  return originalFetch(input,init);
};
