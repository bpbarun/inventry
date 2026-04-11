import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { setAccessToken, setRefreshFn } from "../services/api";

const AuthContext = createContext(null);

const REFRESH_KEY = "inv_refresh_token";
const USER_KEY    = "inv_user";

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessTokenSt] = useState(null);
  const [initializing, setInitializing]  = useState(true);

  // Keep a stable ref to logout so doRefresh can call it without stale closure
  const logoutRef = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("inv_token"); // clean up legacy key
    setAccessToken(null);
    setAccessTokenSt(null);
    setUser(null);
  }, []);

  logoutRef.current = logout;

  const login = useCallback((accessTok, refreshTok, userVal) => {
    localStorage.setItem(REFRESH_KEY, refreshTok);
    localStorage.setItem(USER_KEY, JSON.stringify(userVal));
    setAccessToken(accessTok);
    setAccessTokenSt(accessTok);
    setUser(userVal);
  }, []);

  // Silent refresh — returns new access token string or null
  const doRefresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      logoutRef.current?.();
      return null;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost/inventry-api/public/api"}/auth/refresh`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ refresh_token: refreshToken }),
        }
      );

      if (!res.ok) {
        logoutRef.current?.();
        return null;
      }

      const data = await res.json();
      // snake_case response: access_token, refresh_token
      const newAccess  = data.access_token;
      const newRefresh = data.refresh_token;

      if (!newAccess) {
        logoutRef.current?.();
        return null;
      }

      localStorage.setItem(REFRESH_KEY, newRefresh);
      setAccessToken(newAccess);
      setAccessTokenSt(newAccess);
      return newAccess;
    } catch {
      logoutRef.current?.();
      return null;
    }
  }, []);

  // On mount: attempt silent refresh if we have a stored refresh token
  useEffect(() => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (stored) {
      // Restore user from localStorage while refresh is in flight
      try {
        const savedUser = JSON.parse(localStorage.getItem(USER_KEY));
        if (savedUser) setUser(savedUser);
      } catch (_) {}

      doRefresh().finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register refresh callback with the api module
  useEffect(() => {
    setRefreshFn(doRefresh);
    return () => setRefreshFn(null);
  }, [doRefresh]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      login,
      logout,
      initializing,
      isAuthenticated: !!accessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
