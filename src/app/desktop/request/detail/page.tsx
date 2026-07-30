import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useRequestDetail } from "@/features/request-detail/hooks/useRequestDetail";
import { BastActions } from "@/features/transactions/components/BastActions";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { request, isLoading } = useRequestDetail(id);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat detail permintaan...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <h2 className="text-xl font-semibold">Data Permintaan Tidak Ditemukan</h2>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="size-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:block print:max-w-none">
      <div className="flex items-center gap-4 border-b pb-4 print:hidden">
        <Button onClick={() => navigate(-1)} variant="outline" size="icon" className="shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">{request.requestNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Detail Informasi Permintaan
          </p>
        </div>
        <div className="ml-auto flex gap-2 items-center shrink-0">
          <BastActions request={request} />
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium uppercase tracking-wider ml-2">
            {request.status}
          </Badge>
        </div>
      </div>

      <div className={`grid gap-6 grid-cols-1 print:block print:gap-0`}>
        {/* ===== KOLOM KIRI: Detail Transaksi ===== */}
        <div className="flex flex-col gap-6 print:hidden">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Informasi Umum</CardTitle>
              <CardDescription>Rincian pemohon dan waktu pengajuan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Pemohon</Label>
                  <div className="font-semibold text-base">{request.requesterName}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Kategori</Label>
                  <div className="font-semibold text-base">{request.partnerCategory}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Tanggal Pengajuan</Label>
                  <div className="font-semibold text-base">
                    {new Date(request.requestedAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Total Item</Label>
                  <div className="font-semibold text-base">{request.itemsCount}</div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Catatan</Label>
                <div className="text-sm bg-muted/30 p-4 rounded-md min-h-[80px] border border-muted">
                  {request.notes && request.notes !== "-" ? request.notes : <span className="italic text-muted-foreground">Tidak ada catatan yang dilampirkan.</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>
                {request.requestAllocations && request.requestAllocations.length > 0 ? "Alokasi Barang (Material)" : "Daftar Barang (Item)"}
              </CardTitle>
              <CardDescription>Daftar material atau barang untuk permintaan ini</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {['SIAP', 'SELESAI', 'DITERIMA'].includes(request.status?.toUpperCase() || "") ? (
                <div className="rounded-lg border overflow-hidden overflow-x-auto shadow-sm">
                  <Table className="whitespace-nowrap">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 text-center">No</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Nama Material</TableHead>
                        <TableHead>Merek</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right pr-6">Satuan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.requestAllocations && request.requestAllocations.length > 0 ? (
                        request.requestAllocations.map((ra, idx) => (
                          <TableRow key={ra.id}>
                            <TableCell className="text-muted-foreground text-center">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{ra.materialCategory}</TableCell>
                            <TableCell className="truncate max-w-[300px]" title={ra.materialName}>{ra.materialName}</TableCell>
                            <TableCell>{ra.brand}</TableCell>
                            <TableCell className="text-right font-medium">{ra.quantity}</TableCell>
                            <TableCell className="text-right font-medium pr-6">{ra.unit}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            Belum ada alokasi material spesifik.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : request.status?.toUpperCase() === 'DISETUJUI' ? (
                <div className="rounded-lg border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 text-center">No</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Merek</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right pr-6">Satuan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.requestItems && request.requestItems.length > 0 ? (
                        request.requestItems.map((ri, idx) => (
                          <TableRow key={ri.id}>
                            <TableCell className="text-muted-foreground text-center">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{ri.category}</TableCell>
                            <TableCell>{ri.brand}</TableCell>
                            <TableCell className="text-right font-medium">{ri.quantity}</TableCell>
                            <TableCell className="text-right font-medium pr-6">{ri.unit}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            Tidak ada item.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : request.requestItems && request.requestItems.length > 0 ? (
                <div className="rounded-lg border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-16 text-center">No</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Merek</TableHead>
                        <TableHead className="text-right pr-6">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.requestItems.map((ri, idx) => (
                        <TableRow key={ri.id}>
                          <TableCell className="text-muted-foreground text-center">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{ri.category}</TableCell>
                          <TableCell>{ri.brand}</TableCell>
                          <TableCell className="text-right font-medium pr-6">{ri.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center p-12 text-muted-foreground border rounded-lg bg-muted/10 border-dashed">
                  Tidak ada data barang yang tersedia.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
