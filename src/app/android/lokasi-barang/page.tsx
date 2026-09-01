import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Power,
  Layers,
  Archive,
  MoreVertical,
  Search,
  Box,
  Package,
  SlidersHorizontal,
  QrCode,
  X,
  ExternalLink,
  Warehouse,
  Boxes,
  Router,
  Cable,
  Tv,
  Zap,
  ArrowUpRight,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

import { useLokasiBarangLogic } from "@/features/lokasi-barang/hooks/useLokasiBarangLogic";
import { AnimatedNumber } from "@/features/lokasi-barang/components/AnimatedNumber";

export default function LokasiBarangPage() {
  const navigate = useNavigate();
  const {
    locations,
    brands,
    items,
    categoryStats,
    locationCategoryMap,
    sheetMode,
    setSheetMode,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    locName,
    setLocName,
    locCapacity,
    setLocCapacity,
    locBrand,
    setLocBrand,
    locLevelsCount,
    setLocLevelsCount,
    levelName,
    setLevelName,
    deleteAlertData,
    setDeleteAlertData,
    isSaving,
    isDeleting,
    isToggling,
    relocateDialog,
    setRelocateDialog,
    isRelocating,
    availableTargetLocations,
    handleRelocateItems,
    stats,
    filteredAndSortedLocations,
    handleOpenSheet,
    handleSave,
    handleToggleLocation,
    handleToggleLevel,
    requestDeleteLocation,
    requestDeleteLevel,
    confirmDelete,
    handleDownloadQrCode,
  } = useLokasiBarangLogic();

  // Relocation Form States
  const [relocateTarget, setRelocateTarget] = useState("");
  const [relocateCategory, setRelocateCategory] = useState("ALL");
  const [relocateQty, setRelocateQty] = useState("");

  const handleOpenRelocate = (sourceLocation: string, sourceName: string) => {
    setRelocateDialog({ isOpen: true, sourceLocation, sourceName });
    setRelocateTarget("");
    setRelocateCategory("ALL");
    setRelocateQty("");
  };

  // Hitung barang di lokasi asal yang dipilih untuk relokasi
  const sourceItemsInfo = useMemo(() => {
    if (!relocateDialog.sourceLocation) return { total: 0, categories: {}, availableCount: 0 };
    const srcLoc = relocateDialog.sourceLocation.trim().toLowerCase();
    const itemsInLoc = items.filter(
      (i) => (i.lokasiPenyimpanan || "").trim().toLowerCase() === srcLoc
    );
    const catMap: Record<string, number> = {};
    itemsInLoc.forEach((i) => {
      const c = (i.kategori || "Lainnya").toUpperCase();
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const activeCount =
      relocateCategory === "ALL"
        ? itemsInLoc.length
        : catMap[relocateCategory] || 0;
    return { total: itemsInLoc.length, categories: catMap, availableCount: activeCount };
  }, [relocateDialog.sourceLocation, items, relocateCategory]);

  const targetLocInfo = useMemo(() => {
    if (!relocateTarget) return null;
    return availableTargetLocations.find((l) => l.name === relocateTarget);
  }, [relocateTarget, availableTargetLocations]);

  const getCategoryIcon = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes("ONT") || n.includes("MODEM") || n.includes("ROUTER")) return Router;
    if (n.includes("KABEL") || n.includes("DROPCORE") || n.includes("PATCHCORD") || n.includes("FIBER")) return Cable;
    if (n.includes("STB") || n.includes("TV")) return Tv;
    if (n.includes("ADAPTOR") || n.includes("POWER") || n.includes("CHARGER")) return Zap;
    return Boxes;
  };

  const renderCapacityInput = () => (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/40 p-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="loc-capacity" className="text-xs font-semibold text-foreground flex justify-between items-center">
          <span>Kapasitas Maksimal</span>
          <span className="text-[10px] text-muted-foreground font-normal italic">(Dapat diubah)</span>
        </Label>
        <div className="relative">
          <Input
            id="loc-capacity"
            type="number"
            min="0"
            value={locCapacity}
            onChange={(e) => setLocCapacity(e.target.value)}
            placeholder="Masukkan kapasitas total"
            className="bg-background border-border/80 pr-12 text-sm font-bold text-primary focus-visible:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none">
            Unit
          </span>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    if (sheetMode === "add-rak" || sheetMode === "edit-rak") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Nama Rak</Label>
            <Input
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Contoh: Rak A1"
              className="bg-background border-border/80 focus-visible:ring-1"
            />
          </div>
          {sheetMode === "add-rak" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Jumlah Level Awal</Label>
              <Input
                type="number"
                min="1"
                value={locLevelsCount}
                onChange={(e) => setLocLevelsCount(e.target.value)}
                placeholder="Masukkan total level rak"
                className="bg-background border-border/80 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>
      );
    }
    if (sheetMode === "add-kardus" || sheetMode === "edit-kardus") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Nama Kardus</Label>
            <Input
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Contoh: Kardus K-01"
              className="bg-background border-border/80 focus-visible:ring-1"
            />
          </div>
          {renderCapacityInput()}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
            <Select value={locBrand} onValueChange={setLocBrand}>
              <SelectTrigger className="bg-background border-border/80 focus:ring-1">
                <SelectValue placeholder="Pilih Merek" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {brands.map((b) => (
                  <SelectItem key={b} value={b} className="focus:bg-muted text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }
    if (sheetMode === "add-pallet" || sheetMode === "edit-pallet") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Nama Pallet</Label>
            <Input
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Contoh: Pallet P-01"
              className="bg-background border-border/80 focus-visible:ring-1"
            />
          </div>
          {renderCapacityInput()}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
            <Select value={locBrand} onValueChange={setLocBrand}>
              <SelectTrigger className="bg-background border-border/80 focus:ring-1">
                <SelectValue placeholder="Pilih Merek" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {brands.map((b) => (
                  <SelectItem key={b} value={b} className="focus:bg-muted text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }
    if (sheetMode === "add-level" || sheetMode === "edit-level") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Nama Level</Label>
            <Input
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              placeholder="Contoh: Level 1"
              className="bg-background border-border/80 focus-visible:ring-1"
            />
          </div>
          {renderCapacityInput()}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
            <Select value={locBrand} onValueChange={setLocBrand}>
              <SelectTrigger className="bg-background border-border/80 focus:ring-1">
                <SelectValue placeholder="Pilih Merek" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {brands.map((b) => (
                  <SelectItem key={b} value={b} className="focus:bg-muted text-xs">
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }
    return null;
  };

  const sheetTitles: Record<string, string> = {
    "add-rak": "Tambah Rak Baru",
    "edit-rak": "Edit Rak",
    "add-kardus": "Tambah Kardus Baru",
    "edit-kardus": "Edit Kardus",
    "add-pallet": "Tambah Pallet Baru",
    "edit-pallet": "Edit Pallet",
    "add-level": "Tambah Level Rak",
    "edit-level": "Edit Level Rak",
    closed: "",
  };

  const getProgressStyles = (used: number, cap: number, baseColor: string) => {
    if (cap <= 0) return { barClass: "bg-muted", textClass: "text-muted-foreground", label: "0%", pct: 0 };
    const pct = Math.min(100, Math.round((used / cap) * 100));
    let barClass = baseColor;
    let textClass = "text-foreground";
    if (pct >= 100) {
      barClass = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";
      textClass = "text-rose-500 dark:text-rose-400 font-bold";
    } else if (pct > 75) {
      barClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
      textClass = "text-amber-600 dark:text-amber-400 font-semibold";
    }
    return { barClass, textClass, pct, label: `${pct}%` };
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-6 pb-36 space-y-5 sm:space-y-6 text-foreground">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
            <Warehouse className="size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Lokasi Penyimpanan Gudang
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Tata letak fisik dan kapasitas Rak, Kardus, dan Pallet Gudang KP
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. WAREHOUSE CAPACITY OCCUPANCY TRACKER ── */}
      <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  Okupansi Kapasitas Gudang KP
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Total pemakaian ruang penyimpanan aktif (Rak, Kardus, Pallet)
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`text-xs font-bold px-2.5 py-0.5 ${
                  stats.utilizationPct >= 90
                    ? "bg-rose-500/10 text-rose-600 border-rose-300"
                    : stats.utilizationPct > 70
                    ? "bg-amber-500/10 text-amber-600 border-amber-300"
                    : "bg-primary/10 text-primary border-primary/30"
                }`}
              >
                {stats.utilizationPct}% Terpakai
              </Badge>
            </div>

            {/* Segmented stacked bar chart */}
            {(() => {
              const rakUsed = (() => {
                let u = 0,
                  c = 0;
                locations
                  .filter((l) => l.type === "Rak")
                  .forEach((l) =>
                    l.levels?.forEach((lv) => {
                      u += lv.usedCapacity;
                      c += lv.capacity;
                    })
                  );
                return { u, c };
              })();
              const kardusUsed = (() => {
                let u = 0,
                  c = 0;
                locations
                  .filter((l) => l.type === "Kardus")
                  .forEach((l) => {
                    u += l.usedCapacity || 0;
                    c += l.capacity || 0;
                  });
                return { u, c };
              })();
              const palletUsed = (() => {
                let u = 0,
                  c = 0;
                locations
                  .filter((l) => l.type === "Pallet")
                  .forEach((l) => {
                    u += l.usedCapacity || 0;
                    c += l.capacity || 0;
                  });
                return { u, c };
              })();
              const total = stats.maxCapacity || 1;
              const rakPct = Math.round((rakUsed.u / total) * 100);
              const kardusPct = Math.round((kardusUsed.u / total) * 100);
              const palletPct = Math.round((palletUsed.u / total) * 100);
              const freePct = Math.max(0, 100 - rakPct - kardusPct - palletPct);
              const segments = [
                { label: "Rak", pct: rakPct, count: rakUsed.u, color: "bg-blue-500" },
                { label: "Kardus", pct: kardusPct, count: kardusUsed.u, color: "bg-amber-500" },
                { label: "Pallet", pct: palletPct, count: palletUsed.u, color: "bg-emerald-500" },
                { label: "Kosong", pct: freePct, count: Math.max(0, stats.maxCapacity - stats.usedCapacity), color: "bg-muted/80" },
              ];
              return (
                <div className="mt-3 space-y-2.5">
                  {/* Stacked bar */}
                  <div className="w-full h-4 rounded-full overflow-hidden flex bg-muted/60 shadow-inner p-0.5">
                    {segments.map((s) =>
                      s.pct > 0 ? (
                        <div
                          key={s.label}
                          className={`${s.color} h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full`}
                          style={{ width: `${s.pct}%` }}
                          title={`${s.label}: ${s.count} Unit (${s.pct}%)`}
                        />
                      ) : null
                    )}
                  </div>

                  {/* Legend row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                    {segments.map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${s.color} shrink-0`} />
                        <span className="text-[11px] text-muted-foreground">{s.label}</span>
                        <span className="text-[11px] font-bold text-foreground">
                          {s.count} <span className="font-normal text-[10px] text-muted-foreground">({s.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 border-t border-border/50 pt-3.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Terpakai:</span>
              <span className="text-xs font-bold text-foreground">
                <AnimatedNumber value={stats.usedCapacity} /> Unit
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Tersedia:</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <AnimatedNumber value={Math.max(0, stats.maxCapacity - stats.usedCapacity)} /> Unit
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Kapasitas:</span>
              <span className="text-xs font-bold text-foreground">
                <AnimatedNumber value={stats.maxCapacity} /> Unit
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. RINCIAN STOK PER KATEGORI MATERIAL (ONT, KABEL, STB, DLL) ── */}
      {categoryStats.length > 0 && (
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Boxes className="size-3.5" />
              </div>
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
                  Rincian Stok Material
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Total <strong className="text-foreground">{categoryStats.reduce((acc, c) => acc + c.count, 0)}</strong> Unit
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/data-barang")}
                className="text-[11px] text-primary hover:text-primary hover:bg-primary/10 h-6 px-1.5 font-medium cursor-pointer"
              >
                Lihat Semua <ArrowUpRight className="size-3 ml-0.5" />
              </Button>
            </div>
          </div>

          {/* Compact Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {categoryStats.map((cat) => {
              const CategoryIcon = getCategoryIcon(cat.name);
              return (
                <div
                  key={cat.name}
                  onClick={() => navigate(`/data-barang?search=${encodeURIComponent(cat.name)}`)}
                  className={`p-2.5 rounded-xl border ${cat.borderColor} ${cat.bgColor} flex items-center justify-between gap-2 transition-all duration-150 hover:scale-[1.02] hover:shadow-xs cursor-pointer group`}
                  title={`Klik untuk melihat barang ${cat.name}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`size-7 rounded-lg bg-background/90 shadow-2xs flex items-center justify-center shrink-0 ${cat.textColor}`}>
                      <CategoryIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-muted-foreground block truncate leading-tight">
                        {cat.name}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-sm font-extrabold leading-none ${cat.textColor}`}>
                          <AnimatedNumber value={cat.count} />
                        </span>
                        <span className="text-[9.5px] text-muted-foreground font-normal">
                          Unit
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-background/80 text-muted-foreground shrink-0 shadow-2xs border border-border/40">
                    {cat.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── 4. TIPE PENYIMPANAN FISIK GUDANG (RAK, KARDUS, PALLET) ── */}
      <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-row justify-between items-center gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Tipe Penyimpanan Fisik
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Pilih kategori untuk memfilter daftar lokasi penyimpanan di bawah
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs active:scale-95 transition-all cursor-pointer h-8 text-xs gap-1.5 px-3">
                <Plus className="size-3.5" /> <span>Tambah Lokasi</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-foreground shadow-md">
              <DropdownMenuItem
                className="cursor-pointer focus:bg-muted text-xs font-medium py-2"
                onClick={() => handleOpenSheet("add-rak")}
              >
                <Layers className="size-4 mr-2 text-blue-500" /> Tambah Rak Baru
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-muted text-xs font-medium py-2"
                onClick={() => handleOpenSheet("add-kardus")}
              >
                <Archive className="size-4 mr-2 text-amber-500" /> Tambah Kardus
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer focus:bg-muted text-xs font-medium py-2"
                onClick={() => handleOpenSheet("add-pallet")}
              >
                <Package className="size-4 mr-2 text-emerald-500" /> Tambah Pallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1">
          <div
            onClick={() => setFilterType("rak")}
            className={`border rounded-2xl p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
              filterType === "rak"
                ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20 shadow-xs"
                : "bg-muted/30 border-border/60 hover:bg-muted/60"
            }`}
          >
            <div className="p-2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl w-fit mx-auto mb-2 shadow-2xs">
              <Layers className="size-4.5" />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">Rak Bertingkat</div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              <AnimatedNumber value={stats.totalRak} /> <span className="text-xs font-normal text-muted-foreground">Lokasi</span>
            </div>
          </div>

          <div
            onClick={() => setFilterType("kardus")}
            className={`border rounded-2xl p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
              filterType === "kardus"
                ? "bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-muted/30 border-border/60 hover:bg-muted/60"
            }`}
          >
            <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl w-fit mx-auto mb-2 shadow-2xs">
              <Archive className="size-4.5" />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">Kardus Box</div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              <AnimatedNumber value={stats.totalKardus} /> <span className="text-xs font-normal text-muted-foreground">Lokasi</span>
            </div>
          </div>

          <div
            onClick={() => setFilterType("pallet")}
            className={`border rounded-2xl p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
              filterType === "pallet"
                ? "bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-xs"
                : "bg-muted/30 border-border/60 hover:bg-muted/60"
            }`}
          >
            <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit mx-auto mb-2 shadow-2xs">
              <Package className="size-4.5" />
            </div>
            <div className="text-xs text-muted-foreground font-semibold">Pallet Kayu</div>
            <div className="text-lg font-bold text-foreground mt-0.5">
              <AnimatedNumber value={stats.totalPallet} /> <span className="text-xs font-normal text-muted-foreground">Lokasi</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 5. SEARCH & FILTER TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Category Filter Pills */}
        <div className="flex p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/60 shrink-0">
          {([
            { key: "rak", label: "Rak", icon: Layers, count: stats.totalRak },
            { key: "kardus", label: "Kardus", icon: Archive, count: stats.totalKardus },
            { key: "pallet", label: "Pallet", icon: Package, count: stats.totalPallet },
          ] as const).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === key
                  ? "bg-background text-foreground shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-muted text-muted-foreground">
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Sort, and Quick Add Action */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari lokasi / aturan merek..."
              className="pl-8.5 pr-8 h-9 text-xs bg-background shadow-2xs border-border/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-32 sm:w-36 h-9 bg-background border-border/70 text-xs font-medium text-foreground focus:ring-1 cursor-pointer">
              <SlidersHorizontal className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground text-xs">
              <SelectItem value="name" className="focus:bg-muted text-xs font-medium cursor-pointer">
                Nama (A-Z)
              </SelectItem>
              <SelectItem value="util-desc" className="focus:bg-muted text-xs font-medium cursor-pointer">
                Terisi Tertinggi
              </SelectItem>
              <SelectItem value="util-asc" className="focus:bg-muted text-xs font-medium cursor-pointer">
                Terisi Terendah
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => handleOpenSheet(`add-${filterType}` as any)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs active:scale-95 transition-all cursor-pointer h-9 text-xs gap-1 px-3 shrink-0"
            title={`Tambah ${filterType.toUpperCase()} Baru`}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Tambah</span> {filterType === "rak" ? "Rak" : filterType === "kardus" ? "Kardus" : "Pallet"}
          </Button>
        </div>
      </div>

      {/* ── 6. LOCATION CARDS GRID ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredAndSortedLocations.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/60 flex flex-col items-center justify-center">
            <Box className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">Tidak ada lokasi penyimpanan ditemukan</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `Tidak ada lokasi yang cocok dengan kata kunci "${searchQuery}".`
                : `Belum ada data penyimpanan untuk kategori ${filterType}. Klik "Tambah Lokasi" untuk menambahkan.`}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenSheet(`add-${filterType}` as any)}
              className="mt-4 gap-1.5 text-xs h-8"
            >
              <Plus className="size-3.5" /> Tambah {filterType.toUpperCase()} Baru
            </Button>
          </div>
        ) : (
          filteredAndSortedLocations.map((loc) => {
            const isLocActive = loc.isActive;

            if (loc.type === "Rak") {
              const totalRakUsed = (loc.levels || []).reduce((acc, l) => acc + (l.usedCapacity || 0), 0);
              const totalRakCap = (loc.levels || []).reduce((acc, l) => acc + (l.capacity || 0), 0);

              return (
                <Card
                  key={loc.id}
                  className={`border-border/70 bg-card shadow-2xs rounded-2xl flex flex-col relative group transition-all duration-200 hover:border-primary/40 hover:shadow-md overflow-hidden ${
                    !isLocActive ? "opacity-60 saturate-50" : ""
                  }`}
                >
                  {/* Header */}
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/30 px-4 pt-3.5 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {loc.name}
                          {!isLocActive && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                              Nonaktif
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                          {loc.levels?.length || 0} Level • {totalRakUsed}/{totalRakCap} Unit
                        </CardDescription>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                        >
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-muted text-xs"
                          onClick={() => handleOpenSheet("edit-rak", { parentId: loc.id })}
                        >
                          <Edit className="size-3.5 mr-2" /> Edit Nama Rak
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-muted text-xs"
                          onClick={() => handleOpenSheet("add-level", { parentId: loc.id })}
                        >
                          <Plus className="size-3.5 mr-2" /> Tambah Level
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/60" />
                        <DropdownMenuItem
                          disabled={isToggling}
                          className="cursor-pointer focus:bg-muted text-xs"
                          onClick={() => handleToggleLocation(loc.id)}
                        >
                          <Power className="size-3.5 mr-2" /> {isLocActive ? "Nonaktifkan Rak" : "Aktifkan Rak"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isDeleting}
                          className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer text-xs"
                          onClick={() => requestDeleteLocation(loc.id, loc.name)}
                        >
                          <Trash2 className="size-3.5 mr-2" /> Hapus Rak
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  {/* Content: List of Levels */}
                  <CardContent className="p-3 flex-1 flex flex-col gap-2">
                    {loc.levels?.map((lvl) => {
                      const isLvlEffectiveActive = isLocActive && lvl.isActive;
                      const { pct, barClass, textClass, label } = getProgressStyles(
                        lvl.usedCapacity,
                        lvl.capacity,
                        "bg-blue-500"
                      );

                      // Breakdown per category for this level
                      const locKey = `${loc.name} - ${lvl.name}`;
                      const catsInLevel = locationCategoryMap[locKey] || locationCategoryMap[lvl.name] || {};
                      const catEntries = Object.entries(catsInLevel);

                      return (
                        <div
                          key={lvl.id}
                          onClick={() => navigate(`/data-barang?search=${encodeURIComponent(`${loc.name} - ${lvl.name}`)}`)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isLvlEffectiveActive
                              ? "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/50 cursor-pointer"
                              : "border-border/40 bg-muted/40 opacity-55"
                          } flex flex-col gap-1.5 group/level`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              {lvl.name}
                              <ExternalLink className="size-3 text-muted-foreground/50 group-hover/level:text-primary transition-colors" />
                            </span>
                            <div className="flex gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                              <span className="px-1.5 py-0.5 rounded-md bg-background border border-border/80 text-[10px] text-muted-foreground font-semibold">
                                {lvl.brandRule || "Campuran"}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                  >
                                    <MoreVertical className="size-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                                  {lvl.usedCapacity > 0 && (
                                    <DropdownMenuItem
                                      className="cursor-pointer focus:bg-muted text-xs text-primary font-medium"
                                      onClick={() => handleOpenRelocate(`${loc.name} - ${lvl.name}`, `${loc.name} (${lvl.name})`)}
                                    >
                                      <ArrowRightLeft className="size-3.5 mr-2 text-primary" /> Pindahkan Barang
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="cursor-pointer focus:bg-muted text-xs"
                                    onClick={() => handleOpenSheet("edit-level", { parentId: loc.id, levelId: lvl.id })}
                                  >
                                    <Edit className="size-3.5 mr-2" /> Edit Level
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer focus:bg-muted text-xs"
                                    onClick={() => handleDownloadQrCode(lvl.sheetUrl, `${loc.name} - ${lvl.name}`)}
                                  >
                                    <QrCode className="size-3.5 mr-2" /> Simpan QR Code
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-border/60" />
                                  <DropdownMenuItem
                                    disabled={!isLocActive || isToggling}
                                    className="cursor-pointer focus:bg-muted text-xs"
                                    onClick={() => handleToggleLevel(loc.id, lvl.id)}
                                  >
                                    <Power className="size-3.5 mr-2" /> {lvl.isActive ? "Nonaktifkan" : "Aktifkan"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={isDeleting}
                                    className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer text-xs"
                                    onClick={() => requestDeleteLevel(lvl.id, lvl.name)}
                                  >
                                    <Trash2 className="size-3.5 mr-2" /> Hapus Level
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Progress Bar & Details */}
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium pt-0.5">
                            <span>Kapasitas Level</span>
                            <span>
                              <strong className="text-foreground">{lvl.usedCapacity}</strong> / {lvl.capacity} Unit
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-right ${textClass}`}>{label}</span>
                          </div>

                          {/* Category chips preview in this level */}
                          {catEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {catEntries.map(([cName, cCount]) => (
                                <span
                                  key={cName}
                                  className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-muted/60 text-muted-foreground font-medium border border-border/50"
                                >
                                  {cCount} {cName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {(!loc.levels || loc.levels.length === 0) && (
                      <div className="text-center p-4 border border-dashed border-border/70 rounded-xl text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5 py-6 bg-muted/10">
                        <Box className="size-6 text-muted-foreground/40 mb-0.5" />
                        <p className="text-xs font-medium">Belum ada level pada rak ini.</p>
                        <Button
                          variant="link"
                          className="text-primary text-xs h-auto p-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSheet("add-level", { parentId: loc.id });
                          }}
                        >
                          + Tambah level pertama
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }

            // Kardus / Pallet Cards
            const isKardus = loc.type === "Kardus";
            const baseColor = isKardus ? "bg-amber-500" : "bg-emerald-500";
            const Icon = isKardus ? Archive : Package;
            const iconColor = isKardus
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400";
            const iconBg = isKardus ? "bg-amber-500/10" : "bg-emerald-500/10";
            const typeLabel = isKardus ? "Kardus" : "Pallet";
            const editMode = isKardus ? "edit-kardus" : "edit-pallet";

            const { pct, barClass, textClass, label } = getProgressStyles(
              loc.usedCapacity || 0,
              loc.capacity || 0,
              baseColor
            );

            // Breakdown per category for this location
            const catsInLoc = locationCategoryMap[loc.name] || {};
            const catEntries = Object.entries(catsInLoc);

            return (
              <Card
                key={loc.id}
                className={`border-border/70 bg-card shadow-2xs rounded-2xl overflow-hidden flex flex-col relative group transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer ${
                  !isLocActive ? "opacity-60 saturate-50" : ""
                }`}
                onClick={() => navigate(`/data-barang?search=${encodeURIComponent(loc.name)}`)}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 ${iconBg} ${iconColor} rounded-xl shrink-0`}>
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {loc.name}
                          {!isLocActive && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                              Nonaktif
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                          Penyimpanan {typeLabel}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/80 text-[10px] text-muted-foreground font-semibold">
                        {loc.brandRule || "Campuran"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                          {(loc.usedCapacity || 0) > 0 && (
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-muted text-xs text-primary font-medium"
                              onClick={() => handleOpenRelocate(loc.name, `${typeLabel} ${loc.name}`)}
                            >
                              <ArrowRightLeft className="size-3.5 mr-2 text-primary" /> Pindahkan Barang
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="cursor-pointer focus:bg-muted text-xs"
                            onClick={() => handleOpenSheet(editMode as any, { parentId: loc.id })}
                          >
                            <Edit className="size-3.5 mr-2" /> Edit {typeLabel}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer focus:bg-muted text-xs"
                            onClick={() => handleDownloadQrCode(loc.sheetUrl, loc.name)}
                          >
                            <QrCode className="size-3.5 mr-2" /> Simpan QR Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/60" />
                          <DropdownMenuItem
                            disabled={isToggling}
                            className="cursor-pointer focus:bg-muted text-xs"
                            onClick={() => handleToggleLocation(loc.id)}
                          >
                            <Power className="size-3.5 mr-2" /> {isLocActive ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isDeleting}
                            className="text-rose-500 focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer text-xs"
                            onClick={() => requestDeleteLocation(loc.id, loc.name)}
                          >
                            <Trash2 className="size-3.5 mr-2" /> Hapus {typeLabel}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                      <span>Kapasitas Terisi</span>
                      <span>
                        <strong className="text-foreground">{loc.usedCapacity || 0}</strong> / {loc.capacity || 0} Unit
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold w-8 text-right ${textClass}`}>{label}</span>
                    </div>
                  </div>

                  {/* Category chips preview in this location */}
                  {catEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {catEntries.map(([cName, cCount]) => (
                        <span
                          key={cName}
                          className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-muted/60 text-muted-foreground font-medium border border-border/50"
                        >
                          {cCount} {cName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer hint */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <span className="text-[10px] flex items-center gap-1 group-hover:text-primary transition-colors">
                      Lihat isi barang <ExternalLink className="size-3" />
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Tersedia {Math.max(0, (loc.capacity || 0) - (loc.usedCapacity || 0))} Unit
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── 7. FORM MODAL DIALOG ── */}
      <Dialog open={sheetMode !== "closed"} onOpenChange={(open) => !open && setSheetMode("closed")}>
        <DialogContent className="sm:max-w-md bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {sheetTitles[sheetMode] || "Kelola Lokasi"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atur detail penyimpanan, kapasitas fisik, dan aturan merek material.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">{renderForm()}</div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheetMode("closed")}
              disabled={isSaving}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isSaving ? "Menyimpan..." : "Simpan Lokasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. RELOCATE / PINDAHKAN BARANG MODAL DIALOG ── */}
      <Dialog
        open={relocateDialog.isOpen}
        onOpenChange={(open) => !open && setRelocateDialog({ isOpen: false, sourceLocation: "", sourceName: "" })}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" /> Pindahkan Barang Antar Lokasi
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pindahkan unit material dari satu shelf / titik penyimpanan ke shelf / lokasi lain.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {/* Source & Destination visual connection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/70 relative">
              {/* Asal */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lokasi Asal</span>
                <div className="p-2.5 rounded-xl bg-background border border-border/80 shadow-2xs">
                  <div className="font-bold text-xs text-foreground truncate">{relocateDialog.sourceName || relocateDialog.sourceLocation}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                    Isi: <strong className="text-primary">{sourceItemsInfo.total} Unit</strong>
                  </div>
                </div>
              </div>

              {/* Tujuan */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lokasi Tujuan</span>
                <Select value={relocateTarget} onValueChange={setRelocateTarget}>
                  <SelectTrigger className="h-auto p-2.5 bg-background border-border/80 text-xs font-semibold focus:ring-1 text-foreground">
                    <SelectValue placeholder="Pilih Lokasi Tujuan..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground max-h-60">
                    {availableTargetLocations
                      .filter((l) => l.name.toLowerCase() !== relocateDialog.sourceLocation.toLowerCase())
                      .map((l) => (
                        <SelectItem key={l.id} value={l.name} className="focus:bg-muted text-xs cursor-pointer py-2">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-semibold truncate">{l.name}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 ${l.availableCapacity > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600"}`}>
                              Sisa: {l.availableCapacity} Unit
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Kategori yang Dipindahkan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Kategori Material yang Dipindahkan</Label>
              <Select value={relocateCategory} onValueChange={setRelocateCategory}>
                <SelectTrigger className="bg-background border-border/80 text-xs text-foreground">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="ALL" className="text-xs font-medium cursor-pointer">
                    Semua Kategori ({sourceItemsInfo.total} Unit)
                  </SelectItem>
                  {Object.entries(sourceItemsInfo.categories).map(([catName, count]) => (
                    <SelectItem key={catName} value={catName} className="text-xs font-medium cursor-pointer">
                      {catName} Saja ({count} Unit)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jumlah Barang */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-foreground">Jumlah Unit yang Dipindahkan</Label>
                <span className="text-[10px] text-muted-foreground">
                  Tersedia: <strong className="text-foreground">{sourceItemsInfo.availableCount} Unit</strong>
                </span>
              </div>
              <Input
                type="number"
                min="1"
                max={sourceItemsInfo.availableCount}
                value={relocateQty}
                onChange={(e) => setRelocateQty(e.target.value)}
                placeholder={`Kosongkan untuk pindahkan semua (${sourceItemsInfo.availableCount} Unit)`}
                className="bg-background border-border/80 text-xs text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Validasi & Info Kapasitas Tujuan */}
            {targetLocInfo && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5 text-xs">
                {targetLocInfo.availableCapacity >= (parseInt(relocateQty) || sourceItemsInfo.availableCount) ? (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-foreground">
                    Kapasitas {targetLocInfo.name}:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    Terisi {targetLocInfo.usedCapacity} / {targetLocInfo.maxCapacity} Unit (Sisa Ruang: <strong>{targetLocInfo.availableCapacity} Unit</strong>)
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRelocateDialog({ isOpen: false, sourceLocation: "", sourceName: "" })}
              disabled={isRelocating}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const count = relocateQty ? parseInt(relocateQty) : undefined;
                handleRelocateItems(relocateDialog.sourceLocation, relocateTarget, relocateCategory, count);
              }}
              disabled={isRelocating || !relocateTarget || sourceItemsInfo.availableCount === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              {isRelocating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Memindahkan...
                </>
              ) : (
                <>
                  <ArrowRight className="size-3.5" /> Konfirmasi Pindahkan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 9. ALERT DIALOG CONFIRM DELETE ── */}
      <AlertDialog
        open={deleteAlertData.isOpen}
        onOpenChange={(open) => !open && setDeleteAlertData({ isOpen: false, type: null, id: "", name: "" })}
      >
        <AlertDialogContent className="bg-card border-border shadow-xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="size-4" /> Hapus {deleteAlertData.type === "location" ? "Lokasi" : "Level"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus <strong className="text-foreground">{deleteAlertData.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setDeleteAlertData({ isOpen: false, type: null, id: "", name: "" })}
              className="text-xs cursor-pointer"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}