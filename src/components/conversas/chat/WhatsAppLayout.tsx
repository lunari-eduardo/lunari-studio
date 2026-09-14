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
import type { EnrichedChat } from '@/modules/conversas/types';

export interface WhatsAppLayoutProps {
  onNewChat: () => void;
}

export function WhatsAppLayout({ onNewChat }: WhatsAppLayoutProps) {
  const {
    chats,
    instancias,
    isLoading,
    chatCounts,
    refreshQrCode,
    disconnectInstance,
    deleteInstance,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    deleteChat,
    markAsUnread,
    syncHistoricalChats,
  } = useConversas();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const connectedInstance = useMemo(
    () => instancias.find(i => i.status === 'connected') ?? instancias[0] ?? null,
    [instancias],
  );

  // Nenhuma conversa aberta automaticamente por padrão ao entrar na página
  // O usuário escolhe explicitamente qual conversa deseja abrir no painel lateral

  const selectedChat = useMemo(
    () => chats.find(c => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const handleSelect = (chat: EnrichedChat) => {
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
          chatCounts={chatCounts}
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
          onDisconnect={() => {
            if (connectedInstance) {
              if (confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
                void disconnectInstance(connectedInstance.id);
              }
            }
          }}
          onDelete={() => {
            if (connectedInstance) {
              if (confirm('Atenção: Tem certeza que deseja excluir esta instância permanentemente?')) {
                void deleteInstance(connectedInstance.id);
              }
            }
          }}
          isRefreshingQr={false}
          onNewChat={onNewChat}
          onSyncChats={async () => {
            if (!connectedInstance) return;
            setIsSyncing(true);
            try {
              await syncHistoricalChats(connectedInstance.id, { showToast: true });
            } finally {
              setIsSyncing(false);
            }
          }}
          isSyncingChats={isSyncing}
          onTogglePin={async (chat, e) => {
            e?.stopPropagation();
            if (chat.pin === 'pinned') {
              await unpinChat(chat.id);
              toast.success('Conversa desafixada');
            } else {
              await pinChat(chat.id);
              toast.success('Conversa fixada no topo');
            }
          }}
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
            onMarkUnread={async () => {
              await markAsUnread(selectedChat.id);
              toast.success('Marcado como não lido');
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
