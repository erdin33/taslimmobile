import { useEffect } from "react";

export function useDisableContextMenu() {
	useEffect(() => {
		const handleContextMenu = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			// Jangan matikan contextmenu pada input/textarea agar popup 'Paste'/'Tempel' Android berfungsi normal
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable ||
					target.closest("input") ||
					target.closest("textarea"))
			) {
				return;
			}
			event.preventDefault();
		};

		document.addEventListener("contextmenu", handleContextMenu);
		return () => document.removeEventListener("contextmenu", handleContextMenu);
	}, []);
}
