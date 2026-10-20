export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly workspaceChanged = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private csrfToken = "";
  private dataVersion = "";
  setDataVersion(value: number): void {
    this.dataVersion = String(value);
  }
  setCsrfToken(value: string): void {
    this.csrfToken = value;
  }
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, {
        ...options,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken,
          "X-Data-Version": this.dataVersion,
          ...options.headers,
        },
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        "Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.",
        0,
      );
    }
    const expected =
      new Headers(options.headers).get("X-Data-Version") || this.dataVersion;
    const actual = response.headers.get("X-Data-Version");
    if (actual && (actual !== expected || actual !== this.dataVersion)) {
      window.dispatchEvent(new Event("stolovaya:workspace-changed"));
      throw new ApiError(
        "Режим данных изменился. Обновляем рабочее место…",
        409,
        true,
      );
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (
        response.status === 401 &&
        !path.startsWith("/auth/") &&
        typeof window !== "undefined"
      )
        window.location.assign("/login");
      throw new ApiError(
        body?.message || "Не удалось выполнить запрос. Попробуйте снова.",
        response.status,
      );
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }
}
export const api = new ApiClient();
