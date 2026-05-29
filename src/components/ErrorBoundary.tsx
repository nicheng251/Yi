import { Component, ReactNode, ErrorInfo } from "react";
import i18n from "i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const t = i18n.t.bind(i18n);
      return (
        <div className="error-fallback">
          <h2>{t("error.title")}</h2>
          <p>{this.state.error?.message || t("error.unknown")}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            {t("error.reload")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
