import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PackageCheck, Copy, Check, MapPin, User, Calendar, Box, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import type { DashboardRequest } from "@/types/transaction";
import type { LocationDefinition } from "@/types/inventory";
import { getBaseUrl, getHeaders } from "../api/barangMasukApi";

interface ReturApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: DashboardRequest;
  onSuccess: () => void;
}

export function ReturApprovalModal({ open, onOpenChange, request, onSuccess }: ReturApprovalModalProps) {
  const [locations, setLocations] = useState<LocationDefinition[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSn, setCopiedSn] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Fetch locations
      fetch(`${getBaseUrl()}/locations`)
        .then(res => res.json())
        .then(data => {
          let locs = Array.isArray(data.data) ? data.data : data;
          if (!Array.isArray(locs)) locs = [];
          setLocations(locs);
          
          // Auto recommend Kardus Retur if it exists
          const kardusRetur = locs.find((l: any) => l.name?.toLowerCase().includes("retur"));
          if (kardusRetur) {
            setSelectedLocation(kardusRetur.name);
          } else if (locs.length > 0) {
            setSelectedLocation(locs[0]?.name || "");
          }
        })
        .catch(err => {
          console.error("Gagal load lokasi", err);
          setLocations([]);
        });
    }
  }, [open]);

  const handleCopy = (sn: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(sn);
    setCopiedSn(sn);
    toast.success(`SN ${sn} berhasil disalin!`);
    setTimeout(() => setCopiedSn(null), 2000);
  };

  const handleApprove = async () => {
    if (!selectedLocation) {
      toast.error("Silakan pilih lokasi penyimpanan terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Update status barang ke Dismantle/Rusak dan pindahkan ke Lokasi
      if (request.returItems && request.returItems.length > 0) {
        // Fetch current items to get their IDs and existing status
        const resItems = await fetch(`${getBaseUrl()}/items`, {
          headers: getHeaders(),
        });
        if (!resItems.ok) throw new Error("Gagal mengambil data items");
        const dataItems = await resItems.json();
        const allItems = Array.isArray(dataItems.data) ? dataItems.data : dataItems;

        for (const rItem of request.returItems) {
          const existing = allItems.find((i: any) => (i.serialNumber || "").toUpperCase() === (rItem.nomor || "").toUpperCase());
          if (existing) {
            const isConditionRusak = (rItem.kondisi || "").toLowerCase() === "rusak" || (rItem.status || "").toLowerCase() === "rusak";
            const updatedItem = {
              ...existing,
              status: isConditionRusak ? "Rusak" : "Tersedia", 
              lokasiPenyimpanan: selectedLocation,
              mitra: "KP Tasikmalaya",
              tanggalMasuk: new Date().toISOString(),
            };
            
            const resUpdate = await fetch(`${getBaseUrl()}/items/${existing.id}`, {
              method: "PUT",
              headers: getHeaders(),
              body: JSON.stringify(updatedItem),
            });
            if (!resUpdate.ok) throw new Error(`Gagal update item ${existing.serialNumber}`);
            
            // Catat ke transaksi masuk
            const newTransaction = {
              id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              tanggal: new Date().toISOString(),
              nomor: request.requestNumber,
              kategori: "Masuk",
              status: "Selesai",
              sn: rItem.nomor,
              merek: rItem.merek,
              asal: request.requesterName,
              tujuan: selectedLocation,
              mitra: "KP Tasikmalaya",
              keterangan: `Retur: ${rItem.kondisi === "rusak" ? "Rusak" : (rItem.kondisi === "baru" ? "Baru" : "Dismantle")}`,
            };
            const resTrx = await fetch(`${getBaseUrl()}/transactions`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify(newTransaction),
            });
            if (!resTrx.ok) throw new Error(`Gagal mencatat transaksi ${rItem.nomor}`);
          }
        }
      }

      // 1. Update status request in server API
      try {
        await fetch(`${getBaseUrl()}/requests/${request.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ ...request, status: "SELESAI" }),
        });
      } catch (err) {
        console.warn("Gagal update status retur di API:", err);
      }

      // 2. Update status request in LocalStorage AFTER all API calls succeed
      const existingReturs = JSON.parse(localStorage.getItem("mock_retur_requests") || "[]");
      const updatedReturs = existingReturs.map((r: DashboardRequest) => 
        (r.id === request.id || r.requestNumber === request.requestNumber) ? { ...r, status: "SELESAI" } : r
      );
      localStorage.setItem("mock_retur_requests", JSON.stringify(updatedReturs));

      toast.success("Retur berhasil disetujui dan barang dipindahkan ke Gudang KP.");
      onSuccess();
    } catch (error) {
      console.error("Error approving retur:", error);
      toast.error("Terjadi kesalahan saat menyetujui retur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const returItems = request.returItems || [];

  const getConditionBadge = (kondisi?: string) => {
    const k = (kondisi || "").toLowerCase();
    if (k === "rusak") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800 text-[11px] font-semibold gap-1 px-2 py-0.5">
          <AlertTriangle className="size-3" />
          RUSAK
        </Badge>
      );
    }
    if (k === "baru") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold gap-1 px-2 py-0.5">
          <Sparkles className="size-3" />
          BARU
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-300 dark:border-violet-800 text-[11px] font-semibold gap-1 px-2 py-0.5">
        <CheckCircle2 className="size-3" />
        DISMANTLE
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Review & Konfirmasi Penerimaan Retur
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Periksa daftar material dari mitra sebelum disetujui masuk ke Gudang KP.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-background">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <Box className="size-3.5 text-primary" /> No Tiket
              </span>
              <span className="font-mono font-bold text-foreground block truncate">
                {request.requestNumber}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <User className="size-3.5 text-primary" /> Mitra
              </span>
              <span className="font-semibold text-foreground block truncate">
                {request.requesterName || "Mitra"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <Calendar className="size-3.5 text-primary" /> Tanggal
              </span>
              <span className="font-medium text-foreground block truncate">
                {request.requestedAt && !isNaN(new Date(request.requestedAt).getTime())
                  ? new Date(request.requestedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                  : "-"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <PackageCheck className="size-3.5 text-primary" /> Total
              </span>
              <span className="font-bold text-primary block">
                {request.itemsCount || returItems.length || 0} Unit Material
              </span>
            </div>
          </div>

          {/* List of Returned Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground">
                Rincian Barang yang Dikembalikan ({returItems.length} Unit)
              </Label>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block border rounded-xl overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Serial Number (SN)</TableHead>
                    <TableHead className="text-xs font-bold">Merek & Model</TableHead>
                    <TableHead className="text-xs font-bold text-center">Kondisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returItems.length > 0 ? (
                    returItems.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-center font-mono text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">{item.nomor}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-primary rounded-md"
                              onClick={(e) => handleCopy(item.nomor, e)}
                              title="Salin Serial Number"
                            >
                              {copiedSn === item.nomor ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          <span className="font-medium">{item.merek || "-"}</span> {item.tipe ? <span className="text-muted-foreground">({item.tipe})</span> : ""}
                        </TableCell>
                        <TableCell className="text-center">
                          {getConditionBadge(item.kondisi)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-20 text-xs">
                        {request.itemsDetail || "Detail barang tidak tersedia di tiket ini."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="flex flex-col gap-2.5 sm:hidden max-h-[35vh] overflow-y-auto pr-1">
              {returItems.length > 0 ? (
                returItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-bold text-foreground">{item.nomor}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 text-muted-foreground hover:text-primary"
                            onClick={(e) => handleCopy(item.nomor, e)}
                          >
                            {copiedSn === item.nomor ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                      </div>
                      {getConditionBadge(item.kondisi)}
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">
                      {item.merek || "-"} {item.tipe ? `• ${item.tipe}` : ""} {item.kategori ? `(${item.kategori})` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4 text-xs">
                  {request.itemsDetail || "Detail barang tidak tersedia di tiket ini."}
                </div>
              )}
            </div>
          </div>

          {/* Location Picker */}
          <div className="space-y-2.5 p-4 bg-muted/30 rounded-xl border border-border/60">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary shrink-0" />
              <Label className="text-sm font-bold text-foreground">
                Tentukan Lokasi Simpan di Gudang KP
              </Label>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pilih kardus atau rak tempat meletakkan barang fisik yang dikembalikan.
            </p>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full h-10 bg-background font-medium">
                <SelectValue placeholder="Pilih kardus / rak penyimpanan..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.name} value={loc.name}>
                    {loc.name} {loc.name.toLowerCase().includes("retur") ? "⭐ (Rekomendasi)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/30 shrink-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isSubmitting || !selectedLocation}
            className="w-full sm:w-auto gap-2 font-semibold shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <PackageCheck className="size-4" />
                Terima & Masukkan Gudang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
