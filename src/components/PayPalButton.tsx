'use client';
// PayPal Smart Buttons for the Deep Report (web only), next to the Lemon Squeezy button.
// Order creation and capture happen server-side (shared/paypal.ts); the price never comes from the browser.
// On success the device stores order id `pp_<id>`, which /api/verify re-checks with PayPal, so the rest of the unlock flow
// (src/lib/pay.ts) is unchanged. Renders nothing until /api/paypal/config says PayPal is configured, and never in the app.
import { useEffect, useRef, useState } from 'react';
import { isNative, track } from './lib';

type Btns = { render: (el: HTMLElement) => Promise<void>; isEligible?: () => boolean };
type PPWin = Window & { paypal?: { Buttons: (o: {
  style?: Record<string, string | number>;
  createOrder: () => Promise<string>;
  onApprove: (d: { orderID: string }) => Promise<void>;
  onError?: (e: unknown) => void; onCancel?: () => void;
}) => Btns } };

let sdk: Promise<void> | null = null;
function loadSdk(clientId: string) {
  if (sdk) return sdk;
  sdk = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    s.async = true; s.onload = () => resolve(); s.onerror = () => { sdk = null; reject(new Error('PayPal SDK failed to load')); };
    document.head.appendChild(s);
  });
  return sdk;
}

export default function PayPalButton({ from, onUnlock, label = 'Or pay with PayPal' }: { from: string; onUnlock: (order: string) => void; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'off' | 'loading' | 'ready' | 'error'>('off');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isNative()) return;
    let live = true;
    (async () => {
      try {
        const cfg = (await (await fetch('/api/paypal/config/')).json()) as { clientId: string } | null;
        if (!cfg?.clientId || !live) return;
        setState('loading');
        await loadSdk(cfg.clientId);
        const pp = (window as PPWin).paypal;
        if (!pp || !box.current || !live) return;
        box.current.innerHTML = '';
        await pp.Buttons({
          style: { layout: 'horizontal', color: 'gold', shape: 'pill', label: 'paypal', height: 44, tagline: 'false' },
          createOrder: async () => {
            track('checkout_open', { from, via: 'paypal' });
            const r = await fetch('/api/paypal/order/', { method: 'POST' });
            const j = (await r.json()) as { id?: string };
            if (!j.id) throw new Error('order');
            return j.id;
          },
          onApprove: async ({ orderID }) => {
            setMsg('');
            const r = await fetch(`/api/paypal/capture/?id=${encodeURIComponent(orderID)}`, { method: 'POST' });
            const j = (await r.json()) as { paid?: boolean; order?: string };
            if (j.paid && j.order) { track('purchase_success', { via: 'paypal' }); onUnlock(j.order); }
            else setMsg('PayPal didn’t confirm the payment. You weren’t charged twice; please try again or contact support.');
          },
          onError: () => setMsg('PayPal had a problem. Please try again.'),
        }).render(box.current);
        if (live) setState('ready');
      } catch {
        if (live) setState('error');
      }
    })();
    return () => { live = false; };
  }, [from, onUnlock]);

  if (state === 'off' || state === 'error') return null;
  return (
    <div className="paypal-box" style={{ marginTop: 14 }}>
      <p className="small muted" style={{ margin: '0 0 8px' }}>{label}</p>
      <div ref={box} style={{ maxWidth: 360, margin: '0 auto', minHeight: 44 }} />
      {msg && <p className="small" role="status" style={{ color: 'var(--warn)' }}>{msg}</p>}
    </div>
  );
}
