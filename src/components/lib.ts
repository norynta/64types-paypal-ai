// Small client helpers used by the components (in 64 Types these come from the app's own modules).
import { FACET_ORDER } from '../shared/facets';
/** localStorage key where the unlocked order id (e.g. pp_<PayPal order id>) is kept on the device. */
export const OID = 'sfp.premium.order';
/** True inside a native app wrapper, where web checkout must not be shown (store payment rules). */
export const isNative = () => !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
/** Privacy-friendly analytics hook; a no-op unless the page defines window.__track. */
export function track(name: string, props?: Record<string, string | number | boolean>) {
  try { (window as Window & { __track?: (n: string, p?: unknown) => void }).__track?.(name, props); } catch { /* ignore */ }
}
/** Facet percentiles -> two digits per facet, in FACET_ORDER (the Deep Report score string). */
export const encodeDeep = (p: Record<string, number>) => FACET_ORDER.map((f) => String(p[f]).padStart(2, '0')).join('');
export type Lang = string;
