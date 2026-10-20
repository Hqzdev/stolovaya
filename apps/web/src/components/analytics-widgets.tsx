"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, ChevronRight } from "lucide-react";
import type { Analytics, Breakdown, Scope, Totals } from "@stolovaya/contracts";
import { useApplication } from "./auth-provider";
import { dateLabel, linkTo, number, scopeQuery } from "@/lib/format";
import { Input, Panel, PanelHead, Arrow } from "./ui";

export function PeriodControls() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { today } = useApplication();
  const period = params.get("period") || "day";
  function update(values: Record<string, string>) {
    const query = new URLSearchParams(params);
    query.delete("page");
    for (const [key, value] of Object.entries(values)) query.set(key, value);
    router.push(`${pathname}?${query}`);
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg bg-neutral p-1" aria-label="Период">
        {[
          ["day", "День"],
          ["week", "Неделя"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => update({ period: value })}
            aria-pressed={period === value}
            className={`motion-control rounded-md px-4 py-2 text-[13px] font-medium ${period === value ? "bg-white text-ink" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="w-[170px]">
        <Input
          aria-label="Дата периода"
          type="date"
          value={params.get("date") || today}
          onChange={(event) => {
            if (event.target.value) update({ date: event.target.value });
          }}
        />
      </div>
    </div>
  );
}

export function Metrics({
  totals,
  query,
  entity = {},
}: {
  totals: Totals;
  query: URLSearchParams;
  entity?: Record<string, string>;
}) {
  const metrics = [
    {
      label: "Выдано порций",
      value: totals.issued,
      context: `из ${number(totals.planned)} запланированных`,
      filter: "ready",
      primary: true,
    },
    {
      label: "В плане",
      value: totals.planned,
      context: "порций за выбранный период",
      filter: "all",
    },
    {
      label: "Готово заказов",
      value: `${number(totals.ready)} / ${number(totals.orders)}`,
      context: "выполнено из общего числа",
      filter: "ready",
    },
    {
      label: "Осталось выдать",
      value: totals.planned - totals.issued,
      context: `${totals.fresh + totals.cooking} заказов в работе`,
      filter: "pending",
    },
  ];
  return (
    <div className="motion-block grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_1fr]">
      {metrics.map((metric) => (
        <Link
          key={metric.label}
          href={linkTo("/admin/orders", query, {
            ...entity,
            status: metric.filter,
          })}
          className={`motion-item motion-card group relative flex min-h-[135px] flex-col justify-center gap-2 px-6 py-5 ${metric.primary ? "bg-warm hover:bg-[#ffe9b5]" : "hover:bg-paper"}`}
        >
          <ArrowUpRight
            size={16}
            className="absolute top-5 right-5 text-muted transition group-hover:text-blue"
          />
          <span
            className={`text-xs ${metric.primary ? "text-warm-ink" : "text-muted"}`}
          >
            {metric.label}
          </span>
          <span
            key={metric.value}
            className={`motion-item font-semibold tracking-[-1px] tabular-nums ${metric.primary ? "text-[46px] leading-none" : "text-[30px] leading-tight"}`}
          >
            {typeof metric.value === "number"
              ? number(metric.value)
              : metric.value}
          </span>
          <span
            className={`text-[11px] ${metric.primary ? "text-warm-ink" : "text-muted"}`}
          >
            {metric.context}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function IssuedChart({
  analytics,
  query,
}: {
  analytics: Analytics;
  query: URLSearchParams;
}) {
  const maximum = Math.max(1, ...analytics.chart.map((point) => point.issued));
  const count = analytics.chart.length,
    unit = 700 / count;
  return (
    <Panel>
      <PanelHead
        title={
          analytics.scope.period === "day"
            ? "Выдача в течение дня"
            : "Выдача за неделю"
        }
      >
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-2 rounded-sm bg-blue" />
          Порции
        </span>
      </PanelHead>
      <div className="px-6 pb-4">
        <svg
          key={`${analytics.scope.date}:${analytics.scope.period}`}
          viewBox="0 0 700 170"
          className="h-[170px] w-full"
          role="img"
          aria-label="Количество выданных порций; нажмите на столбец, чтобы открыть заказы"
        >
          <line x1="0" x2="700" y1="138" y2="138" stroke="#efeeec" />
          {analytics.chart.map((point, index) => {
            const height = point.issued
              ? Math.max(3, (point.issued / maximum) * 100)
              : 2;
            const href = linkTo("/admin/orders", query, {
              status: "ready",
              ...(analytics.scope.period === "day"
                ? { hour: point.key }
                : { on: point.key }),
            });
            return (
              <a
                href={href}
                key={point.key}
                className="group"
                aria-label={`${point.label}: ${point.issued} порций, открыть заказы`}
              >
                <rect
                  x={index * unit + 4}
                  y="0"
                  width={unit - 8}
                  height="167"
                  rx="5"
                  className="motion-chart-hit fill-transparent group-hover:fill-blue-tint"
                />
                <text
                  className="motion-chart-label"
                  data-motion-step={Math.min(index, 5)}
                  x={index * unit + unit / 2}
                  y={128 - height}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#111111"
                >
                  {point.issued}
                </text>
                <rect
                  className="motion-chart-bar"
                  data-motion-step={Math.min(index, 5)}
                  x={index * unit + unit * 0.22}
                  y={138 - height}
                  width={unit * 0.56}
                  height={height}
                  rx="3"
                  fill={point.issued ? "#0075de" : "#dedbd7"}
                />
                <text
                  x={index * unit + unit / 2}
                  y="160"
                  textAnchor="middle"
                  fontSize={11}
                  fill="#757575"
                >
                  {point.label}
                </text>
              </a>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}

export function DishBreakdown({
  rows,
  query,
}: {
  rows: Breakdown[];
  query: URLSearchParams;
}) {
  return (
    <Panel>
      <PanelHead title="По блюдам">
        <Link
          href={linkTo("/admin/orders", query)}
          className="text-xs text-blue"
        >
          Все заказы
        </Link>
      </PanelHead>
      <div className="flex min-h-[186px] flex-col justify-center gap-5 px-6 pb-6">
        {rows.length ? (
          rows.map((row) => (
            <Link
              href={linkTo(`/admin/dishes/${row.id}`, query)}
              key={row.id}
              className="motion-item group"
            >
              <div className="mb-2 flex justify-between gap-3 text-[13px]">
                <span className="font-medium group-hover:text-blue">
                  {row.name}
                </span>
                <span className="whitespace-nowrap text-xs text-muted tabular-nums">
                  {row.issued} / {row.planned}
                </span>
              </div>
              <svg
                viewBox="0 0 400 5"
                preserveAspectRatio="none"
                className="h-[5px] w-full"
                aria-hidden
              >
                <rect width="400" height="5" rx="2.5" fill="#efeeec" />
                <rect
                  className="motion-progress"
                  width={row.planned ? (row.issued / row.planned) * 400 : 0}
                  height="5"
                  rx="2.5"
                  fill="#80b1db"
                />
              </svg>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted">За выбранный период нет заказов.</p>
        )}
      </div>
    </Panel>
  );
}

export function BreakdownTable({
  rows,
  kind,
  query,
}: {
  rows: Breakdown[];
  kind: "dish" | "group";
  query: URLSearchParams;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px] tabular-nums">
        <thead>
          <tr className="h-10 border-y border-line bg-[#faf9f8] text-[11px] font-medium text-muted">
            <th className="px-6 font-medium">
              {kind === "group" ? "Класс / группа" : "Блюдо"}
            </th>
            <th className="px-4 font-medium">Выдано</th>
            <th className="px-4 font-medium">План</th>
            <th className="px-4 font-medium">Осталось</th>
            <th className="px-6 font-medium">Готовность</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="motion-row h-[55px] border-b border-line last:border-0 hover:bg-blue-tint/40"
            >
              <td className="px-6">
                <Link
                  href={linkTo(
                    `/admin/${kind === "group" ? "groups" : "dishes"}/${row.id}`,
                    query,
                  )}
                  className="flex items-center gap-2 font-medium hover:text-blue"
                >
                  {row.name}
                  <ChevronRight size={13} className="text-muted" />
                </Link>
              </td>
              <td className="px-4 font-medium">{number(row.issued)}</td>
              <td className="px-4">{number(row.planned)}</td>
              <td className="px-4 text-muted">
                {number(row.planned - row.issued)}
              </td>
              <td className="px-6">
                <span className="flex items-center gap-3">
                  <svg viewBox="0 0 100 5" className="h-[5px] w-20" aria-hidden>
                    <rect width="100" height="5" rx="2.5" fill="#efeeec" />
                    <rect
                      className="motion-progress"
                      width={row.planned ? (row.issued / row.planned) * 100 : 0}
                      height="5"
                      rx="2.5"
                      fill="#0075de"
                    />
                  </svg>
                  <span className="text-xs text-muted">
                    {row.planned
                      ? Math.round((row.issued / row.planned) * 100)
                      : 0}
                    %
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="px-6 py-12 text-center text-sm text-muted">
          Нет данных за выбранный период.
        </p>
      )}
    </div>
  );
}

export function ScopeDescription({ scope }: { scope: Scope }) {
  return (
    <span>
      {scope.period === "week"
        ? `${dateLabel(scope.from, true)} — ${dateLabel(scope.to)}`
        : dateLabel(scope.date)}
    </span>
  );
}
export function AutoRefreshNote({ updatedAt }: { updatedAt?: string }) {
  const { timezone } = useApplication();
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <Check size={12} />
      {updatedAt
        ? `Обновлено в ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(updatedAt))}`
        : "Обновляется каждые 15 секунд"}
    </span>
  );
}
export function useScope() {
  const params = useSearchParams();
  const { today } = useApplication();
  return scopeQuery(new URLSearchParams(params), today);
}
export function PanelLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="motion-link flex items-center gap-1.5 text-xs text-blue"
    >
      {children}
      <Arrow />
    </Link>
  );
}
