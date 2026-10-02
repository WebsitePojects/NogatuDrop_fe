import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './influencerCheckout.css';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import InfluencerCheckout from './InfluencerCheckout.jsx';
import NotFound from './NotFound.jsx';
import { INFLUENCER_ROUTE, decideInfluencerRoute } from './influencerRouteDecision.js';

const LOADING = 'loading';

function RouteLoading() {
  return (
    <div className="ck flex items-center justify-center px-4">
      <div className="ck-wrap grid items-center gap-10 lg:grid-cols-2" role="status" aria-label="Loading checkout">
        <div className="aspect-square animate-pulse rounded-[2rem] bg-[var(--ck-line)]" />
        <div className="space-y-4">
          <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--ck-line)]" />
          <div className="h-14 w-3/4 animate-pulse rounded-2xl bg-[var(--ck-line)]" />
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-[var(--ck-line)]" />
          <div className="h-12 w-56 animate-pulse rounded-full bg-[var(--ck-line)]" />
        </div>
      </div>
    </div>
  );
}

function RouteRetry({ onRetry }) {
  return (
    <div className="ck flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="ck-label">Nogatu</p>
        <h1 className="ck-display mt-3 text-4xl">We could not load this page</h1>
        <p className="mt-3 ck-muted">Check your connection and try again.</p>
        <button type="button" onClick={onRetry} className="ck-btn ck-btn-primary mt-6">Try again</button>
      </div>
    </div>
  );
}

/**
 * Resolves `/:influencerSlug` against the API before rendering anything, so a
 * mistyped URL reaches NotFound instead of an empty influencer checkout.
 */
export default function InfluencerRoute() {
  const { influencerSlug } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [resolution, setResolution] = useState({ view: LOADING, influencer: null });

  useEffect(() => {
    let active = true;
    setResolution({ view: LOADING, influencer: null });
    api.get(ORDERS.PUBLIC_INFLUENCER(influencerSlug))
      .then(({ data }) => ({ payload: data.data }))
      .catch((error) => ({ error }))
      .then((outcome) => {
        if (!active) return;
        setResolution({
          view: decideInfluencerRoute(outcome),
          // Use the server's canonical (lower-cased) slug for the order POST.
          influencer: outcome.payload
            ? { slug: outcome.payload.slug || influencerSlug, product: outcome.payload.product }
            : null,
        });
      });
    return () => { active = false; };
  }, [influencerSlug, attempt]);

  if (resolution.view === LOADING) return <RouteLoading />;
  if (resolution.view === INFLUENCER_ROUTE.RETRY) return <RouteRetry onRetry={() => setAttempt((n) => n + 1)} />;
  if (resolution.view === INFLUENCER_ROUTE.NOT_FOUND) return <NotFound />;
  return <InfluencerCheckout influencer={resolution.influencer} />;
}
