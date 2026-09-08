import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
class Boundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <h1>The workspace needs to reload</h1>
        <p>{this.state.error}</p>
        <p>Saved reviews are kept beside your assets. Comment drafts are kept on this device.</p>
        <button onClick={() => location.reload()}>Reload workspace</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <Boundary>
    <App />
  </Boundary>,
);
