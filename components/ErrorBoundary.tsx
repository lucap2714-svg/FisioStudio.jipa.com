import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Erro inesperado' };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[App][ErrorBoundary] Render error capturado', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-bg text-slate-700">
          <div className="text-center space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.3em]">Ocorreu um erro. Recarregue.</p>
            <p className="text-[11px] text-slate-400">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
