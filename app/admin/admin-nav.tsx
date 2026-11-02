"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarRange,
  Camera,
  ClipboardList,
  FolderKanban,
  Handshake,
  History,
  Landmark,
  MapPinned,
  Newspaper,
  PieChart,
  Settings,
  ShieldCheck,
  UserCircle,
  UserCog,
  UsersRound,
  Wallet,
  Wallet2,
} from "lucide-react";
import type { Role } from "@/lib/auth";

type NavLink = { href: string; label: string; icon: typeof BarChart3; module: string };
type NavGroup = { label: string; links: NavLink[] };

/** Sidebar structure (§5) — grouped and permission-aware. */
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: BarChart3, module: "dashboard" }],
  },
  {
    label: "Travel management",
    links: [
      { href: "/admin/trips", label: "Trip Events", icon: CalendarRange, module: "trips" },
      { href: "/admin/destinations", label: "Destinations", icon: MapPinned, module: "destinations" },
      { href: "/admin/registrations", label: "Registrations", icon: ClipboardList, module: "registrations" },
      { href: "/admin/bookings", label: "Bookings", icon: BriefcaseBusiness, module: "bookings" },
      { href: "/admin/operations", label: "Trip Operations", icon: FolderKanban, module: "operations" },
    ],
  },
  {
    label: "Business management",
    links: [
      { href: "/admin/customers", label: "Customers", icon: UsersRound, module: "customers" },
      { href: "/admin/partners", label: "Partners", icon: Handshake, module: "partners" },
      { href: "/admin/staff", label: "Staff", icon: UserCog, module: "staff" },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/admin/payments", label: "Payments", icon: Wallet2, module: "payments" },
      { href: "/admin/expenses", label: "Expenses", icon: Wallet, module: "expenses" },
      { href: "/admin/finance", label: "Finance Reports", icon: PieChart, module: "finance" },
      { href: "/admin/travel-fund", label: "Travel Fund", icon: Landmark, module: "travel_fund" },
    ],
  },
  {
    label: "Creative studio",
    links: [
      { href: "/admin/media-studio", label: "Media Studio", icon: Camera, module: "media" },
      { href: "/admin/stories", label: "Stories", icon: Newspaper, module: "stories" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/notifications", label: "Notifications", icon: BellRing, module: "notifications" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: History, module: "audit" },
      { href: "/admin/profile", label: "My Profile", icon: UserCircle, module: "profile" },
      { href: "/admin/settings", label: "Settings", icon: Settings, module: "settings" },
    ],
  },
];

/** Admins see everything; staff only see the modules they are granted. */
export function permittedGroups(role: Role, permissions: string[] = []): NavGroup[] {
  if (role === "admin") return navGroups;
  const granted = new Set(permissions);
  if (granted.has("all")) return navGroups;
  return navGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => granted.has(link.module)) }))
    .filter((group) => group.links.length > 0);
}

export default function AdminNav({ role, permissions }: { role: Role; permissions: string[] }) {
  const pathname = usePathname();
  const groups = permittedGroups(role, permissions);

  return (
    <nav>
      {groups.map((group) => (
        <div key={group.label} className="nav-group">
          <p className="nav-group-label">{group.label}</p>
          {group.links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="nav-group">
        <p className="nav-group-label">Access</p>
        <span className="nav-role">
          <ShieldCheck />
          {role === "admin" ? "Super admin" : "Staff"}
        </span>
      </div>
    </nav>
  );
}
