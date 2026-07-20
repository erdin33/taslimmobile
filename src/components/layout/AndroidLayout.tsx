import { Outlet, NavLink } from "react-router-dom";
import { 
	Home, 
	PackagePlus, 
	PackageMinus, 
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
	LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
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
			<header className="h-14 border-b flex items-center justify-between bg-card shadow-sm z-10 shrink-0 px-4">
				<h1 className="font-semibold text-lg tracking-tight">Taslim Mobile</h1>
				<button onClick={() => setIsLogoutDialogOpen(true)} className="p-2 text-muted-foreground hover:bg-muted rounded-full">
					<LogOut className="w-5 h-5" />
				</button>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 overflow-y-auto pb-24 pt-4 px-4">
				<Outlet />
			</main>

			{/* Floating Action Button for Scan */}
			<div className="absolute bottom-24 right-6 z-50">
				<button className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all">
					<ScanBarcode className="w-6 h-6" />
				</button>
			</div>

			{/* Bottom Navigation Bar */}
			<nav className="absolute bottom-0 w-full h-16 bg-card border-t flex items-center justify-around pb-safe z-50 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-2">
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

				{/* Out */}
				<NavLink
					to="/barang-keluar"
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors",
							isActive && "text-primary font-medium"
						)
					}>
					<PackageMinus className="w-5 h-5" />
					<span className="text-[10px]">Keluar</span>
				</NavLink>

				{/* Menu / Lainnya */}
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors hover:text-primary">
							<Menu className="w-5 h-5" />
							<span className="text-[10px]">Lainnya</span>
						</button>
					</SheetTrigger>
					<SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
						<SheetHeader className="mb-4 text-left">
							<SheetTitle>Menu Lengkap</SheetTitle>
						</SheetHeader>
						
						<div className="space-y-6">
							{/* Operasional */}
							<div>
								<h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Operasional</h3>
								<div className="grid grid-cols-4 gap-4">
									<MenuButton to="/barang-masuk" icon={<PackagePlus />} label="Brg Masuk" onClick={closeSheet} />
									<MenuButton to="/barang-keluar" icon={<PackageMinus />} label="Brg Keluar" onClick={closeSheet} />
									<MenuButton to="/request" icon={<HistoryIcon />} label="Request" onClick={closeSheet} />
								</div>
							</div>

							{/* Inventori */}
							<div>
								<h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Inventori</h3>
								<div className="grid grid-cols-4 gap-4">
									<MenuButton to="/data-barang" icon={<Database />} label="Data Brg" onClick={closeSheet} />
								</div>
							</div>

							{/* Manajemen Data (Admin Only) */}
							{isAdmin && (
								<div>
									<h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Manajemen Data</h3>
									<div className="grid grid-cols-4 gap-4">
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
								<h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Sistem</h3>
								<div className="grid grid-cols-4 gap-4">
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

// Helper component for Sheet Menu Items
function MenuButton({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
	return (
		<NavLink
			to={to}
			onClick={onClick}
			className={({ isActive }) =>
				cn(
					"flex flex-col items-center gap-2",
					isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
				)
			}
		>
			<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50">
				{icon}
			</div>
			<span className="text-[10px] font-medium text-center leading-tight">{label}</span>
		</NavLink>
	);
}
