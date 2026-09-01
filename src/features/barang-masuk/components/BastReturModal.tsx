import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { getBaseUrl } from "@/lib/api";
import type { DashboardRequest } from "@/types/transaction";

interface BastReturModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: DashboardRequest | null;
}

export function BastReturModal({
  isOpen,
  onOpenChange,
  request,
}: BastReturModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  if (!request) return null;

  const returItems = request.returItems || [];
  const dateStr = request.requestedAt
    ? new Date(request.requestedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const isCompleted = ["SELESAI", "DITERIMA"].includes((request.status || "").toUpperCase());

  const handleOpenServerPdf = async () => {
    setIsOpeningPdf(true);
    try {
      const token = localStorage.getItem("taslim-auth-token") || "";
      const endpoint = isCompleted ? "pdf-signed" : "pdf-draft";
      const url = `${getBaseUrl()}/requests/${request.id || request.requestNumber}/${endpoint}?token=${token}`;
      
      try {
        await openUrl(url);
        toast.success("Membuka PDF BAST...");
      } catch {
        window.open(url, "_blank");
      }
    } catch (err) {
      console.warn("Gagal membuka PDF dari server:", err);
      toast.info("Menggunakan preview dokumen bawaan aplikasi.");
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BAST Retur - ${request.requestNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #111; padding: 20px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
            .subtitle { font-size: 11px; color: #444; }
            .meta-table { width: 100%; margin-bottom: 16px; font-size: 11px; border-collapse: collapse; }
            .meta-table td { padding: 4px 8px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #999; padding: 7px 10px; text-align: left; font-size: 11px; }
            .items-table th { background-color: #f1f5f9; font-weight: 700; text-transform: uppercase; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .badge-rusak { background: #fee2e2; color: #991b1b; }
            .badge-baru { background: #dcfce7; color: #166534; }
            .badge-dismantle { background: #ede9fe; color: #5b21b6; }
            .parties-grid { display: flex; justify-content: space-between; margin-bottom: 16px; gap: 20px; }
            .party-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; font-size: 11px; }
            .sign-section { width: 100%; margin-top: 25px; display: flex; justify-content: space-between; }
            .sign-box { width: 45%; text-align: center; font-size: 11px; }
            .sign-line { border-bottom: 1px solid #333; margin-top: 50px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b bg-muted/40 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
            <FileText className="size-5 text-primary" />
            Dokumen BAST Pengembalian Material
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenServerPdf}
              disabled={isOpeningPdf}
              className="gap-1.5 text-xs h-8 cursor-pointer"
              title="Buka file PDF resmi dari server"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">Buka PDF Resmi</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/40">
          <div
            ref={printRef}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm text-slate-800 dark:text-slate-100 max-w-3xl mx-auto space-y-6"
          >
            {/* Header Surat Resmi */}
            <div className="header border-b-2 border-slate-900 dark:border-slate-100 pb-4 text-center">
              <div className="flex flex-col items-center justify-center gap-1 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <span className="font-extrabold text-sm sm:text-base tracking-widest text-slate-900 dark:text-slate-100 uppercase">
                    PT INDONESIA COMNETS PLUS (PLN ICON PLUS)
                  </span>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  SBU REGIONAL JAWA BARAT &bull; KANTOR PERWAKILAN TASIKMALAYA
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Jl. Mayor Utarya No. 24, Cikalang, Kec. Tawang, Kota Tasikmalaya, Jawa Barat 46112
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700">
                <h1 className="title text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-900 dark:text-slate-100">
                  BERITA ACARA SERAH TERIMA PENGEMBALIAN MATERIAL (BAST RETUR)
                </h1>
                <p className="subtitle text-xs font-mono font-bold text-primary mt-1">
                  Nomor: BAST-RETUR/{request.requestNumber}/{new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Pernyataan Pembuka */}
            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-2">
              <p>
                Pada hari ini, <strong>{dateStr}</strong>, telah diselenggarakan serah terima pengembalian material/perangkat retur antara para pihak sebagai berikut:
              </p>
            </div>

            {/* Pihak Terkait */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                  PIHAK PERTAMA (Yang Menyerahkan)
                </span>
                <p className="font-bold text-sm text-foreground">{request.requesterName || "Mitra Kerja"}</p>
                <p className="text-muted-foreground text-xs font-medium">Instansi / Mitra: {request.requesterName || "Mitra Pelaksana"}</p>
                <p className="text-muted-foreground text-[11px]">Kategori: Mitra Pelaksana Lapangan</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  PIHAK KEDUA (Yang Menerima)
                </span>
                <p className="font-bold text-sm text-foreground">Admin Logistik KP Tasikmalaya</p>
                <p className="text-muted-foreground text-xs font-medium">Instansi: PT PLN Icon Plus - KP Tasikmalaya</p>
                <p className="text-muted-foreground text-[11px]">Kategori: Pengelola Gudang Logistik</p>
              </div>
            </div>

            {/* Klausul Pernyataan */}
            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>PIHAK PERTAMA</strong> telah menyerahkan kembali kepada <strong>PIHAK KEDUA</strong>, dan <strong>PIHAK KEDUA</strong> telah menerima serta memverifikasi fisik material/perangkat retur dengan rincian sebagai berikut:
              </p>
            </div>

            {/* Tabel Material */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Rincian Unit Material yang Dikembalikan
                </p>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Total: {returItems.length > 0 ? returItems.length : (request.itemsCount || 1)} Unit
                </span>
              </div>
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="items-table w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    <tr>
                      <th className="p-2.5 w-10 text-center font-bold">No</th>
                      <th className="p-2.5 font-bold">Serial Number (SN)</th>
                      <th className="p-2.5 font-bold">Merek & Model</th>
                      <th className="p-2.5 font-bold">Kategori</th>
                      <th className="p-2.5 text-center font-bold">Kondisi</th>
                      <th className="p-2.5 font-bold">Keterangan / PA / Tiket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {returItems.length > 0 ? (
                      returItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-foreground">{item.nomor || item.serialNumber}</td>
                          <td className="p-2.5">{item.merek || item.brand || "-"} {item.model || item.tipe ? `(${item.model || item.tipe})` : ""}</td>
                          <td className="p-2.5">{item.kategori || "-"}</td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              (item.kondisi || "").toLowerCase() === "rusak"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                : (item.kondisi || "").toLowerCase() === "baru"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                            }`}>
                              {item.kondisi ? item.kondisi.toUpperCase() : "DISMANTLE"}
                            </span>
                          </td>
                          <td className="p-2.5 text-xs text-muted-foreground font-mono">
                            {item.paNumber ? `PA: ${item.paNumber}` : item.ticketGangguan ? `Tiket: ${item.ticketGangguan}` : item.catatan || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          {request.itemsDetail || `${request.itemsCount || 1} unit material`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Catatan Tambahan */}
            {request.notes && (
              <div className="text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-foreground">Catatan Tambahan: </span>
                <span className="text-muted-foreground">{request.notes}</span>
              </div>
            )}

            {/* Klausul Penutup */}
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 italic">
              <p>
                Demikian Berita Acara Serah Terima Pengembalian Material (BAST Retur) ini dibuat dengan sebenarnya dalam rangkap yang cukup dan memiliki kekuatan hukum yang sama setelah ditandatangani oleh kedua belah pihak.
              </p>
            </div>

            {/* Bagian Tanda Tangan Para Pihak */}
            <div className="sign-section pt-6 grid grid-cols-2 gap-8 text-center text-xs">
              {/* TTD Pihak Pertama (Mitra) */}
              <div className="flex flex-col items-center justify-between min-h-[140px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Pihak Pertama (Yang Menyerahkan),</p>
                <div className="my-2 flex flex-col items-center gap-1">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="size-3" />
                    <span>Ditandatangani Digital</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">{dateStr}</span>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900 dark:text-slate-100">{request.requesterName || "Mitra Lapangan"}</p>
                  <p className="text-[11px] text-muted-foreground">Mitra Pelaksana Lapangan</p>
                </div>
              </div>

              {/* TTD Pihak Kedua (Admin) */}
              <div className="flex flex-col items-center justify-between min-h-[140px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Pihak Kedua (Yang Menerima),</p>
                <div className="my-2 flex flex-col items-center gap-1">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="size-3" />
                    <span>Diverifikasi & Diterima</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">{dateStr}</span>
                </div>
                <div>
                  <p className="font-bold underline text-slate-900 dark:text-slate-100">Admin Logistik KP Tasikmalaya</p>
                  <p className="text-[11px] text-muted-foreground">PT PLN Icon Plus - KP Tasikmalaya</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/40 shrink-0 flex flex-row items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm font-semibold">
              <Printer className="size-4" />
              Cetak / Simpan PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
