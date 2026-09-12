/**
 * Página Conversas — WhatsApp-like interface.
 *
 * Layout:
 * ┌──────────────────────────┬─────────────────────────────────┐
 * │   SIDEBAR (chat list)    │        CHAT PANEL               │
 * │                          │                                 │
 * │  [Instance Status Bar]   │  [Chat Header]                  │
 * │  ─────────────────────   │  ─────────────────────────────  │
 * │  🔍 Search...            │  [Messages Area - scrollable]   │
 * │                          │                                 │
 * │  [Chat Item]             │  ─────────────────────────────  │
 * │  [Chat Item] ← active    │  [Message Composer]             │
 * │  [Chat Item]             │                                 │
 * └──────────────────────────┴─────────────────────────────────┘
 */
import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MoreVertical, Send, Paperclip, ImageIcon, Phone, Video, RefreshCw, Wifi, WifiOff, Loader2, Check, CheckCheck, Clock, AlertCircle, Pin, Archive, Trash2, Ban, X, Plus, MessageSquare, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversas } from '@/hooks/useConversasRealtime';
import { useConversasChat } from '@/hooks/useConversasChat';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, Mensagem, InstanciaStatus } from '@/modules/conversas/types';
import { toast } from 'sonner';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // 5511999999999 → (11) 99999-9999
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return phone;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return formatTime(dateStr);
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Status Indicator ─────────────────────────────────────────────────────────

function InstanceStatusBar({
  instance,
  onRefreshQr,
}: {
  instance: { id: string; instance_name: string; status: InstanciaStatus; phone: string | null } | undefined;
  onRefreshQr: (id: string) => void;
}) {
  if (!instance) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-100">
        <WifiOff className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">Sem instância conectada</span>
      </div>
    );
  }

  const statusConfig: Record<InstanciaStatus, { color: string; bg: string; label: string }> = {
    connected: { color: 'text-green-600', bg: 'bg-green-50', label: 'Conectado' },
    disconnected: { color: 'text-gray-500', bg: 'bg-gray-50', label: 'Desconectado' },
    connecting: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Conectando...' },
    error: { color: 'text-red-600', bg: 'bg-red-50', label: 'Erro' },
  };

  const cfg = statusConfig[instance.status] ?? statusConfig.disconnected;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${cfg.bg} border-b border-border`}>
      <div className={`h-2 w-2 rounded-full ${instance.status === 'connected' ? 'bg-green-500 animate-pulse' : instance.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      {instance.phone && (
        <span className="text-xs text-muted-foreground ml-1">
          {formatPhone(instance.phone)}
        </span>
      )}
      <div className="flex-1" />
      {instance.status === 'disconnected' || instance.status === 'error' ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onRefreshQr(instance.id)}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          QR Code
        </Button>
      ) : null}
    </div>
  );
}

// ─── Chat List Item ───────────────────────────────────────────────────────────

function ChatListItem({
  chat,
  isActive,
  onClick,
}: {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
}) {
  const hasUnread = (chat.unread_count ?? 0) > 0;
  const isPinned = chat.pin === 'pinned';
  const isArchived = chat.status === 'archived';
  const isBlocked = chat.status === 'blocked';

  const msgTypeIcon: Record<string, React.ReactNode> = {
    image: <ImageIcon className="h-3 w-3 text-muted-foreground" />,
    audio: <span className="text-xs">🎤</span>,
    video: <span className="text-xs">🎥</span>,
    document: <span className="text-xs">📄</span>,
    location: <span className="text-xs">📍</span>,
    sticker: <span className="text-xs">🎨</span>,
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      } ${isBlocked ? 'opacity-60' : ''}`}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={chat.contato_avatar ?? undefined} />
        <AvatarFallback className="bg-muted text-xs font-medium">
          {getInitials(chat.contato_nome ?? chat.contato_phone_normalized ?? null)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {isPinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            <span className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
              {chat.contato_nome ?? formatPhone(chat.contato_phone_normalized ?? null)}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isArchived && <Archive className="h-3 w-3 text-muted-foreground" />}
            {isBlocked && <Ban className="h-3 w-3 text-muted-foreground" />}
            <span className={`text-[10px] ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {formatDate(chat.ultima_mensagem_data)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {chat.ultima_mensagem_type && chat.ultima_mensagem_type !== 'text' ? (
              msgTypeIcon[chat.ultima_mensagem_type] ?? <MessageSquare className="h-3 w-3 text-muted-foreground" />
            ) : null}
            <span className={`text-xs truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
              {chat.ultima_mensagem ?? (isArchived ? 'Arquivada' : 'Nenhuma mensagem')}
            </span>
          </div>
          {hasUnread && (
            <Badge className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {chat.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isOwn,
  onRetry,
}: {
  message: Mensagem;
  isOwn: boolean;
  onRetry: (id: string) => void;
}) {
  const statusIcon = {
    pending: <Clock className="h-3 w-3 text-muted-foreground" />,
    sent: <Check className="h-3 w-3 text-muted-foreground" />,
    delivered: <CheckCheck className="h-3 w-3 text-muted-foreground" />,
    read: <CheckCheck className="h-3 w-3 text-blue-500" />,
    failed: <AlertCircle className="h-3 w-3 text-red-500" />,
  }[message.status] ?? null;

  const mediaContent = () => {
    if (!message.media_url) return null;
    const type = message.type;
    if (type === 'image') {
      return (
        <div className="mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.media_url}
            alt="Imagem"
            className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
            loading="lazy"
          />
          {message.content && <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>}
        </div>
      );
    }
    if (type === 'audio') {
      return (
        <div className="mt-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <span>🎤</span>
          <div className="flex-1 h-1 bg-white/20 rounded">
            <div className="h-full w-1/3 bg-white/60 rounded" />
          </div>
          {message.media_filename && <span className="text-[10px]">{message.media_filename}</span>}
        </div>
      );
    }
    if (type === 'video') {
      return (
        <div className="mt-1">
          <video src={message.media_url!} controls className="max-w-[280px] rounded-lg" />
          {message.content && <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>}
        </div>
      );
    }
    if (type === 'document') {
      return (
        <div className="mt-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <span>📄</span>
          <span className="text-sm truncate flex-1">{message.media_filename ?? 'Documento'}</span>
        </div>
      );
    }
    if (type === 'location') {
      return (
        <div className="mt-1 bg-white/10 rounded-lg px-3 py-2 text-xs">
          <span>📍</span>
          <p>{message.content}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 px-2`}>
      <div
        className={`relative max-w-[75%] group ${isOwn ? 'order-2' : 'order-1'}`}
      >
        {/* Media above text */}
        {!isOwn && (
          <div className="mb-1">
            {mediaContent()}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : message.media_url && ['image', 'video'].includes(message.type ?? '')
              ? 'bg-transparent'
              : 'bg-accent rounded-bl-md'
          } ${message.status === 'failed' ? 'border border-red-300' : ''}`}
        >
          {isOwn && message.media_url ? mediaContent() : null}
          {message.content && message.type !== 'location' && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Footer: time + status */}
        <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && statusIcon}
          {message.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-[10px] text-red-500 hover:text-red-600"
              onClick={() => onRetry(message.id)}
            >
              Repetir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Message Composer ──────────────────────────────────────────────────────────

function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2 px-3 py-2 border-t bg-background">
      {/* Attachment button */}
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0" disabled={disabled}>
        <Paperclip className="h-5 w-5" />
      </Button>

      {/* Text input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          rows={1}
          disabled={disabled}
          className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-h-[120px] overflow-y-auto"
          style={{ minHeight: '36px' }}
        />
      </div>

      {/* Send button */}
      <Button
        size="sm"
        className="h-9 w-9 p-0 flex-shrink-0"
        disabled={disabled || !text.trim()}
        onClick={handleSend}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({
  chat,
  onClose,
}: {
  chat: Chat | null;
  onClose: () => void;
}) {
  const {
    sortedMensagens,
    notas,
    isLoading,
    sendMessage,
    retryMessage,
    addNota,
    deleteNota,
    markAllRead,
    hasMore,
  } = useConversasChat(chat?.id ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [notaMode, setNotaMode] = useState(false);
  const [notaText, setNotaText] = useState('');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedMensagens.length]);

  // Mark as read when opening
  useEffect(() => {
    if (chat?.id) markAllRead();
  }, [chat?.id, markAllRead]);

  const handleSend = async (text: string) => {
    if (!chat) return;
    try {
      await sendMessage({ content: text });
    } catch {
      // Erro já tratado no hook
    }
  };

  const handleSaveNota = async () => {
    if (!notaText.trim() || !chat) return;
    await addNota(notaText.trim());
    setNotaText('');
    setNotaMode(false);
  };

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#efeae2]">
        <div className="w-24 h-24 bg-[#d9e0d1] rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-12 w-12 text-[#54656f]" />
        </div>
        <h2 className="text-xl font-light text-[#111b21] mb-1">
          Lunari Conversas
        </h2>
        <p className="text-sm text-[#667781] max-w-xs">
          Selecione uma conversa na lista ao lado para começar a trocar mensagens.
        </p>
      </div>
    );
  }

  const messagesGroupedByDate: { date: string; messages: Mensagem[] }[] = [];
  let currentDate = '';
  for (const msg of sortedMensagens) {
    const d = new Date(msg.created_at);
    const dateLabel = d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      messagesGroupedByDate.push({ date: dateLabel, messages: [msg] });
    } else {
      messagesGroupedByDate[messagesGroupedByDate.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border shadow-sm">
        <Button variant="ghost" size="sm" className="md:hidden p-0 h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted text-xs">
            {getInitials(chat.contato_nome ?? null)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {chat.contato_nome ?? formatPhone(chat.contato_phone_normalized ?? null)}
          </p>
          {chat.contato_phone_normalized && (
            <p className="text-xs text-muted-foreground">
              {formatPhone(chat.contato_phone_normalized)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant={notaMode ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setNotaMode(!notaMode)}
            title="Notas"
          >
            <StickyNote className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Pin className="h-4 w-4 mr-2" />Fixar conversa</DropdownMenuItem>
              <DropdownMenuItem><Archive className="h-4 w-4 mr-2" />Arquivar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notes panel (collapsible) */}
      {notaMode && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Notas sobre este contato</span>
          </div>
          <div className="space-y-2">
            {notas.map(nota => (
              <div key={nota.id} className="flex items-start gap-2 bg-white rounded-lg p-2 shadow-sm">
                <p className="text-xs text-foreground flex-1 whitespace-pre-wrap">{nota.content}</p>
                <button
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => deleteNota(nota.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={notaText}
                onChange={e => setNotaText(e.target.value)}
                placeholder="Adicionar uma nota..."
                className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleSaveNota()}
              />
              <Button size="sm" className="h-8" onClick={handleSaveNota}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" viewportRef={scrollRef as any}>
        <div className="py-3 px-1 min-h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedMensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem ainda. Diga olá! 👋
              </p>
            </div>
          ) : (
            messagesGroupedByDate.map(group => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-2 my-3 px-4">
                  <div className="flex-1 h-px bg-[#e4e0d8]" />
                  <span className="text-[10px] text-[#667781] bg-[#e4e0d8] px-2 py-0.5 rounded-full">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-[#e4e0d8]" />
                </div>

                {/* Messages */}
                {group.messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.direction === 'outbound'}
                    onRetry={retryMessage}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <MessageComposer onSend={handleSend} disabled={isLoading} />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  chats,
  isLoading,
  selectedChatId,
  onSelectChat,
}: {
  chats: Chat[];
  isLoading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chat: Chat) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredChats = React.useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter(c =>
      (c.contato_nome ?? '').toLowerCase().includes(q) ||
      (c.contato_phone_normalized ?? '').includes(q) ||
      (c.ultima_mensagem ?? '').toLowerCase().includes(q),
    );
  }, [chats, search]);

  // Sort: pinned first, then by ultima_mensagem_data
  const sortedChats = React.useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      if (a.pin === 'pinned' && b.pin !== 'pinned') return -1;
      if (a.pin !== 'pinned' && b.pin === 'pinned') return 1;
      const dateA = a.ultima_mensagem_data ?? '0';
      const dateB = b.ultima_mensagem_data ?? '0';
      return dateB.localeCompare(dateA);
    });
  }, [filteredChats]);

  const activeChats = sortedChats.filter(c => c.status === 'active');
  const archivedChats = sortedChats.filter(c => c.status === 'archived');
  const blockedChats = sortedChats.filter(c => c.status === 'blocked');

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-background border-r border-border h-full">
      {/* Search */}
      <div className="relative px-3 py-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar conversa..."
          className="pl-9 h-9 text-sm rounded-full bg-muted border-0 focus-visible:ring-1"
        />
      </div>

      <Separator />

      {/* Chat list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {blockedChats.length > 0 && (
              <>
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Bloqueadas
                  </span>
                </div>
                {blockedChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === selectedChatId}
                    onClick={() => onSelectChat(chat)}
                  />
                ))}
              </>
            )}
            {archivedChats.length > 0 && (
              <>
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Arquivadas
                  </span>
                </div>
                {archivedChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === selectedChatId}
                    onClick={() => onSelectChat(chat)}
                  />
                ))}
              </>
            )}
            {activeChats.length > 0 && (
              <>
                <div className="px-3 py-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Ativas
                  </span>
                </div>
                {activeChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === selectedChatId}
                    onClick={() => onSelectChat(chat)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const {
    chats,
    instancias,
    isLoading,
    refreshQrCode,
    totalUnread,
    archiveChat,
    pinChat,
    unpinChat,
    blockChat,
    deleteChat,
  } = useConversas();

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // On desktop, show first active chat by default
  useEffect(() => {
    if (!selectedChat && !isLoading && !mobileShowChat) {
      const firstActive = chats.find(c => c.status === 'active');
      if (firstActive) setSelectedChat(firstActive);
    }
  }, [isLoading, chats.length]);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMobileShowChat(true);
  };

  const handleCloseChat = () => {
    setMobileShowChat(false);
    setSelectedChat(null);
  };

  const connectedInstance = instancias.find(i => i.status === 'connected');
  const instance = instancias[0]; // Currently only 1 instance supported

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — always visible on desktop, conditional on mobile */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} flex-col h-full`}>
        <InstanceStatusBar
          instance={instance}
          onRefreshQr={refreshQrCode}
        />
        <Sidebar
          chats={chats}
          isLoading={isLoading}
          selectedChatId={selectedChat?.id ?? null}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Chat panel — always visible on desktop, conditional on mobile */}
      <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
        <ChatPanel
          chat={selectedChat}
          onClose={handleCloseChat}
        />
      </div>
    </div>
  );
}
