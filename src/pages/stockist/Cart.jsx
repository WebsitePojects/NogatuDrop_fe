import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Textarea, Card, Spinner } from 'flowbite-react';
import { HiShoppingCart, HiTrash, HiMinus, HiPlus } from 'react-icons/hi';
import { FiShoppingBag } from 'react-icons/fi';
import { ToastContainer, useToast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

export default function StockistCart() {
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();
  const { items, loading, cartTotal, updateQty, removeItem, refetch } = useCart();
  const [notes, setNotes] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const handleUpdateQty = async (itemId, newQty) => {
    try {
      await updateQty(itemId, newQty);
    } catch {
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleRemove = async (itemId, name) => {
    try {
      await removeItem(itemId);
      showToast(`${name} removed from cart`, 'info');
    } catch {
      showToast('Failed to remove item', 'error');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      await api.post(ORDERS.CREATE, {
        notes,
        items: items.map(i => ({
          product_id: i.product_id,
          warehouse_id: i.warehouse_id,
          quantity: i.quantity,
          unit_price: i.partner_price || i.price || 0,
        })),
      });
      await refetch();
      showToast('Order placed successfully!', 'success');
      setTimeout(() => navigate('/stockist/orders'), 1000);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Checkout failed. Please try again.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FFF8F0' }}>
        <Spinner size="xl" color="warning" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiShoppingCart className="text-amber-500" />
          Shopping Cart
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
      </div>

      {items.length === 0 ? (
        /* Empty cart */
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <FiShoppingBag size={36} className="text-amber-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Your cart is empty</h3>
          <p className="text-sm text-gray-400 mb-6">Browse products and add them to your cart</p>
          <Button color="warning" onClick={() => navigate('/stockist/catalog')}>
            Browse Catalog
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => {
              const price = item.partner_price || item.price || 0;
              const subtotal = price * (item.quantity || 1);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4"
                >
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                    <img
                      src={getProductImageSrc({ image_url: item.image_url, name: item.product_name })}
                      alt={item.product_name}
                      onError={e => attachProductImageFallback(e, { name: item.product_name })}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                      {item.product_name || item.name}
                    </h3>
                    {item.sku && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</p>
                    )}
                    <p className="text-sm font-medium text-amber-600 mt-1">
                      {formatCurrency(price)} / unit
                    </p>
                  </div>

                  {/* Qty + subtotal */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-base font-bold text-gray-900">{formatCurrency(subtotal)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateQty(item.id, (item.quantity || 1) - 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <HiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity || 1}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, (item.quantity || 1) + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <HiPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id, item.product_name || item.name)}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-0.5 transition-colors"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Item subtotals */}
              <div className="space-y-2 mb-4">
                {items.map(item => {
                  const price = item.partner_price || item.price || 0;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-500 truncate max-w-[60%]">
                        {item.product_name || item.name} ×{item.quantity}
                      </span>
                      <span className="font-medium text-gray-800">
                        {formatCurrency(price * (item.quantity || 1))}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-3 mb-4">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-amber-600">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Order Notes (optional)</label>
                <Textarea
                  rows={3}
                  placeholder="Any special instructions for this order…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  sizing="sm"
                />
              </div>

              {/* Payment note */}
              <div className="bg-amber-50 rounded-xl p-3 mb-4 text-xs text-amber-700">
                After placing your order, you will receive bank account details and have 24 hours to submit payment proof.
              </div>

              <Button
                color="warning"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={checkingOut || items.length === 0}
                isProcessing={checkingOut}
              >
                {checkingOut ? 'Placing Order…' : 'Place Order'}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
