# 64 Types × PayPal × AI

PayPal checkout and an AI personal insight for the **[64 Types](https://64types.app) Deep Report**, a $14.99 research-based personality report (29 facets of the Big Five, public-domain IPIP-NEO-120 items, norms N = 410,376). Entry for the **PayPal AI Hackathon 2026**.

- **Live demo (PayPal sandbox):** https://paypal-ai-insight.64types.pages.dev/deep/
- **Video:** https://youtu.be/LaABQvbYS6I

This repository holds the code built for the hackathon. The rest of the 64 Types site (test items, norms, translations, report pages) is not included.

## How PayPal is used
PayPal **Orders v2 REST API** + **PayPal JS SDK (Smart Buttons)**, with everything that matters decided on the server:

1. The buyer clicks the PayPal button (`src/components/PayPalButton.tsx`). The SDK calls our `POST /api/paypal/order`, which creates a `CAPTURE` order for **USD 14.99**. The price comes from the server (`DEEP_PRICE_USD`), never from the browser.
2. The buyer approves in PayPal's window. The SDK calls `POST /api/paypal/capture?id=…`, and the server captures the order.
3. `isPaidDeep()` accepts the payment only if the order and its capture are `COMPLETED`, `custom_id` is our SKU (`deep-report`) and the captured amount is exactly USD 14.99.
4. The device stores the purchase as `pp_<orderId>`. On every later visit `GET /api/verify?order=pp_…` reads the order back from PayPal, so a forged id unlocks nothing.

Sandbox by default. Set `PAYPAL_ENV=live` (plus live credentials) for real money.

## How AI is used
After purchase, the report shows **"Write my personal insight"** (`src/components/AiInsight.tsx`). `POST /api/insight`:

1. Re-verifies the buyer's PayPal order (HTTP 402 if not paid).
2. Builds a prompt from **only** the 29 facet percentiles and their standard high/low definitions (`insightPrompt()` in `src/shared/insight.ts`).
3. Runs **Cloudflare Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) with strict instructions: name 3 notable facet combinations and give 3 practical suggestions, in the reader's language, with no diagnosis, no flattery and no claims beyond the scores.

Workers AI runs on Cloudflare's free daily allowance, so the insight costs close to nothing per report.

## Layout
```
src/shared/paypal.ts      PayPal Orders v2: token, create, capture, verify (isPaidDeep)
src/shared/insight.ts     AI insight: score decoding, prompt, paywall check, Workers AI call
src/shared/facets.ts      Facet names, definitions, score order (29 facets)
src/worker.ts             API routes (Cloudflare Pages Function / Worker)
src/components/           React: PayPalButton (Smart Buttons), AiInsight
test/api.test.ts          Contract tests with mocked PayPal and AI
```

## Setup
```bash
npm install
npm test            # contract tests (PayPal + AI mocked)
npm run typecheck
```
Deploy on Cloudflare Pages (`functions/api/[[route]].ts` re-exports the API) or as a Worker (`src/worker.ts` default export):
```bash
npx wrangler pages secret put PAYPAL_CLIENT_ID
npx wrangler pages secret put PAYPAL_SECRET
# optional: PAYPAL_ENV=live for production
```
The `[ai]` binding in `wrangler.toml` enables Workers AI; no API key is needed. Get sandbox credentials at developer.paypal.com → Apps & Credentials → Sandbox.

## Other tools
Built with Next.js/React and TypeScript on Cloudflare Pages. Claude (Anthropic) was used as a coding assistant. No other hackathon sponsor tools were used.

## License
MIT. See [LICENSE](LICENSE).
