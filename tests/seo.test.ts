import assert from 'node:assert/strict';
import { test } from 'node:test';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import { buildPackageCanonical } from '../lib/canonical';
test('sitemap excludes redirects and fabricated modification dates', () => {
 const entries=sitemap();
 assert.ok(entries.length > 8);
 assert.ok(entries.every(entry => !entry.url.endsWith('/support') && !entry.lastModified));
 assert.equal(new Set(entries.map(entry=>entry.url)).size,entries.length);
});
test('robots and sitemap agree on canonical origin without preview hostname', (t) => {
 const original=process.env.VERCEL_URL;
 t.after(()=>{ if(original===undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL=original; });
 process.env.VERCEL_URL='preview.vercel.app';
 const result=robots();
 assert.ok(!String(result.sitemap).includes('preview.vercel.app'));
 assert.equal(buildPackageCanonical('https://npmtraffic.com','@scope/name'),'https://npmtraffic.com/p/%40scope%2Fname');
});
