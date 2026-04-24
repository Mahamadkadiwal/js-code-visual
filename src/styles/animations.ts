import type { Variants } from "framer-motion";

export const stackItemVariants: Variants = {
  initial: { y: -30, opacity: 0, scale: 0.9 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const queueItemVariants: Variants = {
  initial: { x: 50, opacity: 0, scale: 0.9 },
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 24,
    },
  },
  exit: {
    x: -40,
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

export const panelGlowVariants: Variants = {
  idle: { boxShadow: "0 0 0px rgba(0,0,0,0)" },
  active: {
    boxShadow: [
      "0 0 0px rgba(0,0,0,0)",
      "0 0 15px rgba(var(--glow-color), 0.3)",
      "0 0 0px rgba(0,0,0,0)",
    ],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

export const webApiItemVariants: Variants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.3 },
  },
};
