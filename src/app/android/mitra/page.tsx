"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2,
  Edit,
  MoreVertical,
  Plus,
  Power,
  Search,
  Trash2,
  Loader2,
  Phone,
  User,
  MapPin,
  X,
  Lock,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import type { PartnerType, Partner } from "@/types/partner"

/**
 * Helper: Mengembalikan Base URL untuk pemanggilan API.
 */
const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://172.168.9.139:3000/"
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
}

/**
 * Helper: Menyusun header HTTP secara otomatis beserta Authorization token.
 */
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

const PARTNER_TYPES: PartnerType[] = ["AKTIVASI", "GANGGUAN"]
const normalizeIdentityCode = (value: string) => value.trim().toUpperCase()

const slugifyName = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const initialForm = {
  code: "",
  name: "",
  partnerType: "AKTIVASI" as PartnerType,
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  isActive: true,
  username: "",
  password: "",
  confirmPassword: "",
}

export default function MitraPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState(initialForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  /**
   * Mengambil data seluruh pengguna (role: MITRA) dari backend.
   */
  const loadPartners = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${getBaseUrl()}/users`, {
        method: "GET",
        headers: getHeaders(),
      })
      if (!response.ok) {
        throw new Error("Gagal memuat data mitra")
      }
      const data = await response.json()

      const usersList = data.data || data.users || data
      const partnersList: Partner[] = (Array.isArray(usersList) ? usersList : [])
        .filter((u: any) => u.role === "MITRA")
        .map((u: any) => ({
          id: String(u.id),
          code: u.profile?.code || u.code || "-",
          name: u.profile?.nama || u.profile?.name || u.name || u.username || "",
          partnerType: (u.profile?.partnerType || u.partnerType || "Supplier") as PartnerType,
          contactPerson: u.profile?.contactPerson || u.contactPerson || "-",
          phone: u.profile?.telepon || u.profile?.phone || u.phone || "-",
          email: u.profile?.email || u.email || "-",
          address: u.profile?.alamat || u.profile?.address || u.address || "-",
          isActive: u.isAktif !== undefined ? u.isAktif : (u.isActive !== undefined ? u.isActive : true),
          username: u.username || null,
        }))
      setPartners(partnersList)
    } catch (error) {
      console.error("Gagal memuat data mitra:", error)
      toast.error("Gagal memuat data mitra.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  const hasActiveFilter = searchQuery.trim() !== "" || typeFilter !== "all" || statusFilter !== "all"

  /**
   * Filter partners berdasarkan query dan dropdown/pill filter.
   */
  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return partners.filter((partner) => {
      const matchesSearch =
        !query ||
        partner.code?.toLowerCase().includes(query) ||
        partner.name.toLowerCase().includes(query) ||
        partner.contactPerson?.toLowerCase().includes(query) ||
        partner.phone?.toLowerCase().includes(query) ||
        partner.email?.toLowerCase().includes(query) ||
        partner.address?.toLowerCase().includes(query)

      const matchesType = typeFilter === "all" || partner.partnerType === typeFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && partner.isActive) ||
        (statusFilter === "inactive" && !partner.isActive)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [partners, searchQuery, typeFilter, statusFilter])

  // Summary counts
  const totalPartners = partners.length
  const activePartnersCount = useMemo(() => partners.filter((p) => p.isActive).length, [partners])

  const openAddSheet = () => {
    setEditId(null)
    setFormData(initialForm)
    setFormErrors({})
    setIsSheetOpen(true)
  }

  const openEditSheet = (partner: Partner) => {
    setEditId(partner.id)
    setFormData({
      code: partner.code || "",
      name: partner.name || "",
      partnerType: partner.partnerType || "AKTIVASI",
      contactPerson: partner.contactPerson || "",
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      isActive: partner.isActive,
      username: partner.username || "",
      password: "",
      confirmPassword: "",
    })
    setFormErrors({})
    setIsSheetOpen(true)
  }

  const handleSave = async () => {
    if (isSaving) return
    const errors: Record<string, string> = {}
    const normalizedName = formData.name.trim()
    const normalizedUsername = formData.username.trim()
    const normalizedCode = normalizeIdentityCode(formData.code)

    if (normalizedCode.length < 2 || normalizedCode.length > 20) {
      errors.code = "Kode mitra minimal 2 dan maksimal 20 karakter."
    }
    if (!normalizedName) {
      errors.name = "Nama mitra wajib diisi."
    }

    if (!normalizedUsername) {
      errors.username = "Username wajib diisi untuk kredensial login."
    } else if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      errors.username = "Username hanya huruf kecil, angka, dan garis bawah (3-30 karakter)."
    }

    if (!editId) {
      if (!formData.password) {
        errors.password = "Password wajib diisi."
      } else if (formData.password.length < 8) {
        errors.password = "Password minimal 8 karakter."
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Konfirmasi password tidak cocok."
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Silakan periksa kembali isian formulir.")
      return
    }

    setIsSaving(true)
    try {
      if (editId) {
        // Mode Update
        const payload = {
          username: normalizedUsername,
          role: "MITRA",
          isAktif: formData.isActive,
          profile: {
            nama: normalizedName,
            code: normalizedCode,
            partnerType: formData.partnerType,
            contactPerson: formData.contactPerson.trim(),
            telepon: formData.phone.trim(),
            email: formData.email.trim(),
            alamat: formData.address.trim(),
          },
        }

        const response = await fetch(`${getBaseUrl()}/users/${editId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const resJson = await response.json().catch(() => ({}))
          throw new Error(resJson.message || "Gagal memperbarui mitra.")
        }

        toast.success(`Data mitra "${normalizedName}" berhasil diperbarui.`)
      } else {
        // Mode Create
        const payload = {
          username: normalizedUsername,
          password: formData.password,
          role: "MITRA",
          isAktif: formData.isActive,
          profile: {
            nama: normalizedName,
            code: normalizedCode,
            partnerType: formData.partnerType,
            contactPerson: formData.contactPerson.trim(),
            telepon: formData.phone.trim(),
            email: formData.email.trim(),
            alamat: formData.address.trim(),
          },
        }

        const response = await fetch(`${getBaseUrl()}/users`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const resJson = await response.json().catch(() => ({}))
          throw new Error(resJson.message || "Gagal menambahkan mitra baru.")
        }

        toast.success(`Mitra baru "${normalizedName}" berhasil ditambahkan.`)
      }

      setIsSheetOpen(false)
      loadPartners()
    } catch (error: any) {
      console.error("Gagal menyimpan mitra:", error)
      toast.error(error.message || "Gagal memproses data mitra.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (partner: Partner) => {
    setTogglingId(partner.id)
    try {
      const nextStatus = !partner.isActive
      const response = await fetch(`${getBaseUrl()}/users/${partner.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          isAktif: nextStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Gagal mengubah status aktif mitra.")
      }

      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, isActive: nextStatus } : p))
      )
      toast.success(
        `Mitra "${partner.name}" berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`
      )
    } catch (error: any) {
      console.error("Gagal toggle status mitra:", error)
      toast.error(error.message || "Gagal mengubah status mitra.")
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`${getBaseUrl()}/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      })

      if (!response.ok) {
        const resJson = await response.json().catch(() => ({}))
        throw new Error(resJson.message || "Gagal menghapus mitra.")
      }

      setPartners((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success(`Mitra "${deleteTarget.name}" berhasil dihapus.`)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error("Gagal menghapus mitra:", error)
      toast.error(error.message || "Gagal menghapus mitra.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Top Header & Summary */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Data Mitra</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalPartners} Mitra terdaftar ({activePartnersCount} Aktif)
            </p>
          </div>
          <Button onClick={openAddSheet} size="sm" className="gap-1.5 shadow-sm font-semibold">
            <Plus className="size-4" />
            <span>Tambah</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mitra, PIC, telepon, kode..."
            className="pl-9 pr-8 bg-card border-border/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => {
              setTypeFilter("all")
              setStatusFilter("all")
            }}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              typeFilter === "all" && statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Semua ({partners.length})
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "AKTIVASI" ? "all" : "AKTIVASI")}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              typeFilter === "AKTIVASI"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Aktivasi
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === "GANGGUAN" ? "all" : "GANGGUAN")}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              typeFilter === "GANGGUAN"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Gangguan
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "inactive" ? "all" : "inactive")}
            className={`px-3 py-1 text-xs font-medium rounded-full shrink-0 transition-colors ${
              statusFilter === "inactive"
                ? "bg-muted-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Nonaktif
          </button>
        </div>
      </div>

      {/* Partner Cards Grid / List */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 border border-border/40 bg-card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </Card>
          ))
        ) : filteredPartners.length > 0 ? (
          filteredPartners.map((partner) => (
            <Card
              key={partner.id}
              className="p-4 border border-border/50 bg-card/80 shadow-xs hover:border-primary/40 transition-all rounded-xl relative overflow-hidden group"
            >
              {/* Header: Avatar, Name, Code, & Menu */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                    {partner.name
                      ? partner.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : <Building2 className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
                      {partner.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {partner.code}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal px-1.5 py-0"
                      >
                        {partner.partnerType === "AKTIVASI" ? "Aktivasi" : "Gangguan"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 font-medium border-0 ${
                      partner.isActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`inline-block size-1.5 rounded-full mr-1 ${
                        partner.isActive ? "bg-emerald-500" : "bg-muted-foreground/60"
                      }`}
                    />
                    {partner.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Aksi</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEditSheet(partner)} className="cursor-pointer">
                        <Edit className="size-4 mr-2" />
                        <span>Edit Mitra</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={togglingId === partner.id}
                        onClick={() => handleToggleStatus(partner)}
                        className="cursor-pointer"
                      >
                        {togglingId === partner.id ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Power className="size-4 mr-2" />
                        )}
                        <span>{partner.isActive ? "Nonaktifkan" : "Aktifkan"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(partner)}
                        className="cursor-pointer"
                      >
                        <Trash2 className="size-4 mr-2" />
                        <span>Hapus Mitra</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Body Details */}
              <div className="space-y-1.5 pt-2.5 border-t border-border/50 text-xs">
                {partner.contactPerson && partner.contactPerson !== "-" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">PIC: <strong className="text-foreground font-medium">{partner.contactPerson}</strong></span>
                  </div>
                )}
                {partner.phone && partner.phone !== "-" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <a
                      href={`tel:${partner.phone}`}
                      className="text-foreground hover:underline truncate"
                    >
                      {partner.phone}
                    </a>
                  </div>
                )}
                {partner.address && partner.address !== "-" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="truncate text-muted-foreground">{partner.address}</span>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="size-14 rounded-full bg-muted/40 border flex items-center justify-center mb-3 text-muted-foreground">
              {hasActiveFilter ? <Search className="size-6" /> : <Building2 className="size-6" />}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {hasActiveFilter ? "Tidak ada mitra yang cocok" : "Belum ada data mitra"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {hasActiveFilter
                ? "Coba ubah kata kunci pencarian atau filter yang sedang aktif."
                : "Klik tombol Tambah Mitra di atas untuk mendaftarkan mitra baru."}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Center Modal Dialog for Add/Edit */}
      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent
          className="w-[92%] sm:max-w-lg rounded-2xl p-0 max-h-[85vh] flex flex-col border-border bg-popover text-foreground overflow-hidden"
        >
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/40 text-left">
            <DialogTitle className="text-lg font-bold text-foreground">
              {editId ? "Edit Data Mitra" : "Tambah Mitra Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kelola informasi profil mitra dan kredensial akses login.
            </DialogDescription>
          </DialogHeader>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Section 1: Profil Mitra */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Building2 className="size-3.5" />
                <span>Informasi Mitra</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-name" className="text-xs">Nama Mitra <span className="text-destructive">*</span></Label>
                <Input
                  id="partner-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                    setFormErrors((prev) => ({ ...prev, name: "" }))
                  }}
                  placeholder="Contoh: PT Telkom Indonesia"
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="partner-code" className="text-xs">Kode Mitra <span className="text-destructive">*</span></Label>
                  <Input
                    id="partner-code"
                    value={formData.code}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                      setFormErrors((prev) => ({ ...prev, code: "" }))
                    }}
                    placeholder="MTR-001"
                    className={formErrors.code ? "border-destructive" : ""}
                  />
                  {formErrors.code && <p className="text-xs text-destructive">{formErrors.code}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Jenis Mitra</Label>
                  <Select
                    value={formData.partnerType}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, partnerType: val as PartnerType }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "AKTIVASI" ? "Aktivasi" : "Gangguan"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="partner-pic" className="text-xs">Nama PIC</Label>
                  <Input
                    id="partner-pic"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="partner-phone" className="text-xs">No. Telepon</Label>
                  <Input
                    id="partner-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-address" className="text-xs">Wilayah / Alamat</Label>
                <Input
                  id="partner-address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Wilayah kerja operasional"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Status Akun</Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, isActive: val === "active" }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 2: Kredensial Login */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Lock className="size-3.5" />
                <span>Kredensial Login</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partner-username" className="text-xs">Username <span className="text-destructive">*</span></Label>
                <Input
                  id="partner-username"
                  value={formData.username}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    setFormData((prev) => ({ ...prev, username: val }))
                    setFormErrors((prev) => ({ ...prev, username: "" }))
                  }}
                  placeholder={formData.name ? slugifyName(formData.name) : "username"}
                  className={formErrors.username ? "border-destructive" : ""}
                />
                {formErrors.username && <p className="text-xs text-destructive">{formErrors.username}</p>}
              </div>

              {!editId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="partner-pass" className="text-xs">Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="partner-pass"
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                        setFormErrors((prev) => ({ ...prev, password: "" }))
                      }}
                      placeholder="Min. 8 karakter"
                      className={formErrors.password ? "border-destructive" : ""}
                    />
                    {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="partner-confirm" className="text-xs">Konfirmasi Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="partner-confirm"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        setFormErrors((prev) => ({ ...prev, confirmPassword: "" }))
                      }}
                      placeholder="Ulangi password"
                      className={formErrors.confirmPassword ? "border-destructive" : ""}
                    />
                    {formErrors.confirmPassword && <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="p-4 border-t border-border/50 bg-muted/40 flex flex-row justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              disabled={isSaving}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 font-semibold"
            >
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editId ? "Simpan Perubahan" : "Tambah Mitra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-[90%] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mitra?</AlertDialogTitle>
            <AlertDialogDescription>
              Data mitra <strong>{deleteTarget?.name}</strong> akan dihapus permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting} className="mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
