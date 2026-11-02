import { currentUser } from "@/lib/auth";
import NavBar from "./nav-bar";

/**
 * Public site navigation, aware of the signed-in customer.
 * Server component: reads the session cookie and hands a minimal user shape to the client bar.
 */
export default async function PublicNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  let user: { name: string; role: string } | null = null;
  try {
    const session = await currentUser();
    if (session) user = { name: session.name, role: session.role };
  } catch {
    user = null;
  }
  return <NavBar user={user} tone={tone} />;
}
