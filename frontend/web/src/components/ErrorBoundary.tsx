import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#334155',
          padding: 20,
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>⚠️ 页面遇到了一点问题</h2>
          <p style={{ marginBottom: 24, color: '#64748b' }}>
            可能是由于数据缓存或网络原因导致的。<br/>
            错误信息: {this.state.error?.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            清除缓存并刷新
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
