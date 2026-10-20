export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private csrfToken = "";
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
