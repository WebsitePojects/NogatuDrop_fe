import DeliveryLiveMapBoard from '@/components/DeliveryLiveMapBoard';

export default function MobileDeliveryLive() {
  return (
    <DeliveryLiveMapBoard
      title="My Live Delivery Map"
      summary="Mobile Stockist view of the deliveries currently moving for your own orders."
      badgeLabel="Mobile Portal"
      accent="blue"
      orderLinkBuilder={(orderId) => `/mobile/orders?id=${orderId}`}
    />
  );
}
