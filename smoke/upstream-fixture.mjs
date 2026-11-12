// Deterministic test-only upstreams. Loaded only by the smoke webServer process.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === 'api.npmjs.org') {
    const match = url.pathname.match(/^\/downloads\/range\/([0-9-]+):([0-9-]+)\/(.+)$/);
    if (!match) return new Response('',{status:404});
    const [,start,end,name]=match;
    const count=(Date.parse(end)-Date.parse(start))/86400000+1;
    const packageName = decodeURIComponent(name);
    const baseline = packageName === 'react' ? 40_000_000 : 2_000_000;
    const downloads = Array.from({length:count}, (_, i) => ({
      day: new Date(Date.parse(start) + i * 86_400_000).toISOString().slice(0, 10),
      downloads: baseline + i * 10_000,
    }));
    return Response.json({start, end, package: packageName, downloads});
  }
  if (url.hostname === 'registry.npmjs.org') {
    const name = decodeURIComponent(url.pathname.slice(1));
    const time = name === 'react' ? {
      '1.0.0': '2020-01-01T00:00:00Z',
      '1.1.0-canary-responsive-chart-tooltip-regression': new Date(Date.now() - 86_400_000).toISOString(),
    } : {};
    return Response.json({name, 'dist-tags':{latest:'1.0.0'}, time, versions:{}});
  }
  return originalFetch(input,init);
};
