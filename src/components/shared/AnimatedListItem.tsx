"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

interface AnimatedListItemProps {
  children: React.ReactNode;
  variants: Variants;
  layoutId?: string;
  className?: string;
}

export function AnimatedListItem({
  children,
  variants,
  layoutId,
  className,
}: AnimatedListItemProps) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
