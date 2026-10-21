// Cloudflare Pages Function (or Worker) for the PayPal checkout + AI insight API.
//   GET  /api/paypal/config          -> { clientId, sandbox } | null
//   POST /api/paypal/order           -> { id }                         (price set server-side)
//   POST /api/paypal/capture?id=     -> { paid, order: 'pp_<id>' }
//   GET  /api/verify?order=pp_<id>   -> { paid }                       (re-checks the order with PayPal)
//   POST /api/insight?f=&order=&lang= -> { text }                      (Workers AI, verified buyers only)
// Secrets: PAYPAL_CLIENT_ID, PAYPAL_SECRET. PAYPAL_ENV=live for real money (sandbox otherwise). Binding: AI (Workers AI).
import { json, type Env } from './shared/http';
import { handlePayPalCapture, handlePayPalOrder, paypalClientId, verifyPayPal } from './shared/paypal';
import { handleInsight, type AiBinding } from './shared/insight';

export type WorkerEnv = Env & { AI?: AiBinding };
const strEnv = (env: Record<string, unknown>) => Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'string')) as Env;

async function orderPaid(order: string, env: Env): Promise<boolean> {
  if (!order.startsWith('pp_')) return false;
  try { return !!((await (await verifyPayPal(order, env)).json()) as { paid?: boolean }).paid; } catch { return false; }
}

export async function handle(req: Request, rawEnv: Record<string, unknown>): Promise<Response> {
  const env = strEnv(rawEnv);
  const route = new URL(req.url).pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  switch (route) {
    case 'paypal/config': return json(paypalClientId(env));
    case 'paypal/order': return req.method === 'POST' ? handlePayPalOrder(env) : json({ error: 'POST only' }, 405);
    case 'paypal/capture': return req.method === 'POST' ? handlePayPalCapture(req, env) : json({ error: 'POST only' }, 405);
    case 'verify': return verifyPayPal(new URL(req.url).searchParams.get('order') ?? '', env);
    case 'insight': return handleInsight(req, rawEnv.AI as AiBinding | undefined, (o) => orderPaid(o, env), !!paypalClientId(env));
    default: return json({ error: 'Not found' }, 404);
  }
}

/** Cloudflare Pages Functions entry (functions/api/[[route]].ts can re-export this). */
export const onRequest = (ctx: { request: Request; env: Record<string, unknown> }) => handle(ctx.request, ctx.env);
/** Cloudflare Workers entry. */
export default { fetch: (req: Request, env: Record<string, unknown>) => handle(req, env) };
