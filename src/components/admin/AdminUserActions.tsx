import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Coins, HardDrive, CreditCard, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PhotographerAccount {
  photo_credits: number;
  gallery_credits: number;
  free_transfer_bytes: number;
  credits_consumed_total: number | null;
}

interface AsaasSubscription {
  id: string;
  plan_type: string;
  status: string;
  billing_cycle: string;
  value_cents: number;
  next_due_date: string | null;
  pending_downgrade_plan: string | null;
  pending_downgrade_cycle: string | null;
  asaas_subscription_id: string | null;
  created_at: string;
}

interface UserInfo {
  id: string;
  email: string;
  nome: string | null;
}

// ===== CREDITS MODAL =====
export function CreditsModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  onSuccess: () => void;
}) {
  const [account, setAccount] = useState<PhotographerAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadAccount();
    }
  }, [open, user]);

  const loadAccount = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('photographer_accounts')
      .select('photo_credits, gallery_credits, free_transfer_bytes, credits_consumed_total')
      .eq('user_id', user.id)
      .single();
    setAccount(data);
    setLoading(false);
  };

  const handleGrant = async () => {
    if (!user || !amount) return;
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('admin_grant_credits', {
        _target_user_id: user.id,
        _amount: numAmount,
        _reason: reason || null,
      });
      if (error) throw error;
      toast.success(`${numAmount} créditos adicionados para ${user.nome || user.email}`);
      setAmount('');
      setReason('');
      onSuccess();
      loadAccount();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar créditos');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Gerenciar Créditos
          </DialogTitle>
          <DialogDescription>
            {user?.nome || user?.email}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">Photo Credits</p>
                <p className="text-xl font-bold">{account?.photo_credits ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">Gallery Credits</p>
                <p className="text-xl font-bold">{account?.gallery_credits ?? 0}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade a adicionar *</label>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                placeholder="Ex: Bônus parceiro, compensação..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background resize-none"
                rows={2}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGrant} disabled={submitting || !amount}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Adicionar Créditos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== STORAGE MODAL =====
export function StorageModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  onSuccess: () => void;
}) {
  const [currentBytes, setCurrentBytes] = useState(0);
  const [newGB, setNewGB] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadStorage();
    }
  }, [open, user]);

  const loadStorage = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('photographer_accounts')
      .select('free_transfer_bytes')
      .eq('user_id', user.id)
      .single();
    const bytes = data?.free_transfer_bytes ?? 0;
    setCurrentBytes(bytes);
    setNewGB((bytes / (1024 * 1024 * 1024)).toFixed(2));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const gb = parseFloat(newGB);
    if (isNaN(gb) || gb < 0) {
      toast.error('Valor inválido');
      return;
    }
    try {
      setSubmitting(true);
      const bytes = Math.round(gb * 1024 * 1024 * 1024);
      const { error } = await supabase
        .from('photographer_accounts')
        .update({ free_transfer_bytes: bytes })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(`Storage atualizado para ${gb} GB`);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar storage');
    } finally {
      setSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${bytes} bytes`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Ajustar Storage
          </DialogTitle>
          <DialogDescription>
            {user?.nome || user?.email}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Storage atual</p>
              <p className="text-xl font-bold">{formatBytes(currentBytes)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo limite (GB) *</label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 2.0"
                value={newGB}
                onChange={(e) => setNewGB(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== SUBSCRIPTIONS MODAL =====
export function SubscriptionsModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  onSuccess: () => void;
}) {
  const [subs, setSubs] = useState<AsaasSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) loadSubs();
  }, [open, user]);

  const loadSubs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions_asaas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSubs(data || []);
    setLoading(false);
  };

  const handleCancel = async (sub: AsaasSubscription) => {
    if (!sub.asaas_subscription_id) {
      toast.error('Assinatura sem ID Asaas');
      return;
    }
    try {
      setCancelling(sub.id);
      const { error } = await supabase.functions.invoke('asaas-cancel-subscription', {
        body: { subscriptionId: sub.asaas_subscription_id },
      });
      if (error) throw error;
      toast.success('Assinatura cancelada');
      loadSubs();
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
      PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/30',
      CANCELLED: 'bg-muted text-muted-foreground',
      EXPIRED: 'bg-muted text-muted-foreground',
    };
    return <Badge className={map[status] || 'bg-muted text-muted-foreground'}>{status}</Badge>;
  };

  const formatCents = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinaturas Asaas
          </DialogTitle>
          <DialogDescription>
            {user?.nome || user?.email}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura encontrada</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {subs.map((sub) => (
              <div key={sub.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{sub.plan_type}</p>
                    <p className="text-xs text-muted-foreground">{sub.billing_cycle} · {formatCents(sub.value_cents)}</p>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>
                {sub.next_due_date && (
                  <p className="text-xs text-muted-foreground">
                    Próx. cobrança: {format(new Date(sub.next_due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                )}
                {sub.pending_downgrade_plan && (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Downgrade agendado: {sub.pending_downgrade_plan}
                  </div>
                )}
                {sub.status === 'ACTIVE' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleCancel(sub)}
                    disabled={cancelling === sub.id}
                    className="w-full text-xs"
                  >
                    {cancelling === sub.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    Cancelar Assinatura
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
