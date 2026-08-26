import React, { useState, useEffect, useRef } from "react"
import { confirm } from "@tauri-apps/plugin-dialog"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { BastActions } from "./BastActions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DashboardRequest } from "@/types/transaction"
import { RejectRequestModal } from "./RejectRequestModal"


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

/**
 * Wrapper for tables to add dynamic top and bottom scroll shadows
 */
function ScrollShadowWrapper({ children }: { children: React.ReactNode }) {
  const [canScrollTop, setCanScrollTop] = useState(false)
  const [canScrollBottom, setCanScrollBottom] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(40)
  const scrollRef = useRef<HTMLDivElement>(null)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      setCanScrollTop(scrollTop > 0)
      setCanScrollBottom(Math.ceil(scrollTop + clientHeight) < scrollHeight)

      const thead = scrollRef.current.querySelector('thead')
      if (thead) {
        setHeaderHeight(thead.offsetHeight)
      }
    }
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => checkScroll())
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    const thead = el.querySelector('thead')
    if (thead) observer.observe(thead)
    return () => observer.disconnect()
  }, [children])

  return (
    <div className="rounded-lg border overflow-hidden relative">
      <div
        ref={scrollRef}
        className="overflow-auto max-h-62 xl:max-h-92 overscroll-contain [&>div]:overflow-visible [&>div]:static"
        onScroll={checkScroll}
      >
        {children}
      </div>
      {canScrollTop && (
        <div
          className="absolute left-0 right-0 h-6 bg-linear-to-b from-card to-transparent pointer-events-none z-30"
          style={{ top: `${headerHeight}px` }}
        />
      )}
      {canScrollBottom && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-card to-transparent pointer-events-none rounded-b-lg z-30" />
      )}
    </div>
  )
}

/**
 * Drawer detail permintaan. Menampilkan informasi lengkap dari sebuah request.
 */
export function RequestDetailDrawer({
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
  useAuth()
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
        const response = await api.get(`/requests/${item.id}`)
        const data = response.data
        const formatted: DashboardRequest = {
          id: data.id,
          requestNumber: data.requestNumber,
          requesterName: data.requester?.profile?.nama || data.requester?.username,
          partnerCategory: data.requester?.profile?.partnerType || "Mitra",
          targetPartnerId: data.targetPartnerId,
          status: data.status,
          notes: data.notes || "-",
          rejectionReason: data.rejectionReason || data.adminRemarks || data.adminNotes || data.remarks,
          requestedAt: data.requestedAt,
          itemsCount: data.requestItems?.reduce((acc: number, ri: any) => acc + (ri.quantity || 1), 0) || 0,
          requestItems: data.requestItems?.map((ri: any) => ({
            id: ri.id,
            category: getCleanCategoryName(ri.materialCategory?.nama || ri.category?.nama || ri.category),
            brand: ri.brand?.nama || ri.brand || "-",
            model: ri.model?.nama || ri.model?.name || ri.model || "-",
            quantity: ri.quantity,
            unit: getUnitByCategory(ri.materialCategory?.nama || ri.category?.nama || ri.category)
          })),
          requestAllocations: data.requestItems?.flatMap((ri: any) =>
            ri.allocations?.map((alloc: any) => {
              const itemObj = alloc.item || alloc
              const catName = getCleanCategoryName(itemObj?.model?.materialCategory?.nama || itemObj?.kategori || ri.materialCategory?.nama || ri.category?.nama)
              const brandName = itemObj?.brand?.nama || itemObj?.model?.brand?.nama || itemObj?.merek || ri.brand?.nama || ri.brand || "-"
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
          deliveryDocument: data.deliveryDocument ? {
            kpSignedById: data.deliveryDocument.kpSignedById,
            picSignedById: data.deliveryDocument.picSignedById
          } : null
        }
        setDetailData(formatted)
      } catch (error) {
        console.error("Gagal memuat detail request:", error)
        toast.error("Gagal memuat detail alokasi barang")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetail()
  }, [open, item?.id])

  if (!item) return null

  const displayItem = detailData || item

  const handleAction = async (newStatus: string, requireConfirm: boolean = false) => {
    if (!displayItem?.id || !onStatusChange) return;

    // Siapkan: navigate to prepare page instead of changing status directly
    if (newStatus === "Siap") {
      onClose()
      navigate(`/request/${displayItem.id}/prepare`)
      return;
    }

    if (requireConfirm) {
      const isConfirmed = await confirm("Apakah Anda yakin ingin melakukan tindakan ini pada permintaan?");
      if (!isConfirmed) {
        return;
      }
    }

    onStatusChange(displayItem.id, newStatus);
    onClose();
  };

  return (
    <Drawer direction={"bottom"} open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{displayItem.requestNumber.toUpperCase()}</DrawerTitle>
          <DrawerDescription>
            Detail Permintaan
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4 text-sm min-h-37.5 justify-center">
          {displayItem.status?.toUpperCase() === 'DITOLAK' && displayItem.rejectionReason && (
            <div className="p-3.5 bg-destructive/10 rounded-xl text-sm text-destructive border border-destructive/20 flex flex-col gap-1">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <span className="size-4 rounded-full bg-destructive/20 flex items-center justify-center text-[10px]">!</span>
                Alasan Penolakan:
              </span>
              <p className="text-foreground/90 font-medium text-xs leading-relaxed">{displayItem.rejectionReason}</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat detail alokasi...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {['SIAP', 'SELESAI', 'DITERIMA'].includes(displayItem.status?.toUpperCase() || "") ? (
                <ScrollShadowWrapper>
                  <Table className="whitespace-nowrap">
                    <TableHeader className="sticky top-0 z-20 bg-muted shadow-md">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12">No</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>No. Material</TableHead>
                        <TableHead>Nama Material</TableHead>
                        <TableHead>Merek</TableHead>
                        <TableHead>Serial Number (SN)</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Satuan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayItem.requestAllocations && displayItem.requestAllocations.length > 0 ? (
                        displayItem.requestAllocations.map((ra, idx) => (
                          <TableRow key={ra.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{ra.materialCategory}</TableCell>
                            <TableCell className="font-medium text-muted-foreground" title={ra.materialNumber}>{ra.materialNumber}</TableCell>
                            <TableCell className="truncate max-w-50" title={ra.materialName}>{ra.materialName}</TableCell>
                            <TableCell>{ra.brand}</TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {ra.serialNumber || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">{ra.quantity}</TableCell>
                            <TableCell className="text-right font-medium">{ra.unit || "Unit"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            Belum ada alokasi material spesifik.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollShadowWrapper>
              ) : displayItem.status?.toUpperCase() === 'DISETUJUI' ? (
                <ScrollShadowWrapper>
                  <Table>
                    <TableHeader className="sticky top-0 z-20 bg-muted shadow-md">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 px-4">No</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Merek</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right px-4">Satuan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayItem.requestItems && displayItem.requestItems.length > 0 ? (
                        displayItem.requestItems.map((ri, idx) => (
                          <TableRow key={ri.id}>
                            <TableCell className="text-muted-foreground px-4">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{ri.category}</TableCell>
                            <TableCell>{ri.brand}</TableCell>
                            <TableCell className="text-right font-medium">{ri.quantity}</TableCell>
                            <TableCell className="text-right font-medium px-4">Unit</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            Tidak ada item.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollShadowWrapper>
              ) : displayItem.requestItems && displayItem.requestItems.length > 0 ? (
                <>
                  <ScrollShadowWrapper>
                    <Table className="text-sm border rounded-lg bg-background whitespace-nowrap table-fixed">
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="w-12 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">No</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Merek</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead className="text-right px-4">Satuan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayItem.requestItems.map((ri, idx) => (
                          <TableRow key={ri.id}>
                            <TableCell className="text-muted-foreground px-4">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{ri.category}</TableCell>
                            <TableCell>{ri.brand}</TableCell>
                            <TableCell className="text-right font-medium">{ri.quantity}</TableCell>
                            <TableCell className="text-right font-medium px-4">Unit</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollShadowWrapper>
                </>
              ) : (
                <p className="text-muted-foreground italic text-sm">Tidak ada item.</p>
              )}
            </div>
          )}
        </div>
        <DrawerFooter className="w-full pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,24px))] bg-background border-t shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] z-50">
          <div className="flex w-full gap-3 px-2">
            {isAdmin && ['MENUNGGU'].includes(displayItem.status?.toUpperCase() || "") && (
              <>
                <Button variant="default" className="flex-1 cursor-pointer bg-primary text-primary-foreground font-bold shadow-md h-11" onClick={() => navigate(`/request/${displayItem.id}/prepare`)}>Siapkan Material</Button>
                <Button variant="destructive" className="flex-1 cursor-pointer font-bold shadow-md h-11" onClick={() => setRejectModalOpen(true)}>Tolak Permintaan</Button>
              </>
            )}
            {
              isAdmin && ['SIAP'].includes(displayItem.status?.toUpperCase() || "") && (
                <>
                  <Button variant="default" className="flex-1 cursor-pointer bg-primary text-primary-foreground font-bold shadow-md h-11" onClick={() => navigate(`/request/${displayItem.id}/prepare`)}>Edit</Button>
                  <Button variant="destructive" className="flex-1 cursor-pointer font-bold shadow-md h-11" onClick={() => handleAction("Dibatalkan", true)}>Batalkan</Button>
                </>
              )
            }
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 cursor-pointer font-bold h-11 border-border/60 hover:bg-muted shadow-sm">Tutup</Button>
            </DrawerClose>
          </div>
          <div className="flex w-full mt-2 justify-center pt-2">
             <BastActions request={displayItem} onStatusChange={(_id, status) => handleAction(status)} />
          </div>
        </DrawerFooter>
      </DrawerContent>

      <RejectRequestModal
        isOpen={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onSubmit={(reason) => {
          onStatusChange?.(displayItem.id, "Ditolak", reason)
          setRejectModalOpen(false)
          onClose()
        }}
      />
    </Drawer>
  )
}
