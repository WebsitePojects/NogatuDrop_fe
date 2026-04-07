import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Spinner } from 'flowbite-react';
import { HiArrowLeft, HiShoppingCart, HiLightningBolt } from 'react-icons/hi';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { PRODUCTS, CART, ORDERS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

export default function CatalogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [addingCart, setAddingCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.BY_ID(id));
      const p = data.data;
      setProduct(p);

      // Fetch related products (same category)
      if (p?.category) {
        const res = await api.get(PRODUCTS.LIST, { params: { limit: 8 } });
        const allProducts = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
        setRelated(allProducts.filter(r => r.id !== p.id && r.category === p.category).slice(0, 4));
      }
    } catch {
      showToast('Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    setAddingCart(true);
    try {
      await api.post(CART.ADD, {
        product_id: product.id,
        warehouse_id: product.warehouse_id || null,
        quantity: qty,
      });
      showToast(`${product.name} added to cart!`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add to cart', 'error');
    } finally {
      setAddingCart(false);
    }
  };

  const handleCheckoutNow = async () => {
    setCheckingOut(true);
    try {
      await api.post(CART.ADD, {
        product_id: product.id,
        warehouse_id: product.warehouse_id || null,
        quantity: qty,
      });
      navigate('/stockist/cart');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to proceed', 'error');
      setCheckingOut(false);
    }
  };

  const discountPct = (retail, partner) => {
    if (!retail || !partner || retail <= partner) return null;
    return Math.round(((retail - partner) / retail) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FFF8F0' }}>
        <Spinner size="xl" color="warning" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-gray-500 min-h-screen" style={{ background: '#FFF8F0' }}>
        <p className="mb-4">Product not found.</p>
        <Button color="warning" onClick={() => navigate('/stockist/catalog')}>Back to Catalog</Button>
      </div>
    );
  }

  const disc = discountPct(product.retail_price, product.partner_price);

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
        <button
          onClick={() => navigate('/stockist/catalog')}
          className="flex items-center gap-1 hover:text-amber-600 transition-colors"
        >
          <HiArrowLeft className="w-4 h-4" />
          Catalog
        </button>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Detail Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative bg-gray-50 flex items-center justify-center p-6 lg:p-10 aspect-square lg:aspect-auto min-h-[280px] lg:min-h-[400px]">
            {disc && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
                -{disc}% OFF
              </span>
            )}
            <img
              src={getProductImageSrc(product)}
              alt={product.name}
              onError={e => attachProductImageFallback(e, product)}
              className="max-h-72 lg:max-h-96 w-full object-contain"
            />
          </div>

          {/* Info */}
          <div className="p-6 lg:p-8 flex flex-col">
            {product.category && (
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                {product.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{product.name}</h1>
            {product.sku && (
              <p className="text-xs text-gray-400 font-mono mb-4">SKU: {product.sku}</p>
            )}

            {/* Pricing */}
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-amber-500">
                {formatCurrency(product.partner_price || product.price || 0)}
              </span>
              {product.retail_price && product.retail_price > (product.partner_price || 0) && (
                <span className="text-lg text-gray-400 line-through mb-0.5">
                  {formatCurrency(product.retail_price)}
                </span>
              )}
            </div>
            {disc && (
              <p className="text-sm text-emerald-600 font-medium mb-4">
                You save {formatCurrency((product.retail_price || 0) - (product.partner_price || 0))} ({disc}% off retail)
              </p>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-6">{product.description}</p>
            )}

            {/* Stock info */}
            {product.total_stock !== undefined && (
              <p className="text-xs text-gray-400 mb-4">
                Stock available: <span className="font-semibold text-gray-700">{product.total_stock || 0}</span>
              </p>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-9 text-center text-sm font-semibold border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={addingCart || checkingOut}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                <HiShoppingCart className="w-4 h-4" />
                {addingCart ? 'Adding...' : 'Add to Cart'}
              </button>
              <button
                onClick={handleCheckoutNow}
                disabled={addingCart || checkingOut}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                <HiLightningBolt className="w-4 h-4" />
                {checkingOut ? 'Processing...' : 'Checkout Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Related Products</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map(rp => (
              <div
                key={rp.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/stockist/catalog/${rp.id}`)}
              >
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  <img
                    src={getProductImageSrc(rp)}
                    alt={rp.name}
                    onError={e => attachProductImageFallback(e, rp)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{rp.name}</h3>
                  <p className="text-sm font-bold text-amber-500">
                    {formatCurrency(rp.partner_price || rp.price || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
