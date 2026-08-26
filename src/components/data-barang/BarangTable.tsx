import { MoreVertical } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BarangUnit, StatusUnit } from "@/types/inventory"
import { formatItemLocation } from "@/lib/status-helper"

interface BarangTableProps {
  items: BarangUnit[]
  selectedIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectRow: (checked: boolean, id: string) => void
  onItemClick: (item: BarangUnit) => void
  onOpenEdit: (item: BarangUnit) => void
  onDelete: (id: string) => void
  userRole?: string
  currentPage: number
  pageSize: number
  getStatusBadgeProps: (status: StatusUnit, lokasi?: string) => { text: string; dotClass?: string; badgeClass?: string }
  formatTanggal: (tgl: string) => string
  ADMIN_LOCATION: string
}

export function BarangTable({
  items,
  selectedIds,
  onSelectAll,
  onSelectRow,
  onItemClick,
  onOpenEdit,
  onDelete,
  userRole,
  currentPage,
  pageSize,
  getStatusBadgeProps,
  formatTanggal: _formatTanggal,
  ADMIN_LOCATION,
}: BarangTableProps) {
  const isAllSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id))

  return (
    <div className="relative min-h-0 flex-1 rounded-md border border-border/60 bg-card/40 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12 text-center text-xs font-semibold">No.</TableHead>
            {userRole === "admin" && (
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                  aria-label="Pilih semua"
                />
              </TableHead>
            )}
            <TableHead className="w-44 text-xs font-semibold">Serial Number (SN)</TableHead>
            <TableHead className="w-32 text-xs font-semibold">Merek</TableHead>
            <TableHead className="w-32 text-xs font-semibold">Kategori</TableHead>
            <TableHead className="w-24 text-xs text-center font-semibold">Kondisi</TableHead>
            <TableHead className="w-32 text-xs text-center font-semibold">Status</TableHead>
            <TableHead className="text-xs text-center font-semibold">Lokasi Penyimpanan</TableHead>
            {userRole === "admin" && (
              <TableHead className="w-36 text-xs font-semibold">Tempat</TableHead>
            )}
            {userRole === "admin" && (
              <TableHead className="w-12 text-right"></TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const badge = getStatusBadgeProps(item.status, item.lokasiPenyimpanan)
            const isSelected = selectedIds.includes(item.id)
            const itemKondisi = (item as any).kondisi || (item.status === "Rusak" ? "Rusak" : item.status === "Dismantle" ? "Dismantle" : "Baru")
            const isRusak = itemKondisi.toLowerCase() === "rusak"
            const isDismantle = itemKondisi.toLowerCase() === "dismantle"

            return (
              <TableRow
                key={item.id}
                className="hover:bg-muted/40 transition-colors cursor-pointer text-xs md:text-sm"
                onClick={() => onItemClick(item)}
                data-state={isSelected ? "selected" : undefined}
              >
                <TableCell className="text-center font-medium text-muted-foreground text-xs">
                  {(currentPage - 1) * pageSize + index + 1}
                </TableCell>
                {userRole === "admin" && (
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectRow(checked as boolean, item.id)}
                      aria-label={`Pilih ${item.serialNumber}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono font-medium text-foreground">
                  {item.serialNumber}
                </TableCell>
                <TableCell>{item.merek}</TableCell>
                <TableCell>{item.kategori}</TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                    isRusak
                      ? "bg-red-500/10 text-red-600 border-red-500/20"
                      : isDismantle
                      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  }`}>
                    {itemKondisi}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className={`inline-flex items-center justify-center rounded-lg px-2.5 py-2 font-medium text-xs leading-none ${badge.badgeClass || ""}`}>
                    {badge.text}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {formatItemLocation(item.status, item.lokasiPenyimpanan)}
                </TableCell>
                {userRole === "admin" && (
                  <TableCell>
                    {item.mitra || ADMIN_LOCATION}
                  </TableCell>
                )}
                {userRole === "admin" && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28 text-xs">
                        <DropdownMenuItem onClick={() => onOpenEdit(item)}>
                          Edit Unit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => onDelete(item.id)}
                        >
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
