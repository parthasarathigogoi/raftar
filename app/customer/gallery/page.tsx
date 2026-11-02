import CustomerAccount from "../customer-account";

export const dynamic = "force-dynamic";

export default function CustomerGalleryPage() {
  return <CustomerAccount initialTab="gallery" />;
}
