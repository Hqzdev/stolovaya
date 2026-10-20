"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Catalog, OrderPage } from "@stolovaya/contracts";
import { useResource } from "@/lib/use-resource";
import { Button, Input, Select } from "./ui";

export function OrderFilters({
  counts,
  cook = false,
}: {
  counts: OrderPage["counts"];
  cook?: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: catalog } = useResource<Catalog>("/catalog");
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`${pathname}?${next}`);
  }
  const filtered = ["status", "dish", "group", "q", "hour", "on"].some((key) =>
    params.has(key),
  );
  function clear() {
    const next = new URLSearchParams(params);
    for (const key of ["status", "dish", "group", "q", "hour", "on", "page"])
      next.delete(key);
    router.push(`${pathname}?${next}`);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div className="flex gap-5" aria-label="Статус заказов">
          {(["all", "new", "cooking", "ready"] as const).map((status) => (
            <button
              onClick={() => update("status", status)}
              key={status}
              aria-pressed={(params.get("status") || "all") === status}
              className={`motion-control border-b-2 py-2 text-[13px] ${(params.get("status") || "all") === status ? "border-blue text-blue" : "border-transparent text-muted hover:text-ink"}`}
            >
              {
                {
                  all: "Все",
                  new: "Новые",
                  cooking: "Готовятся",
                  ready: "Готово",
                }[status]
              }{" "}
              <span className="ml-1 text-xs">{counts[status]}</span>
            </button>
          ))}
        </div>
        <form
          key={params.get("q") || ""}
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update(
              "q",
              String(new FormData(event.currentTarget).get("q")).trim(),
            );
          }}
        >
          <Input
            name="q"
            aria-label="Найти блюдо, класс или заказ"
            defaultValue={params.get("q") || ""}
            placeholder={cook ? "Найти блюдо" : "Блюдо, класс или № заказа"}
            className="h-9 max-w-[235px] text-xs"
            maxLength={100}
          />
          <Button
            type="submit"
            secondary
            className="min-h-9 px-3"
            aria-label="Найти"
          >
            <Search size={15} />
          </Button>
        </form>
      </div>
      {(!cook || filtered) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3">
          {!cook && (
            <>
              <Select
                aria-label="Блюдо"
                className="h-9 max-w-[240px] text-xs"
                value={params.get("dish") || ""}
                onChange={(event) => update("dish", event.target.value)}
              >
                <option value="">Все блюда</option>
                {catalog?.dishes.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Класс или группа"
                className="h-9 max-w-[190px] text-xs"
                value={params.get("group") || ""}
                onChange={(event) => update("group", event.target.value)}
              >
                <option value="">Все классы и группы</option>
                {catalog?.groups.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </>
          )}
          {params.get("status") === "pending" && (
            <span className="rounded-md bg-blue-tint px-3 py-2 text-xs text-blue">
              Новые и готовящиеся
            </span>
          )}
          {params.get("hour") && (
            <span className="rounded-md bg-blue-tint px-3 py-2 text-xs text-blue">
              Выдано в {params.get("hour")}:00–{params.get("hour")}:59
            </span>
          )}
          {params.get("on") && (
            <span className="rounded-md bg-blue-tint px-3 py-2 text-xs text-blue">
              {params.get("on")}
            </span>
          )}
          {filtered && (
            <button
              onClick={clear}
              className="ml-auto inline-flex items-center gap-1 text-xs text-blue"
            >
              <X size={12} />
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </>
  );
}
