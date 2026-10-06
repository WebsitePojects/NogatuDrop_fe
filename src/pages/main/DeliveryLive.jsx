import LiveDeliveryBoard from '@/components/delivery/LiveDeliveryBoard';

export default function MainDeliveryLive() {
  return (
    <LiveDeliveryBoard
      title="Live Delivery Map"
      summary="Every rider on the road, with the road they are taking and when they should arrive."
      orderLinkBuilder={(orderId) => `/main/orders?highlight=${orderId}`}
    />
  );
}
