import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, PackagePlus, RotateCcw, Send, X, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, Copy, Check } from "lucide-react";
import { EmptyScanTableState } from "./EmptyScanTableState";
import { ScannedTableRow } from "./ScannedTableRow";
import type { BarangMasukItem } from "@/types/transaction";
import type { BrandDefinition, LocationDefinition, LokasiOption } from "@/types/inventory";

interface ScannedItemsTableProps {
  user?: any;
  barangMasuk: BarangMasukItem[];
  dbBrands: BrandDefinition[];
  dbCategories: string[];
  dbModels: any[];
  dbLocations: LocationDefinition[];
  kuota: Record<string, number>;
  asalBarang: string;
  isSaving: boolean;
  handleUpdateInline: (id: number, field: keyof BarangMasukItem, val: any) => void;
  handleUpdateLokasi: (id: number, val: LokasiOption) => void;
  handleDeleteItem: (id: number) => void;
  handleValidateAll: () => void;
  focusKodeBarangInput: () => void;
}

export function ScannedItemsTable({
  user,
  barangMasuk,
  dbBrands,
  dbCategories,
  dbModels,
  dbLocations,
  kuota,
  asalBarang,
  isSaving,
  handleUpdateInline,
  handleUpdateLokasi,
  handleDeleteItem,
  handleValidateAll,
  focusKodeBarangInput
}: ScannedItemsTableProps) {
  const isMitra = user?.role === "mitra";
  const tableTitle = isMitra ? "Daftar Barang Yang Akan Dikembalikan" : "Daftar Barang Masuk";
  const [copiedSn, setCopiedSn] = useState<string | null>(null);

  const handleCopy = (sn: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(sn);
    setCopiedSn(sn);
    toast.success(`SN ${sn} berhasil disalin!`);
    setTimeout(() => setCopiedSn(null), 2000);
  };

  const getConditionBadge = (kondisi?: string) => {
    const k = (kondisi || "").toLowerCase();
    if (k === "rusak") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800 text-[10px] font-semibold gap-1">
          <AlertTriangle className="size-3" />
          Rusak
        </Badge>
      );
    }
    if (k === "baru") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
          <Sparkles className="size-3" />
          Baru / Kelebihan
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800 text-[10px] font-semibold gap-1">
        <CheckCircle2 className="size-3" />
        Dismantle
      </Badge>
    );
  };

  return (
    <Card className="@container/card flex flex-1 flex-col overflow-hidden shadow-sm border-sidebar-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4 pt-4 px-4 sm:px-6 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {isMitra ? <RotateCcw className="size-4.5" /> : <PackagePlus className="size-4.5" />}
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {tableTitle}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isMitra
                ? "Daftar unit yang akan diserahkan kembali ke Gudang KP"
                : "Daftar unit yang diproses masuk ke sistem inventaris"}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20 shrink-0">
          {barangMasuk.length} Unit
        </Badge>
      </CardHeader>

      <CardContent className="relative flex-1 overflow-auto p-0">
        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm border-b">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 text-center font-bold">No</TableHead>
                <TableHead className="font-bold">Serial Number</TableHead>
                <TableHead className="font-bold">Merek</TableHead>
                <TableHead className="font-bold">Kategori</TableHead>
                <TableHead className="font-bold">Model</TableHead>
                <TableHead className="font-bold">{isMitra ? "Asal (Mitra)" : "Asal"}</TableHead>
                <TableHead className="font-bold">{isMitra ? "Lokasi Tujuan" : "Lokasi"}</TableHead>
                <TableHead className="w-16 text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barangMasuk.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    <EmptyScanTableState isMitra={isMitra} />
                  </TableCell>
                </TableRow>
              ) : (
                barangMasuk.map((item, index) => (
                  <ScannedTableRow
                    key={item.id}
                    item={item}
                    index={index}
                    dbBrands={dbBrands}
                    dbCategories={dbCategories}
                    dbModels={dbModels}
                    dbLocations={dbLocations}
                    kuota={kuota}
                    asalBarang={asalBarang}
                    handleUpdateInline={handleUpdateInline}
                    handleUpdateLokasi={handleUpdateLokasi}
                    handleDeleteItem={handleDeleteItem}
                    focusKodeBarangInput={focusKodeBarangInput}
                    isMitra={isMitra}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View: Card List */}
        <div className="flex flex-col gap-3 p-3.5 sm:p-4 md:hidden">
          {barangMasuk.length === 0 ? (
            <div className="py-8">
              <EmptyScanTableState isMitra={isMitra} />
            </div>
          ) : (
            barangMasuk.map((item, index) => (
              <div
                key={item.id}
                className="relative flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 shadow-sm transition-all hover:shadow-md dark:bg-card/60"
              >
                {/* Top Row: Counter, SN, Delete Button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                          {item.nomor}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md shrink-0"
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
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.merek || "-"} {item.kategori ? `• ${item.kategori}` : ""} {item.tipe ? `(${item.tipe})` : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg"
                    onClick={() => handleDeleteItem(item.id)}
                    title="Hapus dari daftar"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Badges & Route Row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                  {getConditionBadge(item.kondisi)}

                  {isMitra ? (
                    <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 ml-auto">
                      <span>{user?.displayName || "Mitra"}</span>
                      <ArrowRight className="size-3 text-primary" />
                      <span className="font-semibold text-foreground">Gudang KP</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md ml-auto">
                      Lokasi: <strong className="text-foreground">{item.lokasi || asalBarang || "-"}</strong>
                    </span>
                  )}
                </div>

                {/* Remark / Catatan jika ada */}
                {item.catatan && (
                  <div className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-dashed italic">
                    <span className="font-semibold not-italic text-foreground/80">Ket: </span>
                    {item.catatan}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      <CardFooter className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t bg-muted/20 p-4">
        <div className="flex items-center justify-between sm:justify-start gap-4 text-xs text-muted-foreground">
          <span>
            Total Siap Dikirim: <strong className="text-sm font-bold text-foreground">{barangMasuk.length}</strong> Unit
          </span>
        </div>
        <Button
          className="w-full sm:w-auto gap-2 shadow-sm font-semibold h-11 px-6 rounded-xl"
          size="default"
          onClick={handleValidateAll}
          disabled={barangMasuk.length === 0 || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Memproses...
            </>
          ) : isMitra ? (
            <>
              <Send className="size-4" />
              Kirim Tiket Pengembalian
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Simpan Barang Masuk
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
