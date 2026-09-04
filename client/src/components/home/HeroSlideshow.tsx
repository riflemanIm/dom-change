"use client";

import { Box } from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/images/hero-apartment-coast.webp", alt: "Квартира с видом на море" },
  {
    src: "/images/hero-apartment-blue-loft.webp",
    alt: "Современный городской лофт",
  },
  {
    src: "/images/hero-apartment-city.webp",
    alt: "Светлая городская квартира",
  },
  { src: "/images/hero-house-forest.webp", alt: "Дом среди зелёного леса" },
  { src: "/images/hero-house-lisbon.webp", alt: "Яркий португальский дом" },

  { src: "/images/hero-house-mountains.webp", alt: "Дом с видом на горы" },
  {
    src: "/images/hero-house-mediterranean.webp",
    alt: "Средиземноморский дом с садом",
  },
  {
    src: "/images/hero-house-nordic-lake.webp",
    alt: "Скандинавский дом у озера",
  },
  {
    src: "/images/hero-house-countryside.webp",
    alt: "Загородный семейный дом",
  },
] as const;

export function HeroSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{ position: "absolute", inset: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      {slides.map((slide, index) => (
        <Box
          key={slide.src}
          sx={{
            position: "absolute",
            inset: 0,
            opacity: index === activeSlide ? 1 : 0,
            transition: "opacity 1.35s ease-in-out",
            willChange: "opacity",
            "@media (prefers-reduced-motion: reduce)": {
              opacity: index === 0 ? 1 : 0,
              transition: "none",
            },
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            loading={index === 0 ? undefined : "eager"}
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </Box>
      ))}
    </Box>
  );
}
