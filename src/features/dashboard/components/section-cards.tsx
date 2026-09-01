import {
	Archive,
	ArchiveX,
	ArrowsUpFromLine,
	Boxes,
	CheckCircle2,
	HelpCircle,
	TrendingUp,
	TrendingDown,
} from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { useAuth } from "@/lib/auth";
import type { InventoryStats } from "@/types/dashboard";

const createTrendSeries = (direction: "up" | "down") => {
	// Dummy data untuk chart, agar grafik tetap terlihat bagus meskipun value = 0
	const points =
		direction === "up"
			? [20, 35, 30, 50, 70, 65, 85, 100]
			: [100, 85, 90, 70, 50, 55, 30, 20];

	return points.map((point, index) => ({
		index,
		value: point,
	}));
};

export function SectionCards({
	stats,
	totalLabel = "Total Barang",
	isMitra: isMitraProp,
}: {
	stats: InventoryStats;
	totalLabel?: string;
	isMitra?: boolean;
}) {
	const { user } = useAuth();
	const isMitra = isMitraProp !== undefined ? isMitraProp : user?.role?.toLowerCase() === "mitra";
	const { totalItems, tersedia, diluar, rusak, hilang } = stats;

	const cards = [
		{
			key: "total",
			label: totalLabel,
			value: totalItems,
			icon: Boxes,
			direction: "up" as const,
			percent: 12.5,
			className: "col-span-2 lg:col-span-1",
		},
		{
			key: "tersedia",
			label: "Tersedia",
			value: tersedia,
			icon: Archive,
			direction: "up" as const,
			percent: 8.2,
			className: "col-span-1",
		},
		{
			key: "diluar",
			label: isMitra ? "Digunakan" : "Terdistribusi",
			value: diluar,
			icon: isMitra ? CheckCircle2 : ArrowsUpFromLine,
			direction: "down" as const,
			percent: 4.1,
			className: "col-span-1",
		},
		{
			key: "rusak",
			label: "Rusak",
			value: rusak,
			icon: ArchiveX,
			direction: "down" as const,
			percent: 1.2,
			className: "col-span-1",
		},
		{
			key: "hilang",
			label: "Hilang",
			value: hilang,
			icon: HelpCircle,
			direction: "down" as const,
			percent: 0.5,
			className: "col-span-1",
		},
	];

	return (
		<div className="grid grid-cols-2 gap-3 px-4 lg:px-6 lg:grid-cols-5">
			{cards.map(
				({ key, label, value, icon: Icon, direction, percent, className }) => {
					const color = direction === "up" ? "oklch(0.696 0.17 162.48)" : "oklch(0.645 0.246 16.439)";
					const chartConfig = {
						value: {
							label: "Trend",
							color,
						},
					} satisfies ChartConfig;

          // Define dynamic colors based on card key
          let gradientClass = "bg-gradient-to-br from-background to-muted/20 border-border/40 hover:border-primary/30";
          let iconBgClass = "bg-primary/10 text-primary";
          
          if (key === "total") {
            gradientClass = "bg-gradient-to-br from-blue-50/80 to-background border-blue-100/50 hover:border-blue-200 dark:from-blue-950/20 dark:border-blue-900/30";
            iconBgClass = "bg-blue-500/15 text-blue-600 dark:text-blue-400";
          } else if (key === "tersedia") {
            gradientClass = "bg-gradient-to-br from-emerald-50/80 to-background border-emerald-100/50 hover:border-emerald-200 dark:from-emerald-950/20 dark:border-emerald-900/30";
            iconBgClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
          } else if (key === "diluar") {
            if (isMitra) {
              gradientClass = "bg-gradient-to-br from-indigo-50/80 to-background border-indigo-100/50 hover:border-indigo-200 dark:from-indigo-950/20 dark:border-indigo-900/30";
              iconBgClass = "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400";
            } else {
              gradientClass = "bg-gradient-to-br from-blue-50/80 to-background border-blue-100/50 hover:border-blue-200 dark:from-blue-950/20 dark:border-blue-900/30";
              iconBgClass = "bg-blue-500/15 text-blue-600 dark:text-blue-400";
            }
          } else if (key === "rusak") {
            gradientClass = "bg-gradient-to-br from-rose-50/80 to-background border-rose-100/50 hover:border-rose-200 dark:from-rose-950/20 dark:border-rose-900/30";
            iconBgClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400";
          } else if (key === "hilang") {
            gradientClass = "bg-gradient-to-br from-slate-50/80 to-background border-slate-100/50 hover:border-slate-200 dark:from-slate-900/20 dark:border-slate-800/30";
            iconBgClass = "bg-slate-500/15 text-slate-600 dark:text-slate-400";
          }

					return (
						<Card
							key={key}
							className={cn("@container/card relative overflow-hidden flex flex-col justify-between gap-0 shadow-sm transition-all duration-300", gradientClass, className)}>
							<CardHeader className="flex flex-col w-full justify-between space-y-0 pb-1">
								<div className="flex w-full items-center justify-between gap-2 mb-2">
									<CardDescription className="font-semibold text-xs text-muted-foreground/90 uppercase tracking-wider">{label}</CardDescription>
									<div className={cn("rounded-xl p-2", iconBgClass)}>
										<Icon className="w-4 h-4" strokeWidth={2.5} />
									</div>
								</div>
								<CardTitle className="flex items-end gap-2 text-2xl font-black tracking-tight tabular-nums @[250px]/card:text-3xl text-foreground">
									<div>
										{value}{" "}
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-1 pb-0">
								<div
									className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide rounded-full px-2 py-0.5 w-fit ${direction === "up"
										? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
										: "text-rose-700 bg-rose-500/10 dark:text-rose-400"
										}`}>
									{direction === "up" ? (
										<TrendingUp className="h-3 w-3" strokeWidth={3} />
									) : (
										<TrendingDown className="h-3 w-3" strokeWidth={3} />
									)}
									<span>{direction === "up" ? "+" : "-"}{percent}%</span>
								</div>
								<ChartContainer config={chartConfig} className="mt-2 h-[50px] w-full opacity-60 mix-blend-multiply dark:mix-blend-screen">
									<AreaChart
										accessibilityLayer
										data={createTrendSeries(direction)}
										margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
										<defs>
											<linearGradient id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
												<stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.0} />
											</linearGradient>
										</defs>
										<XAxis dataKey="index" hide />
										<ChartTooltip
											cursor={false}
											content={<ChartTooltipContent indicator="line" hideLabel />}
										/>
										<Area
											dataKey="value"
											type="monotone"
											fill={`url(#fill-${key})`}
											stroke="var(--color-value)"
											strokeWidth={2}
											dot={false}
											activeDot={false}
											isAnimationActive={false}
										/>
									</AreaChart>
								</ChartContainer>
							</CardContent>
						</Card>
					);
				},
			)}
		</div>
	);
}
