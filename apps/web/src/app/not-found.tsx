import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="mb-4 text-xs text-muted">404</p>
        <h1 className="text-3xl font-semibold">Страница не найдена</h1>
        <p className="mt-4 mb-6 text-sm text-muted">
          Проверьте адрес или вернитесь в рабочее пространство.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-blue px-5 py-3 text-sm text-white"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
