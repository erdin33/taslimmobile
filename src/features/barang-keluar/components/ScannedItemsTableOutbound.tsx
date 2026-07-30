import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Archive, PackageMinus, X, Loader2 } from "lucide-react";
import type { BarangKeluarItem } from "@/types/transaction";

function EmptyScanTableState() {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
          <PackageMinus className="size-7" strokeWidth={1.8} />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">Belum ada barang keluar</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Scan atau masukkan serial number dari form di sebelah kiri untuk menambahkan item ke sesi keluar.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ScannedItemsTableOutboundProps {
  user: any;
  barangKeluar: BarangKeluarItem[];
  validItems: number;
  totalKuotaTersedia: number;
  isSaving: boolean;
  handleValidateAll: () => void;
  handleDeleteItem: (id: number) => void;
}

export function ScannedItemsTableOutbound({
  user,
  barangKeluar,
  validItems,
  totalKuotaTersedia,
  isSaving,
  handleValidateAll,
  handleDeleteItem,
}: ScannedItemsTableOutboundProps) {
  return (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex-row items-center justify-between border-b pb-4">
        <CardTitle>Daftar Barang Keluar</CardTitle>
        <Badge variant="outline" className="w-fit">
          {barangKeluar.length} Item
        </Badge>
      </CardHeader>

      <CardContent className="relative flex-1 overflow-auto p-0">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md">
            <TableRow>
              <TableHead className="w-14">No</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Merek</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Model Material</TableHead>
              <TableHead>Asal Lokasi</TableHead>
              {user?.role !== "mitra" && <TableHead>Mitra</TableHead>}
              {user?.role === "mitra" && <TableHead>PA / Keterangan</TableHead>}
              <TableHead>{user?.role === "mitra" ? "Status" : "Status Validasi"}</TableHead>
              <TableHead className="w-16 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {barangKeluar.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-[300px] p-0">
                  <EmptyScanTableState />
                </TableCell>
              </TableRow>
            ) : (
              barangKeluar.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-mono">{item.nomor}</TableCell>
                  <TableCell>{item.merek}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal px-2.5 py-0.5">
                      {item.kategori}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.tipe || "-"}</TableCell>
                  <TableCell>{item.lokasi}</TableCell>
                  {user?.role !== "mitra" && <TableCell>{item.mitra}</TableCell>}
                  {user?.role === "mitra" && <TableCell>{item.keterangan}</TableCell>}
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 font-normal px-2.5 py-0.5">
                      <div
                        className={`size-1.5 rounded-full ${
                          user?.role === "mitra" ? "bg-sky-500" : "bg-emerald-500"
                        }`}
                      />
                      {user?.role === "mitra" ? "Diluar" : item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteItem(item.id as number)}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Hapus item</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="shrink-0 flex-col items-start justify-between gap-4 border-t bg-muted/20 p-4 sm:flex-row sm:items-center">
        <div className="flex gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Scan</span>
            <span className="text-lg font-semibold">{barangKeluar.length} <span className="text-sm font-normal text-muted-foreground">Unit</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Validasi</span>
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{validItems} <span className="text-sm font-normal text-emerald-600/70 dark:text-emerald-400/70">Valid</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Kuota Tersisa</span>
            <span className="text-lg font-semibold">{totalKuotaTersedia} <span className="text-sm font-normal text-muted-foreground">Slot</span></span>
          </div>
        </div>
        
        <Button
          className="w-full gap-2 sm:w-auto"
          size="lg"
          onClick={handleValidateAll}
          disabled={barangKeluar.length === 0 || isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
          Simpan Barang Keluar
        </Button>
      </CardFooter>
    </Card>
  );
}
