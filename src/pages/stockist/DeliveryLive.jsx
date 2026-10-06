import LiveDeliveryBoard from '@/components/delivery/LiveDeliveryBoard';

export default function StockistDeliveryLive() {
  return (
    <LiveDeliveryBoard
      title="Live Deliveries"
      summary="Riders carrying your orders right now, the road they are taking and when they should arrive."
      orderLinkBuilder={(orderId) => `/stockist/orders?highlight=${orderId}`}
    />
  );
}
