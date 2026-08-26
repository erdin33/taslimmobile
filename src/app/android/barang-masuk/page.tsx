"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraScanner } from "@/components/camera-scanner";
import { useBarangMasukLogic } from "@/features/barang-masuk/hooks/useBarangMasukLogic";
import { ScannedItemsTable } from "@/features/barang-masuk/components/ScannedItemsTable";
import { InboundFormCard } from "@/features/barang-masuk/components/InboundFormCard";

export default function BarangMasukPage() {
  const logic = useBarangMasukLogic({ autoFocusOnMount: false });
  const [openScanner, setOpenScanner] = useState(false);
  const processedCodesRef = useRef<Set<string>>(new Set());
  
  const handleScanSuccess = useCallback(async (scannedCode: string | string[]) => {
    const isValidIdentifier = (code: string) => {
      if (!logic.dbBrands || logic.dbBrands.length === 0) return true; // fallback if not loaded
      const normalizedCode = code.trim().toUpperCase();
      return logic.dbBrands.some((brand) => {
        const id = brand.identifier?.trim().toUpperCase();
        return id && normalizedCode.startsWith(id);
      });
    };

    if (Array.isArray(scannedCode)) {
      let count = 0;
      for (const code of scannedCode) {
        if (!isValidIdentifier(code)) continue;
        if (processedCodesRef.current.has(code)) continue;
        processedCodesRef.current.add(code);
        setTimeout(() => { processedCodesRef.current.delete(code); }, 2000);
        logic.updateKodeBarang(code);
        await logic.handleSubmit(code);
        count++;
      }
      return { success: count > 0, message: count > 0 ? `Berhasil memproses ${count} barcode.` : "Tidak ada barcode valid." };
    } else {
      const codeToProcess = scannedCode;
      if (!isValidIdentifier(codeToProcess)) {
        return { success: false, ignored: true, message: "Bukan identifier yang valid" };
      }
      if (processedCodesRef.current.has(codeToProcess)) return { success: false, ignored: true, message: "Sudah discan di sesi ini" };
      processedCodesRef.current.add(codeToProcess);
      setTimeout(() => { processedCodesRef.current.delete(codeToProcess); }, 2000);
      logic.updateKodeBarang(codeToProcess);
      return logic.handleSubmit(codeToProcess);
    }
  }, [logic]);

  // Keep the global scanner listener as it was in android page
  const initScanDone = useRef(false);
  useEffect(() => {
    if (logic.dbBrands.length === 0) return;
    const processGlobalScan = () => {
      const stored = sessionStorage.getItem("global-scan-masuk");
      if (stored) {
        initScanDone.current = true;
        sessionStorage.removeItem("global-scan-masuk");
        const codes = stored.includes(',') ? stored.split(',') : stored;
        handleScanSuccess(codes);
      }
    };
    if (!initScanDone.current) {
      processGlobalScan();
    }
    window.addEventListener("global-scan-masuk-updated", processGlobalScan);
    return () => {
      window.removeEventListener("global-scan-masuk-updated", processGlobalScan);
    };
  }, [logic.dbBrands.length, handleScanSuccess]);

  return (
    <div className="@container/main flex min-h-[calc(100svh-3rem)] select-none flex-col gap-4 py-4 md:gap-6 md:py-6 @5xl/main:h-full @5xl/main:overflow-y-hidden">
      <div className="flex flex-col flex-1 h-full gap-4 px-4 lg:px-6 @5xl/main:grid @5xl/main:h-full @5xl/main:grid-cols-[minmax(320px,380px)_1fr]">
        
        {/* Use the shared InboundFormCard for identical UI to desktop, but pass CameraScanner */}
        <InboundFormCard
          user={logic.user}
          asalBarang={logic.asalBarang}
          setAsalBarang={logic.setAsalBarang}
          asalBarangManual={logic.asalBarangManual}
          setAsalBarangManual={logic.setAsalBarangManual}
          dbPartners={logic.dbPartners}
          dbModels={logic.dbModels}
          kodeBarang={logic.kodeBarang}
          updateKodeBarang={logic.updateKodeBarang}
          inputRef={logic.inputRef}
          kodeBarangRef={logic.kodeBarangRef}
          handleSubmit={logic.handleSubmit}
          itemCondition={logic.itemCondition}
          setItemCondition={logic.setItemCondition}
          paNumber={logic.paNumber}
          setPaNumber={logic.setPaNumber}
          ticketGangguan={logic.ticketGangguan}
          setTicketGangguan={logic.setTicketGangguan}
          tipeBarang={logic.tipeBarang}
          setTipeBarang={logic.setTipeBarang}
          brand={logic.brand}
          setBrand={logic.setBrand}
          kategori={logic.kategori}
          setKategori={logic.setKategori}
          dbBrands={logic.dbBrands}
          dbCategories={logic.dbCategories}
          catatan={logic.catatan}
          setCatatan={logic.setCatatan}
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
                className="h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <ScanLine className="size-4" />
                <span className="text-xs font-semibold">Kamera</span>
              </Button>
            </CameraScanner>
          }
        />

        {/* Use the shared ScannedItemsTable for identical UI to desktop */}
        <ScannedItemsTable
          user={logic.user}
          barangMasuk={logic.session.barangMasuk}
          dbBrands={logic.dbBrands}
          dbCategories={logic.dbCategories}
          dbModels={logic.dbModels}
          dbLocations={logic.dbLocations}
          kuota={logic.session.kuota}
          asalBarang={logic.asalBarang}
          isSaving={logic.isSaving}
          handleUpdateInline={logic.session.updateInline}
          handleUpdateLokasi={logic.session.updateLokasi}
          handleDeleteItem={logic.session.deleteItem}
          handleValidateAll={logic.handleValidateAll}
          focusKodeBarangInput={logic.focusKodeBarangInput}
        />
      </div>
    </div>
  );
}
