import type { InstanciaStatus, EnrichedChat } from '@/modules/conversas/types';

export interface UseConversasOptions {
  realtime?: boolean;
}

export interface UseConversasReturn {
  chats: EnrichedChat[];
  instancias: Array<{
    id: string;
    instance_name: string;
    status: InstanciaStatus;
    phone?: string | null;
    qrcode_data?: string | null;
    qrcode_expires_at?: string | null;
  }>;
  isLoading: boolean;
  error: string | null;

  openChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  blockChat: (chatId: string) => Promise<void>;
  unblockChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<boolean>;
  unpinChat: (chatId: string) => Promise<boolean>;
  markAsRead: (chatId: string) => Promise<void>;
  markAsUnread: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  refreshQrCode: (instanceId: string) => Promise<void>;
  createInstance: (instanceName: string) => Promise<void>;
  checkInstanceStatus: (instanceId: string) => Promise<void>;
  disconnectInstance: (instanceId: string) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  syncHistoricalChats: (instanceId: string, options?: { showToast?: boolean }) => Promise<{ synced: number; total: number }>;

  totalUnread: number;
  activeChatsCount: number;
  connectedInstance: string | null;
  instanceViewState: 'loading' | 'initial' | 'reconnect' | 'connecting' | 'ready';
  isPinLimitReached: boolean;
  chatCounts: {
    all: number;
    unread: number;
    cliente: number;
    lead: number;
  };
}
