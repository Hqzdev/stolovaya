"use client";
import { useState } from "react";
import { Check, Database, FlaskConical, LockKeyhole } from "lucide-react";
import type { DataMode, WorkspaceSettings } from "@stolovaya/contracts";
import { useAuth } from "@/components/auth-provider";
import {
  Button,
  ErrorNotice,
  Heading,
  Loading,
  Panel,
  PanelHead,
} from "@/components/ui";
import { api } from "@/lib/api";
import { dateLabel, number } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

export default function SettingsPage() {
  const { data, error, loading, refresh } =
    useResource<WorkspaceSettings>("/settings");
  const { refreshContext } = useAuth();
  const [notice, setNotice] = useState("");
  return (
    <>
      <Heading
        title="Настройки"
        subtitle="Режим данных для администратора и повара"
      />
      {error && <ErrorNotice message={error} retry={refresh} />}
      {loading && <Loading />}
      {notice && (
        <p
          role="status"
          className="motion-block flex items-center gap-2 rounded-lg bg-blue-tint px-4 py-3 text-sm text-blue"
        >
          <Check size={16} />
          {notice}
        </p>
      )}
      {data && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_328px]">
          <ModeForm
            key={data.version}
            settings={data}
            onSave={async (mode) => {
              await api.request<WorkspaceSettings>("/settings/data-mode", {
                method: "PATCH",
                body: JSON.stringify({ mode, version: data.version }),
              });
              await refreshContext();
              refresh();
              setNotice(
                mode === "demo"
                  ? "Демо включено для обоих кабинетов."
                  : "Включены рабочие данные для обоих кабинетов.",
              );
            }}
          />
          <aside className="flex flex-col gap-6">
            <section className="motion-block rounded-xl bg-warm p-6">
              <FlaskConical size={22} className="mb-4 text-warm-ink" />
              <h2 className="text-lg font-semibold">
                Можно проверить весь путь
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-warm-ink">
                В демо повар создаёт заказы и меняет статусы, администратор
                видит результат в аналитике. Изменения остаются в
                демонстрационном наборе.
              </p>
              <div className="mt-5 border-t border-warm-ink/15 pt-5 text-[13px] leading-6">
                <p className="font-medium">Начальные показатели демо</p>
                <p>За день — 174 из 246 порций</p>
                <p>За неделю — 994 из 1164 порций</p>
                <p className="mt-2 text-xs text-warm-ink">
                  Пример данных. После действий повара показатели изменятся.
                </p>
              </div>
            </section>
            <Panel className="p-6">
              <LockKeyhole size={20} className="mb-3 text-blue" />
              <h2 className="text-sm font-semibold">Данные сохраняются</h2>
              <p className="mt-2 text-xs leading-6 text-muted">
                Переключение доступно администратору и действует для обоих
                аккаунтов. Открытые кабинеты обновляются автоматически в течение
                15 секунд.
              </p>
              <p className="mt-3 text-xs leading-6 text-muted">
                Заказы, их история и выбранный режим сохраняются после
                перезапуска. Справочник блюд и классов общий.
              </p>
            </Panel>
          </aside>
        </div>
      )}
    </>
  );
}

function ModeForm({
  settings,
  onSave,
}: {
  settings: WorkspaceSettings;
  onSave(mode: DataMode): Promise<void>;
}) {
  const [mode, setMode] = useState(settings.mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const options = [
    {
      value: "live" as const,
      title: "Рабочие данные",
      description: "Настоящие заказы и статистика столовой",
      count: settings.liveOrders,
      Icon: Database,
    },
    {
      value: "demo" as const,
      title: "Демонстрационные данные",
      description: "Отдельный набор для проверки всех функций",
      count: settings.demoOrders,
      Icon: FlaskConical,
    },
  ];
  return (
    <Panel>
      <PanelHead
        title="Данные приложения"
        description="Выберите, с каким набором будут работать оба кабинета."
      />
      <form
        className="flex flex-col gap-6 px-6 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          void onSave(mode)
            .catch((error: unknown) =>
              setError(
                error instanceof Error
                  ? error.message
                  : "Не удалось переключить режим.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        {error && <ErrorNotice message={error} />}
        <fieldset className="grid gap-4 lg:grid-cols-2" disabled={busy}>
          <legend className="sr-only">Режим данных</legend>
          {options.map(({ value, title, description, count, Icon }) => (
            <label
              key={value}
              className={`motion-card relative cursor-pointer rounded-xl border p-5 transition-colors focus-within:ring-2 focus-within:ring-blue/30 ${mode === value ? "border-blue bg-blue-tint/40" : "border-line hover:bg-paper/50"}`}
            >
              <div className="mb-5 flex items-center justify-between">
                <Icon
                  size={23}
                  className={mode === value ? "text-blue" : "text-muted"}
                />
                <input
                  type="radio"
                  name="dataMode"
                  value={value}
                  aria-label={title}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="size-4 accent-blue"
                />
              </div>
              <span className="block text-[15px] font-semibold">{title}</span>
              <span className="mt-2 block min-h-10 text-xs leading-5 text-muted">
                {description}
              </span>
              <span className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="text-muted">
                  Заказов:{" "}
                  <strong className="font-medium text-ink">
                    {number(count)}
                  </strong>
                </span>
                {settings.mode === value && (
                  <span className="font-medium text-blue">Активен</span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs leading-6 text-muted">
          {settings.demoDate
            ? `Дата демонстрационного набора — ${dateLabel(settings.demoDate)}. В демо она используется как «сегодня» для обоих кабинетов.`
            : "При первом включении демо будут подготовлены 44 заказа на неделю. Повторное переключение вернёт сохранённый набор."}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="text-xs text-muted">
            Рабочие и демонстрационные заказы хранятся отдельно.
          </p>
          <Button type="submit" busy={busy} disabled={mode === settings.mode}>
            {mode === "demo" ? "Включить демо" : "Включить рабочие данные"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
