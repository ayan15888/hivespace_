"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Home, HelpCircle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-hs-main text-foreground overflow-hidden px-6 select-none">
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-hs-accent/10 blur-[120px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none animate-pulse duration-7000" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg text-center">
        {/* Animated Icon Box */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border/40 bg-hs-card/40 backdrop-blur-md shadow-2xl mb-8 group"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-hs-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Compass className="h-10 w-10 text-hs-accent animate-spin duration-15000 ease-linear" />
        </motion.div>

        {/* Animated Heading */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-hs-accent">
            Error Code 404
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/75 mt-1">
            Lost in the Hive?
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed font-light px-4">
            The workspace space or node you are searching for is outside the current index grid, has been moved, or does not exist.
          </p>
        </motion.div>

        {/* Action Controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full mt-10"
        >
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              className="relative w-full sm:w-auto font-medium border-none shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm rounded-xl px-5 py-2.5 text-white flex items-center justify-center gap-2 cursor-pointer bg-hs-accent hover:opacity-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-border/50 bg-hs-card/20 backdrop-blur-sm text-sm rounded-xl px-5 py-2.5 hover:bg-hs-card/60 text-foreground transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Button>
          </Link>
        </motion.div>

        {/* Footer Support Tag */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/80 mt-16 font-light"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Need assistance? Contact our engineering node.</span>
        </motion.div>
      </div>
    </div>
  );
}
