import { Boxes, ArrowsUpFromLine, Archive, ArchiveX, HelpCircle } from "lucide-react"

import {
    Card,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { InventoryStats } from "@/types/dashboard"

export function SectionCards({
    stats,
    totalLabel = "Total Barang",
}: {
    stats: InventoryStats
    totalLabel?: string
}) {
    const { totalItems, tersedia, diluar, rusak, hilang } = stats

    const cardItems = [
        { label: totalLabel, value: totalItems, icon: Boxes, className: "col-span-2 @xl/main:col-span-1" },
        { label: "Tersedia", value: tersedia, icon: Archive, className: "col-span-1" },
        { label: "Diluar", value: diluar, icon: ArrowsUpFromLine, className: "col-span-1" },
        { label: "Rusak", value: rusak, icon: ArchiveX, className: "col-span-1" },
        { label: "Hilang", value: hilang, icon: HelpCircle, className: "col-span-1" },
    ]

    return (
        <div className="grid grid-cols-2 gap-3 px-4 lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
            {cardItems.map((item, idx) => {
                const Icon = item.icon
                return (
                    <Card key={idx} className={cn("@container/card relative overflow-hidden", item.className)}>
                        <div className="flex flex-row items-center p-3 sm:p-4 gap-2.5 sm:gap-3.5">
                            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                                <Icon className="text-primary size-5 sm:size-6" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs sm:text-sm text-muted-foreground truncate font-medium">
                                    {item.label}
                                </span>
                                <span className="text-lg sm:text-2xl font-bold tabular-nums @[200px]/card:text-xl @[250px]/card:text-3xl truncate leading-tight mt-0.5">
                                    {item.value} <span className="text-xs font-normal text-muted-foreground">Unit</span>
                                </span>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
