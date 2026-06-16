"use client";

import React from "react";
import { MessageSquare, Hash, Users, PlusCircle, AtSign, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useChatStore } from "@/store/chatStore";
import { Button } from "@/components/ui/button";

export default function ChatLandingPage() {
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { channels } = useChatStore();

  const workspaceChannels = activeWorkspace ? (channels[activeWorkspace.id] ?? []) : [];
  const publicChannelsCount = workspaceChannels.filter(c => c.type === 'PUBLIC').length;
  const privateChannelsCount = workspaceChannels.filter(c => c.type === 'PRIVATE').length;
  const dmChannelsCount = workspaceChannels.filter(c => c.type === 'DM').length;

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="flex h-full items-center justify-center bg-background px-6 py-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl w-full text-center flex flex-col items-center"
      >
        {/* Animated Gradient Icon Background */}
        <motion.div
          variants={itemVariants}
          className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/30 to-violet-500/10 border border-primary/20 shadow-2xl mb-8 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <MessageSquare className="h-10 w-10 text-primary animate-pulse" strokeWidth={1.5} />
        </motion.div>

        {/* Welcome Text */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Welcome to Chat, <span className="text-primary font-medium">{user?.fullName || user?.username || "Collaborator"}</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Choose a channel or direct message from the sidebar to connect with your team, start discussions, and collaborate in real-time.
          </p>
        </motion.div>

        {/* Quick Stats Cards */}
        {activeWorkspace && (
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 w-full max-w-lg mt-10"
          >
            <div className="flex flex-col items-center p-4 rounded-xl bg-hs-card/50 border border-border/50 backdrop-blur-sm transition-all hover:bg-hs-card hover:border-border">
              <Hash className="h-5 w-5 text-muted-foreground mb-2" strokeWidth={1.5} />
              <span className="text-2xl font-semibold text-foreground">{publicChannelsCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Public Channels</span>
            </div>
            
            <div className="flex flex-col items-center p-4 rounded-xl bg-hs-card/50 border border-border/50 backdrop-blur-sm transition-all hover:bg-hs-card hover:border-border">
              <Users className="h-5 w-5 text-muted-foreground mb-2" strokeWidth={1.5} />
              <span className="text-2xl font-semibold text-foreground">{privateChannelsCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Private Channels</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-xl bg-hs-card/50 border border-border/50 backdrop-blur-sm transition-all hover:bg-hs-card hover:border-border">
              <AtSign className="h-5 w-5 text-muted-foreground mb-2" strokeWidth={1.5} />
              <span className="text-2xl font-semibold text-foreground">{dmChannelsCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Direct Messages</span>
            </div>
          </motion.div>
        )}

        {/* Helpful Tip */}
        <motion.div
          variants={itemVariants}
          className="mt-10 p-4 rounded-lg border border-border/40 bg-muted/20 max-w-md w-full flex items-start text-left gap-3"
        >
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-primary text-[10px] font-bold">i</span>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-foreground">Getting Started</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use the <strong className="text-foreground">+</strong> button in the sidebar to create new public or private channels, or search for users to start a new direct message conversation.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
