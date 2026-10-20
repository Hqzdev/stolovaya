"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { EntityAnalytics } from "@stolovaya/contracts";
import { useResource } from "@/lib/use-resource";
import { linkTo } from "@/lib/format";
import {
  BreakdownTable,
  Metrics,
  PeriodControls,
  ScopeDescription,
  useScope,
} from "./analytics-widgets";
import {
  Back,
  ErrorNotice,
  Heading,
  Loading,
  Panel,
  PanelHead,
  RuleNote,
} from "./ui";
import { OrderTable, Pagination } from "./order-table";

export function EntityPage({ kind }: { kind: "dish" | "group" }) {
  const { id } = useParams<{ id: string }>();
  const scope = useScope();
  const params = useSearchParams();
  const query = new URLSearchParams(scope);
  if (params.get("page")) query.set("page", params.get("page")!);
  if (params.get("sort")) query.set("sort", params.get("sort")!);
  const plural = kind === "dish" ? "dishes" : "groups";
  const path = `/admin/${plural}/${id}`;
  const { data, error, loading, refresh } = useResource<EntityAnalytics>(
    `/analytics/${plural}/${encodeURIComponent(id)}?${query}`,
  );
  return (
    <>
      <Back href={linkTo("/admin", scope)} />
      {loading && <Loading />}
      {error && <ErrorNotice message={error} retry={refresh} />}
      {data && (
        <>
          <Heading
            title={
              kind === "dish" ? data.entity.name : `Класс ${data.entity.name}`
            }
            subtitle={
              kind === "dish"
                ? "Выдача блюда и связанные заказы"
                : "Питание класса и связанные заказы"
            }
          >
            <PeriodControls />
          </Heading>
          <Metrics totals={data.totals} query={scope} entity={{ [kind]: id }} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_328px]">
            <div className="flex min-w-0 flex-col gap-6">
              <Panel>
                <PanelHead
                  title={kind === "dish" ? "По классам и группам" : "По блюдам"}
                />
                <BreakdownTable
                  kind={kind === "dish" ? "group" : "dish"}
                  rows={kind === "dish" ? data.groups : data.dishes}
                  query={scope}
                />
                <div className="flex justify-end border-t border-line px-6 py-3">
                  <Link
                    href={linkTo("/admin/orders", scope, { [kind]: id })}
                    className="text-xs text-blue"
                  >
                    Все связанные заказы →
                  </Link>
                </div>
              </Panel>
              <Panel>
                <PanelHead title="Заказы">
                  <span className="text-xs text-muted">
                    {data.orders.total} записей
                  </span>
                </PanelHead>
                <OrderTable orders={data.orders.items} query={scope} />
                <Pagination page={data.orders} query={query} path={path} />
              </Panel>
            </div>
            <aside className="flex flex-col gap-6">
              <Panel className="p-6">
                <h2 className="mb-5 text-base font-semibold">
                  {kind === "dish" ? "Сведения о блюде" : "Сведения о классе"}
                </h2>
                <dl className="flex flex-col gap-5 text-sm">
                  <div>
                    <dt className="mb-1 text-xs text-muted">
                      {kind === "dish" ? "Блюдо" : "Класс / группа"}
                    </dt>
                    <dd className="font-medium">{data.entity.name}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs text-muted">Период</dt>
                    <dd>
                      <ScopeDescription scope={data.scope} />
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs text-muted">Готово заказов</dt>
                    <dd className="font-medium">
                      {data.totals.ready} из {data.totals.orders}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs text-muted">
                      Готовность плана
                    </dt>
                    <dd className="font-medium">
                      {data.totals.planned
                        ? Math.round(
                            (data.totals.issued / data.totals.planned) * 100,
                          )
                        : 0}
                      %
                    </dd>
                  </div>
                </dl>
              </Panel>
              <section className="rounded-xl bg-blue-tint p-6">
                <h2 className="mb-3 text-base font-semibold">
                  Как считаются порции
                </h2>
                <p className="text-[13px] leading-6">
                  В выдачу входят заказы со статусом «Готово». Новые и
                  готовящиеся заказы учитываются в плане.
                </p>
              </section>
            </aside>
          </div>
          <RuleNote />
        </>
      )}
    </>
  );
}
