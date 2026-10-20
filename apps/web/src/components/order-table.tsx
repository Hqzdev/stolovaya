"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ArrowDownUp } from "lucide-react";
import type { Order, OrderPage } from "@stolovaya/contracts";
import { useApplication } from "./auth-provider";
import { dateLabel, linkTo, number, timeLabel } from "@/lib/format";
import { Button, Empty, Status } from "./ui";

export function OrderTable({
  orders,
  query,
  cook = false,
  busyId,
  onTransition,
}: {
  orders: Order[];
  query: URLSearchParams;
  cook?: boolean;
  busyId?: number;
  onTransition?: (order: Order) => void;
}) {
  const { timezone } = useApplication();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  function sort() {
    const next = new URLSearchParams(params);
    next.set("sort", params.get("sort") === "qty" ? "qty-asc" : "qty");
    next.delete("page");
    router.push(`${pathname}?${next}`);
  }
  if (!orders.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13px] tabular-nums">
        <thead>
          <tr className="h-10 border-y border-line bg-[#faf9f8] text-[11px] text-muted">
            <th className="w-[32%] px-6 font-medium">Блюдо</th>
            <th className="px-4 font-medium">Класс / группа</th>
            <th className="px-4 font-medium">
              <button onClick={sort} className="inline-flex items-center gap-1">
                Порции <ArrowDownUp size={11} />
              </button>
            </th>
            <th className="px-4 font-medium">Добавлено</th>
            <th className="px-4 font-medium">Статус</th>
            <th className="px-6 font-medium">
              {cook ? "Действие" : "Готово в"}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="h-[58px] border-b border-line last:border-0 hover:bg-blue-tint/30"
            >
              <td className="px-6 py-2">
                <Link
                  href={linkTo(
                    `${cook ? "/cook" : "/admin"}/orders/${order.id}`,
                    query,
                  )}
                  className="font-medium hover:text-blue"
                >
                  {order.dish}
                </Link>
                <div className="mt-1 text-[11px] text-muted">#{order.id}</div>
              </td>
              <td className="px-4">
                {cook ? (
                  order.group
                ) : (
                  <Link
                    href={linkTo(`/admin/groups/${order.groupId}`, query)}
                    className="hover:text-blue"
                  >
                    {order.group}
                  </Link>
                )}
              </td>
              <td className="px-4 font-medium">{number(order.quantity)}</td>
              <td className="px-4">
                <span>{timeLabel(order.createdAt, timezone)}</span>
                {query.get("period") === "week" && (
                  <div className="mt-1 text-[11px] text-muted">
                    {dateLabel(order.serviceDate, true)}
                  </div>
                )}
              </td>
              <td className="px-4">
                <Status status={order.status} />
              </td>
              <td className="px-6">
                {cook && order.status !== "ready" && onTransition ? (
                  <Button
                    secondary={order.status === "new"}
                    busy={busyId === order.id}
                    disabled={busyId !== undefined}
                    onClick={() => onTransition(order)}
                    className="min-h-8 px-3 py-1 text-xs"
                  >
                    {order.status === "new" ? "Начать" : "Готово"}
                  </Button>
                ) : (
                  <span className="flex items-center justify-between gap-2 text-xs text-muted">
                    {timeLabel(order.readyAt, timezone)}
                    {!cook && (
                      <Link
                        href={linkTo(`/admin/orders/${order.id}`, query)}
                        aria-label={`Открыть заказ ${order.id}`}
                      >
                        <ChevronRight size={15} />
                      </Link>
                    )}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  query,
  path,
}: {
  page: OrderPage;
  query: URLSearchParams;
  path: string;
}) {
  const count = Math.ceil(page.total / page.pageSize);
  const candidates = [
    ...new Set([1, page.page - 1, page.page, page.page + 1, count]),
  ]
    .filter((value) => value > 0 && value <= count)
    .sort((a, b) => a - b);
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3 text-xs text-muted">
      <span>
        {page.total
          ? `${(page.page - 1) * page.pageSize + 1}–${Math.min(page.total, page.page * page.pageSize)} из ${page.total}`
          : "0 заказов"}{" "}
        · {number(page.totals.planned)} порций
      </span>
      {count > 1 && (
        <nav aria-label="Страницы заказов" className="flex gap-1">
          {candidates.map((value, index) => (
            <span key={value} className="flex items-center gap-1">
              {index > 0 && value - candidates[index - 1] > 1 && (
                <span className="px-2">…</span>
              )}
              <Link
                href={linkTo(path, query, { page: value })}
                aria-current={page.page === value ? "page" : undefined}
                className={`grid size-8 place-items-center rounded-md ${page.page === value ? "bg-blue-tint text-blue" : "hover:bg-neutral"}`}
              >
                {value}
              </Link>
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}
