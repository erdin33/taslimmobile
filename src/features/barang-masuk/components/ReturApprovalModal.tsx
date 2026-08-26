import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, PackageCheck } from "lucide-react";
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
          const existing = allItems.find((i: any) => i.serialNumber.toUpperCase() === rItem.nomor.toUpperCase());
          if (existing) {
            const updatedItem = {
              ...existing,
              status: "Rusak", 
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
              keterangan: `Retur: ${rItem.kondisi === "rusak" ? "Rusak" : "Dismantle"}`,
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

      // 1. Update status request in LocalStorage AFTER all API calls succeed
      const existingReturs = JSON.parse(localStorage.getItem("mock_retur_requests") || "[]");
      const updatedReturs = existingReturs.map((r: DashboardRequest) => 
        r.id === request.id ? { ...r, status: "SELESAI" } : r
      );
      localStorage.setItem("mock_retur_requests", JSON.stringify(updatedReturs));

      toast.success("Retur berhasil disetujui dan barang dipindahkan ke gudang.");
      onSuccess();
    } catch (error) {
      console.error("Error approving retur:", error);
      toast.error("Terjadi kesalahan saat menyetujui retur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const returItems = request.returItems || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PackageCheck className="h-5 w-5 text-primary" />
            Konfirmasi Penerimaan Retur
          </DialogTitle>
          <DialogDescription>
            Tiket <strong>{request.requestNumber}</strong> dari <strong>{request.requesterName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Daftar Barang yang Dikembalikan</Label>
            <div className="border rounded-md overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Merek & Model</TableHead>
                    <TableHead>Kondisi Dilaporkan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returItems.length > 0 ? (
                    returItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.nomor}</TableCell>
                        <TableCell>{item.merek} {item.tipe ? `- ${item.tipe}` : ""}</TableCell>
                        <TableCell>
                          <Badge variant={item.kondisi === "rusak" ? "destructive" : "secondary"}>
                            {item.kondisi === "rusak" ? "Rusak" : "Dismantle"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-20">
                        Detail barang tidak tersedia di tiket ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <Label className="text-base font-semibold block">Tentukan Lokasi Penyimpanan</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Pilih kardus atau rak tempat Anda akan meletakkan barang-barang retur ini secara fisik.
              Sistem merekomendasikan area khusus karantina/retur agar tidak tercampur barang baru.
            </p>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Pilih lokasi/kardus..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.name} value={loc.name}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleApprove} disabled={isSubmitting || !selectedLocation}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Terima & Masukkan Gudang"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
