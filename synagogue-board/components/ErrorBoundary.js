'use client';
import { Component } from 'react';
import { reloadSafely } from '@/lib/recover';

/**
 * display: keeps the TV screen alive. A render crash shows a calm message, remounts the screen after 4s, and if it crashes
 *          again (or the message stays for 30s) the whole page is reloaded (with loop protection, see lib/recover.js).
 *          It can never stay stuck: a timer keeps trying for as long as the fallback is visible.
 * admin:   a local error card for ONE tab (the rest of the panel keeps working) with a manual retry.
 */
export default class ErrorBoundary extends Component {
  state = { err: null, k: 0 };
  crashes = [];
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(e) {
    try { console.error('[maor] render crash:', e?.message, e?.stack); } catch {}
    if (this.props.admin) return;
    const n = Date.now(); this.crashes = this.crashes.filter((t) => n - t < 120e3); this.crashes.push(n);
    clearTimeout(this.t); clearInterval(this.iv);
    // 1st crash: just remount (a transient data glitch). 2nd crash within 2 minutes: full reload (stale deployment, bad state).
    this.t = setTimeout(() => { if (this.crashes.length >= 2) reloadSafely('render crash x' + this.crashes.length); this.setState((s) => ({ err: null, k: s.k + 1 })); }, 4000);
    // safety net: while the fallback is visible keep trying (remount every 10s, reload every 30s)
    let tick = 0;
    this.iv = setInterval(() => { if (!this.state.err) { clearInterval(this.iv); this.iv = null; return; } tick++; if (tick % 3 === 0) reloadSafely('fallback stuck'); this.setState((s) => ({ err: null, k: s.k + 1 })); }, 10000);
  }
  componentWillUnmount() { clearTimeout(this.t); clearInterval(this.iv); }
  render() {
    if (!this.state.err) return <div key={this.state.k} style={{ display: 'contents' }}>{this.props.children}</div>;
    if (this.props.admin) {
      return (<div className="cd" style={{ borderColor: 'var(--bad)' }}><h3>⚠ שגיאה בלשונית הזו</h3>
        <p style={{ color: 'var(--mu)' }}>שאר הלשוניות ממשיכות לעבוד. {String(this.state.err?.message || '')}</p>
        <button className="b" onClick={() => this.setState({ err: null })}>נסה שוב</button></div>);
    }
    return <div className="dp" style={{ width: '100%', height: '100%' }}><p style={{ margin: 'auto', textAlign: 'center' }}>מתעדכן… המסך יחזור תוך רגע<small style={{ display: 'block', opacity: 0.35, fontSize: '.5em', marginTop: '1em', direction: 'ltr' }}>{String(this.state.err?.message || '').slice(0, 120)}</small></p></div>;
  }
}
