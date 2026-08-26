import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, PackageCheck, ScanLine, CheckCircle2, AlertCircle, PenTool } from "lucide-react";
import { api, getBaseUrl } from "@/lib/api";
import { CameraScanner } from "@/components/camera-scanner";
import { useAuth } from "@/lib/auth";
import type { DashboardRequest } from "@/types/transaction";
import { cn } from "@/lib/utils";
import { openUrl } from "@tauri-apps/plugin-opener";

import { useRequestDetail } from "@/features/request-detail/hooks/useRequestDetail";

interface PengambilanMitraModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: DashboardRequest | null;
  onSuccess?: () => void;
}

export function PengambilanMitraModal({
  isOpen,
  onOpenChange,
  request,
  onSuccess,
}: PengambilanMitraModalProps) {
  useAuth();
  
  // States
  const [scannedIds, setScannedIds] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"validation" | "signature">("validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);
  
  // Fetch detailed request to get allocations if opened
  const { request: detailedRequest, isLoading: isDetailLoading } = useRequestDetail(isOpen && request ? request.id : undefined);
  
  // Gunakan requestAllocations dari detailedRequest jika tersedia, fallback ke request awal (meskipun list view mungkin tidak punya)
  const allocations = detailedRequest?.requestAllocations || request?.requestAllocations || [];
  const allValidated = allocations.length > 0 && scannedIds.size === allocations.length;

  // Reset state when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setScannedIds(new Set());
      setStep("validation");
      setOpenScanner(false);
    }
    onOpenChange(open);
  };

  const handleScanSuccess = useCallback((scannedCode: string | string[]) => {
    let codeStr = "";
    if (Array.isArray(scannedCode)) {
      if (scannedCode.length === 0) return { success: false, ignored: true, message: "Kosong" };
      codeStr = scannedCode[0];
    } else {
      codeStr = scannedCode;
    }

    const trimmedKode = codeStr.trim().toUpperCase();

    // Find if the scanned SN belongs to this request's allocations
    const matchedAllocation = allocations.find(
      (alloc) => alloc.serialNumber && alloc.serialNumber.trim().toUpperCase() === trimmedKode
    );

    if (!matchedAllocation) {
      return { success: false, message: "Barang bukan untuk request ini" };
    }

    if (scannedIds.has(matchedAllocation.id)) {
      return { success: false, message: "Sudah divalidasi" };
    }

    setScannedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(matchedAllocation.id);
      return newSet;
    });

    return { success: true };
  }, [allocations, scannedIds]);

  const handleManualCheck = (allocId: number) => {
    setScannedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(allocId);
      return newSet;
    });
  };

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen]);

  const handleProceedToWebSignature = async () => {
    if (!request) return;
    
    setOpenScanner(false);
    setStep("signature"); // Switch to signature step (acts as waiting screen)
    setIsSubmitting(true);
    
    try {
      const res = await api.post("/signature-session", { requestId: request.id });
      const sessId = res.data.id;

      const backendBaseUrl = getBaseUrl();
      const mobileUrl = `${backendBaseUrl}/signature-session/${sessId}/mobile`;
      
      // Open the URL in the phone's default browser
      await openUrl(mobileUrl);

      // Start polling for COMPLETED status
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await api.get(`/signature-session/${sessId}`);
          if (pollRes.data.status === "COMPLETED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            toast.success("Barang divalidasi & Tanda tangan berhasil!");
            onSuccess?.();
            handleOpenChange(false);
          }
        } catch (err) {
          // Ignore polling errors
        }
      }, 2000);
      
    } catch (err: any) {
      console.error("Gagal membuat sesi TTD Web:", err);
      toast.error("Gagal membuka halaman tanda tangan.");
      setStep("validation"); // Revert back if it fails
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="w-full text-left space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {step === "validation" ? (
              <><PackageCheck className="size-5 text-sky-500" /> Validasi Barang Fisik</>
            ) : (
              <><PenTool className="size-5 text-emerald-500" /> Tanda Tangan BAST</>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {request?.requestNumber ? `Permintaan #${request.requestNumber}` : ""}
          </DialogDescription>
        </DialogHeader>

        {step === "validation" && (
          <div className="flex flex-col space-y-4 mt-2">
            <div className="bg-sky-500/10 text-sky-700 dark:text-sky-400 p-3 rounded-lg flex items-start gap-3 text-sm">
              <ScanLine className="size-5 shrink-0 mt-0.5" />
              <p>
                Silakan scan barcode/SN dari fisik barang yang Anda terima untuk memastikan sesuai dengan yang dialokasikan Admin.
              </p>
            </div>

            <div className="flex justify-between items-end">
              <div className="text-sm font-medium flex items-center gap-2">
                Daftar Barang ({scannedIds.size}/{allocations.length})
                {isDetailLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              </div>
              <CameraScanner
                open={openScanner}
                onOpenChange={setOpenScanner}
                onScan={handleScanSuccess}
              >
                <Button size="sm" className="gap-2 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white hover:bg-zinc-800">
                  <ScanLine className="size-4" /> Buka Scanner
                </Button>
              </CameraScanner>
            </div>

            <div className="border rounded-xl divide-y bg-zinc-50 dark:bg-zinc-950 max-h-[300px] overflow-y-auto">
              {allocations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Tidak ada alokasi barang.
                </div>
              ) : (
                allocations.map((alloc) => {
                  const isChecked = scannedIds.has(alloc.id);
                  return (
                    <div key={alloc.id} className={cn("p-3 flex items-center justify-between transition-colors", isChecked ? "bg-emerald-500/10" : "")}>
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-sm font-medium", isChecked ? "text-emerald-700 dark:text-emerald-400" : "")}>
                          {alloc.materialName}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {alloc.serialNumber ? (
                            <span className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 rounded">SN: {alloc.serialNumber}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertCircle className="size-3" /> Tanpa SN
                            </span>
                          )}
                          <span>Qty: {alloc.quantity} {alloc.unit}</span>
                        </div>
                      </div>
                      
                      {isChecked ? (
                        <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
                      ) : (
                        alloc.serialNumber ? (
                          <span className="text-[10px] text-muted-foreground italic font-medium px-2">Menunggu Scan</span>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => handleManualCheck(alloc.id)}>
                            Verifikasi
                          </Button>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Button 
              className="w-full mt-4 gap-2" 
              disabled={!allValidated || isSubmitting}
              onClick={handleProceedToWebSignature}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {isSubmitting ? "Membuka Tanda Tangan..." : "Lanjutkan ke Tanda Tangan"}
            </Button>
          </div>
        )}

        {step === "signature" && (
          <div className="flex flex-col items-center justify-center gap-6 py-8 mt-2 text-center">
            <div className="relative flex items-center justify-center w-20 h-20 bg-sky-50 dark:bg-sky-500/10 rounded-full animate-pulse">
              <PenTool className="size-10 text-sky-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Menunggu Tanda Tangan</h3>
              <p className="text-sm text-muted-foreground px-4">
                Selesaikan tanda tangan BAST pada halaman browser yang baru saja terbuka.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-sky-600 bg-sky-50 dark:bg-sky-500/10 px-4 py-2 rounded-full mt-4">
              <Loader2 className="size-4 animate-spin" />
              Memantau status secara otomatis...
            </div>
            
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setStep("validation")}>
              Batal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
