export const INFLUENCER_ROUTE = Object.freeze({
  SHOP: 'shop',
  NOT_FOUND: 'not-found',
  RETRY: 'retry',
});

// The API answers 404 for an unknown/disabled slug and 400 for a slug that is not
// even well-formed ("/typo_here"); both mean "no such page". Anything else
// (network drop, 5xx) says nothing about the slug, so the visitor gets a retry
// instead of a misleading 404.
const NOT_FOUND_STATUSES = new Set([400, 404]);

/**
 * Decide what `/:influencerSlug` renders from the metadata lookup outcome.
 * Pure so the routing rule is testable without a DOM.
 *
 * @param {{ payload?: object, error?: { response?: { status?: number } } }} outcome
 * @returns {'shop' | 'not-found' | 'retry'}
 */
export function decideInfluencerRoute({ payload, error } = {}) {
  if (error) {
    return NOT_FOUND_STATUSES.has(error.response?.status)
      ? INFLUENCER_ROUTE.NOT_FOUND
      : INFLUENCER_ROUTE.RETRY;
  }
  return payload?.product?.id ? INFLUENCER_ROUTE.SHOP : INFLUENCER_ROUTE.NOT_FOUND;
}
