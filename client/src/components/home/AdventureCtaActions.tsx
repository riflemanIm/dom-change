"use client";

import { Button, Skeleton, Stack } from "@mui/material";
import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";

export function AdventureCtaActions() {
  const { isAuthenticated, isLoading } = useAuth();

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
        <Button
          component={Link}
          href={isAuthenticated ? "/homes" : "/register"}
          variant="contained"
          sx={{
            bgcolor: "white",
            color: "primary.dark",
            "&:hover": { bgcolor: "grey.100" },
          }}
        >
          {isAuthenticated ? "Найти жильё" : "Регистрация"}
        </Button>
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
