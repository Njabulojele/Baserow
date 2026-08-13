"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={`min-h-[300px] w-full flex items-center justify-center p-6 ${
            this.props.className || ""
          }`}
        >
          <div className="toota-card max-w-lg w-full p-6 text-center space-y-5 border border-rose-500/20 bg-rose-500/5 shadow-2xl rounded-2xl">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                {this.props.title || "Something went wrong"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                An unexpected error occurred in this view. Don't worry, your work and data are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-black/40 border border-white/10 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-mono font-semibold">
                  <span className="truncate">{this.state.error.name}: {this.state.error.message}</span>
                  <button
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 ml-2"
                  >
                    {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {this.state.showDetails ? "Hide Stack" : "Stack"}
                  </button>
                </div>

                {this.state.showDetails && this.state.errorInfo && (
                  <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto p-2 bg-black/60 rounded-lg max-h-40 scrollbar-thin">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="text-xs font-semibold gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="text-xs font-semibold gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
