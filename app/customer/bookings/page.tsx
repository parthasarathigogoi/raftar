import CustomerAccount from "../customer-account";

export const dynamic = "force-dynamic";

export default function CustomerBookingsPage() {
  return <CustomerAccount initialTab="bookings" />;
}
