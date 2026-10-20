"use client";
import { useSearchParams } from "next/navigation";
import { Check, Plus, Info } from "lucide-react";
import { useState } from "react";
import type { Catalog, Order, OrderPage } from "@stolovaya/contracts";
import { useApplication } from "@/components/auth-provider";
import { useResource } from "@/lib/use-resource";
import { api } from "@/lib/api";
import { dateLabel, number } from "@/lib/format";
import { AutoRefreshNote } from "@/components/analytics-widgets";
import { OrderFilters } from "@/components/order-filters";
import { OrderTable, Pagination } from "@/components/order-table";
import {
  ButtonLink,
  Empty,
  ErrorNotice,
  Heading,
  Loading,
  Panel,
  PanelHead,
} from "@/components/ui";

export default function CookOrders() {
  const { today } = useApplication();
  const params = useSearchParams();
  const query = new URLSearchParams(params);
  query.set("date", today);
  query.set("period", "day");
  const { data, error, loading, refresh } = useResource<OrderPage>(
    `/orders?${query}`,
  );
  const { data: all, refresh: refreshAll } = useResource<OrderPage>(
    `/orders?date=${today}`,
  );
  const { data: catalog } = useResource<Catalog>("/catalog", false);
  const [busyId, setBusyId] = useState<number>();
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  async function transition(order: Order) {
    setBusyId(order.id);
    setActionError("");
    setSuccess("");
    try {
      await api.request(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: order.status === "new" ? "cooking" : "ready",
        }),
      });
      setSuccess(
        order.status === "new"
          ? `Приготовление заказа #${order.id} начато.`
          : `Готовность сохранена. ${order.quantity} порций учтены в выдаче.`,
      );
      refresh();
      refreshAll();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Не удалось сохранить статус.",
      );
    } finally {
      setBusyId(undefined);
    }
  }
  const totals = all?.totals;
  return (
    <>
      <Heading title="Заказы на сегодня" subtitle={dateLabel(today)}>
        <ButtonLink href="/cook/orders/new">
          <Plus size={16} />
          Добавить блюдо
        </ButtonLink>
      </Heading>
      {(error || actionError) && (
        <ErrorNotice message={actionError || error!} retry={refresh} />
      )}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-blue-tint px-4 py-3 text-sm text-blue"
        >
          <Check size={16} />
          {success}
        </div>
      )}
      {totals && (
        <div className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr_1fr]">
          {[
            {
              label: "порции выдано",
              value: totals.issued,
              hint: "Заказы со статусом «Готово»",
              primary: true,
            },
            {
              label: "В плане",
              value: totals.planned,
              hint: "порций на сегодня",
            },
            {
              label: "Готовится",
              value: totals.cookingPortions,
              hint: `порций · ${totals.cooking} заказа`,
            },
            {
              label: "Новые",
              value: totals.newPortions,
              hint: `порций · ${totals.fresh} заказ`,
            },
          ].map((metric) => (
            <div
              className={`flex min-h-[135px] flex-col justify-center gap-2 px-6 py-5 ${metric.primary ? "bg-warm" : ""}`}
              key={metric.label}
            >
              {!metric.primary && (
                <p className="text-xs text-muted">{metric.label}</p>
              )}
              <span
                className={`font-semibold leading-none tracking-[-1px] tabular-nums ${metric.primary ? "text-[46px]" : "text-[30px]"}`}
              >
                {number(metric.value)}
              </span>
              {metric.primary && (
                <span className="text-sm font-medium">{metric.label}</span>
              )}
              <span
                className={`text-[11px] ${metric.primary ? "text-warm-ink" : "text-muted"}`}
              >
                {metric.hint}
              </span>
            </div>
          ))}
        </div>
      )}
      {loading && <Loading />}
      {data && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel>
            <OrderFilters counts={data.counts} cook />
            {!data.total && !params.get("q") && !params.get("status") ? (
              <Empty
                title="Пока нет заказов"
                description="Добавьте первое блюдо для класса или группы."
              >
                <ButtonLink href="/cook/orders/new">
                  <Plus size={15} />
                  Добавить блюдо
                </ButtonLink>
              </Empty>
            ) : (
              <OrderTable
                orders={data.items}
                query={query}
                cook
                busyId={busyId}
                onTransition={transition}
              />
            )}
            <Pagination page={data} query={query} path="/cook" />
          </Panel>
          <aside className="flex flex-col gap-6">
            <Panel>
              <PanelHead
                title="По классам и группам"
                description="Готово / запланировано порций"
              />
              <CookGroups catalog={catalog} today={today} revision={success} />
            </Panel>
            <section className="rounded-xl border border-line p-6">
              <Info size={17} className="mb-3 text-blue" />
              <h2 className="mb-2 text-sm font-semibold">
                Готово — значит учтено
              </h2>
              <p className="text-xs leading-6 text-muted">
                После отметки «Готово» порции попадут в статистику
                администратора как выданные.
              </p>
              {totals && (
                <p className="mt-4 text-xs font-medium">
                  Готово {totals.ready} из {totals.orders} заказов
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
      <div className="flex justify-end">
        <AutoRefreshNote />
      </div>
    </>
  );
}

function CookGroups({
  catalog,
  today,
  revision,
}: {
  catalog?: Catalog | null;
  today: string;
  revision: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-6 pb-6">
      {catalog?.groups.map((group) => (
        <CookGroup
          key={`${group.id}-${revision}`}
          id={group.id}
          name={group.name}
          today={today}
        />
      ))}
    </div>
  );
}
function CookGroup({
  id,
  name,
  today,
}: {
  id: string;
  name: string;
  today: string;
}) {
  const { data } = useResource<OrderPage>(`/orders?date=${today}&group=${id}`);
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted tabular-nums">
        {data ? `${data.totals.issued} / ${data.totals.planned}` : "…"}
      </span>
    </div>
  );
}
