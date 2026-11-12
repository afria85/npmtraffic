import { test, expect } from '@playwright/test';
test('home metadata, mobile navigation and comparison landing', async ({page}) => {
  const errors: string[]=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page).toHaveTitle(/npmtraffic/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',/npmtraffic.com\/?$/);
  await page.goto('/compare');
  await expect(page.getByRole('heading',{name:'Saved comparisons'})).toBeVisible();
  expect(errors).toEqual([]);
});
test('404, legacy redirect, robots and sitemap', async ({request}) => {
  expect((await request.get('/$')).status()).toBe(404);
  expect((await request.get('/support',{maxRedirects:0})).status()).toBe(307);
  const sitemap=await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('/support');
  expect(sitemap).not.toContain('<lastmod>');
  expect(await (await request.get('/robots.txt')).text()).toContain('/sitemap.xml');
});
test('OG image renders and invalid package API rejects input', async ({request}) => {
  const og=await request.get('/api/og',{timeout:30000});
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
  expect((await og.body()).subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  expect((await request.get('/api/v1/package/bad%20name/daily.json')).status()).toBe(400);
});

test('fixture-backed package, scoped package, comparison, exports and local saves', async ({page, request}) => {
  for (const name of ['react','@scope/name']) {
    const response=await page.goto(`/p/${encodeURIComponent(name)}?days=7`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Complete observations through', {exact:false})).toBeVisible();
    const csv=await request.get(`/api/v1/package/${encodeURIComponent(name)}/daily.csv?days=7`);
    expect(csv.status()).toBe(200);
    expect((await csv.text()).split('\n')).toContain('date,downloads,ma3,ma7,is_outlier,outlier_score,observation_status,upstream_downloads,registry_downloads');
  }
  await page.goto('/compare?packages=react,vue&days=7');
  await page.getByRole('button',{name:'Save this comparison',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Comparison saved',exact:true})).toBeDisabled();
  await page.goto('/compare');
  await expect(page.getByRole('link',{name:'react vs vue (7d)',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Remove react vs vue (7d)',exact:true}).click();
  await expect(page.getByRole('link',{name:'react vs vue (7d)',exact:true})).toHaveCount(0);
});
