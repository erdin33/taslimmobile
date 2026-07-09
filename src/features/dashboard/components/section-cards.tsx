import {
	Archive,
	ArchiveX,
	ArrowsUpFromLine,
	Boxes,
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
}: {
	stats: InventoryStats;
	totalLabel?: string;
}) {
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
			label: "Diluar",
			value: diluar,
			icon: ArrowsUpFromLine,
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
		<div className="grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 lg:grid-cols-5 dark:*:data-[slot=card]:bg-card">
			{cards.map(
				({ key, label, value, icon: Icon, direction, percent, className }) => {
					const color = direction === "up" ? "oklch(0.696 0.17 162.48)" : "oklch(0.645 0.246 16.439)";
					const chartConfig = {
						value: {
							label: "Trend",
							color,
						},
					} satisfies ChartConfig;

					return (
						<Card
							key={key}
							className={cn("@container/card relative overflow-hidden flex flex-col justify-between gap-0 border-border", className)}>
							<CardHeader className="flex flex-col w-full justify-between space-y-0">
								<div className="flex w-full items-center justify-between gap-2">
									<CardDescription className="font-medium text-muted-foreground">{label}</CardDescription>
									<div className="rounded-lg p-2 bg-muted/50">
										<Icon className="text-muted-foreground w-4 h-4" />
									</div>
								</div>
								<CardTitle className="flex items-end gap-2 text-2xl font-bold tabular-nums @[250px]/card:text-3xl pt-2">
									<div>
										{value}{" "}
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0 pb-0">
								<div
									className={`inline-flex items-center gap-1 text-xs font-medium ${direction === "up"
										? "text-emerald-600 dark:text-emerald-500"
										: "text-rose-600 dark:text-rose-500"
										}`}>
									{direction === "up" ? (
										<TrendingUp className="h-3.5 w-3.5" />
									) : (
										<TrendingDown className="h-3.5 w-3.5" />
									)}
									<span>{direction === "up" ? "+" : "-"}{percent}% <span className="text-muted-foreground font-normal ml-0.5">dari bulan lalu</span></span>
								</div>
								<ChartContainer config={chartConfig} className="mt-2 h-[60px] w-full">
									<AreaChart
										accessibilityLayer
										data={createTrendSeries(direction)}
										margin={{
											left: 0,
											right: 0,
											top: 5,
											bottom: 0,
										}}>
										<defs>
											<linearGradient id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
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
											type="natural"
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
