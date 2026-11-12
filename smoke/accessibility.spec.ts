import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const theme of ['light','dark']) {
 test(`representative pages have no serious accessibility violations (${theme})`, async ({page, baseURL}) => {
  test.setTimeout(60_000);
  await page.context().addCookies([{name:'npmtraffic_theme',value:theme,url:baseURL!}]);
  await page.addInitScript(theme=>localStorage.setItem('npmtraffic_theme',theme),theme);
  await page.setViewportSize({width:390,height:844});
  for (const path of ['/','/compare','/p/react?days=7','/compare?packages=react,vue&days=7']) {
   await page.goto(path);
   await page.getByRole('button',{name:'Toggle theme'}).waitFor();
   await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
   if (path.includes('days=7')) {
    const selected = page.getByRole('group', {name:/range selector/i}).getByRole('link', {name:'7d', exact:true});
    await expect(selected).toHaveAttribute('aria-current', 'page');
    await expect(selected).toHaveCSS('transition-property', 'none');
   }
   const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   expect(results.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})), path).toEqual([]);
  }
 });
}
test('keyboard focus is visible in the document',async ({page})=>{
 await page.goto('/');
 await page.keyboard.press('Tab');
 const focused=await page.evaluate(()=>document.activeElement?.tagName);
 expect(focused).not.toBe('BODY');
});

test("the saved theme is applied while parsing the page, before Next.js bundles load", async ({ page, baseURL }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.context().addCookies([{ name: "npmtraffic_theme", value: "light", url: baseURL! }]);
  await page.route("**/_next/static/**", (route) =>
    route.request().resourceType() === "script" ? route.abort() : route.continue());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(results.violations).toEqual([]);
});

test("motion effects respect the reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const style = await page.evaluate(() => {
    const element = document.createElement("div");
    element.className = "animate-spin hover-lift";
    document.body.append(element);
    const css = getComputedStyle(element);
    return { animation: css.animationName, transition: css.transitionProperty };
  });
  expect(style).toEqual({ animation: "none", transition: "none" });
});

test('mobile search traps focus, has a name and restores focus on Escape',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/p/react?days=7');
 const trigger=page.getByRole('button',{name:'Search another package'});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Search packages'});
 await expect(dialog).toBeVisible();
 const close=dialog.getByRole('button',{name:'Close',exact:true});
 await close.focus();
 await page.keyboard.press('Shift+Tab');
 await expect(dialog.locator(':focus')).toHaveCount(1);
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(trigger).toBeFocused();
});
