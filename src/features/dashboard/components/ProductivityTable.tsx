import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

import type { MitraPerformanceMetrics } from "@/types/dashboard"

interface ProductivityTableProps {
  metrics: MitraPerformanceMetrics[]
  isLoading: boolean
  className?: string
}

const getBadgeColor = (status: MitraPerformanceMetrics["status"]) => {
  switch (status) {
    case "Fast":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    case "Steady":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
    case "Slow":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    case "Idle":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const STATUS_FILTER_OPTIONS: Array<"Semua" | "Fast" | "Steady" | "Slow" | "Idle"> = [
  "Semua",
  "Fast",
  "Steady",
  "Slow",
  "Idle",
]

export function ProductivityTable({ metrics, isLoading, className }: ProductivityTableProps) {
  const [selectedStatus, setSelectedStatus] = useState<"Semua" | "Fast" | "Steady" | "Slow" | "Idle">("Semua")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter based on status & search
  const filteredMetrics = metrics.filter((m) => {
    const matchStatus = selectedStatus === "Semua" || m.status.toLowerCase() === selectedStatus.toLowerCase()
    const matchSearch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    return matchStatus && matchSearch
  })

  // Sort primarily by status priority, then by lifespan
  const sortedMetrics = [...filteredMetrics].sort((a, b) => {
    if (a.isIdleStock && !b.isIdleStock) return -1
    if (!a.isIdleStock && b.isIdleStock) return 1

    if (a.averageLifespanDays !== null && b.averageLifespanDays === null) return -1
    if (a.averageLifespanDays === null && b.averageLifespanDays !== null) return 1

    if (a.averageLifespanDays !== null && b.averageLifespanDays !== null) {
      return a.averageLifespanDays - b.averageLifespanDays
    }

    return b.requestCount - a.requestCount
  })

  if (isLoading) {
    return (
      <Card className={`bg-card border-border/70 ${className}`}>
        <CardHeader>
          <CardTitle className="text-base font-bold">Analisis Produktivitas Mitra</CardTitle>
          <CardDescription className="text-xs">Memuat data performa mitra...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
            Memuat data performa mitra...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-card border-border/70 shadow-xs flex flex-col ${className}`}>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Analisis Produktivitas Mitra</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Rincian kecepatan perputaran (depletion rate) per mitra
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTER_OPTIONS.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 ${
                  selectedStatus === st
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama mitra..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        {/* Table View for larger screens & Desktop */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-border/50 text-xs">
                  <TableHead className="text-foreground font-bold">Nama Mitra</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Total BAST</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Total Item</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Avg. Lifespan</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Days Idle</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24 text-xs">
                      Tidak ada data mitra yang sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMetrics.map((mitra) => (
                    <TableRow key={mitra.id} className="border-border/40 hover:bg-muted/30 text-xs">
                      <TableCell className="font-semibold text-foreground">{mitra.name}</TableCell>
                      <TableCell className="text-center font-medium">{mitra.requestCount}</TableCell>
                      <TableCell className="text-center font-medium">{mitra.totalItems}</TableCell>
                      <TableCell className="text-center">
                        {mitra.averageLifespanDays !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-foreground">
                              {mitra.averageLifespanDays} Hari
                            </span>
                            <div className="w-12 h-0.5 bg-emerald-500 rounded-full mt-0.5" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground font-medium">
                        {mitra.daysSinceLastRequest !== null && mitra.daysSinceLastRequest !== undefined
                          ? `${mitra.daysSinceLastRequest} Hari`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(
                            mitra.status
                          )}`}
                        >
                          {mitra.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
