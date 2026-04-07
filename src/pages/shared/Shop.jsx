import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiShoppingCart, HiSearch, HiX, HiPlus, HiMinus,
  HiChevronRight, HiCheckCircle,
} from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import api from '@/services/api';
import { ORDERS, PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // { product_id, name, quantity, unit_price, image_url }
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState('browse'); // browse | checkout | success
  const [orderNumber, setOrderNumber] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.LIST, { params: { limit: 50, is_active: 1, search } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setProducts(list);
    } catch {
      // silent fail on public page
    } finally {
      setProductsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.partner_price || product.price || 0,
        image_url: product.image_url,
      }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product_id !== productId));
    else setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const getQty = (productId) => cart.find(i => i.product_id === productId)?.quantity || 0;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (cart.length === 0) { setFormError('Your cart is empty.'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(ORDERS.PUBLIC, {
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        customer_address: customer.address,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setOrderNumber(res.data.data?.order_number || 'N/A');
      setStep('success');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiCheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
          <p className="text-gray-500 mb-1">Order Number:</p>
          <p className="text-lg font-bold font-mono text-amber-600 mb-4">#{orderNumber}</p>
          <p className="text-sm text-gray-400 mb-6">
            Our team will contact you to arrange delivery and payment details.
          </p>
          <div className="flex flex-col gap-2">
            <Link to={`/track/${orderNumber}`} className="text-sm text-blue-600 hover:underline">
              Track my order
            </Link>
            <button
              onClick={() => { setCart([]); setStep('browse'); setCustomer({ name: '', phone: '', email: '', address: '' }); setOrderNumber(''); }}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={BRAND_LOGO} alt="Nogatu" className="w-8 h-8 rounded-xl" />
            <div>
              <p className="font-bold text-gray-900 text-sm">Nogatu Shop</p>
              <p className="text-xs text-gray-400">Official Store</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/track/search" className="text-xs text-gray-500 hover:text-gray-700 hidden sm:block">
              Track Order
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <HiShoppingCart className="w-5 h-5 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center text-[10px] min-w-[18px] px-0.5">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {step === 'browse' && (
          <>
            {/* Search */}
            <div className="relative mb-6 max-w-md">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="flex justify-center py-16"><Spinner size="xl" color="warning" /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <FiPackage size={48} className="mb-3 opacity-30" />
                <p className="text-sm">No products available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => {
                  const qty = getQty(product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        <img
                          src={getProductImageSrc(product)}
                          alt={product.name}
                          onError={e => attachProductImageFallback(e, product)}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1 min-h-[2.5rem]">
                          {product.name}
                        </h3>
                        <p className="text-amber-500 font-bold text-sm mb-3">
                          {formatCurrency(product.partner_price || product.price || 0)}
                        </p>
                        {qty > 0 ? (
                          <div className="flex items-center justify-between bg-amber-50 rounded-xl px-2 py-1">
                            <button onClick={() => updateQty(product.id, qty - 1)}
                              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-gray-600 shadow-sm">
                              <HiMinus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold">{qty}</span>
                            <button onClick={() => updateQty(product.id, qty + 1)}
                              className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-white shadow-sm">
                              <HiPlus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Floating checkout */}
            {cartCount > 0 && (
              <div className="fixed bottom-6 right-6 z-20">
                <button
                  onClick={() => setStep('checkout')}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-2xl shadow-lg font-semibold text-sm hover:bg-amber-600 transition-colors"
                >
                  <HiShoppingCart size={16} />
                  Checkout — {formatCurrency(cartTotal)}
                  <HiChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setStep('browse')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
            >
              ← Back to products
            </button>

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 flex-1 truncate">{item.name} × {item.quantity}</span>
                    <span className="font-medium ml-2">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold mt-3 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-amber-500">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Customer form */}
            <form onSubmit={handlePlaceOrder} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="font-bold text-gray-900">Delivery Details</h2>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                  {formError}
                </div>
              )}
              {[
                { label: 'Full Name *', key: 'name', type: 'text' },
                { label: 'Phone Number *', key: 'phone', type: 'tel' },
                { label: 'Email (optional)', key: 'email', type: 'email' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={customer[key]}
                    onChange={e => setCustomer(c => ({ ...c, [key]: e.target.value }))}
                    required={key !== 'email'}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address *</label>
                <textarea
                  value={customer.address}
                  onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                  rows={3}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none"
                  placeholder="Street address, barangay, city"
                />
              </div>
              <p className="text-xs text-gray-400">
                Our team will contact you to confirm delivery and arrange payment via bank transfer or cash on delivery (for orders ≤₱5,000).
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Spinner size="sm" color="white" /> : null}
                {submitting ? 'Placing Order…' : `Place Order — ${formatCurrency(cartTotal)}`}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-80 bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Cart ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Cart is empty</div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                      <img
                        src={getProductImageSrc({ image_url: item.image_url, name: item.name })}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2">{item.name}</p>
                      <p className="text-xs text-amber-500 font-bold mt-0.5">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <button onClick={() => updateQty(item.product_id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                          −
                        </button>
                        <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.product_id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-400 mt-0.5">
                      <HiX className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <div className="flex justify-between font-bold text-sm mb-3">
                  <span>Total</span>
                  <span className="text-amber-500">{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setStep('checkout'); }}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors"
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
