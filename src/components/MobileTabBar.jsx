import { NavLink, useLocation } from 'react-router-dom';
import { HiOutlineMenu } from 'react-icons/hi';

/**
 * Phone-only bottom bar: the four screens used every day plus Menu (which opens the full sidebar
 * drawer, so nothing is lost). It sits at the end of the layout column with `sticky bottom-0`, so
 * page footers and sticky save bars end above it without padding hacks.
 *
 * @param {{ path: string, label: string, icon: Function }[]} props.items  at most four
 * @param {() => void} props.onMenu  opens the sidebar drawer
 * @param {'brown'|'green'} [props.tone] portal colour for the active pill
 */
export default function MobileTabBar({ items, onMenu, tone = 'brown' }) {
  const { pathname } = useLocation();
  const slots = items.slice(0, 4);
  const activeIndex = slots.findIndex((item) => pathname.startsWith(item.path));
  const pill = tone === 'green'
    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
    : 'bg-amber-100 text-[#3d1800] dark:bg-amber-500/15 dark:text-amber-200';

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 border-t border-[var(--ncdms-hairline,#ece3d6)] bg-white/95 backdrop-blur md:hidden dark:border-white/10 dark:bg-[#1b1511]/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative grid grid-cols-5">
        {activeIndex >= 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-1/5 bg-amber-500 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
        ) : null}
        {slots.map(({ path, label, icon: Icon }, index) => {
          const active = index === activeIndex;
          return (
            <NavLink
              key={path}
              to={path}
              className="flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 active:scale-95 dark:text-[var(--dark-muted)]"
              aria-current={active ? 'page' : undefined}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${active ? pill : ''}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={active ? 'text-gray-900 dark:text-[var(--dark-text)]' : ''}>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onMenu}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 active:scale-95 dark:text-[var(--dark-muted)]"
        >
          <span className="grid h-8 w-14 place-items-center rounded-full">
            <HiOutlineMenu className="h-5 w-5" aria-hidden="true" />
          </span>
          Menu
        </button>
      </div>
    </nav>
  );
}
