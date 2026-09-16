"use client";

import { Button, Skeleton, Stack } from "@mui/material";
import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";
import { useAuthDialog } from "@/features/auth/AuthDialogProvider";

export function AdventureCtaActions() {
  const { isAuthenticated, isLoading } = useAuth();
  const { openAuth } = useAuthDialog();

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {isLoading ? (
        <Skeleton
          variant="rounded"
          width={148}
          height={38}
          sx={{ bgcolor: "rgba(255,255,255,.18)" }}
        />
      ) : (
        isAuthenticated ? (
          <Button component={Link} href="/homes" variant="contained" sx={{ bgcolor: "white", color: "primary.dark", "&:hover": { bgcolor: "grey.100" } }}>
            Найти жильё
          </Button>
        ) : (
          <Button onClick={() => openAuth({ mode: 'register' })} variant="contained" sx={{ bgcolor: "white", color: "primary.dark", "&:hover": { bgcolor: "grey.100" } }}>
            Регистрация
          </Button>
        )
      )}
      <Button
        component={Link}
        href="#how-it-works"
        variant="outlined"
        sx={{ color: "white", borderColor: "rgba(255,255,255,.5)" }}
      >
        Как это работает
      </Button>
    </Stack>
  );
}
