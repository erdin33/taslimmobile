import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopRoutes } from "./DesktopRoutes";
import { AndroidRoutes } from "./AndroidRoutes";

export function AppRoutes() {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <AndroidRoutes />;
	}

	return <DesktopRoutes />;
}
