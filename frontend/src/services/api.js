import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

// Separate bare client for refresh calls so interceptors never recurse
const refreshClient = axios.create({
  baseURL: API_URL,
});

let refreshPromise = null;

const clearAuthAndRedirect = () => {
  localStorage.removeItem("fm_token");
  localStorage.removeItem("fm_refresh_token");
  localStorage.removeItem("fm_user");

  window.dispatchEvent(new Event("moneo:unauthorized"));

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

// Attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fm_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Automatically refresh expired access tokens on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    const publicAuthEndpoints = [
      "/auth/login",
      "/auth/register",
      "/auth/verify-email",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/resend-verification",
      "/auth/refresh",
    ];

    const isPublicAuthRequest = publicAuthEndpoints.some((endpoint) =>
      url.includes(endpoint),
    );

    if (isPublicAuthRequest) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loops if the retried request still returns 401
    if (originalRequest._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem("fm_refresh_token");
    if (!storedRefreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/auth/refresh", {
            refresh_token: storedRefreshToken,
          })
          .then(({ data }) => {
            localStorage.setItem("fm_token", data.access_token);
            if (data.refresh_token) {
              localStorage.setItem("fm_refresh_token", data.refresh_token);
            }
            if (data.user) {
              localStorage.setItem("fm_user", JSON.stringify(data.user));
            }

            window.dispatchEvent(
              new CustomEvent("moneo:token-refreshed", { detail: data }),
            );

            return data.access_token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
