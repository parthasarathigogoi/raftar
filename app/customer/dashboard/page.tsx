import CustomerAccount from "../customer-account";

export const dynamic = "force-dynamic";

export default function CustomerDashboardPage() {
  return <CustomerAccount initialTab="trips" />;
}
