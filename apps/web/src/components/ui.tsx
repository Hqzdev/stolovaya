import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  Clock3,
  LoaderCircle,
  RotateCw,
} from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import type { OrderStatus } from "@stolovaya/contracts";

export const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/15 disabled:cursor-not-allowed disabled:bg-neutral";
export function Button({
  children,
  secondary = false,
  busy = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  secondary?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`motion-control inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? "border-line bg-white text-ink hover:bg-neutral" : "border-transparent bg-blue text-white hover:bg-blue/90"} ${className}`}
    >
      {busy && <LoaderCircle size={15} className="animate-spin" />}
      {children}
    </button>
  );
}
export function ButtonLink({
  children,
  href,
  secondary = false,
}: {
  children: ReactNode;
  href: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`motion-control inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-medium ${secondary ? "border-line bg-white hover:bg-neutral" : "border-transparent bg-blue text-white hover:bg-blue/90"}`}
    >
      {children}
    </Link>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${fieldClass} ${props.className || ""}`} />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className || ""}`} />
  );
}
export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="motion-field flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-5 text-muted">{hint}</p>}
    </div>
  );
}
export const statusNames: Record<OrderStatus, string> = {
  new: "Новый",
  cooking: "Готовится",
  ready: "Готово",
};
export function Status({ status }: { status: OrderStatus }) {
  const Icon =
    status === "ready" ? Check : status === "cooking" ? Clock3 : Circle;
  return (
    <span
      key={status}
      className={`motion-status inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${status === "ready" ? "bg-blue-tint text-blue" : status === "cooking" ? "bg-warm text-warm-ink" : "bg-neutral text-muted"}`}
    >
      <Icon size={12} />
      {statusNames[status]}
    </span>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`motion-block motion-surface min-w-0 overflow-hidden rounded-xl border border-line bg-white ${className}`}
    >
      {children}
    </section>
  );
}
export function PanelHead({
  title,
  children,
  description,
}: {
  title: string;
  children?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.3px]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
export function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="motion-block flex flex-wrap items-center justify-between gap-5">
      <div>
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-1px] lg:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function Back({
  href,
  children = "К общей статистике",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="motion-block motion-back inline-flex w-fit items-center gap-2 text-[13px] text-muted hover:text-blue"
    >
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}
export function Empty({
  title = "Заказов пока нет",
  description = "Попробуйте выбрать другой период или изменить фильтры.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="motion-block flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="mb-2 grid size-12 place-items-center rounded-xl bg-paper text-muted">
        <Circle size={24} strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="motion-item flex min-h-64 items-center justify-center gap-3 text-sm text-muted"
    >
      <LoaderCircle size={18} className="animate-spin" />
      Загружаем данные…
    </div>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      key={message}
      role="alert"
      className="motion-block flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eed9d3] bg-[#fff5f1] px-4 py-3 text-sm text-[#9b3527]"
    >
      <span>{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-2 font-medium"
        >
          <RotateCw size={14} />
          Повторить
        </button>
      )}
    </div>
  );
}
export function RuleNote() {
  return (
    <p className="motion-block flex items-center gap-2 text-xs leading-5 text-muted">
      <Check size={14} className="shrink-0" />В выдачу входят порции заказов со
      статусом «Готово».
    </p>
  );
}
export function Arrow() {
  return <ArrowUpRight size={15} className="shrink-0 text-muted" aria-hidden />;
}
