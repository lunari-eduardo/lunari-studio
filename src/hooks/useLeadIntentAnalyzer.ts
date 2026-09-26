import { useState, useEffect } from 'react';
import type { Mensagem } from '@/modules/conversas/types';

interface UseLeadIntentAnalyzerProps {
  isUnknownContact: boolean;
  messages: Mensagem[];
  availableCategories: string[];
}

export function useLeadIntentAnalyzer({
  isUnknownContact,
  messages,
  availableCategories,
}: UseLeadIntentAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [intent, setIntent] = useState<{ has_intent: boolean; category: string | null } | null>(null);

  const categoriesKey = availableCategories.join(',');
  const messagesCount = messages?.length || 0;

  useEffect(() => {
    if (!isUnknownContact || messagesCount === 0) return;

    let mounted = true;
    const analyze = async () => {
      setAnalyzing(true);
      try {
        const payloadMessages = messages.map(m => ({
          role: m.direction === 'inbound' ? 'user' : 'assistant',
          content: m.content || ''
        }));

        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';
        const response = await fetch(`${workerUrl}/api/conversas/classify-lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: payloadMessages,
            categories: availableCategories
          })
        });
        
        if (response.ok && mounted) {
          const data = await response.json();
          setIntent(data);
        }
      } catch (err) {
        console.error('[useLeadIntentAnalyzer] Error classifying lead', err);
      } finally {
        if (mounted) setAnalyzing(false);
      }
    };

    const timer = setTimeout(analyze, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isUnknownContact, messagesCount, categoriesKey]);

  const resolvedCategory = (() => {
    if (intent?.category) return intent.category;
    const allText = messages.map(m => m.content || '').join(' ').toLowerCase();
    for (const cat of availableCategories) {
      if (allText.includes(cat.toLowerCase().trim())) {
        return cat;
      }
    }
    return undefined;
  })();

  return {
    analyzing,
    intent,
    suggestedCategory: resolvedCategory
  };
}
