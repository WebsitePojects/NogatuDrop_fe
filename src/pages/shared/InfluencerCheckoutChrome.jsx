import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

/** Header and footer shared by the influencer checkout and its payment step. */
export function CheckoutHeader({ slugLabel }) {
  return (
    <header className="ck-header">
      <div className="ck-wrap flex h-14 items-center justify-between sm:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Nogatu home">
          <img src={BRAND_LOGO} alt="" className="h-9 w-9 shrink-0 rounded-full" />
          <span className="min-w-0 leading-tight">
            <span className="ck-wordmark block text-lg">Nogatu</span>
            <span className="block truncate text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ck-muted">Official store · {slugLabel}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-[length:var(--ck-text-small)]">
          <span className="hidden items-center gap-1.5 ck-muted sm:inline-flex"><FiLock aria-hidden="true" /> Secure checkout</span>
          <Link to="/track" className="ck-btn ck-btn-ghost ck-btn-sm whitespace-nowrap">Track order</Link>
        </nav>
      </div>
    </header>
  );
}

export function CheckoutFooter() {
  return (
    <footer className="ck-footer">
      <div className="ck-wrap flex flex-col gap-2 py-8 text-[length:var(--ck-text-small)] sm:flex-row sm:items-center sm:justify-between">
        <p><span className="ck-wordmark text-lg text-white">Nogatu</span> · Shipped from our fulfillment centers in Caloocan and Pasig.</p>
        <p><Link to="/track">Track an order</Link></p>
      </div>
    </footer>
  );
}
