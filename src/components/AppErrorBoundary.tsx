import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    void _error;
    void _errorInfo;
    // 利用者の学習内容や内部スタックをコンソール・画面へ出力しない。
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" id="main-content">
          <section
            aria-labelledby="app-error-title"
            className="surface-card recovery-card"
            role="alert"
          >
            <h1 id="app-error-title">画面を表示できませんでした</h1>
            <p>
              保存済みの学習データは削除されていません。アプリ更新直後や通信が不安定なときは、再読み込みすると直ることがあります。
            </p>
            <div className="error-boundary-actions">
              <button className="primary-button" onClick={reloadPage} type="button">
                再読み込み
              </button>
              <a className="secondary-button" href="#/">
                ホームへ戻る
              </a>
            </div>
            <p className="muted-text">
              解決しない場合は、設定画面からバックアップを作成したうえで、ブラウザのサイトデータを確認してください。
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function reloadPage() {
  window.location.reload();
}
