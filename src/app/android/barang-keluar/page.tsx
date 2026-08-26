"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraScanner } from "@/components/camera-scanner";
import { useBarangKeluarLogic } from "@/features/barang-keluar/hooks/useBarangKeluarLogic";
import { OutboundFormCard } from "@/features/barang-keluar/components/OutboundFormCard";
import { ScannedItemsTableOutbound } from "@/features/barang-keluar/components/ScannedItemsTableOutbound";

export default function BarangKeluarPage() {
  const logic = useBarangKeluarLogic();
  const [openScanner, setOpenScanner] = useState(false);

  const handleScanSuccess = useCallback(async (scannedCode: string | string[]) => {
    const isValidItem = (code: string) => {
      if (!logic.dbItems || logic.dbItems.length === 0) return true; // fallback
      const normalizedCode = code.trim().toUpperCase();
      return logic.dbItems.some((item) => {
        const id = item.serialNumber?.trim().toUpperCase();
        return id && normalizedCode === id;
      });
    };

    if (Array.isArray(scannedCode)) {
      if (scannedCode.length === 0) return { success: false, message: "Tidak ada barcode valid." };

      const firstValidCode = scannedCode.find(code => isValidItem(code));
      if (!firstValidCode) {
        return { success: false, message: "Barang tidak terdaftar di sistem" };
      }

      logic.updateKodeBarang(firstValidCode);
      return { success: true, message: "Barcode berhasil di-scan. Silakan isi keterangan lalu klik Tambah." };
    } else {
      const codeToProcess = scannedCode;
      if (!isValidItem(codeToProcess)) {
        return { success: false, ignored: true, message: "Barang tidak terdaftar di sistem" };
      }
      logic.updateKodeBarang(codeToProcess);
      return { success: true };
    }
  }, [logic]);

  const initScanDone = useRef(false);
  useEffect(() => {
    if (logic.dbItems.length === 0) return;
    const processGlobalScan = () => {
      const stored = sessionStorage.getItem("global-scan-keluar");
      if (stored) {
        initScanDone.current = true;
        sessionStorage.removeItem("global-scan-keluar");
        const codes = stored.includes(',') ? stored.split(',') : stored;
        handleScanSuccess(codes);
      }
    };
    if (!initScanDone.current) {
      processGlobalScan();
    }
    window.addEventListener("global-scan-keluar-updated", processGlobalScan);
    return () => {
      window.removeEventListener("global-scan-keluar-updated", processGlobalScan);
    };
  }, [logic.dbItems.length, handleScanSuccess]);

  const totalKuotaTersedia = Object.values(logic.kuota).reduce((total, value) => total + value, 0);
  const validItems = logic.session.barangKeluar.filter((item) => item.status === "Valid").length;

  return (
    <div className="@container/main flex min-h-[calc(100svh-3rem)] select-none flex-col gap-4 py-4 md:gap-6 md:py-6 @5xl/main:h-full @5xl/main:overflow-y-hidden">
      <div className="flex flex-col flex-1 h-full gap-4 px-4 lg:px-6 @5xl/main:grid @5xl/main:h-full @5xl/main:grid-cols-[minmax(320px,380px)_1fr]">

        <OutboundFormCard
          user={logic.user}
          kodeBarang={logic.kodeBarang}
          updateKodeBarang={logic.updateKodeBarang}
          inputRef={logic.inputRef}
          kodeBarangRef={logic.kodeBarangRef}
          handleSubmit={logic.handleSubmit}
          dbPartners={logic.dbPartners}
          selectedPartnerId={logic.selectedPartnerId}
          setSelectedPartnerId={logic.setSelectedPartnerId}
          keterangan={logic.keterangan}
          setKeterangan={logic.setKeterangan}
          ticketGangguan={logic.ticketGangguan}
          setTicketGangguan={logic.setTicketGangguan}
          focusKodeBarangInput={logic.focusKodeBarangInput}
          cameraScannerSlot={
            <CameraScanner
              open={openScanner}
              onOpenChange={setOpenScanner}
              onScan={handleScanSuccess}
            >
              <Button
                type="button"
                variant="default"
                className="h-11 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5 shrink-0 ml-2"
              >
                <ScanLine className="size-4" />
                <span className="text-xs font-semibold">Kamera</span>
              </Button>
            </CameraScanner>
          }
        />

        <ScannedItemsTableOutbound
          user={logic.user}
          barangKeluar={logic.session.barangKeluar}
          validItems={validItems}
          totalKuotaTersedia={totalKuotaTersedia}
          isSaving={logic.isSaving}
          handleValidateAll={logic.handleValidateAll}
          handleDeleteItem={logic.handleDeleteItem}
        />
      </div>
    </div>
  );
}
