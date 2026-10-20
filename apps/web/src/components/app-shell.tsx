"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LogOut, Utensils } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApplication, useAuth } from "./auth-provider";
import { ErrorNotice } from "./ui";

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.6px]">
      <span className="grid size-8 place-items-center rounded-lg bg-yellow text-ink">
        <Utensils size={19} strokeWidth={2} />
      </span>
      Столовая
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useApplication();
  const { logout } = useAuth();
  const pathname = usePathname();
  const [error, setError] = useState("");
  const home = user.role === "admin" ? "/admin" : "/cook";
  const nav =
    user.role === "admin"
      ? [
          { href: "/admin", label: "Статистика" },
          { href: "/admin/orders", label: "Заказы" },
        ]
      : [{ href: "/cook", label: "Заказы на сегодня" }];
  if (
    (pathname.startsWith("/admin") && user.role !== "admin") ||
    (pathname.startsWith("/cook") && user.role !== "cook")
  )
    return null;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4"
      >
        К содержимому
      </a>
      <header className="flex h-[76px] shrink-0 items-center gap-6 border-b border-line px-6 xl:px-8">
        <Link href={home} aria-label="Столовая — главная">
          <Brand />
        </Link>
        <span className="hidden border-l border-line pl-5 text-xs text-muted xl:block">
          Рабочее место {user.role === "admin" ? "администратора" : "повара"}
        </span>
        <nav
          className="ml-2 flex h-full items-center gap-5"
          aria-label="Основная навигация"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full items-center border-b-2 text-[13px] ${pathname === item.href ? "border-blue text-blue" : "border-transparent text-muted hover:text-ink"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden size-8 items-center justify-center rounded-full bg-[#e9e6e1] text-[11px] font-semibold sm:flex">
            {user.role === "admin" ? "АД" : "ПВ"}
          </span>
          <span className="hidden text-[13px] sm:block">{user.login}</span>
          <button
            aria-label="Выйти"
            title="Выйти"
            className="ml-2 rounded-lg p-2 text-muted hover:bg-neutral hover:text-ink"
            onClick={() => {
              void logout().catch((error) => setError(error.message));
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-6 py-9 lg:px-10 xl:px-16"
      >
        {error && <ErrorNotice message={error} />}
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 pb-6 text-[11px] text-muted lg:px-10 xl:px-16">
        <span>Столовая · Учёт школьного питания</span>
        <div className="flex gap-5">
          <Link
            href="/components"
            className="inline-flex items-center gap-1.5 hover:text-blue"
          >
            <BookOpen size={12} />
            Компоненты
          </Link>
          <Link href="/presentation-style" className="hover:text-blue">
            Стиль презентации
          </Link>
        </div>
      </footer>
    </div>
  );
}
