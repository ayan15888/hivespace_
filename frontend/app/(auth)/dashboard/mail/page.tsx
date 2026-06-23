"use client"

import * as React from "react"
import { 
  Inbox, 
  Send, 
  Archive, 
  Trash2, 
  Star, 
  Search, 
  Reply, 
  ReplyAll, 
  Forward, 
  KanbanSquare, 
  Paperclip, 
  ArrowUp, 
  Pencil, 
  Mail,
  MoreHorizontal,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  LogOut,
  Loader2
} from "lucide-react"
// import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"
import { 
  getMailStatus, 
  getMailInbox, 
  sendMail, 
  disconnectMail, 
  getGoogleAuthUrl, 
  MailResponse 
} from "@/lib/api/mail"

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export default function EmailClientPage() {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null)
  const [connectedEmail, setConnectedEmail] = React.useState<string>("user@hivespace.com")
  const [emails, setEmails] = React.useState<MailResponse[]>([])
  const [filteredEmails, setFilteredEmails] = React.useState<MailResponse[]>([])
  const [selectedEmail, setSelectedEmail] = React.useState<MailResponse | null>(null)
  const [activeFolder, setActiveFolder] = React.useState("Inbox")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  // Reply state
  const [replyText, setReplyText] = React.useState("")
  const [isSendingReply, setIsSendingReply] = React.useState(false)

  // Compose state
  const [isComposing, setIsComposing] = React.useState(false)
  const [composeTo, setComposeTo] = React.useState("")
  const [composeSubject, setComposeSubject] = React.useState("")
  const [composeBody, setComposeBody] = React.useState("")
  const [isSendingCompose, setIsSendingCompose] = React.useState(false)

  // Load status and emails
  const loadMailData = React.useCallback(async () => {
    try {
      setLoading(true)
      const status = await getMailStatus()
      setIsConnected(status.connected)
      if (status.connected && status.email) {
        setConnectedEmail(status.email)
        const inboxEmails = await getMailInbox()
        setEmails(inboxEmails)
        setFilteredEmails(inboxEmails)
        if (inboxEmails.length > 0) {
          setSelectedEmail(inboxEmails[0])
        }
      }
    } catch (err) {
      console.error("Failed to load mail data", err)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadMailData()
  }, [loadMailData])

  // Handle Search Filtering
  React.useEffect(() => {
    if (!searchQuery) {
      setFilteredEmails(emails)
      return
    }
    const query = searchQuery.toLowerCase()
    const filtered = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(query) ||
        e.sender.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.preview.toLowerCase().includes(query)
    )
    setFilteredEmails(filtered)
  }, [searchQuery, emails])

  // Handle connection
  const handleConnectGmail = async () => {
    try {
      const token = getCookie("token")
      if (!token) {
        alert("Session token not found. Please log in again.")
        return
      }
      const res = await getGoogleAuthUrl(token)
      if (res && res.url) {
        window.location.href = res.url
      }
    } catch (err) {
      console.error("OAuth init failed", err)
      alert("Failed to connect to Google OAuth.")
    }
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Google email connection?")) {
      return
    }
    try {
      setLoading(true)
      await disconnectMail()
      setIsConnected(false)
      setEmails([])
      setFilteredEmails([])
      setSelectedEmail(null)
    } catch (err) {
      console.error("Failed to disconnect", err)
      alert("Failed to disconnect email account.")
    } finally {
      setLoading(false)
    }
  }

  // Handle reply sending
  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return
    try {
      setIsSendingReply(true)
      await sendMail({
        to: selectedEmail.email,
        subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        body: replyText,
        threadId: selectedEmail.id
      })
      setReplyText("")
      alert("Reply sent successfully!")
      loadMailData()
    } catch (err) {
      console.error("Failed to send reply", err)
      alert("Failed to send reply. Please try again.")
    } finally {
      setIsSendingReply(false)
    }
  }

  // Handle new mail composition
  const handleSendCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert("Please fill in all fields before sending.")
      return
    }
    try {
      setIsSendingCompose(true)
      await sendMail({
        to: composeTo,
        subject: composeSubject,
        body: composeBody
      })
      setComposeTo("")
      setComposeSubject("")
      setComposeBody("")
      setIsComposing(false)
      alert("Email sent successfully!")
      loadMailData()
    } catch (err) {
      console.error("Failed to send email", err)
      alert("Failed to send email. Please try again.")
    } finally {
      setIsSendingCompose(false)
    }
  }

  if (isConnected === null || (loading && emails.length === 0)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!isConnected) {
    return <NotConnectedState onConnect={handleConnectGmail} />
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ─── EMAIL SIDEBAR (260px) ─── */}
      <aside className="w-[260px] bg-hs-nav border-r border-border/30 flex flex-col px-3 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-8 w-8 rounded-lg border border-border">
            <AvatarFallback className="bg-primary/20 text-[10px] text-primary rounded-lg font-bold">
              {connectedEmail.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-[11px] font-medium text-foreground/80 truncate">{connectedEmail}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-muted-foreground font-medium tracking-tight">Sync active</span>
            </div>
          </div>
        </div>

        <CTAButton 
          onClick={() => {
            setIsComposing(true)
            setSelectedEmail(null)
          }}
          className="w-full h-10 mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest shadow-xl shadow-violet-500/5"
        >
          <Pencil className="h-3.5 w-3.5" />
          Compose
        </CTAButton>

        <nav className="mt-8 space-y-1">
          <FolderItem 
            icon={Inbox} 
            name="Inbox" 
            unread={emails.filter(e => e.unread).length.toString()} 
            active={activeFolder === "Inbox" && !isComposing} 
            onClick={() => {
              setActiveFolder("Inbox")
              setIsComposing(false)
              if (emails.length > 0) setSelectedEmail(emails[0])
            }} 
          />
          <FolderItem icon={Send} name="Sent" active={activeFolder === "Sent"} onClick={() => setActiveFolder("Sent")} />
          <FolderItem icon={Archive} name="Archive" active={activeFolder === "Archive"} onClick={() => setActiveFolder("Archive")} />
          <FolderItem icon={Trash2} name="Trash" active={activeFolder === "Trash"} onClick={() => setActiveFolder("Trash")} />
          <FolderItem icon={Star} name="Starred" active={activeFolder === "Starred"} onClick={() => setActiveFolder("Starred")} />
        </nav>

        <div className="mt-8 px-2">
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">LABELS</h4>
          <div className="space-y-3">
            <LabelItem color="bg-blue-500" name="Work" />
            <LabelItem color="bg-violet-500" name="Client" />
            <LabelItem color="bg-emerald-500" name="Internal" />
            <button className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-bold uppercase tracking-wider">
               <Plus className="h-3 w-3" />
               Add label
            </button>
          </div>
        </div>

        <div className="mt-auto px-2">
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2 text-[10px] text-red-500/70 hover:text-red-400 transition-colors font-bold uppercase tracking-wider"
          >
             <LogOut className="h-3.5 w-3.5" />
             Disconnect Account
          </button>
        </div>
      </aside>

      {/* ─── EMAIL LIST (340px) ─── */}
      <section className="w-[340px] bg-hs-card border-r border-border/30 flex flex-col flex-shrink-0">
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {emails.filter(e => e.unread).length} unread
            </span>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..." 
              className="bg-muted/50 border-border h-9 text-xs pl-9 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {filteredEmails.map((email) => (
            <div 
              key={email.id} 
              onClick={() => {
                setSelectedEmail(email)
                setIsComposing(false)
              }}
              className={cn(
                "relative flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors border-b border-zinc-800/30",
                email.id === selectedEmail?.id ? "bg-zinc-800/40" : "hover:bg-zinc-800/20",
                email.unread && "bg-violet-500/5"
              )}
            >
              {email.unread && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500" />
              )}
              <Avatar className="h-9 w-9 rounded-full shrink-0 border border-border">
                <AvatarFallback className={cn("text-[11px] font-bold", email.color)}>
                  {email.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={cn("text-xs truncate", email.unread ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                    {email.sender}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2 max-w-[80px] truncate">{email.time}</span>
                </div>
                <p className={cn("text-xs truncate mb-1", email.unread ? "text-foreground/80 font-medium" : "text-muted-foreground/70")}>
                  {email.subject}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate leading-relaxed">
                  {email.preview}
                </p>
              </div>
              {email.unread && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </div>
          ))}
          {filteredEmails.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No emails found
            </div>
          )}
        </div>
      </section>

      {/* ─── EMAIL DETAIL / COMPOSE (flex-1) ─── */}
      <main className="flex-1 bg-hs-main flex flex-col overflow-hidden min-w-0">
        {isComposing ? (
          <div className="flex-1 flex flex-col overflow-hidden p-8">
            <h2 className="text-lg font-bold text-foreground mb-6">Compose New Email</h2>
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">To</label>
                <Input 
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com" 
                  className="bg-hs-card border-border h-10 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Subject</label>
                <Input 
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Enter subject line" 
                  className="bg-hs-card border-border h-10 text-xs"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Message</label>
                <textarea 
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your email body here..."
                  className="flex-1 w-full bg-hs-card border border-border rounded-xl p-5 outline-none text-sm text-foreground placeholder:text-muted-foreground/30 resize-none scrollbar-none focus:border-border/80 transition-colors"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  onClick={() => setIsComposing(false)}
                  className="h-10 px-6 rounded-lg border border-border text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors text-muted-foreground"
                >
                  Cancel
                </button>
                <CTAButton 
                  onClick={handleSendCompose}
                  disabled={isSendingCompose}
                  className="h-10 px-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest"
                >
                  {isSendingCompose ? "Sending..." : "Send"}
                  {!isSendingCompose && <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
                </CTAButton>
              </div>
            </div>
          </div>
        ) : selectedEmail ? (
          <>
            {/* Detail Header */}
            <header className="px-8 py-6 border-b border-border/30 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-foreground tracking-tight truncate">
                    {selectedEmail.subject}
                  </h1>
                  <div className="flex items-center gap-4 mt-4">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className={cn("text-xs font-bold", selectedEmail.color)}>
                        {selectedEmail.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                         <span className="text-sm font-semibold text-foreground">{selectedEmail.sender}</span>
                         <span className="text-[10px] text-muted-foreground tracking-tight">{"<"}{selectedEmail.email}{">"}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        To: <span className="text-foreground/70 font-medium">{connectedEmail}</span> · {selectedEmail.time}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                   <DetailAction icon={Reply} />
                   <DetailAction icon={ReplyAll} />
                   <DetailAction icon={Forward} />
                   <div className="w-px h-4 bg-zinc-800 mx-2" />
                   <DetailAction icon={Archive} />
                   <DetailAction icon={Trash2} />
                   <DetailAction icon={MoreHorizontal} />
                </div>
              </div>
            </header>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto px-8 py-10 scrollbar-none">
              <div className="max-w-3xl space-y-6 text-sm text-foreground/80 leading-relaxed font-light whitespace-pre-line">
                {selectedEmail.body}

                <div className="pt-8 flex flex-col items-start gap-4">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted border border-border hover:border-primary/40 transition-all group">
                     <KanbanSquare className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-foreground">Convert to task</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Reply Compose */}
            <div className="px-8 pb-8 pt-2 flex-shrink-0">
               <div className="bg-hs-nav border border-border rounded-xl p-5 shadow-2xl shadow-black/5 focus-within:border-border/80 transition-colors">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Reply to {selectedEmail.sender}</p>
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/30 resize-none min-h-[120px] scrollbar-none"
                    placeholder="Write a reply..."
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-4 text-zinc-500">
                       <div className="flex items-center gap-2">
                         <DetailAction icon={Bold} />
                         <DetailAction icon={Italic} />
                         <DetailAction icon={UnderlineIcon} />
                       </div>
                       <div className="w-px h-4 bg-zinc-800" />
                       <DetailAction icon={Paperclip} />
                    </div>
                    <CTAButton 
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="h-9 px-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest group"
                    >
                       {isSendingReply ? "Sending..." : "Send"}
                       {!isSendingReply && <ArrowUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2.5} />}
                    </CTAButton>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-800">
             <Mail className="h-16 w-16 mb-6 opacity-10" strokeWidth={1} />
             <p className="text-sm font-medium text-zinc-600">Select an email to read or click Compose to write one</p>
          </div>
        )}
      </main>
    </div>
  )
}

function FolderItem({ icon: Icon, name, unread, active, onClick }: { icon: React.ElementType, name: string, unread?: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full h-9 px-3 flex items-center justify-between rounded-md transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", active ? "text-[#7C5CFC]" : "text-zinc-500")} strokeWidth={active ? 2 : 1.5} />
        <span className="text-xs font-medium">{name}</span>
      </div>
      {unread && unread !== "0" && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
          active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        )}>
          {unread}
        </span>
      )}
    </button>
  )
}

function LabelItem({ color, name }: { color: string, name: string }) {
  return (
    <button className="flex items-center gap-3 px-2 w-full hover:bg-zinc-800/30 rounded py-1 transition-colors group">
      <div className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors font-medium">{name}</span>
    </button>
  )
}

function DetailAction({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )
}

function NotConnectedState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-[#0E0E10]">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl">
          <Mail className="h-10 w-10 text-zinc-600" strokeWidth={1} />
        </div>
        <h1 className="text-2xl font-semibold text-[#E5E1E4] tracking-tight">Connect your work email</h1>
        <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
          Read and send emails directly inside Hivespace. Connect your Google Workspace or Gmail account to get started.
        </p>
        
        <div className="mt-10 flex justify-center w-full">
           <button 
             onClick={onConnect}
             className="h-12 w-full max-w-[240px] flex items-center justify-center gap-3 rounded-lg bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-violet-500/10 hover:opacity-95 transition-all group"
           >
             <div className="h-5 w-5 bg-white rounded-full flex items-center justify-center p-1 group-hover:scale-110 transition-transform">
               <svg viewBox="0 0 24 24" className="h-full w-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             </div>
             Connect Gmail
           </button>
        </div>

        <p className="mt-12 text-[10px] text-zinc-600 leading-relaxed max-w-[280px]">
          Your credentials are encrypted and stored securely. <br/>
          Hivespace never stores your email content.
        </p>
      </div>
    </div>
  )
}
