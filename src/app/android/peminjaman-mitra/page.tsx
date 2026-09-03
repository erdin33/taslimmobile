"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  FilePlus,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  ScanBarcode,
  PenTool,
  X,
  Check,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, getBaseUrl } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { normalizePartnerList } from "@/lib/partner-options"
import { openUrl } from "@tauri-apps/plugin-opener"
import { DigitalSignatureDialog } from "@/app/request/components/DigitalSignatureDialog"

type StatusKey =
  | "menunggu"
  | "disetujui"
  | "siap"
  | "selesai"
  | "diterima"
  | "ditolak"
  | "dibatalkan"
  | "menunggu_persetujuan"
  | "menunggu_scan_pemberi"
  | "menunggu_scan_penerima"

const STATUS_STYLE: Record<StatusKey, string> = {
  menunggu: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  disetujui: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  siap: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  selesai: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  diterima: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  ditolak: "text-destructive bg-destructive/10 border-destructive/20",
  dibatalkan: "text-destructive bg-destructive/10 border-destructive/20",
  menunggu_persetujuan: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  menunggu_scan_pemberi: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  menunggu_scan_penerima: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
}

const STATUS_LABEL: Record<StatusKey, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  siap: "Siap Serah Terima",
  selesai: "Selesai",
  diterima: "Diterima",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
  menunggu_persetujuan: "Menunggu Persetujuan Admin",
  menunggu_scan_pemberi: "Menunggu Scan Pemberi",
  menunggu_scan_penerima: "Menunggu Scan Penerima",
}

type RawRecord = Record<string, unknown>

const asRecord = (value: unknown): RawRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {}

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined || typeof value === "object") return ""
  return String(value).trim()
}

const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase()

const readFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = normalizeText(value)
    if (text) return text
  }
  return ""
}

const readNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

const unwrapList = (value: unknown) => {
  if (Array.isArray(value)) return value
  const payload = asRecord(value)
  for (const key of ["data", "requests", "items", "results"]) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested
  }
  return []
}

const resolveApprovalStatus = (rec: RawRecord): StatusKey => {
  const rawValue = readFirstText(
    rec.status,
    rec.state,
    rec.approvalStatus,
    rec.approval_status,
    rec.approvalState,
    rec.adminApprovalStatus,
    rec.admin_status
  )

  const normalized = normalizeKey(rawValue)
  const providerScanned = Boolean(
    rec.providerScannedAt ||
      rec.provider_scanned_at ||
      rec.providerScanAt ||
      rec.providerScanned ||
      rec.provider_scanned ||
      ["provider_scanned", "provider scanned", "pemberi scan", "pemberi_scan"].includes(normalized)
  )
  const receiverScanned = Boolean(
    rec.receiverScannedAt ||
      rec.receiver_scanned_at ||
      rec.receiverScanAt ||
      rec.receiverScanned ||
      rec.receiver_scanned ||
      ["receiver_scanned", "receiver scanned", "penerima scan", "penerima_scan"].includes(normalized)
  )
  const isApproved = Boolean(rec.isApproved || rec.approved || rec.adminApproved || ["approved", "disetujui", "approved_by_admin"].includes(normalized))
  const isRejected = Boolean(rec.isRejected || rec.rejected || rec.adminRejected || ["rejected", "ditolak"].includes(normalized))

  if (["ditolak", "rejected", "tolak", "declined"].includes(normalized)) return "ditolak"
  if (["dibatalkan", "cancelled", "canceled", "cancel"].includes(normalized)) return "dibatalkan"
  if (receiverScanned || ["selesai", "completed", "done", "received", "diterima"].includes(normalized)) return "selesai"
  if (providerScanned || ["provider_scan", "pemberi_scan", "pemberi scan"].includes(normalized)) return "menunggu_scan_penerima"
  if (isApproved || ["disetujui", "approved", "setuju", "accepted", "approved_by_admin", "acc"].includes(normalized)) return "menunggu_scan_pemberi"
  if (["menunggu", "pending", "waiting", "waiting approval", "menunggu persetujuan", "pending approval"].includes(normalized)) {
    return "menunggu_persetujuan"
  }
  if (["siap", "ready", "siap serah terima"].includes(normalized)) return "siap"
  if (["diterima", "received", "accepted_by_receiver"].includes(normalized)) return "diterima"

  if (isRejected) return "ditolak"

  return "menunggu_persetujuan"
}

const normalizePartnerRecord = (value: unknown): Record<string, unknown> => {
  const record = asRecord(value)
  const profile = asRecord(record.profile)
  const partner = asRecord(record.partner)

  return {
    ...record,
    ...profile,
    ...partner,
    id: readFirstText(record.id, record.partnerId, profile.id, partner.id),
    partnerId: readFirstText(record.partnerId, record.partner_id, profile.partnerId, partner.partnerId),
    identityCode: readFirstText(record.identityCode, record.identity_code, profile.identityCode, partner.identityCode),
    name: readFirstText(record.name, record.fullName, profile.name, profile.fullName, partner.name),
    displayName: readFirstText(record.displayName, record.display_name, profile.displayName, profile.display_name, partner.displayName),
    username: readFirstText(record.username, profile.username, partner.username),
    partnerName: readFirstText(record.partnerName, record.partner_name, profile.partnerName, partner.partnerName, record.name, profile.name, partner.name),
  }
}

const findUserMatch = (users: RawRecord[], candidates: unknown[]) => {
  const normalizedCandidates = candidates
    .map((candidate) => normalizeKey(candidate))
    .filter(Boolean)

  if (normalizedCandidates.length === 0) return null

  return users.find((user) => {
    const normalizedUser = normalizePartnerRecord(user)
    const userKeys = [
      normalizedUser.id,
      normalizedUser.partnerId,
      normalizedUser.identityCode,
      normalizedUser.username,
      normalizedUser.displayName,
      normalizedUser.name,
      normalizedUser.partnerName,
    ].map(normalizeKey).filter(Boolean)

    return normalizedCandidates.some((candidate) => userKeys.includes(candidate))
  }) ?? null
}

type PartnerOption = { id: string; name: string; code?: string }
type CategoryOption = { id: number | string; name: string }
type BrandOption = { id: number | string; name: string }

type RequestItem = {
  id: number
  category: string
  brand: string
  quantity: number
  unit: string
}

type InterPartnerRequest = {
  id: string
  requestNumber: string
  requesterPartnerId: string
  providerPartnerId: string
  requesterName: string
  providerName: string
  itemsCount: number
  itemsDetail: string
  status: StatusKey
  notes?: string
  requestedAt: string
  requestItems: RequestItem[]
  deliveryDocument?: {
    kpSignedById?: string | null
    picSignedById?: string | null
    driveViewUrl?: string | null
  } | null
}

function StatusBadge({ status }: { status: StatusKey }) {
  const styleClass = STATUS_STYLE[status] || STATUS_STYLE.menunggu
  const label = STATUS_LABEL[status] || status

  return (
    <Badge variant="outline" className={`px-2 py-0.5 text-[11px] font-semibold tracking-wide ${styleClass}`}>
      {label}
    </Badge>
  )
}

// ─── Modal Form Pengajuan Permintaan Antar Mitra ────────────────────────────

type ItemRow = {
  id: number
  categoryId: string
  brandId: string
  quantity: string
}

function InterPartnerRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [targetPartnerId, setTargetPartnerId] = useState("")
  const [items, setItems] = useState<ItemRow[]>([{ id: Date.now(), categoryId: "", brandId: "", quantity: "1" }])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true)
    try {
      const [partnersRes, catRes, brandRes] = await Promise.all([
        api.get("/users").catch(() => ({ data: [] })),
        api.get("/categories").catch(() => ({ data: [] })),
        api.get("/brands").catch(() => ({ data: [] })),
      ])

      const normalizeForCurrentUser = (source: unknown): PartnerOption[] =>
        normalizePartnerList(source, {
          activeOnly: true,
          requireMitraRole: true,
          excludeIds: [user?.id, user?.partnerId, user?.identityCode],
          excludeNames: [user?.displayName, user?.username],
        }).map((partner) => ({
          id: partner.id,
          name: partner.name,
          code: partner.code,
        }))

      const pOptions = normalizeForCurrentUser(partnersRes.data)

      const cOptions: CategoryOption[] = unwrapList(catRes.data).map((c) => {
        const rec = asRecord(c)
        return { id: rec.id as number | string, name: readFirstText(rec.name, rec.nama) }
      })

      const bOptions: BrandOption[] = unwrapList(brandRes.data).map((b) => {
        const rec = asRecord(b)
        return { id: rec.id as number | string, name: readFirstText(rec.name, rec.nama) }
      })

      setPartners(pOptions)
      setCategories(cOptions)
      setBrands(bOptions)
    } catch (err) {
      console.error("Gagal memuat dropdown:", err)
    } finally {
      setLoadingDropdowns(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) fetchDropdowns()
  }, [isOpen, fetchDropdowns])

  const addRow = () => setItems((prev) => [...prev, { id: Date.now(), categoryId: "", brandId: "", quantity: "1" }])

  const removeRow = (id: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRow = (id: number, field: keyof ItemRow, val: string) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!targetPartnerId) {
      toast.error("Pilih mitra tujuan terlebih dahulu.")
      return
    }
    for (const item of items) {
      if (!item.categoryId || !item.brandId || readNumber(item.quantity) <= 0) {
        toast.error("Lengkapi data barang dengan benar.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        requesterId: user?.id,
        providerPartnerId: targetPartnerId,
        notes: notes.trim(),
        items: items.map((r) => ({
          materialCategoryId: Number(r.categoryId),
          brandId: Number(r.brandId),
          quantity: Number(r.quantity),
        })),
      }

      await api.post("/requests", { ...payload, isInterPartner: true })
      toast.success("Permintaan transfer antar mitra berhasil diajukan!")
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengajukan permintaan"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col max-h-[92vh] rounded-2xl bg-card border-border">
        <DialogHeader className="px-5 py-4 border-b border-border/50">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Permintaan Barang Antar Mitra
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajukan peminjaman atau transfer material langsung kepada sesama mitra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <form id="inter-partner-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Target Partner Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Pilih Mitra Tujuan (Penyedia/Pemberi)</Label>
              <Select value={targetPartnerId} onValueChange={setTargetPartnerId}>
                <SelectTrigger className="h-10 text-xs bg-background border-border/70">
                  <SelectValue placeholder="Pilih Mitra..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {partners.length > 0 ? (
                    partners.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada mitra lain</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Items List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Daftar Material yang Diminta</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2.5" onClick={addRow}>
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>

              {loadingDropdowns ? (
                <div className="flex items-center gap-2 text-muted-foreground py-3 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Memuat opsi kategori & merek...</span>
                </div>
              ) : (
                items.map((row, idx) => (
                  <div key={row.id} className="relative p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary">Barang #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-muted-foreground hover:text-destructive p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Kategori</Label>
                        <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, "categoryId", v)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Kategori..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">Merek</Label>
                        <Select value={row.brandId} onValueChange={(v) => updateRow(row.id, "brandId", v)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Merek..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)} className="text-xs">{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Jumlah Unit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-foreground">Catatan / Alasan Permintaan</Label>
              <Textarea
                id="notes"
                placeholder="Contoh: Peminjaman untuk aktivasi darurat di area Garut..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-xs bg-background"
              />
            </div>
          </form>
        </div>

        <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-9 text-xs">
            Batal
          </Button>
          <Button type="submit" form="inter-partner-form" size="sm" disabled={isSubmitting || loadingDropdowns} className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Permintaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function PeminjamanMitraAndroidPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [allRequests, setAllRequests] = useState<InterPartnerRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "outgoing" | "incoming" | "done">("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null)
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)

    try {
      const [requestsRes, usersRes] = await Promise.all([
        api.get("/requests?type=inter-partner").catch(() => api.get("/requests")),
        api.get("/users").catch(() => ({ data: [] })),
      ])

      const rawList = unwrapList(requestsRes.data)
      const users = unwrapList(usersRes.data).map(normalizePartnerRecord)

      const normalized: InterPartnerRequest[] = rawList
        .filter((raw) => {
          const rec = asRecord(raw)
          return rec.isInterPartner === true || rec.type === "inter-partner" || rec.requestType === "inter-partner"
        })
        .map((raw, idx) => {
          const rec = asRecord(raw)
          const req = asRecord(rec.requester || rec.requesterParty)
          const prov = asRecord(rec.provider || rec.providerParty)
          const rawItems = Array.isArray(rec.items || rec.requestItems) ? (rec.items || rec.requestItems) as unknown[] : []
          const rawDoc = asRecord(rec.deliveryDocument)

          const requesterMatch = findUserMatch(users, [
            rec.requesterId,
            rec.requesterPartnerId,
            raw.requesterId,
            raw.requesterPartnerId,
            req.id,
            req.partnerId,
            req.identityCode,
            req.username,
            req.name,
            req.partnerName,
            req.displayName,
          ])

          const providerMatch = findUserMatch(users, [
            rec.providerPartnerId,
            rec.providerId,
            raw.providerId,
            raw.providerPartnerId,
            prov.id,
            prov.partnerId,
            prov.identityCode,
            prov.username,
            prov.name,
            prov.partnerName,
            prov.displayName,
          ])

          const requesterName = readFirstText(
            requesterMatch?.partnerName,
            requesterMatch?.name,
            requesterMatch?.displayName,
            requesterMatch?.username,
            req.partnerName,
            req.name,
            req.username,
            "Mitra Peminta"
          )

          const providerName = readFirstText(
            providerMatch?.partnerName,
            providerMatch?.name,
            providerMatch?.displayName,
            providerMatch?.username,
            prov.partnerName,
            prov.name,
            prov.username,
            "Mitra Pemberi"
          )

          return {
            id: readFirstText(rec.id, rec._id, String(idx)),
            requestNumber: readFirstText(rec.requestNumber, rec.nomorRequest, `REQ-MITRA-${idx + 1}`),
            requesterPartnerId: readFirstText(rec.requesterPartnerId, rec.requesterId, req.partnerId, req.id, req.identityCode),
            providerPartnerId: readFirstText(rec.providerPartnerId, rec.providerId, prov.partnerId, prov.id, prov.identityCode),
            requesterName,
            providerName,
            itemsCount: rawItems.length || readNumber(rec.itemsCount, 1),
            itemsDetail: rawItems
              .map((it) => {
                const itemRec = asRecord(it)
                return `${readFirstText(itemRec.itemName, itemRec.category, "Barang")} x${readNumber(itemRec.quantity, 1)}`
              })
              .join(", ") || "Item Permintaan",
            status: resolveApprovalStatus(rec),
            notes: readFirstText(rec.purpose, rec.notes, rec.adminRemarks),
            requestedAt: readFirstText(rec.requestedAt, rec.createdAt),
            requestItems: rawItems.map((it, i) => {
              const itemRec = asRecord(it)
              return {
                id: readNumber(itemRec.id, i),
                category: readFirstText(itemRec.categoryName, itemRec.category, "-"),
                brand: readFirstText(itemRec.brandName, itemRec.brand, "-"),
                quantity: readNumber(itemRec.quantity, 1),
                unit: readFirstText(itemRec.unit, "Unit"),
              }
            }),
            deliveryDocument:
              rec.deliveryDocument != null
                ? {
                    kpSignedById: rawDoc.kpSignedById ? String(rawDoc.kpSignedById) : null,
                    picSignedById: rawDoc.picSignedById ? String(rawDoc.picSignedById) : null,
                    driveViewUrl: rawDoc.driveViewUrl ? String(rawDoc.driveViewUrl) : null,
                  }
                : null,
          }
        })

      setAllRequests(normalized)
    } catch (err) {
      console.error("Gagal memuat permintaan antar mitra:", err)
      toast.error("Gagal memuat data permintaan antar mitra.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Admin approval decision
  const handleAdminDecision = useCallback(async (requestId: string, decision: "approve" | "reject") => {
    if (!isAdmin) return
    try {
      const payload = { status: decision === "approve" ? "APPROVED" : "REJECTED" }
      await api.put(`/requests/${requestId}/status`, payload).catch(() =>
        api.put(`/requests/${requestId}`, payload)
      )

      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: decision === "approve" ? "menunggu_scan_pemberi" : "ditolak" }
            : req
        )
      )

      toast.success(
        decision === "approve"
          ? "Permintaan disetujui! Mitra pemberi wajib melakukan scan barang."
          : "Permintaan transfer berhasil ditolak."
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status persetujuan"
      toast.error(msg)
    }
  }, [isAdmin])

  // Provider scan complete
  const handleProviderScan = useCallback(async (requestId: string) => {
    try {
      const payload = { status: "PEMBERI_SCAN", providerScannedAt: new Date().toISOString() }
      await api.put(`/requests/${requestId}/status`, payload).catch(() =>
        api.put(`/requests/${requestId}`, payload)
      )

      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "menunggu_scan_penerima" } : req
        )
      )
      toast.success("Scan penyerahan barang berhasil! Menunggu konfirmasi penerima.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan scan pemberi"
      toast.error(msg)
    }
  }, [])

  // Receiver scan complete
  const handleReceiverScan = useCallback(async (requestId: string) => {
    try {
      const payload = { status: "SELESAI", receiverScannedAt: new Date().toISOString() }
      await api.put(`/requests/${requestId}/status`, payload).catch(() =>
        api.put(`/requests/${requestId}`, payload)
      )

      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "selesai" } : req
        )
      )
      toast.success("Barang berhasil diterima dan transaksi selesai!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan validasi akhir"
      toast.error(msg)
    }
  }, [])

  // BAST PDF opener
  const handleOpenBastPdf = useCallback(async (requestId: string) => {
    setOpeningPdfId(requestId)
    try {
      const token = localStorage.getItem("taslim-auth-token") || ""
      const url = `${getBaseUrl()}/requests/${requestId}/bast-pdf?token=${token}`
      await openUrl(url)
    } catch {
      toast.error("Gagal membuka PDF BAST")
    } finally {
      setOpeningPdfId(null)
    }
  }, [])

  // Sign BAST
  const handleSignComplete = useCallback(async () => {
    if (!signingRequestId) return
    try {
      await api.post(`/requests/${signingRequestId}/sign`)
      toast.success("Dokumen BAST berhasil ditandatangani")
      setSignDialogOpen(false)
      setSigningRequestId(null)
      setAllRequests((prev) =>
        prev.map((req) =>
          req.id === signingRequestId
            ? {
                ...req,
                deliveryDocument: {
                  ...req.deliveryDocument,
                  picSignedById: user?.id ?? "signed",
                },
              }
            : req
        )
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menandatangani BAST"
      toast.error(msg)
    }
  }, [signingRequestId, user?.id])

  // Filter requests according to current user and active tab
  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const myName = (user?.displayName || user?.username || "").toLowerCase()
    const myId = String(user?.id || "").toLowerCase()
    const myPartnerId = String(user?.partnerId || "").toLowerCase()

    return allRequests.filter((r) => {
      // Role-based visibility
      const isRequester =
        (r.requesterPartnerId && [myId, myPartnerId].includes(r.requesterPartnerId.toLowerCase())) ||
        (r.requesterName && r.requesterName.toLowerCase() === myName)

      const isProvider =
        (r.providerPartnerId && [myId, myPartnerId].includes(r.providerPartnerId.toLowerCase())) ||
        (r.providerName && r.providerName.toLowerCase() === myName)

      // Mitra only sees requests where they are requester or provider
      if (!isAdmin && !isRequester && !isProvider) return false

      // Tab filter
      if (activeTab === "outgoing" && !isRequester) return false
      if (activeTab === "incoming" && !isProvider) return false
      if (activeTab === "done" && r.status !== "selesai") return false

      // Search query filter
      if (q) {
        const matches =
          r.requestNumber.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q) ||
          r.providerName.toLowerCase().includes(q) ||
          r.itemsDetail.toLowerCase().includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [allRequests, searchTerm, activeTab, user, isAdmin])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    return Number.isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 pb-32 space-y-4 text-foreground">
      {/* ── 1. HEADER ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ArrowRightLeft className="size-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Transfer Antar Mitra
            </h1>
            <p className="text-xs text-muted-foreground">
              Permintaan material langsung ke sesama mitra
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="h-8.5 text-xs gap-1.5 px-3 bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer"
        >
          <FilePlus className="size-3.5" />
          <span>Ajukan</span>
        </Button>
      </div>

      {/* ── 2. SEARCH BAR & REFRESH ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari no. request, mitra, barang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8.5 pr-8 h-9 text-xs bg-card border-border/70 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchRequests}
          disabled={isLoading}
          className="size-9 shrink-0 bg-card border-border/70"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── 3. FILTER TABS ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 h-9 p-1 bg-muted/60 border border-border/50 rounded-xl text-xs">
          <TabsTrigger value="all" className="text-[11px] font-semibold py-1">Semua</TabsTrigger>
          <TabsTrigger value="outgoing" className="text-[11px] font-semibold py-1">Diminta</TabsTrigger>
          <TabsTrigger value="incoming" className="text-[11px] font-semibold py-1">Masuk</TabsTrigger>
          <TabsTrigger value="done" className="text-[11px] font-semibold py-1">Selesai</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── 4. LIST PERMINTAAN ANTAR MITRA ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="size-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Memuat permintaan antar mitra...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/50">
          <ArrowRightLeft className="size-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-semibold text-foreground">Tidak ada permintaan</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
            Belum ada permintaan transfer material antar mitra pada kategori ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((item) => {
            const myName = (user?.displayName || user?.username || "").toLowerCase()
            const myId = String(user?.id || "").toLowerCase()
            const isRequester =
              (item.requesterPartnerId && item.requesterPartnerId.toLowerCase() === myId) ||
              item.requesterName.toLowerCase() === myName
            const isProvider =
              (item.providerPartnerId && item.providerPartnerId.toLowerCase() === myId) ||
              item.providerName.toLowerCase() === myName

            return (
              <Card
                key={item.id}
                className="p-4 border-border/70 bg-card rounded-2xl shadow-2xs space-y-3 hover:border-primary/40 transition-colors"
              >
                {/* Header: Request No & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-foreground">
                      {item.requestNumber}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Calendar className="size-3" />
                      <span>{formatDate(item.requestedAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Flow: Peminta → Pemberi */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Peminta:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      {item.requesterName}
                      {isRequester && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">Saya</Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-[11px]">Penyedia (Pemberi):</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      {item.providerName}
                      {isProvider && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-orange-500/10 text-orange-600">Saya</Badge>
                      )}
                    </span>
                  </div>
                </div>

                {/* Detail Material */}
                <div className="text-xs space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Material Diminta:</span>
                  <div className="p-2 rounded-lg bg-background border border-border/60 font-medium text-foreground">
                    {item.itemsDetail}
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-muted-foreground italic mt-1">
                      Catatan: "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Action Buttons sesuai status & role */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                  {/* Admin Approve / Reject */}
                  {isAdmin && item.status === "menunggu_persetujuan" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAdminDecision(item.id, "approve")}
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                      >
                        <Check className="size-3.5" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdminDecision(item.id, "reject")}
                        className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                      >
                        <X className="size-3.5" /> Tolak
                      </Button>
                    </>
                  )}

                  {/* Provider Scan Penyerahan */}
                  {(isProvider || isAdmin) && item.status === "menunggu_scan_pemberi" && (
                    <Button
                      size="sm"
                      onClick={() => handleProviderScan(item.id)}
                      className="w-full h-8.5 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold gap-1.5"
                    >
                      <ScanBarcode className="size-4" />
                      <span>Konfirmasi Penyerahan (Pemberi)</span>
                    </Button>
                  )}

                  {/* Receiver Scan Penerimaan */}
                  {(isRequester || isAdmin) && item.status === "menunggu_scan_penerima" && (
                    <Button
                      size="sm"
                      onClick={() => handleReceiverScan(item.id)}
                      className="w-full h-8.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1.5"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>Konfirmasi Terima Barang (Penerima)</span>
                    </Button>
                  )}

                  {/* BAST & TTD */}
                  {item.status === "selesai" && (
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenBastPdf(item.id)}
                        disabled={openingPdfId === item.id}
                        className="flex-1 h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                      >
                        <FileText className="size-3.5" />
                        <span>Lihat BAST</span>
                      </Button>

                      {!item.deliveryDocument?.picSignedById && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSigningRequestId(item.id)
                            setSignDialogOpen(true)
                          }}
                          className="flex-1 h-8 text-xs gap-1 bg-primary text-primary-foreground"
                        >
                          <PenTool className="size-3.5" />
                          <span>Tanda Tangan</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── 5. MODAL PENGAJUAN ANTAR MITRA ── */}
      <InterPartnerRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRequests}
      />

      {/* ── 6. DIGITAL SIGNATURE DIALOG ── */}
      <DigitalSignatureDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        title="Tanda Tangan BAST Antar Mitra"
        description="Bubuhkan tanda tangan elektronik untuk pengesahan serah terima barang antar mitra."
        onSignComplete={handleSignComplete}
      />
    </div>
  )
}
