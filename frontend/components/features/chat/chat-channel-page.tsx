"use client"

import { useChatChannelPage } from "@/app/(auth)/dashboard/chat/[channel]/hooks/use-chat-channel-page"
import { ChatChannelHeader } from "./chat-channel-header"
import { ChatComposeBar } from "./chat-compose-bar"
import { ChatMembersPanel } from "./chat-members-panel"
import { ChatMessageList } from "./chat-message-list"
import { ChatThreadPanel } from "./chat-thread-panel"

export function ChatChannelPage({ channelId }: { channelId: string }) {
  const page = useChatChannelPage(channelId)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <ChatChannelHeader
          currentChannel={page.currentChannel}
          isConnected={page.isConnected}
          showMembers={page.showMembers}
          onToggleMembers={page.toggleMembersPanel}
        />

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
