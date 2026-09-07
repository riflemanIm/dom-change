"use client";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import WorkOutlineRounded from "@mui/icons-material/WorkOutlineRounded";
import {
  Box,
  Button,
  ButtonBase,
  Container,
  Fade,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const steps = [
  {
    icon: PersonAddAltRounded,
    title: "Зарегистрируйтесь",
    summary: "Создайте профиль и расскажите о своём доме",
    description:
      "Заполните профиль, подтвердите email и добавьте жильё. Фотографии и подробное описание помогут быстрее найти подходящих участников.",
    highlights: ["Бесплатная регистрация", "Профиль участника", "Объявление о жилье"],
    action: "Создать аккаунт",
    href: "/register",
  },
  {
    icon: SearchRounded,
    title: "Найдите обмен",
    summary: "Выберите направление, даты и формат поездки",
    description:
      "Используйте фильтры каталога, сравнивайте жильё и сохраняйте понравившиеся варианты. Можно путешествовать за ДомБаллы или договориться о прямом обмене.",
    highlights: ["Фильтры по датам", "Избранное", "Баллы или прямой обмен"],
    action: "Перейти к поиску",
    href: "/homes",
  },
  {
    icon: ChatBubbleOutlineRounded,
    title: "Договоритесь",
    summary: "Отправьте заявку и обсудите детали в чате",
    description:
      "Уточните состав гостей и условия проживания, согласуйте даты с хозяином и подтвердите обмен. История сообщений останется внутри заявки.",
    highlights: ["Безопасный чат", "Подтверждение дат", "Статусы заявки"],
    action: "Открыть мои заявки",
    href: "/account/exchanges",
  },
  {
    icon: WorkOutlineRounded,
    title: "Путешествуйте",
    summary: "Отправляйтесь в поездку и живите как местные",
    description:
      "После подтверждения обмена дом ждёт вашего приезда. По завершении поездки участники оставляют отзывы, а ДомБаллы автоматически учитываются в балансе.",
    highlights: ["Дом вместо гостиницы", "Учёт ДомБаллов", "Отзывы участников"],
    action: "Посмотреть варианты",
    href: "/homes",
  },
] as const;

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];

  return (
    <Container id="how-it-works" maxWidth="lg" sx={{ py: 8, scrollMarginTop: 24 }}>
      <Typography variant="h4" textAlign="center" mb={1.5}>
        Как это работает
      </Typography>
      <Typography color="text.secondary" textAlign="center" mb={4}>
        Четыре шага от регистрации до первой поездки
      </Typography>

      <Grid container spacing={2} role="list" aria-label="Этапы обмена домами">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = index === activeIndex;
          return (
            <Grid key={step.title} size={{ xs: 12, sm: 6, md: 3 }} role="listitem">
              <ButtonBase
                onClick={() => setActiveIndex(index)}
                aria-pressed={active}
                aria-controls="how-it-works-details"
                sx={{ width: "100%", height: "100%", borderRadius: 3, textAlign: "left" }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    width: "100%",
                    height: "100%",
                    borderColor: active ? "primary.main" : "divider",
                    bgcolor: active ? "rgba(23, 107, 91, .055)" : "background.paper",
                    boxShadow: active ? "0 12px 30px rgba(23, 107, 91, .12)" : "none",
                    transform: active ? "translateY(-3px)" : "none",
                    transition: "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 2.5,
                        color: active ? "white" : "primary.main",
                        bgcolor: active ? "primary.main" : "rgba(23, 107, 91, .08)",
                      }}
                    >
                      <Icon />
                    </Box>
                    <Typography color={active ? "primary.main" : "text.secondary"} fontWeight={700}>
                      0{index + 1}
                    </Typography>
                  </Stack>
                  <Typography fontWeight={650} mt={2.5}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1} lineHeight={1.65}>
                    {step.summary}
                  </Typography>
                </Paper>
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>

      <Fade key={activeStep.title} in timeout={280}>
        <Paper
          id="how-it-works-details"
          aria-live="polite"
          sx={{ mt: 2.5, p: { xs: 3, md: 4 }, bgcolor: "primary.dark", color: "white", overflow: "hidden" }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Шаг {activeIndex + 1} из {steps.length}
              </Typography>
              <Typography variant="h5" mt={0.5}>
                {activeStep.title}
              </Typography>
              <Typography sx={{ mt: 1.5, opacity: 0.82, lineHeight: 1.75 }}>
                {activeStep.description}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1} mb={2.5}>
                {activeStep.highlights.map((highlight) => (
                  <Typography key={highlight} variant="body2" sx={{ opacity: 0.9 }}>
                    ✓ {highlight}
                  </Typography>
                ))}
              </Stack>
              <Button
                component={Link}
                href={activeStep.href}
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                sx={{ bgcolor: "white", color: "primary.dark", "&:hover": { bgcolor: "grey.100" } }}
              >
                {activeStep.action}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Fade>
    </Container>
  );
}
