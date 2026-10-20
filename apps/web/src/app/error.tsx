"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Не удалось открыть страницу</h1>
        <p className="my-5 text-sm text-muted">
          Попробуйте загрузить её ещё раз.
        </p>
        <button
          className="rounded-lg bg-blue px-5 py-3 text-sm text-white"
          onClick={reset}
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
