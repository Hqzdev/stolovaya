"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Circle, ArrowRight } from "lucide-react";
import type { OrderDetail, OrderStatus } from "@stolovaya/contracts";
import { useResource } from "@/lib/use-resource";
import { dateLabel, linkTo, number, portions, timeLabel } from "@/lib/format";
import { useApplication } from "./auth-provider";
import { useScope } from "./analytics-widgets";
import {
  Back,
  ErrorNotice,
  Heading,
  Loading,
  Panel,
  PanelHead,
  RuleNote,
  Status,
} from "./ui";

const steps: { status: OrderStatus; title: string; description: string }[] = [
  {
    status: "new",
    title: "Заказ добавлен",
    description: "Порции включены в план питания.",
  },
  {
    status: "cooking",
    title: "Приготовление начато",
    description: "Повар начал готовить блюдо.",
  },
  {
    status: "ready",
    title: "Блюдо готово",
    description: "Порции учтены в статистике выдачи.",
  },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useScope();
  const { timezone, user } = useApplication();
  const cook = user.role === "cook";
  const { data, error, loading, refresh } = useResource<OrderDetail>(
    `/orders/${encodeURIComponent(id)}`,
  );
  const order = data?.order;
  return (
    <>
      <Back href={linkTo(cook ? "/cook" : "/admin/orders", query)}>
        К списку заказов
      </Back>
      {loading && <Loading />}
      {error && <ErrorNotice message={error} retry={refresh} />}
      {order && data && (
        <>
          <Heading
            title={`Заказ #${order.id}`}
            subtitle={`${dateLabel(order.serviceDate)} · добавлен в ${timeLabel(order.createdAt, timezone)}`}
          >
            <Status status={order.status} />
          </Heading>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_328px]">
            <div className="flex min-w-0 flex-col gap-6">
              <Panel>
                <div className="p-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.6px]">
                    {cook ? (
                      order.dish
                    ) : (
                      <Link
                        className="hover:text-blue"
                        href={linkTo(`/admin/dishes/${order.dishId}`, query)}
                      >
                        {order.dish}
                      </Link>
                    )}
                  </h2>
                  <p className="mt-2 text-xs text-muted">
                    Блюдо для класса или группы
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-6 border-t border-line p-6 lg:grid-cols-4">
                  {[
                    ["Количество", portions(order.quantity)],
                    ["Класс / группа", order.group],
                    ["Подача", order.servingTime],
                    ["Готово в", timeLabel(order.readyAt, timezone)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="mb-2 text-xs text-muted">{label}</dt>
                      <dd className="text-lg font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel>
                <PanelHead title="История заказа" />
                <ol className="px-6 pb-6">
                  {steps.map((step, index) => {
                    const event = data.events.find(
                      (event) => event.status === step.status,
                    );
                    const Icon = event ? Check : Circle;
                    return (
                      <li
                        key={step.status}
                        className="relative flex gap-4 pb-7 last:pb-0"
                      >
                        {index < 2 && (
                          <span className="absolute top-8 bottom-0 left-4 w-px bg-line" />
                        )}
                        <span
                          className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full ${event ? "bg-blue-tint text-blue" : "bg-neutral text-muted"}`}
                        >
                          <Icon size={14} />
                        </span>
                        <div className="pt-1">
                          <h3 className="text-sm font-medium">{step.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {event
                              ? `${event.actor} · ${step.description}`
                              : step.status === "cooking"
                                ? "Приготовление ещё не началось."
                                : "Порции будут учтены после готовности."}
                          </p>
                        </div>
                        <span className="ml-auto shrink-0 pt-1 text-xs text-muted">
                          {event
                            ? timeLabel(event.happenedAt, timezone)
                            : "Ожидает"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </Panel>
              {!cook && (
                <Panel className="p-6">
                  <h2 className="mb-5 text-base font-semibold">
                    Связанные разделы
                  </h2>
                  <div className="flex flex-col gap-4 text-[13px] text-blue">
                    {[
                      [`/admin/dishes/${order.dishId}`, "Статистика блюда"],
                      [
                        `/admin/groups/${order.groupId}`,
                        `Статистика класса ${order.group}`,
                      ],
                      ["/admin/orders", "Все заказы этого блюда для класса"],
                    ].map(([path, label]) => (
                      <Link
                        key={path}
                        href={linkTo(
                          path,
                          query,
                          path === "/admin/orders"
                            ? { dish: order.dishId, group: order.groupId }
                            : {},
                        )}
                        className="flex justify-between"
                      >
                        {label}
                        <ArrowRight size={15} />
                      </Link>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
            <aside className="flex flex-col gap-6">
              <section className="rounded-xl bg-warm p-6">
                <p className="text-xs text-warm-ink">Учтено в выдаче</p>
                <div className="my-3 text-[56px] leading-none font-semibold tracking-[-1.5px] tabular-nums">
                  {order.status === "ready" ? number(order.quantity) : 0}
                </div>
                <h2 className="font-semibold">порций</h2>
                <p className="mt-3 text-[13px] leading-6 text-warm-ink">
                  {order.status === "ready"
                    ? `Отметка «Готово» сохранена в ${timeLabel(order.readyAt, timezone)}.`
                    : "Порции будут учтены после отметки «Готово»."}
                </p>
              </section>
              <Panel className="p-6">
                <h2 className="mb-5 text-base font-semibold">Данные заказа</h2>
                <dl className="flex flex-col gap-5">
                  {[
                    ["Номер", `#${order.id}`],
                    ["Повар", order.createdBy],
                    ["Дата", dateLabel(order.serviceDate)],
                    ["Источник", "Рабочее место повара"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="mb-1 text-xs text-muted">{label}</dt>
                      <dd className="text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </aside>
          </div>
          <RuleNote />
        </>
      )}
    </>
  );
}
