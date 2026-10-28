const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export function setToken(token) {
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.ok && response.headers.get("content-disposition")?.includes("attachment")) {
    const disposition = response.headers.get("content-disposition");
    return { blob: await response.blob(), filename: disposition.match(/filename="?([^";]+)"?/i)?.[1] || "answer" };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") setToken("");
    throw new Error(data.error || `请求失败 (${response.status})`);
  }
  return data;
}
