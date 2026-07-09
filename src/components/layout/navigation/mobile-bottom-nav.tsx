import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  Database,
  Shapes,
  History,
  MapPin,
  Award,
  Handshake,
  Settings,
  LogOut,
  ChevronRight,
  ScanBarcode
} from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { CameraScanner } from "@/components/camera-scanner"

const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getHeaders = () => {
  const token = localStorage.getItem("arxiva-auth-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `${token}`;
  }
  return headers;
};

export function MobileBottomNav() {
  const location = useLocation()
  const currentPath = location.pathname
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === "admin"

  const [manajemenOpen, setManajemenOpen] = React.useState(false)
  const [brands, setBrands] = React.useState<{ name: string; identifier: string }[]>([])

  const fetchBrands = React.useCallback(async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/brands`, { method: "GET", headers: getHeaders() })
      if (res.ok) {
        const rawBrands = await res.json()
        const data = rawBrands.data || rawBrands
        const brandDefinitions = (Array.isArray(data) ? data : []).map((brand: any) => ({
          name: brand.name || brand.nama || "",
          identifier: brand.identifier || brand.kode || "",
        }))
        setBrands(brandDefinitions)
        return brandDefinitions
      }
    } catch (err) {
      console.error("Gagal memuat daftar merek:", err)
    }
    return []
  }, [])

  React.useEffect(() => {
    fetchBrands()
  }, [fetchBrands])



  // Close drawers on navigate
  React.useEffect(() => {
    setManajemenOpen(false)
  }, [currentPath])

  const handleLogout = () => {
    logout()
    setManajemenOpen(false)
    navigate("/login", { replace: true })
  }

  // Active check helper
  const isTabActive = (tab: "dashboard" | "riwayat" | "inventory" | "manajemen") => {
    if (tab === "dashboard") return currentPath === "/"
    if (tab === "inventory") return currentPath === "/data-barang"
    if (tab === "riwayat") return currentPath === "/riwayat"
    if (tab === "manajemen") {
      return ["/lokasi-barang", "/kategori-barang", "/merek-barang", "/mitra", "/pengaturan"].includes(currentPath)
    }
    return false
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom,0px)] border-t bg-background/80 backdrop-blur-lg md:hidden">
      <div className="grid h-16 items-center justify-around px-2 min-w-0" style={{ gridTemplateColumns: isAdmin ? "repeat(5, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }}>
        
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

        {/* Riwayat */}
        <Link
          to="/riwayat"
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-full text-muted-foreground transition-all active:scale-95",
            isTabActive("riwayat") && "text-primary font-medium"
          )}
        >
          <History className="size-5" />
          <span className="text-[10px] tracking-wide">Riwayat</span>
        </Link>

        {/* Scan Barcode (Floating in the center) */}
        <div className="flex justify-center items-center h-full relative">
          <CameraScanner 
            showModeTabs={true}
            defaultMode="masuk"
            onScan={async (code, mode) => {
              let currentBrands = brands
              if (currentBrands.length === 0) {
                currentBrands = await fetchBrands()
              }

              // Validasi kode harus sesuai dengan salah satu identifier merek
              const normalizedCode = code.trim().toUpperCase()
              const hasMatchingBrand = currentBrands.some((b) => {
                const ident = b.identifier?.trim().toUpperCase()
                return ident && normalizedCode.includes(ident)
              })

              if (!hasMatchingBrand) {
                return { 
                  success: false, 
                  message: "Barcode tidak sesuai dengan identifier merek apa pun." 
                }
              }

              if (mode === "masuk") {
                navigate(`/barang-masuk?code=${encodeURIComponent(code)}`)
              } else if (mode === "keluar") {
                navigate(`/barang-keluar?code=${encodeURIComponent(code)}`)
              }
              return { success: true }
            }}
          >
            <button
              type="button"
              className="flex flex-col items-center justify-center -mt-8 bg-primary hover:bg-primary/95 text-primary-foreground size-14 rounded-full shadow-lg border-4 border-background active:scale-90 transition-all cursor-pointer z-20"
            >
              <ScanBarcode className="size-6 text-primary-foreground" />
            </button>
          </CameraScanner>
        </div>

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
        {isAdmin ? (
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
              <div className="flex flex-col gap-1.5 p-4 pt-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto max-h-[60vh]">
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
        ) : (
          <div className="hidden" />
        )}

      </div>

    </div>
  )
}
