// Shared required-field asterisk — keeps the marker visually identical across every
// Main portal form instead of ad-hoc "*" strings scattered per page.
export default function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-500" aria-hidden="true">
      *
    </span>
  );
}
