import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { CART } from '@/services/endpoints';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    const canUseCart = ['admin', 'provincial_stockist', 'city_stockist'].includes(user?.role_slug);
    if (!canUseCart) return;
    setLoading(true);
    try {
      const { data } = await api.get(CART.LIST);
      setItems(data.data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, warehouseId, quantity = 1) => {
    const { data } = await api.post(CART.ADD, {
      product_id: productId,
      warehouse_id: warehouseId,
      quantity,
    });
    await fetchCart();
    return data;
  };

  const updateQty = async (cartItemId, quantity) => {
    if (quantity < 1) return removeItem(cartItemId);
    await api.put(CART.UPDATE(cartItemId), { quantity });
    await fetchCart();
  };

  const removeItem = async (cartItemId) => {
    await api.delete(CART.REMOVE(cartItemId));
    await fetchCart();
  };

  const clearCart = async () => {
    await api.delete(CART.CLEAR);
    setItems([]);
  };

  const checkout = async (payload = {}) => {
    const { data } = await api.post(CART.CHECKOUT, payload);
    setItems([]);
    return data;
  };

  const cartCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartTotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.partner_price || item.price || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        cartCount,
        cartTotal,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
        checkout,
        refetch: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export default CartContext;
