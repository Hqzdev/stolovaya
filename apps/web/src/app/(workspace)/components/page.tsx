"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import {
  Button,
  ErrorNotice,
  Field,
  Heading,
  Input,
  Panel,
  PanelHead,
  Status,
} from "@/components/ui";

const colors = [
  ["Фон", "#f6f5f4", "bg-paper"],
  ["Поверхность", "#ffffff", "bg-white"],
  ["Текст", "#111111", "bg-ink"],
  ["Основной", "#0075de", "bg-blue"],
  ["Акцент", "#ffb110", "bg-yellow"],
  ["Подсказка", "#e6f3fe", "bg-blue-tint"],
];

export default function ComponentsPage() {
  const [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState("32");
  const [motionPreview, setMotionPreview] = useState(0);
  const valid =
    Number.isInteger(Number(quantity)) &&
    Number(quantity) > 0 &&
    Number(quantity) <= 10000;
  return (
    <>
      <Heading
        title="Компоненты и стили"
        subtitle="Общий язык интерфейса Столовой: действия, текст, состояния и данные."
      >
        <Link
          href="/presentation-style"
          className="flex items-center gap-2 text-sm text-blue"
        >
          Стиль презентации <ArrowRight size={16} />
        </Link>
      </Heading>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHead
            title="Цвета"
            description="Тёплая бумага, спокойный текст и один основной цвет."
          />
          <div className="grid grid-cols-3 gap-5 p-6 pt-0">
            {colors.map(([name, code, color]) => (
              <div key={name} className="motion-item">
                <div
                  className={`mb-3 h-16 rounded-lg border border-line ${color}`}
                />
                <p className="text-sm font-medium">{name}</p>
                <code className="text-[11px] text-muted">{code}</code>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHead
            title="Типографика"
            description="Inter · 400, 500, 600. Числа в таблицах — одинаковой ширины."
          />
          <div className="flex flex-col gap-5 px-6 pb-6">
            <p className="text-4xl font-semibold tracking-[-1px]">
              Статистика питания
            </p>
            <p className="text-xl font-semibold">По классам и группам</p>
            <p className="text-sm leading-6">
              Все заказы и выдача порций в одном месте.
            </p>
            <p className="text-xs text-muted">
              После отметки «Готово» порции попадут в статистику.
            </p>
          </div>
        </Panel>
        <Panel>
          <PanelHead
            title="Кнопки и действия"
            description="Синяя кнопка — главное действие на экране."
          />
          <div className="flex flex-wrap gap-3 px-6 pb-6">
            <Button
              onClick={() =>
                setNotice("Так выглядит подтверждение успешного действия.")
              }
            >
              <Plus size={15} />
              Добавить блюдо
            </Button>
            <Button
              secondary
              onClick={() => setNotice("Второстепенное действие выбрано.")}
            >
              Отмена
            </Button>
            <Button disabled>Недоступно</Button>
            <Button busy>Сохраняем</Button>
          </div>
          {notice && (
            <p
              role="status"
              className="mx-6 mb-6 rounded-lg bg-blue-tint p-3 text-sm text-blue"
            >
              {notice}
            </p>
          )}
        </Panel>
        <Panel>
          <PanelHead
            title="Статусы"
            description="Цвет всегда дополняют подпись и значок."
          />
          <div className="flex flex-wrap gap-4 px-6 pb-6">
            <Status status="new" />
            <Status status="cooking" />
            <Status status="ready" />
          </div>
          <p className="px-6 pb-6 text-xs leading-6 text-muted">
            Новый → Готовится → Готово. Готовые заказы учитываются как выданные
            порции.
          </p>
        </Panel>
        <Panel>
          <PanelHead
            title="Поле и проверка данных"
            description="Попробуйте ввести ноль или дробное число."
          />
          <div className="px-6 pb-6">
            <Field
              htmlFor="example-quantity"
              label="Количество порций"
              hint={valid ? "Целое число от 1 до 10 000" : undefined}
            >
              <Input
                id="example-quantity"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                aria-invalid={!valid}
              />
            </Field>
            {!valid && (
              <p role="alert" className="mt-2 text-xs text-[#9b3527]">
                Введите целое число от 1 до 10 000.
              </p>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHead
            title="Анимация блоков"
            description="Мягкое появление по очереди и короткий отклик на действие."
          >
            <Button
              secondary
              onClick={() => setMotionPreview((value) => value + 1)}
            >
              Повторить
            </Button>
          </PanelHead>
          <div key={motionPreview} className="grid grid-cols-3 gap-3 px-6 pb-5">
            {[
              ["Блок", "bg-paper"],
              ["Акцент", "bg-warm"],
              ["Действие", "bg-blue-tint"],
            ].map(([label, color], index) => (
              <div
                key={label}
                data-motion-step={index}
                className={`motion-block motion-card flex h-24 items-center justify-center rounded-lg text-sm font-medium ${color}`}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="px-6 pb-6 text-xs leading-6 text-muted">
            Появление — 460 мс, наведение — 180 мс. При настройке уменьшенного
            движения анимации отключаются.
          </p>
        </Panel>
        <Panel>
          <PanelHead title="Обратная связь" />
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex gap-2 rounded-lg bg-blue-tint p-4 text-sm text-blue">
              <Check size={17} />
              Готовность сохранена. Порции учтены в выдаче.
            </div>
            <ErrorNotice message="Не удалось сохранить заказ. Данные остались в форме." />
            <p className="text-xs text-muted">
              Загрузка, пустые данные и ошибки показаны отдельно.
            </p>
          </div>
        </Panel>
      </div>
      <p className="text-xs text-muted">
        Карточки: 12 px · кнопки и поля: 8 px · базовый шаг: 4 px · границы: 1
        px · без теней и градиентов.
      </p>
    </>
  );
}
