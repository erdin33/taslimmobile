import { useState, useEffect } from "react"
import { Search, ListFilter, Package, ChevronRight, Calendar, EllipsisVertical, FileUp, Loader2, FileText, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSearchParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { useAuth } from "@/lib/auth"
import { getBaseUrl } from "@/lib/api"
import type { DashboardRequest } from "@/types/transaction"
import { BastActions } from "@/features/transactions/components/BastActions"
import { RejectRequestModal } from "@/features/transactions/components/RejectRequestModal"

const getUnitByCategory = (categoryName?: string) => {
  if (!categoryName) return "Unit";
  const name = categoryName.toLowerCase();
  if (name.includes("kabel") || name.includes("foc") || name.includes("dropwire")) {
    return "Meter";
  }
  return "Unit";
};

const getCleanCategoryName = (categoryName?: string) => {
  if (!categoryName) return "-";
  const name = categoryName.toLowerCase();
  if (name.includes("ont")) return "ONT";
  if (name.includes("dropwire") || name.includes("kabel") || name.includes("foc")) return "DropWire";
  return categoryName;
};

const getHeaders = () => {
  const token = localStorage.getItem("taslim-auth-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `${token}`;
  }
  return headers;
};

function MobileRequestList({
  data,
  onRowClick,
  onPrepare,
  onReject,
  isAdmin,
  isProcessingId,
}: {
  data: DashboardRequest[],
  onRowClick: (item: DashboardRequest) => void,
  onPrepare?: (item: DashboardRequest) => void,
  onReject?: (item: DashboardRequest) => void,
  isAdmin?: boolean,
  isProcessingId?: string | null,
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <p className="text-muted-foreground font-medium text-sm">Tidak ada permintaan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-24 pt-2">
      {data.map((item) => {
        const date = new Date(item.requestedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })

        const statusUpper = item.status.toUpperCase()

        return (
          <div
            key={item.id}
            onClick={() => onRowClick(item)}
            className="group relative bg-card border border-border/70 rounded-2xl p-4 shadow-xs hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer overflow-hidden flex flex-col gap-3"
          >
            {/* Header: Request ID, Requester & Status Badge */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  {item.requestNumber}
                </span>
                <h3 className="text-base font-bold text-foreground leading-tight truncate">
                  {item.requesterName}
                </h3>
                {item.partnerCategory && (
                  <span className="text-xs text-muted-foreground font-medium mt-0.5">
                    {item.partnerCategory}
                  </span>
                )}
              </div>
              <Badge variant="outline" className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border-0 shrink-0 uppercase",
                item.status.toLowerCase() === "menunggu" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                  item.status.toLowerCase() === "siap" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" :
                    item.status.toLowerCase() === "selesai" || item.status.toLowerCase() === "diterima" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                      "bg-red-500/15 text-red-600 dark:text-red-400"
              )}>
                {item.status}
              </Badge>
            </div>

            {/* Daftar Rincian Barang / Permintaan */}
            {item.requestItems && item.requestItems.length > 0 ? (
              <div className="bg-muted/30 dark:bg-zinc-900/50 rounded-xl p-2.5 border border-border/50 text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Package className="size-3 text-primary" /> Rincian Permintaan:
                </span>
                <div className="flex flex-col gap-1">
                  {item.requestItems.map((ri, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="inline-block size-1.5 rounded-full bg-primary/70 shrink-0" />
                        <span className="font-semibold text-foreground truncate">
                          {ri.category || "Barang"}
                          {ri.brand && ri.brand !== "-" ? ` (${ri.brand})` : ""}
                          {ri.model && ri.model !== "-" ? ` · ${ri.model}` : ""}
                        </span>
                      </div>
                      <span className="font-bold text-primary shrink-0 text-xs">
                        {ri.quantity} <span className="font-normal text-muted-foreground text-[11px]">{ri.unit || "Unit"}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Alasan Penolakan (khusus status Ditolak atau jika ada alasan) */}
            {statusUpper === "DITOLAK" && item.rejectionReason && (
              <div className="bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs flex flex-col gap-1 text-red-600 dark:text-red-400">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-700 dark:text-red-300">
                  <AlertTriangle className="size-3.5 shrink-0" /> Alasan Penolakan:
                </span>
                <p className="text-foreground/90 dark:text-red-200 font-medium leading-relaxed">
                  {item.rejectionReason}
                </p>
              </div>
            )}

            {/* Keterangan / Catatan Request */}
            {item.notes && item.notes !== "-" ? (
              <div className="bg-muted/40 dark:bg-zinc-900/60 rounded-xl p-2.5 border border-border/40 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                  <FileText className="size-3 text-primary" /> Keterangan:
                </span>
                <p className="text-foreground/90 font-medium leading-relaxed line-clamp-2">
                  {item.notes}
                </p>
              </div>
            ) : null}

            {/* Meta Info: Tanggal & Jumlah Item */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="size-3.5 text-muted-foreground/70" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Package className="size-3.5 text-muted-foreground/70" />
                  <span>{item.itemsCount || 0} Item</span>
                </div>
              </div>
              <span className="text-[11px] text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Detail <ChevronRight className="size-3.5" />
              </span>
            </div>

            {/* Direct Admin Action Buttons on Card */}
            {isAdmin && statusUpper === "MENUNGGU" && (
              <div
                className="flex items-center gap-2 pt-2.5 border-t border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                  onClick={() => onReject?.(item)}
                  disabled={isProcessingId === item.id}
                >
                  {isProcessingId === item.id ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Tolak
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                  onClick={() => onPrepare?.(item)}
                  disabled={isProcessingId === item.id}
                >
                  Siapkan Barang
                </Button>
              </div>
            )}

            {isAdmin && statusUpper === "SIAP" && (
              <div
                className="flex items-center gap-2 pt-2.5 border-t border-border/60"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  className="w-full h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  onClick={() => onPrepare?.(item)}
                >
                  Edit Alokasi Barang
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DataTransaksiPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get("tab") || "Menunggu"
  const [selectedRequest, setSelectedRequest] = useState<DashboardRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DashboardRequest | null>(null)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      prev.set("tab", value)
      return prev
    }, { replace: true })
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [localRequests, setLocalRequests] = useState<DashboardRequest[]>([])

  const categoryOptions = Array.from(
    new Set(localRequests.map((r) => r.partnerCategory).filter((c): c is string => !!c))
  ).sort()

  const [filterCategories, setFilterCategories] = useState<string[]>([])

  const toggleFilterCategory = (category: string) => {
    setFilterCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const clearFilters = () => setFilterCategories([])

  const handleStatusChange = async (id: string, newStatus: string, rejectionReason?: string) => {
    try {
      const payload: any = {
        status: newStatus.toUpperCase(),
        ...(rejectionReason && {
          rejectionReason,
          adminRemarks: rejectionReason,
          adminNotes: rejectionReason,
          remarks: rejectionReason,
          notes: rejectionReason,
          catatan: rejectionReason,
        })
      };
      const res = await fetch(`${getBaseUrl()}/requests/${id}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal mengubah status");
      }

      setLocalRequests(prev => prev.map(req => {
        if (req.id === id) {
          return { ...req, status: newStatus, ...(rejectionReason && { rejectionReason }) }
        }
        return req
      }))
      toast.success(`Status transaksi berhasil diubah menjadi ${newStatus}`)
      window.dispatchEvent(new Event("request-count-updated"))
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah status transaksi")
    }
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return
    setIsRejecting(true)
    try {
      await handleStatusChange(rejectTarget.id, "Ditolak", reason)
      setRejectTarget(null)
    } finally {
      setIsRejecting(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/requests`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error("Gagal mengambil data permintaan");
      }
      const json = await res.json();
      const rawList = Array.isArray(json.data || json) ? (json.data || json) : [];
      const data: DashboardRequest[] = rawList.map((r: any) => ({
        ...r,
        id: String(r.id),
        requestNumber: r.requestNumber || r.nomor || "-",
        type: r.type,
        requesterName: r.requester?.profile?.nama || r.requester?.username || r.requesterName || "Mitra",
        partnerCategory: r.requester?.profile?.partnerType || r.partnerCategory || "Mitra",
        status: r.status,
        notes: r.notes || r.catatan || "-",
        rejectionReason: r.rejectionReason || r.adminRemarks || r.adminNotes || r.adminNote || r.remarks || r.rejectionNotes || r.cancelReason || r.alasanPenolakan || undefined,
        requestedAt: r.requestedAt || r.createdAt || new Date().toISOString(),
        itemsCount: r.itemsCount || r.requestItems?.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) || 0,
        requestItems: (r.requestItems || []).map((item: any) => ({
          id: item.id,
          category: getCleanCategoryName(item.category?.nama || item.category),
          brand: item.brand?.nama || item.brand,
          model: item.model?.nama || item.model,
          quantity: item.quantity,
          unit: item.unit || getUnitByCategory(item.category?.nama || item.category)
        })),
        requestAllocations: r.requestAllocations || [],
        deliveryDocument: r.deliveryDocument,
      }));

      setLocalRequests(
        user?.role === "mitra"
          ? data.filter((req) => {
            const reqMitra = req.requesterName?.trim().toLowerCase() || "";
            return (
              reqMitra === user.displayName?.trim().toLowerCase() ||
              reqMitra === user.username?.trim().toLowerCase() ||
              (user.identityCode && reqMitra.includes(user.identityCode.trim().toLowerCase()))
            )
          })
          : data
      );
    } catch (error) {
      console.error("Gagal mengambil data permintaan:", error);
      toast.error("Gagal memuat data permintaan.");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user])

  useEffect(() => {
    const reqId = searchParams.get("reqId")
    if (reqId && localRequests.length > 0) {
      const found = localRequests.find(r => r.id === reqId)
      if (found && !selectedRequest) {
        setSelectedRequest(found)
        setSearchParams((prev) => {
          prev.delete("reqId")
          return prev
        }, { replace: true })
      }
    }
  }, [searchParams, localRequests, selectedRequest, setSearchParams])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 animate-fade-in">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex items-center w-full overflow-x-auto pb-1 scrollbar-hide">
            <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 inline-flex h-auto w-max lg:w-auto">
              <TabsTrigger value="Menunggu" className="cursor-pointer">
                Menunggu <Badge variant="secondary">{localRequests.filter(r => r.status.toLowerCase() === "menunggu").length || ""}</Badge>
              </TabsTrigger>
              <TabsTrigger value="Siap" className="cursor-pointer">Siap</TabsTrigger>
              <TabsTrigger value="Selesai" className="cursor-pointer">Selesai</TabsTrigger>
              <TabsTrigger value="Ditolak" className="cursor-pointer">Ditolak / Batal</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute top-[9px] left-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("shrink-0 gap-1.5 px-3 cursor-pointer", filterCategories.length > 0 && "border-primary text-primary")}
                >
                  <ListFilter className="size-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {filterCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {filterCategories.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {categoryOptions.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={filterCategories.includes(cat)}
                    onCheckedChange={() => toggleFilterCategory(cat)}
                    className="cursor-pointer"
                  >
                    {cat}
                  </DropdownMenuCheckboxItem>
                ))}
                {filterCategories.length > 0 && (
                  <>
                    <DropdownMenuItem
                      className="cursor-pointer text-muted-foreground justify-center text-xs"
                      onClick={clearFilters}
                    >
                      Hapus Filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="px-2 shrink-0 cursor-pointer">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem><FileUp className="mr-1" />Import</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {["Menunggu", "Siap", "Diterima", "Selesai", "Ditolak"].map(status => {
          const filteredByStatus = localRequests.filter((req) => {
            if (status.toLowerCase() === "ditolak") {
              return ["ditolak", "dibatalkan"].includes(req.status.toLowerCase())
            }
            return req.status.toLowerCase() === status.toLowerCase()
          })
          const filteredByCategory = filterCategories.length > 0
            ? filteredByStatus.filter((req) => req.partnerCategory && filterCategories.includes(req.partnerCategory))
            : filteredByStatus

          const finalData = searchTerm.trim()
            ? filteredByCategory.filter((req) =>
              req.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              req.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              req.partnerCategory?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : filteredByCategory

          return (
            <TabsContent key={status} value={status} className="mt-0">
              <MobileRequestList
                data={finalData}
                isAdmin={isAdmin}
                onRowClick={(item) => setSelectedRequest(item)}
                onPrepare={(item) => navigate(`/request/${item.id}/prepare`)}
                onReject={(item) => setRejectTarget(item)}
                isProcessingId={isRejecting ? rejectTarget?.id : null}
              />
            </TabsContent>
          )
        })}
      </Tabs>

      <RequestDetailDrawer
        item={selectedRequest}
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        onStatusChange={(id, newStatus, rejectionReason) => {
          handleStatusChange(id, newStatus, rejectionReason)
          setSelectedRequest(prev => prev ? { ...prev, status: newStatus, ...(rejectionReason && { rejectionReason }) } : null)
        }}
      />

      {/* Modal Input Catatan Tolak Permintaan */}
      <RejectRequestModal
        isOpen={rejectTarget !== null}
        onOpenChange={(open) => !open && !isRejecting && setRejectTarget(null)}
        onSubmit={handleRejectConfirm}
        isSubmitting={isRejecting}
      />
    </div>
  )
}

function RequestDetailDrawer({
  item,
  open,
  onClose,
  onStatusChange,
}: {
  item: DashboardRequest | null
  open: boolean
  onClose: () => void
  onStatusChange?: (id: string, newStatus: string, rejectionReason?: string) => void
}) {
  const navigate = useNavigate()
  const [detailData, setDetailData] = useState<DashboardRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  useEffect(() => {
    if (!open || !item?.id) {
      setDetailData(null)
      return
    }

    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`${getBaseUrl()}/requests/${item.id}`, {
          method: "GET",
          headers: getHeaders(),
        })
        if (!res.ok) throw new Error("Gagal mengambil detail")
        const json = await res.json()
        const data = json.data || json

        const formatted: DashboardRequest = {
          id: data.id,
          requestNumber: data.requestNumber,
          type: data.type,
          requesterName: data.requester?.profile?.nama || data.requester?.username,
          partnerCategory: data.requester?.profile?.partnerType || "Mitra",
          status: data.status,
          notes: data.notes || "-",
          rejectionReason: data.rejectionReason || data.adminRemarks || data.adminNotes || data.remarks,
          requestedAt: data.requestedAt,
          itemsCount: data.requestItems?.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) || 0,
          requestItems: data.requestItems?.map((item: any) => ({
            id: item.id,
            category: getCleanCategoryName(item.materialCategory?.nama || item.category?.nama || item.category),
            brand: item.brand?.nama || item.brand || "-",
            model: item.model?.nama || item.model || "-",
            quantity: item.quantity,
            unit: getUnitByCategory(item.materialCategory?.nama || item.category?.nama || item.category)
          })),
          requestAllocations: data.requestItems?.flatMap((item: any) =>
            item.allocations?.map((alloc: any) => {
              const itemObj = alloc.item || alloc
              const catName = getCleanCategoryName(itemObj?.model?.materialCategory?.nama || itemObj?.kategori || item.materialCategory?.nama || item.category?.nama)
              const brandName = itemObj?.brand?.nama || itemObj?.model?.brand?.nama || itemObj?.merek || item.brand?.nama || item.brand || "-"
              const matCode = itemObj?.paNumber || itemObj?.model?.code || itemObj?.tipe || "-"
              return {
                id: alloc.id || itemObj?.id,
                materialNumber: matCode,
                materialCategory: catName,
                brand: brandName,
                materialName: `${catName} ${brandName}${itemObj?.model?.nama ? ` (${itemObj.model.nama})` : ''}`,
                serialNumber: itemObj?.serialNumber || "-",
                quantity: 1,
                unit: getUnitByCategory(catName)
              }
            }) || []
          ),
          deliveryDocument: data.deliveryDocument,
        }
        setDetailData(formatted)
      } catch (e) {
        console.error(e)
        toast.error("Gagal memuat detail permintaan")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetail()
  }, [open, item?.id])

  const displayItem = detailData || item

  const handleAction = async (newStatus: string, needsConfirm = false, reason?: string) => {
    if (!displayItem) return

    if (newStatus === "Siap") {
      navigate(`/request/${displayItem.id}/prepare`)
      onClose()
      return
    }

    if (needsConfirm) {
      const confirmed = window.confirm(`Yakin ingin mengubah status menjadi "${newStatus}"?`)
      if (!confirmed) return
    }

    try {
      const payload: any = {
        status: newStatus.toUpperCase(),
        ...(reason && {
          rejectionReason: reason,
          adminRemarks: reason,
          adminNotes: reason,
          remarks: reason,
          notes: reason,
          catatan: reason,
        })
      };
      const res = await fetch(`${getBaseUrl()}/requests/${displayItem.id}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Gagal mengubah status")
      }
      toast.success(`Status berhasil diubah menjadi ${newStatus}`)
      if (onStatusChange) onStatusChange(displayItem.id, newStatus, reason)
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah status")
    }
  }

  if (!displayItem) return null

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) onClose() }}>
      <DrawerContent className="max-h-[85svh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="text-left shrink-0 pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold">{displayItem.requestNumber}</DrawerTitle>
            <Badge variant="secondary" className={cn(
              "uppercase text-xs font-bold px-2.5 py-1",
              displayItem.status?.toLowerCase() === "menunggu" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
                displayItem.status?.toLowerCase() === "siap" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400" :
                  displayItem.status?.toLowerCase() === "selesai" || displayItem.status?.toLowerCase() === "diterima" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
                    displayItem.status?.toLowerCase() === "ditolak" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
                      "bg-muted text-muted-foreground"
            )}>
              {displayItem.status}
            </Badge>
          </div>
          <DrawerDescription className="mt-1">
            {displayItem.requesterName} · {displayItem.partnerCategory} · {new Date(displayItem.requestedAt).toLocaleDateString("id-ID")}
          </DrawerDescription>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
          {/* BAST Actions */}
          <BastActions request={displayItem} onStatusChange={onStatusChange} />

          {/* Rejection Reason Banner */}
          {displayItem.status?.toLowerCase() === "ditolak" && displayItem.rejectionReason && (
            <div className="p-3.5 bg-destructive/10 rounded-xl text-sm text-destructive border border-destructive/20 flex flex-col gap-1">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <span className="size-4 rounded-full bg-destructive/20 flex items-center justify-center text-[10px]">!</span>
                Alasan Penolakan:
              </span>
              <p className="text-foreground/90 font-medium text-xs leading-relaxed">{displayItem.rejectionReason}</p>
            </div>
          )}

          {/* Notes */}
          {displayItem.notes && displayItem.notes !== "-" && (
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
              <span className="font-semibold">Catatan: </span>{displayItem.notes}
            </div>
          )}

          {/* Items */}
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Memuat detail...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Daftar Barang</p>
              {['SIAP', 'SELESAI', 'DITERIMA'].includes(displayItem.status?.toUpperCase() || "") && displayItem.requestAllocations && displayItem.requestAllocations.length > 0 ? (
                displayItem.requestAllocations.map((ra, idx) => (
                  <div key={ra.id} className="bg-muted/40 dark:bg-zinc-900/60 border border-border/60 rounded-xl p-3 flex items-center gap-3">
                    <span className="shrink-0 text-xs font-bold text-muted-foreground bg-muted w-7 h-7 rounded-full flex items-center justify-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ra.materialName || ra.brand || "-"}</p>
                      <p className="text-xs text-muted-foreground">{ra.materialCategory} · {ra.materialNumber}</p>
                      {ra.serialNumber && ra.serialNumber !== "-" && (
                        <p className="text-[11px] font-mono text-primary/90 mt-0.5">SN: {ra.serialNumber}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">{ra.quantity}</p>
                      <p className="text-xs text-muted-foreground">{ra.unit}</p>
                    </div>
                  </div>
                ))
              ) : displayItem.requestItems && displayItem.requestItems.length > 0 ? (
                displayItem.requestItems.map((ri, idx) => (
                  <div key={ri.id} className="bg-muted/40 dark:bg-zinc-900/60 border border-border/60 rounded-xl p-3 flex items-center gap-3">
                    <span className="shrink-0 text-xs font-bold text-muted-foreground bg-muted w-7 h-7 rounded-full flex items-center justify-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ri.brand || "-"}</p>
                      <p className="text-xs text-muted-foreground">{ri.category}{ri.model && ri.model !== "-" ? ` · ${ri.model}` : ""}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold">{ri.quantity}</p>
                      <p className="text-xs text-muted-foreground">{ri.unit}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic text-sm px-1">Tidak ada item.</p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="shrink-0 p-4 pb-12 bg-background border-t shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]">
          <div className="flex w-full gap-3">
            {isAdmin && ['MENUNGGU'].includes(displayItem.status?.toUpperCase() || "") && (
              <>
                <Button className="flex-1 h-12 font-bold text-sm bg-primary text-primary-foreground shadow-md" onClick={() => { navigate(`/request/${displayItem.id}/prepare`); onClose(); }}>Siapkan Material</Button>
                <Button variant="destructive" className="flex-1 h-12 font-bold text-sm shadow-md" onClick={() => setRejectModalOpen(true)}>Tolak</Button>
              </>
            )}
            {isAdmin && ['SIAP'].includes(displayItem.status?.toUpperCase() || "") && (
              <>
                <Button className="flex-1 h-12 font-bold text-sm bg-primary text-primary-foreground shadow-md" onClick={() => { navigate(`/request/${displayItem.id}/prepare`); onClose(); }}>Edit Alokasi</Button>
                <Button variant="destructive" className="flex-1 h-12 font-bold text-sm shadow-md" onClick={() => handleAction("Dibatalkan", true)}>Batalkan</Button>
              </>
            )}
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 h-12 font-bold text-sm border-border/60">Tutup</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>

      <RejectRequestModal
        isOpen={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onSubmit={(reason) => {
          handleAction("Ditolak", false, reason)
          setRejectModalOpen(false)
        }}
      />
    </Drawer>
  )
}
