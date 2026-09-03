"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Calendar,
  Eye,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Layers,
  Camera,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AnimatedNumber } from "@/features/lokasi-barang/components/AnimatedNumber";
import { useLaporanReconLogic, type PartnerWithHistory, type PartnerHistorySummary } from "@/features/laporan-recon/hooks/useLaporanReconLogic";

// ─── Page 1: Daftar Mitra ─────────────────────────────────────────────────────
function MitraListPage({
  data,
  isLoading,
  overallStats,
  onSelectMitra,
  loadData,
  handleExportCSV,
}: {
  data: PartnerWithHistory[];
  isLoading: boolean;
  overallStats: any;
  onSelectMitra: (p: PartnerWithHistory) => void;
  loadData: () => void;
  handleExportCSV: () => void;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-5 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ClipboardCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Laporan Recon Mitra</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pilih mitra untuk melihat detail rekonsiliasi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="h-9 text-xs gap-1.5 px-3.5 cursor-pointer">
            <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer">
            <Download className="size-3.5" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* Statistik Global */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total di Mitra</span>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="size-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-foreground block"><AnimatedNumber value={overallStats.totalAssigned} /></span>
        </Card>
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Tervalidasi</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 block"><AnimatedNumber value={overallStats.totalVerified} /></span>
        </Card>
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Belum Recon</span>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 block"><AnimatedNumber value={overallStats.totalPending} /></span>
        </Card>
        <Card className="border-border/70 bg-card shadow-2xs rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">Kepatuhan</span>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-primary block">{overallStats.overallCompliance}%</span>
        </Card>
      </div>

      {/* Daftar Mitra */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground px-1">Daftar Mitra ({data.length})</h2>
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Memuat data...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Tidak ada data mitra</div>
        ) : (
          data.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectMitra(p)}
              className="w-full text-left p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Building2 className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.totalAssigned} Unit Material</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold px-2.5 py-1 ${
                    p.status === "complete"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                      : p.status === "partial"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300"
                      : "bg-rose-500/10 text-rose-600 border-rose-300"
                  }`}
                >
                  {p.status === "complete" ? "Tuntas" : `${p.compliancePct}%`}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page 2: Histori Tanggal per Mitra ───────────────────────────────────────
function MitraDetailPage({
  mitra,
  onBack,
  onSelectDate,
}: {
  mitra: PartnerWithHistory;
  onBack: () => void;
  onSelectDate: (h: PartnerHistorySummary) => void;
}) {
  const datesWithItems = mitra.history.filter((h) => h.items.length > 0);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-5 text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-muted cursor-pointer">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{mitra.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{mitra.totalAssigned} Unit · Kepatuhan {mitra.compliancePct}%</p>
          </div>
        </div>
      </div>

      {/* Daftar Tanggal */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground px-1">Histori Recon 7 Hari Terakhir</h2>
        {datesWithItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl">
            <Calendar className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Belum ada histori recon</p>
          </div>
        ) : (
          datesWithItems.map((h) => (
            <button
              key={h.date}
              onClick={() => onSelectDate(h)}
              className="w-full text-left p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground shrink-0">
                <Calendar className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{h.date}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {h.verifiedCount} tervalidasi</span>
                  {h.pendingCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">⏳ {h.pendingCount} belum</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold px-2.5 py-1 ${
                    h.status === "complete"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                      : h.status === "partial"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300"
                      : "bg-rose-500/10 text-rose-600 border-rose-300"
                  }`}
                >
                  {h.status === "complete" ? "Tuntas" : `${h.compliancePct}%`}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page 3: Detail Item di Tanggal Tertentu ─────────────────────────────────
function DateDetailPage({
  mitra,
  dateHistory,
  onBack,
  onViewProof,
}: {
  mitra: PartnerWithHistory;
  dateHistory: PartnerHistorySummary;
  onBack: () => void;
  onViewProof: (item: any) => void;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-32 space-y-5 text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 hover:bg-muted cursor-pointer">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{dateHistory.date}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{mitra.name} · {dateHistory.verifiedCount}/{dateHistory.items.length} tervalidasi</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-emerald-600 dark:text-emerald-400">Tervalidasi: {dateHistory.verifiedCount}</span>
          <span className="text-amber-600 dark:text-amber-400">Belum: {dateHistory.pendingCount}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              dateHistory.compliancePct >= 100 ? "bg-emerald-500" : dateHistory.compliancePct > 50 ? "bg-amber-500" : "bg-rose-500"
            }`}
            style={{ width: `${dateHistory.compliancePct}%` }}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground font-semibold">{dateHistory.compliancePct}% Recon Selesai</p>
      </div>

      {/* Daftar Item */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground px-1">Detail Barang ({dateHistory.items.length})</h2>
        {dateHistory.items.map((item) => (
          <div
            key={item.id || item.serialNumber}
            className="p-4 rounded-2xl border border-border/70 bg-card flex items-center gap-4"
          >
            {/* Thumbnail foto / placeholder */}
            <div className="size-14 rounded-xl overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
              {item.proofImageUrl ? (
                <img
                  src={item.proofImageUrl}
                  alt={`Recon ${item.serialNumber}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onViewProof(item)}
                />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-bold text-foreground truncate">{item.serialNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.merek || "-"} {item.tipe ? `• ${item.tipe}` : ""}
              </p>
              {item.verifiedAt && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                  <Clock className="size-2.5" /> {item.verifiedAt}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.isVerified ? (
                <>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 text-[10px] font-semibold gap-1 px-2 py-0.5">
                    <CheckCircle2 className="size-3" /> OK
                  </Badge>
                  {item.proofImageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewProof(item)}
                      className="h-7 text-[10px] gap-1 px-2 cursor-pointer"
                    >
                      <Eye className="size-3 text-primary" /> Foto
                    </Button>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-300 text-[10px] font-semibold gap-1 px-2 py-0.5">
                  <AlertTriangle className="size-3" /> Belum
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export default function LaporanReconAndroidPage() {
  const {
    isLoading,
    viewingProof,
    setViewingProof,
    partnerHistoryData,
    overallStats,
    loadData,
    handleExportCSV,
  } = useLaporanReconLogic();

  // Navigation state
  const [selectedMitra, setSelectedMitra] = useState<PartnerWithHistory | null>(null);
  const [selectedDate, setSelectedDate] = useState<PartnerHistorySummary | null>(null);

  return (
    <>
      {/* Render halaman sesuai level navigasi */}
      {!selectedMitra && (
        <MitraListPage
          data={partnerHistoryData}
          isLoading={isLoading}
          overallStats={overallStats}
          onSelectMitra={(p) => { setSelectedMitra(p); setSelectedDate(null); }}
          loadData={loadData}
          handleExportCSV={handleExportCSV}
        />
      )}

      {selectedMitra && !selectedDate && (
        <MitraDetailPage
          mitra={selectedMitra}
          onBack={() => setSelectedMitra(null)}
          onSelectDate={(h) => setSelectedDate(h)}
        />
      )}

      {selectedMitra && selectedDate && (
        <DateDetailPage
          mitra={selectedMitra}
          dateHistory={selectedDate}
          onBack={() => setSelectedDate(null)}
          onViewProof={(item) => setViewingProof({ isOpen: true, item })}
        />
      )}

      {/* Dialog Foto Bukti */}
      <Dialog
        open={viewingProof.isOpen}
        onOpenChange={(open) => !open && setViewingProof({ isOpen: false, item: null })}
      >
        <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="size-5 text-primary" /> Bukti Rekonsiliasi Fisik
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Foto dokumentasi saat SN diverifikasi oleh mitra
            </DialogDescription>
          </DialogHeader>

          {viewingProof.item && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl overflow-hidden border border-border/70 bg-black/5 flex items-center justify-center max-h-80 shadow-inner">
                {viewingProof.item.proofImageUrl ? (
                  <img
                    src={viewingProof.item.proofImageUrl}
                    alt={`Bukti Recon SN ${viewingProof.item.serialNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-12 text-center text-muted-foreground text-xs">Foto tidak tersedia</div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial Number:</span>
                  <span className="font-mono font-bold">{viewingProof.item.serialNumber}</span>
                </div>
                {viewingProof.item.verifiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="size-3 text-primary" /> Waktu:</span>
                    <span className="font-medium">{viewingProof.item.verifiedAt}</span>
                  </div>
                )}
                {viewingProof.item.geotag && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><MapPin className="size-3 text-rose-500" /> Koordinat:</span>
                    <span className="font-mono font-semibold">
                      {viewingProof.item.geotag.lat.toFixed(5)}, {viewingProof.item.geotag.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
