import DeliveryLiveMapBoard from '@/components/DeliveryLiveMapBoard';

export default function MainDeliveryLive() {
  return (
    <DeliveryLiveMapBoard
      title="National Live Delivery Map"
      summary="Super Admin view of all active delivery routes with live GPS movement between source and destination points."
      badgeLabel="Main System"
      accent="orange"
      orderLinkBuilder={(orderId) => `/main/orders?id=${orderId}`}
    />
  );
}
