import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { HiLightBulb, HiOutlineQuestionMarkCircle, HiX } from 'react-icons/hi';

const SKIP_ALL_KEY = 'ncdms_tutorial_skip_all';
const SEEN_PREFIX = 'ncdms_tutorial_seen_';

const TUTORIALS = [
  {
    key: 'main_orders',
    match: '/main/orders',
    title: 'Orders Workflow',
    intro: 'Approve first, verify payment proof, then generate the delivery magic link.',
    steps: [
      'Open an order and review payment proof.',
      'Use Mark as Paid to verify payment.',
      'Generate Delivery Link after payment is paid.',
    ],
  },
  {
    key: 'main_couriers',
    match: '/main/couriers',
    title: 'Courier Setup',
    intro: 'Add courier details and optional tracking URL template to improve delivery transparency.',
    steps: [
      'Create courier name and code.',
      'Set tracking template with {tracking_number}.',
      'Assign courier while generating delivery links.',
    ],
  },
  {
    key: 'main_inventory',
    match: '/main/inventory',
    title: 'Inventory Management',
    intro: 'Monitor stock, reserved quantities, and adjustments from one place.',
    steps: [
      'Filter by warehouse and product.',
      'Review available vs reserved stock.',
      'Use adjustments for controlled corrections.',
    ],
  },
  {
    key: 'main_generic',
    match: '/main',
    title: 'Main Portal Guide',
    intro: 'Use Main Portal for approvals, finance checks, and operational controls.',
    steps: [
      'Operations: Orders, transfers, purchase orders.',
      'Inventory: stock levels, movements, adjustments.',
      'People and reports: Stockists, users, analytics.',
    ],
  },
  {
    key: 'stockist_orders',
    match: '/stockist/orders',
    title: 'Stockist Orders Guide',
    intro: 'Track order status, upload payment proof, and monitor deadlines.',
    steps: [
      'Open order details to view status timeline.',
      'Upload payment proof for approved orders.',
      'Watch payment deadline before auto-cancel.',
    ],
  },
  {
    key: 'stockist_catalog',
    match: '/stockist/catalog',
    title: 'Catalog Ordering Guide',
    intro: 'Browse products and place orders using your Stockist pricing.',
    steps: [
      'Filter products by category.',
      'Review stock and add items to cart.',
      'Checkout and monitor order updates.',
    ],
  },
  {
    key: 'stockist_generic',
    match: '/stockist',
    title: 'Stockist Portal Guide',
    intro: 'Use this portal to order, monitor inventory, and handle GRN workflows.',
    steps: [
      'Catalog and cart for ordering.',
      'Orders for payment proof and status tracking.',
      'Inventory and GRN for stock accuracy.',
    ],
  },
  {
    key: 'mobile_orders',
    match: '/mobile/orders',
    title: 'Mobile Orders Guide',
    intro: 'Track active and completed orders quickly from mobile.',
    steps: [
      'Switch between Active and History tabs.',
      'Open details for status and item summary.',
      'Follow delivery progress as statuses update.',
    ],
  },
  {
    key: 'mobile_generic',
    match: '/mobile',
    title: 'Mobile Portal Guide',
    intro: 'Use this portal for quick ordering and order monitoring on phone.',
    steps: [
      'Browse products in catalog.',
      'Place and track orders.',
      'Maintain your profile details.',
    ],
  },
];

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

const resolveTutorial = (pathname) => {
  const sorted = [...TUTORIALS].sort((a, b) => b.match.length - a.match.length);
  return sorted.find((t) => pathname.startsWith(t.match)) || null;
};

export default function FloatingTutorial() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [skipAll, setSkipAll] = useState(() => {
    const storage = getStorage();
    return storage ? storage.getItem(SKIP_ALL_KEY) === '1' : false;
  });

  const tutorial = useMemo(() => resolveTutorial(pathname), [pathname]);

  useEffect(() => {
    if (!tutorial) {
      setOpen(false);
      return;
    }

    if (skipAll) {
      setOpen(false);
      return;
    }

    const storage = getStorage();
    if (!storage) return;

    const seenKey = `${SEEN_PREFIX}${tutorial.key}`;
    const seen = storage.getItem(seenKey) === '1';
    if (!seen) {
      storage.setItem(seenKey, '1');
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [tutorial, pathname, skipAll]);

  const skipThisTutorial = () => {
    if (!tutorial) return;
    const storage = getStorage();
    if (storage) {
      storage.setItem(`${SEEN_PREFIX}${tutorial.key}`, '1');
    }
    setOpen(false);
  };

  const skipAllTutorials = () => {
    const storage = getStorage();
    if (storage) {
      storage.setItem(SKIP_ALL_KEY, '1');
    }
    setSkipAll(true);
    setOpen(false);
  };

  const enableTutorials = () => {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(SKIP_ALL_KEY);
    }
    setSkipAll(false);
    if (tutorial) {
      setOpen(true);
    }
  };

  if (!tutorial) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => {
            if (skipAll) {
              enableTutorials();
            } else {
              setOpen((prev) => !prev);
            }
          }}
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-amber-600"
        >
          {skipAll ? <HiOutlineQuestionMarkCircle className="h-4 w-4" /> : <HiLightBulb className="h-4 w-4" />}
          {skipAll ? 'Enable Tutorials' : 'Tutorial'}
        </button>
      </div>

      <div
        className={`fixed bottom-20 right-4 z-40 w-[min(92vw,24rem)] rounded-2xl border border-amber-100 bg-white p-4 shadow-xl transition-all duration-200 ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Quick Tutorial</p>
            <h3 className="text-base font-bold text-gray-900">{tutorial.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close tutorial"
          >
            <HiX className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600">{tutorial.intro}</p>

        <ol className="mb-4 list-decimal space-y-1 pl-4 text-sm text-gray-700">
          {tutorial.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button size="xs" color="warning" onClick={() => setOpen(false)}>Got it</Button>
          <Button size="xs" color="gray" onClick={skipThisTutorial}>Skip this tutorial</Button>
          <Button size="xs" color="light" onClick={skipAllTutorials}>Skip all tutorials</Button>
        </div>
      </div>
    </>
  );
}
