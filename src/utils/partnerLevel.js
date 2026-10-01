// A "center" is a company fulfillment center (CALOOCAN, TYCOON), not a Stockist.
// Its staff sign in to the Stockist portal but only ever see their own center.
export const CENTER_LEVEL = 'center';

/**
 * True when the signed-in user is company staff at a fulfillment center.
 * `partner_level` is absent on sessions created before the relaunch, so a
 * missing value means "not center staff" and the portal behaves as before.
 */
export function isCenterStaff(user) {
  return user?.partner_level === CENTER_LEVEL;
}

/** Caption shown under the user's name, e.g. "CALOOCAN Center Staff". */
export function centerStaffLabel(user) {
  return [user?.partner_name, 'Center Staff'].filter(Boolean).join(' ');
}
