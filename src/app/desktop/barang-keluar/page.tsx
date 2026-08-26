import { useBarangKeluarLogic } from "@/features/barang-keluar/hooks/useBarangKeluarLogic";
import { OutboundFormCard } from "@/features/barang-keluar/components/OutboundFormCard";
import { ScannedItemsTableOutbound } from "@/features/barang-keluar/components/ScannedItemsTableOutbound";

export default function BarangKeluarPage() {
  const logic = useBarangKeluarLogic();

  const totalKuotaTersedia = Object.values(logic.kuota).reduce((total, value) => total + value, 0);
  const validItems = logic.session.barangKeluar.filter((item) => item.status === "Valid").length;

  return (
    <div className="@container/main flex h-full select-none flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex h-full flex-col gap-4 px-4 lg:px-6">
        
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
