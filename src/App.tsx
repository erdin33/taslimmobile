import "./App.css";
import { HashRouter as Router } from "react-router-dom";
import { ThemeProvider } from "@/components/shared/themeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { useDisableContextMenu } from "@/lib/useDisableContextMenu";

function App() {
	useDisableContextMenu();

	return (
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
	);
}

export default App;
