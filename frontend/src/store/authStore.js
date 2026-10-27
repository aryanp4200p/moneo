import { create } from "zustand";
import api from "../services/api";

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("fm_user")),
  token: localStorage.getItem("fm_token") || null,
  loading: false,
  error: null,

  // =====================================================
  // REGISTER
  // =====================================================

  register: async (name, email, password) => {
    set({ loading: true, error: null });

    try {
      const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      // Registration only sends the OTP.
      // Do not log the user in until the email is verified.
      set({
        loading: false,
        error: null,
      });

      return {
        success: true,
        email: data.email || email,
        message: data.message || "Verification code sent to your email.",
      };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((item) => item.msg)
                .filter(Boolean)
                .join(". ")
            : "Registration failed";

      set({ error: message, loading: false });

      return { success: false, message };
    }
  },

  verifyEmail: async (email, otp) => {
    set({ loading: true, error: null });

    try {
      const { data } = await api.post("/auth/verify-email", {
        email,
        otp,
      });

      localStorage.setItem("fm_token", data.access_token);
      localStorage.setItem("fm_user", JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.access_token,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "string" ? detail : "Email verification failed.";

      set({ loading: false, error: message });

      return { success: false, message };
    }
  },

  resendVerification: async (email) => {
    set({ loading: true, error: null });

    try {
      const { data } = await api.post("/auth/resend-verification", {
        email,
      });

      set({ loading: false, error: null });

      return {
        success: true,
        message:
          data.message ||
          "If the account needs verification, a code will be sent.",
      };
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : "Unable to resend the verification code.";

      set({ loading: false, error: message });

      return { success: false, message };
    }
  },

  // =====================================================
  // LOGIN
  // =====================================================

  login: async (email, password) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("fm_token", data.access_token);

      localStorage.setItem("fm_user", JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.access_token,
        loading: false,
        error: null,
      });

      return true;
    } catch (err) {
      const detail = err.response?.data?.detail;

      set({
        error: typeof detail === "string" ? detail : "Login failed",
        loading: false,
      });

      return false;
    }
  },

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  forgotPassword: async (email) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email,
      });

      set({
        loading: false,
        error: null,
      });

      return data;
    } catch (err) {
      const detail = err.response?.data?.detail;

      set({
        loading: false,
        error:
          typeof detail === "string"
            ? detail
            : "Unable to process password reset request.",
      });

      return null;
    }
  },

  // =====================================================
  // RESET PASSWORD
  // =====================================================

  resetPassword: async (token, newPassword) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });

      // The reset endpoint logs out all sessions,
      // so clear any locally stored login state.
      localStorage.removeItem("fm_token");
      localStorage.removeItem("fm_user");

      set({
        user: null,
        token: null,
        loading: false,
        error: null,
      });

      return data;
    } catch (err) {
      const detail = err.response?.data?.detail;

      set({
        loading: false,
        error:
          typeof detail === "string" ? detail : "Unable to reset password.",
      });

      return null;
    }
  },

  // =====================================================
  // UPDATE USER
  // =====================================================

  updateUser: (user) => {
    localStorage.setItem("fm_user", JSON.stringify(user));

    set({
      user,
    });
  },

  // =====================================================
  // REFRESH PROFILE
  // =====================================================

  refreshProfile: async () => {
    try {
      const { data } = await api.get("/auth/me");

      localStorage.setItem("fm_user", JSON.stringify(data));

      set({
        user: data,
      });

      return data;
    } catch (err) {
      console.error("Failed to refresh profile:", err);

      return null;
    }
  },

  // =====================================================
  // LOGOUT
  // =====================================================

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Server logout failed:", err);
    } finally {
      localStorage.removeItem("fm_token");

      localStorage.removeItem("fm_user");

      set({
        user: null,
        token: null,
        error: null,
      });
    }
  },

  // =====================================================
  // FETCH SESSIONS
  // =====================================================

  fetchSessions: async () => {
    try {
      const { data } = await api.get("/auth/sessions");

      return data;
    } catch (err) {
      console.error("Failed to fetch sessions:", err);

      return [];
    }
  },

  // =====================================================
  // REVOKE SESSION
  // =====================================================

  revokeSession: async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);

      return true;
    } catch (err) {
      console.error("Failed to revoke session:", err);

      return false;
    }
  },

  // =====================================================
  // LOGOUT OTHER SESSIONS
  // =====================================================

  logoutOtherSessions: async () => {
    try {
      await api.post("/auth/sessions/logout-others");

      return true;
    } catch (err) {
      console.error("Failed to logout other sessions:", err);

      return false;
    }
  },
}));
