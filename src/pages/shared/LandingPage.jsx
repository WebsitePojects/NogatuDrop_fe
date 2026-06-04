import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiGlobe,
  FiHeart,
  FiLock,
  FiMenu,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiShield,
  FiStar,
  FiTruck,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { NOGATU_PRODUCT_CATALOG } from '@/utils/nogatuCatalog';
import { getPublicOrderPricingTotals } from '@/utils/publicCheckoutPricing';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';
const ABOUT_IMAGE = '/assets/about_nogatu.jpg';
const CERTIFICATIONS_PDF = '/assets/nogatu-certifications.pdf';

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'shop', label: 'Shop' },
  { id: 'story', label: 'Story' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
];

const PRODUCT_CATEGORIES = ['All', 'Coffee', 'Chocolate', 'Wellness', 'Supplements'];
const PRODUCTS = NOGATU_PRODUCT_CATALOG;

const METRICS = [
  { value: '120k+', label: 'Monthly Orders' },
  { value: '99.4%', label: 'Fulfillment SLA' },
  { value: '48h', label: 'Metro Delivery' },
  { value: '4.8/5', label: 'Stockist Rating' },
];

const HIGHLIGHTS = [
  {
    icon: <FiShield className="text-xl text-orange-300" />,
    title: 'Enterprise Safety',
    detail: 'Secure checkout, encrypted transactions, and fraud monitoring by default.',
  },
  {
    icon: <FiTruck className="text-xl text-orange-300" />,
    title: 'Fast Logistics',
    detail: 'Reliable nationwide shipping with warehouse-aware stock availability.',
  },
  {
    icon: <FiClock className="text-xl text-orange-300" />,
    title: '24/7 Support',
    detail: 'Dedicated service channels for retail customers and wholesale stockists.',
  },
  {
    icon: <FiGlobe className="text-xl text-orange-300" />,
    title: 'Omnichannel Ready',
    detail: 'Designed for marketplace, social commerce, and direct website checkout.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Carmela T.',
    role: 'Restaurant Owner',
    quote:
      'NogatuDrop made our beverage procurement consistent and fast. The quality and service are excellent.',
  },
  {
    name: 'Jiro M.',
    role: 'Corporate Buyer',
    quote:
      'The storefront is easy to use, checkout is smooth, and delivery updates are very reliable for our branches.',
  },
  {
    name: 'Elaine R.',
    role: 'Retail Stockist',
    quote:
      'Our repeat orders improved after switching to Nogatu products. Customers love the taste and branding.',
  },
];

const formatPeso = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value);

const LandingPage = () => {
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [cart, setCart] = useState([]);

  const revealRefs = useRef([]);

  const selectedProduct = useMemo(
    () => PRODUCTS.find((product) => product.id === selectedProductId) || PRODUCTS[0],
    [selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return PRODUCTS;
    return PRODUCTS.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  const cartItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = PRODUCTS.find((entry) => entry.id === item.id);
        if (!product) return null;
        return {
          ...product,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        };
      })
      .filter(Boolean);
  }, [cart]);

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.lineTotal, 0), [cartItems]);
  const pricingTotals = useMemo(() => getPublicOrderPricingTotals(subtotal), [subtotal]);
  const shipping = pricingTotals.shippingFee;
  const total = pricingTotals.totalDue;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    revealRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [cartOpen]);

  const setRevealRef = (index) => (element) => {
    revealRefs.current[index] = element;
  };

  const scrollTo = (id) => {
    setMobileOpen(false);
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  };

  const addToCart = (product, quantity = 1) => {
    setCart((previous) => {
      const found = previous.find((item) => item.id === product.id);
      if (found) {
        return previous.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...previous, { id: product.id, quantity }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (productId, delta) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((previous) => previous.filter((item) => item.id !== productId));
  };


  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden text-[#f8efe4]">
      <div className="page-noise pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-80 [background:radial-gradient(circle_at_8%_16%,rgba(255,205,129,0.26),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(255,174,82,0.18),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(97,51,21,0.32),transparent_40%)]" />
      <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(rgba(255,199,129,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,199,129,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 w-[min(1180px,calc(100%-1.5rem))]">
          <div className="glass-nav relative flex h-16 items-center justify-between rounded-2xl border border-orange-100/25 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src={BRAND_LOGO}
                alt="NogatuDrop"
                className="h-10 w-10 rounded-full border border-orange-200/40 object-cover"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-orange-200/70">NogatuDrop</p>
                <p className="text-sm font-semibold text-orange-50">Enterprise Storefront</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="nav-link text-sm font-medium"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <button
                onClick={() => navigate('/login')}
                className="nav-ghost-btn rounded-xl px-4 py-2 text-sm"
              >
                Sign In
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="nav-primary-btn relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
              >
                <FiShoppingBag />
                Cart
                {cartItems.length > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2d1709] px-1 text-xs text-orange-100 ring-2 ring-[#f1b86c]/50">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </div>

            <button
              className="text-orange-50 md:hidden"
              onClick={() => setMobileOpen((state) => !state)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>

          {mobileOpen && (
            <div className="glass-nav mt-2 rounded-2xl border border-orange-100/20 p-4 md:hidden">
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="rounded-lg px-3 py-2 text-left text-sm text-orange-100/85 transition hover:bg-[#533118]"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => navigate('/login')}
                  className="nav-ghost-btn mt-2 rounded-lg px-3 py-2 text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setCartOpen(true);
                  }}
                  className="nav-primary-btn rounded-lg px-3 py-2 text-sm font-semibold text-white"
                >
                  Open Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10">
        <section id="home" className="relative overflow-hidden px-4 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-[min(1180px,100%)] flex-col items-center gap-10 py-16 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            <div ref={setRevealRef(0)} className="reveal-block space-y-8">
              <span className="liquid-pill inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] text-orange-200/90">
                <FiShield />
                Philippine Wellness Beverages
              </span>
              <h1 className="font-heading text-balance text-4xl leading-tight text-white sm:text-5xl xl:text-6xl">
                Fuel Your Day with
                <span className="bg-gradient-to-r from-[#ffd79e] via-[#ffaf57] to-[#ff8d32] bg-clip-text text-transparent"> Nogatu Wellness Drinks</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-orange-50/78 sm:text-lg">
                From energizing coffee blends and rich chocolate mixes to nourishing barley drinks Nogatu brings you
                health-focused beverages crafted for everyday wellness, delivered nationwide across the Philippines.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo('shop')}
                  className="btn-amber inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
                >
                  Shop Products
                  <FiArrowRight />
                </button>
                <button
                  onClick={() => setCartOpen(true)}
                  className="btn-liquid inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold text-orange-100"
                >
                  View Cart
                  <FiShoppingBag />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="liquid-stat rounded-xl border p-3">
                    <p className="text-xl font-bold text-orange-200">{metric.value}</p>
                    <p className="text-xs uppercase tracking-wide text-orange-100/75">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div ref={setRevealRef(1)} className="reveal-block lg:justify-self-end">
              <div className="hero-shape relative overflow-hidden rounded-[2rem] border border-orange-100/20 bg-gradient-to-br from-[#fff3df]/95 via-[#f4dcc2]/90 to-[#f2c085]/88 p-6 text-[#3d1f0d] shadow-[0_30px_90px_-35px_rgba(0,0,0,0.6)]">
                <div className="pointer-events-none absolute -left-8 top-8 h-32 w-32 rounded-full border-2 border-[#d9771f]/30" />
                <div className="pointer-events-none absolute bottom-6 right-6 h-24 w-24 rotate-12 rounded-[28%] border border-[#a45317]/30" />
                <div className="grid gap-4">
                  <div className="hero-feature-card rounded-2xl p-4">
                    <div className="featured-product-shell">
                      <div className="featured-copy">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.22em] text-[#8c5f3f]">Featured Product</p>
                          <span className="featured-badge">{selectedProduct.badge}</span>
                        </div>
                        <h3 className="featured-title mt-3 text-2xl font-bold">{selectedProduct.name}</h3>
                        <p className="featured-description mt-2 text-sm text-[#6f4f36]">{selectedProduct.shortDescription}</p>
                        <div className="mt-4 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a27143]">
                              Wellness Price
                            </p>
                            <p className="mt-1 text-2xl font-black">{formatPeso(selectedProduct.price)}</p>
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-full bg-[#fff7eb] px-3 py-1.5 text-sm text-[#bd6f21] shadow-[inset_0_0_0_1px_rgba(189,111,33,0.14)]">
                            <FiStar className="fill-current" />
                            {selectedProduct.rating}
                          </div>
                        </div>
                      </div>
                      <div className="featured-image-frame">
                        <img
                          src={selectedProduct.image}
                          alt={selectedProduct.name}
                          className="featured-image"
                          style={{ '--featured-scale': selectedProduct.featuredScale || 1 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {PRODUCTS.slice(0, 4).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`featured-thumb overflow-hidden rounded-xl border p-1 transition ${
                          selectedProduct.id === product.id
                            ? 'border-[#c96f1f] bg-[#ffe9cb] shadow-[0_8px_20px_rgba(177,94,28,0.18)]'
                            : 'border-[#d8b085]/90 bg-[#fff8ea] hover:bg-[#fff2d8]'
                        }`}
                      >
                        <div className="featured-thumb-frame">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="featured-thumb-image"
                            style={{ '--thumb-scale': product.thumbScale || 1 }}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => addToCart(selectedProduct)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f1b0d] px-4 py-3 text-sm font-semibold text-[#ffe5bf] transition hover:bg-[#3a2413]"
                  >
                    Add Selected to Cart
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="shop" className="relative px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-[#e9a629]">
          <div className="mx-auto w-[min(1180px,100%)]">
            <div ref={setRevealRef(2)} className="reveal-block mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-orange-200/80">Catalog</p>
                <h2 className="font-heading mt-2 text-3xl text-white sm:text-4xl">Nine Signature Wellness Products</h2>
                <p className="mt-3 max-w-2xl text-sm text-orange-50/78">
                  A tighter storefront lineup with updated product visuals, clearer pricing, and a more premium product frame that stays consistent as featured items switch.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      activeCategory === category
                        ? 'border-[#ffecd1] bg-[#4f2a13] text-[#fff7ea] shadow-[0_8px_20px_rgba(237,153,71,0.28)]'
                        : 'border-orange-100/35 bg-[#6b3a1a]/80 text-orange-100 hover:bg-[#834923]'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <article
                  key={product.id}
                  ref={setRevealRef(3 + index)}
                  className="reveal-block card-float liquid-card flex flex-col overflow-hidden rounded-[1.75rem] border p-4"
                >
                  <div className="product-showcase-frame relative overflow-hidden rounded-[1.4rem]">
                    <img src={product.image} alt={product.name} className="product-showcase-image transition duration-500 hover:scale-105" />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        product.badge === 'Best Seller'
                          ? 'bg-rose-900/90 text-rose-100 ring-1 ring-rose-400/50'
                          : product.badge === 'Featured'
                            ? 'bg-amber-900/90 text-amber-100 ring-1 ring-amber-400/50'
                            : product.badge === 'Wellness Pick'
                              ? 'bg-emerald-900/90 text-emerald-100 ring-1 ring-emerald-400/50'
                              : product.badge === 'Glow Care'
                                ? 'bg-lime-900/90 text-lime-100 ring-1 ring-lime-400/50'
                                : 'bg-[#2f1909] text-orange-100 ring-1 ring-orange-500/50'
                      }`}
                    >
                      {product.badge}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-1 flex-col">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200/55">{product.category}</p>
                        <h3 className="mt-1 text-lg font-bold text-white">{product.name}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 text-sm text-orange-300">
                        <FiStar className="fill-current" />
                        {product.rating}
                      </span>
                    </div>
                    <p className="min-h-[3.25rem] text-sm leading-6 text-orange-50/80">{product.shortDescription}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <p className="text-xl font-black text-orange-100">{formatPeso(product.price)}</p>
                      <button
                        onClick={() => addToCart(product)}
                        className="rounded-lg bg-gradient-to-r from-[#f7a340] to-[#de7a26] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="story" className="relative px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-b from-[#e9a629] via-[#cc801b] to-[#7f4f13]">
          <div className="section-pattern story-pattern pointer-events-none mix-blend-overlay opacity-30" />
          <div className="relative z-10 mx-auto grid w-[min(1180px,100%)] gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div ref={setRevealRef(20)} className="reveal-block story-card rounded-3xl border p-8 text-[#542d0a]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e5f3c]">Brand Story</p>
              <h3 className="font-heading mt-2 text-3xl">From Functional Drinks to Enterprise Commerce</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#542d0a]">
                NogatuDrop evolved from a product-first distributor into a full digital commerce platform. This landing
                experience mirrors that growth through strategic merchandising, trust-building signals, and frictionless
                checkout design.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  'Warehouse synchronized stock data',
                  'Order and tracking pipeline integration',
                  'B2B and retail customer journey support',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2 text-sm font-medium text-[#703b0c]">
                    <FiCheck className="mt-0.5 shrink-0 text-[#b9651e]" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div ref={setRevealRef(21)} className="reveal-block grid gap-4">
              <article className="about-visual-card overflow-hidden rounded-[2rem] border p-4">
                <div className="grid items-center gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-orange-200/80">Inside Nogatu</p>
                    <h4 className="font-heading mt-2 text-2xl text-white">Built for repeat buying, quick trust, and clean presentation.</h4>
                    <p className="mt-3 text-sm leading-relaxed text-orange-100/80">
                      The landing page now balances premium warmth with clearer product merchandising, stronger conversion cues, and richer visual rhythm inspired by the references you shared.
                    </p>
                  </div>
                  <div className="about-visual-frame">
                    <img src={ABOUT_IMAGE} alt="Nogatu beverages" className="h-full w-full object-cover" />
                  </div>
                </div>
              </article>
              {HIGHLIGHTS.map((item) => (
                <article
                  key={item.title}
                  className="feature-card rounded-2xl border p-5 bg-[#3c210e]/95 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {item.icon}
                    <h4 className="text-lg font-semibold text-orange-50">{item.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-orange-100/90">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="relative px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-b from-[#7f4f13] via-[#a66a1a] to-[#d69527]">
          <div className="section-pattern reviews-pattern pointer-events-none mix-blend-overlay opacity-30" />
          <div className="relative z-10 mx-auto w-[min(1180px,100%)]">
            <div ref={setRevealRef(22)} className="reveal-block mb-8 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffdfa0]">Testimonials</p>
              <h3 className="font-heading mt-2 text-3xl text-[#ffeec9] drop-shadow-md sm:text-4xl">Trusted by Stockists and Retail Buyers</h3>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <article
                  key={testimonial.name}
                  ref={setRevealRef(23 + index)}
                  className="reveal-block testimonial-card flex flex-col justify-between rounded-2xl border p-6 bg-[#321c0f]/95 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                >
                  <p className="text-sm italic leading-relaxed text-orange-50/90">"{testimonial.quote}"</p>
                  <div className="mt-5 border-t border-orange-100/20 pt-4">
                    <p className="font-bold text-orange-100">{testimonial.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-200/80">{testimonial.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="certifications" className="relative overflow-hidden bg-gradient-to-b from-[#5f3816] via-[#3a2111] to-[#1b1009] px-4 py-16 text-[#f7e6cf] sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,205,141,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,205,141,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(circle_at_top_left,rgba(255,194,108,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(116,62,22,0.22),transparent_34%)]" />
          <div className="relative z-10 mx-auto w-[min(1180px,100%)]">
            <div ref={setRevealRef(29)} className="reveal-block">
              <div className="mx-auto max-w-4xl text-left">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f0bf79]">Certifications</p>
                <h3 className="font-heading mt-2 text-3xl text-[#fff1dc] sm:text-4xl">Review Nogatu certificates directly on the page.</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#efd7bb]/82 sm:text-base">
                  View the uploaded Nogatu CPR and Halal certificate pack without leaving the storefront. The viewer below is intentionally simple and document-first so buyers, Stockists, and internal teams can read the file quickly.
                </p>
              </div>

              <div className="certification-shell mt-8 overflow-hidden rounded-[2rem] border border-orange-100/12 bg-[linear-gradient(140deg,rgba(44,26,14,0.96),rgba(60,34,17,0.96))] p-4 shadow-[0_30px_90px_-44px_rgba(0,0,0,0.72)] sm:p-5">
                <div className="mb-4 flex flex-col gap-3 rounded-[1.6rem] border border-orange-100/10 bg-[linear-gradient(135deg,rgba(255,246,234,0.08),rgba(255,235,210,0.04))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-[#fff0d6]">NOGATU Products CPR and Halal Certificates</h4>
                    <p className="mt-1 text-sm text-[#edcfac]/78">Scroll, zoom, and review the full PDF below.</p>
                  </div>
                  <a
                    href={CERTIFICATIONS_PDF}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#d4a72c] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 sm:self-auto"
                  >
                    Open PDF
                    <FiArrowRight />
                  </a>
                </div>
                <div className="certification-viewer-frame overflow-hidden rounded-[1.5rem] border border-orange-100/12 bg-[#f7ead5] shadow-[inset_0_0_0_1px_rgba(219,193,157,0.26)]">
                  <iframe
                    src={CERTIFICATIONS_PDF}
                    title="Nogatu Certifications PDF"
                    className="certification-viewer"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="relative px-4 pb-20 pt-12 sm:px-6 lg:px-8 bg-gradient-to-b from-[#d69527] via-[#2c180d] to-[#120a05]">
          <div className="section-pattern cta-pattern pointer-events-none mix-blend-overlay opacity-30" />
          <div ref={setRevealRef(30)} className="reveal-block cta-liquid relative z-10 mx-auto w-[min(1180px,100%)] rounded-3xl border p-8 sm:p-10">
            <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-orange-200/75">Ready to Scale</p>
                <h3 className="font-heading mt-2 text-3xl text-orange-50 sm:text-4xl">Launch Your Next High-Converting Product Campaign</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-orange-100/75">
                  Start with our complete catalog, optimize procurement, and check out in minutes using a polished
                  commerce experience tailored for modern businesses.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => scrollTo('shop')}
                  className="btn-amber inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
                >
                  Browse Catalog
                  <FiArrowRight />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-liquid inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold text-orange-50"
                >
                  Stockist Login
                  <FiUser />
                </button>
                <a
                  href="https://nogatualliance.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200/20 bg-white/5 px-5 py-3 text-sm font-semibold text-orange-100 transition hover:bg-white/10"
                >
                  Stockist Application
                  <FiArrowRight />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-orange-100/12 bg-[#220f07] px-4 pb-5 pt-10 text-orange-100 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,190,120,0.16)_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto grid w-[min(1180px,100%)] gap-8 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO} alt="NogatuDrop" className="h-12 w-12 rounded-2xl object-cover" />
              <div>
                <p className="text-lg font-bold text-white">Nogatu Alliance</p>
                <p className="text-xs uppercase tracking-[0.22em] text-orange-300/70">Enterprise Commerce</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-7 text-orange-100/72">
              Empowering people through high-quality health and wellness products with a warmer, more polished buying experience for every Stockist and retail customer.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffbd62]">Quick Links</h4>
            <div className="mt-4 space-y-3 text-sm text-orange-100/78">
              {NAV_LINKS.slice(0, 4).map((link) => (
                <button key={link.id} onClick={() => scrollTo(link.id)} className="block transition hover:text-white">
                  {link.label}
                </button>
              ))}
              <button onClick={() => navigate('/login')} className="block transition hover:text-white">
                Stockist Login
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffbd62]">Our Products</h4>
            <div className="mt-4 space-y-3 text-sm text-orange-100/78">
              {PRODUCTS.slice(0, 8).map((product) => (
                <button key={product.id} onClick={() => setSelectedProductId(product.id)} className="block text-left transition hover:text-white">
                  {product.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffbd62]">Contact Info</h4>
            <div className="mt-4 space-y-4 text-sm leading-7 text-orange-100/78">
              <p>94 Navarro Street, Maligaya Park, Brgy 177, Caloocan City</p>
              <p>+632 0908 888 888</p>
              <p>info@nogatualliance.com</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-8 flex w-[min(1180px,100%)] flex-col gap-3 border-t border-orange-100/10 pt-5 text-xs text-orange-200/58 sm:flex-row sm:items-center sm:justify-between">
          <p>┬⌐ {new Date().getFullYear()} Nogatu Alliance. All rights reserved.</p>
          <p>Mon-Sat: 11AM - 11PM | Sunday: Closed</p>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-[70]">
          <button className="absolute inset-0 bg-black/60" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <aside className="cart-panel-enter absolute right-0 top-0 h-full w-[min(460px,100%)] border-l border-orange-100/18 bg-[#23150b] p-5 text-orange-50 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-bold">Your Cart</h4>
              <button onClick={() => setCartOpen(false)} className="rounded-lg p-2 transition hover:bg-white/10" aria-label="Close cart">
                <FiX />
              </button>
            </div>

            <div className="max-h-[58vh] space-y-3 overflow-auto pr-1 scrollbar-thin">
              {!cartItems.length && (
                <div className="rounded-xl border border-orange-100/15 bg-white/5 p-6 text-center text-sm text-orange-100/70">
                  Your cart is empty. Add products from the catalog.
                </div>
              )}

              {cartItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-orange-100/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-3 shadow-[0_18px_36px_-30px_rgba(0,0,0,0.7)]">
                  <div className="flex gap-3">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-semibold text-orange-50">{item.name}</h5>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs text-orange-200/70 transition hover:text-orange-100"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-orange-200">{formatPeso(item.price)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-orange-100/20 bg-[#2a190e]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="px-2 py-1 text-orange-100/80 transition hover:text-orange-100"
                            aria-label="Decrease quantity"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="px-2 py-1 text-orange-100/80 transition hover:text-orange-100"
                            aria-label="Increase quantity"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold">{formatPeso(item.lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 space-y-2 rounded-xl border border-orange-100/18 bg-white/5 p-4 text-sm">
              <div className="flex items-center justify-between text-orange-100/80">
                <span>Subtotal</span>
                <span>{formatPeso(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-orange-100/80">
                <span>Shipping</span>
                <span>{formatPeso(shipping)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-orange-100/18 pt-2 text-base font-bold text-orange-50">
                <div>
                  <span>Total</span>
                  <p className="text-[11px] font-medium text-orange-200/60">VAT and System Fee Included</p>
                </div>
                <span>{formatPeso(total)}</span>
              </div>
            </div>

            <button
              disabled={!cartItems.length}
              onClick={() => {
                setCartOpen(false);
                navigate('/shop', { state: { cart: cartItems, openCheckout: true } });
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7a340] to-[#de7a26] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Checkout Now
              <FiCreditCard />
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-orange-200/70">
              <FiLock size={12} />
              Secure encrypted checkout session
            </p>
          </aside>
        </div>
      )}


    </div>
  );
};

export default LandingPage;
