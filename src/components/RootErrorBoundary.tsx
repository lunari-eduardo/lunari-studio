import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

import { isChunkLoadError, forceCleanReload, handleChunkErrorWithAutoReload } from '@/lib/chunkRecovery';

export class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary pegou um erro:", error, errorInfo);

    // Auto-recuperação transparente para chunks obsoletos pós-deploy
    if (isChunkLoadError(error)) {
      handleChunkErrorWithAutoReload(error);
    }
  }

  handleRefresh = async () => {
    await forceCleanReload(false);
  };

  handleClearCacheAndReload = async () => {
    await forceCleanReload(true);
  };

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {isChunk ? 'Atualização disponível' : 'Algo deu errado'}
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            {isChunk
              ? 'Uma nova versão do Lunari Studio foi publicada. Clique em Atualizar para carregar os arquivos mais recentes.'
              : 'O aplicativo encontrou um erro inesperado ao carregar. Por favor, recarregue a página.'}
          </p>
          <div className="flex gap-4">
            <Button onClick={this.handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {isChunk ? 'Atualizar Agora' : 'Recarregar'}
            </Button>
            <Button variant="outline" onClick={this.handleClearCacheAndReload}>
              Limpar Cache e Atualizar
            </Button>
          </div>
          <div className="mt-8 p-4 bg-muted rounded-md text-left text-xs max-w-2xl overflow-auto w-full">
            <h2 className="font-bold mb-2">Detalhes técnicos:</h2>
            <pre className="whitespace-pre-wrap">
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
