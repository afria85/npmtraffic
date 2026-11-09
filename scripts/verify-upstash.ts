/** Isolated temporary keys only; requires explicitly selected staging credentials. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { rateLimit } from '../lib/rate-limit';

async function verify() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || process.env.UPSTASH_VERIFY_STAGING !== '1') {
    console.log(JSON.stringify({status:'BLOCKED', reason:'Provide staging UPSTASH_REDIS_REST_URL/TOKEN securely and set UPSTASH_VERIFY_STAGING=1. No Redis request made.'}));
    process.exitCode = 2;
    return;
  }
  const parsed = new URL(url);
  assert.equal(parsed.protocol,'https:','Staging Redis must use HTTPS');
  assert.ok(!parsed.username && !parsed.password,'Do not embed credentials in URLs');
  const command = async (args: Array<string | number>) => {
    const res = await fetch(url, {method:'POST',signal:AbortSignal.timeout(5000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});
    if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
    const data = await res.json() as {result?: unknown; error?: string};
    if (data.error) throw new Error('Redis returned a command error');
    return data.result;
  };
  const route = `staging-verification:${crypto.randomUUID()}`;
  const req = new Request('https://staging.invalid');
  let key: string | undefined;
  try {
    const results = await Promise.all(Array.from({length:20},()=>rateLimit(req,route,5,3000)));
    key = results[0].key;
    assert.equal(results.filter(r=>r.allowed).length,5,'Concurrent EVAL must allow exactly five requests');
    assert.equal(Number(await command(['ZCARD',key])),5,'Blocked requests must not grow the set');
    const ttl = Number(await command(['PTTL',key]));
    assert.ok(ttl > 0 && ttl <= 3000,'Limiter must set bounded expiration');
    assert.ok(results.filter(r=>!r.allowed).every(r=>r.retryAfter>0 && r.retryAfter<=3));
    await new Promise(resolve=>setTimeout(resolve,3100));
    assert.equal(Number(await command(['EXISTS',key])),0,'Limiter key must expire');
    assert.equal((await rateLimit(req,route,5,3000)).allowed,true,'Expired window must allow requests again');
    console.log(JSON.stringify({status:'VERIFIED', mode:'LIVE_STAGING_REDIS', concurrentRequests:20,allowed:5,blocked:15,ttlAndRecovery:true}));
  } finally {
    if (key) await command(['DEL',key]);
  }
}
verify().catch(()=>{console.error('Upstash verification failed; inspect staging access and EVAL behavior. No credentials logged.');process.exitCode=1;});
