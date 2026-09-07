"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { AUTH_SESSION_ENDED_EVENT, authApi, AuthUser } from "./auth-api";
import { AuthorizedApiError, authorizedRequest } from "./authorized-request";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
};

export type AuthAction =
  | { type: "AUTHENTICATED"; user: AuthUser }
  | { type: "ANONYMOUS" }
  | { type: "AUTH_ERROR"; message: string };

const initialState: AuthState = {
  status: "loading",
  user: null,
  error: null,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTHENTICATED":
      return { status: "authenticated", user: action.user, error: null };
    case "ANONYMOUS":
      return { status: "anonymous", user: null, error: null };
    case "AUTH_ERROR":
      return { status: "anonymous", user: null, error: action.message };
    default:
      return state;
  }
}

type LoginInput = Parameters<typeof authApi.login>[0];
type RegisterInput = Parameters<typeof authApi.register>[0];

type AuthContextValue = {
  state: AuthState;
  isAuthenticated: boolean;
  dispatch: Dispatch<AuthAction>;
  login: (input: LoginInput) => Promise<AuthUser>;
  registerUser: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const bootstrapped = useRef(false);
  const authRevision = useRef(0);

  const refreshUser = useCallback(async () => {
    const revision = authRevision.current;
    try {
      const user = await authorizedRequest<AuthUser>("/auth/me");
      if (revision === authRevision.current) dispatch({ type: "AUTHENTICATED", user });
      return user;
    } catch (reason) {
      const message = (reason as Error).message;
      if (revision === authRevision.current) {
        dispatch(reason instanceof AuthorizedApiError && reason.status === 401
          ? { type: "ANONYMOUS" }
          : { type: "AUTH_ERROR", message });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const sessionEnded = () => dispatch({ type: "ANONYMOUS" });
    window.addEventListener(AUTH_SESSION_ENDED_EVENT, sessionEnded);
    return () => window.removeEventListener(AUTH_SESSION_ENDED_EVENT, sessionEnded);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authApi.login(input);
    authRevision.current += 1;
    dispatch({ type: "AUTHENTICATED", user: result.user });
    return result.user;
  }, []);

  const registerUser = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    authRevision.current += 1;
    dispatch({ type: "AUTHENTICATED", user: result.user });
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    authRevision.current += 1;
    try {
      await authApi.logout();
    } finally {
      sessionStorage.removeItem("accessToken");
      dispatch({ type: "ANONYMOUS" });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      isAuthenticated: state.status === "authenticated",
      dispatch,
      login,
      registerUser,
      logout,
      refreshUser,
    }),
    [state, login, registerUser, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
