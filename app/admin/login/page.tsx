import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import AdminLoginForm from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await currentUser();
  if (user && ["admin", "staff"].includes(user.role)) redirect("/admin");
  return <AdminLoginForm />;
}
