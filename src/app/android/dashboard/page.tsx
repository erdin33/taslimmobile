import { SectionCards } from "@/features/dashboard/components/section-cards"
import { ChartBarMixed } from "@/features/dashboard/components/bar-chart"
import { ChartInboundOutbound } from "@/features/dashboard/components/chart-inbound-outbound"
import { RequestSection } from "@/features/dashboard/components/RequestSection"
import { ActivityFeedCard } from "@/features/dashboard/components/ActivityFeedCard"
import { useDashboard } from "./use-dashboard"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
    const {
        user,
        transactions,
        inventoryStats,
        mitraDistribution,
        transactionSeries,
        timeRange,
        setTimeRange,
        requestCounts,
        recentRequests,
        recentTransactions,
        isLoadingRequests,
        isLoadingActivity,
    } = useDashboard();

    return (
        <div className="@container/main flex flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8">
            <SectionCards
                stats={inventoryStats}
                totalLabel={
                    user?.role === "mitra"
                        ? "Total"
                        : "Total Aset"
                }
            />

            {/* Row 2: Charts (50/50) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartBarMixed 
                    data={mitraDistribution} 
                    className="h-full" 
                />
                <ChartInboundOutbound
                    data={transactionSeries}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    className="h-full"
                />
            </div>

            {/* Mobile View: Cards List */}
            <div className="flex flex-col gap-3 md:hidden">
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

            {/* Request Section (2/3) + Recent Activities (1/3) */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 pb-4">
                <RequestSection
                    requests={recentRequests}
                    counts={requestCounts}
                    isLoading={isLoadingRequests}
                    className="lg:col-span-2"
                />
                <ActivityFeedCard
                    activities={recentTransactions}
                    isLoading={isLoadingActivity}
                    className="lg:col-span-1"
                />
            </div>
        </div>
    )
}
