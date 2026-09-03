import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  Loader2,
  ScanLine,
  X,
  GripVertical,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { CameraScanner } from "@/components/camera-scanner"

// ── Types ──────────────────────────────────────────────────────────────

interface RequestItemDetail {
  id: string
  category: string
  brand: string
  model: string
  quantity: number
  materialCategoryId: number
  brandId: number | null
  modelId: number | null
}

interface RequestDetail {
  id: string
  requestNumber: string
  requesterName: string
  partnerCategory: string
  status: string
  notes: string
  requestedAt: string
  requestItems: RequestItemDetail[]
}

interface InventoryItem {
  id: string
  serialNumber: string
  paNumber?: string
  status: string
  model: {
    nama: string
    brand: {
      id: number
      nama: string
    }
    materialCategory: {
      id: number
      nama: string
    }
  }
  location?: {
    name: string
  }
}

interface ScannedItem {
  inventoryItem: InventoryItem
}

// ── Helpers ────────────────────────────────────────────────────────────

const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
};

const normalize = (str: string) => str.trim().toUpperCase()

// ── Main Component ──────────────────────────────────────────────────────

interface SortableRowProps {
  item: ScannedItem
  index: number
  onDelete: (serialNumber: string) => void
}

function SortableRow({ item, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.inventoryItem.serialNumber })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className="bg-card">
      <TableCell className="w-10 px-2 text-center">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground text-muted-foreground flex items-center justify-center">
          <GripVertical className="size-3" />
        </div>
      </TableCell>
      <TableCell>
        {item.inventoryItem.serialNumber}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{item.inventoryItem.model?.nama || "-"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{item.inventoryItem.model?.brand?.nama || "-"}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-normal px-2.5 py-0.5">
          {item.inventoryItem.model?.materialCategory?.nama || "-"}
        </Badge>
      </TableCell>
      <TableCell className="w-14 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(item.inventoryItem.serialNumber)}
        >
          <X className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function PreparePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  const [kodeBarang, setKodeBarang] = useState("")
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [_isSubmitting, setIsSubmitting] = useState(false)
  const [openScanner, setOpenScanner] = useState(false)
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)

  const inputRef = useRef<HTMLInputElement>(null)
  const kodeBarangRef = useRef("")

  // Fetch Data
  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [requestRes, itemsRes] = await Promise.all([
          api.get(`/requests/${id}`),
          api.get("/items"),
        ])

        const r = requestRes.data?.data || requestRes.data
        const formattedRequest: RequestDetail = {
          id: r.id,
          requestNumber: r.requestNumber,
          requesterName: r.requester?.profile?.nama || r.requester?.username || "Unknown",
          partnerCategory: r.requester?.profile?.partnerType || "Mitra",
          status: r.status,
          notes: r.notes || "-",
          requestedAt: r.requestedAt,
          requestItems: r.requestItems?.map((ri: any) => ({
            id: ri.id,
            category: ri.materialCategory?.nama,
            brand: ri.brand?.nama || "-",
            model: ri.model?.nama || "-",
            quantity: ri.quantity,
            materialCategoryId: ri.materialCategoryId,
            brandId: ri.brandId,
            modelId: ri.modelId,
          })) || [],
        }
        setRequest(formattedRequest)

        const rawItems = itemsRes.data
        const items: InventoryItem[] = Array.isArray(rawItems.data || rawItems)
          ? (rawItems.data || rawItems)
          : []

        // Hanya ambil barang yang statusnya tersedia
        setInventoryItems(items.filter((i) => i.status?.toLowerCase() === "tersedia"))

        // Ekstrak alokasi yang sudah ada jika request berstatus SIAP atau sudah ada alokasi
        const existingAllocations: ScannedItem[] = []
        r.requestItems?.forEach((ri: any) => {
          if (ri.allocations) {
            ri.allocations.forEach((alloc: any) => {
              const itemObj = alloc.item || alloc
              if (itemObj) {
                existingAllocations.push({
                  inventoryItem: {
                    id: itemObj.id,
                    serialNumber: itemObj.serialNumber,
                    paNumber: itemObj.paNumber || itemObj.model?.code,
                    status: itemObj.status,
                    model: itemObj.model || {
                      nama: itemObj.tipe || "-",
                      brand: { id: 0, nama: itemObj.merek || itemObj.brand?.nama || "-" },
                      materialCategory: { id: 0, nama: itemObj.kategori || itemObj.materialCategory?.nama || ri.category || "ONT" }
                    },
                    location: itemObj.lokasiPenyimpanan ? { name: itemObj.lokasiPenyimpanan } : (itemObj.lokasi ? { name: itemObj.lokasi.nama } : undefined)
                  }
                })
              }
            })
          }
        })

        if (existingAllocations.length > 0) {
          setScannedItems(existingAllocations)
        }
      } catch (error: any) {
        toast.error("Gagal memuat data")
        navigate("/request")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id, navigate])
  const updateKodeBarang = useCallback((value: string | ((prev: string) => string)) => {
    const nextValue = typeof value === "function" ? value(kodeBarangRef.current) : value;
    kodeBarangRef.current = nextValue;
    setKodeBarang(nextValue);
  }, []);

  const focusKodeBarangInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Auto-focus pada mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  // Global Keyboard Listener untuk Auto Scan
  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return;
      }
      const isSupportedKey = event.key.length === 1 || event.key === "Backspace" || event.key === "Enter";
      if (!isSupportedKey || isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();

      if (event.key === "Enter") {
        void handleScanSubmit(kodeBarangRef.current);
        return;
      }
      if (event.key === "Backspace") {
        updateKodeBarang((current) => current.slice(0, -1));
        return;
      }
      updateKodeBarang((current) => `${current}${event.key}`);
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [updateKodeBarang]);

  // Validasi dan Submit Scan
  const handleScanSubmit = useCallback((kodeOverride: any = kodeBarang) => {
    let codeStr = kodeBarang;
    if (typeof kodeOverride === "string") {
      codeStr = kodeOverride;
    } else if (Array.isArray(kodeOverride) && kodeOverride.length > 0) {
      codeStr = kodeOverride[0];
    }
    const sn = codeStr.trim()
    if (!sn) return

    // 1. Cek apakah sudah discan di sesi ini
    const isDuplicate = scannedItems.some(si => normalize(si.inventoryItem.serialNumber) === normalize(sn))
    if (isDuplicate) {
      toast.error("Barang sudah discan di sesi ini", { description: sn })
      updateKodeBarang("")
      focusKodeBarangInput()
      return
    }

    // 2. Cari di inventaris (yang statusnya tersedia)
    const item = inventoryItems.find(i => normalize(i.serialNumber) === normalize(sn))
    if (!item) {
      toast.error("Barang tidak ditemukan atau tidak tersedia", { description: sn })
      updateKodeBarang("")
      focusKodeBarangInput()
      return
    }

    // Sukses, masukkan ke daftar
    setScannedItems(prev => [{ inventoryItem: item }, ...prev])
    toast.success("Berhasil ditambahkan")

    updateKodeBarang("")
    focusKodeBarangInput()
  }, [kodeBarang, scannedItems, inventoryItems, updateKodeBarang, focusKodeBarangInput])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setScannedItems((items) => {
        const oldIndex = items.findIndex((i) => i.inventoryItem.serialNumber === active.id)
        const newIndex = items.findIndex((i) => i.inventoryItem.serialNumber === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleDeleteItem = (serialNumber: string) => {
    setScannedItems(prev => prev.filter(i => i.inventoryItem.serialNumber !== serialNumber))
    focusKodeBarangInput()
  }

  const handleSaveAll = async () => {
    if (!request || scannedItems.length === 0) {
      toast.error("Belum ada material yang disiapkan")
      return
    }

    const totalRequested = request.requestItems.reduce((acc, ri) => acc + (ri.quantity || 1), 0)
    if (scannedItems.length < totalRequested) {
      const confirmed = window.confirm(`Alokasi material belum lengkap (${scannedItems.length} dari ${totalRequested} item disiapkan). Yakin ingin menyimpan status Siap?`)
      if (!confirmed) return
    }

    setIsSubmitting(true)

    try {
      const itemIds = scannedItems.map(si => si.inventoryItem.id)

      await api.post(`/requests/${request.id}/allocate`, {
        itemIds
      })

      // Update status ke SIAP
      await api.put(`/requests/${request.id}/status`, { status: "SIAP" })

      toast.success("Barang berhasil disiapkan dan dialokasikan!")
      navigate("/request")
    } catch (error: any) {
      toast.error(error.message || "Gagal mengalokasikan barang")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!request) return null

  return (
    <div className="@container/main flex min-h-full flex-col gap-4 p-4 pb-36 md:gap-6 md:p-6 md:pb-8">

      {/* Main Content Grid */}
      <div className="grid gap-4 @5xl/main:grid-cols-[minmax(320px,380px)_1fr]">

        {/* Left Panel - Scanner Input */}
        <Card className="@container/card flex flex-col">
          <CardHeader className="flex flex-col gap-4 pb-2 border-b">
            <h3 className="text-lg font-semibold leading-none tracking-tight">Pindai / Input Manual</h3>
            <p className="text-sm text-muted-foreground">Masukkan kode atau serial number (SN) barang.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="kode-barang-manual">Kode / SN</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="kode-barang-manual"
                  value={kodeBarang}
                  onChange={(e) => updateKodeBarang(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleScanSubmit(kodeBarangRef.current);
                    }
                  }}
                  placeholder="Masukkan serial number"
                  className="flex-1"
                />
                {isAndroid && (
                  <CameraScanner
                    open={openScanner}
                    onOpenChange={setOpenScanner}
                    onScan={(val) => {
                      void handleScanSubmit(val);
                      setOpenScanner(false);
                    }}
                  >
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all px-3"
                      title="Buka Kamera Scan"
                    >
                      <ScanLine className="size-5" />
                    </Button>
                  </CameraScanner>
                )}
              </div>
              <Button className="w-full mt-2 font-semibold" onClick={() => void handleScanSubmit(kodeBarangRef.current)}>
                Tambah ke Alokasi
              </Button>
            </div>

            {/* Target vs Progress Alokasi */}
            <div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-xl border border-border/60 mt-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Rincian Permintaan</span>
                <span className={scannedItems.length === request.requestItems.reduce((acc, ri) => acc + (ri.quantity || 1), 0) ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {scannedItems.length} / {request.requestItems.reduce((acc, ri) => acc + (ri.quantity || 1), 0)} Disiapkan
                </span>
              </div>
              <div className="flex flex-col gap-1.5 mt-1 max-h-60 overflow-y-auto pr-1">
                {request.requestItems.map((ri, idx) => {
                  const targetQty = ri.quantity || 1
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs bg-background/90 p-2.5 rounded-lg border border-border/40">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-foreground truncate">{ri.category} {ri.brand && ri.brand !== "-" ? `(${ri.brand})` : ""}</span>
                        <span className="text-[11px] text-muted-foreground truncate">{ri.model && ri.model !== "-" ? `Model: ${ri.model}` : "Semua Model"}</span>
                      </div>
                      <Badge variant="outline" className="text-xs px-2 py-0.5 font-bold shrink-0">
                        Target: {targetQty}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Scanned Items List */}
        <div className="flex flex-col space-y-4 min-w-0">
          <div className="overflow-x-auto rounded-md border bg-card min-h-[140px]">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Nama Material</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={scannedItems.map(si => si.inventoryItem.serialNumber)} strategy={verticalListSortingStrategy}>
                    {scannedItems.map((item, index) => (
                      <SortableRow key={item.inventoryItem.serialNumber} item={item} index={index} onDelete={handleDeleteItem} />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full cursor-pointer" onClick={() => navigate("/request")}>
              Tutup
            </Button>
            <Button className="w-full cursor-pointer" onClick={handleSaveAll}>
              Simpan
            </Button>
          </div>
        </div>
      </div >
    </div >
  )
}
