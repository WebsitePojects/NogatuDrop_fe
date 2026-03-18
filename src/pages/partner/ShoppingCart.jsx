import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/utils/formatCurrency';

const ShoppingCart = () => {
  const navigate = useNavigate();
  const { items, loading, cartTotal, updateQty, removeItem, checkout } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setCheckingOut(true);
    setError('');
    try {
      await checkout({});
      navigate('/partner/orders');
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>SHOPPING CART</h1>
          <p className="text-sm text-gray-500 mt-1">Review your items before checkout</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-xl border border-gray-200 p-16 flex flex-col items-center justify-center">
            <FiShoppingCart className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-base mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate('/partner/products')}
              className="px-8 py-3 text-sm font-bold text-white rounded-lg tracking-widest uppercase"
              style={{ background: '#0B3D0B' }}
            >
              BROWSE NOGATU
            </button>
          </div>
        ) : (
          /* Cart with Items */
          <div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              {/* Cart Header */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1" />
                </div>
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const price = item.partner_price || item.price || 0;
                  const lineTotal = price * (item.quantity || 1);
                  return (
                    <div key={item.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center">
                      {/* Product Name + Supplier */}
                      <div className="col-span-5">
                        <p className="text-sm font-semibold text-gray-800">{item.product_name || item.name}</p>
                        {item.supplier && (
                          <p className="text-xs text-gray-400">{item.supplier}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-center">
                        <p className="text-sm text-gray-700">{formatCurrency(price)}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQty(item.id, (item.quantity || 1) - 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                        >
                          <FiMinus className="text-xs" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity || 1}</span>
                        <button
                          onClick={() => updateQty(item.id, (item.quantity || 1) + 1)}
                          className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                        >
                          <FiPlus className="text-xs" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(lineTotal)}</p>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total + Checkout */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-5">
              <div>
                <p className="text-sm text-gray-500">Order Total</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(cartTotal)}</p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="px-8 py-3 text-sm font-bold text-white rounded-lg transition-all disabled:opacity-60"
                style={{ background: '#0B3D0B' }}
              >
                {checkingOut ? 'Placing Order...' : 'PLACE ORDER'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;
