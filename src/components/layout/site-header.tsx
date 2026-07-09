import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useLocation, useNavigate } from "react-router-dom"
import { Notifications } from "@/features/dashboard/components/notifications"
import { useAuth } from "@/lib/auth"
import { LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function SiteHeader() {
    const location = useLocation()
    const path = location.pathname

    // Determine breadcrumbs based on route
    let parent = "Menu Utama"
    let pageName = "Dashboard"

    if (path === "/barang-masuk") {
        parent = "Operasional"
        pageName = "Barang Masuk"
    } else if (path === "/barang-keluar") {
        parent = "Operasional"
        pageName = "Barang Keluar"
    } else if (path === "/riwayat") {
        parent = "Operasional"
        pageName = "Riwayat"
    } else if (path === "/data-barang") {
        parent = "Inventori"
        pageName = "Data Barang"
    } else if (path === "/data-transaksi") {
        parent = "Inventori"
        pageName = "Data Transaksi"
    } else if (path === "/lokasi-barang") {
        parent = "Manajemen Data"
        pageName = "Lokasi Barang"
    } else if (path === "/kategori-barang") {
        parent = "Manajemen Data"
        pageName = "Kategori Barang"
    } else if (path === "/merek-barang") {
        parent = "Manajemen Data"
        pageName = "Merek Barang"
    } else if (path === "/mitra") {
        parent = "Manajemen Data"
        pageName = "Mitra"
    }

    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate("/login", { replace: true })
    }

    const initials = user?.displayName
        ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.username
            ? user.username.slice(0, 2).toUpperCase()
            : "U"

    return (
        <header className="flex h-[calc(var(--header-height)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(var(--header-height)+env(safe-area-inset-top,0px))] bg-background">
            <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
                
                {/* LEFT SIDE: Mobile (Page Name) / Desktop (Trigger + Breadcrumbs) */}
                <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
                    {/* Mobile Page Name */}
                    <span className="md:hidden font-bold text-[18px] text-foreground truncate select-none pl-1.5">
                        {pageName}
                    </span>

                    {/* Desktop Trigger & Breadcrumbs */}
                    <div className="hidden md:flex items-center gap-1 min-w-0">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mx-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb className="flex-1 min-w-0">
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="#">
                                        {parent}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="truncate block">{pageName}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </div>

                {/* RIGHT SIDE: Mobile (Notifications + Profile) / Desktop (Notifications Only) */}
                <div className="flex items-center gap-2">
                    <Notifications />
                    
                    {/* Profile menu on mobile */}
                    <div className="flex items-center gap-2 md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full border cursor-pointer">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-semibold leading-none">{user?.displayName || user?.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground capitalize">{user?.role}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate("/pengaturan")} className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Pengaturan</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Keluar (Logout)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

            </div>
        </header>
    )
}
