const fs = require('fs');
const content = fs.readFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', 'utf-8');
const startMarker = /return \(\s*<>\s*<div className="px-3 py-3/m;
const endMarker = /\{\/\* Modais renderizados FORA/;
if (startMarker.test(content) && endMarker.test(content)) {
  const startMatch = content.match(startMarker);
  const endMatch = content.match(endMarker);
  const startIdx = startMatch.index;
  const endIdx = endMatch.index;
  const newJsx = `return (
    <>
      <div 
        className="group relative flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/10 transition-colors border-b border-border/40 cursor-pointer min-h-[72px]" 
        onClick={onToggleExpand}
      >
        <SessionDateBlock 
          dataSessao={session.data} 
          horaSessao={session.hora} 
          appointmentId={session.appointmentId} 
          className="hidden md:flex" 
        />
        
        <SessionClientCell 
          clientId={session.clienteId} 
          nome={session.nome} 
          avatarUrl={session.avatarUrl} 
          categoria={session.categoria} 
          whatsapp={session.whatsapp} 
          className="flex-1 min-w-[200px]" 
        />

        <div className="w-48 shrink-0 hidden md:block" onClick={e => e.stopPropagation()}>
          <WorkflowPackageCombobox
            key={\`package-\${session.id}\`}
            value={pacoteAtual}
            displayName={displayPackageName}
            description={descriptionValue}
            variant="inline"
            onValueChange={(packageData) => {
              if (!packageData.id && !packageData.nome) {
                onFieldUpdate(session.id, 'pacote', '');
                return;
              }
              onFieldUpdate(session.id, 'pacote', packageData.id || packageData.nome);
            }}
          />
        </div>

        <div className="w-32 shrink-0 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <SessionStatusSelect
            status={session.status}
            statusOptions={statusOptions}
            onChange={handleStatusChange}
          />
        </div>

        <div className="w-24 shrink-0 hidden lg:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <ProductStatusChip
            produtos={session.produtosList as any}
            onClick={() => setModalAberto(true)}
          />
        </div>

        <SessionMetricCell 
          sessionId={session.sessionId || null}
          clienteId={(session as any).clienteId || null}
          pendente={pendente}
          formatCurrency={formatCurrency}
          className="w-24 shrink-0 hidden md:flex"
        />

        <div className="w-28 shrink-0 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <CardGalleryButtons
            galerias={galerias}
            hasGalerias={hasGalerias}
            temSelecao={temSelecao}
            temEntrega={temEntrega}
            temTodas={temTodas}
            onCreateSelecao={handleCreateSelecao}
            onCreateEntrega={handleCreateEntrega}
          />
        </div>

        <SessionRowMenu 
          clientId={session.clienteId}
          onOpenProdutos={() => setModalAberto(true)}
          onOpenPaymentModal={() => setWorkflowPaymentsOpen(true)}
          onCancelSession={() => setDeleteModalOpen(true)}
          className="hidden md:flex"
        />
      </div>

      `;
  let newContent = content.substring(0, startIdx) + newJsx + content.substring(endIdx);
  const pendingCellStart = newContent.indexOf('function CollapsedPendingCell(');
  if (pendingCellStart !== -1) {
    newContent = newContent.substring(0, pendingCellStart);
  }
  fs.writeFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', newContent);
  console.log('Sucesso!');
} else {
  console.log('Marcadores nao encontrados');
}
