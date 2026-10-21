// PayPal Checkout (Orders v2 REST API) for the Deep Report, alongside Lemon Squeezy.
// Secrets: PAYPAL_CLIENT_ID + PAYPAL_SECRET (Pages project secrets). PAYPAL_ENV = 'live' for real money, anything else = sandbox.
// A PayPal purchase is stored on the device as order id `pp_<PayPal order id>`, so the existing unlock code in src/lib/pay.ts
// treats it like any other order, and /api/verify?order=pp_... re-checks it with PayPal (see verifyPayPal).
import { json, type Env } from './http';
/**
 * Price of the Deep Report in USD. Must equal the price shown on the site.
 * Kept server-side so the browser can never change it.
 */
export const DEEP_PRICE_USD = '14.99';
const SKU = 'deep-report';

export function paypal(env: Env, fetchFn: typeof fetch = (...a) => fetch(...a)) {
  const id = env.PAYPAL_CLIENT_ID || '';
  const secret = env.PAYPAL_SECRET || '';
  const base = env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const on = () => !!(id && secret);

  async function token(): Promise<string> {
    const res = await fetchFn(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`PayPal auth ${res.status}`);
    return ((await res.json()) as { access_token: string }).access_token;
  }
  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetchFn(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`PayPal ${res.status}`);
    return (await res.json()) as T;
  }
  return { on, clientId: id, sandbox: base.includes('sandbox'), api };
}

type PPOrder = {
  id: string; status: string;
  purchase_units?: { custom_id?: string; reference_id?: string; amount?: { value?: string; currency_code?: string };
    payments?: { captures?: { status?: string; amount?: { value?: string; currency_code?: string } }[] } }[];
};

/** A completed PayPal order for the Deep Report at the right price, with a completed capture. */
export function isPaidDeep(o: PPOrder): boolean {
  const u = o.purchase_units?.[0];
  const cap = u?.payments?.captures?.[0];
  return o.status === 'COMPLETED' && u?.custom_id === SKU && cap?.status === 'COMPLETED' &&
    cap.amount?.currency_code === 'USD' && cap.amount?.value === DEEP_PRICE_USD;
}

const ORDER_ID = /^[A-Z0-9]{10,30}$/;

/** POST /api/paypal/order -> { id }: creates a USD order for the Deep Report. The price comes from the server, never the client. */
export async function handlePayPalOrder(env: Env, fetchFn?: typeof fetch): Promise<Response> {
  const p = paypal(env, fetchFn);
  if (!p.on()) return json({ error: 'PayPal is not configured' }, 503);
  try {
    const o = await p.api<PPOrder>('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ reference_id: SKU, custom_id: SKU, description: '64 Types Deep Report',
          amount: { currency_code: 'USD', value: DEEP_PRICE_USD } }],
        payment_source: { paypal: { experience_context: { brand_name: '64 Types', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } } },
      }),
    });
    return json({ id: o.id });
  } catch {
    return json({ error: 'Could not create order' }, 502);
  }
}

/** POST /api/paypal/capture?id=<PayPal order id> -> { paid, order: 'pp_<id>' } after the buyer approves in the PayPal popup. */
export async function handlePayPalCapture(request: Request, env: Env, fetchFn?: typeof fetch): Promise<Response> {
  const p = paypal(env, fetchFn);
  if (!p.on()) return json({ paid: false, error: 'PayPal is not configured' }, 503);
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!ORDER_ID.test(id)) return json({ paid: false, error: 'Missing order id' }, 400);
  try {
    const o = await p.api<PPOrder>(`/v2/checkout/orders/${id}/capture`, { method: 'POST', body: '{}' });
    const paid = isPaidDeep(o);
    return json(paid ? { paid, order: `pp_${id}` } : { paid });
  } catch {
    // Already captured (e.g. the page retried): fall back to reading the order.
    return verifyPayPal(`pp_${id}`, env, fetchFn);
  }
}

/** /api/verify?order=pp_<id> -> { paid } by reading the order back from PayPal. */
export async function verifyPayPal(order: string, env: Env, fetchFn?: typeof fetch): Promise<Response> {
  const p = paypal(env, fetchFn);
  if (!p.on()) return json({ paid: false, error: 'PayPal is not configured' }, 503);
  const id = order.replace(/^pp_/, '');
  if (!ORDER_ID.test(id)) return json({ paid: false, error: 'Missing order id' }, 400);
  try {
    const o = await p.api<PPOrder>(`/v2/checkout/orders/${id}`);
    return json(isPaidDeep(o) ? { paid: true, order } : { paid: false });
  } catch {
    return json({ paid: false }, 404);
  }
}

/** Public client id for the PayPal JS SDK (safe to expose), or '' when PayPal isn't configured. */
export const paypalClientId = (env: Env) => { const p = paypal(env); return p.on() ? { clientId: p.clientId, sandbox: p.sandbox } : null; };
