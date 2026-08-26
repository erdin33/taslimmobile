"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Boxes,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Download,
  Copy,
  Check,
  MapPin,
  Calendar,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/lib/auth"

import { BarangDetailDrawer } from "@/components/data-barang/BarangDetailDrawer"
import { BarangFormModal } from "@/components/data-barang/BarangFormModal"
import { ExportExcelModal } from "@/components/data-barang/ExportExcelModal"
import { formatItemLocation } from "@/lib/status-helper"
import { saveExportFile } from "@/lib/export-file"
import * as XLSX from "xlsx"

import type { StatusUnit, BarangUnit, StorageLocationOption } from "@/types/inventory"
import type { DeleteDialogState } from "@/types/ui"

const STATUS_OPTIONS: StatusUnit[] = ["Tersedia", "Terdistribusi", "Rusak", "Hilang"]
const ADMIN_LOCATION = "KP Tasikmalaya"

const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/"
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

const getHeaders = () => {
  const token = localStorage.getItem("taslim-auth-token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `${token}`
  }
  return headers
}

export default function DataBarangPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [barangList, setBarangList] = useState<BarangUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterBrand, setFilterBrand] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  const [dbLocations, setDbLocations] = useState<StorageLocationOption[]>([])
  const [copiedSN, setCopiedSN] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Drawer detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailBarang, setDetailBarang] = useState<BarangUnit | null>(null)

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [formMode, setFormMode] = useState<"add" | "edit">("add")
  const [selectedBarang, setSelectedBarang] = useState<BarangUnit | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    serialNumber: "",
    kategori: "",
    merek: "",
    tipe: "",
    status: "Tersedia" as StatusUnit,
    lokasiPenyimpanan: "",
    tanggalMasuk: "",
    tanggalKeluar: "",
  })

  // Load auxiliary data (Categories & Locations) once
  useEffect(() => {
    const fetchAuxiliary = async () => {
      try {
        const [resCat, resLoc] = await Promise.all([
          fetch(`${getBaseUrl()}/categories`, { method: "GET", headers: getHeaders() }),
          fetch(`${getBaseUrl()}/locations`, { method: "GET", headers: getHeaders() }),
        ])

        if (resCat.ok) {
          const rawCat = await resCat.json()
          const catData = rawCat.data || rawCat
          if (Array.isArray(catData)) {
            setCategories(catData.map((c: any) => c.nama || c.name || ""))
          }
        }

        if (resLoc.ok) {
          const rawLoc = await resLoc.json()
          const locationsData = rawLoc.data || rawLoc
          const locs: StorageLocationOption[] = []
          if (Array.isArray(locationsData)) {
            const isMitraRole = user?.role === "mitra"
            const normKp = ADMIN_LOCATION.trim().toLowerCase()
            locationsData.forEach((loc: any) => {
              const owner = loc.owner || ADMIN_LOCATION
              const normOwner = owner.trim().toLowerCase()
              if (
                !isMitraRole &&
                (normOwner !== normKp && normOwner !== "kp" ||
                  loc.type === "Partner" ||
                  loc.type === "PARTNER" ||
                  loc.name.toUpperCase().startsWith("PT ") ||
                  loc.name.toUpperCase().startsWith("PT."))
              ) {
                return
              }
              if (loc.type === "Rak" && loc.levels) {
                loc.levels.forEach((lvl: any) =>
                  locs.push({ name: `${loc.name} - ${lvl.name}`, owner })
                )
              } else {
                locs.push({ name: loc.name, owner })
              }
            })
            setDbLocations(locs)
          }
        }
      } catch (err) {
        console.error("Gagal memuat kategori/lokasi:", err)
      }
    }

    fetchAuxiliary()
  }, [])

  // Load main paginated items list
  const loadItems = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", currentPage.toString())
      params.append("limit", pageSize.toString())
      if (searchTerm.trim()) params.append("search", searchTerm.trim())
      if (filterStatus !== "all") params.append("status", filterStatus)
      if (filterCategory !== "all") params.append("kategori", filterCategory)
      if (filterBrand !== "all") params.append("merek", filterBrand)

      const res = await fetch(`${getBaseUrl()}/items?${params.toString()}`, {
        method: "GET",
        headers: getHeaders(),
      })

      if (!res.ok) throw new Error("Gagal memuat data barang")

      const result = await res.json()
      if (result && Array.isArray(result.data)) {
        setBarangList(result.data)
        setTotalItems(result.pagination?.totalItems || result.data.length)
        setTotalPages(result.pagination?.totalPages || 1)

        const extractedBrands = Array.from(
          new Set(result.data.map((item: BarangUnit) => item.merek).filter(Boolean))
        ) as string[]
        if (extractedBrands.length > 0) {
          setBrands((prev) => Array.from(new Set([...prev, ...extractedBrands])))
        }
      } else {
        setBarangList(Array.isArray(result) ? result : [])
        setTotalItems(Array.isArray(result) ? result.length : 0)
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Gagal memuat data:", error)
      toast.error("Gagal memuat data barang")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [user, currentPage, pageSize, searchTerm, filterStatus, filterCategory, filterBrand])

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterCategory, filterBrand, pageSize])

  const handleOpenDetail = (barang: BarangUnit) => {
    setDetailBarang(barang)
    setIsDetailOpen(true)
  }

  const handleOpenEdit = (barang: BarangUnit) => {
    setFormMode("edit")
    setSelectedBarang(barang)
    setFormData({
      serialNumber: barang.serialNumber,
      kategori: barang.kategori,
      merek: barang.merek,
      tipe: barang.tipe || "",
      status: barang.status,
      lokasiPenyimpanan: barang.lokasiPenyimpanan.trim(),
      tanggalMasuk: barang.tanggalMasuk,
      tanggalKeluar: barang.tanggalKeluar || "",
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const handleCopySN = (sn: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(sn)
    setCopiedSN(sn)
    toast.success(`SN ${sn} berhasil disalin!`)
    setTimeout(() => {
      setCopiedSN(null)
    }, 2000)
  }

  const handleExportExcel = async (selectedColumns: string[]) => {
    setIsExporting(true)
    try {
      const dataToExport = barangList

      if (dataToExport.length === 0) {
        toast.error("Tidak ada data untuk diekspor.")
        setIsExporting(false)
        return
      }

      const rows = dataToExport.map((item, index) => {
        const row: Record<string, any> = {}
        selectedColumns.forEach((colKey) => {
          switch (colKey) {
            case "no":
              row["No"] = index + 1
              break
            case "serialNumber":
              row["Serial Number"] = item.serialNumber
              break
            case "merek":
              row["Merek"] = item.merek || "-"
              break
            case "kategori":
              row["Kategori"] = item.kategori || "-"
              break
            case "tipe":
              row["Tipe/Model"] = item.tipe || "-"
              break
            case "status":
              row["Status"] = item.status
              break
            case "lokasi":
              row["Lokasi"] = item.lokasiPenyimpanan
              break
            case "tanggalMasuk":
              row["Tanggal Masuk"] = formatTanggal(item.tanggalMasuk)
              break
            case "tanggalKeluar":
              row["Tanggal Keluar"] = formatTanggal(item.tanggalKeluar || "")
              break
            default:
              break
          }
        })
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Barang")

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const fileName = `Data_Barang_${new Date().toISOString().split("T")[0]}.xlsx`
      await saveExportFile({ contents: excelBuffer, fileName })
      toast.success("File Excel berhasil diunduh!")
      setIsExportModalOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error("Gagal mengekspor file Excel.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = (id: string, sn: string) => {
    setDeleteDialog({
      type: "single",
      ids: [id],
      serialNumber: sn,
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog || deleteDialog.ids.length === 0) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${getBaseUrl()}/items/${deleteDialog.ids[0]}`, {
        method: "DELETE",
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error("Gagal menghapus unit.")
      toast.success(`Unit ${"serialNumber" in deleteDialog ? deleteDialog.serialNumber : deleteDialog.ids.length} berhasil dihapus.`)
      setDeleteDialog(null)
      loadItems()
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus unit.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const errors: Record<string, string> = {}
    const lokasiPenyimpanan = formData.lokasiPenyimpanan.trim()

    if (!formData.serialNumber.trim()) errors.serialNumber = "Serial number wajib diisi"
    if (!formData.kategori.trim()) errors.kategori = "Kategori wajib diisi"
    if (!formData.merek.trim()) errors.merek = "Merek barang wajib diisi"
    if (!lokasiPenyimpanan) errors.lokasiPenyimpanan = "Lokasi penyimpanan wajib diisi"
    if (!formData.tanggalMasuk.trim()) errors.tanggalMasuk = "Tanggal masuk wajib diisi"

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Gagal menyimpan. Silakan periksa kembali form Anda.")
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        serialNumber: formData.serialNumber.toUpperCase(),
        kategori: formData.kategori,
        merek: formData.merek,
        tipe: formData.tipe || undefined,
        status: formData.status,
        lokasiPenyimpanan,
        tanggalMasuk: formData.tanggalMasuk,
        tanggalKeluar: formData.tanggalKeluar || undefined,
        mitra: user?.role === "mitra" ? user.displayName : ADMIN_LOCATION,
      }

      if (formMode === "add") {
        const resAdd = await fetch(`${getBaseUrl()}/items`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        })
        if (!resAdd.ok) throw new Error("Gagal menyimpan unit.")
        toast.success(`Unit baru berhasil didaftarkan!`)
      } else {
        const resUpdate = await fetch(`${getBaseUrl()}/items/${selectedBarang!.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        })
        if (!resUpdate.ok) throw new Error("Gagal memperbarui unit.")
        toast.success(`Unit berhasil diperbarui!`)
      }

      setIsFormOpen(false)
      loadItems()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan unit.")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadgeProps = (status: StatusUnit, lokasi?: string) => {
    const loc = (lokasi || "").trim().toLowerCase()
    if (loc === "keluar" || loc === "diluar") {
      return { text: "Keluar", dotClass: "bg-sky-500", badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400" }
    }

    switch (status) {
      case "Tersedia":
        return { text: "Tersedia", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
      case "Terdistribusi":
        return { text: "Terdistribusi", dotClass: "bg-blue-500", badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" }
      case "Dismantle":
        return { text: "Dismantle", dotClass: "bg-purple-500", badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400" }
      case "Rusak":
        return { text: "Rusak", dotClass: "bg-destructive", badgeClass: "bg-destructive/15 text-destructive" }
      case "Hilang":
      default:
        return { text: "Hilang", dotClass: "bg-amber-500", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" }
    }
  }

  const formatTanggal = (tgl: string) => {
    if (!tgl) return "-"
    const date = new Date(tgl)
    if (isNaN(date.getTime())) return tgl
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  }

  const isFiltered = searchTerm.trim().length > 0 || filterStatus !== "all" || filterCategory !== "all" || filterBrand !== "all"

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Data Barang</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total {totalItems} unit inventaris terdaftar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </Button>
            {user?.role === "admin" && (
              <Button
                size="sm"
                className="h-8 gap-1.5 font-semibold text-xs shadow-sm"
                onClick={() => {
                  setFormMode("add")
                  setIsFormOpen(true)
                }}
              >
                <Plus className="size-3.5" />
                <span>Tambah</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari Serial Number (SN), merek, atau tipe..."
            className="pl-9 pr-8 bg-card border-border/70 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Horizontal Status Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Semua ({totalItems})
          </button>
          {STATUS_OPTIONS.map((st) => {
            const isSelected = filterStatus === st
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(isSelected ? "all" : st)}
                className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    st === "Tersedia"
                      ? "bg-emerald-500"
                      : st === "Terdistribusi"
                      ? "bg-blue-500"
                      : st === "Rusak"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
                {st}
              </button>
            )
          })}
        </div>

        {/* Secondary Category & Brand Selectors */}
        {(categories.length > 0 || brands.length > 0) && (
          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs bg-card border-border/70 flex-1">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {brands.length > 0 && (
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="h-8 text-xs bg-card border-border/70 flex-1">
                  <SelectValue placeholder="Semua Merek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Merek</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-border/40 bg-card space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
              </div>
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : barangList.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="size-14 rounded-full bg-muted/40 border flex items-center justify-center mb-3 text-muted-foreground">
              <Boxes className="size-7" strokeWidth={1.8} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {isFiltered ? "Tidak ada unit yang cocok" : "Belum ada data barang"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {isFiltered
                ? "Coba ubah kata kunci pencarian atau filter status/kategori yang sedang aktif."
                : "Klik tombol Tambah Barang di atas untuk mendaftarkan unit baru."}
            </p>
          </div>
        ) : (
          barangList.map((item) => {
            const badge = getStatusBadgeProps(item.status, item.lokasiPenyimpanan)
            const isThisCopied = copiedSN === item.serialNumber

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="group relative bg-card border border-border/70 rounded-2xl p-4 shadow-xs hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer overflow-hidden flex flex-col gap-2.5"
              >
                {/* Header: SN Badge with Copy Button + Status Badge */}
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-foreground">
                    <span>SN: {item.serialNumber}</span>
                    <button
                      onClick={(e) => handleCopySN(item.serialNumber, e)}
                      className="p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Salin SN"
                    >
                      {isThisCopied ? (
                        <Check className="size-3 text-emerald-500 scale-110 transition-transform" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {(() => {
                      const itemKondisi = (item as any).kondisi || (item.status === "Rusak" ? "Rusak" : item.status === "Dismantle" ? "Dismantle" : "Baru");
                      const isRusak = itemKondisi.toLowerCase() === "rusak";
                      const isDismantle = itemKondisi.toLowerCase() === "dismantle";
                      return (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 font-medium ${
                            isRusak
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : isDismantle
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}
                        >
                          {itemKondisi}
                        </Badge>
                      );
                    })()}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-medium border-0 ${badge.badgeClass}`}
                    >
                      <span className={`inline-block size-1.5 rounded-full mr-1 ${badge.dotClass}`} />
                      {badge.text}
                    </Badge>

                    {user?.role === "admin" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleOpenEdit(item)} className="cursor-pointer">
                            <Edit className="size-4 mr-2" />
                            <span>Edit Unit</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(item.id, item.serialNumber)}
                            className="cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" />
                            <span>Hapus Unit</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Title: Category, Brand, & Model */}
                <div>
                  <h3 className="font-bold text-sm text-foreground leading-tight">
                    {item.kategori || "Barang"} {item.merek ? `(${item.merek})` : ""}
                  </h3>
                  {item.tipe && item.tipe !== "-" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Model: <span className="font-medium text-foreground/80">{item.tipe}</span>
                    </p>
                  )}
                </div>

                {/* Body Details: Lokasi & Tanggal */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="truncate text-foreground/90 font-medium">
                      {formatItemLocation(item.status, item.lokasiPenyimpanan)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="size-3 text-muted-foreground/70" />
                    <span className="text-[11px]">{formatTanggal(item.tanggalMasuk)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 px-1 text-xs shrink-0">
        <div className="text-muted-foreground">
          Hal. <strong className="text-foreground">{currentPage}</strong> dari {totalPages} ({totalItems} unit)
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <BarangDetailDrawer
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        detailBarang={detailBarang}
        userRole={user?.role}
        onOpenEdit={handleOpenEdit}
        getStatusBadgeProps={getStatusBadgeProps}
        formatTanggal={formatTanggal}
        ADMIN_LOCATION={ADMIN_LOCATION}
        getBaseUrl={getBaseUrl}
        getHeaders={getHeaders}
      />

      {/* Form Modal (Now Centered Dialog) */}
      <BarangFormModal
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        formMode={formMode}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        isSaving={isSaving}
        onSubmit={handleSubmitForm}
        categories={categories}
        availableFormLocations={dbLocations}
        STATUS_OPTIONS={STATUS_OPTIONS}
      />

      {/* Export Modal */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent className="w-[90%] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-destructive">
              Hapus {deleteDialog?.type === "single" ? `Unit ${deleteDialog.serialNumber}` : `${deleteDialog?.ids?.length || 0} Unit`}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Unit barang yang dihapus akan terhapus permanen dari sistem inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting} className="mt-0 text-xs">
              Batal
            </AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
