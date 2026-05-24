"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/store/authStore"
import {
  Terminal,
  ArrowRight,
  Workflow,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  GitBranch,
  FileText,
  Users,
  Quote,
  Sparkles,
} from "lucide-react"
import { motion } from "framer-motion"
import ScrollReveal from "@/components/common/ScrollReveal"
import { BackgroundGradientAnimation } from "@/components/common/BackgroundGradientAnimation"

const ICONS = [
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/gatsby-icon.svg",
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/github-icon.svg",
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/google-icon.svg",
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/sketch-icon.svg",
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/slack-icon.svg",
  "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/spotify-icon.svg",
]

interface SemiCircleOrbitProps {
  radius: number
  centerX: number
  centerY: number
  count: number
  iconSize: number
}

function SemiCircleOrbit({ radius, centerX, centerY, count, iconSize }: SemiCircleOrbitProps) {
  return (
    <>
      {/* Semi-circle glow background */}
      <div className="absolute inset-0 flex justify-center">
        <div
          className="
            w-[1000px] h-[1000px] rounded-full 
            bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),transparent_70%)]
            dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]
            blur-3xl 
            -mt-40 
            pointer-events-none
          "
          style={{ zIndex: 0 }}
        />
      </div>

      {/* Orbit icons */}
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / (count - 1)) * 180
        const x = radius * Math.cos((angle * Math.PI) / 180)
        const y = radius * Math.sin((angle * Math.PI) / 180)
        const icon = ICONS[index % ICONS.length]

        // Tooltip positioning — above or below based on angle
        const tooltipAbove = angle > 90

        return (
          <div
            key={index}
            className="absolute flex flex-col items-center group"
            style={{
              left: `${centerX + x - iconSize / 2}px`,
              top: `${centerY - y - iconSize / 2}px`,
              zIndex: 5,
            }}
          >
            <img
              src={icon}
              alt={`icon-${index}`}
              width={iconSize}
              height={iconSize}
              className="object-contain cursor-pointer transition-transform hover:scale-110"
              style={{ minWidth: iconSize, minHeight: iconSize }} // fix accidental shrink
            />

            {/* Tooltip */}
            <div
              className={`absolute ${
                tooltipAbove ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
              } hidden group-hover:block w-28 rounded-lg bg-black px-2 py-1 text-xs text-white shadow-lg text-center`}
            >
              App {index + 1}
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-black ${
                  tooltipAbove ? "top-full" : "bottom-full"
                }`}
              ></div>
            </div>
          </div>
        )
      })}
    </>
  )
}

interface FAQItem {
  question: string
  answer: string
}

const testimonials = [
  {
    text: "HiveSpace eliminated the chaos of juggling Jira, Slack, and Notion. Our velocity doubled in two sprints.",
    name: "Priya Mehta",
    role: "Engineering Lead @ Synthwave Labs",
    avatar: "PM",
    color: "#7C5CFC",
  },
  {
    text: "The GitHub bidirectional sync is magic. Commits close tasks automatically — no more status meetings just to update boards.",
    name: "Olusegun Balogun",
    role: "Staff Engineer @ Krypton Systems",
    avatar: "OB",
    color: "#0ea5e9",
  },
  {
    text: "The TipTap docs with graph-linked backlinks are a game-changer for our architecture reviews. Notion can't do this.",
    name: "Léa Fontaine",
    role: "Tech Architect @ Meridian AI",
    avatar: "LF",
    color: "#10b981",
  },
  {
    text: "Real-time channels with WebSocket delivery at 12ms latency. Our distributed team feels like we're in the same room.",
    name: "Haruto Yamada",
    role: "CTO @ Neonframe Corp",
    avatar: "HY",
    color: "#f59e0b",
  },
  {
    text: "Role-based invite system is incredibly well thought-out. Org Admins, Team Leads, Project Leads — all the right scoping.",
    name: "Amara Osei",
    role: "Platform Ops @ Cascade IO",
    avatar: "AO",
    color: "#ec4899",
  },
  {
    text: "The knowledge graph view blew our minds. Every document linked visually — we can finally trace architecture decisions.",
    name: "Dmitri Volkov",
    role: "Principal Dev @ NordStack",
    avatar: "DV",
    color: "#c96442",
  },
]

const testimonialsCol1 = testimonials.slice(0, 3)
const testimonialsCol2 = testimonials.slice(3, 6)

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, loading, fetchUser } = useAuthStore()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [titleNumber, setTitleNumber] = useState(0)
  const heroTitles = useMemo(
    () => ["blazing-fast", "developer-first", "GitHub-native", "AI-powered", "unified"],
    []
  )

  useEffect(() => {
    const id = setTimeout(() => {
      setTitleNumber((prev) => (prev === heroTitles.length - 1 ? 0 : prev + 1))
    }, 2200)
    return () => clearTimeout(id)
  }, [titleNumber, heroTitles])

  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("token=")
    if (!isAuthenticated && !hasToken) {
      setIsRedirecting(false)
    } else {
      fetchUser()
    }
  }, [fetchUser, isAuthenticated])

  useEffect(() => {
    const hasToken = typeof document !== "undefined" && document.cookie.includes("token=")
    if (!loading) {
      if (isAuthenticated) {
        router.push("/dashboard")
      } else if (!hasToken) {
        setIsRedirecting(false)
      }
    }
  }, [isAuthenticated, loading, router])

  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  const baseWidth = Math.min(size.width * 0.8, 700)
  const centerX = baseWidth / 2
  const centerY = baseWidth * 0.5

  const iconSize =
    size.width < 480
      ? Math.max(24, baseWidth * 0.05)
      : size.width < 768
      ? Math.max(28, baseWidth * 0.06)
      : Math.max(32, baseWidth * 0.07)

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("dark-blue")
    else if (theme === "dark-blue") setTheme("claude")
    else setTheme("light")
  }

  const faqs: FAQItem[] = [
    {
      question: "How does HiveSpace organize multi-team collaborations?",
      answer:
        "HiveSpace organizes engineering workflows into Organizations and Workspaces. Within each workspace, teams can deploy real-time channels for developers, create precise Linear-style task boards, and share collaborative document spaces—keeping all communications, codes, and tasks aligned in one unified console.",
    },
    {
      question: "How is the WebGPU visualizer utilized in this unified workspace?",
      answer:
        "The system uses hardware-accelerated shaders to render real-time payload visual representations of secure WebSocket traffic, task completions, and active commit feeds. Our custom WebGPU pipelines process local simulation graphics on your GPU at 60fps, visually mapping message densities across team channels without dragging UI threads.",
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

  // Mock structures representing the actual frontend/lib/api files
  const mockWorkspaces = [
    { name: "#core-development", unread: false, type: "channel" },
    { name: "#git-commit-stream", unread: true, type: "channel" }, // Coral ping unread
    { name: "architecture-spec.md", unread: false, type: "document" },
    { name: "HV-102: Invite Flow Auth", unread: false, type: "task" },
  ]

  if (isRedirecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0E0E10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7C5CFC] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/20">

      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/10 transition-colors duration-300">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-normal tracking-tight">
              HiveSpace
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              [HV.10]
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#workspace-stage"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Unified Console
            </Link>
            <Link
              href="#bento"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Product Modules
            </Link>
            <Link
              href="#testimonials"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Team Signal
            </Link>
            <Link
              href="#faq"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Workspace FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="flex items-center gap-1.5 rounded-md border border-border/40 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider hover:bg-muted transition-colors cursor-pointer"
            >
              <Sparkles className="size-3 text-primary" strokeWidth={1.75} />
              Theme: {theme === "system" ? "light" : theme}
            </button>

            <Link
              href="/signup"
              className="hidden sm:inline-flex h-8 items-center justify-center rounded bg-primary px-3.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 active:scale-98 transition-all"
            >
              Launch Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-border/10">
        <BackgroundGradientAnimation containerClassName="absolute inset-0 -z-10" interactive={true}>
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-radial from-primary/20 via-transparent to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          </div>
        </BackgroundGradientAnimation>

        <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
          <ScrollReveal delay={0}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] uppercase tracking-widest mb-6">
              <span className="size-1.5 rounded-full bg-primary animate-ping" />
              Unified Team Spaces: Stable v1.0.2
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h1 className="font-serif text-5xl sm:text-7xl font-normal leading-[1.1] tracking-tight mb-4 max-w-3xl mx-auto">
              <span className="block text-foreground">The workspace that is</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center py-2" style={{ minHeight: '1.2em' }}>
                &nbsp;
                {heroTitles.map((title, index) => (
                  <motion.span
                    key={title}
                    className="absolute font-semibold bg-gradient-to-r from-primary via-hs-accent to-primary bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 60 }}
                    transition={{ type: "spring", stiffness: 60, damping: 14 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : { y: titleNumber > index ? -80 : 80, opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="block text-foreground">for your entire org.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <p className="body-md text-[15px] sm:text-lg text-muted-foreground leading-relaxed mx-auto mb-10 text-balance font-normal" style={{ maxWidth: '68ch' }}>
              HiveSpace unifies Slack-velocity channels, Linear-precision task boards, Notion-fidelity docs, and bidirectional GitHub sync — all in one blazing-fast console built for serious engineering teams.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={350}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 active:scale-98 transition-all"
              >
                Launch Your Console
                <ArrowRight className="ml-2 size-3.5" strokeWidth={2} />
              </Link>
              <Link
                href="#bento"
                className="w-full sm:w-auto h-11 inline-flex items-center justify-center rounded border border-border/80 px-6 text-xs font-mono uppercase tracking-wider text-foreground hover:bg-muted transition-colors"
              >
                Explore Modules
                <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[9px] border border-border/40 font-mono">
                  [ ⏎ ]
                </kbd>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={450} className="mt-6 flex justify-center items-center gap-2 text-xs font-mono text-muted-foreground/80">
            <span>Press</span>
            <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
              D
            </kbd>
            <span>anywhere to toggle dark mode · cycle themes via header button</span>
          </ScrollReveal>
        </div>
      </section>

      {/* 3. FAUX-OS WORKSPACE CENTER PIECE */}
      <section className="px-6 py-8" id="workspace-stage">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal delay={150}>
            <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xl transition-all">

              {/* OS Window Controls bar */}
              <div className="h-9 border-b border-border/10 bg-muted/30 px-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-border/80" />
                  <span className="size-2.5 rounded-full bg-border/80" />
                  <span className="size-2.5 rounded-full bg-border/80" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/10 h-[480px]">

                {/* Panel 1: Team Space Navigator Sidebar */}
                <div className="md:col-span-1 bg-muted/10 p-4 flex flex-col justify-between font-mono text-[10px]">
                  <div className="space-y-6">
                    <div>
                      <div className="text-muted-foreground uppercase text-[9px] tracking-wider mb-2.5">Organizations</div>
                      <div className="space-y-1.5">
                        <div className="px-2 py-1.5 rounded bg-muted/60 text-foreground font-bold flex items-center justify-between border-l-2 border-primary">
                          <span>ayan15888</span>
                          <span className="text-[8px] opacity-60">ACTIVE</span>
                        </div>
                        <div className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between">
                          <span>deepmind-synth</span>
                          <span className="size-1.5 rounded-full bg-[#F95B4E]" /> {/* Coral Ping Dot */}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground uppercase text-[9px] tracking-wider mb-2.5">Workspace Hub</div>
                      <div className="space-y-1.5">
                        {mockWorkspaces.map((node) => (
                          <div key={node.name} className="px-2 py-1 flex items-center justify-between hover:bg-muted/30 rounded cursor-pointer transition-colors">
                            <div className="flex items-center gap-1.5 text-foreground/80">
                              {node.type === "channel" ? (
                                <MessageSquare className="size-3 text-primary/75" strokeWidth={1.5} />
                              ) : node.type === "document" ? (
                                <FileText className="size-3 text-emerald-500/75" strokeWidth={1.5} />
                              ) : (
                                <Workflow className="size-3 text-sky-500/75" strokeWidth={1.5} />
                              )}
                              <span>{node.name}</span>
                            </div>
                            {node.unread && (
                              <span className="size-1.5 rounded-full bg-[#F95B4E]" /> // Strict coral unread ping
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/10 pt-3 text-muted-foreground text-[9px] space-y-1">
                    <div className="flex justify-between">
                      <span>Server Engine:</span>
                      <span className="text-foreground font-semibold">SPRING BOOT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sync Latency:</span>
                      <span className="font-mono text-foreground font-semibold">12ms</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2 & 3: Collaborative API Code Editor Mockup */}
                <div className="md:col-span-2 p-5 flex flex-col justify-between font-mono text-[10px] overflow-y-auto bg-background">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-border/10">
                      <div className="flex items-center gap-2">
                        <Terminal className="size-3.5 text-primary" strokeWidth={1.5} />
                        <span className="text-foreground font-semibold">frontend/lib/api/invites.ts</span>
                      </div>
                      <span className="text-muted-foreground text-[9px]">TypeScript // AuthStore API</span>
                    </div>

                    <div className="space-y-1 text-muted-foreground leading-relaxed select-text font-mono">
                      <div><span className="text-primary/60">01</span> <span className="text-indigo-400 font-bold">import</span> &#123; client &#125; <span className="text-indigo-400">from</span> <span className="text-emerald-500">"./client"</span></div>
                      <div><span className="text-primary/60">02</span> <span className="text-indigo-400 font-bold">import</span> &#123; useAuthStore &#125; <span className="text-indigo-400">from</span> <span className="text-emerald-500">"@/store/authStore"</span></div>
                      <div><span className="text-primary/60">03</span> </div>
                      <div><span className="text-primary/60">04</span> <span className="text-slate-400">// Dispatch secure organization invite request</span></div>
                      <div><span className="text-primary/60">05</span> <span className="text-indigo-400 font-bold">export async function</span> <span className="text-sky-400 font-bold">inviteMember</span>(orgId: <span className="text-amber-500">string</span>, email: <span className="text-amber-500">string</span>, role: <span className="text-emerald-500">"ADMIN"</span> | <span className="text-emerald-500">"MEMBER"</span>) &#123;</div>
                      <div><span className="text-primary/60">06</span>   <span className="text-indigo-400 font-bold">const</span> res = <span className="text-indigo-400 font-bold">await</span> client.post(`/orgs/$&#123;orgId&#125;/invites`, &#123;</div>
                      <div><span className="text-primary/60">07</span>     email,</div>
                      <div><span className="text-primary/60">08</span>     role</div>
                      <div><span className="text-primary/60">09</span>   &#125;);</div>
                      <div><span className="text-primary/60">10</span>   </div>
                      <div><span className="text-primary/60">11</span>   <span className="text-indigo-400 font-bold">if</span> (res.status === <span className="text-emerald-500">201</span>) &#123;</div>
                      <div><span className="text-primary/60">12</span>     useAuthStore.getState().logAction(`Invite successfully sent to $&#123;email&#125;`);</div>
                      <div><span className="text-primary/60">13</span>     <span className="text-indigo-400 font-bold">return</span> res.data;</div>
                      <div><span className="text-primary/60">14</span>   &#125;</div>
                      <div><span className="text-primary/60">15</span> &#125;</div>
                    </div>
                  </div>

                  <div className="border-t border-border/10 pt-3 bg-muted/10 -mx-5 -mb-5 px-5 py-3 flex justify-between items-center text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-muted-foreground font-mono">Syncing: Organization ayan15888 member nodes</span>
                    </div>
                    <span className="text-primary font-bold">ZUSTAND ACTIVE</span>
                  </div>
                </div>

              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 4. ASYMMETRICAL HIGH-DENSITY BENTO GRID */}
      <section className="py-24 bg-muted/10 transition-colors duration-300" id="bento">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center md:text-left md:max-w-2xl">
            <ScrollReveal delay={0}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                ENGINE PRIMITIVES
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mt-2.5 mb-4 text-balance">
                Every tool your team needs — nothing it doesn't.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                HiveSpace replaces Jira, Slack, and Notion with one high-density, engineering-grade console. Each module is purpose-built, deeply interconnected, and fast.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="modules">

            {/* Card 1: Large Bento Area (Slack-velocity Developer Channels) */}
            <div className="md:col-span-2 rounded-lg border border-border/60 bg-card p-8 flex flex-col justify-between h-80 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <ScrollReveal delay={100} className="h-full flex flex-col justify-between z-10">
                <div>
                  <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <MessageSquare className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-foreground">
                    Real-time Channels at Slack velocity
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-md">
                    Developer-grade channels powered by STOMP WebSocket. Share code blocks, thread discussions, send DMs, and stream live commit feeds — all with unread badges, typing indicators, and push notifications.
                  </p>
                </div>

                <div className="flex gap-2 items-center text-[10px] font-mono text-primary font-bold">
                  <span>DISCOVER REALTIME STREAM CHANNELS</span>
                  <ArrowRight className="size-3" strokeWidth={2} />
                </div>
              </ScrollReveal>

              {/* Decorative line grid background overlay */}
              <div className="absolute right-0 bottom-0 top-0 w-1/3 border-l border-border/10 bg-muted/5 pointer-events-none select-none hidden sm:block">
                <div className="absolute inset-0 flex flex-col justify-around p-4 font-mono text-[8px] text-muted-foreground/30">
                  <div>[HV-GATEWAY] ACTIVE</div>
                  <div className="h-0.5 bg-border/20 w-full" />
                  <div>[WEBSOCKET] STABLE</div>
                  <div className="h-0.5 bg-border/20 w-full" />
                  <div>[CHANNELS] SYNCED</div>
                </div>
              </div>
            </div>

            {/* Card 2: Vertical bento box (Zustand State Store) */}
            <div className="rounded-lg border border-border/60 bg-card p-8 flex flex-col justify-between h-80 hover:border-primary/40 transition-colors">
              <ScrollReveal delay={200} className="h-full flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <Users className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-foreground">
                    Secure Role-Based Invites
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Org Admins send cryptographically signed email invites. New members auto-join their scoped workspace, team, or project with zero manual setup. Roles cascade: Org Owner → Admin → Lead → Member.
                  </p>
                </div>

                <div className="space-y-1 pt-4 border-t border-border/10">
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span>Active Store:</span>
                    <span className="text-foreground font-semibold">useAuthStore</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span>Sync Persistence:</span>
                    <span className="text-foreground font-semibold">PERSISTED</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Card 3: Small Bento Box (Tippy-Tap Docs) */}
            <div className="rounded-lg border border-border/60 bg-card p-8 flex flex-col justify-between h-80 hover:border-primary/40 transition-colors">
              <ScrollReveal delay={300} className="h-full flex flex-col justify-between">
                <div>
                  <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <FileText className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-foreground">
                    Notion-fidelity Docs + Knowledge Graph
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    TipTap-powered collaborative editor with nested pages, version history, and [[page linking]]. Linked pages form a visual React Flow knowledge graph — a feature Notion, Jira, and Linear all lack.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-4">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[9px] uppercase tracking-wider">
                    Markdown-Native
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
                    TipTap Core
                  </span>
                </div>
              </ScrollReveal>
            </div>

            {/* Card 4: Double Bento Area (Linear tasks & GitHub Sync) */}
            <div className="md:col-span-2 rounded-lg border border-border/60 bg-card p-8 flex flex-col justify-between h-80 hover:border-primary/40 transition-colors relative overflow-hidden">
              <ScrollReveal delay={400} className="h-full flex flex-col justify-between z-10">
                <div>
                  <div className="size-8 rounded bg-primary/10 flex items-center justify-center text-primary mb-6">
                    <GitBranch className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif text-2xl font-normal mb-2 text-foreground">
                    Linear-precision Tasks &amp; GitHub Sync
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-md">
                    Kanban boards with sprint support, custom fields, and milestone tracking. Bidirectional GitHub sync links commits and PRs to tasks — merged PR auto-closes the linked issue with zero manual effort.
                  </p>
                </div>

                {/* Monospaced Log Stream Simulation */}
                <div className="bg-muted/30 rounded border border-border/20 p-3.5 font-mono text-[8px] text-muted-foreground/80 space-y-1 max-w-xl">
                  <div className="flex justify-between items-center text-[9px] text-foreground font-bold border-b border-border/10 pb-1 mb-1">
                    <span>GITHUB SYNC PIPELINE</span>
                    <span className="text-emerald-500 font-semibold animate-pulse">SYNC ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[HV-102] ASSOCIATED COMMIT 8a1f2b TO INVITE_FLOW</span>
                    <span className="text-foreground font-bold">SUCCESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[GITHUB-WEBHOOK] SYNCING REPOSITORY ayan15888/hiveSpace</span>
                    <span className="text-amber-500 font-semibold animate-pulse">SYNCING...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[ZUSTAND-SYNC] ORGANIZATION STATE UPDATED NATIVELY</span>
                    <span className="text-emerald-500">STABLE</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* 4.25 INTEGRATIONS SECTION */}
      <section className="py-24 bg-muted/10 border-t border-border/10 overflow-hidden relative" id="integrations">
        <div className="relative flex flex-col items-center text-center z-10 mx-auto max-w-5xl px-6">
          <ScrollReveal delay={0}>
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
              CONNECTED ECOSYSTEM
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mt-2.5 mb-3 text-balance">
              Integrations
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto mb-12 text-balance">
              Connect your favourite apps to your workflow.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div
              className="relative mx-auto mt-6"
              style={{ width: baseWidth, height: baseWidth * 0.6 }}
            >
              <SemiCircleOrbit radius={baseWidth * 0.22} centerX={centerX} centerY={centerY} count={6} iconSize={iconSize} />
              <SemiCircleOrbit radius={baseWidth * 0.36} centerX={centerX} centerY={centerY} count={8} iconSize={iconSize} />
              <SemiCircleOrbit radius={baseWidth * 0.5} centerX={centerX} centerY={centerY} count={10} iconSize={iconSize} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 4.5 TESTIMONIALS SECTION */}
      <section className="py-24 bg-background border-t border-border/10 overflow-hidden" id="testimonials">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <ScrollReveal delay={0}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                TEAM SIGNAL
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mt-2.5 mb-3 text-balance">
                Engineering teams already love it.
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                From startups to distributed enterprise teams — HiveSpace replaces the tools sprawl with one console that actually ships.
              </p>
            </ScrollReveal>
          </div>

          {/* Dual-column infinite scroll */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[540px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
            {/* Column 1 — scrolls up */}
            <motion.div
              animate={{ translateY: "-50%" }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear", repeatType: "loop" }}
              className="flex flex-col gap-5"
            >
              {[...testimonialsCol1, ...testimonialsCol1].map(({ text, name, role, avatar, color }, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-border/60 bg-card shadow-sm flex flex-col gap-4 hover:border-primary/30 transition-colors"
                >
                  <Quote className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
                  <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border/10">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {avatar}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{name}</div>
                      <div className="text-[10px] text-muted-foreground">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Column 2 — scrolls up offset */}
            <motion.div
              animate={{ translateY: "-50%" }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear", repeatType: "loop" }}
              className="flex flex-col gap-5 mt-8"
            >
              {[...testimonialsCol2, ...testimonialsCol2].map(({ text, name, role, avatar, color }, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-border/60 bg-card shadow-sm flex flex-col gap-4 hover:border-primary/30 transition-colors"
                >
                  <Quote className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
                  <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
                  <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border/10">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {avatar}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{name}</div>
                      <div className="text-[10px] text-muted-foreground">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>


      {/* 6. SYSTEM FAQ (Editorial Accordion) */}
      <section className="py-24 bg-muted/10 border-t border-border/10 transition-colors duration-300" id="faq">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-14 text-center">
            <ScrollReveal delay={0}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                WORKSPACE MANIFEST
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight mt-2.5 text-foreground">
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
                    className="border-b border-border/30 py-4 transition-all duration-300"
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between text-left py-2 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                    >
                      <span className="font-serif text-lg font-normal text-foreground">
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
      <footer className="border-t border-border/10 bg-background py-12 transition-colors duration-300 font-mono text-[10px] text-muted-foreground">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-normal tracking-tight text-foreground">
              HiveSpace
            </span>
            <span>//</span>
            <span>© 2026 AYAN15888. ALL RIGHTS RESERVED.</span>
          </div>

          {/* Operational Status Spot pastel badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            <span className="tracking-wider uppercase text-[8px] font-bold">ALL SERVICES OPERATIONAL</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/signin" className="hover:text-foreground transition-colors">
              [ SIGN IN ]
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              [ WORKSPACE v1.0 ]
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
