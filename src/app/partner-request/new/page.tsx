import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Plus, Trash2, Loader2, Send, ArrowLeft,
  Check, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryOption = { id: number | string; name: string }
type BrandOption = { id: number | string; name: string }

type ItemRow = {
  id: number
  categoryId: string
  brandId: string
  cableLength?: string
  quantity: string
}

type FormErrors = {
  items: Record<number, { categoryId?: string; brandId?: string; cableLength?: string; quantity?: string }>
}

type PreviewItem = {
  categoryName: string
  brandName: string
  cableLength?: string
  quantity: string
}

// ─── Helper Functions ────────────────────────────────────────────────────────

const createEmptyRow = (id: number): ItemRow => ({
  id,
  categoryId: "",
  brandId: "",
  cableLength: "150 Meter",
  quantity: "",
})

const getOptionName = (opt: Record<string, unknown>): string => {
  for (const key of ["name", "nama", "title", "label"]) {
    if (typeof opt[key] === "string") return opt[key] as string
  }
  return ""
}

const unwrapArray = (val: unknown, keyName: string): unknown[] => {
  if (Array.isArray(val)) return val
  if (val && typeof val === "object") {
    const payload = val as Record<string, unknown>
    if (Array.isArray(payload[keyName])) return payload[keyName] as unknown[]
    for (const key of ["data", "items", "results"]) {
      if (Array.isArray(payload[key])) return payload[key] as unknown[]
    }
  }
  return []
}

const getSubmitErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const payload = error as Record<string, unknown>
    const data = payload.response && typeof payload.response === "object"
      ? (payload.response as Record<string, unknown>).data
      : null
    if (data && typeof data === "object") {
      const errObj = data as Record<string, unknown>
      for (const key of ["message", "error", "err"]) {
        if (typeof errObj[key] === "string") return errObj[key] as string
      }
    }
    for (const key of ["message", "error"]) {
      if (typeof payload[key] === "string") return payload[key] as string
    }
  }
  if (error instanceof Error && error.message && error.message !== "Failed to fetch")
    return error.message
  return "Gagal mengirim permintaan. Periksa koneksi Anda."
}
// ─── Success Dialog ───────────────────────────────────────────────────────────

type SuccessDialogProps = {
  open: boolean
  onGoToHistory: () => void
  onClose: () => void
  items: PreviewItem[]
  requesterName: string
  notes: string
}

function SuccessDialog({ open, onGoToHistory, onClose, items, requesterName, notes }: SuccessDialogProps) {
  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto p-0 bg-background border border-border/50 shadow-2xl rounded-3xl" showCloseButton={false}>
        
        {/* Close Button X */}
        <button
          className="absolute right-4 top-4 z-20 rounded-full p-2 bg-white/50 backdrop-blur-md md:bg-transparent hover:bg-slate-200/80 dark:bg-black/30 dark:hover:bg-white/10 transition-all cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        </button>

        <div className="flex flex-col md:grid md:grid-cols-12 min-h-[480px]">
          
          {/* Top/Left Panel: Status & Congratulations */}
          <div className="md:col-span-5 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-background to-background p-8 flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Background Glow Effect */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none"></div>

            {/* Circular Green Tick with Pulse */}
            <div className="relative flex items-center justify-center z-10 mt-2 md:mt-0">
              <div className="h-24 w-24 rounded-full bg-emerald-500/15 flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="h-8 w-8 text-white stroke-[3.5px] animate-in zoom-in-50 duration-500 delay-150" />
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2.5 z-10">
              <DialogTitle className="text-xl md:text-2xl font-black text-foreground tracking-tight leading-tight">
                Permintaan Berhasil<br/>Diajukan!
              </DialogTitle>
              <DialogDescription className="text-[13px] md:text-sm text-muted-foreground px-2 md:px-0 leading-relaxed font-medium">
                Data telah terkirim ke sistem admin dan sedang menunggu validasi & persetujuan.
              </DialogDescription>
            </div>

            {/* Actions Stack (Moved here for desktop, hidden on mobile for better flow) */}
            <div className="hidden md:flex w-full flex-col space-y-3 pt-6 z-10">
              <Button
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                onClick={onGoToHistory}
              >
                Lihat Riwayat Permintaan
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 border-border/60 hover:bg-muted text-foreground font-semibold rounded-xl transition-all cursor-pointer"
                onClick={onClose}
              >
                Ajukan Permintaan Baru
              </Button>
            </div>

          </div>

          {/* Bottom/Right Panel: Summary & Details */}
          <div className="md:col-span-7 bg-muted/20 p-6 md:p-8 relative flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/50">
            
            <div className="space-y-6">
              <h4 className="font-bold text-foreground text-lg leading-none mt-1 md:mt-0">
                Ringkasan Permintaan
              </h4>

              {/* Metadata Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Pengaju (Mitra)
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {requesterName}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Keterangan
                  </span>
                  <p className="text-sm font-semibold text-foreground line-clamp-2 truncate max-w-full">
                    {notes || "Tidak ada catatan"}
                  </p>
                </div>
              </div>

              {/* Items Card List */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4 shadow-sm">
                <div className="max-h-[160px] overflow-y-auto pr-1 space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm pb-3 border-b border-border/50 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground">{item.categoryName}</span>
                        <span className="text-xs text-muted-foreground font-medium">{item.brandName}</span>
                      </div>
                      <span className="font-bold text-foreground bg-muted px-2.5 py-1 rounded-md">{item.quantity} Unit</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/50 font-black text-emerald-600 dark:text-emerald-400 text-[15px]">
                  <span>TOTAL ITEM</span>
                  <span>{totalQuantity} Unit</span>
                </div>
              </div>

              {/* Secondary Statistics Details */}
              <div className="flex flex-col gap-2.5 text-xs text-muted-foreground bg-card p-4 rounded-2xl border border-border/60 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Kategori Material</span>
                  <span className="font-bold text-foreground">{items.length} Kategori</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Tanggal Pengajuan</span>
                  <span className="font-bold text-foreground">{todayFormatted}</span>
                </div>
              </div>

              {/* Status on mobile inside the flow */}
              <div className="flex flex-row justify-between items-center md:hidden pt-2 bg-emerald-500/5 px-4 py-3 rounded-2xl border border-emerald-500/20">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-black">
                  Status
                </span>
                <span className="text-[17px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight animate-pulse">
                  MENUNGGU
                </span>
              </div>
            </div>

            {/* Desktop Status highlighting */}
            <div className="hidden md:flex flex-col items-end border-t border-border/50 pt-5 mt-6">
              <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">
                Status Permintaan
              </span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
                MENUNGGU
              </span>
            </div>

            {/* Mobile Actions Stack */}
            <div className="flex md:hidden w-full flex-col space-y-3 pt-6 mt-auto">
              <Button
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                onClick={onGoToHistory}
              >
                Lihat Riwayat Permintaan
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 bg-card border-border hover:bg-muted text-foreground font-bold rounded-xl transition-all cursor-pointer"
                onClick={onClose}
              >
                Ajukan Permintaan Baru
              </Button>
            </div>

          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PartnerRequestNewPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form state
  const [items, setItems] = useState<ItemRow[]>([createEmptyRow(1)])
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<FormErrors>({ items: {} })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dialog state — untuk preview BAST draft sebelum dikirim
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Dropdown data
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  // ── Fetch dropdowns ──────────────────────────────────────────────────────
  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true)
    setDropdownError(null)
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get("/categories"),
        api.get("/brands"),
      ])

      const categoryOptions = unwrapArray(catRes.data, "categories")
        .map((raw) => {
          const o = raw as Record<string, unknown>
          return { id: o.id as number | string, name: getOptionName(o) }
        })
        .filter((o) => o.id !== undefined && o.id !== null && o.name)

      const brandOptions = unwrapArray(brandRes.data, "brands")
        .map((raw) => {
          const o = raw as Record<string, unknown>
          return { id: o.id as number | string, name: getOptionName(o) }
        })
        .filter((o) => o.id !== undefined && o.id !== null && o.name)

      setCategories(categoryOptions)
      setBrands(brandOptions)

      if (categoryOptions.length === 0 || brandOptions.length === 0)
        setDropdownError("Data kategori atau merek belum tersedia. Muat ulang data sebelum mengirim permintaan.")
    } catch (err: any) {
      setCategories([])
      setBrands([])
      const msg = err?.message || "Gagal memuat data kategori / merek. Silakan coba lagi."
      setDropdownError(msg)
      toast.error(msg)
    } finally {
      setLoadingDropdowns(false)
    }
  }, [])

  useEffect(() => { fetchDropdowns() }, [fetchDropdowns])

  // ── Item row handlers ────────────────────────────────────────────────────
  const addRow = () => setItems((prev) => [...prev, createEmptyRow(Date.now())])

  const removeRow = (id: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((r) => r.id !== id))
    setErrors((prev) => {
      const next = { ...prev.items }
      delete next[id]
      return { ...prev, items: next }
    })
  }

  const updateRow = (id: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    if (field === "categoryId" || field === "brandId" || field === "quantity") {
      setErrors((prev) => ({
        ...prev,
        items: { ...prev.items, [id]: { ...prev.items[id], [field]: undefined } },
      }))
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = { items: {} }
    let valid = true

    items.forEach((row) => {
      const rowErrors: { categoryId?: string; brandId?: string; quantity?: string } = {}
      if (!row.categoryId) {
        rowErrors.categoryId = "Kategori wajib dipilih"; valid = false
      } else if (!Number.isFinite(Number(row.categoryId))) {
        rowErrors.categoryId = "Kategori tidak valid"; valid = false
      }
      if (!row.brandId) {
        rowErrors.brandId = "Merek wajib dipilih"; valid = false
      } else if (!Number.isFinite(Number(row.brandId))) {
        rowErrors.brandId = "Merek tidak valid"; valid = false
      }
      const qty = Number(row.quantity)
      if (!row.quantity || !Number.isFinite(qty) || qty <= 0) {
        rowErrors.quantity = "Jumlah harus lebih dari 0"; valid = false
      }
      if (Object.keys(rowErrors).length > 0) newErrors.items[row.id] = rowErrors
    })

    setErrors(newErrors)
    return valid
  }

  // ── Submit: Validasi → POST /requests → tampilkan success popup ───────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error("Sesi pengguna tidak valid. Silakan login ulang.")
      return
    }
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const cableDetails = items
        .filter((r) => {
          const cat = categories.find((c) => String(c.id) === String(r.categoryId))
          return cat && (cat.name.toLowerCase().includes("kabel") || cat.name.toLowerCase().includes("dropcore") || cat.name.toLowerCase().includes("cable"))
        })
        .map((r) => {
          const cat = categories.find((c) => String(c.id) === String(r.categoryId))
          return `${cat?.name || "Kabel"} (${r.cableLength || "150 Meter"}) x ${r.quantity}`
        })

      const finalNotes = [
        notes.trim(),
        cableDetails.length > 0 ? `[Spesifikasi Kabel: ${cableDetails.join(", ")}]` : ""
      ].filter(Boolean).join("\n")

      const payload = {
        requesterId: user.id,
        notes: finalNotes,
        items: items.map((row) => ({
          materialCategoryId: Number(row.categoryId),
          brandId: Number(row.brandId),
          quantity: Number(row.quantity),
        })),
      }

      await api.post("/requests", payload)
      setShowSuccessModal(true)
    } catch (err) {
      toast.error(getSubmitErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Reset form untuk ajukan permintaan baru ──────────────────────────────
  const handleResetForm = () => {
    setItems([createEmptyRow(Date.now())])
    setNotes("")
    setErrors({ items: {} })
    setShowSuccessModal(false)
  }

  // Generate item preview list
  const previewItems: PreviewItem[] = items.map((row) => {
    const cat = categories.find((c) => String(c.id) === String(row.categoryId))
    const brand = brands.find((b) => String(b.id) === String(row.brandId))
    const isCable = cat && (cat.name.toLowerCase().includes("kabel") || cat.name.toLowerCase().includes("dropcore") || cat.name.toLowerCase().includes("cable"))
    return {
      categoryName: cat?.name ? (isCable && row.cableLength ? `${cat.name} (${row.cableLength})` : cat.name) : "-",
      brandName: brand?.name || "-",
      cableLength: row.cableLength,
      quantity: row.quantity,
    }
  })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 cursor-pointer"
          onClick={() => navigate("/partner-request/history")}
          aria-label="Kembali ke riwayat"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Ajukan Permintaan
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Silakan isi rincian material yang ingin dipesan ke Gudang Pusat.
        </p>
      </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Item rows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Daftar Item</CardTitle>
            <CardDescription>Tambahkan satu atau lebih item yang dibutuhkan</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loadingDropdowns ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Memuat data kategori &amp; merek...</span>
              </div>
            ) : (
              <>
                {dropdownError && (
                  <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
                    <span>{dropdownError}</span>
                    <Button type="button" variant="outline" size="sm" className="self-start cursor-pointer sm:self-auto" onClick={fetchDropdowns}>
                      Muat Ulang
                    </Button>
                  </div>
                )}

                {items.map((row, idx) => {
                  const selectedCat = categories.find((c) => String(c.id) === String(row.categoryId))
                  const isCable = selectedCat && (
                    selectedCat.name.toLowerCase().includes("kabel") ||
                    selectedCat.name.toLowerCase().includes("dropcore") ||
                    selectedCat.name.toLowerCase().includes("cable")
                  )

                  return (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3.5 border border-border/80 rounded-2xl p-4 bg-muted/20 shadow-xs"
                    >
                      {/* Card Header with Item Number and Remove Button */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          Barang #{idx + 1}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          disabled={items.length <= 1}
                          onClick={() => removeRow(row.id)}
                          aria-label="Hapus item"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Hapus
                        </Button>
                      </div>

                      {/* Card Inputs Grid */}
                      <div className={`grid grid-cols-1 ${isCable ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-3"} gap-3.5 items-start`}>
                        {/* Category */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Kategori <span className="text-destructive">*</span>
                          </Label>
                          <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, "categoryId", v)}>
                            <SelectTrigger id={`cat-${row.id}`} className={errors.items[row.id]?.categoryId ? "border-destructive" : ""}>
                              <SelectValue placeholder="Pilih kategori..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.length > 0 ? (
                                categories.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada kategori</div>
                              )}
                            </SelectContent>
                          </Select>
                          {errors.items[row.id]?.categoryId && (
                            <p className="text-xs text-destructive">{errors.items[row.id].categoryId}</p>
                          )}
                        </div>

                        {/* Brand */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Merek <span className="text-destructive">*</span>
                          </Label>
                          <Select value={row.brandId} onValueChange={(v) => updateRow(row.id, "brandId", v)}>
                            <SelectTrigger id={`brand-${row.id}`} className={errors.items[row.id]?.brandId ? "border-destructive" : ""}>
                              <SelectValue placeholder="Pilih merek..." />
                            </SelectTrigger>
                            <SelectContent>
                              {brands.length > 0 ? (
                                brands.map((b) => (
                                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada merek</div>
                              )}
                            </SelectContent>
                          </Select>
                          {errors.items[row.id]?.brandId && (
                            <p className="text-xs text-destructive">{errors.items[row.id].brandId}</p>
                          )}
                        </div>

                        {/* Cable Length Dropdown if Cable */}
                        {isCable ? (
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-primary font-semibold">
                              Panjang (Meter) <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={row.cableLength || "150 Meter"}
                              onValueChange={(v) => updateRow(row.id, "cableLength", v)}
                            >
                              <SelectTrigger className="bg-primary/5 border-primary/30 font-medium text-xs">
                                <SelectValue placeholder="Pilih Panjang" />
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
                        ) : null}

                        {/* Quantity */}
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`qty-${row.id}`} className="text-xs font-semibold text-muted-foreground">
                            Jumlah <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`qty-${row.id}`}
                            type="number"
                            min="1"
                            step="1"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                            className={errors.items[row.id]?.quantity ? "border-destructive" : ""}
                          />
                          {errors.items[row.id]?.quantity && (
                            <p className="text-xs text-destructive">{errors.items[row.id].quantity}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <Button type="button" variant="outline" size="sm" className="self-start gap-1.5 cursor-pointer" onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detail Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea
                id="notes"
                placeholder="Tambahkan catatan atau keterangan tambahan untuk admin..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => navigate("/partner-request/history")}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="gap-2 cursor-pointer"
              disabled={isSubmitting || loadingDropdowns || categories.length === 0 || brands.length === 0}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Mengirim...</>
              ) : (
                <><Send className="h-4 w-4" />Kirim Permintaan</>
              )}
            </Button>
          </div>
        </div>
      </form>
      {/* Success Dialog — muncul SETELAH request berhasil dikirim */}
      <SuccessDialog
        open={showSuccessModal}
        onGoToHistory={() => navigate("/partner-request/history")}
        onClose={handleResetForm}
        items={previewItems}
        requesterName={user?.displayName || user?.username || "Mitra"}
        notes={notes.trim()}
      />
    </div>
  )
}
