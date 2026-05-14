"use client"

import * as React from "react"
import { 
  Zap, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Plus, 
  Trash2,
  AlertTriangle,
  ChevronRight,
  Download
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

const SEATS = [
  { name: "John Doe", role: "Org Owner", avatar: "JD" },
  { name: "Meera Varma", role: "Team Lead", avatar: "MV" },
  { name: "Rahul Kumar", role: "Member", avatar: "RK" },
  { name: "David King", role: "Member", avatar: "DK" },
  { name: "Sanjay Arya", role: "Member", avatar: "SA" },
  { name: "Priya Lakshmi", role: "Member", avatar: "PL" },
  { name: "Robert Smith", role: "Member", avatar: "RS" },
  { name: "Billing Account", role: "Billing Admin", avatar: "BA" },
]

const INVOICES = [
  { date: "Apr 1, 2026", desc: "Pro Plan · 8 seats · Monthly", amount: "$64.00", status: "Paid" },
  { date: "Mar 1, 2026", desc: "Pro Plan · 8 seats · Monthly", amount: "$64.00", status: "Paid" },
  { date: "Feb 1, 2026", desc: "Pro Plan · 7 seats · Monthly", amount: "$56.00", status: "Paid" },
  { date: "Jan 1, 2026", desc: "Pro Plan · 6 seats · Monthly", amount: "$48.00", status: "Paid" },
  { date: "Dec 1, 2025", desc: "Pro Plan · 5 seats · Monthly", amount: "$40.00", status: "Paid" },
]

export default function SubscriptionPage() {
  return (
    <div className="flex flex-col pb-20 animate-in fade-in duration-500">
      {/* ─── CURRENT PLAN BANNER ─── */}
      <section className="mt-6 mx-8">
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-8 flex items-center justify-between shadow-lg shadow-violet-950/5">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <Badge className="bg-violet-500 hover:bg-violet-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm border-none">
                PRO PLAN
              </Badge>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your current plan</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-[#E5E1E4] tracking-tighter">$8</span>
              <span className="text-sm text-zinc-400">/user/month</span>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-zinc-400 font-medium">Billed monthly · 8 active seats = $64/month</p>
              <p className="text-xs text-zinc-500">Next charge: <span className="text-zinc-300">May 1, 2026</span></p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <CTAButton className="h-10 px-6 flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-xl shadow-violet-500/10">
              <Zap className="h-3.5 w-3.5 fill-current" />
              Upgrade to Ultimate
            </CTAButton>
            <button className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
              Manage billing portal
            </button>
          </div>
        </div>
      </section>

      {/* ─── PLAN COMPARISON ─── */}
      <section className="mt-12">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 mx-8">PLANS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-8">
          {/* FREE */}
          <PlanCard 
            name="FREE"
            price="$0"
            note="Free forever"
            features={[
              { text: "5 members", included: true },
              { text: "3 projects", included: true },
              { text: "1 workspace", included: true },
              { text: "1GB storage", included: true },
              { text: "Basic task board", included: true },
              { text: "GitHub integration", included: false },
              { text: "AI features", included: false },
              { text: "Stakeholder links", included: false },
            ]}
          />

          {/* PRO */}
          <PlanCard 
            name="PRO"
            price="$8"
            note="or $80/year (save 20%)"
            isCurrent
            features={[
              { text: "Unlimited members", included: true },
              { text: "Unlimited projects", included: true },
              { text: "GitHub integration", included: true },
              { text: "Stakeholder links", included: true },
              { text: "Email client", included: true },
              { text: "Basic AI", included: true },
              { text: "50GB storage", included: true },
              { text: "Advanced AI", included: false },
              { text: "SSO", included: false },
            ]}
          />

          {/* ULTIMATE */}
          <PlanCard 
            name="ULTIMATE"
            price="$18"
            note="or $180/year (save 20%)"
            cta="Upgrade"
            features={[
              { text: "Everything in Pro", included: true },
              { text: "Advanced AI + semantic search", included: true },
              { text: "SSO (Single Sign-On)", included: true },
              { text: "Custom roles", included: true },
              { text: "500GB storage", included: true },
              { text: "Priority support", included: true },
            ]}
          />
        </div>
      </section>

      {/* ─── SEATS MANAGEMENT ─── */}
      <section className="mt-12">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 mx-8">SEATS</h3>
        <div className="bg-[#272629] border border-zinc-800/50 rounded-xl p-8 mx-8">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[#E5E1E4]">8 of 8 seats used</h4>
            <button className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-widest hover:underline">
              Add seats
            </button>
          </div>
          
          <div className="relative mt-4">
            <Progress value={100} className="h-2 bg-zinc-800" indicatorClassName="bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]" />
            <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              <AlertTriangle className="h-3 w-3" />
              100% capacity — add seats to invite more members
            </div>
          </div>

          <div className="mt-8 space-y-1">
            {SEATS.map((seat, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800/30 last:border-0 group">
                <Avatar className="h-7 w-7 rounded-md">
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-500 rounded-md">{seat.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-300">{seat.name}</span>
                  <span className="text-[10px] text-zinc-600">{seat.role}</span>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-[10px] font-bold text-green-500/80 uppercase">Active</span>
                  <button className="p-2 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                 <p className="text-sm font-bold text-[#E5E1E4]">8 seats × $8/month = $64/month</p>
                 <p className="text-[10px] text-zinc-500 italic">Seats are added/removed with automatic proration</p>
              </div>
              <CTAButton className="h-9 px-4 text-[10px] uppercase tracking-widest">Update seats</CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INVOICES ─── */}
      <section className="mt-12">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 mx-8">INVOICES</h3>
        <div className="space-y-2 mx-8">
          {INVOICES.map((inv, i) => (
            <div key={i} className="bg-[#272629] border border-zinc-800/50 rounded-lg px-5 py-4 flex items-center gap-6 group hover:border-zinc-700 transition-colors">
              <div className="w-24 shrink-0">
                <p className="text-xs font-semibold text-[#E5E1E4]">{inv.date}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 truncate">{inv.desc}</p>
              </div>
              <div className="w-20 text-right">
                <p className="text-xs font-bold text-[#E5E1E4]">{inv.amount}</p>
              </div>
              <div className="w-20 flex justify-center">
                <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase h-5 px-1.5 rounded-sm border">
                  {inv.status}
                </Badge>
              </div>
              <button className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button className="mt-4 mx-8 text-[11px] font-bold text-[#7C5CFC] uppercase tracking-widest flex items-center gap-2 hover:underline">
          View all invoices in billing portal
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </section>

      {/* ─── PAYMENT METHOD ─── */}
      <section className="mt-12">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4 mx-8">PAYMENT METHOD</h3>
        <div className="bg-[#272629] border border-zinc-800/50 rounded-xl p-6 mx-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-12 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-zinc-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-[#E5E1E4]">Visa ending in 4242</p>
              <p className="text-[10px] text-zinc-500">Expires 12/27</p>
            </div>
          </div>
          <button className="text-[11px] font-bold text-[#7C5CFC] uppercase tracking-widest hover:underline">
            Update card
          </button>
        </div>
      </section>

      {/* ─── DANGER: CANCEL SUBSCRIPTION ─── */}
      <section className="mt-16">
        <h3 className="text-[10px] font-bold text-red-500/60 uppercase tracking-[0.2em] mb-4 mx-8">DANGER ZONE</h3>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 mx-8">
          <h4 className="text-sm font-semibold text-red-400">Cancel Pro Plan</h4>
          <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">
            Your workspace will downgrade to <span className="text-zinc-200 font-medium">Free</span> at the end of the current billing period (Apr 30, 2026). 
            You will lose GitHub integration, AI features, and storage over 1GB.
          </p>
          <button className="mt-6 h-9 px-4 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-red-500/10 transition-colors">
            Cancel Subscription
          </button>
        </div>
      </section>
    </div>
  )
}

function PlanCard({ 
  name, 
  price, 
  note, 
  features, 
  isCurrent, 
  cta 
}: { 
  name: string, 
  price: string, 
  note: string, 
  features: { text: string, included: boolean }[],
  isCurrent?: boolean,
  cta?: string
}) {
  return (
    <div className={cn(
      "bg-[#272629] border rounded-xl p-6 flex flex-col shadow-xl transition-all duration-300",
      isCurrent ? "border-violet-500/40 bg-violet-500/5 shadow-violet-950/5 scale-[1.02] relative" : "border-zinc-800/50 hover:border-zinc-700"
    )}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border-4 border-[#0E0E10]">
          Active
        </div>
      )}
      <div className="flex flex-col">
        <h4 className="text-sm font-bold text-[#E5E1E4] tracking-wider">{name}</h4>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[#E5E1E4]">{price}</span>
          <span className="text-xs text-zinc-500">/user/mo</span>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">{note}</p>
      </div>

      <div className="mt-8 space-y-3 flex-1">
        {features.map((f, i) => (
          <div key={i} className={cn("flex items-center gap-2.5", !f.included && "opacity-30")}>
            {f.included ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" strokeWidth={2} />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" strokeWidth={2} />
            )}
            <span className={cn("text-xs", f.included ? "text-zinc-300" : "text-zinc-600")}>{f.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-10">
        {isCurrent ? (
          <div className="w-full h-10 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center">
            Current Plan
          </div>
        ) : (
          <button className={cn(
            "w-full h-10 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
            cta === "Upgrade" 
              ? "bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black" 
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          )}>
            {cta || "Get Started"}
          </button>
        )}
      </div>
    </div>
  )
}
