import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiShoppingCart, HiSearch, HiX, HiPlus, HiMinus,
  HiChevronRight, HiCheckCircle,
} from 'react-icons/hi';
import { FiPackage, FiUser, FiPhone, FiMail, FiMapPin, FiCreditCard, FiLock, FiChevronLeft } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import api from '@/services/api';
import { ORDERS, PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getPublicCatalogPrice } from '@/utils/publicCatalogPrice';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';
import { getPublicOrderPricingTotals } from '@/utils/publicCheckoutPricing';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase();

const findCatalogMatchForCartItem = (item, catalog) => {
  const productId = Number(item.product_id ?? item.legacy_product_id ?? item.id);
  if (Number.isInteger(productId) && productId > 0) {
    const byId = catalog.find((product) => Number(product.id) === productId);
    if (byId) {
      return byId;
    }
  }

  const sku = normalizeLookupValue(item.sku);
  if (sku) {
    const bySku = catalog.find((product) => normalizeLookupValue(product.sku) === sku);
    if (bySku) {
      return bySku;
    }
  }

  const name = normalizeLookupValue(item.name);
  if (name) {
    return catalog.find((product) => normalizeLookupValue(product.name) === name) || null;
  }

  return null;
};

const normalizeIncomingPublicCart = (items, catalog) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const merged = new Map();

  items.forEach((item) => {
    const matchedProduct = findCatalogMatchForCartItem(item, catalog);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const key = matchedProduct
      ? `product:${matchedProduct.id}`
      : `legacy:${item.product_id ?? item.legacy_product_id ?? item.id ?? item.name}`;
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    merged.set(key, {
      product_id: matchedProduct ? Number(matchedProduct.id) : item.product_id ?? item.legacy_product_id ?? item.id ?? null,
      legacy_product_id: item.legacy_product_id ?? item.id ?? item.product_id ?? null,
      sku: matchedProduct?.sku || item.sku || null,
      name: matchedProduct?.name || item.name,
      quantity,
      unit_price: matchedProduct ? getPublicCatalogPrice(matchedProduct) : Number(item.unit_price ?? item.price ?? 0),
      image_url: matchedProduct ? getProductImageSrc(matchedProduct) : (item.image_url || item.image || ''),
    });
  });

  return Array.from(merged.values());
};

export default function Shop() {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [cart, setCart] = useState(() => {
    if (location.state?.cart) {
      return location.state.cart.map(item => ({
        product_id: item.product_id ?? item.id ?? null,
        legacy_product_id: item.id ?? item.product_id ?? null,
        sku: item.sku || null,
        name: item.name,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price ?? item.price ?? 0),
        image_url: item.image_url || item.image,
      }));
    }
    return [];
  }); // { product_id, name, quantity, unit_price, image_url }
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState(() => {
    if (location.state?.openCheckout) {
      return 'checkout';
    }
    return 'browse';
  }); // browse | checkout | success
  const [orderNumber, setOrderNumber] = useState('');
  const [paymentContext, setPaymentContext] = useState(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofMessage, setProofMessage] = useState('');
  const [proofError, setProofError] = useState('');
  
  // Stock availability mapping (product_id -> available_qty)
  const [stockMap, setStockMap] = useState({});

  const copyToClipboard = async (value, successLabel) => {
    try {
      await navigator.clipboard.writeText(value);
      setProofMessage(successLabel);
      setProofError('');
    } catch {
      setProofError('Could not copy to clipboard. Please copy it manually.');
    }
  };

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError('');
    try {
      const { data } = await api.get(PRODUCTS.PUBLIC, { params: { limit: 50, search } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setProducts(list);
      
      // Keep stock mapping fresh with fetched catalog results
      setStockMap(prev => {
        const next = { ...prev };
        list.forEach(p => {
          next[p.id] = p.available_qty !== undefined ? p.available_qty : 999;
        });
        return next;
      });
      setCatalogProducts(prev => {
        const next = [...prev];
        const seen = new Set(next.map(product => Number(product.id)));
        list.forEach(product => {
          const numericId = Number(product.id);
          if (!seen.has(numericId)) {
            next.push(product);
            seen.add(numericId);
          }
        });
        return next;
      });
    } catch {
      setProducts([]);
      setProductsError('We could not load the product catalog right now. Please try again.');
    } finally {
      setProductsLoading(false);
    }
  }, [search]);

  // Load stocks on mount to cover direct shop checkout routing
  useEffect(() => {
    const loadMasterStocks = async () => {
      try {
        const { data } = await api.get(PRODUCTS.PUBLIC, { params: { limit: 100 } });
        const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        const stocks = {};
        list.forEach(p => {
          stocks[p.id] = p.available_qty !== undefined ? p.available_qty : 999;
        });
        setStockMap(stocks);
        setCatalogProducts(list);
      } catch (err) {
        console.error('Failed to load master stocks', err);
      }
    };
    loadMasterStocks();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  useEffect(() => {
    if (catalogProducts.length === 0) {
      return;
    }

    setCart(prev => {
      const next = normalizeIncomingPublicCart(prev, catalogProducts);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [catalogProducts]);

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const pricingTotals = getPublicOrderPricingTotals(cartTotal);
  const shippingFee = pricingTotals.shippingFee;
  const totalDue = pricingTotals.totalDue;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isCartStockInvalid = cart.some(item => {
    const stock = stockMap[item.product_id];
    return stock !== undefined && (stock <= 0 || item.quantity > stock);
  });

  const addToCart = (product) => {
    const stock = stockMap[product.id];
    if (stock !== undefined && stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id);
      if (ex) {
        const nextQty = ex.quantity + 1;
        if (stock !== undefined && nextQty > stock) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: nextQty } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: getPublicCatalogPrice(product),
        image_url: product.image_url,
      }];
    });
  };

  const updateQty = (productId, qty) => {
    const stock = stockMap[productId];
    if (stock !== undefined && qty > stock) {
      qty = stock;
    }
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
        payment_method: 'bank_transfer',
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setOrderNumber(res.data.data?.order_number || 'N/A');
      setPaymentContext(res.data.data?.payment || null);
      setProofFile(null);
      setProofMessage('');
      setProofError('');
      setStep('success');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) {
      setProofError('Please choose a payment proof file first.');
      return;
    }

    setProofUploading(true);
    setProofError('');
    setProofMessage('');
    try {
      const formData = new FormData();
      formData.append('order_number', orderNumber);
      formData.append('customer_phone', customer.phone);
      formData.append('proof', proofFile);
      await api.post(ORDERS.PUBLIC_PAYMENT_PROOF, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProofMessage('Payment proof uploaded successfully. We will verify your payment shortly.');
      setPaymentContext((current) => current ? {
        ...current,
        payment_proof_uploaded_at: new Date().toISOString(),
      } : current);
      setProofFile(null);
    } catch (err) {
      setProofError(err?.response?.data?.message || 'Failed to upload payment proof. Please try again.');
    } finally {
      setProofUploading(false);
    }
  };

  if (step === 'success') {
    const bankAccount = paymentContext?.bank_account || null;
    const paymentTotal = paymentContext?.total_amount ?? totalDue;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10" style={{ colorScheme: 'light' }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-xl w-full">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiCheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Bank Transfer Instructions</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed text-center">
            Your order is ready for payment. Transfer the amount below using the bank details shown here, then upload your payment proof to continue processing.
          </p>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 space-y-4 mb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Order Number</p>
                <p className="text-base font-bold font-mono text-amber-900">#{orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Due</p>
                <p className="text-xl font-extrabold text-amber-700">{formatCurrency(paymentTotal)}</p>
                <p className="text-[11px] text-amber-700/70">VAT and System Fee Included</p>
              </div>
            </div>

            {bankAccount && (
              <div className="rounded-xl bg-white border border-amber-100 p-4 text-left space-y-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Bank Name</p>
                  <p className="text-sm font-semibold text-gray-900">{bankAccount.bank_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Account Name</p>
                  <p className="text-sm font-semibold text-gray-900">{bankAccount.account_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Account Number</p>
                  <p className="text-base font-bold font-mono text-gray-900">{bankAccount.account_number}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Upload Payment Proof</h3>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Choose Payment Proof File</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-600"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              {proofFile ? `Selected file: ${proofFile.name}` : 'No file selected yet.'}
            </p>
            {proofMessage && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {proofMessage}
              </p>
            )}
            {proofError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {proofError}
              </p>
            )}
            <button
              type="button"
              onClick={handleUploadProof}
              disabled={proofUploading}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {proofUploading ? 'Submitting Payment Proof...' : 'Submit Payment Proof'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to={`/track/${orderNumber}`}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors text-center shadow-md shadow-amber-500/10"
            >
              Track my order
            </Link>
            <button
              onClick={() => {
                setCart([]);
                setStep('browse');
                setCustomer({ name: '', phone: '', email: '', address: '' });
                setOrderNumber('');
                setPaymentContext(null);
                setProofFile(null);
                setProofMessage('');
                setProofError('');
              }}
              className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors text-center"
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
            <Link to="/track" className="text-xs text-gray-500 hover:text-gray-700 hidden sm:block">
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
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-amber-400 placeholder-gray-300"
              />
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="flex justify-center py-16"><Spinner size="xl" color="warning" /></div>
            ) : productsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900">
                <p className="font-semibold">Catalog temporarily unavailable</p>
                <p className="mt-1 text-amber-800">{productsError}</p>
                <button
                  type="button"
                  onClick={() => fetchProducts()}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-200"
                >
                  Retry catalog load
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <FiPackage size={48} className="mb-3 opacity-30" />
                <p className="text-sm">{search.trim() ? 'No matching products found' : 'No products available'}</p>
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
                      <div className="aspect-square overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,219,174,0.65),transparent_58%),linear-gradient(180deg,#fffaf3_0%,#f8ecdf_100%)]">
                        <img
                          src={getProductImageSrc(product)}
                          alt={product.name}
                          onError={e => attachProductImageFallback(e, product)}
                          className="h-full w-full object-contain p-4 transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1 min-h-[2.5rem]">
                          {product.name}
                        </h3>
                        <p className="text-amber-500 font-bold text-sm mb-1.5">
                          {formatCurrency(getPublicCatalogPrice(product))}
                        </p>
                        <div className="text-xs mb-3 font-medium">
                          {stockMap[product.id] !== undefined ? (
                            stockMap[product.id] <= 0 ? (
                              <span className="text-red-500 font-semibold">Out of Stock</span>
                            ) : stockMap[product.id] <= 5 ? (
                              <span className="text-amber-500 font-semibold">Only {stockMap[product.id]} left</span>
                            ) : (
                              <span className="text-gray-500">Stock: {stockMap[product.id]} available</span>
                            )
                          ) : (
                            <span className="text-gray-400">Checking stock...</span>
                          )}
                        </div>
                        {qty > 0 ? (
                          <div className="flex items-center justify-between bg-amber-50 rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, qty - 1)}
                              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-gray-600 shadow-sm hover:bg-gray-50"
                            >
                              <HiMinus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold text-gray-800">{qty}</span>
                            <button
                              type="button"
                              disabled={stockMap[product.id] !== undefined && qty >= stockMap[product.id]}
                              onClick={() => updateQty(product.id, qty + 1)}
                              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <HiPlus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={stockMap[product.id] !== undefined && stockMap[product.id] <= 0}
                            onClick={() => addToCart(product)}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-95 text-white font-semibold rounded-xl text-sm transition-all shadow-sm shadow-amber-500/10 disabled:shadow-none"
                          >
                            {stockMap[product.id] !== undefined && stockMap[product.id] <= 0 ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Checkout Step */}
        {step === 'checkout' && (
          cart.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm px-6">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                <HiShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Your Cart is Empty</h3>
              <p className="text-sm text-gray-500 mb-6">You need to add products to your cart before you can check out.</p>
              <button
                type="button"
                onClick={() => setStep('browse')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
                Back to Products
              </button>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {/* Breadcrumbs / Progress */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-white border border-gray-100 rounded-xl p-3 shadow-sm justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setStep('browse')}
                  className="hover:text-amber-600 transition-colors font-medium flex items-center gap-1"
                >
                  Shop
                </button>
                <HiChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-bold text-amber-600">Secure Checkout</span>
                <HiChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Order Completed</span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
                {/* Left Column: Billing & Delivery Details */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <FiPackage className="text-amber-500" /> Delivery Details
                  </h2>
                  <p className="text-xs text-gray-400 mb-6">We only ship within the Philippines. Fields marked with * are required.</p>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handlePlaceOrder} className="space-y-4">
                    <div>
                      <label htmlFor="customerName" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          id="customerName"
                          type="text"
                          required
                          value={customer.name}
                          onChange={e => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Juan Dela Cruz"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-gray-900 placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          id="customerPhone"
                          type="tel"
                          required
                          value={customer.phone}
                          onChange={e => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="09171234567"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-gray-900 placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="customerEmail" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          id="customerEmail"
                          type="email"
                          value={customer.email}
                          onChange={e => setCustomer(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="juan@example.com"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-gray-900 placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="customerAddress" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Delivery Address *
                      </label>
                      <div className="relative">
                        <FiMapPin className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
                        <textarea
                          id="customerAddress"
                          required
                          rows={3}
                          value={customer.address}
                          onChange={e => setCustomer(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Street name, Barangay, City, Province, Postal Code"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-gray-900 placeholder-gray-300"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2">
                        <FiLock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Payment Method: Bank Transfer Only</p>
                          <p className="leading-relaxed">After placing your order, we will show you our bank account details. Please transfer the total amount and upload the screenshot of your receipt/payment proof.</p>
                        </div>
                      </div>
                    </div>

                    {isCartStockInvalid && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                        One or more items in your cart exceed available stock. Please adjust quantities before placing order.
                      </div>
                    )}

                    <div className="hidden lg:block pt-4">
                      <button
                        type="submit"
                        disabled={submitting || isCartStockInvalid}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <>
                            <Spinner size="sm" light={true} /> Placing Order...
                          </>
                        ) : (
                          <>
                            Place Order - {formatCurrency(totalDue)}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:sticky lg:top-24 space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                      <h3 className="font-bold text-gray-900">Order Summary</h3>
                      <button
                        type="button"
                        onClick={() => setStep('browse')}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        Edit Items
                      </button>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1 scrollbar-thin mb-4">
                      {cart.map(item => {
                        const stock = stockMap[item.product_id];
                        const isExceeded = stock !== undefined && (stock <= 0 || item.quantity > stock);
                        return (
                          <div key={item.product_id} className="flex gap-3 items-center">
                            <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-1">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                onError={e => { e.target.src = '/assets/dropshipping_nogatu_logo.png'; }}
                                className="object-contain max-h-full max-w-full"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-gray-800 truncate">{item.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-gray-400">
                                  {formatCurrency(item.unit_price)} x {item.quantity}
                                </p>
                                <span className="text-gray-300 text-[10px]">•</span>
                                <span className={`text-[10px] font-semibold ${isExceeded ? 'text-red-500' : 'text-gray-400'}`}>
                                  {stock !== undefined ? `Stock: ${stock} available` : 'Checking...'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs font-bold text-gray-900 shrink-0">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 items-center">
                        <span>Shipping</span>
                        <span className="font-semibold text-gray-800">{formatCurrency(shippingFee)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-900 border-t border-dashed border-gray-100 pt-3 mt-2">
                        <div>
                          <span>Total Due</span>
                          <p className="text-[11px] font-medium text-gray-400">VAT and System Fee Included</p>
                        </div>
                        <span className="text-amber-600 font-extrabold">{formatCurrency(totalDue)}</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="lg:hidden">
                        <button
                          type="button"
                          onClick={handlePlaceOrder}
                          disabled={submitting || isCartStockInvalid}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <Spinner size="sm" light={true} /> Placing Order...
                            </>
                          ) : (
                            <>
                              Place Order - {formatCurrency(totalDue)}
                            </>
                          )}
                        </button>
                      </div>

                      <div className="border-t border-gray-100 pt-3 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
                        <FiLock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Secure Checkout • 256-Bit SSL Encryption</span>
                      </div>
                    </div>
                  </div>

                  {/* Guarantees */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 text-xs text-gray-500">
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 shrink-0">
                        <FiPackage className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-700">Official Product Guarantee</p>
                        <p className="mt-0.5 leading-relaxed text-[11px]">Direct shipment from accredited municipal/city Stockists to guarantee authentic formulations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" style={{ colorScheme: 'light' }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setCartOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col h-full transform transition-transform duration-300">
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiShoppingCart className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-gray-900">Your Shopping Cart</span>
                  {cartCount > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                      {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FiPackage className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Your cart is empty</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCartOpen(false);
                        setStep('browse');
                      }}
                      className="mt-4 text-xs font-bold text-amber-600 hover:underline"
                    >
                      Browse our products
                    </button>
                  </div>
                ) : (
                  cart.map(item => {
                    const stock = stockMap[item.product_id];
                    return (
                      <div key={item.product_id} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                        <div className="w-16 h-16 bg-white border border-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            onError={e => { e.target.src = '/assets/dropshipping_nogatu_logo.png'; }}
                            className="object-contain max-h-full max-w-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">
                              {item.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                              title="Remove item"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Stock warning */}
                          <div className="text-[10px] mt-1 font-semibold">
                            {stock !== undefined ? (
                              stock <= 0 ? (
                                <span className="text-red-500">Out of Stock</span>
                              ) : item.quantity > stock ? (
                                <span className="text-amber-500">Only {stock} left</span>
                              ) : (
                                <span className="text-gray-400 font-medium">Stock: {stock} available</span>
                              )
                            ) : (
                              <span className="text-gray-300">Checking stock...</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-1 py-0.5 shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateQty(item.product_id, item.quantity - 1)}
                                className="w-5 h-5 rounded-md hover:bg-gray-100 flex items-center justify-center font-bold text-gray-500 transition-colors"
                              >
                                <HiMinus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-xs font-bold text-gray-800 min-w-[16px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={stock !== undefined && item.quantity >= stock}
                                onClick={() => updateQty(item.product_id, item.quantity + 1)}
                                className="w-5 h-5 rounded-md hover:bg-gray-100 flex items-center justify-center font-bold text-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <HiPlus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-gray-900">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-100 space-y-4">
                  {isCartStockInvalid && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 font-medium">
                      Some items in your cart exceed available stock or are out of stock. Please adjust quantities before checking out.
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Estimated Subtotal</span>
                    <span className="font-extrabold text-gray-900">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Shipping</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="font-semibold text-gray-900">Total Due</span>
                      <p className="text-[10px] text-gray-400">VAT and System Fee Included</p>
                    </div>
                    <span className="font-extrabold text-amber-600">{formatCurrency(totalDue)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-normal">
                    Final warehouse routing is confirmed during checkout.
                  </div>
                  <button
                    type="button"
                    disabled={isCartStockInvalid}
                    onClick={() => {
                      setCartOpen(false);
                      setStep('checkout');
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-amber-500/10 text-center disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Go to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
