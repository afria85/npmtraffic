import {readFileSync} from "node:fs";

await import(process.env.M7_FIXTURE_MODULE);

const realDate = Date;
const base = Date.parse("2026-11-16T12:00:00Z") - realDate.now();
let extra = 0;
const clock = setInterval(() => {
  if (readFileSync(process.env.M7_STATE, "utf8") !== "stale") return;
  extra = 360000;
  clearInterval(clock);
}, 25);
clock.unref();
globalThis.Date = new Proxy(realDate, {
  construct(target, args, newTarget) {
    return Reflect.construct(target, args.length ? args : [target.now() + base + extra], newTarget);
  },
  apply(target) {return new target(target.now() + base + extra).toString();},
  get(target, prop) {return prop === "now" ? () => target.now() + base + extra : Reflect.get(target, prop);}
});

const upstream = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname === "api.npmjs.org" || url.hostname === "registry.npmjs.org") {
    if (url.pathname.endsWith("/absent-design-fixture")) return Promise.resolve(new Response("", {status:404}));
    if (url.hostname === "api.npmjs.org" && url.pathname.endsWith("/stale-design-fixture")) {
      if (readFileSync(process.env.M7_STATE, "utf8") === "stale") {
        extra = 360000;
        return Promise.resolve(new Response("", {status:502}));
      }
    }
    if (url.hostname === "api.npmjs.org" && url.pathname.endsWith("/error-design-fixture")) {
      return Promise.resolve(new Response("", {status:502}));
    }
  }
  return upstream(input,init);
};
