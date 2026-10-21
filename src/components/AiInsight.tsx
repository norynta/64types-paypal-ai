'use client';
// "Personal insight" for unlocked Deep Reports: a short AI-written reading of this person's 29 facet scores
// (POST /api/insight, Cloudflare Workers AI, shared/insight.ts). Generated on request, cached on the device per score string.
import { useEffect, useState } from 'react';
import { encodeDeep, OID, track, type Lang } from './lib';

const KEY = 'sfp.insight';

export default function AiInsight({ p, lang }: { p: Record<string, number>; lang: Lang }) {
  const f = encodeDeep(p);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c?.f === f && c?.lang === lang && c?.text) setText(c.text); } catch { /* ignore */ }
  }, [f, lang]);

  async function generate() {
    setBusy(true); setErr('');
    let order = '';
    try { order = localStorage.getItem(OID) || ''; } catch { /* ignore */ }
    try {
      const r = await fetch(`/api/insight/?f=${f}&lang=${lang}&order=${encodeURIComponent(order)}`, { method: 'POST' });
      const j = (await r.json()) as { text?: string };
      if (j.text) {
        setText(j.text); track('insight_generated');
        try { localStorage.setItem(KEY, JSON.stringify({ f, lang, text: j.text })); } catch { /* ignore */ }
      } else setErr(r.status === 503 ? 'Personal insight isn’t available right now.' : 'Couldn’t write your insight. Please try again.');
    } catch { setErr('Couldn’t reach the server. Please try again.'); }
    setBusy(false);
  }

  return (
    <section className="deep-card" style={{ marginTop: 24 }}>
      <h2 style={{ marginTop: 0 }}>Your personal insight</h2>
      <p className="small muted">An AI reading of how your 29 facet scores combine, with practical suggestions. It describes tendencies, not a diagnosis.</p>
      {text ? (
        <div className="insight" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{text}</div>
      ) : (
        <button className="btn" disabled={busy} onClick={generate}>{busy ? 'Writing your insight…' : 'Write my personal insight'}</button>
      )}
      {err && <p className="small" role="status" style={{ color: 'var(--warn)' }}>{err}</p>}
    </section>
  );
}
