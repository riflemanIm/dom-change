import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import HandshakeRounded from "@mui/icons-material/HandshakeRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import StarsRounded from "@mui/icons-material/StarsRounded";
import WorkOutlineRounded from "@mui/icons-material/WorkOutlineRounded";
import {
  Avatar,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/home/SearchPanel";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { featuredProperties } from "@/data/properties";

const steps = [
  {
    icon: <PersonAddAltRounded />,
    title: "1. Зарегистрируйтесь",
    text: "Создайте профиль и расскажите о своём доме",
  },
  {
    icon: <SearchRounded />,
    title: "2. Найдите обмен",
    text: "Найдите подходящий обмен на ваши даты",
  },
  {
    icon: <ChatBubbleOutlineRounded />,
    title: "3. Договоритесь",
    text: "Обсудите детали и подтвердите обмен",
  },
  {
    icon: <WorkOutlineRounded />,
    title: "4. Путешествуйте",
    text: "Наслаждайтесь поездкой, а ваш дом в надёжных руках",
  },
];

const destinations = [
  {
    city: "Сочи, Россия",
    points: 120,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  },
  {
    city: "Калининград, Россия",
    points: 110,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
  },
  {
    city: "Тбилиси, Грузия",
    points: 100,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  },
  {
    city: "Стамбул, Турция",
    points: 130,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <Box component="main" sx={{ bgcolor: "#fbfcfa" }}>
        <Box sx={{ position: "relative", mb: { xs: 5, md: 13 } }}>
          <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <Image
              src="/images/hero-home.webp"
              alt="Светлая гостиная для обмена"
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </Box>
          <Container sx={{ maxWidth: "lg", position: "relative" }}>
            <Grid
              container
              minHeight={{ xs: 700, md: 570 }}
              alignItems="stretch"
            >
              <Grid
                size={{ xs: 12, md: 8 }}
                sx={{ py: { xs: 6, md: 8 }, pr: { md: 7 }, zIndex: 1 }}
              >
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 43, md: 62 },
                    lineHeight: 1.08,
                    letterSpacing: "-.045em",
                    fontWeight: 800,
                  }}
                >
                  Путешествуйте
                  <br />
                  как местные,
                  <br />
                  обмениваясь домами
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 3, mb: 4, lineHeight: 1.8, maxWidth: 530 }}
                >
                  Забудьте о гостиницах. Откройте для себя новые города и
                  культуры, обмениваясь своим домом с проверенными людьми по
                  всему миру.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    component={Link}
                    href="/homes"
                    variant="contained"
                    size="large"
                  >
                    Найти жильё для обмена
                  </Button>
                  <Button
                    component={Link}
                    href="#how-it-works"
                    variant="outlined"
                    color="inherit"
                    startIcon={<PlayArrowRounded />}
                  >
                    Как это работает
                  </Button>
                </Stack>
                <Stack
                  direction="row"
                  spacing={{ xs: 2, sm: 4 }}
                  mt={6}
                  flexWrap="wrap"
                  useFlexGap
                >
                  {[
                    {
                      icon: <StarsRounded />,
                      label: "Без оплаты",
                      sub: "Только обмен баллами",
                    },
                    {
                      icon: <SecurityRounded />,
                      label: "Проверенные люди",
                      sub: "Верификация и отзывы",
                    },
                    {
                      icon: <HandshakeRounded />,
                      label: "Безопасный обмен",
                      sub: "Поддержка 24/7",
                    },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" spacing={1}>
                      {item.icon}
                      <Box>
                        <Typography variant="body2" fontWeight={750}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.sub}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
            </Grid>
            <Paper
              sx={{
                position: "absolute",
                display: { xs: "none", md: "flex" },
                right: 28,
                bottom: 90,
                px: 2.5,
                py: 1.5,
                alignItems: "center",
                gap: 1.5,
                zIndex: 2,
              }}
            >
              <Stack direction="row">
                {["А", "М", "Е"].map((letter) => (
                  <Avatar
                    key={letter}
                    sx={{
                      width: 32,
                      height: 32,
                      ml: -0.7,
                      border: "2px solid white",
                    }}
                  >
                    {letter}
                  </Avatar>
                ))}
              </Stack>
              <Box>
                <Typography fontWeight={800}>★ 4.9</Typography>
                <Typography variant="caption" color="text.secondary">
                  сообщество доверия
                </Typography>
              </Box>
            </Paper>
            <Box
              sx={{
                position: { xs: "relative", md: "absolute" },
                left: { md: 24 },
                right: { md: 24 },
                bottom: { xs: -24, md: -102 },
                zIndex: 3,
              }}
            >
              <SearchPanel />
            </Box>
          </Container>
        </Box>

        <Container id="how-it-works" maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h4" textAlign="center" fontWeight={800} mb={4}>
            Как это работает
          </Typography>
          <Grid container spacing={2}>
            {steps.map((step) => (
              <Grid key={step.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 3, height: "100%", textAlign: "center" }}
                >
                  <Box color="primary.main" sx={{ "& svg": { fontSize: 42 } }}>
                    {step.icon}
                  </Box>
                  <Typography fontWeight={800} mt={2}>
                    {step.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    mt={1.5}
                    lineHeight={1.7}
                  >
                    {step.text}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>

        <Container maxWidth="lg" sx={{ pb: 9 }}>
          <Typography variant="h4" textAlign="center" fontWeight={800} mb={4}>
            Популярные направления
          </Typography>
          <Grid container spacing={2}>
            {destinations.map((place) => (
              <Grid key={place.city} size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper sx={{ overflow: "hidden" }}>
                  <Box position="relative" height={220}>
                    <Image
                      src={`${place.image}?auto=format&fit=crop&w=700&q=80`}
                      alt={place.city}
                      fill
                      sizes="(max-width: 900px) 50vw, 25vw"
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                  <Box p={2}>
                    <Typography fontWeight={800}>{place.city}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      от {place.points} баллов за ночь
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>

        <Box sx={{ bgcolor: "white", py: 9 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" textAlign="center" fontWeight={800} mb={4}>
              Рекомендуемые обмены
            </Typography>
            <Grid container spacing={2}>
              {featuredProperties.map((property) => (
                <Grid key={property.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <PropertyCard property={property} />
                </Grid>
              ))}
            </Grid>
            <Box textAlign="center" mt={4}>
              <Button
                component={Link}
                href="/homes"
                variant="outlined"
                endIcon={<ArrowForwardRounded />}
              >
                Смотреть все
              </Button>
            </Box>
          </Container>
        </Box>

        <Box id="community" sx={{ bgcolor: "#eef8f4", py: 9 }}>
          <Container maxWidth="lg">
            <Typography variant="h4" textAlign="center" fontWeight={800} mb={4}>
              Что говорят наши участники
            </Typography>
            <Grid container spacing={2}>
              {[
                "Благодаря обмену мы провели незабываемый отпуск и нашли дом тоже был в надёжных руках!",
                "Отличный способ путешествовать с детьми и чувствовать себя как дома в любой точке мира.",
                "Уже третий обмен прошёл идеально. Сообщество очень дружелюбное и отзывчивое.",
              ].map((quote, index) => (
                <Grid key={quote} size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 3, height: "100%" }}>
                    <Typography color="primary" fontSize={34}>
                      “
                    </Typography>
                    <Typography lineHeight={1.7}>{quote}</Typography>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      mt={3}
                    >
                      <Avatar>{["А", "Е", "И"][index]}</Avatar>
                      <Box>
                        <Typography fontWeight={750}>
                          {["Анна и Дмитрий", "Елена", "Игорь и Мария"][index]}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ★ 5.0
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Container sx={{ py: 9 }} maxWidth="lg">
          <Grid container spacing={5} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="h3" fontWeight={800}>
                Сообщество, которому можно доверять
              </Typography>
              <Typography color="text.secondary" my={3} lineHeight={1.8}>
                Мы проверяем каждого участника и помогаем решать любые вопросы.
                Ваша безопасность — наш приоритет.
              </Typography>
              <Button variant="outlined">Узнать больше</Button>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                sx={{
                  minHeight: 280,
                  bgcolor: "#f8eee4",
                  display: "grid",
                  placeItems: "center",
                  p: 5,
                }}
              >
                <GroupsRounded color="primary" sx={{ fontSize: 110 }} />
                <Typography variant="h5" textAlign="center">
                  Дома открывают люди, которым доверяют
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        <Box id="help" sx={{ bgcolor: "primary.dark", color: "white", py: 7 }}>
          <Container maxWidth="lg">
            <Grid container alignItems="center" spacing={4}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="h4" fontWeight={800}>
                  Готовы к новым приключениям?
                </Typography>
                <Typography sx={{ opacity: 0.8, my: 2 }}>
                  Присоединяйтесь к тысячам семей, которые уже открыли для себя
                  мир обмена домами.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    component={Link}
                    href="/register"
                    variant="contained"
                    sx={{
                      bgcolor: "white",
                      color: "primary.dark",
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    Регистрация
                  </Button>
                  <Button
                    component={Link}
                    href="#how-it-works"
                    variant="outlined"
                    sx={{ color: "white", borderColor: "rgba(255,255,255,.5)" }}
                  >
                    Как это работает
                  </Button>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Grid container spacing={1}>
                  {[
                    ["25 000+", "активных участников"],
                    ["80+", "стран для обмена"],
                    ["15 000+", "успешных обменов"],
                  ].map(([number, label]) => (
                    <Grid key={number} size={4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          bgcolor: "transparent",
                          borderColor: "rgba(255,255,255,.18)",
                          color: "white",
                          p: 2.5,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h5" fontWeight={800}>
                          {number}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          {label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Container>
        </Box>
      </Box>
      <Footer />
    </>
  );
}
