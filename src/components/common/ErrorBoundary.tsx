import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CRITICAL] Uncaught error in React tree:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSkinAndReload = () => {
    try {
      localStorage.removeItem("omega:activeSkinUrl");
      localStorage.removeItem("omega:skinModel");
      localStorage.removeItem("omega:active_skin_name");
      localStorage.removeItem("omega:customSkin");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#07090d",
            color: "#e6e8ec",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            zIndex: 999999,
          }}
        >
          <div
            style={{
              maxWidth: "640px",
              width: "100%",
              background: "#0d1117",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                Сталася помилка відображення / Ошибка отображения
              </h2>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", lineHeight: "1.5" }}>
              Інтерфейс перехопив критичний збій у роботі компонента. Ви можете перезавантажити лаунчер або скинути кеш скіна:
            </p>

            <pre
              style={{
                margin: 0,
                padding: "12px",
                background: "#090c11",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f87171",
                overflow: "auto",
                maxHeight: "160px",
                fontFamily: "monospace",
              }}
            >
              {this.state.error?.toString()}
              {"\n"}
              {this.state.errorInfo?.componentStack}
            </pre>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  height: "40px",
                  padding: "0 18px",
                  borderRadius: "11px",
                  background: "#1a1d24",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#e6e8ec",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Перезавантажити
              </button>
              <button
                type="button"
                onClick={this.handleResetSkinAndReload}
                style={{
                  height: "40px",
                  padding: "0 18px",
                  borderRadius: "11px",
                  background: "#e6e8ec",
                  border: "1px solid #ffffff",
                  color: "#0d1117",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Скинути скін і перезапустити
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
