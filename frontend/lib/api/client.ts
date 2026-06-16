import axios from "axios";

/**
 * Single Axios instance for the entire app.
 * Injects the session token from localStorage on every request.
 * Import this — never create another axios instance.
 */
export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
  withCredentials: false,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("arktion_session");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extracts a human-readable message from an Axios error. */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { message?: string })?.message ??
      err.message
    );
  }
  return err instanceof Error ? err.message : "Unknown error";
}
