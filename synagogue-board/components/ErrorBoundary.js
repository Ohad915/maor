'use client';
import { Component } from 'react';

/** Keeps the TV screen alive: on a render error show a calm message and retry by itself after 5s. */
export default class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch() { this.t = setTimeout(() => this.setState({ err: null }), 5000); }
  componentWillUnmount() { clearTimeout(this.t); }
  render() {
    if (!this.state.err) return this.props.children;
    return <div className="dp" style={{ width: '100%', height: '100%' }}><p style={{ margin: 'auto', textAlign: 'center' }}>מתעדכן… המסך יחזור תוך רגע</p></div>;
  }
}
