"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** What to show instead of the crashed part. `reset` tries to render the children again. */
  fallback: (reset: () => void) => ReactNode;
  /** When this changes (other session, tab or view), the boundary tries again by itself. */
  resetKey?: string;
  /** Called once per caught error, e.g. to count it. */
  onError?: () => void;
  children: ReactNode;
}

/**
 * Catches render errors, so a problem in one view (for example with unusual data in a log)
 * does not blank the whole page and unload the files.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TLMscope view error", error, info.componentStack);
    this.props.onError?.();
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}
