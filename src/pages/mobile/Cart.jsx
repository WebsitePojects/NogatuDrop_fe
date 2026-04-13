import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner, Textarea } from 'flowbite-react';
import { HiArrowLeft, HiMinus, HiPlus, HiShoppingCart, HiTrash } from 'react-icons/hi';
import { FiShoppingBag } from 'react-icons/fi';
import { ToastContainer, useToast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

export default function MobileCart() {
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();
  const { items, loading, cartTotal, updateQty, removeItem, refetch } = useCart();

  const [notes, setNotes] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const handleUpdateQty = async (itemId, quantity) => {
    try {
      await updateQty(itemId, quantity);
    } catch {
      showToast('Failed to update quantity', 'error');
    }
  };

  const handleRemove = async (itemId, itemName) => {
    try {
      await removeItem(itemId);
      showToast(`${itemName} removed from cart`, 'info');
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
        items: items.map((item) => ({
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity,
          unit_price: item.partner_price || item.price || 0,
        })),
      });

      await refetch();
      showToast('Order placed successfully', 'success');
      setTimeout(() => navigate('/mobile/orders'), 500);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Checkout failed. Please try again.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="warning" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/mobile/catalog')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600"
            aria-label="Back to catalog"
          >
            <HiArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Cart</h1>
            <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FiShoppingBag size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Your cart is empty</p>
            <Button color="warning" size="sm" className="mt-4" onClick={() => navigate('/mobile/catalog')}>
              Browse Products
            </Button>
          </div>
        ) : (
          <>
            {items.map((item) => {
              const quantity = item.quantity || 1;
              const unitPrice = item.partner_price || item.price || 0;
              const subtotal = quantity * unitPrice;

              return (
                <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                      <img
                        src={getProductImageSrc({ image_url: item.image_url, name: item.product_name || item.name })}
                        alt={item.product_name || item.name}
                        onError={(e) => attachProductImageFallback(e, { name: item.product_name || item.name })}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.product_name || item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(unitPrice)} / unit</p>
                      <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(subtotal)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQty(item.id, quantity - 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600"
                        aria-label="Decrease quantity"
                      >
                        <HiMinus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.id, quantity + 1)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600"
                        aria-label="Increase quantity"
                      >
                        <HiPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemove(item.id, item.product_name || item.name || 'Item')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-500"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <label className="text-xs font-semibold text-gray-500 uppercase">Order Notes (optional)</label>
              <Textarea
                rows={3}
                className="mt-1"
                placeholder="Add delivery or handling notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700">
                Payment details will appear after order approval.
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(cartTotal)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut || items.length === 0}
                className="mt-3 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {checkingOut ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" color="white" />
                    Placing Order...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <HiShoppingCart className="w-4 h-4" />
                    Checkout
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
