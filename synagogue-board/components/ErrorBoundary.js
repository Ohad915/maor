'use client';
import { Component } from 'react';

/**
 * display: keeps the TV screen alive - calm message and auto-retry after 5s.
 * admin:   a local error card for ONE tab (the rest of the panel keeps working) with a manual retry.
 */
export default class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(e) { if (this.props.admin) { try { console.error(e); } catch {} } else this.t = setTimeout(() => this.setState({ err: null }), 5000); }
  componentWillUnmount() { clearTimeout(this.t); }
  render() {
    if (!this.state.err) return this.props.children;
    if (this.props.admin) {
      return (<div className="cd" style={{ borderColor: 'var(--bad)' }}><h3>⚠ שגיאה בלשונית הזו</h3>
        <p style={{ color: 'var(--mu)' }}>שאר הלשוניות ממשיכות לעבוד. {String(this.state.err?.message || '')}</p>
        <button className="b" onClick={() => this.setState({ err: null })}>נסה שוב</button></div>);
    }
    return <div className="dp" style={{ width: '100%', height: '100%' }}><p style={{ margin: 'auto', textAlign: 'center' }}>מתעדכן… המסך יחזור תוך רגע</p></div>;
  }
}
