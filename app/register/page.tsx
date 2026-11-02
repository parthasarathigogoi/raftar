import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import RegisterForm from "./register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <main className="account-page">
      <PublicNav tone="light" />
      <Suspense fallback={<section className="shell account-gate"><Loader2 className="spin" /></section>}>
        <RegisterForm />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
