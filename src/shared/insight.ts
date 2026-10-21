// AI personal insight for the paid Deep Report: a short, plain-language reading of the buyer's 29 facet scores,
// written by Cloudflare Workers AI (binding AI in wrangler.toml; runs on the free daily allowance, no API key).
// Only for verified buyers: the request carries the order id the device stored at checkout, re-checked server-side.
import { json } from './http';
import { FACET_LABEL, FACET_DESC, FACET_ORDER } from './facets';

export type AiBinding = { run(model: string, input: { messages: { role: string; content: string }[]; max_tokens?: number; temperature?: number }): Promise<{ response?: string }> };
export const INSIGHT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const ORDER = FACET_ORDER;

/** Facet percentiles from the Deep Report share string (two digits per facet, in FACET_ORDER), restricted to known facets. */
export function facetsFrom(f: string, order: string[] = ORDER): Record<string, number> | null {
  if (!new RegExp(`^\\d{${order.length * 2}}$`).test(f)) return null;
  const out: Record<string, number> = {};
  order.forEach((k, i) => { if (FACET_LABEL[k]) out[k] = parseInt(f.slice(i * 2, i * 2 + 2), 10); });
  return out;
}

/** The prompt: only the facts (percentiles + what high/low means), strict instructions against diagnosis or flattery. */
export function insightPrompt(p: Record<string, number>, lang = 'en') {
  const lines = Object.entries(p).map(([k, v]) => {
    const [hi, lo] = FACET_DESC[k] ?? ['', ''];
    return `${FACET_LABEL[k]}: ${v}th percentile (${v >= 50 ? hi : lo})`;
  });
  const system = 'You write the "Personal insight" section of a research-based personality report (IPIP-NEO-120, 29 facets, ' +
    'scores are percentiles against a large norm sample). Be specific to THIS profile: point out 3 notable combinations of facets ' +
    'and what they tend to mean in daily life, work and relationships, then give 3 concrete, practical suggestions. ' +
    'Plain, warm, direct language. No diagnosis, no clinical terms, no flattery, no horoscope tone, no claims beyond the scores. ' +
    `About 220 words. Use short paragraphs and a simple "- " list for the suggestions. Write in language code: ${lang}.`;
  return [{ role: 'system', content: system }, { role: 'user', content: `Facet scores:\n${lines.join('\n')}` }];
}

/**
 * POST /api/insight?f=<deep share string>&order=<stored order id>&lang=en -> { text }
 * `isPaid(order)` re-verifies the purchase (Lemon Squeezy or PayPal); when payments are off the report is free and so is this.
 */
export async function handleInsight(request: Request, ai: AiBinding | undefined, isPaid: (order: string) => Promise<boolean>,
  paymentsOn: boolean, order: string[] = ORDER): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!ai) return json({ error: 'AI is not configured (Workers AI binding AI)' }, 503);
  const q = new URL(request.url).searchParams;
  const p = facetsFrom(q.get('f') ?? '', order);
  if (!p) return json({ error: 'Missing or malformed scores' }, 400);
  const lang = /^[a-z]{2}(-[a-z]{2})?$/.test(q.get('lang') ?? '') ? q.get('lang')! : 'en';
  if (paymentsOn && !(await isPaid(q.get('order') ?? ''))) return json({ error: 'Report not unlocked' }, 402);
  try {
    const r = await ai.run(INSIGHT_MODEL, { messages: insightPrompt(p, lang), max_tokens: 600, temperature: 0.6 });
    const text = (r.response ?? '').trim();
    return text ? json({ text }) : json({ error: 'Empty answer' }, 502);
  } catch {
    return json({ error: 'AI unavailable' }, 502);
  }
}
