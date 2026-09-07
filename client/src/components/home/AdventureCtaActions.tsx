"use client";

import { Button, Skeleton, Stack } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authorizedRequest } from "@/features/auth/authorized-request";

export function AdventureCtaActions() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    authorizedRequest("/auth/me")
      .then(() => {
        if (active) setAuthenticated(true);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {authenticated === null ? (
        <Skeleton
          variant="rounded"
          width={148}
          height={38}
          sx={{ bgcolor: "rgba(255,255,255,.18)" }}
        />
      ) : (
        <Button
          component={Link}
          href={authenticated ? "/homes" : "/register"}
          variant="contained"
          sx={{
            bgcolor: "white",
            color: "primary.dark",
            "&:hover": { bgcolor: "grey.100" },
          }}
        >
          {authenticated ? "Найти жильё" : "Регистрация"}
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
