"use client";

import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import LocationOnRounded from "@mui/icons-material/LocationOnRounded";
import PeopleAltRounded from "@mui/icons-material/PeopleAltRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchPanel() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [guests, setGuests] = useState("2");

  return (
    <Paper
      component="form"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({ city, guests });
        if (startsOn && endsOn) {
          params.set("startsOn", startsOn);
          params.set("endsOn", endsOn);
        }
        router.push(`/homes?${params}`);
      }}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        boxShadow: "0 18px 50px rgba(22, 48, 43, .14)",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems="stretch"
      >
        <TextField
          fullWidth
          label="Куда вы хотите поехать?"
          placeholder="Город, страна или регион"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <LocationOnRounded color="primary" sx={{ mr: 1 }} />
              ),
            },
          }}
        />
        <Stack direction="row" spacing={1} flex={1.25}>
          <TextField
            fullWidth
            type="date"
            label="Заезд"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <CalendarMonthRounded color="primary" sx={{ mr: 1 }} />
                ),
              },
            }}
          />
          <TextField
            fullWidth
            type="date"
            label="Выезд"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <TextField
          type="number"
          label="Гости"
          value={guests}
          onChange={(event) => setGuests(event.target.value)}
          slotProps={{
            htmlInput: { min: 1, max: 50 },
            input: {
              startAdornment: (
                <PeopleAltRounded color="primary" sx={{ mr: 1 }} />
              ),
            },
          }}
          sx={{ minWidth: 145 }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SearchRounded />}
          sx={{ minWidth: 150 }}
        >
          Найти
        </Button>
      </Stack>
      <Typography variant="body2" mt={1.5} color="text.secondary">
        Расширенный поиск ↓
      </Typography>
    </Paper>
  );
}
