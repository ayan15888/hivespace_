"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { 
  Users, 
  Search, 
  Pin, 
  Settings, 
  SmilePlus, 
  MessageSquare, 
  AtSign, 
  MoreHorizontal,
  GitPullRequest,
  Hash,
  Smile,
  PlusCircle,
  ArrowUp,
  X,
  Bold,
  Italic,
  Code as CodeIcon,
  Link as LinkIcon,
  List as ListIcon,
  Trash2,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { useChatStore } from "@/store/chatStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuthStore } from "@/store/authStore";
import { useChannelSocket } from "@/hooks/useChannelSocket";
import { 
  getMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage, 
  getThreadMessages, 
  addReaction, 
  removeReaction,
  sendAiCommand 
} from "@/lib/api/messages";
import { markChannelRead, getChannelMembers } from "@/lib/api/channels";
import type { ChannelMemberInfo } from "@/lib/api/channels";
import type { MessageResponse, UserSummary } from "@/types/messaging";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";

const EMOJIS = ["👍", "🚀", "❤️", "🔥", "👀", "🙌", "🎉", "😮"];

export default function ChatPage({ params }: { params: Promise<{ channel: string }> }) {
  const { channel: channelId } = use(params);
  const { projects } = useProjects();
  const { user: currentUser } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  
  const { 
    channels, 
    messages, 
    setMessages, 
    prependOlderMessages, 
    appendMessage, 
    updateMessage, 
    removeMessage,
    clearUnread,
    typingUsers, 
    setTyping, 
    activeThreadParentId, 
    setActiveThread, 
    threadMessages, 
    setThreadMessages, 
    appendThreadMessage,
    updateThreadMessage,
    hasMoreMessages
  } = useChatStore();

  const workspaceChannels = activeWorkspace ? (channels[activeWorkspace.id] ?? []) : [];
  const currentChannel = workspaceChannels.find(c => c.id === channelId);

  const currentProject = projects.find(p => p.id === currentChannel?.projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";

  const channelMessages = messages[channelId] ?? [];
  const hasMore = hasMoreMessages[channelId] ?? true;

  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [threadInputValue, setThreadInputValue] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Reset members panel when switching channels
  useEffect(() => {
    setShowMembers(false);
    setChannelMembers([]);
  }, [channelId]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    getMessages(channelId)
      .then((msgs) => {
        setMessages(channelId, msgs, msgs.length === 50);
        markChannelRead(channelId).catch(() => {});
        clearUnread(channelId);
        // Scroll to bottom instantly
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      })
      .catch((err) => {
        console.error("Failed to fetch messages", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [channelId, setMessages, clearUnread]);

  // Scroll to bottom on channel change or initial message load completion
  useEffect(() => {
    if (channelMessages.length > 0 && !loading) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [channelId, loading]);

  // Load older messages on scroll
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || loading || !hasMore) return;

    if (container.scrollTop === 0 && channelMessages.length > 0) {
      setLoading(true);
      const oldestMessageId = channelMessages[channelMessages.length - 1].id;
      const prevHeight = container.scrollHeight;

      getMessages(channelId, oldestMessageId)
        .then((older) => {
          prependOlderMessages(channelId, older, older.length === 50);
          setTimeout(() => {
            container.scrollTop = container.scrollHeight - prevHeight;
          }, 50);
        })
        .catch((err) => {
          console.error("Failed to load older messages", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const activeThread = channelMessages.find(m => m.id === activeThreadParentId) || null;

  // Close thread on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeThreadParentId) {
        setActiveThread(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeThreadParentId, setActiveThread]);

  // Load thread messages
  useEffect(() => {
    if (!activeThreadParentId) return;
    getThreadMessages(channelId, activeThreadParentId)
      .then((msgs) => {
        setThreadMessages(activeThreadParentId, msgs);
      })
      .catch((err) => {
        console.error("Failed to fetch thread messages", err);
      });
  }, [activeThreadParentId, channelId, setThreadMessages]);

  // WebSocket Connection
  const { sendTyping, isConnected } = useChannelSocket({
    channelId,
    onMessage: (msg) => {
      // Use getState() to avoid stale closure — always read current store snapshot
      const freshMessages = useChatStore.getState().messages[channelId] ?? [];
      if (msg.parentId) {
        // Handle thread reply
        const freshThreadList = useChatStore.getState().threadMessages[msg.parentId] ?? [];
        const exists = freshThreadList.some(m => m.id === msg.id);
        if (exists) {
          updateThreadMessage(msg.parentId, msg);
        } else {
          appendThreadMessage(msg.parentId, msg);
          const parentMsg = freshMessages.find(m => m.id === msg.parentId);
          if (parentMsg) {
            updateMessage(channelId, { ...parentMsg, replyCount: parentMsg.replyCount + 1 });
          }
        }
      } else {
        // Handle channel message (new, edit, or reaction update)
        const exists = freshMessages.some(m => m.id === msg.id);
        if (exists) {
          // Already in store: our own optimistic append OR an edit/reaction update
          updateMessage(channelId, msg);
        } else {
          // Someone else's new message — append and auto-scroll
          appendMessage(channelId, msg);
          const container = messagesContainerRef.current;
          if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }
          }
        }
      }
    },
    onDelete: (msgId) => {
      removeMessage(channelId, msgId);
    },
    onReaction: (event) => {
      console.log("[WS onReaction Callback]", event);
      const isSelf = event.userId === currentUser?.id;
      console.log("isSelf evaluation:", isSelf, "event.userId:", event.userId, "currentUser.id:", currentUser?.id);
      if (isSelf) return; // Skip because the optimistic update already handled it

      const freshMsg = useChatStore.getState().messages[channelId]?.find(m => m.id === event.messageId);
      console.log("Found message in store for reaction update:", freshMsg);
      if (!freshMsg) return;
      const prevReactions = freshMsg.reactions ?? [];
      let updatedReactions;
      if (event.delta === 1) {
        // Reaction added
        updatedReactions = prevReactions.some(r => r.emoji === event.emoji)
          ? prevReactions.map(r => r.emoji === event.emoji
              ? { ...r, count: r.count + 1, reactedByMe: r.reactedByMe || isSelf }
              : r)
          : [...prevReactions, { emoji: event.emoji, count: 1, reactedByMe: isSelf }];
      } else {
        // Reaction removed
        updatedReactions = prevReactions
          .map(r => r.emoji === event.emoji
            ? { ...r, count: r.count - 1, reactedByMe: isSelf ? false : r.reactedByMe }
            : r)
          .filter(r => r.count > 0);
      }
      updateMessage(channelId, { ...freshMsg, reactions: updatedReactions });
    },
    onTyping: (event) => {
      setTyping(channelId, event.userId, event.displayName, event.typing);
    },
    threadParentId: activeThreadParentId || undefined,
    onThreadMessage: (msg) => {
      const freshThreadList = useChatStore.getState().threadMessages[activeThreadParentId!] ?? [];
      const exists = freshThreadList.some(m => m.id === msg.id);
      if (exists) {
        updateThreadMessage(activeThreadParentId!, msg);
      } else {
        appendThreadMessage(activeThreadParentId!, msg);
      }
    }
  });

  // Polling fallback: if WS is disconnected, poll every 4s so receiver always sees updates
  useEffect(() => {
    if (isConnected) return; // WS is live — no need to poll
    const interval = setInterval(() => {
      getMessages(channelId)
        .then((msgs) => {
          // Only update if there are genuinely new messages
          const currentIds = new Set(useChatStore.getState().messages[channelId]?.map(m => m.id) ?? []);
          const hasNew = msgs.some(m => !currentIds.has(m.id));
          if (hasNew) {
            setMessages(channelId, msgs, msgs.length === 50);
          }
        })
        .catch(() => {}); // silently ignore poll errors
    }, 4000);
    return () => clearInterval(interval);
  }, [isConnected, channelId, setMessages]);

  // Handle compose typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    sendTyping(true);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setMentionDropdownVisible(true);
      setMentionIndex(0);
      if (channelMembers.length === 0) {
        getChannelMembers(channelId).then(setChannelMembers).catch(() => {});
      }
    } else {
      setMentionDropdownVisible(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = inputValue.slice(0, cursor);
    const textAfterCursor = inputValue.slice(cursor);
    
    const words = textBeforeCursor.split(/\s/);
    words.pop(); // Remove the incomplete @mention
    const newTextBefore = words.length > 0 ? words.join(" ") + " @" + username + " " : "@" + username + " ";
    
    setInputValue(newTextBefore + textAfterCursor);
    setMentionDropdownVisible(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newTextBefore.length;
        textareaRef.current.selectionEnd = newTextBefore.length;
      }
    }, 0);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const content = inputValue.trim();
    setInputValue("");
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    try {
      let msg;
      if (content.toLowerCase().startsWith("/ai")) {
        msg = await sendAiCommand(channelId, content);
      } else {
        msg = await sendMessage(channelId, { content });
      }
      appendMessage(channelId, msg);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err: any) {
      console.error("Failed to send message", err);
      toast.error(err.message || "Failed to send message");
    }
  };

  const handleSendThreadReply = async () => {
    if (!threadInputValue.trim() || !activeThreadParentId) return;
    const content = threadInputValue.trim();
    setThreadInputValue("");
    try {
      const msg = await sendMessage(channelId, { content, parentId: activeThreadParentId });
      appendThreadMessage(activeThreadParentId, msg);
      
      const parentMsg = channelMessages.find(m => m.id === activeThreadParentId);
      if (parentMsg) {
        updateMessage(channelId, { ...parentMsg, replyCount: parentMsg.replyCount + 1 });
      }
    } catch (err) {
      console.error("Failed to send thread reply", err);
    }
  };

  const handleReactionClick = async (messageId: string, emoji: string, reactedByMe: boolean) => {
    // Optimistic update — immediately reflect the change in the UI
    const prevMsg = useChatStore.getState().messages[channelId]?.find(m => m.id === messageId);
    if (prevMsg) {
      const prevReactions = prevMsg.reactions ?? [];
      const updatedReactions = reactedByMe
        ? prevReactions
            .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r)
            .filter(r => r.count > 0)
        : prevReactions.some(r => r.emoji === emoji)
          ? prevReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r)
          : [...prevReactions, { emoji, count: 1, reactedByMe: true }];
      updateMessage(channelId, { ...prevMsg, reactions: updatedReactions });
    }

    try {
      if (reactedByMe) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
      // WS broadcast from backend will confirm & sync the final state for all viewers
    } catch (err) {
      console.error("Failed to update reaction", err);
      // Roll back the optimistic update on failure
      if (prevMsg) updateMessage(channelId, prevMsg);
    }
  };

  // Group messages DESC list reversing for chronological display
  const displayMessages = [...channelMessages].reverse();

  // Grouping logic: messages from same sender within 5 mins
  type GroupedItem = 
    | { type: "date"; data: string } 
    | { type: "message"; data: MessageResponse & { isGrouped: boolean } };

  const groupedMessages: GroupedItem[] = [];
  let lastDay = "";
  let lastMessage: MessageResponse | null = null;

  displayMessages.forEach((msg) => {
    const dateObj = new Date(msg.createdAt);
    const msgDay = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    let dayChanged = false;
    
    if (msgDay !== lastDay) {
      groupedMessages.push({ type: "date", data: msgDay });
      lastDay = msgDay;
      dayChanged = true;
    }

    const unixTime = dateObj.getTime() / 1000;
    const lastUnixTime = lastMessage ? new Date(lastMessage.createdAt).getTime() / 1000 : 0;

    const isGrouped = !dayChanged && 
                     !!lastMessage && 
                     lastMessage.sender?.id === msg.sender?.id && 
                     (unixTime - lastUnixTime) < 300 &&
                     msg.type !== "AI" && 
                     lastMessage.type !== "AI";

    groupedMessages.push({ 
      type: "message", 
      data: { ...msg, isGrouped: !!isGrouped } 
    });
    lastMessage = msg;
  });

  const activeTypingUsers = typingUsers[channelId] ?? [];
  const otherTypingUsers = activeTypingUsers.filter(u => u.userId !== currentUser?.id && u.typing);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* --- MAIN CHAT AREA --- */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        
        {/* CHANNEL TOP BAR */}
        <header className="sticky top-0 z-20 flex h-[48px] shrink-0 items-center justify-between bg-background/80 backdrop-blur-md px-4 border-b border-border/50">
          <div className="flex items-center">
            <Hash className="h-4 w-4 text-muted-foreground mr-1" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">{currentChannel?.name || "Chat"}</span>
            <div className="w-px h-4 bg-border/50 mx-3" />
            <span className="text-xs text-muted-foreground truncate max-w-[400px]">
              {currentChannel?.type === 'DM' ? "Direct conversation" : "Engineering team workspace discussion"}
            </span>
            {/* WS connection status dot */}
            <div
              title={isConnected ? "Live" : "Reconnecting…"}
              className={cn(
                "ml-3 h-2 w-2 rounded-full shrink-0 transition-colors",
                isConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
              )}
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 transition-colors", showMembers ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              onClick={async () => {
                if (showMembers) {
                  setShowMembers(false);
                  return;
                }
                setShowMembers(true);
                if (channelMembers.length === 0) {
                  setMembersLoading(true);
                  try {
                    const members = await getChannelMembers(channelId);
                    setChannelMembers(members);
                  } catch (err) {
                    console.error("Failed to fetch channel members", err);
                  } finally {
                    setMembersLoading(false);
                  }
                }
              }}
            >
              <Users className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Button>
            <IconButton icon={Search} label="Search" />
            <IconButton icon={Pin} label="Pinned" />
            <IconButton icon={Settings} label="Settings" />
          </div>
        </header>

        {/* MESSAGE LIST */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1"
        >
          {loading && (
            <div className="flex justify-center p-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {groupedMessages.map((item, i) => (
            item.type === "date" ? (
              <DateSeparator key={`date-${i}`} date={item.data} />
            ) : (
              <MessageItem 
                key={item.data.id} 
                message={item.data} 
                channelId={channelId}
                currentUserId={currentUser?.id}
                onReply={() => setActiveThread(item.data.id)}
                onReact={(emoji, reacted) => handleReactionClick(item.data.id, emoji, reacted)}
                themeColor={themeColor}
                channelMembers={channelMembers}
              />
            )
          ))}

          {/* TYPING INDICATOR */}
          {otherTypingUsers.length > 0 && (
            <div className="flex items-center gap-2 mt-2 group animate-in slide-in-from-left-2 duration-300">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">SA</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 italic">
                  {otherTypingUsers.map(u => u.displayName).join(", ")} {otherTypingUsers.length === 1 ? "is" : "are"} typing
                </span>
                <div className="flex gap-1 items-center h-2">
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse" />
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse [animation-delay:200ms]" />
                  <div className="h-1 w-1 bg-zinc-600 rounded-full animate-pulse [animation-delay:400ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* COMPOSE BAR */}
        <div className="p-4 pt-0 shrink-0">
          <div className={cn(
             "relative flex flex-col bg-hs-card/80 backdrop-blur-sm border rounded-xl transition-all duration-200",
             inputFocused ? "shadow-[0_0_15px_rgba(124,92,252,0.1)]" : "border-border"
          )} style={inputFocused ? { borderColor: `${themeColor}80` } : undefined}>
            {/* Formatting Toolbar */}
            {inputFocused && (
              <div className="flex items-center h-9 px-3 border-b border-zinc-700/50 gap-1 animate-in fade-in slide-in-from-top-1">
                <ToolbarButton icon={Bold} />
                <ToolbarButton icon={Italic} />
                <ToolbarButton icon={CodeIcon} />
                <div className="w-px h-3.5 bg-zinc-700/50 mx-1" />
                <ToolbarButton icon={LinkIcon} />
                <ToolbarButton icon={ListIcon} />
              </div>
            )}

            <div className="flex flex-col p-2 relative">
              {mentionDropdownVisible && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                  {(() => {
                    const filteredMembers = [
                      { username: "all", fullName: "Everyone in channel", isAll: true, avatarColor: themeColor, userId: "all" },
                      ...channelMembers.filter(m => m.username.toLowerCase().includes(mentionQuery) || (m.fullName && m.fullName.toLowerCase().includes(mentionQuery)))
                    ];
                    if (filteredMembers.length === 0) {
                      return <div className="p-3 text-xs text-zinc-500">No members found</div>;
                    }
                    return (
                      <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
                        {filteredMembers.map((member, idx) => (
                          <div
                            key={member.userId || member.username}
                            onClick={() => insertMention(member.username)}
                            onMouseEnter={() => setMentionIndex(idx)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                              idx === mentionIndex ? "bg-white/10" : "hover:bg-white/5"
                            )}
                          >
                            {(member as any).isAll ? (
                              <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                <Users className="h-3 w-3 text-zinc-400" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: member.avatarColor || themeColor }}>
                                {(member as any).avatarUrl ? <img src={(member as any).avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : (member.fullName || member.username || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium text-foreground truncate">{member.fullName || member.username}</span>
                              {!(member as any).isAll && <span className="text-[10px] text-zinc-500 truncate">@{member.username}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              <textarea 
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (mentionDropdownVisible) {
                    const filteredMembers = [
                      { username: "all", fullName: "Everyone in channel", isAll: true, avatarColor: themeColor, userId: "all" },
                      ...channelMembers.filter(m => m.username.toLowerCase().includes(mentionQuery) || (m.fullName && m.fullName.toLowerCase().includes(mentionQuery)))
                    ];
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMentionIndex(prev => (prev + 1) % filteredMembers.length);
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      if (filteredMembers[mentionIndex]) {
                        insertMention(filteredMembers[mentionIndex].username);
                      }
                      return;
                    }
                    if (e.key === "Escape") {
                      setMentionDropdownVisible(false);
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={`Message #${currentChannel?.name || "Chat"}`}
                className="w-full bg-transparent border-none text-sm text-foreground outline-none placeholder:text-muted-foreground/60 resize-none min-h-[40px] px-2 py-1"
              />

              <div className="flex items-center justify-between mt-1 px-1">
                <div className="flex items-center gap-3">
                  <IconButtonSmall icon={PlusCircle} />
                  <IconButtonSmall icon={AtSign} />
                  <IconButtonSmall icon={Hash} />
                  <IconButtonSmall icon={Smile} />
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">/</span>
                    <span className="text-[10px] text-zinc-500">for AI</span>
                  </div>
                </div>

                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={cn(
                    "h-7 w-7 rounded-md transition-all",
                    inputValue.trim() ? "text-white hover:opacity-90 cursor-pointer" : "bg-zinc-700 text-zinc-500"
                  )}
                  style={inputValue.trim() ? { backgroundColor: themeColor } : undefined}
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- THREAD PANEL --- */}
      {activeThread && (
        <aside className="w-[340px] shrink-0 bg-background/70 backdrop-blur-2xl border-l border-border/30 flex flex-col shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-300 relative z-30">
          <div className="absolute inset-x-0 top-0 h-32 pointer-events-none opacity-40" style={{ backgroundImage: `linear-gradient(to bottom, ${themeColor}30, transparent)` }} />
          
          <header className="flex h-[56px] items-center justify-between px-5 border-b border-white/5 relative z-10">
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-foreground tracking-tight drop-shadow-sm">Thread</span>
              <span className="text-[11px] text-muted-foreground font-medium"># {currentChannel?.name || "Chat"}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setActiveThread(null)} className="h-8 w-8 rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground backdrop-blur-sm transition-all">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex flex-col flex-1 overflow-y-auto p-5 gap-6 scrollbar-thin scrollbar-thumb-white/10 relative z-10">
             {/* Original message */}
             <div className="opacity-90 relative">
                <div className="absolute -inset-2 bg-gradient-to-b from-white/5 to-transparent rounded-xl -z-10 border border-white/5" />
                <MessageItem 
                  message={{...activeThread, isGrouped: false}} 
                  channelId={channelId}
                  currentUserId={currentUser?.id}
                  isThreadParent 
                  themeColor={themeColor}
                  channelMembers={channelMembers} 
                />
             </div>

             <div className="relative flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap bg-background/50 px-2 rounded-full py-0.5 border border-white/5">
                  {threadMessages[activeThreadParentId!]?.length || 0} Replies
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
             </div>

             {/* Replies */}
             {(threadMessages[activeThreadParentId!] ?? []).map(reply => (
               <MessageItem 
                 key={reply.id} 
                 message={{...reply, isGrouped: false}} 
                 channelId={channelId}
                 currentUserId={currentUser?.id}
                 themeColor={themeColor}
                 channelMembers={channelMembers}
               />
             ))}
          </div>

          <div className="p-4 border-t border-white/5 bg-background/40 backdrop-blur-md relative z-10">
             <div className="flex gap-2 relative group">
                <div className="absolute -inset-0.5 rounded-lg opacity-20 group-focus-within:opacity-40 blur transition-opacity duration-300" style={{ backgroundColor: themeColor }} />
                <input 
                  type="text" 
                  value={threadInputValue}
                  onChange={(e) => setThreadInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendThreadReply();
                    }
                  }}
                  placeholder="Reply to thread..."
                  className="flex-1 bg-zinc-950/80 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 text-sm text-foreground outline-none placeholder:text-zinc-500 shadow-inner relative z-10 transition-all focus:border-white/20"
                />
                <Button 
                  size="icon"
                  onClick={handleSendThreadReply}
                  style={{ backgroundColor: themeColor }}
                  className="relative z-10 text-white h-9 w-9 rounded-lg shadow-lg hover:brightness-110 transition-all shrink-0"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </Button>
             </div>
          </div>
        </aside>
      )}

      {/* --- MEMBERS PANEL --- */}
      {showMembers && (
        <aside className="w-[280px] shrink-0 bg-background/70 backdrop-blur-2xl border-l border-border/30 flex flex-col shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-300 relative z-30">
          <div className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-30" style={{ backgroundImage: `linear-gradient(to bottom, ${themeColor}20, transparent)` }} />

          <header className="flex h-[56px] items-center justify-between px-5 border-b border-white/5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-white/5 backdrop-blur-sm border border-white/5">
                <Users className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
              </div>
              <span className="text-[15px] font-semibold text-foreground tracking-tight drop-shadow-sm">Members</span>
              {channelMembers.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-foreground border border-white/5 shadow-sm">
                  {channelMembers.length}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowMembers(false)} className="h-8 w-8 rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground backdrop-blur-sm transition-all">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-white/10 relative z-10">
            {membersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="h-3 w-24 rounded bg-white/10" />
                    <div className="h-2 w-16 rounded bg-white/5" />
                  </div>
                </div>
              ))
            ) : channelMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-50">
                <Users className="h-8 w-8 mb-3" />
                <p className="text-xs text-foreground font-medium">No members found</p>
              </div>
            ) : (
              channelMembers.map((member) => {
                const initials = (member.fullName || member.username || "?")
                  .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                const isCurrentUser = member.userId === currentUser?.id;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all group border border-transparent hover:border-white/5 cursor-pointer"
                  >
                    <div
                      className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-black/20"
                      style={{ backgroundColor: member.avatarColor || themeColor }}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : initials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-semibold text-foreground truncate drop-shadow-sm">
                        {member.fullName || member.username}
                        {isCurrentUser && <span className="text-muted-foreground/80 font-normal ml-1 text-[11px] bg-white/5 px-1.5 py-0.5 rounded-md">you</span>}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate group-hover:text-muted-foreground/80 transition-colors">@{member.username}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

    </div>
  );
}

// --- SUB-COMPONENTS ---

function MessageItem({ 
  message, 
  channelId,
  currentUserId,
  onReply, 
  onReact,
  isThreadParent,
  themeColor = "#7C5CFC",
  channelMembers = []
}: { 
  message: MessageResponse & { isGrouped?: boolean }; 
  channelId: string;
  currentUserId?: string;
  onReply?: () => void; 
  onReact?: (emoji: string, reacted: boolean) => void;
  isThreadParent?: boolean;
  themeColor?: string;
  channelMembers?: ChannelMemberInfo[];
}) {
  const isAI = message.type === "AI";
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const getInitials = (user: UserSummary | null) => {
    if (!user || !user.fullName) return "?";
    return user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColorClass = (user: UserSummary | null) => {
    if (!user) return "bg-zinc-800";
    if (user.avatarColor) return user.avatarColor;
    const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-pink-500"];
    const idx = Math.abs(user.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
    return colors[idx];
  };

  const formatTimestamp = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const handleEditSubmit = async () => {
    if (!editValue.trim() || editValue === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(channelId, message.id, { content: editValue.trim() });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  const handleDeleteClick = async () => {
    if (confirm("Delete this message?")) {
      try {
        await deleteMessage(channelId, message.id);
      } catch (err) {
        console.error("Failed to delete message", err);
      }
    }
  };

  const isMyMessage = message.sender?.id === currentUserId;

  return (
    <div className={cn(
      "group relative flex gap-3 px-2 py-1 rounded-sm transition-colors hover:bg-muted/20",
      isAI ? "p-3 rounded-r-md mt-2" : "",
      message.isGrouped ? "mt-0" : "mt-4"
    )} style={isAI ? { borderLeft: `2px solid ${themeColor}`, backgroundColor: `${themeColor}10` } : undefined}>
      
      {/* LEFT SIDE: AVATAR OR TIMESTAMP */}
      {!message.isGrouped ? (
        <Avatar className="h-8 w-8 shrink-0 mt-0.5 shadow-lg shadow-black/20">
          {message.sender?.avatarUrl ? (
            <img src={message.sender.avatarUrl} alt="" className="object-cover h-full w-full" />
          ) : (
            <AvatarFallback className={cn("text-xs font-bold text-white", getAvatarColorClass(message.sender))}>
              {getInitials(message.sender)}
            </AvatarFallback>
          )}
        </Avatar>
      ) : (
        <div className="w-8 shrink-0 flex justify-center">
          <span className="text-[10px] text-zinc-700 font-medium invisible group-hover:visible absolute left-0 mt-1 pl-3">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
      )}

      {/* CONTENT SIDE */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!message.isGrouped && (
          <div className="flex items-center mb-0.5">
            <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
              {message.sender?.fullName || "Deleted User"}
            </span>
            <span className="text-[10px] text-muted-foreground ml-2 font-medium">
              {new Date(message.createdAt).toLocaleDateString()} {formatTimestamp(message.createdAt)}
            </span>
            {message.isEdited && <span className="text-[9px] text-zinc-500 ml-2">(edited)</span>}
          </div>
        )}

        {isAI && <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1">✦ AI Assistant</span>}

        {isEditing ? (
          <div className="flex gap-2 mt-1">
            <input 
              type="text" 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSubmit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-sm text-foreground outline-none"
            />
            <Button size="sm" onClick={handleEditSubmit} className="text-white text-xs h-8">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-zinc-500 text-xs h-8">Cancel</Button>
          </div>
        ) : (
          <div className={cn(
            "text-sm leading-relaxed",
            message.isDeleted ? "text-zinc-500 italic" : "text-foreground"
          )}>
            {(() => {
              if (message.isDeleted) return message.content;
              const content = message.content || "";
              const parts = content.split(/(@\w+)/g);
              
              return (
                <>
                  {parts.map((part, index) => {
                    if (part.startsWith('@') && part.length > 1) {
                      const username = part.slice(1);
                      
                      if (username.toLowerCase() === "all" || username.toLowerCase() === "everyone") {
                        return (
                          <span 
                            key={index} 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 align-middle bg-zinc-800 rounded-full"
                          >
                            <span className="flex items-center justify-center h-4 w-4 shrink-0 bg-zinc-700 text-zinc-300 rounded-full">
                              <Users className="h-[10px] w-[10px]" />
                            </span>
                            <span className="font-bold text-[12px] text-white tracking-tight" style={{ color: themeColor }}>
                              {part}
                            </span>
                          </span>
                        );
                      }

                      const member = channelMembers?.find(m => m.username.toLowerCase() === username.toLowerCase());
                      
                      let avatarContent;
                      if (member?.avatarUrl) {
                        avatarContent = <img src={member.avatarUrl} alt="" className="h-full w-full object-cover rounded-full" />;
                      } else {
                        const displayUsername = member?.fullName || member?.username || username;
                        const initial = displayUsername.charAt(0).toUpperCase();
                        const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-pink-500"];
                        const colorIdx = Math.abs(displayUsername.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
                        const bgClass = member?.avatarColor || colors[colorIdx];
                        avatarContent = (
                          <span className={cn("flex items-center justify-center h-full w-full text-[9px] font-bold text-white rounded-full", member?.avatarColor ? "" : bgClass)} style={member?.avatarColor ? { backgroundColor: member.avatarColor } : undefined}>
                            {initial}
                          </span>
                        );
                      }

                      return (
                        <span 
                          key={index} 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 align-middle bg-zinc-800 rounded-full"
                        >
                          <span className="flex items-center justify-center h-4 w-4 shrink-0 rounded-full">
                            {avatarContent}
                          </span>
                          <span className="font-bold text-[12px] text-white tracking-tight" style={{ color: themeColor }}>
                            {part}
                          </span>
                        </span>
                      );
                    }
                    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* REACTIONS */}
        {!message.isDeleted && message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {message.reactions.map((r, idx: number) => (
              <div 
                key={idx} 
                onClick={() => onReact?.(r.emoji, r.reactedByMe)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer",
                  r.reactedByMe 
                    ? "border-transparent" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700"
                )}
                style={r.reactedByMe ? { backgroundColor: `${themeColor}30`, color: themeColor, borderColor: `${themeColor}50` } : undefined}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* THREAD REPLY COUNT */}
        {!isThreadParent && message.replyCount > 0 && (
          <button 
            onClick={onReply}
            className="flex items-center gap-1 text-[11px] font-semibold mt-2 hover:underline tracking-tight text-left self-start"
            style={{ color: themeColor }}
          >
            <MessageSquare className="h-3 w-3" />
            <span>{message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}</span>
          </button>
        )}
      </div>

      {/* HOVER ACTION BAR */}
      {!isThreadParent && !message.isDeleted && (
        <div className="absolute -top-4 right-4 hidden group-hover:flex items-center bg-zinc-900 border border-zinc-700 rounded-md p-1 shadow-xl z-10 scale-95 animate-in fade-in zoom-in-95 duration-100">
          {EMOJIS.slice(0, 4).map(emoji => {
            const hasReacted = message.reactions?.find(r => r.emoji === emoji)?.reactedByMe ?? false;
            return (
              <button 
                key={emoji}
                onClick={() => onReact?.(emoji, hasReacted)}
                className="h-7 w-7 flex items-center justify-center hover:bg-zinc-800 rounded transition-colors text-sm"
              >
                {emoji}
              </button>
            )
          })}
          <div className="w-px h-3 bg-zinc-700 mx-1" />
          <ActionIcon icon={MessageSquare} onClick={onReply} />
          {isMyMessage && (
            <>
              <ActionIcon icon={Edit2} onClick={() => setIsEditing(true)} />
              <ActionIcon icon={Trash2} onClick={handleDeleteClick} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="relative flex items-center justify-center my-6 h-px">
      <div className="absolute inset-x-0 h-px bg-border opacity-30" />
      <span className="relative z-10 bg-background px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-[2px]">{date}</span>
    </div>
  );
}

function IconButton({ icon: Icon, label: _label }: { icon: React.ElementType; label: string }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative group">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </Button>
  );
}

function IconButtonSmall({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <button className="text-muted-foreground hover:text-foreground transition-colors">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
    </button>
  );
}

function ToolbarButton({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <button className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function ActionIcon({ icon: Icon, onClick }: { icon: React.ElementType; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
