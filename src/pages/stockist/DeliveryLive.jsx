import DeliveryLiveMapBoard from '@/components/DeliveryLiveMapBoard';

export default function StockistDeliveryLive() {
  return (
    <DeliveryLiveMapBoard
      title="Stockist Live Delivery Map"
      summary="Provincial, city, and staff view of active deliveries inside the current Stockist scope."
      badgeLabel="Stockist Portal"
      accent="green"
      orderLinkBuilder={(orderId) => `/stockist/orders?id=${orderId}`}
    />
  );
}
