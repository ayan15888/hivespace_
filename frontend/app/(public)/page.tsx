"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Terminal,
  Cpu,
  ArrowRight,
  Workflow,
  Activity,
  Check,
  Command,
  Database,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  GitBranch,
  FileText,
  Users,
  LayoutGrid,
  ShieldCheck,
  Zap,
} from "lucide-react"
import WebGPUVisualizer from "@/components/common/WebGPUVisualizer"
import ScrollReveal from "@/components/common/ScrollReveal"

interface FAQItem {
  question: string
  answer: string
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("dark-blue")
    else setTheme("light")
  }

  const faqs: FAQItem[] = [
    {
      question: "How does HiveSpace orchestrate multi-team environments?",
      answer:
        "HiveSpace organizes engineering resources into Organizations and Workspaces. Within each workspace, teams can deploy real-time channels for developers, create precise Linear-style task boards, and share collaborative document spaces—keeping all communications, codes, and tasks aligned in one unified console.",
    },
    {
      question: "How is the WebGPU visualizer utilized in this unified workspace?",
      answer:
        "The platform uses hardware-accelerated shaders to render real-time payload visual representations of secure WebSocket traffic, task completions, and active commit feeds. Our custom WebGPU pipelines process local simulation graphics on your GPU at 60fps, visually mapping message densities across team channels without dragging UI threads.",
    },
    {
      question: "Does the collaborative editor support offline Zustand state stores?",
      answer:
        "Yes. The collaborative editor integrates our optimized Zustand state store with local persistence. All document changes, task shifts, and organization invites are stored in local buffers, auto-synchronizing with the Postgres backend through secure sync queues the moment network links stabilize.",
    },
    {
      question: "How does the organization invitation system handle member onboarding?",
      answer:
        "HiveSpace features a secure invitation protocol. Organization administrators dispatch invite requests specifying roles (MEMBER, ADMIN). The invited developers receive cryptographically signed emails containing invitation tokens that automatically associate their authentication credentials with the workspace upon landing.",
    },
  ]

  const mockWorkspaces = [
    { name: "#core-development", unread: false, type: "channel" },
    { name: "#git-commit-stream", unread: true, type: "channel" },
    { name: "architecture-spec.md", unread: false, type: "document" },
    { name: "HV-102: Invite Flow Auth", unread: false, type: "task" },
  ]

  return (
    <div className="min-h-screen bg-[var(--hs-base)] text-[var(--hs-text)] transition-colors duration-500 selection:bg-[var(--hs-accent)]/20 relative">

      {/* Fullscreen Interactive WebGPU Shader Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30 dark:opacity-40 transition-opacity duration-500">
        <WebGPUVisualizer intensity={0.8} speed={0.3} />
      </div>

      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full bg-[var(--hs-base)]/80 backdrop-blur-md border-b border-white/5 dark:border-white/10 transition-colors duration-300">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-normal tracking-tight text-[var(--hs-text)]">
              HiveSpace
            </span>
            <span className="rounded bg-[var(--hs-nav)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-white/5">
              [HV.10]
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#workspace-stage"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-[var(--hs-text)] transition-colors"
            >
              Unified Console
            </Link>
            <Link
              href="#bento"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-[var(--hs-text)] transition-colors"
            >
              Product Modules
            </Link>
            <Link
              href="#gpu-playground"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-[var(--hs-text)] transition-colors"
            >
              WebGPU Playground
            </Link>
            <Link
              href="#faq"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-[var(--hs-text)] transition-colors"
            >
              Workspace FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-[var(--hs-nav)] hover:bg-[var(--hs-card)] transition-colors cursor-pointer"
            >
              <Sparkles className="size-3 text-[var(--hs-accent)]" strokeWidth={1.75} />
              Theme: {theme === "system" ? "light" : theme}
            </button>

            <Link
              href="/signup"
              className="hidden sm:inline-flex h-8 items-center justify-center rounded-lg bg-[var(--hs-accent)] px-3.5 text-[10px] font-bold uppercase tracking-wider text-white hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--hs-accent)]/15"
            >
              Launch Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        {/* Glow Effects */}
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-20 dark:opacity-30">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-r from-[var(--hs-accent)]/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center">
          <ScrollReveal delay={0}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[var(--hs-nav)] border border-white/10 text-muted-foreground font-mono text-[10px] uppercase tracking-widest mb-6">
              <span className="size-1.5 rounded-full bg-[var(--hs-accent)] animate-ping" />
              Unified Team Spaces: Stable v1.0.2
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h1 className="font-serif text-5xl sm:text-7xl font-normal leading-[1.05] tracking-tight mb-8 max-w-3xl mx-auto text-balance">
              Unified workspace for high-performance engineering.
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <p className="body-md text-[15px] sm:text-lg text-muted-foreground leading-relaxed max-w-2.5xl mx-auto mb-10 text-balance font-normal" style={{ maxWidth: '72ch' }}>
              HiveSpace brings together Slack-velocity developer channels, Linear-precision task pipelines, Notion-fidelity collaborative docs, and native GitHub integrations into a single, high-density clinical console.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={350}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-lg bg-[var(--hs-accent)] px-6 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--hs-accent)]/15"
              >
                Launch Console
                <ArrowRight className="ml-2 size-3.5" strokeWidth={2} />
              </Link>
              <Link
                href="#bento"
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded-lg border border-white/10 bg-[var(--hs-nav)] px-6 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-[var(--hs-text)] hover:bg-[var(--hs-card)] transition-colors"
              >
                Explore Modules
                <kbd className="ml-2 rounded bg-[var(--hs-base)] px-1.5 py-0.5 text-[9px] border border-white/5 font-mono">
                  [ ⏎ ]
                </kbd>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={450} className="mt-6 flex justify-center items-center gap-2 text-xs font-mono text-muted-foreground/80">
            <span>Press</span>
            <kbd className="rounded border border-white/10 bg-[var(--hs-nav)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--hs-text)]">
              D
            </kbd>
            <span>anywhere to toggle dark mode instantly</span>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. FAUX-OS WORKSPACE CENTER PIECE */}
      <section className="px-6 py-8" id="workspace-stage">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal delay={150}>
            <div className="rounded-xl border border-white/10 bg-[var(--hs-card)] overflow-hidden shadow-2xl transition-all">

              {/* OS Window Controls bar */}
              <div className="h-9 border-b border-white/5 bg-[var(--hs-nav)] px-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/60" />
                  <span className="size-2.5 rounded-full bg-amber-500/60" />
                  <span className="size-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  workspace.hivespace.sh // Organization ayan15888
                </div>
                <div className="flex gap-2 items-center">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-mono text-muted-foreground uppercase">Sync Connected</span>
                </div>
              </div>

              {/* Faux Interface Split Layout */}
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5 h-[480px]">

                {/* Panel 1: Team Space Navigator Sidebar */}
                <div className="md:col-span-1 bg-[var(--hs-nav)]/60 p-4 flex flex-col justify-between font-mono text-[10px]">
                  <div className="space-y-6">
                    <div>
                      <div className="text-muted-foreground uppercase text-[9px] tracking-wider mb-2.5">Organizations</div>
                      <div className="space-y-1.5">
                        <div className="px-2 py-1.5 rounded bg-[var(--hs-card)] text-[var(--hs-text)] font-bold flex items-center justify-between border-l-2 border-[var(--hs-accent)]">
                          <span>ayan15888</span>
                          <span className="text-[8px] opacity-60">ACTIVE</span>
                        </div>
                        <div className="px-2 py-1.5 text-muted-foreground hover:text-[var(--hs-text)] transition-colors flex items-center justify-between cursor-pointer">
                          <span>deepmind-synth</span>
                          <span className="size-1.5 rounded-full bg-red-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground uppercase text-[9px] tracking-wider mb-2.5">Workspace Hub</div>
                      <div className="space-y-1.5">
                        {mockWorkspaces.map((node) => (
                          <div key={node.name} className="px-2 py-1 flex items-center justify-between hover:bg-[var(--hs-card)]/60 rounded cursor-pointer transition-colors">
                            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-[var(--hs-text)] transition-all">
                              {node.type === "channel" ? (
                                <MessageSquare className="size-3 text-[var(--hs-accent)]/80" strokeWidth={1.5} />
                              ) : node.type === "document" ? (
                                <FileText className="size-3 text-emerald-500/80" strokeWidth={1.5} />
                              ) : (
                                <Workflow className="size-3 text-sky-500/80" strokeWidth={1.5} />
                              )}
                              <span>{node.name}</span>
                            </div>
                            {node.unread && (
                              <span className="size-1.5 rounded-full bg-red-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 text-muted-foreground text-[9px] space-y-1">
                    <div className="flex justify-between">
                      <span>Server Engine:</span>
                      <span className="text-[var(--hs-text)] font-semibold">SPRING BOOT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sync Latency:</span>
                      <span className="font-mono text-[var(--hs-text)] font-semibold">12ms</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2 & 3: Collaborative API Code Editor Mockup */}
                <div className="md:col-span-2 p-5 flex flex-col justify-between font-mono text-[10px] overflow-y-auto bg-[var(--hs-base)]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Terminal className="size-3.5 text-[var(--hs-accent)]" strokeWidth={1.5} />
                        <span className="text-[var(--hs-text)] font-semibold">frontend/lib/api/invites.ts</span>
                      </div>
                      <span className="text-muted-foreground text-[9px]">TypeScript // AuthStore API</span>
                    </div>

                    <div className="space-y-1 text-muted-foreground/80 leading-relaxed select-text font-mono">
                      <div><span className="text-muted-foreground/40">01</span> <span className="text-indigo-400 font-bold">import</span> &#123; apiFetch &#125; <span className="text-indigo-400">from</span> <span className="text-emerald-500">"./client"</span></div>
                      <div><span className="text-muted-foreground/40">02</span> <span className="text-indigo-400 font-bold">import</span> &#123; useAuthStore &#125; <span className="text-indigo-400">from</span> <span className="text-emerald-500">"@/store/authStore"</span></div>
                      <div><span className="text-muted-foreground/40">03</span> </div>
                      <div><span className="text-muted-foreground/40">04</span> <span className="text-zinc-600">// Accept organization invitation & sync session</span></div>
                      <div><span className="text-muted-foreground/40">05</span> <span className="text-indigo-400 font-bold">export async function</span> <span className="text-sky-400 font-bold">acceptAndJoinInvite</span>(token: <span className="text-amber-500">string</span>, pin: <span className="text-amber-500">string</span>) &#123;</div>
                      <div><span className="text-muted-foreground/40">06</span>   <span className="text-indigo-400 font-bold">const</span> joinRes = <span className="text-indigo-400 font-bold">await</span> apiFetch(<span className="text-emerald-500">"/api/i/join"</span>, &#123;</div>
                      <div><span className="text-muted-foreground/40">07</span>     method: <span className="text-emerald-500">"POST"</span>,</div>
                      <div><span className="text-muted-foreground/40">08</span>     body: JSON.stringify(&#123; token, pin &#125;)</div>
                      <div><span className="text-muted-foreground/40">09</span>   &#125;);</div>
                      <div><span className="text-muted-foreground/40">10</span>   </div>
                      <div><span className="text-muted-foreground/40">11</span>   <span className="text-zinc-600">// Force authentication state & tenant flags synchronization</span></div>
                      <div><span className="text-muted-foreground/40">12</span>   <span className="text-indigo-400 font-bold">const</span> &#123; fetchUser &#125; = useAuthStore.getState()</div>
                      <div><span className="text-muted-foreground/40">13</span>   <span className="text-indigo-400 font-bold">await</span> fetchUser(<span className="text-indigo-400 font-bold">true</span>)</div>
                      <div><span className="text-muted-foreground/40">14</span>   </div>
                      <div><span className="text-muted-foreground/40">15</span>   <span className="text-indigo-400 font-bold">return</span> joinRes</div>
                      <div><span className="text-muted-foreground/40">16</span> &#125;</div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 bg-[var(--hs-nav)]/10 -mx-5 -mb-5 px-5 py-3 flex justify-between items-center text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-muted-foreground font-mono">Syncing: Organization ayan15888 member nodes</span>
                    </div>
                    <span className="text-[var(--hs-accent)] font-bold font-mono tracking-wider text-[8px] uppercase">ZUSTAND ACTIVE</span>
                  </div>
                </div>

                {/* Panel 4: WebGPU Live Signal visualizer inside the platform */}
                <div className="md:col-span-1 h-full relative bg-[var(--hs-nav)]/30 flex flex-col justify-between">
                  <div className="absolute inset-0">
                    <WebGPUVisualizer intensity={0.8} speed={0.9} />
                  </div>
                  <div className="relative z-10 p-4 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80 pointer-events-none select-none">
                    Websocket Signals
                  </div>
                  <div className="relative z-10 p-4 bg-[var(--hs-base)]/60 backdrop-blur-sm border-t border-white/5 font-mono text-[8px] text-muted-foreground select-none pointer-events-none">
                    <div>Hardware: WebGPU Pipeline</div>
                    <div>FPS: 60 / State: Syncing</div>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 4. ASYMMETRICAL HIGH-DENSITY BENTO GRID */}
      <section className="py-24 bg-[var(--hs-main)] border-t border-b border-white/5 transition-colors duration-300" id="bento">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center md:text-left md:max-w-2xl">
            <ScrollReveal delay={0}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--hs-accent)] font-bold">
                ENGINE PRIMITIVES
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mt-2.5 mb-4 text-balance">
                High-density features designed for serious builders.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                HiveSpace rejects bloated SaaS templates. We offer an editorial layout constructed around raw information, speed, and hardware-accelerated orchestration.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1: Large Bento Area (Slack-velocity Developer Channels) */}
            <div className="md:col-span-2 rounded-xl border border-white/5 dark:border-white/10 bg-[var(--hs-card)] p-8 flex flex-col justify-between h-80 relative overflow-hidden group hover:border-[var(--hs-accent)]/40 transition-colors">
              <ScrollReveal delay={100} className="h-full flex flex-col justify-between z-10">
                <div>
                  <div className="size-8 rounded-lg bg-[var(--hs-accent)]/10 flex items-center justify-center text-[var(--hs-accent)] mb-6 ring-1 ring-[var(--hs-accent)]/20">
                    <MessageSquare className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-[var(--hs-text)]">
                    Slack-Velocity Real-time Channels
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-md">
                    Discuss architecture, share code blocks, and coordinate tasks instantly. Powered by secure WebSocket gateways, team channels stream communications with zero latency, complete with live code previews and markdown execution.
                  </p>
                </div>

                <div className="flex gap-2 items-center text-[10px] font-mono text-[var(--hs-accent)] font-bold cursor-pointer">
                  <span>DISCOVER REALTIME STREAM CHANNELS</span>
                  <ArrowRight className="size-3" strokeWidth={2} />
                </div>
              </ScrollReveal>

              {/* Decorative line grid background overlay */}
              <div className="absolute right-0 bottom-0 top-0 w-1/3 border-l border-white/5 bg-[var(--hs-nav)]/10 pointer-events-none select-none hidden sm:block">
                <div className="absolute inset-0 flex flex-col justify-around p-4 font-mono text-[8px] text-muted-foreground/30">
                  <div>[HV-GATEWAY] ACTIVE</div>
                  <div className="h-px bg-white/5 w-full" />
                  <div>[WEBSOCKET] STABLE</div>
                  <div className="h-px bg-white/5 w-full" />
                  <div>[CHANNELS] SYNCED</div>
                </div>
              </div>
            </div>

            {/* Card 2: Vertical bento box (Zustand State Store) */}
            <div className="rounded-xl border border-white/5 dark:border-white/10 bg-[var(--hs-card)] p-8 flex flex-col justify-between h-80 hover:border-[var(--hs-accent)]/40 transition-colors">
              <ScrollReveal delay={200} className="h-full flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 ring-1 ring-indigo-500/20">
                    <Database className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-[var(--hs-text)]">
                    Zustand Global State
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Complete state synchronization built on Zustand architecture. Active terminal logs, task updates, and collaborative document edits persist dynamically across page hotkey switches instantly.
                  </p>
                </div>

                <div className="space-y-1 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span>Active Store:</span>
                    <span className="text-[var(--hs-text)] font-semibold">useAuthStore</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span>Sync Persistence:</span>
                    <span className="text-[var(--hs-text)] font-semibold">PERSISTED</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Card 3: Small Bento Box (Tippy-Tap Docs) */}
            <div className="rounded-xl border border-white/5 dark:border-white/10 bg-[var(--hs-card)] p-8 flex flex-col justify-between h-80 hover:border-[var(--hs-accent)]/40 transition-colors">
              <ScrollReveal delay={300} className="h-full flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 ring-1 ring-emerald-500/20">
                    <FileText className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-[var(--hs-text)]">
                    Notion-Fidelity TipTap Docs
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Real-time collaborative editing using native TipTap rich text primitives. Write documentation, compile architecture guidelines, and manage invite flows in clean markdown-native interfaces.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] uppercase tracking-wider">
                    Markdown-Native
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[9px] uppercase tracking-wider">
                    TipTap Core
                  </span>
                </div>
              </ScrollReveal>
            </div>

            {/* Card 4: Double Bento Area (Linear tasks & GitHub Sync) */}
            <div className="md:col-span-2 rounded-xl border border-white/5 dark:border-white/10 bg-[var(--hs-card)] p-8 flex flex-col justify-between h-80 hover:border-[var(--hs-accent)]/40 transition-colors relative overflow-hidden">
              <ScrollReveal delay={400} className="h-full flex flex-col justify-between z-10">
                <div>
                  <div className="size-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 mb-6 ring-1 ring-rose-500/20">
                    <GitBranch className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-[var(--hs-text)]">
                    Linear-Precision Tasks & Git Sync
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-md">
                    Seamless organization task management synchronized with GitHub repository pipelines. Track issue status, manage team project boards, and trigger automated webhook syncs from commits directly to tasks.
                  </p>
                </div>

                {/* Monospaced Log Stream Simulation */}
                <div className="bg-[var(--hs-nav)] rounded border border-white/5 p-3.5 font-mono text-[8px] text-muted-foreground/80 space-y-1 max-w-xl">
                  <div className="flex justify-between items-center text-[9px] text-[var(--hs-text)] font-bold border-b border-white/5 pb-1 mb-1">
                    <span>GITHUB SYNC PIPELINE</span>
                    <span className="text-emerald-400 font-semibold animate-pulse">SYNC ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[HV-102] ASSOCIATED COMMIT 8a1f2b TO INVITE_FLOW</span>
                    <span className="text-[var(--hs-text)] font-bold">SUCCESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[GITHUB-WEBHOOK] SYNCING REPOSITORY ayan15888/hiveSpace</span>
                    <span className="text-amber-400 font-semibold animate-pulse">SYNCING...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[ZUSTAND-SYNC] ORGANIZATION STATE UPDATED NATIVELY</span>
                    <span className="text-emerald-400">STABLE</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* 5. DEDICATED WEBGPU PLAYGROUND / INTERACTIVE CUSTOMIZER */}
      <section className="py-24 bg-[var(--hs-base)] transition-colors duration-300" id="gpu-playground">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">

            {/* Playground Info */}
            <div className="md:col-span-2">
              <ScrollReveal delay={0}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--hs-accent)] font-bold">
                  HARDWARE ACCELERATION
                </span>
                <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mt-2.5 mb-5 text-balance">
                  Orchestrate the communication shader.
                </h2>
                <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                  Tune the real-time payload flow simulator. Drag the sliders in the GPU Simulation Controller panel to manipulate the coordinate wave calculations representing live websocket communications across organization workspace nodes.
                </p>
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="size-4.5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold mt-0.5 shrink-0">
                      ✓
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      <strong className="text-[var(--hs-text)]">WebGPU Pipelines:</strong> Compiles real-time Fractional Brownian Motion (fBm) shader algorithms natively.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-4.5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold mt-0.5 shrink-0">
                      ✓
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      <strong className="text-[var(--hs-text)]">Interactive Gravity Wells:</strong> Move your cursor across the canvas to attract and repel the mathematical vectors dynamically.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-4.5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold mt-0.5 shrink-0">
                      ✓
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      <strong className="text-[var(--hs-text)]">Fallback Constellation:</strong> Auto-detects hardware support to render an elegant Canvas 2D swarm network.
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Playground Live Canvas Element */}
            <div className="md:col-span-3 h-[420px] rounded-xl border border-white/10 overflow-hidden relative shadow-lg bg-[var(--hs-card)]">
              <WebGPUVisualizer showControls={true} intensity={1.2} speed={1.0} />
            </div>

          </div>
        </div>
      </section>

      {/* 6. SYSTEM FAQ (Editorial Accordion) */}
      <section className="py-24 bg-[var(--hs-main)] border-t border-b border-white/5 transition-colors duration-300" id="faq">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14 text-center">
            <ScrollReveal delay={0}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--hs-accent)] font-bold">
                WORKSPACE MANIFEST
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight mt-2.5 text-[var(--hs-text)]">
                Technical Architecture FAQ
              </h2>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={150}>
            {/* FAQ Accordions - Single bottom border as per minimalist-ui */}
            <div className="space-y-0">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index
                return (
                  <div
                    key={index}
                    className="border-b border-white/5 py-4 transition-all duration-300"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between text-left py-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                    >
                      <span className="font-serif text-lg font-normal text-[var(--hs-text)]">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      )}
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[250px] opacity-100 mt-2.5 pb-4" : "max-h-0 opacity-0"
                        }`}
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed font-normal max-w-[70ch]">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[var(--hs-base)] py-12 transition-colors duration-300 font-mono text-[10px] text-muted-foreground border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-normal tracking-tight text-[var(--hs-text)]">
              HiveSpace
            </span>
            <span>//</span>
            <span>© 2026 AYAN15888. ALL RIGHTS RESERVED.</span>
          </div>

          {/* Operational Status Spot pastel badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-wider uppercase text-[8px] font-bold">ALL SERVICES OPERATIONAL</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/signin" className="hover:text-[var(--hs-text)] transition-colors">
              [ SIGN IN ]
            </Link>
            <Link href="/signup" className="hover:text-[var(--hs-text)] transition-colors">
              [ WORKSPACE v1.0 ]
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
