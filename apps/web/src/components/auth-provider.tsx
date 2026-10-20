"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ApplicationContext } from "@stolovaya/contracts";
import { api, ApiError } from "@/lib/api";

interface AuthContextValue {
  context: ApplicationContext | null;
  login(login: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshContext(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [resolved, setResolved] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    api
      .request<ApplicationContext>("/auth/me")
      .then((value) => {
        if (!active) return;
        api.setCsrfToken(value.csrfToken);
        api.setDataVersion(value.workspace.version);
        setContext(value);
        setError("");
        setResolved(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!(error instanceof ApiError && error.status === 401))
          setError(
            error instanceof Error
              ? error.message
              : "Не удалось подключиться к серверу.",
          );
        setResolved(true);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!resolved || error) return;
    if (!context && pathname !== "/login") router.replace("/login");
    else if (
      context &&
      (pathname === "/login" ||
        (pathname.startsWith("/admin") && context.user.role !== "admin") ||
        (pathname.startsWith("/cook") && context.user.role !== "cook"))
    )
      router.replace(context.user.role === "admin" ? "/admin" : "/cook");
  }, [resolved, error, context, pathname, router]);
  const refreshContext = useCallback(async () => {
    const value = await api.request<ApplicationContext>("/auth/me");
    api.setCsrfToken(value.csrfToken);
    api.setDataVersion(value.workspace.version);
    setContext((previous) =>
      previous?.workspace.version === value.workspace.version &&
      previous.today === value.today
        ? previous
        : value,
    );
  }, []);
  const role = context?.user.role;
  useEffect(() => {
    if (!role) return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        void refreshContext().catch(() => {});
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("stolovaya:workspace-changed", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("stolovaya:workspace-changed", refresh);
    };
  }, [role, refreshContext]);
  const login = useCallback(
    async (login: string, password: string) => {
      const value = await api.request<ApplicationContext>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      });
      api.setCsrfToken(value.csrfToken);
      api.setDataVersion(value.workspace.version);
      setContext(value);
      setError("");
      router.replace(value.user.role === "admin" ? "/admin" : "/cook");
    },
    [router],
  );
  const logout = useCallback(async () => {
    await api.request("/auth/logout", { method: "POST" });
    api.setCsrfToken("");
    setContext(null);
    router.replace("/login");
  }, [router]);
  if (!resolved)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Открываем рабочее место…
      </div>
    );
  if (error && pathname !== "/login")
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Не удалось подключиться</h1>
          <p className="my-4 text-sm text-muted">{error}</p>
          <button
            className="rounded-lg bg-blue px-5 py-3 text-sm text-white"
            onClick={() => {
              setError("");
              setResolved(false);
              setRevision((value) => value + 1);
            }}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  if (!context && pathname !== "/login") return null;
  return (
    <AuthContext.Provider value={{ context, login, logout, refreshContext }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider отсутствует.");
  return value;
}
export function useApplication(): ApplicationContext {
  const { context } = useAuth();
  if (!context) throw new Error("Требуется вход.");
  return context;
}
