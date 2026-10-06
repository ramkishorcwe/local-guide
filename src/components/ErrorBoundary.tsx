import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="mx-auto max-w-lg p-8 pt-24 text-center">
      <h1 className="mb-3 text-2xl font-semibold text-gold">Let’s get you back on track.</h1>
      <p className="mb-6 text-slate-400">This page couldn’t load. Refresh to try again.</p>
      <button className="button-primary" onClick={() => window.location.reload()}>Refresh page</button>
    </main>;
    return this.props.children;
  }
}
