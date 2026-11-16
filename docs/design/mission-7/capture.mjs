import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as wait } from "node:timers/promises";
import { chromium } from "playwright";

const directory = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2]);
const port = Number(process.env.M7_PORT ?? 3110);
const host = "http://127.0.0.1:" + port;
const state = path.join(out, "fixture-state.txt");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(state, "warm");
const env = { ...process.env, M7_STATE: state,
  M7_FIXTURE_MODULE: pathToFileURL(path.resolve("smoke/upstream-fixture.mjs")).href };
delete env.UPSTASH_REDIS_REST_URL;
delete env.UPSTASH_REDIS_REST_TOKEN;
const child = spawn(process.execPath, ["--import", pathToFileURL(path.join(directory, "fixture.mjs")).href,
  "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "ignore" });

const routes = {
  home: "/", "package-7": "/p/react?days=7", "package-30": "/p/react?days=30", "package-365": "/p/react?days=365",
  "compare-30": "/compare?packages=react,vue&days=30", "compare-365": "/compare?packages=react,vue&days=365",
  "compare-five": "/compare?packages=angular,axios,react,svelte,vue&days=30",
  empty: "/compare", missing: "/p/integrity-fixture?days=7", stale: "/p/stale-design-fixture?days=30",
  invalid: "/p/absent-design-fixture?days=7", error: "/p/error-design-fixture?days=7",
};
const sizes = [[320,720],[360,800],[390,844],[430,932],[768,1024],[1024,768],[1280,800],[1440,900]];
const plot = 'main svg[role="img"][aria-label*="download" i]';
const safeName = v => String(v).replace(/[^a-z0-9-]/gi,"-");

async function run(browser, key, width, height, theme, perf, id) {
  const context = await browser.newContext({viewport:{width,height},colorScheme:theme,hasTouch:width<=430});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_vercel/insights/script.js",route=>route.fulfill({contentType:"text/javascript",body:""}));
  await page.addInitScript(() => {
    window.lab = { cls: 0, lcp: null, plot: null, longTaskMs: 0 };
    for (const [type, collect] of [
      ["layout-shift", e=>{ if(!e.hadRecentInput) window.lab.cls += e.value; }],
      ["largest-contentful-paint", e=>{window.lab.lcp = e.startTime;}],
      ["longtask", e=>{window.lab.longTaskMs += e.duration;}],
    ]) {
      if (PerformanceObserver.supportedEntryTypes.includes(type)) {
        new PerformanceObserver(list=>list.getEntries().forEach(collect)).observe({type,buffered:true});
      }
    }
    const obs = new MutationObserver(() => {
      if (document.querySelector('main svg[role="img"][aria-label*="download" i]')) {
        window.lab.plot = performance.now();
        obs.disconnect();
      }
    });
    obs.observe(document, { subtree:true,childList:true,attributes:true });
  });
  const cdp = perf ? await context.newCDPSession(page) : null;
  if (cdp) await cdp.send("Performance.enable");
  try {
    const response = await page.goto(host+routes[key],{waitUntil:"load",timeout:20000});
    if (!["home","empty","invalid","error"].includes(key)) await page.locator(plot).first().waitFor({timeout:15000});
    if (key==="stale") await page.getByText("Cached observations",{exact:false}).first().waitFor({timeout:6000});
    await wait(perf ? 350 : 100);
    const measurements = await page.evaluate(selector => {
      const main = document.querySelector("main");
      const head = main?.querySelector("h1");
      const chart = main?.querySelector(selector);
      const top = el=>el? Math.round(el.getBoundingClientRect().top + window.scrollY):null;
      const labels = chart ? [...chart.querySelectorAll("text")].filter(el=>el.getBoundingClientRect().width>0) : [];
      const chartTop=top(chart), chartHeight=chart?.getBoundingClientRect().height??0;
      const resources=performance.getEntriesByType("resource");
      const scripts=resources.filter(entry=>/\.js(?:\?|$)/.test(entry.name));
      const anchors=main?[...main.querySelectorAll("a[href],button:not([disabled]),input:not([disabled])")].filter(el=>el.getClientRects().length>0 && top(el)<innerHeight):[];
      const metrics={
        headerHeight:Math.round(document.querySelector("header")?.getBoundingClientRect()?.height??0),
        headingTop:top(head),chartTop,chartFirstViewport:chartTop!==null&&chartTop<innerHeight,
        chartViewportPercent:chartTop===null?null:Math.round(Math.min(1,Math.max(0,(innerHeight-chartTop)/chartHeight))*100),
        viewportHeightsToChart:chartTop===null?null:Math.round(Math.max(0,chartTop-innerHeight)/innerHeight*100)/100,
        documentOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),
        visibleInteractive:anchors.length,
        axisLabelMinPx:labels.length?Math.min(...labels.map(el=>parseFloat(getComputedStyle(el).fontSize))):null,
        widestAxisLabelPx:labels.length?Math.round(Math.max(...labels.map(el=>el.getBoundingClientRect().width))):null,
        chartWidth:chart?Math.round(chart.getBoundingClientRect().width):null,
        scriptTransfer:scripts.reduce((sum,entry)=>sum+entry.transferSize,0),
        navTransfer:performance.getEntriesByType("navigation")[0]?.transferSize??null,
      };
      return {...metrics,...window.lab};
    },plot);
    const mainThread = cdp ? Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics
      .filter(m=>["TaskDuration","ScriptDuration","LayoutDuration","RecalcStyleDuration"].includes(m.name))
      .map(m=>[m.name,Math.round(m.value*1000)])) : undefined;
    const tab=[];
    let inspection;
    if (perf && id===1 && width===390 && theme==="light") {
      for (let i=0;i<12;i++) {
        await page.keyboard.press("Tab");
        tab.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,
          label:document.activeElement?.getAttribute("aria-label")||document.activeElement?.textContent?.trim().slice(0,45)})));
      }
      const slider = page.getByRole("slider").first();
      if (await slider.count()) {
        await slider.focus();
        await slider.press("Home");
        const start=await slider.getAttribute("aria-valuetext");
        const startAt=performance.now();
        await slider.press("ArrowRight");
        const next=await slider.getAttribute("aria-valuetext");
        inspection={start,next,inputToChangedAttributeMs:Math.round(performance.now()-startAt)};
      }
    }
    if (!perf) await page.screenshot({path:path.join(out,`${safeName(key)}-${width}-${theme}.png`), animations:"disabled",timeout:16000});
    return {key,width,height,theme,perf,id,status:response.status(),errors,...measurements,mainThread,tab,inspection};
  } finally {await context.close();}
}

(async()=>{
  for(let i=0;i<75;i++){if(await fetch(host+"/status").then(r=>r.ok,()=>false))break;await wait(200);}
  const warmed=await fetch(host+"/api/v1/package/stale-design-fixture/daily?days=30");
  if(!warmed.ok) throw new Error("Stale fixture did not warm");
  fs.writeFileSync(state,"stale");
  await wait(100);
  // Advance the module-local fixture clock, then retry with the cached snapshot.
  await fetch(host+"/api/v1/package/stale-design-fixture/daily?days=30");
  const browser=await chromium.launch();
  try {
    const tasks=Object.keys(routes).flatMap(key=>sizes.flatMap(([w,h])=>["light","dark"].map(theme=>[key,w,h,theme,false,0])));
    let jobs=tasks;
    if(process.env.M7_MODE==="perf") jobs=[];
    if(process.env.M7_MODE==="quick") jobs=tasks.filter(([key,w,,theme])=>["home","package-365","compare-five","missing","stale"].includes(key)&&[320,390,1440].includes(w)&&theme==="light");
    let completed=0;
    const records=[];
    await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
      for(let job;jobs.length&&(job=jobs.shift());){
        try {records.push(await run(browser,...job));}catch(error){records.push({job,error:error.message});}
        if (++completed % 32===0) console.log("Captured",completed);
      }
    }));
    if (process.env.M7_MODE!=="quick") {
      for(let r=1;r<=3;r++) for(const key of ["home","package-365","compare-365"]) {
        for(const [w,h] of [[390,844],[1440,900]]) {
          try {records.push(await run(browser,key,w,h,"light",true,r));}catch(error){records.push({key,width:w,error:error.message});}
        }
      }
    }
    fs.writeFileSync(path.join(out,"measurements.json"),JSON.stringify(records,null,2));
    const failed=records.filter(row=>row.error);
    console.log(JSON.stringify({records:records.length,failed:failed.length,pageErrors:records.reduce((sum,row)=>sum+(row.errors?.length??0),0)}));
    if(failed.length) process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{child.kill();});
