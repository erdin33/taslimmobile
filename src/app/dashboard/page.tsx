import { useCallback, useEffect, useRef, useState } from "react"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SectionCharts } from "@/components/section-charts"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { Transaction, DashboardTransaction } from "@/types/transaction"
import type { InventoryItem, Category } from "@/types/inventory"
import type { InventoryStats, SafetyStockAlert } from "@/types/dashboard"

/**
 * Helper: Mengembalikan Base URL untuk pemanggilan API.
 * 
 * @returns {string} String URL API Backend.
 */
const getBaseUrl = () => {
    const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/";
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

/**
 * Helper: Menyusun header HTTP secara otomatis beserta Authorization token.
 * 
 * @returns {Record<string, string>} Object header HTTP.
 */
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

const DASHBOARD_TRANSACTION_LIMIT = 6
const DASHBOARD_REFRESH_INTERVAL = 5000

/**
 * Komponen DashboardPage
 * 
 * Halaman utama (dashboard) yang menampilkan metrik inventaris, status rak, dan riwayat transaksi terbaru.
 * Terdapat pembatasan hak akses berbasis `role` pengguna (Admin/Mitra).
 *
 * @returns {JSX.Element} Antarmuka halaman Dashboard.
 */
export default function DashboardPage() {
    const { user } = useAuth()
    const [transactions, setTransactions] = useState<DashboardTransaction[]>([])
    const [chartTransactions, setChartTransactions] = useState<Transaction[]>([])
    const [mitraOptions, setMitraOptions] = useState<string[]>([])
    const [selectedMitra, setSelectedMitra] = useState("all")
    const [safetyStockAlerts, setSafetyStockAlerts] = useState<SafetyStockAlert[]>([])
    const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
        totalItems: 0,
        tersedia: 0,
        diluar: 0,
        rusak: 0,
        hilang: 0,
    })
    const isFetchingRef = useRef(false)

    const normalizeOwner = (owner?: string | null) => (owner || "").trim().toLowerCase()

    /**
     * Memanggil API untuk menarik data transaksi, item, dan kategori.
     * Logika ini dipadatkan dengan Promise.all agar eksekusi jaringan berjalan paralel.
     * Menggunakan useCallback untuk mencegah re-rendering atau re-creation fungsi tanpa alasan.
     */
    const fetchDashboardData = useCallback(async () => {
        // Cegah pengambilan data bersamaan (race conditions) jika sedang mengambil data
        if (isFetchingRef.current) return

        isFetchingRef.current = true
        try {
            const [resTrx, resItems, resCat] = await Promise.all([
                fetch(`${getBaseUrl()}/transactions`, { method: "GET", headers: getHeaders() }),
                fetch(`${getBaseUrl()}/items`, { method: "GET", headers: getHeaders() }),
                fetch(`${getBaseUrl()}/categories`, { method: "GET", headers: getHeaders() }),
            ])
            const rawTrx = await resTrx.json()
            const rawItems = await resItems.json()
            const rawCat = await resCat.json()
            const transactionData: Transaction[] = Array.isArray(rawTrx.data || rawTrx) ? (rawTrx.data || rawTrx) : []
            const itemData: InventoryItem[] = Array.isArray(rawItems.data || rawItems) ? (rawItems.data || rawItems) : []
            const categoriesList = Array.isArray(rawCat.data || rawCat) ? (rawCat.data || rawCat) : []
            const categoryData: Category[] = categoriesList.map((c: any) => ({
                ...c,
                name: c.nama || c.name || "",
                safetyStock: c.safetyStock !== undefined ? c.safetyStock : (c.safety_stock || 5),
            }))

            // Filtering Akses: Jika user = 'mitra', ia hanya boleh melihat data transaksinya sendiri
            const visibleTransactions = transactionData.filter(
                (transaction) =>
                    user?.role !== "mitra" ||
                    transaction.mitra?.trim().toLowerCase() ===
                    user.displayName.trim().toLowerCase()
            )
            const visibleItems = itemData.filter(
                (item) =>
                    user?.role !== "mitra" ||
                    item.mitra?.trim().toLowerCase() ===
                    user.displayName.trim().toLowerCase()
            )
            const flattened = visibleTransactions
                .slice(0, DASHBOARD_TRANSACTION_LIMIT)
                .map((transaction) => ({
                    id: transaction.id,
                    tanggal: transaction.tanggal,
                    nomor: transaction.nomor,
                    kategori: transaction.kategori,
                    status: transaction.status,
                    sn: transaction.sn,
                    merek: transaction.merek,
                    asal: transaction.asal || "-",
                    tujuan: transaction.tujuan || "-",
                    mitra: transaction.mitra || "-",
                    keterangan: transaction.keterangan || "-",
                }))
            setTransactions(flattened)
            setMitraOptions([
                "all",
                ...Array.from(
                    new Set(
                        visibleTransactions
                            .map((trx) => trx.mitra || "-")
                            .filter(Boolean)
                    )
                ).sort((a, b) => a.localeCompare(b)),
            ])
            setChartTransactions(visibleTransactions)
            setInventoryStats({
                totalItems: visibleItems.length,
                tersedia: visibleItems.filter(
                    (item) => item.status.trim().toLowerCase() === "tersedia"
                ).length,
                diluar: visibleItems.filter(
                    (item) => item.status.trim().toLowerCase() === "diluar"
                ).length,
                rusak: visibleItems.filter(
                    (item) => item.status.trim().toLowerCase() === "rusak"
                ).length,
                hilang: visibleItems.filter(
                    (item) => item.status.trim().toLowerCase() === "hilang"
                ).length,
            })

            // Algoritma Perhitungan Safety Stock (Kategori yang menipis)
            const availableByCategory = new Map<string, number>()
            const ownedCategories = new Set<string>()
            visibleItems.forEach((item) => {
                const categoryKey = item.kategori.trim().toLowerCase()
                ownedCategories.add(categoryKey)

                // Hanya hitung item yang berstatus 'tersedia' untuk pengecekan safety stock
                if (item.status.trim().toLowerCase() === "tersedia") {
                    availableByCategory.set(
                        categoryKey,
                        (availableByCategory.get(categoryKey) || 0) + 1
                    )
                }
            })

            const relevantCategories = categoryData.filter(
                (category) =>
                    user?.role === "admin" ||
                    ownedCategories.has(category.name.trim().toLowerCase())
            )
            setSafetyStockAlerts(
                relevantCategories.flatMap<SafetyStockAlert>((category) => {
                    const available =
                        availableByCategory.get(category.name.trim().toLowerCase()) || 0
                    const safetyStock = Math.max(
                        0,
                        Number(category.safetyStock ?? 5)
                    )

                    if (available === 0) {
                        return [{
                            category: category.name,
                            available,
                            safetyStock,
                            status: "Habis" as const,
                        }]
                    }

                    if (available <= safetyStock) {
                        return [{
                            category: category.name,
                            available,
                            safetyStock,
                            status: "Menipis" as const,
                        }]
                    }

                    return []
                })
            )
        } catch (error) {
            console.error("Gagal mengambil data dashboard:", error)
        } finally {
            isFetchingRef.current = false
        }
    }, [user])

    /**
     * Effect hook untuk inisialisasi awal dan auto-refresh.
     * Menggunakan event listener visibilitychange untuk menghindari auto-refresh yang tidak
     * perlu saat user membuka tab browser lain.
     */
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchDashboardData()
            }
        }

        fetchDashboardData()
        const refreshInterval = window.setInterval(
            fetchDashboardData,
            DASHBOARD_REFRESH_INTERVAL
        )

        window.addEventListener("focus", fetchDashboardData)
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            window.clearInterval(refreshInterval)
            window.removeEventListener("focus", fetchDashboardData)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [fetchDashboardData])

    return (
        <div className="@container/main flex flex-col gap-4 py-4 md:gap-6 md:pt-10 md:pb-8">
            <SectionCards
                stats={inventoryStats}
                totalLabel={
                    user?.role === "mitra"
                        ? "Total"
                        : "Total"
                }
            />
            <SectionCharts
                isMitra={user?.role === "mitra"}
                displayName={user?.displayName}
                stats={inventoryStats}
                safetyStockAlerts={safetyStockAlerts}
            />
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive
                    transactions={
                        selectedMitra === "all"
                            ? chartTransactions
                            : chartTransactions.filter((transaction) =>
                                  normalizeOwner(transaction.mitra) === normalizeOwner(selectedMitra)
                              )
                    }
                    showMitraFilter={user?.role === "admin"}
                    mitraOptions={mitraOptions}
                    selectedMitra={selectedMitra}
                    onMitraChange={setSelectedMitra}
                />
            </div>
            {/* Desktop View: Data Table */}
            <div className="hidden md:block px-4 lg:px-6">
                <DataTable
                    data={
                        selectedMitra === "all"
                            ? transactions
                            : transactions.filter((transaction) =>
                                  normalizeOwner(transaction.mitra) === normalizeOwner(selectedMitra)
                              )
                    }
                    showSelection={false}
                    showActions={false}
                    showPagination={false}
                />
            </div>

            {/* Mobile View: Cards List */}
            <div className="flex flex-col gap-3 md:hidden px-4">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <h3 className="font-semibold text-foreground text-sm">Transaksi Terbaru</h3>
                </div>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl bg-card/20">
                        Belum ada transaksi.
                    </div>
                ) : (
                    transactions.map((trx) => {
                        let categoryColor = "bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20"
                        if (trx.kategori === "Masuk") categoryColor = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        if (trx.kategori === "Keluar") categoryColor = "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                        if (trx.kategori === "Rusak") categoryColor = "bg-rose-500/10 text-rose-500 border border-rose-500/20"

                        const formattedDate = (() => {
                            try {
                                const d = new Date(trx.tanggal)
                                if (isNaN(d.getTime())) return trx.tanggal
                                return d.toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                })
                            } catch {
                                return trx.tanggal
                            }
                        })()

                        return (
                            <div key={trx.id} className="flex flex-col gap-2 p-3.5 rounded-xl border bg-card/40 shadow-xs backdrop-blur-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-primary text-xs sm:text-sm font-mono truncate">{trx.nomor}</span>
                                    <span className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0", categoryColor)}>
                                        {trx.kategori}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-1">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider">Tanggal</p>
                                        <p className="font-medium text-foreground mt-0.5">{formattedDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider">Merek / SN</p>
                                        <p className="font-medium text-foreground truncate mt-0.5" title={trx.sn}>
                                            {trx.merek || "-"} {trx.sn && trx.sn !== "-" ? `(${trx.sn})` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="border-t border-border/20 my-1"></div>
                                <div className="flex items-start justify-between gap-4 text-xs mt-0.5">
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider block">Rute</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-foreground font-medium truncate">
                                            <span className="truncate" title={trx.asal}>{trx.asal}</span>
                                            <span className="text-muted-foreground/40 shrink-0 font-normal">→</span>
                                            <span className="truncate" title={trx.tujuan}>{trx.tujuan}</span>
                                        </div>
                                    </div>
                                    {trx.mitra && trx.mitra !== "-" && (
                                        <div className="text-right shrink-0 max-w-[120px]">
                                            <span className="text-[10px] text-muted-foreground/60 uppercase font-semibold tracking-wider block">Mitra</span>
                                            <span className="font-medium text-foreground mt-0.5 block truncate" title={trx.mitra}>{trx.mitra}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
