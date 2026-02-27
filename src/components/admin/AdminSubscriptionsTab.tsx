import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CreditCard, TrendingUp, Users, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubWithEmail {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  billing_cycle: string;
  value_cents: number;
  next_due_date: string | null;
  pending_downgrade_plan: string | null;
  created_at: string;
  email?: string;
}

export function AdminSubscriptionsTab() {
  const [subs, setSubs] = useState<SubWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: subsData, error } = await supabase
        .from('subscriptions_asaas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((subsData || []).map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      const emailMap = new Map(profiles?.map((p) => [p.user_id, p.email]) || []);

      setSubs(
        (subsData || []).map((s) => ({
          ...s,
          email: emailMap.get(s.user_id) || 'N/A',
        }))
      );
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSubs = subs.filter((s) => s.status === 'ACTIVE');
  const mrr = activeSubs
    .filter((s) => s.billing_cycle === 'MONTHLY')
    .reduce((sum, s) => sum + s.value_cents, 0);
  const yearlyMrr = activeSubs
    .filter((s) => s.billing_cycle === 'YEARLY')
    .reduce((sum, s) => sum + Math.round(s.value_cents / 12), 0);
  const totalMrr = mrr + yearlyMrr;

  const planTypes = [...new Set(subs.map((s) => s.plan_type))];

  const filtered = subs.filter((s) => {
    if (search && !s.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan !== 'all' && s.plan_type !== filterPlan) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const formatCents = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{activeSubs.length}</p>
                <p className="text-xs text-muted-foreground">Assinantes ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{formatCents(totalMrr)}</p>
                <p className="text-xs text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-400">
                  {activeSubs.filter((s) => s.billing_cycle === 'MONTHLY').length}
                </p>
                <p className="text-xs text-muted-foreground">Mensal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {activeSubs.filter((s) => s.billing_cycle === 'YEARLY').length}
                </p>
                <p className="text-xs text-muted-foreground">Anual</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-48 bg-background">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                {planTypes.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Plano</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Valor</TableHead>
                <TableHead className="text-xs">Ciclo</TableHead>
                <TableHead className="text-xs">Próx. Cobrança</TableHead>
                <TableHead className="text-xs">Downgrade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.id} className="border-border/50">
                    <TableCell className="text-sm">{sub.email}</TableCell>
                    <TableCell className="text-sm font-medium">{sub.plan_type}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-sm">{formatCents(sub.value_cents)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sub.billing_cycle === 'MONTHLY' ? 'Mensal' : 'Anual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.next_due_date
                        ? format(new Date(sub.next_due_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {sub.pending_downgrade_plan ? (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          {sub.pending_downgrade_plan}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
