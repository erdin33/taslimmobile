"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Boxes, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
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
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"
import { saveExportFile } from "@/lib/export-file"
import * as XLSX from "xlsx"
import { useAuth } from "@/lib/auth"
import { formatItemStatus, isItemMatchingStatus } from "@/lib/status-helper"

import { BarangFilterBar } from "@/components/data-barang/BarangFilterBar"
import { BarangTable } from "@/components/data-barang/BarangTable"
import { BarangDetailDrawer } from "@/components/data-barang/BarangDetailDrawer"
import { BarangFormModal } from "@/components/data-barang/BarangFormModal"
import { BarangMobileCards } from "@/components/data-barang/BarangMobileCards"
import { ExportExcelModal } from "@/components/data-barang/ExportExcelModal"

import type { StatusUnit, BarangUnit, StorageLocationOption } from "@/types/inventory"
import type { DeleteDialogState } from "@/types/ui"

const STATUS_OPTIONS: StatusUnit[] = ["Tersedia", "Terdistribusi", "Digunakan", "Rusak", "Dismantle"]
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

function EmptyBarangTableState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex min-h-60 items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
          <Boxes className="size-6" strokeWidth={1.8} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {isFiltered ? "Tidak ada unit yang cocok" : "Belum ada data barang"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isFiltered
              ? "Coba ubah kata kunci pencarian atau status filter yang sedang aktif."
              : "Data unit akan tampil di sini setelah barang masuk didaftarkan ke sistem."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DataBarangPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [barangList, setBarangList] = useState<BarangUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Cache semua item dari server — tidak perlu fetch ulang saat filter/search berubah
  const allItemsCache = useRef<BarangUnit[]>([])

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterBrand, setFilterBrand] = useState("all")
  const [filterMitra, setFilterMitra] = useState("all")
  const [dbPartners, setDbPartners] = useState<{ id: string; name: string }[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [dbLocations, setDbLocations] = useState<StorageLocationOption[]>([])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Drawer detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailBarang, setDetailBarang] = useState<BarangUnit | null>(null)

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"add" | "edit">("add")
  const [selectedBarang, setSelectedBarang] = useState<BarangUnit | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
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
              if (!isMitraRole && (normOwner !== normKp && normOwner !== "kp" || loc.type === "Partner" || loc.type === "PARTNER" || loc.name.toUpperCase().startsWith("PT ") || loc.name.toUpperCase().startsWith("PT."))) {
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

        // Ambil daftar mitra untuk filter admin
        if (user?.role !== "mitra") {
          const resUsers = await fetch(`${getBaseUrl()}/users`, { method: "GET", headers: getHeaders() }).catch(() => null)
          if (resUsers && resUsers.ok) {
            const uJson = await resUsers.json()
            const uList = Array.isArray(uJson.data) ? uJson.data : (Array.isArray(uJson) ? uJson : [])
            const partners = uList
              .filter((u: any) => (u.role || "").toUpperCase() === "MITRA")
              .map((u: any) => ({
                id: String(u.id),
                name: u.profile?.nama || u.profile?.name || u.displayName || u.name || u.username,
              }))
            setDbPartners(partners)
          }
        }
      } catch (err) {
        console.error("Gagal memuat kategori/lokasi/mitra:", err)
      }
    }

    fetchAuxiliary()
  }, [user?.role])

  // Terapkan filter + search + pagination ke dalam cache (tidak fetch ulang ke server)
  const applyFiltersAndPaginate = useCallback((page: number) => {
    let filtered = [...allItemsCache.current]

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      filtered = filtered.filter(item =>
        item.serialNumber?.toLowerCase().includes(q) ||
        item.tipe?.toLowerCase().includes(q) ||
        item.lokasiPenyimpanan?.toLowerCase().includes(q) ||
        item.merek?.toLowerCase().includes(q) ||
        item.kategori?.toLowerCase().includes(q) ||
        (item.mitra || "").toLowerCase().includes(q)
      )
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter(item => isItemMatchingStatus(item, filterStatus, user?.role))
    }
    if (filterMitra !== "all") {
      const normMitra = filterMitra.trim().toLowerCase()
      filtered = filtered.filter(item => (item.mitra || "").trim().toLowerCase() === normMitra)
    }
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => item.kategori?.toLowerCase() === filterCategory.toLowerCase())
    }
    if (filterBrand !== "all") {
      filtered = filtered.filter(item => item.merek?.toLowerCase() === filterBrand.toLowerCase())
    }

    setTotalItems(filtered.length)
    setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)))

    const startIndex = (page - 1) * pageSize
    setBarangList(filtered.slice(startIndex, startIndex + pageSize))
  }, [searchTerm, filterStatus, filterMitra, filterCategory, filterBrand, pageSize, user?.role])

  // Load items dari server (hanya saat awal atau setelah mutasi data)
  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "9999")

      const res = await fetch(`${getBaseUrl()}/items?${params.toString()}`, {
        method: "GET",
        headers: getHeaders(),
      })

      if (!res.ok) throw new Error("Gagal memuat data barang")

      const result = await res.json()
      const rawItems: BarangUnit[] = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : [])

      allItemsCache.current = rawItems

      // Populate brands from full dataset
      const extractedBrands = Array.from(
        new Set(rawItems.map((item: BarangUnit) => item.merek).filter(Boolean))
      ) as string[]
      if (extractedBrands.length > 0) {
        setBrands(prev => Array.from(new Set([...prev, ...extractedBrands])))
      }
    } catch (err) {
      console.error("Error loadItems:", err)
      toast.error("Gagal memuat data dari server.")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch data saat pertama kali atau setelah user berubah
  useEffect(() => {
    loadItems()
  }, [user])

  // Saat filter/search berubah: reset page ke 1 lalu terapkan filter
  useEffect(() => {
    setCurrentPage(1)
    applyFiltersAndPaginate(1)
  }, [searchTerm, filterStatus, filterMitra, filterCategory, filterBrand])

  // Saat page berubah: terapkan filter dengan page baru
  useEffect(() => {
    applyFiltersAndPaginate(currentPage)
  }, [currentPage])

  // Saat loading selesai (data baru dari server): terapkan filter
  useEffect(() => {
    if (!isLoading) {
      applyFiltersAndPaginate(currentPage)
    }
  }, [isLoading])

  const handleResetFilter = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterCategory("all")
    setFilterBrand("all")
    setFilterMitra("all")
    setCurrentPage(1)
  }

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

  const handleExportExcel = async (selectedColumns: string[]) => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", "0") // fetch all
      if (searchTerm.trim()) params.append("search", searchTerm.trim())
      if (filterStatus !== "all") params.append("status", filterStatus)
      if (filterCategory !== "all") params.append("kategori", filterCategory)
      if (filterBrand !== "all") params.append("merek", filterBrand)

      const res = await fetch(`${getBaseUrl()}/items?${params.toString()}`, {
        method: "GET",
        headers: getHeaders(),
      })

      if (!res.ok) throw new Error("Gagal mengambil data untuk ekspor.")
      const result = await res.json()
      const exportItems: BarangUnit[] = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : []

      if (exportItems.length === 0) {
        toast.error("Tidak ada data untuk diekspor.")
        setIsExporting(false)
        return
      }

      const mappedData = exportItems.map((item) => {
        const row: Record<string, any> = {}
        selectedColumns.forEach((colKey) => {
          switch (colKey) {
            case "serialNumber":
              row["Serial Number (SN)"] = item.serialNumber
              break
            case "kategori":
              row["Kategori Material"] = item.kategori
              break
            case "merek":
              row["Merek"] = item.merek
              break
            case "tipe":
              row["Model / Tipe"] = item.tipe || "-"
              break
            case "status":
              row["Status Barang"] = getStatusBadgeProps(item.status, item.lokasiPenyimpanan).text
              break
            case "lokasiPenyimpanan":
              row["Lokasi Penyimpanan"] = item.lokasiPenyimpanan
              break
            case "tanggalMasuk":
              row["Tanggal Masuk"] = item.tanggalMasuk ? new Date(item.tanggalMasuk).toLocaleDateString("id-ID") : "-"
              break
            case "tanggalKeluar":
              row["Tanggal Keluar"] = item.tanggalKeluar ? new Date(item.tanggalKeluar).toLocaleDateString("id-ID") : "-"
              break
            default:
              row[colKey] = (item as any)[colKey]
          }
        })
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(mappedData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Barang")

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const now = new Date()
      const fileName = `Data_Barang_Taslim_${now.toISOString().split("T")[0]}.xlsx`

      const exportRes = await saveExportFile({
        fileName,
        contents: excelBuffer,
      })

      if (exportRes.saved) {
        if (exportRes.path) {
          toast.success(`Berhasil mengekspor data ke ${exportRes.path}`)
        } else {
          toast.success("Berhasil mengekspor data.")
        }
        setIsExportModalOpen(false)
      } else {
        toast.error("Gagal mengekspor data.")
      }
    } catch (err) {
      console.error("Export error:", err)
      toast.error("Terjadi kesalahan saat mengekspor data.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = (id: string) => {
    const barang = barangList.find((b) => b.id === id)
    if (!barang) return
    setDeleteDialog({
      type: "single",
      ids: [id],
      serialNumber: barang.serialNumber,
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    setDeleteDialog({
      type: "bulk",
      ids: selectedIds,
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog || isDeleting) return
    const idsToDelete = deleteDialog.ids
    setIsDeleting(true)

    try {
      await Promise.all(
        idsToDelete.map(async (id) => {
          const res = await fetch(`${getBaseUrl()}/items/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          })
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.message || `Gagal menghapus item dengan ID ${id}`)
          }
        })
      )

      setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)))
      setDeleteDialog(null)
      toast.success(
        deleteDialog.type === "single"
          ? `Unit dengan SN ${deleteDialog.serialNumber} berhasil dihapus.`
          : `${idsToDelete.length} unit berhasil dihapus.`
      )
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
        if (!resAdd.ok) {
          const err = await resAdd.json().catch(() => ({}))
          throw new Error(err.message || "Gagal menyimpan unit.")
        }
        toast.success(`Unit baru dengan SN ${payload.serialNumber} berhasil didaftarkan!`)
      } else {
        const resUpdate = await fetch(`${getBaseUrl()}/items/${selectedBarang!.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        })
        if (!resUpdate.ok) {
          const err = await resUpdate.json().catch(() => ({}))
          throw new Error(err.message || "Gagal memperbarui unit.")
        }
        toast.success(`Unit dengan SN ${payload.serialNumber} berhasil diperbarui!`)
      }

      setIsFormOpen(false)
      loadItems()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan unit.")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBadgeProps = (
    status: StatusUnit | string,
    lokasi?: string,
    mitra?: string | null,
    paNumber?: string | null
  ) => {
    const text = formatItemStatus(status, user?.role, mitra, lokasi, paNumber)
    
    switch (text) {
      case "Tersedia":
        return { text: "Tersedia", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
      case "Terdistribusi":
        return { text: "Terdistribusi", dotClass: "bg-blue-500", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }
      case "Digunakan":
        return { text: "Digunakan", dotClass: "bg-indigo-500", badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" }
      case "Rusak":
        return { text: "Rusak", dotClass: "bg-destructive", badgeClass: "bg-destructive/10 text-destructive" }
      case "Hilang":
      case "Dismantle":
        return { text: text || "Dismantle", dotClass: "bg-purple-500", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400" }
      default:
        return { text: text || String(status), dotClass: "bg-gray-500", badgeClass: "bg-gray-500/10 text-gray-600 dark:text-gray-400" }
    }
  }

  const formatTanggal = (tgl: string) => {
    if (!tgl) return "-"
    const date = new Date(tgl)
    if (isNaN(date.getTime())) return tgl
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...barangList.map((b) => b.id)])))
    } else {
      const currentIds = new Set(barangList.map((b) => b.id))
      setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)))
    }
  }

  const handleSelectRow = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }

  const availableFormLocations = dbLocations.filter((location) => {
    if (user?.role === "mitra") {
      const locOwner = location.owner.trim().toLowerCase()
      return (
        locOwner === user.displayName.trim().toLowerCase() ||
        locOwner === user.username.trim().toLowerCase() ||
        (user.identityCode && locOwner.includes(user.identityCode.trim().toLowerCase()))
      )
    }
    return true
  })

  const isFiltered =
    searchTerm.trim().length > 0 ||
    filterStatus !== "all" ||
    filterCategory !== "all" ||
    filterBrand !== "all" ||
    filterMitra !== "all"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6 overflow-hidden animate-fade-in">
      {/* Modular Filter Bar */}
      <BarangFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        filterBrand={filterBrand}
        onBrandChange={setFilterBrand}
        filterMitra={filterMitra}
        onMitraChange={setFilterMitra}
        partners={dbPartners}
        categories={categories}
        brands={brands}
        onResetFilter={handleResetFilter}
        selectedCount={selectedIds.length}
        onBulkDelete={handleBulkDelete}
        onExportExcel={() => setIsExportModalOpen(true)}
        userRole={user?.role}
        hasFilteredData={totalItems > 0}
      />

      {/* Main Content Area: Table / Cards */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20 gap-2 text-muted-foreground text-xs">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Memuat data barang dari server...</span>
        </div>
      ) : barangList.length === 0 ? (
        <EmptyBarangTableState isFiltered={isFiltered} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:flex min-h-0 flex-1 flex-col">
            <BarangTable
              items={barangList}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
              onItemClick={handleOpenDetail}
              onOpenEdit={handleOpenEdit}
              onDelete={handleDelete}
              userRole={user?.role}
              currentPage={currentPage}
              pageSize={pageSize}
              getStatusBadgeProps={getStatusBadgeProps}
              formatTanggal={formatTanggal}
              ADMIN_LOCATION={ADMIN_LOCATION}
            />
          </div>

          {/* Mobile Cards View */}
          <BarangMobileCards
            items={barangList}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onItemClick={handleOpenDetail}
            onOpenEdit={handleOpenEdit}
            onDelete={handleDelete}
            userRole={user?.role}
            getStatusBadgeProps={getStatusBadgeProps}
            formatTanggal={formatTanggal}
            ADMIN_LOCATION={ADMIN_LOCATION}
          />

          {/* Pagination Controls Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 px-1 text-xs shrink-0">
            <div className="text-muted-foreground">
              Menampilkan <span className="font-medium text-foreground">{barangList.length}</span> dari{" "}
              <span className="font-medium text-foreground">{totalItems}</span> unit inventaris
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Baris:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => setPageSize(parseInt(val, 10))}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <span className="px-2 text-muted-foreground font-medium">
                  {currentPage} / {totalPages}
                </span>
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
        </>
      )}

      {/* Modular Detail Drawer */}
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

      {/* Modular Form Add/Edit Modal */}
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
        availableFormLocations={availableFormLocations}
        STATUS_OPTIONS={STATUS_OPTIONS}
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={handleExportExcel}
        isExporting={isExporting}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-600">
              {deleteDialog?.type === "single"
                ? `Hapus Unit SN: ${deleteDialog.serialNumber}?`
                : `Hapus ${deleteDialog?.ids.length} Unit Terpilih?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tindakan ini tidak dapat dibatalkan. Unit barang yang dihapus akan terhapus dari sistem inventaris.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={isDeleting} className="h-8 text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : "Ya, Hapus Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
