import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Heading, Panel, PanelHead } from "@/components/ui";

export default function PresentationStylePage() {
  return (
    <>
      <Heading
        title="Дизайн-код презентации"
        subtitle="Как оформлять слайды о Столовой в том же стиле, что и приложение."
      />
      <nav
        className="flex flex-wrap gap-3 text-xs text-blue"
        aria-label="Разделы дизайн-кода"
      >
        {[
          ["canvas", "Формат"],
          ["type", "Текст"],
          ["buttons", "Кнопки"],
          ["blocks", "Блоки"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-lg border border-line bg-white px-4 py-2 hover:bg-blue-tint"
          >
            {label}
          </a>
        ))}
      </nav>
      <Panel>
        <div id="canvas" className="grid gap-8 p-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-3 text-xs font-medium tracking-widest text-muted">
              ФОРМАТ
            </p>
            <h2 className="text-3xl font-semibold tracking-[-1px]">
              Пространство для смысла
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
              Слайд 1920 × 1080, безопасные поля 100 px. Одна главная мысль,
              крупный заголовок и реальный экран приложения.
            </p>
            <p className="mt-5 text-sm font-medium">
              Тёплый фон · простые блоки · ясные подписи
            </p>
          </div>
          <div className="aspect-video rounded-xl border border-line bg-paper p-8">
            <div className="flex h-full flex-col justify-between">
              <span className="text-[10px] font-medium tracking-widest text-muted">
                СТОЛОВАЯ / УЧЁТ ПИТАНИЯ
              </span>
              <div>
                <h3 className="text-[30px] leading-tight font-semibold tracking-[-1px]">
                  От заказа
                  <br />к понятной статистике
                </h3>
                <p className="mt-3 text-xs text-muted">
                  Рабочее место повара и администратора
                </p>
              </div>
              <span className="text-[10px] text-muted">01 / Обзор проекта</span>
            </div>
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelHead title="Текст и иерархия" />
        <div id="type" className="grid gap-8 px-8 pb-8 lg:grid-cols-2">
          <div>
            <p className="text-[56px] leading-[1.1] font-semibold tracking-[-2px]">
              Питание
              <br />
              под контролем
            </p>
            <p className="mt-6 text-sm text-muted">
              Заголовок · Inter 56 px / 600
            </p>
          </div>
          <div className="flex flex-col justify-center gap-6">
            <div>
              <p className="text-4xl font-semibold tracking-[-1px]">
                Результаты за день
              </p>
              <p className="mt-2 text-xs text-muted">
                Подзаголовок · 36 px / 600
              </p>
            </div>
            <div>
              <p className="text-[28px] font-medium">174 порции выдано</p>
              <p className="mt-2 text-xs text-muted">
                Ключевой факт · 28 px / 500 · пример данных
              </p>
            </div>
            <div>
              <p className="text-xl leading-relaxed">
                Повар отмечает готовность.
                <br />
                Администратор видит результат.
              </p>
              <p className="mt-2 text-xs text-muted">
                Основной текст · 20 px / 400
              </p>
            </div>
          </div>
        </div>
      </Panel>
      <div id="buttons" className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead
            title="Кнопки презентации"
            description="Высота 64 px, радиус 8 px, текст 20 px."
          />
          <div className="flex flex-wrap gap-4 px-6 pb-6">
            <a
              href="#blocks"
              className="inline-flex h-16 items-center gap-3 rounded-lg bg-blue px-6 text-xl font-medium text-white"
            >
              К возможностям <ArrowRight size={20} />
            </a>
            <a
              href="#canvas"
              className="inline-flex h-16 items-center gap-3 rounded-lg border border-line px-6 text-xl font-medium"
            >
              <ArrowLeft size={20} />К обзору
            </a>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Навигация и пояснения" />
          <div className="flex flex-col gap-5 px-6 pb-6">
            <div className="flex gap-3 text-sm">
              <a
                href="#canvas"
                className="rounded-lg bg-blue-tint px-4 py-3 text-blue"
              >
                01 · Обзор
              </a>
              <a
                href="#blocks"
                className="rounded-lg bg-neutral px-4 py-3 text-muted"
              >
                02 · Возможности
              </a>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Check size={16} />
              Один синий акцент на главный переход.
            </p>
          </div>
        </Panel>
      </div>
      <div id="blocks" className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-7">
          <p className="mb-6 text-xs text-muted">ОБЫЧНЫЙ БЛОК</p>
          <h2 className="text-[28px] font-semibold">Для повара</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Добавить блюдо, выбрать класс и отметить готовность.
          </p>
        </Panel>
        <section className="motion-block motion-surface rounded-xl bg-warm p-7">
          <p className="mb-6 text-xs text-warm-ink">АКЦЕНТНЫЙ БЛОК</p>
          <h2 className="text-[28px] font-semibold">Всё учтено</h2>
          <p className="mt-4 text-base leading-7 text-warm-ink">
            Готовые заказы автоматически входят в выдачу.
          </p>
        </section>
        <section className="motion-block motion-surface rounded-xl bg-blue-tint p-7">
          <p className="mb-6 text-xs text-blue">ПОЯСНЕНИЕ</p>
          <h2 className="text-[28px] font-semibold">Прозрачные числа</h2>
          <p className="mt-4 text-base leading-7">
            Показывайте период, единицы измерения и источник данных.
          </p>
        </section>
      </div>
      <Link
        href="/components"
        className="inline-flex items-center gap-2 text-sm text-blue"
      >
        <ArrowLeft size={15} />К компонентам приложения
      </Link>
    </>
  );
}
