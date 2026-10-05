const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/mobile/WorkflowMobileCard.tsx', 'utf-8');
const startMarker = '{/* PARTE COLAPSADA DO CARD */}';
const endMarker = '{/* PARTE EXPANDIDA DO CARD */}';
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);
if (startIdx !== -1 && endIdx !== -1) {
  const newJsx = `{/* PARTE COLAPSADA DO CARD */}
        <div
          onClick={() => {
            if (isScrollingRef.current) return;
            onToggleExpand();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="p-3.5 sm:p-4 cursor-pointer active:bg-accent/30 transition-colors select-none touch-manipulation flex items-center justify-between gap-2"
        >
          {/* Esquerda: Avatar + Nome + Descricao */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ClienteAvatar src={session.avatarUrl} nome={session.nome} size="md" className="shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-sm text-foreground truncate leading-tight">
                  {session.nome || 'Cliente'}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {displayPackageName}
              </span>
            </div>
          </div>

          {/* Direita: Horario ou Valor pendente + Acoes */}
          <div className="flex items-center shrink-0 ml-1 gap-2">
            <div className="flex flex-col items-end shrink-0" onClick={(e) => e.stopPropagation()}>
              <span className="text-[13px] font-semibold tabular-nums text-foreground leading-tight">
                {session.appointmentId && session.hora && session.hora !== '00:00' ? session.hora : (session.data ? formatToDayMonth(session.data) : 'S/ Data')}
              </span>
              {pendente > 0 && (
                <span className="text-[10px] font-medium text-destructive mt-0.5 tabular-nums leading-tight">
                  {formatCurrencyBRL(pendente)}
                </span>
              )}
            </div>

            {session.whatsapp && (
              <a
                href={\`https://wa.me/\${session.whatsapp.replace(/\\D/g, '')}\`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isScrollingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                }}
                className="h-7 w-7 rounded-full flex items-center justify-center bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors touch-manipulation shrink-0 ml-0.5"
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
            
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-0.5",
                isExpanded && "rotate-180 text-primary"
              )}
            />
          </div>
        </div>

        `;
  content = content.substring(0, startIdx) + newJsx + content.substring(endIdx);
  fs.writeFileSync('src/components/workflow/mobile/WorkflowMobileCard.tsx', content);
  console.log('Sucesso!');
} else {
  console.log('Nao achou marcadores');
}
