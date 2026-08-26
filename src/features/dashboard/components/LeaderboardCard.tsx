import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, Trophy, Info } from "lucide-react"
import type { MitraPerformanceMetrics } from "@/types/dashboard"

interface LeaderboardCardProps {
  metrics: MitraPerformanceMetrics[]
  isLoading: boolean
  className?: string
}

export function LeaderboardCard({ metrics, isLoading, className }: LeaderboardCardProps) {
  // Sort by averageLifespanDays ascending, keeping only those with valid data
  const topPerformers = metrics
    .filter((m) => m.averageLifespanDays !== null && m.averageLifespanDays > 0)
    .sort((a, b) => (a.averageLifespanDays as number) - (b.averageLifespanDays as number))
    .slice(0, 5)

  if (isLoading) {
    return (
      <Card className={`flex h-full w-full flex-col ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Top Velocity Mitra</CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px] gap-1 font-semibold">
              <Zap className="size-3" /> Tercepat
            </Badge>
          </div>
          <CardDescription className="text-xs">Loading data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={`flex h-full w-full flex-col bg-card border-border/70 shadow-xs ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Top Velocity Mitra</CardTitle>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[11px] gap-1 font-semibold px-2 py-0.5 rounded-full">
            <Zap className="size-3" /> Tercepat
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Mitra dengan perputaran BAST tercepat
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-1">
        {topPerformers.length === 0 ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center text-xs text-muted-foreground p-4">
            <Clock className="mb-2 h-7 w-7 opacity-30" />
            <p>Belum ada data metrik perputaran BAST yang memadai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((mitra, index) => (
              <div
                key={mitra.id}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-2 transition-all hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                      index === 0
                        ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                        : index === 1
                        ? "bg-slate-400/15 text-slate-400 border border-slate-400/30"
                        : index === 2
                        ? "bg-amber-700/15 text-amber-700 dark:text-amber-600 border border-amber-700/30"
                        : "bg-muted text-muted-foreground font-bold text-xs"
                    }`}>
                      {index === 0 ? <Trophy className="size-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate leading-tight">{mitra.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {mitra.requestCount} Request • {mitra.totalItems} Items
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 font-bold text-xs px-2.5 py-0.5 rounded-full">
                      {mitra.averageLifespanDays} Hari
                    </Badge>
                    <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                      Rata-rata habis <Info className="size-2.5 opacity-60" />
                    </span>
                  </div>
                </div>

                {/* Velocity Progress Bar */}
                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(15, Math.min(100, 100 - ((mitra.averageLifespanDays || 1) - 1) * 15))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
