import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { StatusUnit, StorageLocationOption } from "@/types/inventory"

interface BarangFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  formMode: "add" | "edit"
  formData: {
    serialNumber: string
    kategori: string
    merek: string
    tipe: string
    status: StatusUnit
    lokasiPenyimpanan: string
    tanggalMasuk: string
    tanggalKeluar: string
  }
  setFormData: React.Dispatch<React.SetStateAction<{
    serialNumber: string
    kategori: string
    merek: string
    tipe: string
    status: StatusUnit
    lokasiPenyimpanan: string
    tanggalMasuk: string
    tanggalKeluar: string
  }>>
  formErrors: Record<string, string>
  isSaving: boolean
  onSubmit: (e: React.FormEvent) => void
  categories: string[]
  availableFormLocations: StorageLocationOption[]
  STATUS_OPTIONS: StatusUnit[]
}

export function BarangFormModal({
  isOpen,
  onOpenChange,
  formMode,
  formData,
  setFormData,
  formErrors,
  isSaving,
  onSubmit,
  categories,
  availableFormLocations,
  STATUS_OPTIONS,
}: BarangFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92%] sm:max-w-md rounded-2xl p-0 max-h-[85vh] flex flex-col border-border bg-popover text-foreground overflow-hidden">
        <form onSubmit={onSubmit} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/40 text-left shrink-0">
            <DialogTitle className="text-lg font-bold text-foreground">
              {formMode === "add" ? "Tambah Unit Baru" : "Edit Data Unit"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Isi parameter unit barang di bawah ini. Pastikan Serial Number unik.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 flex-1 overflow-y-auto space-y-3.5 text-xs">
            {/* Serial Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Serial Number (SN) *</Label>
              <Input
                placeholder="SN-XXXX-XXXX"
                value={formData.serialNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value.toUpperCase() }))}
                className="h-9 uppercase font-mono text-xs bg-background"
              />
              {formErrors.serialNumber && <p className="text-[11px] text-destructive font-medium">{formErrors.serialNumber}</p>}
            </div>

            {/* Kategori & Merek */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kategori *</Label>
                <Select
                  value={formData.kategori}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, kategori: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.kategori && <p className="text-[11px] text-destructive font-medium">{formErrors.kategori}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Merek *</Label>
                <Input
                  placeholder="Merek barang"
                  value={formData.merek}
                  onChange={(e) => setFormData((prev) => ({ ...prev, merek: e.target.value }))}
                  className="h-9 text-xs bg-background"
                />
                {formErrors.merek && <p className="text-[11px] text-destructive font-medium">{formErrors.merek}</p>}
              </div>
            </div>

            {/* Tipe / Model */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipe / Model (Opsional)</Label>
              <Input
                placeholder="Model / Varian barang"
                value={formData.tipe}
                onChange={(e) => setFormData((prev) => ({ ...prev, tipe: e.target.value }))}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Dropdown Terpisah Panjang Kabel jika Kategori Kabel */}
            {formData.kategori && (formData.kategori.toLowerCase().includes("kabel") || formData.kategori.toLowerCase().includes("dropcore") || formData.kategori.toLowerCase().includes("cable")) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-primary">Panjang Kabel (Meter)</Label>
                <Select
                  value={(formData as any).panjangKabel || "150 Meter"}
                  onValueChange={(val) => setFormData((prev: any) => ({ ...prev, panjangKabel: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-primary/5 border-primary/30 font-medium">
                    <SelectValue placeholder="Pilih Panjang Kabel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100 Meter">100 Meter</SelectItem>
                    <SelectItem value="150 Meter">150 Meter</SelectItem>
                    <SelectItem value="250 Meter">250 Meter</SelectItem>
                    <SelectItem value="300 Meter">300 Meter</SelectItem>
                    <SelectItem value="1000 Meter (Drum)">1000 Meter (Drum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Kondisi Material */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kondisi Material *</Label>
              <Select
                value={(formData as any).kondisi || "Baru"}
                onValueChange={(val) => setFormData((prev: any) => ({ ...prev, kondisi: val }))}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Pilih Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baru">Baru</SelectItem>
                  <SelectItem value="Dismantle">Dismantle</SelectItem>
                  <SelectItem value="Rusak">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kondisi Spesifik: PA atau Tiket */}
            {(formData as any).kondisi === "Dismantle" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nomor PA (Opsional)</Label>
                <Input
                  placeholder="Contoh: PA-2026-001"
                  value={(formData as any).paNumber || ""}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, paNumber: e.target.value }))}
                  className="h-9 text-xs bg-background font-mono"
                />
              </div>
            )}

            {(formData as any).kondisi === "Rusak" && (
              <div className="space-y-3 p-3 bg-red-500/5 rounded-xl border border-red-500/15">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-red-600 dark:text-red-400">Nomor Tiket Gangguan (Opsional)</Label>
                  <Input
                    placeholder="Contoh: INC-9823 / TIKET-4412"
                    value={(formData as any).ticketGangguan || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, ticketGangguan: e.target.value }))}
                    className="h-9 text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-red-600 dark:text-red-400">Keterangan Kerusakan</Label>
                  <Input
                    placeholder="Jelaskan detail kerusakan..."
                    value={(formData as any).catatan || ""}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, catatan: e.target.value }))}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            {/* Status & Lokasi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Unit *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val as StatusUnit }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lokasi Penyimpanan *</Label>
                <Select
                  value={formData.lokasiPenyimpanan}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, lokasiPenyimpanan: val }))}
                  disabled={formData.status === "Terdistribusi"}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Pilih Lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFormLocations.map((loc) => (
                      <SelectItem key={loc.name} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.lokasiPenyimpanan && (
                  <p className="text-[11px] text-destructive font-medium">{formErrors.lokasiPenyimpanan}</p>
                )}
              </div>
            </div>

            {/* Tanggal Masuk & Keluar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Masuk *</Label>
                <Input
                  type="date"
                  value={formData.tanggalMasuk}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tanggalMasuk: e.target.value }))}
                  className="h-9 text-xs bg-background"
                />
                {formErrors.tanggalMasuk && <p className="text-[11px] text-destructive font-medium">{formErrors.tanggalMasuk}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Keluar (Opsional)</Label>
                <Input
                  type="date"
                  value={formData.tanggalKeluar}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tanggalKeluar: e.target.value }))}
                  className="h-9 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/50 bg-muted/40 flex flex-row justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 font-semibold"
            >
              {isSaving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {formMode === "add" ? "Simpan Unit" : "Perbarui Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
