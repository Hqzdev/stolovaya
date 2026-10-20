import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Столовая", template: "%s · Столовая" },
  description:
    "Рабочее пространство повара и администратора. Учёт школьного питания.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center text-sm text-muted">
              Открываем Столовую…
            </div>
          }
        >
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
