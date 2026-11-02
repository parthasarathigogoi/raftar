import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import PublicNav from "@/app/components/public-nav";
import SiteFooter from "@/app/components/site-footer";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="account-page">
      <PublicNav tone="light" />
      <Suspense fallback={<section className="shell account-gate"><Loader2 className="spin" /></section>}>
        <LoginForm />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
