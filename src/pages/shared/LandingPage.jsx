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

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.jpg';

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'shop', label: 'Shop' },
  { id: 'story', label: 'Story' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
];

const PRODUCT_CATEGORIES = ['All', 'Coffee', 'Chocolate', 'Wellness'];

const PRODUCTS = [
  {
    id: 'nogatu-mangosteen',
    name: 'Mangosteen Coffee Blend',
    category: 'Coffee',
    image: '/assets/productsCatalog-NohgatuMangosteenCoffee.jpg',
    shortDescription: 'Smooth roast with mangosteen and functional botanicals.',
    price: 399,
    rating: 4.9,
    badge: 'Best Seller',
  },
  {
    id: 'nogatu-classic',
    name: 'Classic Coffee Mix',
    category: 'Coffee',
    image: '/assets/productsCatalog-NogatuCoffeeMix.jpg',
    shortDescription: 'Balanced body and aroma crafted for daily performance.',
    price: 299,
    rating: 4.8,
    badge: 'Popular',
  },
  {
    id: 'nogatu-barley',
    name: 'Pure Barley Drink',
    category: 'Wellness',
    image: '/assets/productsCatalog-NogatuBarleyPureDrink.jpg',
    shortDescription: 'Naturally nourishing barley drink with clean finish.',
    price: 329,
    rating: 4.7,
    badge: 'Wellness',
  },
  {
    id: 'nogatu-choco',
    name: 'Organic Chocolate Mix',
    category: 'Chocolate',
    image: '/assets/productsCatalog-nogatuChocolateDrink.jpg',
    shortDescription: 'Creamy cocoa with low bitterness and rich mouthfeel.',
    price: 349,
    rating: 4.8,
    badge: 'Organic',
  },
  {
    id: 'nogatu-barley-lite',
    name: 'Barley Lite Refill',
    category: 'Wellness',
    image: '/assets/1-product-BarleyDrink.png',
    shortDescription: 'Light-body barley refill for frequent wellness routines.',
    price: 269,
    rating: 4.6,
    badge: 'Refill',
  },
  {
    id: 'nogatu-coffee-premium',
    name: 'Premium Organic Drink Mix',
    category: 'Coffee',
    image: '/assets/2-OrganicDrinkMix.png',
    shortDescription: 'House blend for premium cafes and business bundles.',
    price: 459,
    rating: 4.9,
    badge: 'Enterprise',
  },
];

const METRICS = [
  { value: '120k+', label: 'Monthly Orders' },
  { value: '99.4%', label: 'Fulfillment SLA' },
  { value: '48h', label: 'Metro Delivery' },
  { value: '4.8/5', label: 'Partner Rating' },
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
    detail: 'Dedicated service channels for retail customers and wholesale partners.',
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
    role: 'Retail Partner',
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [cart, setCart] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    payment: 'card',
  });

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
  const shipping = subtotal > 0 ? (subtotal >= 2500 ? 0 : 149) : 0;
  const tax = subtotal * 0.12;
  const total = subtotal + shipping + tax;

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
    document.body.style.overflow = cartOpen || checkoutOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [cartOpen, checkoutOpen]);

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

  const handleCheckoutField = (event) => {
    const { name, value } = event.target;
    setCheckoutForm((prev) => ({ ...prev, [name]: value }));
  };

  const completeCheckout = (event) => {
    event.preventDefault();
    if (!cartItems.length) return;
    setOrderPlaced(true);
    setCart([]);
    setTimeout(() => {
      setCheckoutOpen(false);
      setOrderPlaced(false);
      setCheckoutForm({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        payment: 'card',
      });
    }, 1700);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#1f1208] text-[#f8efe4]">
      <div className="page-noise pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-80 [background:radial-gradient(circle_at_10%_20%,rgba(245,153,55,0.25),transparent_40%),radial-gradient(circle_at_85%_8%,rgba(255,236,206,0.22),transparent_35%),radial-gradient(circle_at_90%_72%,rgba(150,78,24,0.23),transparent_38%)]" />
      <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:42px_42px]" />

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
                  className="text-sm font-medium text-orange-50/80 transition hover:text-orange-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl border border-orange-200/30 bg-[#2f1c10]/70 px-4 py-2 text-sm text-orange-50 transition hover:bg-[#3a2414]"
              >
                Sign In
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="relative inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f7a340] to-[#d97622] px-4 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <FiShoppingBag />
                Cart
                {cartItems.length > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2d1709] px-1 text-xs text-orange-100">
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
                    className="rounded-lg px-3 py-2 text-left text-sm text-orange-100/85 transition hover:bg-white/10"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => navigate('/login')}
                  className="mt-2 rounded-lg border border-orange-200/35 bg-white/10 px-3 py-2 text-sm text-orange-100"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setCartOpen(true);
                  }}
                  className="rounded-lg bg-gradient-to-r from-[#f7a340] to-[#d97622] px-3 py-2 text-sm font-semibold text-white"
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
          <div className="mx-auto grid w-[min(1180px,100%)] items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div ref={setRevealRef(0)} className="reveal-block space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/30 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-orange-200/80">
                <FiShield />
                Scalable Commerce Suite
              </span>
              <h1 className="text-balance text-4xl font-black leading-tight text-white sm:text-5xl xl:text-6xl">
                Premium Wellness Commerce in a
                <span className="bg-gradient-to-r from-[#ffd79e] via-[#ffaf57] to-[#ff8d32] bg-clip-text text-transparent"> Modern Brown Glass Theme</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-orange-50/78 sm:text-lg">
                NogatuDrop is redesigned for enterprise-ready e-commerce: animated storefront, production-grade
                merchandising layout, conversion-focused checkout, and seamless add-to-cart flow.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo('shop')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f7a340] to-[#dd7b27] px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:brightness-110"
                >
                  Shop Products
                  <FiArrowRight />
                </button>
                <button
                  onClick={() => setCartOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-200/35 bg-white/8 px-6 py-3 text-sm font-semibold text-orange-100 transition hover:bg-white/15"
                >
                  View Cart
                  <FiShoppingBag />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-orange-100/20 bg-white/5 p-3 backdrop-blur">
                    <p className="text-xl font-bold text-orange-100">{metric.value}</p>
                    <p className="text-xs uppercase tracking-wide text-orange-200/75">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div ref={setRevealRef(1)} className="reveal-block lg:justify-self-end">
              <div className="hero-shape relative overflow-hidden rounded-[2rem] border border-orange-100/20 bg-gradient-to-br from-[#fff3df]/95 via-[#f4dcc2]/90 to-[#f2c085]/88 p-6 text-[#3d1f0d] shadow-[0_30px_90px_-35px_rgba(0,0,0,0.6)]">
                <div className="pointer-events-none absolute -left-8 top-8 h-32 w-32 rounded-full border-2 border-[#d9771f]/30" />
                <div className="pointer-events-none absolute bottom-6 right-6 h-24 w-24 rotate-12 rounded-[28%] border border-[#a45317]/30" />
                <div className="grid gap-4">
                  <div className="rounded-2xl bg-white/65 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8c5f3f]">Featured Product</p>
                    <h3 className="mt-2 text-2xl font-bold">{selectedProduct.name}</h3>
                    <p className="mt-2 text-sm text-[#6f4f36]">{selectedProduct.shortDescription}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xl font-black">{formatPeso(selectedProduct.price)}</p>
                      <div className="inline-flex items-center gap-1 text-sm text-[#bd6f21]">
                        <FiStar className="fill-current" />
                        {selectedProduct.rating}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {PRODUCTS.slice(0, 3).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`overflow-hidden rounded-xl border p-1 transition ${
                          selectedProduct.id === product.id
                            ? 'border-[#c96f1f] bg-[#ffe9cb]'
                            : 'border-[#d8b085]/70 bg-white/60 hover:bg-white/80'
                        }`}
                      >
                        <img src={product.image} alt={product.name} className="h-20 w-full rounded-lg object-cover" />
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

        <section id="shop" className="relative px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-[min(1180px,100%)]">
            <div ref={setRevealRef(2)} className="reveal-block mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-orange-200/80">Catalog</p>
                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Professional Product Selection</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      activeCategory === category
                        ? 'border-orange-200/80 bg-orange-300/20 text-orange-50'
                        : 'border-orange-100/25 bg-white/5 text-orange-100/80 hover:bg-white/10'
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
                  className="reveal-block card-float overflow-hidden rounded-2xl border border-orange-100/18 bg-white/6 p-4 backdrop-blur-sm"
                >
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={product.image} alt={product.name} className="h-52 w-full object-cover transition duration-500 hover:scale-105" />
                    <span className="absolute right-3 top-3 rounded-full bg-[#2e1a0c]/85 px-3 py-1 text-xs font-semibold text-orange-100">
                      {product.badge}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{product.name}</h3>
                      <span className="inline-flex items-center gap-1 text-sm text-orange-300">
                        <FiStar className="fill-current" />
                        {product.rating}
                      </span>
                    </div>
                    <p className="text-sm text-orange-50/75">{product.shortDescription}</p>
                    <div className="mt-4 flex items-center justify-between">
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

        <section id="story" className="relative px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-[min(1180px,100%)] gap-6 lg:grid-cols-2">
            <div ref={setRevealRef(20)} className="reveal-block rounded-3xl border border-orange-100/18 bg-gradient-to-br from-[#f7ead7]/95 to-[#efcc9d]/90 p-8 text-[#3d200d]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8e5f3c]">Brand Story</p>
              <h3 className="mt-2 text-3xl font-black">From Functional Drinks to Enterprise Commerce</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#6c4a31]">
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
                  <div key={point} className="flex items-start gap-2 text-sm text-[#4f341f]">
                    <FiCheck className="mt-0.5 shrink-0 text-[#b9651e]" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div ref={setRevealRef(21)} className="reveal-block grid gap-4">
              {HIGHLIGHTS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-orange-100/16 bg-[#2c190d]/70 p-5 backdrop-blur"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {item.icon}
                    <h4 className="text-lg font-semibold text-orange-50">{item.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-orange-100/75">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="relative px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-[min(1180px,100%)]">
            <div ref={setRevealRef(22)} className="reveal-block mb-8 text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-200/80">Testimonials</p>
              <h3 className="mt-2 text-3xl font-black text-white sm:text-4xl">Trusted by Partner Brands and Retail Buyers</h3>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <article
                  key={testimonial.name}
                  ref={setRevealRef(23 + index)}
                  className="reveal-block rounded-2xl border border-orange-100/18 bg-white/6 p-6"
                >
                  <p className="text-sm leading-relaxed text-orange-50/80">"{testimonial.quote}"</p>
                  <div className="mt-5 border-t border-orange-100/15 pt-4">
                    <p className="font-semibold text-orange-100">{testimonial.name}</p>
                    <p className="text-xs uppercase tracking-wide text-orange-200/70">{testimonial.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="relative px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <div ref={setRevealRef(30)} className="reveal-block mx-auto w-[min(1180px,100%)] rounded-3xl border border-orange-100/18 bg-gradient-to-r from-[#311c0f]/85 via-[#4a2812]/80 to-[#2c180d]/88 p-8 sm:p-10">
            <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-orange-200/75">Ready to Scale</p>
                <h3 className="mt-2 text-3xl font-black text-orange-50 sm:text-4xl">Launch Your Next High-Converting Product Campaign</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-orange-100/75">
                  Start with our complete catalog, optimize procurement, and check out in minutes using a polished
                  commerce experience tailored for modern businesses.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => scrollTo('shop')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7a340] to-[#de7a26] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Browse Catalog
                  <FiArrowRight />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200/35 bg-white/10 px-5 py-3 text-sm font-semibold text-orange-50 transition hover:bg-white/15"
                >
                  Become a Partner
                  <FiUser />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-orange-100/12 bg-[#1b0f07] px-4 py-8 text-center text-xs text-orange-200/65 sm:px-6 lg:px-8">
        <p>NogatuDrop Enterprise Commerce © {new Date().getFullYear()} All rights reserved.</p>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-[70]">
          <button className="absolute inset-0 bg-black/60" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[min(460px,100%)] border-l border-orange-100/18 bg-[#23150b] p-5 text-orange-50 shadow-2xl">
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
                <article key={item.id} className="rounded-xl border border-orange-100/15 bg-white/5 p-3">
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
                <span>{shipping === 0 ? 'Free' : formatPeso(shipping)}</span>
              </div>
              <div className="flex items-center justify-between text-orange-100/80">
                <span>VAT (12%)</span>
                <span>{formatPeso(tax)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-orange-100/18 pt-2 text-base font-bold text-orange-50">
                <span>Total</span>
                <span>{formatPeso(total)}</span>
              </div>
            </div>

            <button
              disabled={!cartItems.length}
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
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

      {checkoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl border border-orange-100/20 bg-[#24160c] p-6 text-orange-50">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xl font-bold">Checkout</h4>
              <button onClick={() => setCheckoutOpen(false)} className="rounded-lg p-2 transition hover:bg-white/10" aria-label="Close checkout">
                <FiX />
              </button>
            </div>

            {orderPlaced ? (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/15 p-8 text-center">
                <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
                  <FiCheck size={28} />
                </div>
                <p className="text-lg font-bold text-emerald-100">Order placed successfully</p>
                <p className="mt-2 text-sm text-emerald-100/80">Your request is now queued for processing and fulfillment.</p>
              </div>
            ) : (
              <form onSubmit={completeCheckout} className="grid gap-5 md:grid-cols-2">
                <label className="text-sm">
                  Full Name
                  <input
                    name="fullName"
                    value={checkoutForm.fullName}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={checkoutForm.email}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm">
                  Phone
                  <input
                    name="phone"
                    value={checkoutForm.phone}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm">
                  City
                  <input
                    name="city"
                    value={checkoutForm.city}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  Street Address
                  <input
                    name="address"
                    value={checkoutForm.address}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm">
                  ZIP Code
                  <input
                    name="zip"
                    value={checkoutForm.zip}
                    onChange={handleCheckoutField}
                    required
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  />
                </label>
                <label className="text-sm">
                  Payment Method
                  <select
                    name="payment"
                    value={checkoutForm.payment}
                    onChange={handleCheckoutField}
                    className="mt-1 w-full rounded-lg border border-orange-100/25 bg-[#2f1a0d] px-3 py-2 text-sm text-orange-50 outline-none transition focus:border-orange-300/60"
                  >
                    <option value="card">Credit / Debit Card</option>
                    <option value="gcash">GCash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </label>

                <div className="rounded-lg border border-orange-100/20 bg-white/5 p-4 text-sm md:col-span-2">
                  <div className="mb-1 flex justify-between text-orange-100/80">
                    <span>Subtotal</span>
                    <span>{formatPeso(subtotal)}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-orange-100/80">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : formatPeso(shipping)}</span>
                  </div>
                  <div className="flex justify-between border-t border-orange-100/20 pt-2 font-bold text-orange-50">
                    <span>Total Amount</span>
                    <span>{formatPeso(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7a340] to-[#de7a26] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Confirm Checkout
                  <FiCreditCard />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
