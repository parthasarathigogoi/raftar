import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarRange,
  Camera,
  ClipboardList,
  Handshake,
  Newspaper,
  Settings,
  UserCog,
  UsersRound,
  Wallet,
  Wallet2,
} from "lucide-react";
import { currentUser } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/trips", label: "Trip Events", icon: CalendarRange },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/bookings", label: "Bookings", icon: BriefcaseBusiness },
  { href: "/admin/customers", label: "Customers", icon: UsersRound },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/payments", label: "Payments", icon: Wallet2 },
  { href: "/admin/expenses", label: "Expenses", icon: Wallet },
  { href: "/admin/finance", label: "Finance", icon: BarChart3 },
  { href: "/admin/media-studio", label: "Media Studio", icon: Camera },
  { href: "/admin/stories", label: "Stories", icon: Newspaper },
  { href: "/admin/staff", label: "Staff", icon: UserCog },
  { href: "/admin/notifications", label: "Notifications", icon: BellRing },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // `/admin/login` is public: the proxy forwards the real pathname (see proxy.ts).
  const pathname = (await headers()).get("x-raftar-pathname");
  if (pathname === "/admin/login") return <>{children}</>;

  const user = await currentUser();
  if (!user || !["admin", "staff"].includes(user.role)) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <aside>
        <Link href="/admin" className="wordmark">
          RAF<span>TAR</span>
        </Link>
        <p>Management studio</p>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <Link className="back-site" href="/">
          ← View website
        </Link>
      </aside>
      <div className="admin-main">
        <header>
          <div>
            <span>RAFTAR / ADMIN</span>
            <h1>Management studio</h1>
          </div>
          <div className="admin-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        </header>
        {children}
      </div>
    </div>
  );
}
