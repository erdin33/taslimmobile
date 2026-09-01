import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Notifications } from "@/features/dashboard/components/notifications";
import {
	Home,
	PackagePlus,
	PackageMinus,
	ClipboardPlus,
	ScanBarcode,
	Menu,
	Database,
	HistoryIcon,
	MapPinHouse,
	Box,
	Shapes,
	CircleStar,
	Handshake,
	Settings,
	LogOut,
	Sun,
	Moon,
	User,
	PackageCheck,
	ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/shared/themeProvider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getBaseUrl = () => {
	const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
	return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getHeaders = () => {
	const token = localStorage.getItem("taslim-auth-token");
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) {
		headers["Authorization"] = `${token}`;
	}
	return headers;
};

export default function AndroidLayout() {
	const { user, logout } = useAuth();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const isAdmin = user?.role === "admin";
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	// Live counter badges
	const [pendingRequestCount, setPendingRequestCount] = useState(0);
	const [pendingReturCount, setPendingReturCount] = useState(0);

	const fetchBadgeCounts = useCallback(async () => {
		if (!user || user.role !== "admin") {
			setPendingRequestCount(0);
			setPendingReturCount(0);
			return;
		}
		try {
			const res = await fetch(`${getBaseUrl()}/requests`, {
				method: "GET",
				headers: getHeaders(),
			});
			if (res.ok) {
				const json = await res.json();
				const list = Array.isArray(json.data || json) ? (json.data || json) : [];
				const pending = list.filter((r: any) => String(r.status || "").toLowerCase() === "menunggu").length;
				setPendingRequestCount(pending);
			}
		} catch (e) {
			// silent fallback
		}

		try {
			const mockRetur = JSON.parse(localStorage.getItem("mock_retur_requests") || "[]");
			const pendingRetur = mockRetur.filter((r: any) => r.type === "RETUR" && String(r.status || "").toLowerCase() === "menunggu").length;
			setPendingReturCount(pendingRetur);
		} catch (e) {}
	}, [user]);

	useEffect(() => {
		fetchBadgeCounts();
		const interval = setInterval(fetchBadgeCounts, 10000);
		window.addEventListener("focus", fetchBadgeCounts);
		window.addEventListener("request-count-updated", fetchBadgeCounts);
		return () => {
			clearInterval(interval);
			window.removeEventListener("focus", fetchBadgeCounts);
			window.removeEventListener("request-count-updated", fetchBadgeCounts);
		};
	}, [fetchBadgeCounts]);

	const handleLogout = () => {
		logout();
		setIsLogoutDialogOpen(false);
		navigate("/login", { replace: true });
	};

	// Helper to close sheet on navigation
	const closeSheet = () => setIsSheetOpen(false);

	const totalLainnyaBadge = (isAdmin ? pendingReturCount : 0);

	return (
		<div className="flex flex-col h-svh w-full bg-background overflow-hidden relative">
			{/* Top Header */}
			<header className="pt-[max(env(safe-area-inset-top),32px)] h-[calc(3.5rem+max(env(safe-area-inset-top),32px))] border-b flex items-center justify-between bg-card shadow-sm z-10 shrink-0 px-4">
				<h1 className="font-semibold text-lg tracking-tight">Taslim Mobile</h1>
				<div className="flex items-center gap-1">
					<button
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
						className="p-2 text-muted-foreground hover:bg-muted rounded-full"
					>
						{theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
					</button>
					<Notifications />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="p-1 rounded-full hover:bg-muted transition-colors focus:outline-none">
								<Avatar size="sm">
									<AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
										{user?.displayName
											? user.displayName
												.split(" ")
												.map((n) => n[0])
												.join("")
												.toUpperCase()
												.slice(0, 2)
											: <User className="w-3 h-3" />}
									</AvatarFallback>
								</Avatar>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel className="font-normal">
								<div className="flex flex-col gap-1">
									<p className="text-sm font-semibold leading-none">{user?.displayName || "User"}</p>
									<p className="text-xs text-muted-foreground leading-none capitalize">{user?.role || "—"}</p>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => navigate("/pengaturan")}
								className="cursor-pointer"
							>
								<User className="w-4 h-4" />
								<span>Profil</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setIsLogoutDialogOpen(true)}
								className="cursor-pointer"
							>
								<LogOut className="w-4 h-4" />
								<span>Keluar</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 overflow-y-auto pb-4">
				<Outlet />
			</main>

			{/* Floating Action Button for Scan */}
			{isAdmin && (
				<div className="absolute bottom-[7.25rem] right-6 z-40">
					<button
						onClick={() => navigate('/barang-masuk', { state: { autoScan: true } })}
						className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
					>
						<ScanBarcode className="w-6 h-6" />
					</button>
				</div>
			)}

			{/* Bottom Navigation Bar */}
			<nav className="h-[6.5rem] pb-11 w-full bg-card border-t flex items-center justify-around z-50 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-2">
				{/* 1. Home */}
				<NavLink
					to="/"
					end
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors",
							isActive && "text-primary font-medium"
						)
					}>
					<Home className="w-5 h-5" />
					<span className="text-[10px]">Dashboard</span>
				</NavLink>

				{/* 2. Admin: Masuk | Mitra: Tugas Harian */}
				{isAdmin ? (
					<NavLink
						to="/barang-masuk"
						className={({ isActive }) =>
							cn(
								"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors",
								isActive && "text-primary font-medium"
							)
						}>
						<PackagePlus className="w-5 h-5" />
						<span className="text-[10px]">Masuk</span>
					</NavLink>
				) : (
					<NavLink
						to="/tugas-harian"
						className={({ isActive }) =>
							cn(
								"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors",
								isActive && "text-primary font-medium"
							)
						}>
						<ClipboardCheck className="w-5 h-5" />
						<span className="text-[10px] whitespace-nowrap">Recon</span>
					</NavLink>
				)}

				{/* 3. TENGAH (Hanya Mitra): Barang Keluar (Floating Button) */}
				{!isAdmin && (
					<NavLink
						to="/barang-keluar"
						className={({ isActive }) =>
							cn(
								"relative flex flex-col items-center justify-center w-full h-full group text-muted-foreground transition-colors",
								isActive && "text-primary font-medium"
							)
						}>
						{/* Lingkaran Menonjol (Floating) */}
						<div className="absolute -top-6 bg-background p-1.5 rounded-full z-10">
							<div className="flex items-center justify-center w-[3.5rem] h-[3.5rem] rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-active:scale-95 group-hover:scale-105">
								<PackageMinus className="w-6 h-6" />
							</div>
						</div>
						{/* Teks Label di Navbar */}
						<div className="flex flex-col items-center justify-end h-full w-full pb-0.5 pt-8">
							<span className="text-[10px]">Keluar</span>
						</div>
					</NavLink>
				)}

				{/* 4. Request / History with LIVE BADGE */}
				<NavLink
					to={isAdmin ? "/request" : "/partner-request/history"}
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors relative",
							isActive && "text-primary font-medium"
						)
					}>
					<div className="relative">
						<HistoryIcon className="w-5 h-5" />
						{isAdmin && pendingRequestCount > 0 && (
							<span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-in zoom-in shadow-xs">
								{pendingRequestCount > 99 ? "99+" : pendingRequestCount}
							</span>
						)}
					</div>
					<span className="text-[10px] whitespace-nowrap">Request</span>
				</NavLink>

				{/* 5. Menu / Lainnya with LIVE BADGE */}
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors hover:text-primary relative">
							<div className="relative">
								<Menu className="w-5 h-5" />
								{isAdmin && totalLainnyaBadge > 0 && (
									<span className="absolute -top-1 -right-1 flex size-2.5 rounded-full bg-destructive animate-pulse" />
								)}
							</div>
							<span className="text-[10px]">Lainnya</span>
						</button>
					</SheetTrigger>
					<SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-3xl px-5 pb-12">
						<SheetHeader className="mb-6 pt-3 text-left">
							<SheetTitle className="text-xl font-bold tracking-tight">Menu Utama</SheetTitle>
						</SheetHeader>

						<div className="space-y-7">
							{/* Operasional */}
							<div>
								<h3 className="text-[11px] font-bold text-muted-foreground/70 mb-4 uppercase tracking-widest px-1">Operasional</h3>
								<div className="grid grid-cols-4 gap-y-6 gap-x-2">
									{isAdmin ? (
										<>
											<MenuButton to="/barang-masuk" icon={<PackagePlus />} label="Brg Masuk" onClick={closeSheet} />
											<MenuButton
												to="/penerimaan-retur"
												icon={<PackageCheck />}
												label="Terima Retur"
												badgeCount={pendingReturCount}
												onClick={closeSheet}
											/>
											<MenuButton
												to="/request"
												icon={<HistoryIcon />}
												label="Request"
												badgeCount={pendingRequestCount}
												onClick={closeSheet}
											/>
											<MenuButton
												to="/laporan-recon"
												icon={<ClipboardCheck />}
												label="Lap. Recon"
												onClick={closeSheet}
											/>
										</>
									) : (
										<>
											<MenuButton to="/barang-masuk" icon={<PackagePlus />} label="Pengembalian" onClick={closeSheet} />
											<MenuButton to="/barang-keluar" icon={<PackageMinus />} label="Brg Keluar" onClick={closeSheet} />
											<MenuButton to="/tugas-harian" icon={<ClipboardCheck />} label="Recon" onClick={closeSheet} />
											<MenuButton to="/partner-request/new" icon={<ClipboardPlus />} label="Ajukan Req" onClick={closeSheet} />
											<MenuButton
												to="/partner-request/history"
												icon={<HistoryIcon />}
												label="Histori Req"
												onClick={closeSheet}
											/>
										</>
									)}
								</div>
							</div>

							{/* Inventori */}
							<div>
								<h3 className="text-[11px] font-bold text-muted-foreground/70 mb-4 uppercase tracking-widest px-1">Inventori</h3>
								<div className="grid grid-cols-4 gap-y-6 gap-x-2">
									<MenuButton to="/data-barang" icon={<Database />} label="Data Brg" onClick={closeSheet} />
								</div>
							</div>

							{/* Manajemen Data (Admin Only) */}
							{isAdmin && (
								<div>
									<h3 className="text-[11px] font-bold text-muted-foreground/70 mb-4 uppercase tracking-widest px-1">Manajemen Data</h3>
									<div className="grid grid-cols-4 gap-y-6 gap-x-2">
										<MenuButton to="/lokasi-barang" icon={<MapPinHouse />} label="Lokasi" onClick={closeSheet} />
										<MenuButton to="/tipe-material" icon={<Box />} label="Tipe Mat." onClick={closeSheet} />
										<MenuButton to="/kategori-barang" icon={<Shapes />} label="Kategori" onClick={closeSheet} />
										<MenuButton to="/merek-barang" icon={<CircleStar />} label="Merek" onClick={closeSheet} />
										<MenuButton to="/mitra" icon={<Handshake />} label="Mitra" onClick={closeSheet} />
									</div>
								</div>
							)}

							{/* Sistem */}
							<div>
								<h3 className="text-[11px] font-bold text-muted-foreground/70 mb-4 uppercase tracking-widest px-1">Sistem</h3>
								<div className="grid grid-cols-4 gap-y-6 gap-x-2">
									<MenuButton to="/pengaturan" icon={<Settings />} label="Pengaturan" onClick={closeSheet} />
									<ActionButton onClick={() => { closeSheet(); setIsLogoutDialogOpen(true); }} icon={<LogOut className="text-destructive" />} label="Keluar" />
								</div>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</nav>

			{/* Logout Dialog */}
			<AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
				<AlertDialogContent className="w-[90%] rounded-xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Konfirmasi logout</AlertDialogTitle>
						<AlertDialogDescription>
							Apakah Anda yakin ingin keluar dari akun {user?.displayName}?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex-row justify-end gap-2">
						<AlertDialogCancel className="mt-0">Batal</AlertDialogCancel>
						<AlertDialogAction onClick={handleLogout}>Keluar</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function MenuButton({
	to,
	icon,
	label,
	badgeCount,
	onClick,
}: {
	to: string;
	icon: React.ReactNode;
	label: string;
	badgeCount?: number;
	onClick: () => void;
}) {
	return (
		<NavLink
			to={to}
			onClick={onClick}
			className={({ isActive }) =>
				cn(
					"group flex flex-col items-center gap-2.5 transition-all active:scale-95",
					isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
				)
			}
		>
			<div className={cn(
				"flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1rem] transition-colors relative",
				"bg-muted/40 group-hover:bg-muted/60 shadow-sm",
				"group-active:bg-muted/80"
			)}>
				<div className="size-5 *:w-full *:h-full">
					{icon}
				</div>
				{badgeCount !== undefined && badgeCount > 0 && (
					<span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-xs animate-in zoom-in">
						{badgeCount > 99 ? "99+" : badgeCount}
					</span>
				)}
			</div>
			<span className="text-[10px] font-medium text-center leading-[1.1] w-full px-0.5 line-clamp-2">{label}</span>
		</NavLink>
	);
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className="group flex flex-col items-center gap-2.5 transition-all active:scale-95 text-muted-foreground hover:text-foreground"
		>
			<div className={cn(
				"flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1rem] transition-colors",
				"bg-muted/40 group-hover:bg-muted/60 shadow-sm",
				"group-active:bg-muted/80"
			)}>
				<div className="size-5 *:w-full *:h-full">
					{icon}
				</div>
			</div>
			<span className="text-[10px] font-medium text-center leading-[1.1] w-full px-0.5 line-clamp-2">{label}</span>
		</button>
	);
}
