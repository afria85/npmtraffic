const params = new URLSearchParams(location.search);
const design = params.get("design") ?? "ledger";
const view = params.get("view") ?? "home";
document.body.dataset.design = design;
document.documentElement.dataset.theme = params.get("theme") ?? "light";
document.querySelectorAll("header a").forEach(link => {
  const url = new URL(link.href);
  for (const key of ["design", "theme"]) if (params.has(key)) url.searchParams.set(key, params.get(key));
  link.href = url.href;
});

const compared = view === "compare";
const values = [
  {name:view === "package" ? "@types/node" : "react", total:"166,260,000", points:[34,54,61,null,46,67,80], status:"Missing"},
  {name:"vue", total:"28,650,000", points:[16,26,32,null,24,31,44], status:"Excluded on gap day"},
].slice(0, compared ? 2 : 1);
const heading = view === "home" ? "Explore npm downloads" : compared ? "Compare packages" : "@types/node";
const names = {ledger:"Registry Ledger",instrument:"Signal Instrument",notebook:"Calm Research Notebook"};
const range = '<div class="toolbar" aria-label="Range"><button type="button" aria-pressed="true">7d</button><button type="button">30d</button><button type="button">365d</button><button type="button">Export</button></div>';
const lookup = '<form role="search"><input aria-label="Search npm packages" placeholder="Search by package name"><button type="submit">Open</button></form>';
const plot = '<figure><figcaption>Daily downloads</figcaption><canvas aria-label="Illustrative chart with a gap for one unavailable day" role="img"></canvas><p class="provenance">Nov 9–15 UTC · gap on Nov 12. Fixture only.</p></figure>';
const metrics = '<dl class="metrics">' + values.map(series=>'<div class="metric"><dt>'+series.name+'</dt><dd><b>'+series.total+'</b></dd></div>').join("")+'</dl>';
const rows = '<table class="data"><thead><tr><th scope="col">UTC date</th><th scope="col">Coverage</th></tr></thead><tbody><tr><td>2026-11-11</td><td>Available</td></tr><tr><td>2026-11-12</td><td>Unavailable</td></tr><tr><td>2026-11-13</td><td>Available</td></tr></tbody></table>';
const note = '<aside><h2>Observation notes</h2><p>6 of 7 UTC days included'+ (compared?' across all packages':'') +'. The gap stays visible in the chart and absent from totals.</p><p>Source format · npm Downloads API</p></aside>';
const registry = '<ul class="registry-list"><li>react</li><li>vue</li><li>next</li><li>@types/node</li></ul>';
const h = '<div class="identity"><p class="eyebrow">'+ names[design]+' · design prototype</p><h1>'+heading+'</h1><p class="lead">'+(view==="home" ? "Find a package, compare daily traffic, and trace every exported observation to its UTC date." : "2026-11-09 to 2026-11-15 UTC · 6 of 7 days included")+'</p></div>';

const layouts = {
  ledger: view==="home" ? '<div class="home-deck">'+h+lookup+registry+'</div><div class="layout"><section class="panel"><h2>How observations are recorded</h2>'+rows+'</section>'+note+'</div>' :
    h+range+'<div class="layout"><section class="panel"><h2>Downloads on included days</h2>'+metrics+note+'</section>'+plot+'</div>',
  instrument: view==="home" ? h+lookup+'<div class="layout">'+plot+'<section class="panel"><h2>Search examples</h2>'+registry+note+'</section></div>' :
    h+range+'<div class="layout">'+plot+'<section class="panel"><h2>Included-day totals</h2>'+metrics+note+'</section></div>',
  notebook: view==="home" ? h+lookup+'<div class="layout"><section class="panel"><h2>Reading a daily observation</h2>'+rows+registry+'</section>'+note+'</div>' :
    h+'<div class="layout"><section class="panel">'+range+plot+rows+'</section><section class="panel">'+note+metrics+'</section></div>',
};
const main = document.querySelector("main");
main.innerHTML = layouts[design]+'<p class="fixture">Illustrative fixture values. Prototype controls demonstrate layout only.</p>';
main.querySelector("form")?.addEventListener("submit",event=>event.preventDefault());

function draw(canvas) {
  if (!canvas) return;
  const box=canvas.getBoundingClientRect(), dpr=devicePixelRatio||1;
  canvas.width=box.width*dpr;canvas.height=box.height*dpr;
  const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
  const style=getComputedStyle(document.body), color=prop=>style.getPropertyValue(prop).trim();
  const width=box.width,height=box.height, plotWidth=width-50;
  ctx.font="11px ui-monospace, monospace";
  [0,25,50,75,100].forEach(value=>{
    const y=height-26-value/100*(height-36);
    ctx.strokeStyle=design==="instrument"?"#668996":color("--line");
    ctx.fillStyle=design==="instrument"?"#d9f4fb":color("--quiet");
    ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(width-10,y);ctx.stroke();
    ctx.fillText(String(value),2,y+4);
  });
  ctx.fillText("Nov 9",32,height-5);ctx.fillText("Nov 15",width-51,height-5);
  for (const [index,series] of values.entries()) {
    ctx.strokeStyle=design==="instrument"?["#8ce7f9","#ffb789"][index]:color(index?"--other":"--accent");
    ctx.lineWidth=2.5;ctx.beginPath();
    let last=false;
    series.points.forEach((v,i)=>{
      if(v===null){last=false;return;}
      const x=32+i/6*plotWidth,y=height-26-v/100*(height-36);
      if(last)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      last=true;
    });
    ctx.stroke();
  }
}
const canvas=main.querySelector("canvas");
draw(canvas);
window.addEventListener("resize",()=>draw(canvas));
