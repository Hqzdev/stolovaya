"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import type { Catalog, OrderDetail } from "@stolovaya/contracts";
import { useApplication } from "@/components/auth-provider";
import { useResource } from "@/lib/use-resource";
import { api } from "@/lib/api";
import { dateLabel, portions } from "@/lib/format";
import {
  Back,
  Button,
  ButtonLink,
  ErrorNotice,
  Field,
  Heading,
  Input,
  Loading,
  Panel,
  Select,
  Status,
} from "@/components/ui";

export default function NewOrderPage() {
  const { today } = useApplication();
  const router = useRouter();
  const {
    data: catalog,
    error,
    loading,
    refresh,
  } = useResource<Catalog>("/catalog", false);
  const [draft, setDraft] = useState({
    dishId: "",
    groupId: "",
    quantity: "32",
    serviceDate: today,
    servingTime: "12:10",
  });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [created, setCreated] = useState<OrderDetail | null>(null);
  const update = (key: keyof typeof draft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      setSaveError("Введите целое число порций от 1 до 10 000.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.request<OrderDetail>("/orders", {
        method: "POST",
        body: JSON.stringify({ ...draft, quantity }),
      });
      setCreated(result);
      if (draft.serviceDate === today) router.push("/cook");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить заказ. Данные остались в форме.",
      );
    } finally {
      setBusy(false);
    }
  }
  const dish = catalog?.dishes.find((entry) => entry.id === draft.dishId)?.name;
  const group = catalog?.groups.find(
    (entry) => entry.id === draft.groupId,
  )?.name;
  return (
    <>
      <Back href="/cook">Все заказы</Back>
      <Heading
        title="Добавить блюдо"
        subtitle="Создайте заказ для класса или группы."
      />
      {loading && <Loading />}
      {error && <ErrorNotice message={error} retry={refresh} />}
      {created && (
        <section
          role="status"
          className="motion-block rounded-xl bg-blue-tint p-6"
        >
          <h2 className="mb-2 font-semibold">
            Заказ #{created.order.id} сохранён
          </h2>
          <p className="mb-4 text-sm">
            Он запланирован на {dateLabel(created.order.serviceDate)} и появится
            в списке повара в эту дату.
          </p>
          <ButtonLink
            href={`/cook/orders/${created.order.id}?date=${created.order.serviceDate}`}
          >
            Посмотреть заказ
          </ButtonLink>
        </section>
      )}
      {catalog && !created && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_328px]">
          <Panel>
            <form onSubmit={submit} className="flex flex-col gap-6 p-7">
              <div className="flex justify-between">
                <h2 className="text-lg font-semibold">Детали заказа</h2>
                <Status status="new" />
              </div>
              {saveError && <ErrorNotice message={saveError} />}
              {(!catalog.dishes.length || !catalog.groups.length) && (
                <ErrorNotice message="Справочники пока пусты. Ответственному за запуск нужно выполнить команду db:catalog." />
              )}
              <Field htmlFor="dish" label="Блюдо">
                <Select
                  id="dish"
                  value={draft.dishId}
                  required
                  onChange={(event) => update("dishId", event.target.value)}
                >
                  <option value="">Выберите блюдо</option>
                  {catalog.dishes.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field htmlFor="group" label="Класс / группа">
                  <Select
                    id="group"
                    value={draft.groupId}
                    required
                    onChange={(event) => update("groupId", event.target.value)}
                  >
                    <option value="">Выберите класс или группу</option>
                    {catalog.groups.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  htmlFor="quantity"
                  label="Количество порций"
                  hint="Целое число от 1 до 10 000"
                >
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    required
                    value={draft.quantity}
                    onChange={(event) => update("quantity", event.target.value)}
                  />
                </Field>
                <Field htmlFor="date" label="Дата заказа">
                  <Input
                    id="date"
                    type="date"
                    required
                    value={draft.serviceDate}
                    onChange={(event) =>
                      update("serviceDate", event.target.value)
                    }
                  />
                </Field>
                <Field htmlFor="servingTime" label="Время подачи">
                  <Input
                    id="servingTime"
                    type="time"
                    required
                    value={draft.servingTime}
                    onChange={(event) =>
                      update("servingTime", event.target.value)
                    }
                  />
                </Field>
              </div>
              <div className="flex gap-3 rounded-lg bg-paper p-4 text-xs leading-6 text-muted">
                <Info size={16} className="mt-1 shrink-0" />
                Заказ появится в списке со статусом «Новый». Когда блюдо будет
                готово, отметьте это в списке заказов.
              </div>
              <div className="flex justify-end gap-3 border-t border-line pt-5">
                <ButtonLink href="/cook" secondary>
                  Отмена
                </ButtonLink>
                <Button
                  type="submit"
                  busy={busy}
                  disabled={!catalog.dishes.length || !catalog.groups.length}
                >
                  Добавить блюдо
                </Button>
              </div>
            </form>
          </Panel>
          <aside className="flex flex-col gap-6">
            <section className="motion-block motion-surface rounded-xl bg-warm p-6">
              <p className="mb-4 text-[10px] font-medium tracking-[1px] text-warm-ink">
                НОВЫЙ ЗАКАЗ
              </p>
              <h2 className="text-2xl leading-tight font-semibold tracking-[-0.5px]">
                {dish || "Выберите блюдо"}
              </h2>
              <p className="my-5 text-[32px] leading-none font-semibold tracking-[-1px]">
                {portions(Math.max(0, Number(draft.quantity) || 0))}
              </p>
              <dl className="flex flex-col gap-4 border-t border-warm-ink/15 pt-5 text-xs">
                {[
                  ["Класс / группа", group || "—"],
                  [
                    "Дата",
                    draft.serviceDate
                      ? dateLabel(draft.serviceDate, true)
                      : "—",
                  ],
                  ["Время подачи", draft.servingTime || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-warm-ink">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="motion-block motion-surface rounded-xl border border-line p-6">
              <Check size={18} className="mb-3 text-blue" />
              <h2 className="mb-2 text-sm font-semibold">
                В статистику после готовности
              </h2>
              <p className="text-xs leading-6 text-muted">
                До отметки «Готово» эти порции входят только в план.
              </p>
            </section>
          </aside>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span>Добавьте блюдо</span>
        <ArrowRight size={12} />
        <span>Начните готовить</span>
        <ArrowRight size={12} />
        <span>Отметьте «Готово»</span>
      </div>
    </>
  );
}
