"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  Network,
  Phone,
  Search,
  Settings,
  Clock,
} from "lucide-react";

import { detectWebLocale, getWebMessages } from "@/lib/i18n/web";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/web", labelKey: "nav" as const, icon: Network },
  { href: "/phone", label: "Phone", icon: Phone },
  { href: "/graph", label: "Graph", icon: GitBranch },
  { href: "/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Time", icon: Clock },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const webNavLabel = getWebMessages(detectWebLocale()).nav;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden safe-bottom">
      <div className="glass-strong border-t border-glass-border mx-2 mb-2 rounded-2xl">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const label = "labelKey" in item && item.labelKey === "nav" ? webNavLabel : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 min-w-[56px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_var(--vindicta-glow)]")} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
