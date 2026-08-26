import "./App.css";
import React from "react";
import { HashRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@/components/shared/themeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { useDisableContextMenu } from "@/lib/useDisableContextMenu";

// Error Boundary: mencegah blank screen saat ada JS error saat render
class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("[ErrorBoundary] Render error:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					display: "flex", flexDirection: "column", alignItems: "center",
					justifyContent: "center", minHeight: "100dvh", padding: "2rem",
					background: "#09090b", color: "#fafafa", textAlign: "center", gap: "1rem"
				}}>
					<div style={{ fontSize: "2.5rem" }}>⚠️</div>
					<h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Terjadi Kesalahan</h2>
					<p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: 0, maxWidth: 320 }}>
						{this.state.error?.message || "Aplikasi mengalami error. Silakan muat ulang."}
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							marginTop: "0.5rem", padding: "0.625rem 1.5rem",
							borderRadius: "0.5rem", border: "none",
							background: "#6366f1", color: "white",
							fontSize: "0.9rem", fontWeight: 600, cursor: "pointer"
						}}
					>
						Muat Ulang
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

function App() {
	useDisableContextMenu();

	return (
		<ErrorBoundary>
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<TooltipProvider>
					<AuthProvider>
						<Router>
							<AppRoutes />
						</Router>
					</AuthProvider>
				</TooltipProvider>
				<Toaster />
			</ThemeProvider>
		</ErrorBoundary>
	);
}

export default App;
