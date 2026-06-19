"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  Phone,
  Search,
  Settings,
  Shield,
  Clock,
  FolderSearch,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Search", icon: Search },
  { href: "/phone", label: "Phone Intel", icon: Phone },
  { href: "/investigations", label: "Investigations", icon: FolderSearch },
  { href: "/graph", label: "Graph", icon: GitBranch },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
      <div className="flex h-full flex-col glass-strong border-r border-glass-border">
        <div className="flex h-16 items-center gap-2.5 px-6 border-b border-glass-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Vindicta</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-glass-border">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 Vindicta AI
          </p>
        </div>
      </div>
    </aside>
  );
}
