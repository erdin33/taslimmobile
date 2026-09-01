"use client";

import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Download,
  RotateCcw,
  Calendar,
  Eye,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Layers,
  X,
  Camera,
} from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AnimatedNumber } from "@/features/lokasi-barang/components/AnimatedNumber";
import { useLaporanReconLogic } from "@/features/laporan-recon/hooks/useLaporanReconLogic";

export default function LaporanReconAndroidPage() {
  const {
    isLoading,
    selectedPartner,
    setSelectedPartner,
    selectedStatus,
    setSelectedStatus,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    viewingProof,
    setViewingProof,
    partnerSummaries,
    filteredItems,
    overallStats,
    categories,
    partners,
    loadData,
    handleExportCSV,
  } = useLaporanReconLogic();

  return (
    <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-6 pb-36 space-y-5 sm:space-y-6 text-foreground">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              Laporan Rekonsiliasi Mitra
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pantau kepatuhan fisik harian dan deteksi selisih stok material di tangan mitra
            </p>
          </div>
        </div>

        {/* Action controls: Date & Refresh */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-8 h-8 text-xs font-semibold bg-background border-border/70 w-36 cursor-pointer"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 px-3 cursor-pointer shadow-xs"
          >
            <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            <Download className="size-3.5" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* ── 2. METRIC ANALYTICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Unit di Mitra */}
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Total di Mitra</span>
            <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-foreground">
              <AnimatedNumber value={overallStats.totalAssigned} />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Unit Aktif</span>
          </div>
        </Card>

        {/* Tervalidasi Hari Ini */}
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Tervalidasi</span>
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              <AnimatedNumber value={overallStats.totalVerified} />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Unit Cocok</span>
          </div>
        </Card>

        {/* Belum Recon / Selisih */}
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Belum Recon / Selisih</span>
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              <AnimatedNumber value={overallStats.totalPending} />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Unit Tertunda</span>
          </div>
        </Card>

        {/* Tingkat Kepatuhan */}
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-primary">Kepatuhan Total</span>
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-primary">
              {overallStats.overallCompliance}%
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {overallStats.completePartnersCount}/{overallStats.activePartnersCount} Mitra Tuntas
            </span>
          </div>
        </Card>
      </div>

      {/* ── 3. RINGKASAN KEPATUHAN PER MITRA ── */}
      <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Users className="size-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Kepatuhan Recon per Mitra
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Progres rekonsiliasi material per mitra tanggal {selectedDate}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
            {partnerSummaries.length} Mitra Terdaftar
          </Badge>
        </div>

        {/* Partner Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {partnerSummaries.map((p) => {
            const isSelected = selectedPartner.toLowerCase() === p.name.toLowerCase();
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPartner(isSelected ? "all" : p.name)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border/70 bg-muted/20 hover:bg-muted/50 hover:border-border"
                } flex flex-col justify-between gap-2.5`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Membawa {p.totalAssigned} Unit Material
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${
                      p.status === "complete"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                        : p.status === "partial"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300"
                        : "bg-rose-500/10 text-rose-600 border-rose-300"
                    }`}
                  >
                    {p.status === "complete" ? "Tuntas 100%" : `${p.compliancePct}% Recon`}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>
                      Tervalidasi: <strong className="text-foreground">{p.verifiedCount}</strong>/{p.totalAssigned}
                    </span>
                    {p.pendingCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Sisa: {p.pendingCount} Unit
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.compliancePct >= 100
                          ? "bg-emerald-500"
                          : p.compliancePct > 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${p.compliancePct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── 4. SEARCH & FILTER TOOLBAR ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/60 shrink-0">
            {([
              { key: "all", label: "Semua", count: overallStats.totalAssigned },
              { key: "verified", label: "Tervalidasi", count: overallStats.totalVerified },
              { key: "pending", label: "Belum Recon", count: overallStats.totalPending },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === key
                    ? "bg-background text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-muted text-muted-foreground">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Partner, and Category Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs min-w-[140px]">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari Serial Number / Tipe..."
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

            {/* Filter Partner */}
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger className="w-36 h-9 bg-background border-border/70 text-xs font-medium text-foreground focus:ring-1 cursor-pointer">
                <SelectValue placeholder="Pilih Mitra" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground text-xs max-h-56">
                <SelectItem value="all" className="focus:bg-muted text-xs font-medium cursor-pointer">
                  Semua Mitra
                </SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.name} className="focus:bg-muted text-xs font-medium cursor-pointer">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Category */}
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32 h-9 bg-background border-border/70 text-xs font-medium text-foreground focus:ring-1 cursor-pointer">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground text-xs">
                  <SelectItem value="all" className="focus:bg-muted text-xs font-medium cursor-pointer">
                    Semua Kategori
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="focus:bg-muted text-xs font-medium cursor-pointer">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. RECON ITEMS LIST / TABLE ── */}
      <Card className="border-border/70 bg-card shadow-2xs rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/20">
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-foreground">
              Daftar Unit Material & Bukti Recon
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Menampilkan {filteredItems.length} unit material yang dibawa oleh mitra
            </CardDescription>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <ClipboardCheck className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">Tidak ada data unit recon</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Tidak ada data barang yang sesuai dengan filter atau kata kunci pencarian yang Anda pilih.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredItems.map((item) => (
              <div
                key={item.id || item.serialNumber}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-foreground tracking-wider">
                      {item.serialNumber}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0 bg-muted/80">
                      {item.kategori || "Material"}
                    </Badge>
                    {item.merek && (
                      <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.2 rounded bg-muted/40 border border-border/50">
                        {item.merek} {item.tipe ? `• ${item.tipe}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Building2 className="size-3 text-primary" /> {item.mitra}
                    </span>
                    <span>•</span>
                    <span>Status Fisik: {item.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.isVerified ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 text-xs font-semibold gap-1 px-2.5 py-1">
                        <CheckCircle2 className="size-3.5" /> Terverifikasi
                      </Badge>
                      {item.proofImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingProof({ isOpen: true, item })}
                          className="h-8 text-xs gap-1.5 px-2.5 font-medium cursor-pointer shadow-2xs"
                        >
                          <Eye className="size-3.5 text-primary" /> Bukti Foto
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 text-xs font-semibold gap-1 px-2.5 py-1">
                      <AlertTriangle className="size-3.5" /> Belum Di-Recon
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 6. PROOF PHOTO VIEWER DIALOG ── */}
      <Dialog
        open={viewingProof.isOpen}
        onOpenChange={(open) => !open && setViewingProof({ isOpen: false, item: null })}
      >
        <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="size-4 text-primary" /> Bukti Rekonsiliasi Fisik
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dokumentasi foto dan geotag saat nomor seri unit diverifikasi oleh mitra
            </DialogDescription>
          </DialogHeader>

          {viewingProof.item && (
            <div className="space-y-3.5 py-2">
              {/* Photo Preview */}
              <div className="rounded-2xl overflow-hidden border border-border/70 bg-black/5 flex items-center justify-center max-h-72 shadow-inner">
                {viewingProof.item.proofImageUrl ? (
                  <img
                    src={viewingProof.item.proofImageUrl}
                    alt={`Bukti Recon SN ${viewingProof.item.serialNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    Foto bukti tidak tersedia
                  </div>
                )}
              </div>

              {/* Unit & Verification Details */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Serial Number:</span>
                  <span className="font-mono font-bold text-foreground">{viewingProof.item.serialNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mitra Penanggung Jawab:</span>
                  <span className="font-semibold text-foreground">{viewingProof.item.mitra}</span>
                </div>
                {viewingProof.item.verifiedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3 text-primary" /> Waktu Verifikasi:
                    </span>
                    <span className="font-medium text-foreground">{viewingProof.item.verifiedAt}</span>
                  </div>
                )}
                {viewingProof.item.geotag && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3 text-rose-500" /> Koordinat Geotag:
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      {viewingProof.item.geotag.lat.toFixed(5)}, {viewingProof.item.geotag.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
