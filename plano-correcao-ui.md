# Plano de Correção Rigorosa: Leads vs Design System

Com base na sua merecida bronca e na análise minuciosa das imagens de referência (Finanças e Design System), identifico exatamente onde a tela de Leads falha em seguir a consistência. Abaixo está o diagnóstico e como a UI *deve* ser reescrita. Nenhuma linha de código será alterada até a sua aprovação.

---

## 1. O Grupo "Funil / Ganhos / Perdidos" (O maior erro conceitual)
**O Diagnóstico:** O código atual tenta forçar esse grupo a ser uma "Sub-aba" (usando \UnderlineTabs\), mas visualmente mistura com o conceito de "Filtro com contador" (que você mostrou na imagem do Design System). Ao tentar ser os dois, ele fica quebrado: não tem a linha cinza de 100% da tela das abas de Finanças, não tem ícones base, e usa "pílulas" para os números que quebram o visual de Aba.

**O Plano (Você escolhe o caminho):**

> **Opção A (Transformar em Filtros Reais - Recomendado pelo seu DS anexado):**
> Se eles controlam o que aparece no Kanban, deveriam ser botões de Segmentação/Filtro, exatamente como na seção "Filtros" do seu Design System.
> *Exemplo de Código:*
> \\\	sx
> // Abandonamos o UnderlineTabs e usamos botões de Filtro:
> <div className="flex items-center gap-2">
>   <Button variant="outline" className="rounded-md border-accent-gold bg-accent-gold/10 text-accent-gold">
>     <FilterIcon className="mr-2 h-4 w-4" /> Funil <Badge className="ml-2 bg-accent-gold text-white">5</Badge>
>   </Button>
>   <Button variant="outline" className="rounded-md bg-background text-muted-foreground hover:text-foreground">
>     <CheckCircle className="mr-2 h-4 w-4" /> Ganhos <Badge className="ml-2 bg-muted">0</Badge>
>   </Button>
> </div>
> \\\

> **Opção B (Forçar o padrão Sub-Aba de Finanças):**
> Se eles DEVEM ser abas, precisamos aplicar o container de 100% de largura, alinhar os filtros embaixo, e colocar o número como parte do texto limpo, sem pílulas cinzas, idêntico à imagem de Finanças.
> *Exemplo de Código:*
> \\\	sx
> <TabsList className="w-full border-b border-border bg-transparent p-0 justify-start">
>   <TabsTrigger value="ativos" className="border-b-2 border-transparent data-[state=active]:border-accent-gold data-[state=active]:text-foreground rounded-none">
>     <FilterIcon className="mr-2 h-4 w-4" /> Funil (5)
>   </TabsTrigger>
> </TabsList>
> \\\

---

## 2. A Barra de Busca e Dropdowns ("Buscar", "90 dias", "Origens")
**O Diagnóstico:** Eles estão usando \g-transparent\, sem bordas sólidas, com raios altos (\ounded-lg\ ou customizados) que dão o aspecto "pílula solta e arredondada" (como você circulou de vermelho). O seu Design System mostra explicitamente na seção "Inputs" e "Select / Dropdown" que eles devem ser caixas bem definidas com \ounded-md\ e bordas visíveis.

**O Plano de Correção:**
Substituir as classes fluidas por caixas contornadas do Design System.
*Exemplo de Código:*
\\\	sx
// Input de Busca:
<Input 
  className="h-9 rounded-md bg-background border border-input shadow-sm focus-visible:border-accent-gold" 
  placeholder="Buscar leads..." 
/>

// Selects (90 dias / Origens):
<SelectTrigger className="h-9 rounded-md bg-background border border-input shadow-sm">
  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
  <SelectValue />
</SelectTrigger>
\\\

---

## 3. Os Botões de Ação (+ Novo Lead e Engrenagem)
**O Diagnóstico:** O "+ Novo Lead" na sua imagem é uma pílula 100% preta (com bordas super arredondadas). O Design System "Primary Button" define cantos \ounded-md\, com o "+" na esquerda.

**O Plano de Correção:**
Refatorar para usar o \Button\ padrão primário, garantindo o \ounded-md\ geométrico.
*Exemplo de Código:*
\\\	sx
// Primary CTA:
<Button variant="default" className="h-9 rounded-md shadow-sm bg-foreground text-background hover:bg-foreground/90">
  <Plus className="h-4 w-4 mr-2" /> TEXTO
</Button>

// Ícone Secundário (Engrenagem):
<Button variant="outline" size="icon" className="h-9 w-9 rounded-md bg-background border border-input shadow-sm">
  <Settings className="h-4 w-4" />
</Button>
\\\

---

### Resumo para Execução
Se você autorizar, eu vou entrar no arquivo \Leads.tsx\ e \UnifiedLeadFilters.tsx\ para arrancar os containers fluidos, TABS falsas e bordas arredondadas ("pílulas"), aplicando estritamente as regras geométricas (ounded-md, caixas com order-input e shadow-sm) demonstradas no seu painel do Design System.

Qual rota prefere para a área circulada 1: **Opção A (Filtros Segmentados como no DS)** ou **Opção B (Sub-abas puras tipo Finanças)**?
