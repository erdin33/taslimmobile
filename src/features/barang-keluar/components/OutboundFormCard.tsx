import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScanLine, PackageMinus } from "lucide-react";
import type { Partner } from "@/types/partner";

interface OutboundFormCardProps {
  user: any;
  kodeBarang: string;
  updateKodeBarang: (val: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  kodeBarangRef: React.MutableRefObject<string>;
  handleSubmit: (kode?: string) => void;
  dbPartners: Partner[];
  selectedPartnerId: string;
  setSelectedPartnerId: (val: string) => void;
  keterangan: string;
  setKeterangan: (val: string) => void;
  ticketGangguan: string;
  setTicketGangguan: (val: string) => void;
  focusKodeBarangInput: () => void;
  cameraScannerSlot?: React.ReactNode;
}

export function OutboundFormCard({
  user,
  kodeBarang,
  updateKodeBarang,
  inputRef,
  kodeBarangRef,
  handleSubmit,
  dbPartners,
  selectedPartnerId,
  setSelectedPartnerId,
  keterangan,
  setKeterangan,
  ticketGangguan,
  setTicketGangguan,
  focusKodeBarangInput,
  cameraScannerSlot,
}: OutboundFormCardProps) {
  return (
    <Card className="shrink-0 border-primary/20 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col items-end gap-4 sm:flex-row">
          <div className="w-full flex-1 space-y-1.5">
            <Label htmlFor="smart-input" className="text-sm font-semibold">Scan Barcode / SN</Label>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  id="smart-input"
                  className="h-11 pl-9 font-mono text-base shadow-inner focus-visible:ring-primary/50"
                  placeholder="Contoh: ZTEG12345678"
                  value={kodeBarang}
                  onChange={(event) => updateKodeBarang(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSubmit(kodeBarangRef.current);
                    }
                  }}
                />
              </div>
              {cameraScannerSlot}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sistem akan otomatis mendeteksi dari barcode scanner.</p>
          </div>

          {user?.role !== "mitra" ? (
            <div className="w-full space-y-1.5 sm:w-64">
              <Label htmlFor="mitra-tujuan" className="text-sm font-semibold">Tujuan (Mitra)</Label>
              <Select
                value={selectedPartnerId}
                onValueChange={(value) => {
                  setSelectedPartnerId(value);
                  focusKodeBarangInput();
                }}
              >
                <SelectTrigger id="mitra-tujuan" className="h-11">
                  <SelectValue placeholder="Pilih mitra..." />
                </SelectTrigger>
                <SelectContent>
                  {dbPartners.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Belum ada mitra aktif</div>
                  ) : (
                    dbPartners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="w-full space-y-1.5 sm:w-64">
              <Label htmlFor="keterangan-keluar" className="text-sm font-semibold">PA / Keterangan</Label>
              <Input
                id="keterangan-keluar"
                className="h-11"
                value={keterangan}
                onChange={(event) => setKeterangan(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusKodeBarangInput();
                  }
                }}
                placeholder="Contoh: PA-00123"
              />
            </div>
          )}

          {((user?.role === "mitra" && user?.partnerType === "GANGGUAN") ||
            (user?.role !== "mitra" && dbPartners.find((p) => p.id === selectedPartnerId)?.partnerType === "GANGGUAN")) && (
              <div className="w-full space-y-1.5 sm:w-64">
                <Label htmlFor="ticket-gangguan" className="text-sm font-semibold">No Tiket Gangguan</Label>
                <Input
                  id="ticket-gangguan"
                  className="h-11"
                  value={ticketGangguan}
                  onChange={(event) => setTicketGangguan(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      focusKodeBarangInput();
                    }
                  }}
                  placeholder="Contoh: INC12345"
                />
              </div>
            )}

          <Button className="h-11 w-full gap-2 sm:w-32" onClick={() => handleSubmit(kodeBarangRef.current)}>
            <PackageMinus className="size-4" />
            Tambah
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
