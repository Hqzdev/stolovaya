"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/app-shell";
import { Button, ErrorNotice, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(
        String(data.get("login")).trim(),
        String(data.get("password")),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[76px] items-center justify-between border-b border-line px-8">
        <Brand />
        <span className="text-xs text-muted">Вход в систему</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h1 className="text-[36px] font-semibold tracking-[-1.2px]">
              Вход в Столовую
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Рабочее пространство повара
              <br />и администратора
            </p>
          </div>
          <form
            onSubmit={submit}
            className="flex flex-col gap-6 rounded-xl border border-line bg-white p-8"
          >
            {error && <ErrorNotice message={error} />}
            <Field htmlFor="login" label="Логин">
              <Input
                id="login"
                name="login"
                autoComplete="username"
                placeholder="Введите логин"
                required
                maxLength={100}
                autoFocus
              />
            </Field>
            <Field htmlFor="password" label="Пароль">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  required
                  maxLength={256}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 grid h-11 w-11 place-items-center rounded-lg text-muted hover:text-ink"
                  aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <Button type="submit" busy={busy} className="min-h-11">
              Войти <ArrowRight size={15} />
            </Button>
            <p className="border-t border-line pt-5 text-center text-xs leading-5 text-muted">
              После входа откроется рабочее место вашей роли.
            </p>
          </form>
          <p className="mt-5 text-center text-xs text-muted">
            Используйте учётную запись вашей столовой.
          </p>
        </div>
      </main>
      <footer className="flex justify-between gap-4 px-8 pb-6 text-xs text-muted">
        <span>Столовая · Учёт школьного питания</span>
        <span>Для сотрудников</span>
      </footer>
    </div>
  );
}
