"use client";

import {
  Plus, Edit, Trash2, Power, Layers, Archive, MoreVertical,
  Search, Box, Loader2, Package, SlidersHorizontal, QrCode
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useLokasiBarangLogic } from "@/features/lokasi-barang/hooks/useLokasiBarangLogic";
import { AnimatedNumber } from "@/features/lokasi-barang/components/AnimatedNumber";

export default function LokasiBarangPage() {
  const navigate = useNavigate();
  const {
    locations, brands, sheetMode, setSheetMode,
    searchQuery, setSearchQuery, filterType, setFilterType, sortBy, setSortBy,
    locName, setLocName, locCapacity, setLocCapacity, locBrand, setLocBrand,
    locLevelsCount, setLocLevelsCount, levelName, setLevelName,
    deleteAlertData, setDeleteAlertData, isSaving, isDeleting, isToggling,
    stats, filteredAndSortedLocations, handleOpenSheet, handleSave,
    handleToggleLocation, handleToggleLevel, requestDeleteLocation, requestDeleteLevel,
    confirmDelete, handleDownloadQrCode
  } = useLokasiBarangLogic();

  const renderCapacityInput = () => (
    <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="loc-capacity" className="text-xs font-semibold text-foreground flex justify-between items-center">
          <span>Kapasitas Maksimal</span>
          <span className="text-[10px] text-muted-foreground font-normal italic">(Dapat diubah secara manual)</span>
        </Label>
        <div className="relative">
          <Input
            id="loc-capacity"
            type="number"
            min="0"
            value={locCapacity}
            onChange={e => setLocCapacity(e.target.value)}
            placeholder="Masukkan total kapasitas"
            className="bg-popover border-border pr-12 text-sm font-semibold text-blue-400 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground select-none">Unit</span>
        </div>
      </div>
    </div>
  );

  const renderForm = () => {
    if (sheetMode === "add-rak" || sheetMode === "edit-rak") return (
      <>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Nama Rak</Label>
          <Input value={locName} onChange={e => setLocName(e.target.value)} placeholder="Contoh: Rak A1" className="bg-background border-border focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        {sheetMode === "add-rak" && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Jumlah Level Awal</Label>
            <Input type="number" min="1" value={locLevelsCount} onChange={e => setLocLevelsCount(e.target.value)} placeholder="Masukkan Total Level" className="bg-background border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>
        )}
      </>
    );
    if (sheetMode === "add-kardus" || sheetMode === "edit-kardus") return (
      <>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Nama Kardus</Label>
          <Input value={locName} onChange={e => setLocName(e.target.value)} placeholder="Contoh: Kardus K-01" className="bg-background border-border focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        {renderCapacityInput()}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
          <Select value={locBrand} onValueChange={setLocBrand}>
            <SelectTrigger className="justify-start bg-background border-border focus:ring-1 focus:ring-ring"><SelectValue placeholder="Pilih Aturan" /></SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              {brands.map(b => <SelectItem key={b} value={b} className="focus:bg-muted">{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </>
    );
    if (sheetMode === "add-pallet" || sheetMode === "edit-pallet" || sheetMode === "add-mitra" || sheetMode === "edit-mitra") {
      const isMitra = sheetMode.includes("mitra");
      const labelType = isMitra ? "Mitra" : "Pallet";
      const phType = isMitra ? "Mitra M-01" : "Pallet P-01";
      return (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Nama {labelType}</Label>
            <Input value={locName} onChange={e => setLocName(e.target.value)} placeholder={`Contoh: ${phType}`} className="bg-background border-border focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          {renderCapacityInput()}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
            <Select value={locBrand} onValueChange={setLocBrand}>
              <SelectTrigger className="justify-start bg-background border-border focus:ring-1 focus:ring-ring"><SelectValue placeholder="Pilih Aturan" /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {brands.map(b => <SelectItem key={b} value={b} className="focus:bg-muted">{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    if (sheetMode === "add-level" || sheetMode === "edit-level") return (
      <>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Nama Level</Label>
          <Input value={levelName} onChange={e => setLevelName(e.target.value)} placeholder="Contoh: Level 1" className="bg-background border-border focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        {renderCapacityInput()}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Aturan Merek</Label>
          <Select value={locBrand} onValueChange={setLocBrand}>
            <SelectTrigger className="bg-background border-border focus:ring-1 focus:ring-ring"><SelectValue placeholder="Pilih Aturan" /></SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              {brands.map(b => <SelectItem key={b} value={b} className="focus:bg-muted">{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </>
    );
    return null;
  };

  const sheetTitles: Record<string, string> = {
    "add-rak": "Tambah Rak Baru", "edit-rak": "Edit Rak",
    "add-kardus": "Tambah Kardus Baru", "edit-kardus": "Edit Kardus",
    "add-pallet": "Tambah Pallet Baru", "edit-pallet": "Edit Pallet",
    "add-mitra": "Tambah Mitra Baru", "edit-mitra": "Edit Mitra",
    "add-level": "Tambah Level Rak", "edit-level": "Edit Level Rak", "closed": "",
  };

  // Helper for progress colors
  const getProgressStyles = (used: number, cap: number, baseColor: string) => {
    if (cap <= 0) return { barClass: "bg-muted", textClass: "text-muted-foreground", label: "0%", pct: 0 };
    const pct = Math.min(100, Math.round((used / cap) * 100));
    let barClass = baseColor;
    let textClass = "text-foreground";
    if (pct >= 100) {
      barClass = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
      textClass = "text-red-400 font-bold";
    } else if (pct > 70) {
      barClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
      textClass = "text-amber-400 font-semibold";
    }
    return { barClass, textClass, pct, label: `${pct}%` };
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-28 h-full flex flex-col gap-6 text-foreground mx-auto w-full max-w-7xl overflow-y-auto">
      
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            Lokasi Penyimpanan
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Kelola tata letak fisik, aturan merek, dan pantau ketersediaan kapasitas rak, kardus, atau pallet.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-950/20 active:scale-95 transition-all cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Lokasi
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border text-foreground">
            <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("add-rak")}>
              <Layers className="w-4 h-4 mr-2 text-blue-400" /> Tambah Rak
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("add-kardus")}>
              <Archive className="w-4 h-4 mr-2 text-amber-400" /> Tambah Kardus
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("add-pallet")}>
              <Package className="w-4 h-4 mr-2 text-emerald-400" /> Tambah Pallet
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("add-mitra")}>
              <Box className="w-4 h-4 mr-2 text-purple-400" /> Tambah Mitra
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── 2. WAREHOUSE STATISTICS BANNER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Warehouse occupancy tracker */}
        <Card className="lg:col-span-2 bg-muted/50 border-border backdrop-blur-xs p-6 flex flex-col md:flex-row gap-6 justify-between relative overflow-hidden">
          <div className="flex-1 flex flex-col justify-between z-10">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Okupansi Kapasitas Gudang
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Status pemakaian kapasitas total di semua lokasi (Rak, Kardus, Pallet, Mitra)
                  </CardDescription>
                </div>
              </div>

              {/* Segmented stacked bar chart */}
              {(() => {
                const rakUsed = (() => { let u = 0, c = 0; locations.filter(l => l.type === "Rak").forEach(l => l.levels?.forEach(lv => { u += lv.usedCapacity; c += lv.capacity; })); return { u, c }; })();
                const kardusUsed = (() => { let u = 0, c = 0; locations.filter(l => l.type === "Kardus").forEach(l => { u += l.usedCapacity || 0; c += l.capacity || 0; }); return { u, c }; })();
                const palletUsed = (() => { let u = 0, c = 0; locations.filter(l => l.type === "Pallet").forEach(l => { u += l.usedCapacity || 0; c += l.capacity || 0; }); return { u, c }; })();
                const mitraUsed = (() => { let u = 0, c = 0; locations.filter(l => l.type === "Mitra").forEach(l => { u += l.usedCapacity || 0; c += l.capacity || 0; }); return { u, c }; })();
                const total = stats.maxCapacity || 1;
                const rakPct   = Math.round((rakUsed.u   / total) * 100);
                const kardusPct = Math.round((kardusUsed.u / total) * 100);
                const palletPct = Math.round((palletUsed.u / total) * 100);
                const mitraPct  = Math.round((mitraUsed.u / total) * 100);
                const freePct   = Math.max(0, 100 - rakPct - kardusPct - palletPct - mitraPct);
                const segments = [
                  { label: "Rak",    pct: rakPct,    color: "bg-blue-500",    glow: "rgba(59,130,246,0.45)" },
                  { label: "Kardus", pct: kardusPct, color: "bg-amber-400",   glow: "rgba(251,191,36,0.45)" },
                  { label: "Pallet", pct: palletPct, color: "bg-emerald-500", glow: "rgba(16,185,129,0.45)" },
                  { label: "Mitra",  pct: mitraPct,  color: "bg-purple-500",  glow: "rgba(168,85,247,0.45)" },
                  { label: "Kosong", pct: freePct,   color: "bg-muted", glow: "" },
                ];
                return (
                  <div className="mt-4 space-y-3">
                    {/* Stacked bar */}
                    <div className="w-full h-5 rounded-full overflow-hidden flex bg-popover shadow-inner">
                      {segments.map((s) =>
                        s.pct > 0 ? (
                          <div
                            key={s.label}
                            className={`${s.color} h-full transition-all duration-1000 ease-out first:rounded-l-full last:rounded-r-full`}
                            style={{
                              width: `${s.pct}%`,
                              boxShadow: s.glow ? `0 0 8px ${s.glow}` : undefined,
                            }}
                          />
                        ) : null
                      )}
                    </div>

                    {/* Legend row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {segments.map((s) => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${s.color} shrink-0`} />
                          <span className="text-[11px] text-muted-foreground">{s.label}</span>
                          <span className="text-[11px] font-semibold text-foreground">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex flex-wrap justify-between items-center gap-4 border-t border-border/50 pt-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Terpakai:</span>
                <span className="text-xs font-semibold text-foreground"><AnimatedNumber value={stats.usedCapacity} /> Unit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Tersedia:</span>
                <span className="text-xs font-semibold text-foreground"><AnimatedNumber value={Math.max(0, stats.maxCapacity - stats.usedCapacity)} /> Unit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-600" />
                <span className="text-xs text-muted-foreground">Total Kapasitas:</span>
                <span className="text-xs font-semibold text-foreground"><AnimatedNumber value={stats.maxCapacity} /> Unit</span>
              </div>
            </div>
          </div>

          {/* Donut chart illustration */}
          {(() => {
            const pct = Math.min(100, stats.utilizationPct);
            const r = 44;
            const circ = 2 * Math.PI * r;
            const dash = (pct / 100) * circ;
            const isHigh = pct >= 100;
            const isMid  = pct > 70;
            const strokeColor = isHigh ? "#ef4444" : isMid ? "#f59e0b" : "#6366f1";
            const glowColor   = isHigh ? "rgba(239,68,68,0.45)" : isMid ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.45)";
            const textColor   = isHigh ? "#f87171" : isMid ? "#fbbf24" : "#818cf8";
            return (
              <div className="hidden md:flex items-center justify-center shrink-0 z-10 self-center">
                <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg" style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}>
                  {/* Track */}
                  <circle cx="60" cy="60" r={r} fill="none" stroke="#1f2937" strokeWidth="12" />
                  {/* Progress arc */}
                  <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeDashoffset={circ / 4}
                    style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease" }}
                  />
                  {/* Center text */}
                  <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill={textColor} fontFamily="system-ui, sans-serif">
                    {pct}%
                  </text>
                  <text x="60" y="72" textAnchor="middle" fontSize="7.5" fill="#6b7280" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
                    TERPAKAI
                  </text>
                </svg>
              </div>
            );
          })()}
        </Card>

        {/* Card 2: Physical type summary counts */}
        <Card className="bg-muted/50 border-border backdrop-blur-xs p-6 flex flex-col justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Tipe Penyimpanan</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Jumlah lokasi aktif dan terdaftar berdasarkan kategori
            </CardDescription>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-popover/40 border border-border rounded-xl p-3 text-center transition-all duration-350 hover:border-border">
              <div className="p-1.5 bg-blue-500/10 rounded-lg w-fit mx-auto mb-2"><Layers className="w-4 h-4 text-blue-400" /></div>
              <div className="text-[10px] text-muted-foreground font-medium">Rak</div>
              <div className="text-lg font-bold text-foreground mt-0.5"><AnimatedNumber value={stats.totalRak} /></div>
            </div>
            <div className="bg-popover/40 border border-border rounded-xl p-3 text-center transition-all duration-350 hover:border-border">
              <div className="p-1.5 bg-amber-500/10 rounded-lg w-fit mx-auto mb-2"><Archive className="w-4 h-4 text-amber-400" /></div>
              <div className="text-[10px] text-muted-foreground font-medium">Kardus</div>
              <div className="text-lg font-bold text-foreground mt-0.5"><AnimatedNumber value={stats.totalKardus} /></div>
            </div>
            <div className="bg-popover/40 border border-border rounded-xl p-3 text-center transition-all duration-350 hover:border-border">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg w-fit mx-auto mb-2"><Package className="w-4 h-4 text-emerald-400" /></div>
              <div className="text-[10px] text-muted-foreground font-medium">Pallet</div>
              <div className="text-lg font-bold text-foreground mt-0.5"><AnimatedNumber value={stats.totalPallet} /></div>
            </div>
            <div className="bg-popover/40 border border-border rounded-xl p-3 text-center transition-all duration-350 hover:border-border">
              <div className="p-1.5 bg-purple-500/10 rounded-lg w-fit mx-auto mb-2"><Box className="w-4 h-4 text-purple-400" /></div>
              <div className="text-[10px] text-muted-foreground font-medium">Mitra</div>
              <div className="text-lg font-bold text-foreground mt-0.5"><AnimatedNumber value={stats.totalMitra} /></div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3. INTEGRATED SEARCH & FILTERS ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/50 border border-border/50 rounded-2xl p-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama lokasi atau aturan merek..."
            className="w-full pl-9 bg-neutral-955 border-border focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category badges */}
          <div className="flex items-center gap-1.5 bg-neutral-955/60 p-1 rounded-xl border border-border">
            {([
              { key: "rak", label: "Rak" },
              { key: "kardus", label: "Kardus" },
              { key: "pallet", label: "Pallet" },
              { key: "mitra", label: "Mitra" }
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  filterType === key
                    ? "bg-muted text-foreground border border-neutral-750 shadow-inner"
                    : "text-muted-foreground hover:text-neutral-350 border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="w-px h-6 bg-muted hidden md:block" />

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-40 bg-neutral-955 border-border text-xs font-semibold text-foreground focus:ring-1 focus:ring-ring cursor-pointer">
                <SelectValue placeholder="Urutkan..." />
              </SelectTrigger>
              <SelectContent className="bg-neutral-955 border-border text-foreground text-xs">
                <SelectItem value="name" className="focus:bg-muted text-xs font-medium cursor-pointer">Nama (A-Z)</SelectItem>
                <SelectItem value="util-desc" className="focus:bg-muted text-xs font-medium cursor-pointer">Terisi Tertinggi</SelectItem>
                <SelectItem value="util-asc" className="focus:bg-muted text-xs font-medium cursor-pointer">Terisi Terendah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── 4. LOCATION CARDS GRID ── */}
      <div  className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 pb-16">
        {filteredAndSortedLocations.map(loc => {
          const isLocActive = loc.isActive;
          
          if (loc.type === "Rak") {
            return (
              <Card
                key={loc.id}
                className={`border-border bg-muted/50 flex flex-col relative group transition-all duration-300 hover:border-border/50 hover:bg-muted/50 hover:shadow-lg hover:shadow-black/20 ${!isLocActive ? 'opacity-60 saturate-50' : ''}`}
              >
                {/* Header */}
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/50 px-4 pt-4 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg"><Layers className="w-4 h-4 text-blue-400" /></div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {loc.name}
                        {!isLocActive && <span className="text-[10px] bg-neutral-850 text-muted-foreground border border-border px-1.5 py-0.2 rounded-md font-medium">Nonaktif</span>}
                      </CardTitle>
                      <CardDescription className="text-[10px] text-muted-foreground mt-0.5">{loc.levels?.length || 0} Level Penyimpanan</CardDescription>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-955 border-border text-foreground">
                      <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("edit-rak", { parentId: loc.id })}><Edit className="w-3.5 h-3.5 mr-2" /> Edit Nama Rak</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("add-level", { parentId: loc.id })}><Plus className="w-3.5 h-3.5 mr-2" /> Tambah Level</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-muted" />
                      <DropdownMenuItem disabled={isToggling} className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleToggleLocation(loc.id)}><Power className="w-3.5 h-3.5 mr-2" /> {isLocActive ? "Nonaktifkan Rak" : "Aktifkan Rak"}</DropdownMenuItem>
                      <DropdownMenuItem disabled={isDeleting} className="text-red-400 focus:bg-red-950/50 focus:text-red-400 cursor-pointer text-xs" onClick={() => requestDeleteLocation(loc.id, loc.name)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Rak</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                {/* Content: Compact List of Levels */}
                <CardContent className="p-3 flex-1 flex flex-col gap-2.5">
                  {loc.levels?.map(lvl => {
                    const isLvlEffectiveActive = isLocActive && lvl.isActive;
                    const { pct, barClass, textClass, label } = getProgressStyles(lvl.usedCapacity, lvl.capacity, "bg-blue-500");

                    return (
                      <div
                        key={lvl.id}
                        onClick={() => navigate(`/data-barang?search=${encodeURIComponent(`${loc.name} - ${lvl.name}`)}`)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isLvlEffectiveActive 
                            ? 'border-border/50 bg-neutral-955/20 hover:border-border/50 hover:bg-neutral-955/40 cursor-pointer' 
                            : 'border-border/50 bg-muted/50 opacity-55'
                        } flex flex-col gap-2 group/level`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-foreground">{lvl.name}</span>
                          <div className="flex gap-1.5 items-center" onClick={e => e.stopPropagation()}>
                            <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] text-muted-foreground max-w-[90px] truncate font-medium">
                              {lvl.brandRule}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-neutral-955 border-border text-foreground">
                                <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet("edit-level", { parentId: loc.id, levelId: lvl.id })}><Edit className="w-3.5 h-3.5 mr-2" /> Edit Level</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleDownloadQrCode(lvl.sheetUrl, `${loc.name} - ${lvl.name}`)}><QrCode className="w-3.5 h-3.5 mr-2" /> Simpan QR Code</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-muted" />
                                <DropdownMenuItem disabled={!isLocActive || isToggling} className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleToggleLevel(loc.id, lvl.id)}><Power className="w-3.5 h-3.5 mr-2" /> {lvl.isActive ? "Nonaktifkan Level" : "Aktifkan Level"}</DropdownMenuItem>
                                <DropdownMenuItem disabled={isDeleting} className="text-red-400 focus:bg-red-950/50 focus:text-red-400 cursor-pointer text-xs" onClick={() => requestDeleteLevel(lvl.id, lvl.name)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Level</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Progress Bar & Details */}
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                          <span>Kapasitas</span>
                          <span>
                            <strong className="text-foreground">{lvl.usedCapacity}</strong>
                            <span className="text-muted-foreground font-normal"> / {lvl.capacity} Unit</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-popover rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold w-7 text-right ${textClass}`}>{label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {(!loc.levels || loc.levels.length === 0) && (
                    <div className="text-center p-4 border border-dashed border-border/50 rounded-xl text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5 py-8">
                      <Box className="w-6 h-6 text-neutral-800 mb-1" />
                      <p>Belum memiliki level.</p>
                      <Button variant="link" className="text-blue-400 text-[11px] h-auto p-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleOpenSheet("add-level", { parentId: loc.id }); }}>
                        Tambah level sekarang
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }

          if (loc.type === "Kardus" || loc.type === "Pallet" || loc.type === "Mitra") {
            const isKardus = loc.type === "Kardus";
            const isPallet = loc.type === "Pallet";
            
            const baseColor = isKardus ? "bg-amber-500" : isPallet ? "bg-emerald-500" : "bg-purple-500";
            const Icon = isKardus ? Archive : isPallet ? Package : Box;
            const iconColor = isKardus ? "text-amber-400" : isPallet ? "text-emerald-400" : "text-purple-400";
            const iconBg = isKardus ? "bg-amber-500/10" : isPallet ? "bg-emerald-500/10" : "bg-purple-500/10";
            const typeLabel = isKardus ? "Kardus" : isPallet ? "Pallet" : "Mitra";
            const editMode = isKardus ? "edit-kardus" : isPallet ? "edit-pallet" : "edit-mitra";

            const { pct, barClass, textClass, label } = getProgressStyles(loc.usedCapacity || 0, loc.capacity || 0, baseColor);

            return (
              <Card
                key={loc.id}
                className={`border-border bg-muted/50 overflow-hidden flex flex-col relative group transition-all duration-300 hover:border-border/50 hover:bg-muted/50 hover:shadow-md hover:shadow-black/20 cursor-pointer ${!isLocActive ? 'opacity-60 saturate-50' : ''}`}
                onClick={() => navigate(`/data-barang?search=${encodeURIComponent(loc.name)}`)}
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 ${iconBg} rounded-lg shrink-0`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {loc.name}
                          {!isLocActive && <span className="text-[10px] bg-neutral-850 text-muted-foreground border border-border px-1.5 py-0.2 rounded-md font-medium">Nonaktif</span>}
                        </CardTitle>
                        <CardDescription className="text-[10px] text-muted-foreground mt-0.5">Penyimpanan {typeLabel}</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] text-muted-foreground font-medium">
                        {loc.brandRule || "Campuran"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground cursor-pointer"><MoreVertical className="w-3.5 h-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-neutral-955 border-border text-foreground">
                          <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleOpenSheet(editMode, { parentId: loc.id })}><Edit className="w-3.5 h-3.5 mr-2" /> Edit {typeLabel}</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleDownloadQrCode(loc.sheetUrl, loc.name)}><QrCode className="w-3.5 h-3.5 mr-2" /> Simpan QR Code</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem disabled={isToggling} className="cursor-pointer focus:bg-muted text-xs" onClick={() => handleToggleLocation(loc.id)}><Power className="w-3.5 h-3.5 mr-2" /> {isLocActive ? `Nonaktifkan ${typeLabel}` : `Aktifkan ${typeLabel}`}</DropdownMenuItem>
                          <DropdownMenuItem disabled={isDeleting} className="text-red-400 focus:bg-red-950/50 focus:text-red-400 cursor-pointer text-xs" onClick={() => requestDeleteLocation(loc.id, loc.name)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus {typeLabel}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground">
                      <span>Kapasitas</span>
                      <span>
                        <strong className="text-foreground">{loc.usedCapacity || 0}</strong>
                        <span className="text-muted-foreground font-normal"> / {loc.capacity || 0} Unit</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-popover rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold w-7 text-right ${textClass}`}>{label}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return null;
        })}
        {filteredAndSortedLocations.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-background border border-border rounded-2xl flex items-center justify-center mb-4"><Search className="w-8 h-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-bold text-foreground">Tidak Ada Lokasi</h3>
            <p className="text-muted-foreground text-xs max-w-sm mt-1">Kami tidak menemukan lokasi penyimpanan yang sesuai dengan kata kunci atau filter tipe Anda.</p>
          </div>
        )}
      </div>

      {/* ── 5. FORM DIALOG ── */}
      <Dialog open={sheetMode !== "closed"} onOpenChange={(open) => !open && setSheetMode("closed")}>
        <DialogContent className="w-[92%] sm:max-w-md rounded-2xl p-0 max-h-[85vh] flex flex-col border-border bg-popover text-foreground overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/40 text-left">
            <DialogTitle className="text-lg font-bold text-foreground">{sheetTitles[sheetMode] || ""}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Silakan isi formulir di bawah ini untuk mengelola detail lokasi penyimpanan.</DialogDescription>
          </DialogHeader>
          <div className="p-5 flex-1 overflow-y-auto"><div className="grid gap-4">{renderForm()}</div></div>
          <DialogFooter className="p-4 border-t border-border/50 bg-muted/40 flex flex-row justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setSheetMode("closed")} disabled={isSaving} className="flex-1 font-medium">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 font-semibold">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 6. ALERT DIALOG DELETE ── */}
      <AlertDialog open={deleteAlertData.isOpen} onOpenChange={(open) => !open && setDeleteAlertData({ ...deleteAlertData, isOpen: false })}>
        <AlertDialogContent className="bg-popover border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-base">Hapus {deleteAlertData.type === "location" ? "Lokasi" : "Level"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Tindakan ini akan menghapus permanen <strong>{deleteAlertData.name}</strong> beserta seluruh data terkait di dalamnya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="hover:bg-muted text-foreground border-border text-xs cursor-pointer">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-500 text-white text-xs cursor-pointer">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</> : "Hapus Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}