import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fm_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";

      // Don't log users out for incorrect login credentials
      const publicAuthEndpoints = [
        "/auth/login",
        "/auth/register",
        "/auth/verify-email",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/resend-verification",
      ];

      const isPublicAuthRequest = publicAuthEndpoints.some((endpoint) =>
        url.includes(endpoint),
      );

      if (!isPublicAuthRequest) {
        localStorage.removeItem("fm_token");
        localStorage.removeItem("fm_user");

        // Notify React/Zustand that authentication is invalid
        window.dispatchEvent(new Event("moneo:unauthorized"));

        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
