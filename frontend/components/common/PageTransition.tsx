"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const variants = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.997,
    transition: {
      duration: 0.18,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={className ?? "h-full w-full"}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Stagger children with a cascading fade-slide-up */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Individual staggered item */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Slide-in from the right (for sheet/panel reveal) */
export const slideInRight = {
  initial: { x: 32, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    x: 32,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Fade + scale pop (for modals / dialogs) */
export const popIn = {
  initial: { opacity: 0, scale: 0.92, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.26, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
