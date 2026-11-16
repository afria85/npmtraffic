import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const directory = path.dirname(fileURLToPath(import.meta.url));
const dest=path.resolve(process.argv[2]);
mkdirSync(dest,{recursive:true});
const files={ "/prototype.html":"text/html", "/prototype.css":"text/css", "/prototype.js":"text/javascript" };
const server=createServer((req,res)=>{
 const name = new URL(req.url,"http://localhost").pathname;
 if(!files[name])return res.writeHead(404).end();
 res.setHeader("Content-Type",files[name]);
 res.end(readFileSync(path.join(directory,name)));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch();
 try {
  const jobs=["ledger","instrument","notebook"].flatMap(design=>["home","package","compare"].flatMap(view=>[[320,720],[390,844],[768,1024],[1440,900]].flatMap(([width,height])=>["light","dark"].map(theme=>({design,view,width,height,theme})))));
  let total=0;
  await Promise.all(Array.from({length:4},async()=>{
   const page=await browser.newPage();
   for(let job;jobs.length&&(job=jobs.shift());){
    const {design,view,width,height,theme}=job;
    await page.setViewportSize({width,height});
    await page.goto(origin+"/prototype.html?"+new URLSearchParams({design,view,theme}));
    await page.locator("h1").waitFor();
    await page.screenshot({path:path.join(dest,`${design}-${view}-${width}-${theme}.png`)});
    total++;
   }
  }));
  console.log(JSON.stringify({screenshots:total}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
