"use client";
import Link from "next/link";
import type { Analytics } from "@stolovaya/contracts";
import { useResource } from "@/lib/use-resource";
import { linkTo, timeLabel } from "@/lib/format";
import { useApplication } from "@/components/auth-provider";
import {
  AutoRefreshNote,
  BreakdownTable,
  DishBreakdown,
  IssuedChart,
  Metrics,
  PanelLink,
  PeriodControls,
  ScopeDescription,
  useScope,
} from "@/components/analytics-widgets";
import {
  ErrorNotice,
  Heading,
  Loading,
  Panel,
  PanelHead,
  RuleNote,
  Status,
} from "@/components/ui";

export default function AdminOverview() {
  const query = useScope();
  const { timezone } = useApplication();
  const { data, error, loading, refresh } = useResource<Analytics>(
    `/analytics?${query}`,
  );
  return (
    <>
      <Heading
        title="Статистика питания"
        subtitle="Все заказы и выдача порций в одном месте"
      >
        <PeriodControls />
      </Heading>
      {error && <ErrorNotice message={error} retry={refresh} />}
      {loading && <Loading />}
      {data && (
        <>
          <div className="-mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <ScopeDescription scope={data.scope} />
            <AutoRefreshNote updatedAt={data.updatedAt} />
          </div>
          <Metrics totals={data.totals} query={query} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-6">
              <IssuedChart analytics={data} query={query} />
              <Panel>
                <PanelHead title="По классам и группам">
                  <PanelLink href={linkTo("/admin/orders", query)}>
                    Все заказы
                  </PanelLink>
                </PanelHead>
                <BreakdownTable rows={data.groups} kind="group" query={query} />
                <div className="border-t border-line px-6 py-3 text-[11px] text-muted">
                  Готово / запланировано порций за выбранный период
                </div>
              </Panel>
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <DishBreakdown rows={data.dishes} query={query} />
              <Panel>
                <PanelHead title="Последние заказы">
                  <PanelLink href={linkTo("/admin/orders", query)}>
                    Все
                  </PanelLink>
                </PanelHead>
                <div className="px-6 pb-3">
                  {data.recent.map((order) => (
                    <Link
                      key={order.id}
                      href={linkTo(`/admin/orders/${order.id}`, query)}
                      className="block border-b border-line py-3 first:pt-0 last:border-0 hover:text-blue"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[13px] font-medium leading-5">
                          {order.dish}
                        </span>
                        <span className="pt-0.5 text-[11px] text-muted">
                          {timeLabel(order.createdAt, timezone)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted">
                          #{order.id} · {order.group} · {order.quantity} порций
                        </span>
                        <Status status={order.status} />
                      </div>
                    </Link>
                  ))}
                  {!data.recent.length && (
                    <p className="pb-8 text-sm text-muted">Пока нет заказов.</p>
                  )}
                </div>
              </Panel>
            </div>
          </div>
          <RuleNote />
        </>
      )}
    </>
  );
}
