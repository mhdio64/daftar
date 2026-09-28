import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-600 dark:text-slate-300">
          <div className="max-w-md p-6 rounded-2xl bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-strong shadow-lg space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {this.props.fallbackTitle || 'خطا در بارگذاری این بخش'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              مشکلی در اجرای یا فراخوانی این بخش رخ داده است. می‌توانید مجدداً تلاش کنید یا صفحه را تازه‌سازی نمایید.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تلاش مجدد</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-border-strong hover:bg-slate-100 dark:hover:bg-surface-2 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <span>تازه‌سازی صفحه</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
