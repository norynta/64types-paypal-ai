// Contract tests: PayPal API and Workers AI are mocked. Run: npm test
import { handle } from '../src/worker';
import { DEEP_PRICE_USD, isPaidDeep } from '../src/shared/paypal';
import { facetsFrom, insightPrompt } from '../src/shared/insight';
import { FACET_ORDER } from '../src/shared/facets';

let fails = 0;
const assert = (c: unknown, m: string) => { if (c) console.log('ok  ', m); else { console.error('FAIL', m); fails++; } };
const call = (path: string, env: Record<string, unknown>, init?: RequestInit) => handle(new Request(`https://demo.pages.dev${path}`, init), env);

const order = (status = 'COMPLETED', value = DEEP_PRICE_USD, custom = 'deep-report') => ({ id: 'ABCDEF1234567890', status,
  purchase_units: [{ custom_id: custom, payments: { captures: [{ status, amount: { value, currency_code: 'USD' } }] } }] });

async function main() {
  assert(isPaidDeep(order()), 'completed order at the right price is paid');
  assert(!isPaidDeep(order('COMPLETED', '0.01')), 'wrong amount is not paid');
  assert(!isPaidDeep(order('COMPLETED', DEEP_PRICE_USD, 'other')), 'other product is not paid');
  assert(!isPaidDeep(order('PENDING')), 'pending is not paid');

  const env = { PAYPAL_CLIENT_ID: 'cid', PAYPAL_SECRET: 'sec' };
  const calls: { url: string; body?: string }[] = [];
  let captureBody: unknown = order();
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    calls.push({ url: String(u), body: init?.body as string | undefined });
    if (String(u).endsWith('/v1/oauth2/token')) return new Response(JSON.stringify({ access_token: 't' }));
    if (String(u).endsWith('/v2/checkout/orders')) return new Response(JSON.stringify({ id: 'ABCDEF1234567890', status: 'CREATED' }));
    if (String(u).endsWith('/capture')) return new Response(JSON.stringify(captureBody));
    if (String(u).includes('/v2/checkout/orders/')) return new Response(JSON.stringify(order()));
    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;

  const cfg = await (await call('/api/paypal/config', env)).json();
  assert(cfg?.clientId === 'cid' && cfg.sandbox === true, 'config exposes client id, sandbox by default');
  assert((await (await call('/api/paypal/config', {})).json()) === null, 'config null when not configured');
  assert((await call('/api/paypal/order', env)).status === 405, 'order needs POST');
  const o = await (await call('/api/paypal/order', env, { method: 'POST' })).json();
  const created = calls.find((c) => c.url.endsWith('/v2/checkout/orders'));
  assert(o.id === 'ABCDEF1234567890' && created?.url.startsWith('https://api-m.sandbox.paypal.com') &&
    JSON.parse(created.body!).purchase_units[0].amount.value === DEEP_PRICE_USD, 'order created in sandbox at the server price');
  const cap = await (await call('/api/paypal/capture?id=ABCDEF1234567890', env, { method: 'POST' })).json();
  assert(cap.paid === true && cap.order === 'pp_ABCDEF1234567890', 'capture -> paid + pp_ order id');
  captureBody = order('COMPLETED', '0.01');
  assert((await (await call('/api/paypal/capture?id=ABCDEF1234567890', env, { method: 'POST' })).json()).paid === false, 'underpaid capture is not paid');
  assert((await call('/api/paypal/capture?id=bad', env, { method: 'POST' })).status === 400, 'malformed id -> 400');
  assert((await (await call('/api/verify?order=pp_ABCDEF1234567890', env)).json()).paid === true, 'verify re-checks with PayPal');
  calls.length = 0; await call('/api/verify?order=pp_ABCDEF1234567890', { ...env, PAYPAL_ENV: 'live' });
  assert(calls.every((c) => c.url.startsWith('https://api-m.paypal.com')), 'PAYPAL_ENV=live uses the live API');

  const f = FACET_ORDER.map((_, i) => String((i * 7) % 100).padStart(2, '0')).join('');
  const fp = facetsFrom(f)!;
  assert(Object.keys(fp).length === FACET_ORDER.length && FACET_ORDER.length === 29, 'decodes all 29 facets');
  assert(facetsFrom('123') === null, 'malformed scores rejected');
  const msgs = insightPrompt(fp, 'ja');
  assert(msgs[0].content.includes('ja') && msgs[1].content.split('\n').length === FACET_ORDER.length + 1, 'prompt has every facet and the language');
  let asked = 0;
  const AI = { run: async () => { asked++; return { response: 'You combine high Imagination with…' }; } };
  assert((await call(`/api/insight?f=${f}&order=pp_ABCDEF1234567890`, { ...env, AI })).status === 405, 'insight is POST only');
  const ok = await (await call(`/api/insight?f=${f}&order=pp_ABCDEF1234567890&lang=en`, { ...env, AI }, { method: 'POST' })).json();
  assert(ok.text?.startsWith('You combine') && asked === 1, 'paid PayPal buyer gets the AI insight');
  assert((await call(`/api/insight?f=${f}&order=`, { ...env, AI }, { method: 'POST' })).status === 402, 'no order -> 402');
  assert((await call(`/api/insight?f=${f}`, env, { method: 'POST' })).status === 503, '503 without the AI binding');

  if (fails) throw new Error(`${fails} failure(s)`);
  console.log('all checks passed');
}
main();
