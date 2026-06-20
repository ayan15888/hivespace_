"use client"

import { useChatChannelPage } from "@/app/(auth)/dashboard/chat/[channel]/hooks/use-chat-channel-page"
import { ChatChannelHeader } from "./chat-channel-header"
import { ChatComposeBar } from "./chat-compose-bar"
import { ChatMembersPanel } from "./chat-members-panel"
import { ChatMessageList } from "./chat-message-list"
import { ChatThreadPanel } from "./chat-thread-panel"

export function ChatChannelPage({ channelId }: { channelId: string }) {
  const page = useChatChannelPage(channelId)

  const handleSelectSuggestion = (suggestion: string) => {
    page.setInputValue(suggestion)
    setTimeout(() => {
      if (page.textareaRef.current) {
        page.textareaRef.current.focus()
      }
    }, 50)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <ChatChannelHeader
          currentChannel={page.currentChannel}
          isConnected={page.isConnected}
          showMembers={page.showMembers}
          onToggleMembers={page.toggleMembersPanel}
          initialUnreadCount={page.initialUnreadCount}
          isSummarizing={page.isSummarizing}
          onSummarize={page.handleSummarizeUnread}
        />

        {page.unreadSummary !== null && (
          <div className="mx-4 mt-3 rounded-lg border border-purple-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 p-3 shadow-md animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-current text-purple-400 mt-0.5 shrink-0 ${page.isSummarizing ? "animate-pulse" : ""}`}>
                  <path d="M12,2 C12,7.5 16.5,12 22,12 C16.5,12 12,16.5 12,22 C12,16.5 7.5,12 2,12 C7.5,12 12,7.5 12,2 Z" />
                </svg>
                <div className="flex-1 text-xs leading-relaxed text-zinc-300">
                  <span className="font-bold text-purple-200">Unread Catch-Up Summary: </span>
                  {page.unreadSummary === "" && page.isSummarizing ? (
                    <span className="italic text-zinc-500">Hex is summarizing unread messages...</span>
                  ) : (
                    <span className="whitespace-pre-wrap">{page.unreadSummary}</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => page.setUnreadSummary(null)}
                className="text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-bold shrink-0 px-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <ChatMessageList
          channelId={channelId}
          groupedMessages={page.groupedMessages}
          loading={page.loading}
          onScroll={page.handleScroll}
          messagesEndRef={page.messagesEndRef}
          messagesContainerRef={page.messagesContainerRef}
          currentUserId={page.currentUser?.id}
          themeColor={page.themeColor}
          channelMembers={page.channelMembers}
          onReply={page.setActiveThread}
          onReact={page.handleReactionClick}
          otherTypingUsers={page.otherTypingUsers}
          isAiLoading={page.isAiLoading}
        />

        <ChatComposeBar
          currentChannelName={page.currentChannel?.name ?? undefined}
          inputValue={page.inputValue}
          inputFocused={page.inputFocused}
          onInputChange={page.handleInputChange}
          onInputFocus={() => page.setInputFocused(true)}
          onInputBlur={() => page.setInputFocused(false)}
          onSend={page.handleSend}
          themeColor={page.themeColor}
          textareaRef={page.textareaRef}
          mentionDropdownVisible={page.mentionDropdownVisible}
          mentionIndex={page.mentionIndex}
          filteredMentionMembers={page.filteredMentionMembers}
          onInsertMention={page.insertMention}
          onMentionIndexChange={page.setMentionIndex}
          onMentionDropdownVisibleChange={page.setMentionDropdownVisible}
          suggestedReplies={page.suggestedReplies}
          onSelectSuggestion={handleSelectSuggestion}
        />
      </div>

      <ChatThreadPanel
        activeThread={page.activeThread}
        activeThreadParentId={page.activeThreadParentId}
        channelId={channelId}
        currentChannelName={page.currentChannel?.name ?? undefined}
        currentUserId={page.currentUser?.id}
        themeColor={page.themeColor}
        channelMembers={page.channelMembers}
        threadMessages={page.threadMessages}
        threadInputValue={page.threadInputValue}
        onClose={() => page.setActiveThread(null)}
        onThreadInputChange={page.setThreadInputValue}
        onSendThreadReply={page.handleSendThreadReply}
      />

      <ChatMembersPanel
        showMembers={page.showMembers}
        membersLoading={page.membersLoading}
        channelMembers={page.channelMembers}
        currentUserId={page.currentUser?.id}
        themeColor={page.themeColor}
        onClose={() => page.setShowMembers(false)}
      />
    </div>
  )
}
