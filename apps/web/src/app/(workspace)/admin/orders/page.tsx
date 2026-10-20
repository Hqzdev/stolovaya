"use client";
import { useSearchParams } from "next/navigation";
import type { OrderPage } from "@stolovaya/contracts";
import { useResource } from "../../../../lib/use-resource";
import {
  useScope,
  PeriodControls,
} from "../../../../components/analytics-widgets";
import { OrderFilters } from "../../../../components/order-filters";
import { OrderTable, Pagination } from "../../../../components/order-table";
import {
  Back,
  ErrorNotice,
  Heading,
  Loading,
  Panel,
} from "../../../../components/ui";
import { linkTo, number } from "../../../../lib/format";

export default function AdminOrders() {
  const scope = useScope();
  const params = useSearchParams();
  const query = new URLSearchParams(params);
  for (const [key, value] of scope) query.set(key, value);
  const { data, error, loading, refresh } = useResource<OrderPage>(
    `/orders?${query}`,
  );
  return (
    <>
      <Back href={linkTo("/admin", scope)} />
      <Heading
        title="Заказы и выданные порции"
        subtitle="Подробные записи по выбранным фильтрам"
      >
        <PeriodControls />
      </Heading>
      {error && <ErrorNotice message={error} retry={refresh} />}
      {loading && <Loading />}
      {data && (
        <>
          <Panel>
            <OrderFilters counts={data.counts} />
            <OrderTable orders={data.items} query={query} />
            <Pagination page={data} query={query} path="/admin/orders" />
          </Panel>
          <p className="text-xs text-muted">
            По фильтрам:{" "}
            <strong className="font-medium text-ink">
              {number(data.totals.issued)}
            </strong>{" "}
            порций выдано из{" "}
            <strong className="font-medium text-ink">
              {number(data.totals.planned)}
            </strong>
            . Нажмите на заказ, чтобы посмотреть состав и историю.
          </p>
        </>
      )}
    </>
  );
}
