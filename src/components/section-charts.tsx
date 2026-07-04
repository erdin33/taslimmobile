"use client"

import * as React from "react"
import { PackagePlus, PackageMinus, Lightbulb } from "lucide-react"
import { Link } from "react-router-dom"

import {
    Label,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    type ChartConfig,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { InventoryStats, SafetyStockAlert } from "@/types/dashboard"
import { ChartBarMixed } from "./bar-chart"

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

const chartConfig = {
    visitors: {
        label: "Terisi",
    },
    safari: {
        label: "Terisi",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig

export function SectionCharts({
    isMitra = false,
    displayName,
    stats,
    safetyStockAlerts,
}: {
    isMitra?: boolean
    displayName?: string
    stats: InventoryStats
    safetyStockAlerts: SafetyStockAlert[]
}) {
    // Storage capacity from DB
    const [totalCapacity, setTotalCapacity] = React.useState(0)
    const [usedCapacity, setUsedCapacity] = React.useState(0)
    const displayedTotal = isMitra ? stats.totalItems : totalCapacity
    const displayedUsed = isMitra ? stats.tersedia : usedCapacity
    const displayedRemaining = isMitra ? stats.diluar : totalCapacity - usedCapacity
    const capacityPercent = displayedTotal > 0
        ? Math.round((displayedUsed / displayedTotal) * 100)
        : 0

    const chartData = React.useMemo(() => [
        { browser: "safari", visitors: capacityPercent, fill: "var(--color-safari)" },
    ], [capacityPercent])

    React.useEffect(() => {
        const fetchCapacity = async () => {
            if (isMitra) return

            try {
                const res = await fetch(`${getBaseUrl()}/locations`, {
                    method: "GET",
                    headers: getHeaders(),
                })
                if (!res.ok) throw new Error("Gagal mengambil data lokasi")
                const locations = await res.json()

                let total = 0
                let used = 0
                for (const loc of locations) {
                    if (loc.name === "Keluar" || loc.name === "Diluar") {
                        continue
                    }
                    if (
                        (loc.owner || "KP Tasikmalaya").trim().toLowerCase() !== "kp tasikmalaya"
                    ) {
                        continue
                    }

                    if (loc.type === "Rak" && loc.levels) {
                        for (const lvl of loc.levels) {
                            total += lvl.capacity || 0
                            used += lvl.usedCapacity || 0
                        }
                    } else {
                        total += loc.capacity || 0
                        used += loc.usedCapacity || 0
                    }
                }
                setTotalCapacity(total)
                setUsedCapacity(used)
            } catch (error) {
                console.error("Gagal mengambil data kapasitas:", error)
            }
        }
        fetchCapacity()
    }, [isMitra])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 lg:px-6">
            {/* Card 1: ChartBarMixed (takes 2 columns on desktop) */}
            <ChartBarMixed className="md:col-span-2 h-full pb-0" />

            {/* Card 2: Kapasitas Penyimpanan (RadialBarChart) */}
            <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                    <CardTitle>
                        {isMitra ? "Komposisi Barang Mitra" : "Kapasitas Penyimpanan"}
                    </CardTitle>
                    <CardDescription>
                        {isMitra ? displayName : "Kapasitas gudang aktif"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square w-full max-w-[250px]"
                        initialDimension={{ width: 250, height: 250 }}
                    >
                        <RadialBarChart
                            data={chartData}
                            startAngle={90}
                            endAngle={-270}
                            outerRadius={90}
                            innerRadius={80}
                        >
                            <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[90, 80]}
                            />
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar dataKey="visitors" background cornerRadius={10} isAnimationActive={false} />
                            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-4xl font-bold"
                                                    >
                                                        {capacityPercent}%
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy || 0) + 24}
                                                        className="fill-muted-foreground"
                                                    >
                                                        {isMitra ? "Tersedia" : "Terisi"}
                                                    </tspan>
                                                </text>
                                            )
                                        }
                                    }}
                                />
                            </PolarRadiusAxis>
                        </RadialBarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm bg-card mt-auto">
                    <div className="grid grid-cols-3 gap-2 w-full">
                        <div className="flex flex-col text-center">
                            <p className="text-muted-foreground font-normal text-xs">
                                {isMitra ? "Total" : "Kapasitas"}
                            </p>
                            <p className="font-bold text-md">{displayedTotal}</p>
                        </div>
                        <div className="flex flex-col text-center">
                            <p className="text-muted-foreground font-normal text-xs">
                                {isMitra ? "Tersedia" : "Digunakan"}
                            </p>
                            <p className="font-bold text-md">{displayedUsed}</p>
                        </div>
                        <div className="flex flex-col text-center">
                            <p className="text-muted-foreground font-normal text-xs">
                                {isMitra ? "Diluar" : "Tersisa"}
                            </p>
                            <p className="font-bold text-md">{displayedRemaining}</p>
                        </div>
                    </div>
                </CardFooter>
            </Card>

            {/* Card 3: Aktivitas Cepat (takes full width on desktop underneath) */}
            <Card className="flex flex-col md:col-span-2 lg:col-span-3">
                <CardHeader className="pb-2">
                    <CardTitle>Aktivitas Cepat</CardTitle>
                    <CardDescription>Pintasan ke fitur utama</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button asChild size="lg" variant="secondary" className="w-full gap-2 text-md h-12 cursor-pointer">
                        <Link to="/barang-masuk">
                            <PackagePlus className="size-5" />
                            Catat Barang Masuk
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary" className="w-full gap-2 text-md h-12 border cursor-pointer">
                        <Link to="/barang-keluar">
                            <PackageMinus className="size-5" />
                            Catat Barang Keluar
                        </Link>
                    </Button>
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm bg-muted/20 mt-auto pt-4 rounded-b-xl border-t">
                    <div className="flex items-start gap-2 text-muted-foreground w-full">
                        <Lightbulb className="size-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="leading-relaxed text-xs">
                            <strong className="font-semibold text-foreground">Tips:</strong> Pastikan Anda mencatat setiap mutasi barang secara <i>real-time</i> agar stok selalu akurat.
                        </span>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
