"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { useApplication } from "@/components/auth-provider";

interface Resource<T> {
  key: string;
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useResource<T>(key: string, poll = true) {
  const { workspace } = useApplication();
  const version = workspace.version;
  const resourceKey = `${version}:${key}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<Resource<T>>({
    key: "",
    data: null,
    error: null,
    loading: true,
  });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let fetching = false;
    async function load() {
      if (fetching) return;
      fetching = true;
      try {
        const data = await api.request<T>(key, {
          signal: controller.signal,
          headers: { "X-Data-Version": String(version) },
        });
        if (active)
          setState({ key: resourceKey, data, error: null, loading: false });
      } catch (error) {
        if (active && !controller.signal.aborted)
          setState((previous) => ({
            key: resourceKey,
            data:
              previous.key === resourceKey &&
              !(error instanceof ApiError && error.workspaceChanged)
                ? previous.data
                : null,
            error:
              error instanceof Error
                ? error.message
                : "Не удалось загрузить данные.",
            loading: false,
          }));
      } finally {
        fetching = false;
      }
    }
    void load();
    const reload = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = poll ? window.setInterval(reload, 15000) : undefined;
    window.addEventListener("focus", reload);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [key, revision, poll, version, resourceKey]);
  const current =
    state.key === resourceKey
      ? state
      : { key: resourceKey, data: null, error: null, loading: true };
  return { ...current, refresh };
}
