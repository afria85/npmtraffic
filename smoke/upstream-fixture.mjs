// Deterministic test-only upstreams. Loaded only by the smoke webServer process.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === 'api.npmjs.org') {
    const match = url.pathname.match(/^\/downloads\/range\/([0-9-]+):([0-9-]+)(?:\/(.+))?$/);
    if (!match) return new Response('',{status:404});
    const [,start,end,name]=match;
    const count=(Date.parse(end)-Date.parse(start))/86400000+1;
    const packageName = name ? decodeURIComponent(name) : undefined;
    const baseline = !name ? 50_000_000_000 : packageName === 'react' ? 40_000_000 : 2_000_000;
    const downloads = Array.from({length:count}, (_, i) => ({
      day: new Date(Date.parse(start) + i * 86_400_000).toISOString().slice(0, 10),
      downloads: packageName === 'integrity-fixture' && i === 0 ? 0
        : packageName === 'integrity-fixture' && i === 3 ? 100_000_000_000 : baseline + i * 10_000,
    })).filter((_, i) => packageName !== 'integrity-fixture' || i !== 2);
    return Response.json({start, end, package: packageName, downloads});
  }
  if (url.hostname === 'registry.npmjs.org') {
    const latest = url.pathname.endsWith('/latest');
    const name = decodeURIComponent(url.pathname.slice(1, latest ? -7 : undefined));
    if (latest) return Response.json({name, repository: {url: 'git+https://github.com/react/react.git', directory: 'packages/react'}});
    const time = name === 'react' ? {
      '1.0.0': '2020-01-01T00:00:00Z',
      '1.1.0+responsive-chart-tooltip-regression': new Date(Date.now() - 86_400_000).toISOString(),
      '1.2.0-canary.1': new Date(Date.now() - 86_400_000).toISOString(),
    } : {};
    return Response.json({name, 'dist-tags':{latest:'1.0.0'}, time, versions:{}});
  }
  return originalFetch(input,init);
};
