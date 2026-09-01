import { lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const DesktopRoutes = lazy(() => import("./DesktopRoutes").then(m => ({ default: m.DesktopRoutes })));
const AndroidRoutes = lazy(() => import("./AndroidRoutes").then(m => ({ default: m.AndroidRoutes })));

export function AppRoutes() {
	const isMobile = useIsMobile();

	return (
		<Suspense fallback={null}>
			{isMobile ? <AndroidRoutes /> : <DesktopRoutes />}
		</Suspense>
	);
}
