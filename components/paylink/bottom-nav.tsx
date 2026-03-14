"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Link2, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/",
    icon: House,
    label: "Home",
    matches: (pathname: string) => pathname === "/",
  },
  {
    href: "/create",
    icon: PlusCircle,
    label: "Create",
    matches: (pathname: string) => pathname === "/create",
  },
  {
    href: "/my-links",
    icon: Link2,
    label: "My links",
    matches: (pathname: string) => pathname === "/my-links",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-primary bg-bg-primary/95 backdrop-blur-xl"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matches(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold tracking-[0.06em] transition-colors",
                isActive
                  ? "text-text-brand-primary"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  isActive && "drop-shadow-[0_0_12px_rgba(13,204,242,0.35)]",
                )}
                strokeWidth={2}
              />
              <span className="uppercase">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
