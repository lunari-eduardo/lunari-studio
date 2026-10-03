/**
 * Shell 3-pane do WhatsApp: sidebar | chat panel | (notes opcional).
 *
 * Gerencia o estado de seleção de chat e visibilidade mobile.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatListSidebar } from './ChatListSidebar';
import { ChatPanel } from './ChatPanel';
import { EmptyChatState } from './EmptyChatState';
import { MessagesSkeleton } from './skeletons';
import { useConversas } from '@/hooks/useConversasRealtime';
import type { UseConversasReturn } from '@/hooks/conversas/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { EnrichedChat, Contato } from '@/modules/conversas/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppLayoutProps {
  onNewChat: () => void;
  conversas?: UseConversasReturn;
}

export function WhatsAppLayout({ onNewChat, conversas: propConversas }: WhatsAppLayoutProps) {
  const hookConversas = useConversas({ realtime: !propConversas });
  const conversasData = propConversas ?? hookConversas;
  const {
    chats,
    instancias,
    isLoading,
    chatCounts,
    refreshQrCode,
    disconnectInstance,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    deleteChat,
    markAsRead,
    markAsUnread,
    syncHistoricalChats,
    isPinLimitReached,
  } = conversasData;

  const { profile } = useUserProfile();
  // Nome amigável para a barra de instância conectado (perfil.empresa ?? perfil.nome).
  // Evita exibir o nome técnico da Evolution API (ex.: "lunari-94f289c3").
  const studioDisplayName = useMemo(
    () => profile?.empresa?.trim() || profile?.nome?.trim() || null,
    [profile?.empresa, profile?.nome],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const selectedChatId = searchParams.get('chat');
  const mobileShowChat = Boolean(selectedChatId);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSelect = (chat: EnrichedChat) => {
    if (isMobile) {
      // No mobile: cria entrada de histórico para que o botão 'Voltar' do dispositivo
      // desempilhe a conversa e retorne diretamente à lista
      setSearchParams({ chat: chat.id });
    } else {
      // No desktop: faz replace para não poluir o histórico do navegador a cada conversa
      setSearchParams({ chat: chat.id }, { replace: true });
    }
  };

  const handleBackToChatList = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const connectedInstance = useMemo(
    () => instancias.find(i => i.status === 'connected') ?? instancias[0] ?? null,
    [instancias],
  );

  const handleStartChatWithContact = async (contato: Contato) => {
    // 1. Verificar se já existe chat na lista
    const existing = chats.find(
      c => c.contato_id === contato.id || c.contato_phone_normalized === contato.phone_normalized
    );
    if (existing) {
      handleSelect(existing);
      return;
    }

    if (!connectedInstance) {
      toast.error('Nenhum dispositivo WhatsApp conectado.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data: newChat, error } = await supabase
        .from('conversas_chats')
        .insert({
          user_id: userId,
          contato_id: contato.id,
          instance_id: connectedInstance.id,
          contato_phone_normalized: contato.phone_normalized,
          contato_nome: contato.nome || null,
          status: 'active',
          unread_count: 0,
          pin: 'unpinned',
          mute: false,
        })
        .select('*, clientes(nome)')
        .single();

      if (error) {
        // Se já existia no banco
        const { data: fallback } = await supabase
          .from('conversas_chats')
          .select('*, clientes(nome)')
          .eq('user_id', userId)
          .eq('contato_id', contato.id)
          .maybeSingle();

        if (fallback) {
          handleSelect(fallback as any);
          return;
        }
        throw error;
      }

      if (newChat) {
        handleSelect(newChat as any);
      }
    } catch (err: any) {
      toast.error('Erro ao abrir conversa: ' + (err.message || 'Falha na operação'));
    }
  };

  const selectedChat = useMemo(
    () => chats.find(c => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div
        className={`${
          mobileShowChat ? 'hidden' : 'flex'
        } md:flex flex-col h-full min-h-0 overflow-hidden w-full md:w-auto flex-shrink-0 animate-in fade-in-50 duration-150`}
      >
        <ChatListSidebar
          chats={chats}
          chatCounts={chatCounts}
          isLoading={isLoading}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelect}
          onStartChatWithContact={handleStartChatWithContact}
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
          isRefreshingQr={false}
          onNewChat={onNewChat}
          studioDisplayName={studioDisplayName}
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
          isPinLimitReached={isPinLimitReached}
          onTogglePin={async (chat, e) => {
            e?.stopPropagation();
            if (chat.pin === 'pinned') {
              await unpinChat(chat.id);
            } else {
              await pinChat(chat.id);
            }
          }}
          onArchive={async (chat) => {
            if (chat.status === 'archived') {
              await unarchiveChat(chat.id);
            } else {
              await archiveChat(chat.id);
            }
          }}
          onBlock={async (chat) => {
            if (chat.status === 'blocked') {
              await unblockChat(chat.id);
            } else {
              await blockChat(chat.id);
            }
          }}
          onMarkRead={async (chat) => {
            await markAsRead(chat.id);
          }}
          onMarkUnread={async (chat) => {
            await markAsUnread(chat.id);
          }}
          onDeleteChat={async (chat) => {
            if (!confirm(`Excluir conversa com ${chat.contato_nome ?? 'este contato'}?`))
              return;
            await deleteChat(chat.id);
          }}
        />
      </div>

      <div
        className={`${
          mobileShowChat ? 'flex' : 'hidden'
        } md:flex flex-1 flex-row h-full min-h-0 overflow-hidden animate-in fade-in-50 duration-150`}
      >
        {selectedChat ? (
          <ChatPanel
            chat={selectedChat}
            onBack={handleBackToChatList}
            onArchive={async () => {
              if (selectedChat.status === 'archived') {
                await unarchiveChat(selectedChat.id);
              } else {
                await archiveChat(selectedChat.id);
              }
            }}
            onBlock={async () => {
              if (selectedChat.status === 'blocked') {
                await unblockChat(selectedChat.id);
              } else {
                await blockChat(selectedChat.id);
              }
            }}
            onPin={async () => {
              if (selectedChat.pin === 'pinned') {
                await unpinChat(selectedChat.id);
              } else {
                await pinChat(selectedChat.id);
              }
            }}
            onDelete={async () => {
              if (!confirm(`Excluir conversa com ${selectedChat.contato_nome ?? 'este contato'}?`))
                return;
              await deleteChat(selectedChat.id);
              handleBackToChatList();
            }}
            onMarkUnread={async () => {
              await markAsUnread(selectedChat.id);
            }}
          />
        ) : selectedChatId && isLoading ? (
          <div className="flex-1 flex flex-col bg-[#F8F7F4] dark:bg-[#121212]">
            <div className="h-14 border-b border-border/40 px-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <MessagesSkeleton />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex">
            <EmptyChatState />
          </div>
        )}
      </div>
    </div>
  );
}
