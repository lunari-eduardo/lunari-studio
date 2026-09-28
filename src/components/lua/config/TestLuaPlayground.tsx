import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Send, User, Sparkles, AlertCircle } from 'lucide-react';
import { useLuaGenerate } from '@/hooks/lua/useLuaGenerate';

export function TestLuaPlayground() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const { generate, isGenerating } = useLuaGenerate();

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    const reply = await generate({
      prompt: userMessage,
      recentMessages: messages.map(m => ({
        direction: m.role === 'user' ? 'inbound' : 'outbound',
        content: m.content,
      })),
    });

    if (reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } else {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠ Não foi possível gerar resposta. Verifique se a API Key está configurada no Painel Admin.' }
      ]);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-sm border-border">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuit className="h-5 w-5 text-emerald-500" />
          Playground da Lua
        </CardTitle>
        <CardDescription>
          Teste como a Lua responderia a um cliente usando seu DNA ativo, conhecimento do estúdio e modelos da biblioteca. Nenhuma mensagem real será enviada.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 gap-2">
            <Sparkles className="h-10 w-10 mb-1" />
            <p className="text-sm">Envie uma mensagem fictícia para a Lua.</p>
            <p className="text-xs text-center max-w-sm">A Lua usará seu DNA de atendimento, dados do estúdio e modelos ativos para redigir um rascunho de resposta.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
              </div>
              <div className={`rounded-xl px-4 py-2 max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border shadow-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full shrink-0 bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div className="rounded-xl px-4 py-3 bg-card border shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 border-t bg-card">
        <form 
          className="flex w-full gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Textarea 
            placeholder="Digite a mensagem do 'cliente'..." 
            className="min-h-[40px] h-[40px] resize-none py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isGenerating}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
