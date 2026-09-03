import { Box, Typography } from "@mui/material";
import Link from "next/link";

export function BrandLogo({ small = false }: { small?: boolean }) {
  const markSize = small ? 34 : 42;

  return (
    <Box
      component={Link}
      href="/"
      aria-label="DomObmen — на главную"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 1 : 1.25,
        color: "text.primary",
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      <Box
        component="span"
        sx={{
          width: markSize,
          height: markSize,
          display: "grid",
          placeItems: "center",
          bgcolor: "primary.main",
          borderRadius: small ? "9px" : "11px",
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 32 32"
          aria-hidden="true"
          sx={{ width: "76%", height: "76%" }}
        >
          <path
            d="M5.8 15.2 13.7 8.7l6.8 5.6v9H8.1v-8.1M12.7 14.3l5.6-4.6 7.9 6.5v7.1h-7.8v-5.8h-4.1v5.8"
            fill="none"
            stroke="white"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Box>
      </Box>
      <Typography
        component="span"
        sx={{
          fontSize: small ? 17 : 21,
          lineHeight: 1,
          fontWeight: 800,
          letterSpacing: "-.045em",
        }}
      >
        DomObmen
      </Typography>
    </Box>
  );
}
