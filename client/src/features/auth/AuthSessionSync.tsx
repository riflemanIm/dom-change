"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AUTH_SESSION_ENDED_EVENT } from "./auth-api";
import { currentUserQueryKey } from "./use-auth";

export function AuthSessionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const sessionEnded = () => {
      void queryClient.cancelQueries({ queryKey: currentUserQueryKey });
      queryClient.setQueryData(currentUserQueryKey, null);
    };
    window.addEventListener(AUTH_SESSION_ENDED_EVENT, sessionEnded);
    return () => window.removeEventListener(AUTH_SESSION_ENDED_EVENT, sessionEnded);
  }, [queryClient]);

  return null;
}
