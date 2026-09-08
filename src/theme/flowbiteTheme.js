// Global flowbite-react custom theme — installed once via <ThemeProvider> in main.jsx
// so every <Button>/<Modal>/etc. across the app inherits it without per-page edits.
//
// WHY THIS FILE EXISTS (button/modal-close text was invisible in both light and dark mode):
//   1. tailwind.config.js's content glob targets `node_modules/flowbite-react/lib/**`, but the
//      installed package (0.12.17) ships its compiled components under `dist/`, not `lib/`. That
//      glob matches zero files, so Tailwind's JIT scanner never sees flowbite-react's own class
//      strings (e.g. "bg-gray-700 dark:bg-gray-600"). Any utility class that isn't ALSO typed out
//      verbatim somewhere under src/** silently produces no CSS rule at all — the class is present
//      in the DOM but has no effect, so the button renders with no background/text color.
//   2. Independent of #1, flowbite-react's stock Button theme has no `failure`/`success`/`warning`
//      color keys at all (only Badge/Alert ship those), and no `outlineColor` for `failure`/`gray`/
//      `light`. This app uses color="gray"/"warning"/"light"/"success"/"failure" on <Button> across
//      every page, so those buttons fell back to zero styling.
// FIX: define full, literal, WCAG-AA-checked class strings for every color this app actually uses,
// directly in this scanned src file — that guarantees the CSS exists regardless of the glob bug,
// and callers keep writing plain semantic props like <Button color="failure"> with no page edits.

const buttonColor = {
  // Bare <Button> (no color prop) and the (unused-but-kept-for-safety) "primary"/"coffee" aliases —
  // brand-brown fill, matches Main portal accent family. 14.22:1 (light) / 10.46:1 (dark) vs white text.
  default: 'text-white bg-coffee-800 border border-transparent enabled:hover:bg-coffee-900 focus:ring-4 focus:ring-coffee-300 dark:bg-coffee-700 dark:enabled:hover:bg-coffee-800 dark:focus:ring-coffee-800',
  primary: 'text-white bg-coffee-800 border border-transparent enabled:hover:bg-coffee-900 focus:ring-4 focus:ring-coffee-300 dark:bg-coffee-700 dark:enabled:hover:bg-coffee-800 dark:focus:ring-coffee-800',
  coffee: 'text-white bg-coffee-800 border border-transparent enabled:hover:bg-coffee-900 focus:ring-4 focus:ring-coffee-300 dark:bg-coffee-700 dark:enabled:hover:bg-coffee-800 dark:focus:ring-coffee-800',

  // Cancel / neutral secondary — bordered "ghost" style so it never disappears against a filled
  // primary button next to it. 14.68:1 (light) / 9.37:1 (dark).
  gray: 'text-gray-800 bg-white border border-gray-300 enabled:hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500 dark:enabled:hover:bg-gray-600 dark:focus:ring-gray-600',
  light: 'text-gray-800 bg-white border border-gray-300 enabled:hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500 dark:enabled:hover:bg-gray-600 dark:focus:ring-gray-600',

  // Destructive (Delete/Reject/Cancel-order). 6.47:1 (light) / 4.83:1 (dark).
  failure: 'text-white bg-red-700 border border-transparent enabled:hover:bg-red-800 focus:ring-4 focus:ring-red-300 dark:bg-red-600 dark:enabled:hover:bg-red-700 dark:focus:ring-red-800',

  // Approve/Verify. 5.02:1, identical shade in both themes (lighter green-600 fails 4.5:1 vs white).
  success: 'text-white bg-green-700 border border-transparent enabled:hover:bg-green-800 focus:ring-4 focus:ring-green-300 dark:bg-green-700 dark:enabled:hover:bg-green-800 dark:focus:ring-green-800',

  // Add/Warn actions. 5.02:1, identical shade in both themes (amber-500/600 fail 4.5:1 vs white).
  warning: 'text-white bg-amber-700 border border-transparent enabled:hover:bg-amber-800 focus:ring-4 focus:ring-amber-300 dark:bg-amber-700 dark:enabled:hover:bg-amber-800 dark:focus:ring-amber-800',

  // Kept for the 4 existing color="purple" call sites. 6.98:1.
  purple: 'text-white bg-purple-700 border border-transparent enabled:hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 dark:bg-purple-700 dark:enabled:hover:bg-purple-800 dark:focus:ring-purple-800',
};

// Bordered "outline" variants (Button `outline` prop) — used for icon-only destructive actions
// (e.g. table-row delete buttons: color="failure" outline). Dark mode uses a solid gray-800 chip
// rather than a transparent background so the text contrast never depends on whatever page surface
// sits behind it.
const buttonOutlineColor = {
  default: 'border border-coffee-800 text-coffee-800 bg-white enabled:hover:bg-coffee-50 focus:ring-4 focus:ring-coffee-300 dark:border-coffee-300 dark:text-coffee-300 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-coffee-800',
  gray: 'border border-gray-400 text-gray-800 bg-white enabled:hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:border-gray-500 dark:text-gray-100 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-gray-600',
  light: 'border border-gray-400 text-gray-800 bg-white enabled:hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:border-gray-500 dark:text-gray-100 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-gray-600',
  failure: 'border border-red-300 text-red-700 bg-white enabled:hover:bg-red-50 focus:ring-4 focus:ring-red-300 dark:border-red-500 dark:text-red-400 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-red-800',
  success: 'border border-green-300 text-green-700 bg-white enabled:hover:bg-green-50 focus:ring-4 focus:ring-green-300 dark:border-green-500 dark:text-green-400 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-green-800',
  warning: 'border border-amber-300 text-amber-700 bg-white enabled:hover:bg-amber-50 focus:ring-4 focus:ring-amber-300 dark:border-amber-500 dark:text-amber-400 dark:bg-gray-800 dark:enabled:hover:bg-gray-700 dark:focus:ring-amber-800',
};

export const flowbiteTheme = {
  theme: {
    // Force Table to always use visible text colors
    table: {
      root: {
        base: 'w-full text-left text-sm text-gray-700',
        shadow: 'absolute left-0 top-0 -z-10 mt-2 h-full w-full rounded-lg bg-white drop-shadow-md dark:bg-black',
        wrapper: 'relative',
      },
      body: {
        base: 'group/body',
        cell: {
          base: 'px-4 py-3 text-gray-700',
        },
      },
      head: {
        base: 'group/head text-xs uppercase text-gray-600',
        cell: {
          base: 'bg-coffee-50 px-4 py-3 text-coffee-700 font-semibold',
        },
      },
      row: {
        base: 'group/row',
        hovered: 'hover:bg-coffee-50/60',
        striped: 'odd:bg-white even:bg-gray-50/40',
      },
    },
    // Button colors — see file header for why every one of these is spelled out literally.
    button: {
      color: buttonColor,
      outlineColor: buttonOutlineColor,
    },
    // Card with coffee border
    card: {
      root: {
        base: 'flex rounded-xl border border-coffee-100 bg-white shadow-card',
        children: 'flex h-full flex-col justify-center gap-4 p-5',
        horizontal: {
          off: 'flex-col',
          on: 'flex-col md:flex-row',
        },
        href: 'hover:bg-coffee-50',
      },
    },
    // Badge colors
    badge: {
      root: {
        base: 'flex h-fit items-center gap-1 font-semibold',
      },
      color: {
        info: 'bg-blue-100 text-blue-800 border border-blue-200',
        success: 'bg-green-100 text-green-800 border border-green-200',
        warning: 'bg-amber-100 text-amber-800 border border-amber-200',
        failure: 'bg-red-100 text-red-800 border border-red-200',
        purple: 'bg-violet-100 text-violet-800 border border-violet-200',
        indigo: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        pink: 'bg-pink-100 text-pink-800 border border-pink-200',
        gray: 'bg-gray-100 text-gray-700 border border-gray-200',
      },
    },
    // Tabs with amber underline
    tabs: {
      tablist: {
        base: 'flex text-center',
        styles: {
          underline: '-mb-px flex-wrap border-b border-gray-200',
        },
        tabitem: {
          base: 'flex items-center justify-center rounded-t-lg p-4 text-sm font-medium first:ml-0 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400',
          styles: {
            underline: {
              base: 'rounded-t-lg border-b-2',
              active: {
                on: 'active rounded-t-lg border-b-2 border-amber-500 text-amber-600',
                off: 'border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-600',
              },
            },
          },
        },
      },
    },
    // TextInput
    textInput: {
      field: {
        input: {
          base: 'block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-white text-gray-900 placeholder:text-gray-400',
          colors: {
            gray: 'bg-white border-gray-300 text-gray-900 focus:border-amber-400 focus:ring-amber-300',
          },
        },
      },
    },
    // Select
    select: {
      field: {
        select: {
          base: 'block w-full border disabled:cursor-not-allowed disabled:opacity-50 bg-white text-gray-900',
          colors: {
            gray: 'bg-white border-gray-300 text-gray-900 focus:border-amber-400 focus:ring-amber-300',
          },
        },
      },
    },
    // Modal
    modal: {
      root: {
        base: 'fixed inset-x-0 top-0 z-50 h-screen overflow-y-auto overflow-x-hidden md:inset-0 md:h-full',
        show: {
          on: 'flex bg-gray-500/45 backdrop-blur-sm',
          off: 'hidden',
        },
      },
      content: {
        base: 'relative h-full w-full p-4 md:h-auto',
        // ng-modal-force-light (index.css) now supplies the surface color itself —
        // light in light mode, var(--dark-card) in dark mode — so no bg-white here.
        inner: 'relative flex max-h-[90dvh] flex-col rounded-2xl shadow-modal ng-modal-force-light',
      },
      header: {
        base: 'flex items-start justify-between rounded-t-2xl border-b border-gray-100 dark:border-gray-700 p-5',
        title: 'text-lg font-semibold text-gray-900 dark:text-white',
        // ng-modal-force-light's dark surface is var(--dark-card) (#271c18 by default) —
        // gray-400/gray-100 give the close icon a readable resting + hover state on it.
        close: {
          base: 'ms-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600',
          icon: 'h-5 w-5',
        },
      },
      body: {
        base: 'flex-1 overflow-auto p-5',
        popup: 'pt-0',
      },
      footer: {
        base: 'flex items-center space-x-3 rounded-b-2xl border-t border-gray-100 p-5',
        popup: 'justify-center',
      },
    },
    // Pagination
    pagination: {
      pages: {
        selector: {
          active: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-300',
        },
      },
    },
    // Toast
    toast: {
      root: {
        base: 'flex w-full max-w-xs items-center rounded-xl bg-white p-4 text-gray-500 shadow-xl border border-gray-100',
      },
    },
  },
};

export default flowbiteTheme;
