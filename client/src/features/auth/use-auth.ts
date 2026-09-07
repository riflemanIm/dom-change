"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, AuthUser } from "./auth-api";
import { AuthorizedApiError, authorizedRequest } from "./authorized-request";

export const currentUserQueryKey = ["auth", "me"] as const;

async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    return await authorizedRequest<AuthUser>("/auth/me", { signal });
  } catch (reason) {
    if (reason instanceof AuthorizedApiError && reason.status === 401) return null;
    throw reason;
  }
}

type LoginInput = Parameters<typeof authApi.login>[0];
type RegisterInput = Parameters<typeof authApi.register>[0];

export function useAuth() {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: ({ user }) => queryClient.setQueryData(currentUserQueryKey, user),
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: ({ user }) => queryClient.setQueryData(currentUserQueryKey, user),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      sessionStorage.removeItem("accessToken");
      queryClient.setQueryData(currentUserQueryKey, null);
    },
  });

  const login = async (input: LoginInput) => (await loginMutation.mutateAsync(input)).user;
  const registerUser = async (input: RegisterInput) => (await registerMutation.mutateAsync(input)).user;
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };
  const refreshUser = async () => {
    const result = await userQuery.refetch();
    return result.data ?? null;
  };

  const user = userQuery.data ?? null;
  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading: userQuery.isPending,
    error: userQuery.error,
    login,
    registerUser,
    logout,
    refreshUser,
  };
}
