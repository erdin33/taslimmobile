import { Outlet, NavLink } from "react-router-dom";
import { Notifications } from "@/features/dashboard/components/notifications";
import { 
	Home, 
	PackagePlus, 
	
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
	User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
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
} from "@/components/ui/alert-dialog"
import { useNavigate } from "react-router-dom"


export default function AndroidLayout() {
	const { user, logout } = useAuth();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const isAdmin = user?.role === "admin";
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const handleLogout = () => {
		logout();
		setIsLogoutDialogOpen(false);
		navigate("/login", { replace: true });
	};

	// Helper to close sheet on navigation
	const closeSheet = () => setIsSheetOpen(false);

	return (
		<div className="flex flex-col h-svh w-full bg-background overflow-hidden relative">
			{/* Top Header (Optional) */}
			<header className="pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] border-b flex items-center justify-between bg-card shadow-sm z-10 shrink-0 px-4">
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
			<main className="flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
				<Outlet />
			</main>

			{/* Floating Action Button for Scan */}
			<div className="absolute bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-6 z-50">
				<button 
					onClick={() => navigate('/barang-masuk', { state: { autoScan: true } })}
					className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
				>
					<ScanBarcode className="w-6 h-6" />
				</button>
			</div>

			{/* Bottom Navigation Bar */}
			<nav className="absolute bottom-0 w-full h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-card border-t flex items-center justify-around pb-[env(safe-area-inset-bottom,0px)] z-50 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-2">
				{/* Home */}
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
				
				{/* In */}
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

				{/* Request */}
				<NavLink
					to="/request"
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors",
							isActive && "text-primary font-medium"
						)
					}>
					<HistoryIcon className="w-5 h-5" />
					<span className="text-[10px]">Request</span>
				</NavLink>

				{/* Menu / Lainnya */}
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors hover:text-primary">
							<Menu className="w-5 h-5" />
							<span className="text-[10px]">Lainnya</span>
						</button>
					</SheetTrigger>
					<SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] px-5">
						<SheetHeader className="mb-6 pt-3 text-left">
							<SheetTitle className="text-xl font-bold tracking-tight">Menu Utama</SheetTitle>
						</SheetHeader>
						
						<div className="space-y-7">
							{/* Operasional */}
							<div>
								<h3 className="text-[11px] font-bold text-muted-foreground/70 mb-4 uppercase tracking-widest px-1">Operasional</h3>
								<div className="grid grid-cols-4 gap-y-6 gap-x-2">
									<MenuButton to="/barang-masuk" icon={<PackagePlus />} label="Brg Masuk" onClick={closeSheet} />
									<MenuButton to="/request" icon={<HistoryIcon />} label="Request" onClick={closeSheet} />
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

function MenuButton({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
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
				"flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-[1rem] transition-colors",
				"bg-muted/40 group-hover:bg-muted/60 shadow-sm",
				"group-active:bg-muted/80"
			)}>
				<div className="size-5 *:w-full *:h-full">
					{icon}
				</div>
			</div>
			<span className="text-[10px] font-medium text-center leading-[1.1] w-full px-0.5 line-clamp-2">{label}</span>
		</NavLink>
	);
}
