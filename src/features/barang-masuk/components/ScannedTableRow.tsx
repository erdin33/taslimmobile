import { memo, useState } from "react";
import { toast } from "sonner";
import { TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, X, Copy, Check } from "lucide-react";
import type { BarangMasukItem } from "@/types/transaction";
import type { BrandDefinition, LocationDefinition, LokasiOption } from "@/types/inventory";

interface ScannedTableRowProps {
  item: BarangMasukItem;
  index?: number;
  dbBrands: BrandDefinition[];
  dbCategories: string[];
  dbModels: any[];
  dbLocations: LocationDefinition[];
  kuota: Record<string, number>;
  asalBarang: string;
  handleUpdateInline: (id: number, field: keyof BarangMasukItem, val: any) => void;
  handleUpdateLokasi: (id: number, val: LokasiOption) => void;
  handleDeleteItem: (id: number) => void;
  focusKodeBarangInput: () => void;
  isMitra?: boolean;
}

export const ScannedTableRow = memo(({
  item,
  dbBrands,
  dbCategories,
  dbModels,
  dbLocations,
  kuota,
  asalBarang,
  handleUpdateInline,
  handleUpdateLokasi,
  handleDeleteItem,
  focusKodeBarangInput,
  isMitra,
}: ScannedTableRowProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.nomor);
    setCopied(true);
    toast.success(`SN ${item.nomor} berhasil disalin!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold text-foreground">{item.nomor}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
              onClick={handleCopy}
              title="Salin Serial Number"
            >
              {copied ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {item.kondisi && (
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${
                item.kondisi.toLowerCase() === "rusak"
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : item.kondisi.toLowerCase() === "baru"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-violet-500/10 text-violet-600 border-violet-500/20"
              }`}>
                {item.kondisi.toUpperCase()}
              </Badge>
            )}
            {item.paNumber && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border">PA: {item.paNumber}</span>
            )}
            {item.ticketGangguan && (
              <span className="text-[10px] font-mono text-destructive bg-destructive/10 px-1 py-0.2 rounded border border-destructive/20">Tiket: {item.ticketGangguan}</span>
            )}
          </div>
          {item.catatan && (
            <span className="text-[11px] text-muted-foreground italic mt-0.5 truncate max-w-45" title={item.catatan}>Ket: {item.catatan}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {item.source === "Baru" ? (
          <Select value={item.merek} onValueChange={(val) => handleUpdateInline(item.id, "merek", val)}>
            <SelectTrigger className="w-30 h-8 text-sm"><SelectValue placeholder="Pilih Merek" /></SelectTrigger>
            <SelectContent>
              {dbBrands.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-1.5"><Lock className="size-3 text-muted-foreground" />{item.merek}</div>
        )}
      </TableCell>
      <TableCell>
        {item.source === "Baru" ? (
          <Select value={item.kategori} onValueChange={(val) => handleUpdateInline(item.id, "kategori", val)}>
            <SelectTrigger className="w-30 h-8 text-xs"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
            <SelectContent>
              {dbCategories.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="font-normal px-2.5 py-0.5 flex w-fit items-center gap-1.5"><Lock className="size-3 text-muted-foreground" />{item.kategori}</Badge>
        )}
      </TableCell>
      <TableCell>
        {item.source === "Baru" ? (
          <div className="flex flex-col gap-1">
            <Select value={item.tipe} onValueChange={(val) => handleUpdateInline(item.id, "tipe", val)}>
              <SelectTrigger className={`w-35 h-8 text-xs ${!item.tipe ? "border-destructive text-destructive" : ""}`}><SelectValue placeholder="Pilih Model" /></SelectTrigger>
              <SelectContent>
                {dbModels.filter(m => (m.brand?.nama || m.brand?.name || "").toLowerCase() === item.merek.toLowerCase()).map(m => <SelectItem key={m.id} value={m.nama}>{m.nama}</SelectItem>)}
              </SelectContent>
            </Select>
            {item.panjangKabel && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit">
                {item.panjangKabel}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5"><Lock className="size-3 text-muted-foreground" />{item.tipe || "-"}</div>
            {item.panjangKabel && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit">
                {item.panjangKabel}
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>{item.asal || asalBarang}</TableCell>
      <TableCell>
        {isMitra ? (
          <div className="font-medium text-sm text-foreground">Gudang KP Tasikmalaya</div>
        ) : (
          <Select
            value={item.lokasi}
            onValueChange={(value) => {
              const selectedLokasi = value as LokasiOption;
              handleUpdateLokasi(item.id, selectedLokasi);
              focusKodeBarangInput();
            }}
          >
            <SelectTrigger className="w-220px">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {!dbLocations.some((lokasi) => lokasi.name === item.lokasi) && (
                  <SelectItem value={item.lokasi}>
                    {item.lokasi}
                  </SelectItem>
                )}
                {dbLocations.map((lokasi) => {
                  const isDisabled = kuota[lokasi.name] <= 0;
                  return (
                    <SelectItem
                      key={lokasi.name}
                      value={lokasi.name}
                      disabled={isDisabled}
                    >
                      {lokasi.name}{isDisabled ? " (Kuota penuh)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => handleDeleteItem(item.id)}
        >
          <X className="size-4" />
          <span className="sr-only">Hapus item</span>
        </Button>
      </TableCell>
    </TableRow>
  );
});
