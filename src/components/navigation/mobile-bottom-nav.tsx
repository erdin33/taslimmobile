import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  Package,
  Database,
  Shapes,
  PackagePlus,
  PackageMinus,
  History,
  MapPin,
  Award,
  Handshake,
  Settings,
  LogOut,
  ChevronRight
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function MobileBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === "admin"

  const [operasionalOpen, setOperasionalOpen] = React.useState(false)
  const [manajemenOpen, setManajemenOpen] = React.useState(false)

  // Close drawers on navigate
  React.useEffect(() => {
    setOperasionalOpen(false)
    setManajemenOpen(false)
  }, [currentPath])

  const handleLogout = () => {
    logout()
    setManajemenOpen(false)
    navigate("/login", { replace: true })
  }

  // Active check helper
  const isTabActive = (tab: "dashboard" | "operasional" | "inventory" | "manajemen") => {
    if (tab === "dashboard") return currentPath === "/"
    if (tab === "inventory") return currentPath === "/data-barang"
    if (tab === "operasional") {
      return ["/barang-masuk", "/barang-keluar", "/riwayat"].includes(currentPath)
    }
    if (tab === "manajemen") {
      return ["/lokasi-barang", "/kategori-barang", "/merek-barang", "/mitra", "/pengaturan"].includes(currentPath)
    }
    return false
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background/80 backdrop-blur-lg md:hidden">
      <div className="grid h-full items-center justify-around px-2 min-w-0" style={{ gridTemplateColumns: isAdmin ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }}>
        
        {/* Dashboard */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-full text-muted-foreground transition-all active:scale-95",
            isTabActive("dashboard") && "text-primary font-medium"
          )}
        >
          <LayoutGrid className="size-5" />
          <span className="text-[10px] tracking-wide">Dashboard</span>
        </Link>

        {/* Operasional */}
        <Drawer open={operasionalOpen} onOpenChange={setOperasionalOpen}>
          <DrawerTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-full text-muted-foreground transition-all active:scale-95",
                isTabActive("operasional") && "text-primary font-medium"
              )}
            >
              <Package className="size-5" />
              <span className="text-[10px] tracking-wide">Operasional</span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Operasional</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-1.5 p-4 pt-0 pb-6">
              <Link
                to="/barang-masuk"
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                  currentPath === "/barang-masuk" && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                    <PackagePlus className="size-5" />
                  </div>
                  <span>Barang Masuk</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </Link>
              <Link
                to="/barang-keluar"
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                  currentPath === "/barang-keluar" && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/10 rounded-lg text-sky-500">
                    <PackageMinus className="size-5" />
                  </div>
                  <span>Barang Keluar</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </Link>
              <Link
                to="/riwayat"
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                  currentPath === "/riwayat" && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                    <History className="size-5" />
                  </div>
                  <span>Riwayat Transaksi</span>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </Link>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Inventory */}
        <Link
          to="/data-barang"
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-full text-muted-foreground transition-all active:scale-95",
            isTabActive("inventory") && "text-primary font-medium"
          )}
        >
          <Database className="size-5" />
          <span className="text-[10px] tracking-wide">Inventory</span>
        </Link>

        {/* Manajemen Data (Hanya Admin) */}
        {isAdmin && (
          <Drawer open={manajemenOpen} onOpenChange={setManajemenOpen}>
            <DrawerTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full text-muted-foreground transition-all active:scale-95",
                  isTabActive("manajemen") && "text-primary font-medium"
                )}
              >
                <Shapes className="size-5" />
                <span className="text-[10px] tracking-wide">Manajemen Data</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Manajemen Data</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-1.5 p-4 pt-0 pb-6 overflow-y-auto max-h-[60vh]">
                <Link
                  to="/lokasi-barang"
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                    currentPath === "/lokasi-barang" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <MapPin className="size-4" />
                    </div>
                    <span>Lokasi Barang</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
                <Link
                  to="/kategori-barang"
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                    currentPath === "/kategori-barang" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <Shapes className="size-4" />
                    </div>
                    <span>Kategori Barang</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
                <Link
                  to="/merek-barang"
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                    currentPath === "/merek-barang" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <Award className="size-4" />
                    </div>
                    <span>Merek Barang</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
                <Link
                  to="/mitra"
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                    currentPath === "/mitra" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <Handshake className="size-4" />
                    </div>
                    <span>Mitra</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
                <Link
                  to="/pengaturan"
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent text-foreground text-sm font-medium",
                    currentPath === "/pengaturan" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <Settings className="size-4" />
                    </div>
                    <span>Pengaturan</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </Link>
                
                <div className="border-t border-border/20 my-2"></div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-medium"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-destructive/10 rounded-lg text-destructive">
                      <LogOut className="size-4" />
                    </div>
                    <span>Keluar (Logout)</span>
                  </div>
                  <ChevronRight className="size-4 text-destructive/60" />
                </button>
              </div>
            </DrawerContent>
          </Drawer>
        )}

      </div>
    </div>
  )
}
