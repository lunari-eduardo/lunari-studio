/**
 * Shell 3-pane do WhatsApp: sidebar | chat panel | (notes opcional).
 *
 * Gerencia o estado de seleção de chat e visibilidade mobile.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChatListSidebar } from './ChatListSidebar';
import { ChatPanel } from './ChatPanel';
import { EmptyChatState } from './EmptyChatState';
import { useConversas } from '@/hooks/useConversasRealtime';

export interface WhatsAppLayoutProps {
  onNewChat: () => void;
}

export function WhatsAppLayout({ onNewChat }: WhatsAppLayoutProps) {
  const {
    chats,
    instancias,
    isLoading,
    refreshQrCode,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    deleteChat,
  } = useConversas();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const connectedInstance = useMemo(
    () => instancias.find(i => i.status === 'connected') ?? instancias[0] ?? null,
    [instancias],
  );

  // Auto-selecionar primeiro chat ativo ao carregar
  useEffect(() => {
    if (!selectedChatId && !isLoading && chats.length > 0) {
      const firstActive = chats.find(c => c.status === 'active') ?? chats[0];
      if (firstActive) setSelectedChatId(firstActive.id);
    }
  }, [chats, isLoading, selectedChatId]);

  const selectedChat = useMemo(
    () => chats.find(c => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const handleSelect = (chat: typeof chats[number]) => {
    setSelectedChatId(chat.id);
    setMobileShowChat(true);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      <div
        className={`${mobileShowChat ? 'hidden' : 'flex'} md:flex w-full md:w-auto flex-shrink-0`}
      >
        <ChatListSidebar
          chats={chats}
          isLoading={isLoading}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelect}
          instance={
            connectedInstance
              ? {
                  instance_name: connectedInstance.instance_name,
                  status: connectedInstance.status,
                  phone: connectedInstance.phone,
                }
              : null
          }
          onRefreshQr={() => {
            if (connectedInstance) void refreshQrCode(connectedInstance.id);
          }}
          isRefreshingQr={false}
          onNewChat={onNewChat}
        />
      </div>

      <div
        className={`${
          mobileShowChat ? 'flex' : 'hidden'
        } md:flex flex-1 min-w-0`}
      >
        {selectedChat ? (
          <ChatPanel
            chat={selectedChat}
            onBack={() => setMobileShowChat(false)}
            onArchive={async () => {
              if (selectedChat.status === 'archived') {
                await unarchiveChat(selectedChat.id);
                toast.success('Conversa desarquivada');
              } else {
                await archiveChat(selectedChat.id);
                toast.success('Conversa arquivada');
              }
            }}
            onBlock={async () => {
              if (selectedChat.status === 'blocked') {
                await unblockChat(selectedChat.id);
                toast.success('Conversa desbloqueada');
              } else {
                await blockChat(selectedChat.id);
                toast.success('Conversa bloqueada');
              }
            }}
            onPin={async () => {
              if (selectedChat.pin === 'pinned') {
                await unpinChat(selectedChat.id);
                toast.success('Conversa desfixada');
              } else {
                await pinChat(selectedChat.id);
                toast.success('Conversa fixada');
              }
            }}
            onDelete={async () => {
              if (!confirm(`Excluir conversa com ${selectedChat.contato_nome ?? 'este contato'}?`))
                return;
              await deleteChat(selectedChat.id);
              setSelectedChatId(null);
              setMobileShowChat(false);
            }}
          />
        ) : (
          <div className="flex-1 hidden md:flex">
            <EmptyChatState />
          </div>
        )}
      </div>
    </div>
  );
}
