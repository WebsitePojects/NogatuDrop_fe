import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaBars,
  FaTimes,
  FaLeaf,
  FaFlask,
  FaBullseye,
  FaEye,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
} from 'react-icons/fa';

/* ─── Static Data ─────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Products', href: '#products' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const BRAND_LOGO = '/assets/nogatu-logo.jpg';
const HERO_BG = '/assets/Landing_Page.png';
const ABOUT_IMAGE = '/assets/about_nogatu.jpg';

const PRODUCTS = [
  {
    id: 1,
    name: 'Mangosteen Coffee',
    description: 'Rich blend of mangosteen extract and premium Arabica coffee.',
    tag: 'Best Seller',
    image: '/assets/productsCatalog-NohgatuMangosteenCoffee.jpg',
  },
  {
    id: 2,
    name: 'Classic Coffee Mix',
    description: 'Delicious and smooth instant coffee mix for everyday enjoyment.',
    tag: 'Popular',
    image: '/assets/productsCatalog-NogatuCoffeeMix.jpg',
  },
  {
    id: 3,
    name: 'Barley Drink',
    description: 'Naturally nutritious pure barley drink rich in essential nutrients.',
    tag: 'Healthy',
    image: '/assets/productsCatalog-NogatuBarleyPureDrink.jpg',
  },
  {
    id: 4,
    name: 'Organic Drink Mix',
    description: 'All-natural organic blend sourced from carefully selected ingredients.',
    tag: 'Organic',
    image: '/assets/productsCatalog-nogatuChocolateDrink.jpg',
  },
];

const TRUST_BADGES = [
  {
    icon: <FaBullseye className="text-3xl text-[#FF8C00]" />,
    title: 'MISSION',
    desc: 'To provide high-quality, naturally sourced health drinks while maintaining accessible prices for every Filipino household.',
  },
  {
    icon: <FaEye className="text-3xl text-[#FF8C00]" />,
    title: 'VISION',
    desc: 'To become a trusted household name across the Philippines, promoting wellness through natural ingredients.',
  },
  {
    icon: <FaLeaf className="text-3xl text-[#FF8C00]" />,
    title: 'QUALITY',
    desc: 'Every product undergoes strict quality control to ensure you receive only the finest health drinks available.',
  },
  {
    icon: <FaFlask className="text-3xl text-[#FF8C00]" />,
    title: 'INGREDIENTS',
    desc: 'We use carefully selected natural ingredients, free from harmful additives, preserving authenticity and health benefits.',
  },
];

const SOCIAL_LINKS = [
  { icon: <FaFacebook className="text-2xl" />, href: '#', label: 'Facebook', color: 'hover:text-blue-400' },
  { icon: <FaInstagram className="text-2xl" />, href: '#', label: 'Instagram', color: 'hover:text-pink-400' },
  { icon: <FaTwitter className="text-2xl" />, href: '#', label: 'Twitter / X', color: 'hover:text-sky-400' },
  { icon: <FaLinkedin className="text-2xl" />, href: '#', label: 'LinkedIn', color: 'hover:text-blue-500' },
];

const FOOTER_LINKS = ['Home', 'About Us', 'Contact', 'Privacy Policy'];

/* ─── Sub-components ──────────────────────────────────────────────────────── */

const ProductCard = ({ product }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
    {/* Card image area */}
    <div className="relative h-44 flex items-center justify-center overflow-hidden bg-[#F4F4F4]">
      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      <span className="absolute top-3 right-3 bg-[#FF8C00] text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
        {product.tag}
      </span>
    </div>

    {/* Card body */}
    <div className="p-5 flex flex-col flex-1">
      <h3 className="text-gray-900 font-bold text-lg mb-1.5">{product.name}</h3>
      <p className="text-gray-500 text-sm leading-relaxed flex-1">{product.description}</p>
      <button className="mt-4 w-full py-2 bg-[#FF8C00] hover:bg-[#E07B00] text-white text-sm font-semibold rounded-lg transition-colors">
        Learn More
      </button>
    </div>
  </div>
);

const TrustBadge = ({ badge }) => (
  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-colors">
    <div className="flex justify-center mb-3">{badge.icon}</div>
    <h4 className="text-white font-black text-sm tracking-widest mb-2">{badge.title}</h4>
    <p className="text-white/75 text-xs leading-relaxed">{badge.desc}</p>
  </div>
);

/* ─── Main Component ──────────────────────────────────────────────────────── */

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 8) {
        setNavVisible(true);
      } else if (currentY > lastScrollY.current + 8) {
        setNavVisible(false);
      } else if (currentY < lastScrollY.current - 8) {
        setNavVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href) => {
    setMobileMenuOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen font-sans" style={{ scrollBehavior: 'smooth' }}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transform transition-all duration-300 ${
          navVisible || mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-3 mb-0 rounded-2xl border border-[#E7D3A5] bg-[#FFFDF8]/85 px-4 sm:px-5 flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => scrollTo('#home')}
              className="flex items-center gap-2 group"
            >
              <img
                src={BRAND_LOGO}
                alt="Nogatu logo"
                className="h-9 w-9 rounded-full object-cover border border-[#D9B26A]"
              />
              <span className="text-[#7A5B2A] font-semibold text-sm sm:text-base tracking-wide">Nogatu Alliance</span>
            </button>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="text-[#5E513F] hover:text-[#AD7A1A] text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Login button (desktop) */}
            <div className="hidden md:block">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-gradient-to-b from-[#E7C679] to-[#B98A2E] hover:from-[#EBCF89] hover:to-[#C79636] text-white text-sm font-semibold rounded-full transition-colors border border-[#B98A2E] shadow-md shadow-amber-900/25"
              >
                Login
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[#6B5A3E] text-xl p-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFDF8]/95 border-t border-[#E7D3A5]">
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left px-4 py-2.5 text-[#5E513F] hover:text-[#AD7A1A] hover:bg-[#F8F0DE] rounded-lg text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-2 pb-1">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 bg-gradient-to-b from-[#E7C679] to-[#B98A2E] hover:from-[#EBCF89] hover:to-[#C79636] text-white text-sm font-semibold rounded-full transition-colors border border-[#B98A2E]"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 pb-16">
          <div className="min-h-[68vh] flex items-end">
            <div className="pb-6 sm:pb-10">
              <p className="mb-4 text-[#8C734A] text-base sm:text-lg font-medium">
                Wellness You Can Taste, Quality You Can Trust.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-7 sm:px-10 py-2.5 sm:py-3 bg-gradient-to-b from-[#E7C679] to-[#B98A2E] hover:from-[#EBCF89] hover:to-[#C79636] text-white text-[clamp(1.4rem,2.1vw,2.2rem)] font-semibold rounded-full transition-colors border border-[#B98A2E] shadow-lg shadow-amber-900/25 leading-none"
              >
                Register Now
              </button>
              <div className="mt-5 flex items-center gap-2 text-[#7C6642]">
                <span className="text-[clamp(1.25rem,1.9vw,2rem)] font-medium leading-none">FDA Approved Products</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Products Section ─────────────────────────────────────────────── */}
      <section id="products" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section heading */}
          <div className="text-center mb-14">
            <span className="inline-block bg-orange-100 text-[#FF8C00] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Our Range
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
              Our <span className="text-[#FF8C00]">Products</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Discover our lineup of premium health drinks crafted from the finest natural ingredients.
            </p>
            <div className="mt-4 w-16 h-1 bg-[#FF8C00] rounded-full mx-auto" />
          </div>

          {/* Product grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4 text-sm">Want to carry our products? Join as a partner.</p>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 border-2 border-[#FF8C00] text-[#FF8C00] hover:bg-[#FF8C00] hover:text-white font-bold rounded-xl transition-all"
            >
              Become a Partner
            </button>
          </div>
        </div>
      </section>

      {/* ── About Section ────────────────────────────────────────────────── */}
      <section
        id="about"
        className="py-20 px-4 sm:px-6 lg:px-8"
        style={{
          background: 'linear-gradient(135deg, #4A1C00 0%, #6B2D0E 50%, #3A1000 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section heading */}
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FF8C00]/20 border border-[#FF8C00]/40 text-[#FF8C00] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
              Who We Are
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              About <span className="text-[#FF8C00]">Nogatu</span>
            </h2>
            <div className="mt-2 w-16 h-1 bg-[#FF8C00] rounded-full mx-auto" />
          </div>

          <div className="grid lg:grid-cols-2 gap-14 items-center mb-16">
            {/* Left — branded about image */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden h-80 shadow-2xl border border-white/10">
                <img src={ABOUT_IMAGE} alt="About Nogatu" className="w-full h-full object-cover" />
              </div>
              {/* Accent badge */}
              <div className="absolute -bottom-5 -right-5 bg-[#FF8C00] rounded-2xl px-6 py-3 shadow-xl">
                <div className="text-white font-black text-2xl">10+</div>
                <div className="text-white/80 text-xs font-semibold uppercase tracking-wide">Products</div>
              </div>
            </div>

            {/* Right — description */}
            <div>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                Nogatu is a health-focused brand dedicated to developing and distributing premium quality coffees and organic drink mixes. Our products are carefully formulated to be enjoyable both taste-wise and health-wise, helping customers enjoy natural essential ingredients.
              </p>
              <p className="text-white/60 text-base leading-relaxed">
                Founded with the belief that healthy living should be accessible to everyone, Nogatu has grown into a trusted brand across the Philippines, bringing the best of nature directly to your cup.
              </p>
              <button
                onClick={() => scrollTo('#contact')}
                className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-[#FF8C00] hover:bg-[#E07B00] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-900/40 hover:scale-105 active:scale-95"
              >
                Get in Touch
              </button>
            </div>
          </div>

          {/* Trust badges grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_BADGES.map((badge) => (
              <TrustBadge key={badge.title} badge={badge} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact / Connect Section ─────────────────────────────────────── */}
      <section id="contact" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Connect With Us */}
            <div>
              <h3 className="text-3xl font-black text-gray-900 mb-3">
                Connect <span className="text-[#FF8C00]">With Us</span>
              </h3>
              <div className="w-12 h-1 bg-[#FF8C00] rounded-full mb-6" />
              <p className="text-gray-500 leading-relaxed mb-8">
                We're always looking to connect with those who share our love of
                healthy living and quality products. Follow us on our social
                media channels and stay updated.
              </p>
              <div className="flex gap-4">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className={`w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 ${social.color} transition-all hover:shadow-md hover:-translate-y-0.5 shadow-sm`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact Us */}
            <div>
              <h3 className="text-3xl font-black text-gray-900 mb-3">
                Contact <span className="text-[#FF8C00]">Us</span>
              </h3>
              <div className="w-12 h-1 bg-[#FF8C00] rounded-full mb-6" />
              <p className="text-gray-500 leading-relaxed mb-8">
                We at Nogatu highly value your suggestions and feedback. If you
                want to know more about our products or how you can be a partner,
                reach out to us.
              </p>

              <div className="space-y-4">
                {[
                  { icon: <FaEnvelope className="text-[#FF8C00]" />, text: 'hello@nogatu.com.ph' },
                  { icon: <FaPhone className="text-[#FF8C00]" />, text: '+63 912 345 6789' },
                  { icon: <FaMapMarkerAlt className="text-[#FF8C00]" />, text: 'Metro Manila, Philippines' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-600">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-sm shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>

              <button className="mt-8 px-8 py-3 bg-[#FF8C00] hover:bg-[#E07B00] text-white font-bold rounded-xl transition-all shadow-md shadow-orange-200">
                Send a Message
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-4 sm:px-6 lg:px-8"
        style={{
          background: 'linear-gradient(135deg, #3A1000 0%, #6B2D0E 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={BRAND_LOGO}
                alt="Nogatu"
                className="h-9 w-9 rounded-full object-cover border border-[#D9B26A]"
              />
            </div>
            <p className="text-white/50 text-sm max-w-xs">
              Premium natural health drinks crafted for a healthier Philippines.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Footer nav links */}
              <div className="flex flex-wrap justify-center gap-6">
                {FOOTER_LINKS.map((link) => (
                  <button
                    key={link}
                    onClick={() => {
                      const map = {
                        Home: '#home',
                        'About Us': '#about',
                        Contact: '#contact',
                        'Privacy Policy': '#home',
                      };
                      scrollTo(map[link] || '#home');
                    }}
                    className="text-white/60 hover:text-[#FF8C00] text-sm transition-colors"
                  >
                    {link}
                  </button>
                ))}
              </div>

              {/* Copyright */}
              <p className="text-white/40 text-xs text-center sm:text-right">
                Nogatu &copy; {new Date().getFullYear()}<br className="sm:hidden" />
                <span className="hidden sm:inline"> — </span>All Rights Reserved
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
