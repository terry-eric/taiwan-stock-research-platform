import test from 'node:test';
import assert from 'node:assert/strict';
import { officialJson, runSync } from '../scripts/sync-tpex-to-cloudflare.mjs';
import { isSupportedSecurityCode, securityCodeFromInput } from '../src/security-codes.js';

test('security codes preserve ETF codes without truncating invalid tokens', () => {
  for (const code of ['2330','0050','00878','006208','00679B','00980A']) assert.ok(isSupportedSecurityCode(code));
  for (const code of ['123456','00878BAD','2330x','00679Bjunk',"2330'"]) assert.equal(securityCodeFromInput(code), '');
  assert.equal(securityCodeFromInput('00679b 債券 ETF'), '00679B');
  assert.equal(securityCodeFromInput('00878 國泰永續高股息'), '00878');
});

test('retry includes a terminated response body and is bounded', async () => {
  let calls = 0;
  const waits = [];
  const fetchImpl = async () => ++calls === 1 ? new Response(new ReadableStream({start(controller) {
    controller.error(Object.assign(new Error('terminated'), {cause:{code:'UND_ERR_SOCKET'}}));
  }})) : Response.json([{ok:true}]);
  assert.deepEqual(await officialJson('https://example.test', {fetchImpl,sleep:async ms=>waits.push(ms),log:()=>{}}), [{ok:true}]);
  assert.equal(calls, 2);
  assert.deepEqual(waits,[2000]);
  calls = 0;
  await assert.rejects(officialJson('https://example.test', {fetchImpl:async()=>{ calls++; throw new Error('offline'); },sleep:async()=>{},log:()=>{}}));
  assert.equal(calls,3);
  calls = 0;
  await assert.rejects(officialJson('https://example.test', {fetchImpl:async()=>{calls++;return new Response('',{status:403});},sleep:async()=>{},log:()=>{}}));
  assert.equal(calls,1);
});

const fixture = [{Date:'1150907', SecuritiesCompanyCode:'00679B',CompanyName:'ETF',Close:'30',LatestPrice:'30'}];
test('one failed source does not prevent other imports; completion runs once', async () => {
  const sent=[];
  await assert.rejects(runSync({
    load:async url=>{if(url.includes('daily_close_quotes')) throw new Error('offline');return fixture;},
    send:async(path,body)=>{sent.push({path,body});return {changed:1};}, log:()=>{},
  }), /dailyPrice/);
  assert.equal(sent.length,4);
  assert.equal(sent.filter(x=>x.path.endsWith('/complete')).length,1);
  assert.equal(sent[0].body.rows[0].stock_code,'00679B');
});
test('unchanged imports skip recomputation; uncertain writes recompute without POST retries', async () => {
  let sent=[];
  await runSync({load:async()=>fixture,send:async path=>{sent.push(path);return {changed:0};},log:()=>{}});
  assert.equal(sent.length,4);
  assert.ok(sent.every(path=>!path.endsWith('/complete')));
  sent=[];
  await assert.rejects(runSync({load:async()=>fixture,send:async path=>{sent.push(path);if(sent.length===1)throw new Error('lost response');return {changed:0};},log:()=>{}}));
  assert.equal(sent.length,5);
  assert.ok(sent.at(-1).endsWith('/complete'));
});
