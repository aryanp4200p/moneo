import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api.js";

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

export default function useSessionActivity() {
  const token = useAuthStore((state) => state.token);

  const timerRef = useRef(null);
  const lastHeartbeatRef = useRef(0);
  const lastMouseMoveRef = useRef(0);

  useEffect(() => {
    if (!token) return;

    let isActive = true;
    let isLoggingOut = false;

    const clearLocalSession = () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      localStorage.removeItem("fm_token");
      localStorage.removeItem("fm_user");

      useAuthStore.setState({
        token: null,
        user: null,
      });

      window.location.replace("/login");
    };

    const handleUnauthorized = () => {
      clearLocalSession();
    };

    window.addEventListener("moneo:unauthorized", handleUnauthorized);

    const logoutForInactivity = async () => {
      if (!isActive) return;

      try {
        await api.post("/auth/logout");
      } catch {
        // The server may already have expired the session.
      } finally {
        clearLocalSession();
      }
    };

    const resetIdleTimer = () => {
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(logoutForInactivity, IDLE_TIMEOUT);
    };

    const sendHeartbeat = async () => {
      const now = Date.now();

      if (now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL) {
        return;
      }

      lastHeartbeatRef.current = now;

      try {
        await api.post("/auth/activity");
      } catch (error) {
        if (error.response?.status === 401) {
          clearLocalSession();
        } else {
          // Network errors do not automatically log the user out.
          lastHeartbeatRef.current = 0;
        }
      }
    };

    const handleActivity = (event) => {
      if (event.type === "mousemove") {
        const now = Date.now();

        if (now - lastMouseMoveRef.current < 1000) return;

        lastMouseMoveRef.current = now;
      }

      resetIdleTimer();
      sendHeartbeat();
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        passive: true,
      });
    });

    // Start the local inactivity timer.
    resetIdleTimer();

    return () => {
      isActive = false;
      clearTimeout(timerRef.current);

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      // Remove unauthorized event listener
      window.removeEventListener("moneo:unauthorized", handleUnauthorized);
    };
  }, [token]);
}
