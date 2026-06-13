"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  BookOpen,
  History,
  BookMarked,
  Fingerprint,
  Wallet,
  Medal,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const NAV = [
  { label: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "library", href: "/library", icon: BookOpen },
  { label: "history", href: "/history", icon: History },
  { label: "journal", href: "/journal", icon: BookMarked },
  { label: "passport", href: "/passport", icon: Fingerprint },
  { label: "wallet", href: "/wallet", icon: Wallet },
  { label: "badges", href: "/badges", icon: Medal },
] as const;

const BOTTOM_NAV = [
  { label: "settings", href: "/settings", icon: Settings },
] as const;

export function ReaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "reader";
  const initials = displayName.slice(0, 2).toUpperCase();

  const isDark = theme === "dark";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/60 bg-card transition-all duration-200",
          collapsed ? "w-[60px]" : "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo + collapse button */}
        <div
          className={[
            "flex h-14 items-center border-b border-border/60",
            collapsed ? "justify-center px-0" : "justify-between px-4",
          ].join(" ")}
        >
          {!collapsed && (
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              arktion
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {collapsed ? (
              <Menu className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-0.5 px-2">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={[
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      collapsed ? "justify-center" : "",
                    ].join(" ")}
                  >
                    <Icon
                      className="h-[15px] w-[15px] shrink-0"
                      strokeWidth={active ? 2 : 1.5}
                    />
                    {!collapsed && (
                      <span className="tracking-wide">{label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: theme toggle, settings, sign out, user */}
        <div className="border-t border-border/60 py-3 px-2 space-y-0.5">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "switch to light mode" : "switch to dark mode"}
            className={[
              "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            {isDark ? (
              <Sun className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
            ) : (
              <Moon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
            )}
            {!collapsed && (
              <span className="tracking-wide">
                {isDark ? "light mode" : "dark mode"}
              </span>
            )}
          </button>

          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={[
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors",
                collapsed ? "justify-center" : "",
              ].join(" ")}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="tracking-wide">{label}</span>}
            </Link>
          ))}

          <button
            onClick={() => signOut()}
            title={collapsed ? "sign out" : undefined}
            className={[
              "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="tracking-wide">sign out</span>}
          </button>

          {/* User pill */}
          <div
            className={[
              "mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 border border-border/60 bg-muted/30",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-6 w-6 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                {initials}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground truncate leading-none">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-none">
                    {user.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-20 flex h-12 items-center justify-between border-b border-border/60 bg-background/90 backdrop-blur px-4 lg:hidden">
        <span className="text-sm font-semibold tracking-tight">arktion</span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="open menu"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* ── Main content ── */}
      <div
        className={[
          "flex-1 min-w-0 transition-all duration-200",
          collapsed ? "lg:ml-[60px]" : "lg:ml-56",
          "pt-12 lg:pt-0",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
