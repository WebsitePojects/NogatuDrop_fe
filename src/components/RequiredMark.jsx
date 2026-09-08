// Shared required-field asterisk — keeps the marker visually identical across every
// Main portal form instead of ad-hoc "*" strings scattered per page.
// red-500 measured 3.63:1 on the cream form bg (light) and as low as 4.41:1 on the
// darkest card surface (dark) — both under the 4.5:1 AA floor. red-600/red-400 clear
// ≥4.5:1 across every surface this marker actually sits on (white, cream, portal
// tints, and all three dark card tones) — see Wave 2 contrast audit.
export default function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-600 dark:text-red-400" aria-hidden="true">
      *
    </span>
  );
}
