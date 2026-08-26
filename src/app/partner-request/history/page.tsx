import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FilePlus,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Calendar,
  Package,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, getBaseUrl } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { openUrl } from "@tauri-apps/plugin-opener"
import { DigitalSignatureDialog } from "@/app/request/components/DigitalSignatureDialog"
import { PengambilanMitraModal } from "@/features/transactions/components/PengambilanMitraModal"
import { PackageCheck } from "lucide-react"
import type { AuthUser } from "@/types/auth"
import type { DashboardRequest, RequestItem } from "@/types/transaction"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type StatusKey =
  | "menunggu"
  | "disetujui"
  | "siap"
  | "selesai"
  | "diterima"
  | "ditolak"
  | "dibatalkan"
  | "tolak"

const STATUS_STYLE: Record<StatusKey, string> = {
  menunggu: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  disetujui: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  siap: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  selesai: "bg-muted text-muted-foreground border-border",
  diterima: "bg-muted text-muted-foreground border-border",
  ditolak: "bg-red-500/10 text-red-600 border-red-500/20",
  dibatalkan: "bg-red-500/10 text-red-600 border-red-500/20",
  tolak: "bg-red-500/10 text-red-600 border-red-500/20",
}

const STATUS_LABEL: Record<StatusKey, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  siap: "Siap",
  selesai: "Selesai",
  diterima: "Diterima",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
  tolak: "Ditolak",
}

type RawRecord = Record<string, unknown>

const asRecord = (value: unknown): RawRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {}

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined || typeof value === "object") return ""
  return String(value).trim()
}

const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase()

const getStatusKey = (status: unknown): StatusKey | undefined => {
  const key = normalizeKey(status) as StatusKey
  return key in STATUS_STYLE ? key : undefined
}

const unwrapRequestList = (value: unknown) => {
  if (Array.isArray(value)) return value

  const payload = asRecord(value)
  for (const key of ["data", "requests", "items", "results"]) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested
  }

  return []
}

const readFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = normalizeText(value)
    if (text) return text
  }

  return ""
}

const readNumber = (value: unknown, fallback = 0) => {
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const getTimestamp = (value?: string) => {
  const timestamp = value ? new Date(value).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

const normalizeRequestItem = (value: unknown, index: number): RequestItem => {
  const item = asRecord(value)
  const category = asRecord(item.materialCategory)
  const brand = asRecord(item.brand)
  const model = asRecord(item.model)

  return {
    id: readNumber(item.id, index),
    category: readFirstText(item.category, category.nama, category.name, "-"),
    brand: readFirstText(item.brand, brand.nama, brand.name, "-"),
    model: readFirstText(item.model, model.nama, model.name),
    quantity: readNumber(item.quantity),
    unit: readFirstText(item.unit, "Unit"),
  }
}

const normalizeRequest = (value: unknown): DashboardRequest => {
  const request = asRecord(value)
  const requester = asRecord(request.requester)
  const requesterProfile = asRecord(requester.profile)
  const rawItems = Array.isArray(request.requestItems) ? request.requestItems : []
  const requestItems = rawItems.map(normalizeRequestItem)
  const requestAllocations = Array.isArray(request.requestAllocations) ? request.requestAllocations : []

  const adminRemarks = readFirstText(
    request.adminRemarks,
    request.adminNotes,
    request.adminNote,
    request.remarks,
    request.rejectionReason,
    request.rejectionNotes,
    request.cancelReason
  )

  // Normalize deliveryDocument for BAST signing status
  const rawDoc = asRecord(request.deliveryDocument)
  const deliveryDocument =
    request.deliveryDocument != null
      ? {
          kpSignedById: normalizeText(rawDoc.kpSignedById) || null,
          picSignedById: normalizeText(rawDoc.picSignedById) || null,
        }
      : null

  return {
    id: readFirstText(request.id),
    requestNumber: readFirstText(request.requestNumber, request.nomor, request.id, "-"),
    requesterName: readFirstText(
      request.requesterName,
      requesterProfile.nama,
      requesterProfile.name,
      requester.username
    ),
    partnerCategory: readFirstText(request.partnerCategory, requesterProfile.partnerType),
    itemsCount:
      typeof request.itemsCount === "number"
        ? request.itemsCount
        : requestItems.reduce((total, item) => total + item.quantity, 0),
    itemsDetail: readFirstText(request.itemsDetail),
    status: readFirstText(request.status, "Menunggu"),
    notes: readFirstText(request.notes),
    adminRemarks: adminRemarks || undefined,
    rejectionReason: adminRemarks || undefined,
    requestedAt: readFirstText(request.requestedAt, request.createdAt, request.updatedAt),
    requestedDeliveryDate: readFirstText(request.requestedDeliveryDate),
    requestItems,
    requestAllocations: requestAllocations as any[],
    deliveryDocument,
  }
}

const requestBelongsToUser = (
  rawValue: unknown,
  request: DashboardRequest,
  user: AuthUser | null
) => {
  if (!user) return false

  const raw = asRecord(rawValue)
  const requester = asRecord(raw.requester)
  const requesterProfile = asRecord(requester.profile)
  const partner = asRecord(raw.partner)

  const userIds = [user.id, user.partnerId, user.identityCode].map(normalizeKey).filter(Boolean)
  const requestIds = [
    raw.requesterId,
    raw.userId,
    raw.partnerId,
    raw.mitraId,
    requester.id,
    requesterProfile.id,
    requesterProfile.identityCode,
    requesterProfile.kode,
    partner.id,
  ]
    .map(normalizeKey)
    .filter(Boolean)

  if (userIds.some((id) => requestIds.includes(id))) return true

  const requesterName = normalizeKey(request.requesterName)
  const identityCode = normalizeKey(user.identityCode)

  return (
    requesterName === normalizeKey(user.displayName) ||
    requesterName === normalizeKey(user.username) ||
    Boolean(identityCode && requesterName.includes(identityCode))
  )
}

const getItemsSummary = (request: DashboardRequest) => {
  if (request.itemsDetail) return request.itemsDetail

  if (request.requestItems && request.requestItems.length > 0) {
    return request.requestItems
      .map((item) => {
        const brand = item.brand && item.brand !== "-" ? ` / ${item.brand}` : ""
        const unit = item.unit ? ` ${item.unit}` : ""
        return `${item.category}${brand} x${item.quantity}${unit}`
      })
      .join(", ")
  }

  return request.itemsCount ? `${request.itemsCount} item` : "-"
}

const getAdminRemarks = (request: DashboardRequest) => {
  if (request.rejectionReason?.trim()) return request.rejectionReason
  if (request.adminRemarks?.trim()) return request.adminRemarks

  const statusKey = getStatusKey(request.status)
  if (statusKey && ["ditolak", "dibatalkan", "tolak"].includes(statusKey)) {
    return request.notes?.trim() || "-"
  }

  return "-"
}

const getSearchText = (request: DashboardRequest) =>
  [
    request.requestNumber,
    request.status,
    request.requesterName,
    request.partnerCategory,
    request.notes,
    request.adminRemarks,
    request.requestedDeliveryDate,
    getItemsSummary(request),
    request.requestItems
      ?.map((item) => [item.category, item.brand, item.model, item.quantity, item.unit].join(" "))
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

function StatusBadge({ status }: { status: string }) {
  const key = getStatusKey(status)
  const styleClass = key ? STATUS_STYLE[key] : "bg-muted text-muted-foreground border-border"
  const label = key ? STATUS_LABEL[key] : normalizeText(status) || "-"

  return (
    <Badge variant="outline" className={`px-2 py-1 text-xs font-medium ${styleClass}`}>
      {label}
    </Badge>
  )
}

export default function PartnerRequestHistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [allRequests, setAllRequests] = useState<DashboardRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // BAST state
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null)
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null)
  
  // Validasi & Ambil (Scanner) state
  const [validasiMitraOpen, setValidasiMitraOpen] = useState(false)
  const [activeRequest, setActiveRequest] = useState<DashboardRequest | null>(null)

  const handleOpenValidasi = useCallback((req: DashboardRequest) => {
    setActiveRequest(req)
    setValidasiMitraOpen(true)
  }, [])

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setAllRequests([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const res = await api.get("/requests")
      const rawRequests = unwrapRequestList(res.data)
      const myRequests = rawRequests
        .map((raw) => ({ raw, request: normalizeRequest(raw) }))
        .filter(({ raw, request }) => requestBelongsToUser(raw, request, user))
        .map(({ request }) => request)
        .sort((a, b) => getTimestamp(b.requestedAt) - getTimestamp(a.requestedAt))

      setAllRequests(myRequests)
    } catch (error) {
      console.error("Gagal memuat riwayat permintaan:", error)
      setLoadError("Gagal memuat riwayat permintaan.")
      toast.error("Gagal memuat riwayat permintaan.")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // ── BAST handlers ─────────────────────────────────────────────────────────

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



  const handleSignComplete = useCallback(async (signatureDataUrl?: string) => {
    if (!signingRequestId) return
    try {
      const payload = signatureDataUrl ? { signatureUrl: signatureDataUrl } : {}
      await api.post(`/requests/${signingRequestId}/sign`, payload)
      toast.success("Dokumen BAST berhasil ditandatangani")
      setSignDialogOpen(false)
      setSigningRequestId(null)
      // Update local state so the sign button reflects the change
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
      const msg = err instanceof Error ? err.message : "Gagal menandatangani dokumen BAST"
      toast.error(msg)
    }
  }, [signingRequestId, user?.id])

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return allRequests
    return allRequests.filter((request) => getSearchText(request).includes(query))
  }, [allRequests, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE))
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages))
  }, [totalPages])

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"

    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return "-"

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 animate-fade-in bg-background/50 min-h-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Riwayat Permintaan</h1>
          <p className="mt-1 text-sm text-muted-foreground font-medium">
            Pantau status semua permintaan material yang telah Anda ajukan
          </p>
        </div>
        <Button
          id="btn-ajukan-request-baru"
          className="shrink-0 gap-2 cursor-pointer mt-2 sm:mt-0 rounded-xl shadow-lg shadow-primary/20 font-bold"
          onClick={() => navigate("/partner-request/new")}
        >
          <FilePlus className="h-4 w-4" />
          Ajukan Request Baru
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-[14px] size-[18px] text-muted-foreground" />
          <Input
            id="search-request-history"
            placeholder="Cari no. request atau item..."
            className="pl-11 h-12 rounded-xl bg-card border-border shadow-sm text-[15px] focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer h-12 w-12 rounded-xl bg-card border-border shadow-sm hover:bg-accent"
          onClick={fetchRequests}
          disabled={isLoading}
          aria-label="Muat ulang riwayat permintaan"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
        </Button>
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block overflow-hidden rounded-lg border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-4">No</TableHead>
              <TableHead>No. Request</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Catatan Admin</TableHead>
              <TableHead className="text-center">Dokumen BAST</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Memuat riwayat permintaan...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 text-destructive/70" />
                    <p className="text-sm font-medium">{loadError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 gap-1.5 cursor-pointer"
                      onClick={fetchRequests}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Muat Ulang
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 opacity-30" />
                    {searchTerm ? (
                      <p className="text-sm">Tidak ada hasil untuk pencarian ini</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Belum ada permintaan</p>
                        <p className="text-xs">Ajukan permintaan material pertama Anda</p>
                        <Button
                          size="sm"
                          className="mt-1 gap-1.5 cursor-pointer"
                          onClick={() => navigate("/partner-request/new")}
                        >
                          <FilePlus className="h-4 w-4" />
                          Ajukan Request
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((req, idx) => {
                const itemSummary = getItemsSummary(req)
                const adminRemarks = getAdminRemarks(req)
                const statusUpper = req.status?.toUpperCase?.()?.trim() ?? ""
                const hasBast = ["SIAP", "SELESAI", "DITERIMA"].includes(statusUpper)
                const canSign =
                  statusUpper === "SIAP" && !req.deliveryDocument?.picSignedById
                const isSigned = !!req.deliveryDocument?.picSignedById
                const isOpeningPdf = openingPdfId === req.id

                return (
                  <TableRow key={req.id || req.requestNumber} className="hover:bg-muted/40">
                    <TableCell className="pl-4 text-muted-foreground">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {req.requestNumber || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(req.requestedAt)}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="block truncate text-sm" title={itemSummary}>
                        {itemSummary}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">
                      {req.itemsCount ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                      <span className="block truncate" title={adminRemarks}>
                        {adminRemarks}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasBast ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Open PDF */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                            title="Buka PDF BAST"
                            disabled={isOpeningPdf}
                            onClick={() => handleOpenBastPdf(req.id)}
                          >
                            {isOpeningPdf ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            BAST
                          </Button>

                          {/* PIC Sign / Validasi button — only on SIAP */}
                          {canSign && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                              title="Validasi & Ambil Barang"
                              onClick={() => handleOpenValidasi(req)}
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Validasi (Mitra)
                            </Button>
                          )}

                          {/* Already signed indicator */}
                          {!canSign && isSigned && (
                            <Badge
                              variant="outline"
                              className="h-8 gap-1 px-2 text-xs font-medium bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            >
                              <Pencil className="h-3 w-3" />
                              Signed
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE VIEW: Vertical Cards */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat riwayat permintaan...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 h-48 justify-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            <AlertTriangle className="h-10 w-10 text-destructive/70" />
            <p className="text-sm font-medium">{loadError}</p>
            <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4" /> Muat Ulang
            </Button>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 h-48 bg-muted/30 rounded-xl border border-dashed text-muted-foreground">
            <ClipboardList className="h-10 w-10 opacity-30" />
            {searchTerm ? (
              <p className="text-sm">Tidak ada hasil pencarian</p>
            ) : (
              <div className="text-center flex flex-col items-center gap-2">
                <p className="text-sm font-medium">Belum ada permintaan</p>
                <Button size="sm" className="mt-1 gap-1.5" onClick={() => navigate("/partner-request/new")}>
                  <FilePlus className="h-4 w-4" /> Ajukan Request
                </Button>
              </div>
            )}
          </div>
        ) : (
          paginatedRequests.map((req) => {
            const itemSummary = getItemsSummary(req)
            const adminRemarks = getAdminRemarks(req)
            const statusUpper = req.status?.toUpperCase?.()?.trim() ?? ""
            const hasBast = ["SIAP", "SELESAI", "DITERIMA"].includes(statusUpper)
            const canSign = statusUpper === "SIAP" && !req.deliveryDocument?.picSignedById
            const isSigned = !!req.deliveryDocument?.picSignedById
            const isOpeningPdf = openingPdfId === req.id

            return (
              <div
                key={req.id || req.requestNumber}
                className="group relative overflow-hidden flex flex-col bg-card border border-border rounded-2xl shadow-sm transition-all active:scale-[0.98]"
              >
                {/* Header Card (No Request & Status) */}
                <div className="flex justify-between items-start p-4 pb-3 border-b border-border/50 bg-muted/20">
                  <div className="flex flex-col gap-1 pr-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      {req.requestNumber || "-"}
                    </span>
                    <h3 className="text-[15px] font-bold text-foreground leading-snug line-clamp-2 mt-1">
                      {itemSummary}
                    </h3>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tanggal</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary/70" />
                        {formatDate(req.requestedAt)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-primary/70" />
                        {req.itemsCount ?? "-"} item
                      </span>
                    </div>
                  </div>

                  {adminRemarks && adminRemarks !== "-" && (
                    <div className={cn(
                      "p-3 rounded-xl flex items-start gap-2.5 border text-xs",
                      statusUpper === "DITOLAK"
                        ? "bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-600 dark:text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                    )}>
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {statusUpper === "DITOLAK" ? "Alasan Penolakan" : "Catatan Admin"}
                        </span>
                        <span className="text-[13px] font-medium leading-relaxed text-foreground/90 dark:text-red-200">
                          {adminRemarks}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {hasBast && (
                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 gap-2 text-[13px] font-semibold flex-1 rounded-xl shadow-sm cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                        disabled={isOpeningPdf}
                        onClick={() => handleOpenBastPdf(req.id)}
                      >
                        {isOpeningPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Lihat BAST
                      </Button>
                      
                      {canSign && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-10 gap-2 text-[13px] font-bold flex-1 rounded-xl shadow-md cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleOpenValidasi(req)}
                        >
                          <PackageCheck className="h-4 w-4" />
                          Ambil Barang
                        </Button>
                      )}
                      
                      {!canSign && isSigned && (
                        <Badge variant="secondary" className="h-10 gap-1.5 flex-1 justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none font-bold text-[13px]">
                          <CheckCircle2 className="h-4 w-4" />
                          Sudah Validasi
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {!isLoading && filteredRequests.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} dari{" "}
            {filteredRequests.length} permintaan
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="rounded border px-3 py-1 text-xs font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* BAST Digital Signature Dialog */}
      <DigitalSignatureDialog
        open={signDialogOpen}
        onOpenChange={(open) => {
          setSignDialogOpen(open)
          if (!open) setSigningRequestId(null)
        }}
        title="Tanda Tangan Digital BAST"
        description="Berikan tanda tangan Anda sebagai pihak penerima untuk dokumen BAST ini."
        onSignComplete={handleSignComplete}
      />

      {/* Validasi & Ambil (Scanner) Modal */}
      {activeRequest && (
        <PengambilanMitraModal
          isOpen={validasiMitraOpen}
          onOpenChange={setValidasiMitraOpen}
          request={activeRequest}
          onSuccess={() => {
            fetchRequests()
            toast.success("Barang berhasil divalidasi dan diambil!")
          }}
        />
      )}
    </div>
  )
}
