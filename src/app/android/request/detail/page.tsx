import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      <div className="flex flex-col gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="outline" size="icon" className="shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">{request.requestNumber}</h1>
            <p className="text-muted-foreground text-sm">
              Detail Informasi Permintaan
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium uppercase tracking-wider">
              {request.status}
            </Badge>
          </div>
        </div>
        
        {/* Render BastActions di Android (berada di baris baru untuk mengakomodasi layar kecil) */}
        <div className="flex justify-end pt-2 border-t mt-2">
          <BastActions request={request} />
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
                <div className="flex flex-col gap-3">
                  {request.requestAllocations && request.requestAllocations.length > 0 ? (
                    request.requestAllocations.map((ra) => (
                      <div key={ra.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-neutral-100">{ra.materialName}</span>
                            <span className="text-xs text-neutral-400">{ra.materialCategory} • {ra.brand}</span>
                          </div>
                          <div className="flex items-end gap-1 shrink-0">
                            <span className="font-bold text-sm text-neutral-100">{ra.quantity}</span>
                            <span className="text-xs text-neutral-400 font-medium">{ra.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                      Belum ada alokasi material spesifik.
                    </div>
                  )}
                </div>
              ) : request.status?.toUpperCase() === 'DISETUJUI' ? (
                <div className="flex flex-col gap-3">
                  {request.requestItems && request.requestItems.length > 0 ? (
                    request.requestItems.map((ri) => (
                      <div key={ri.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-neutral-100">{ri.category}</span>
                            <span className="text-xs text-neutral-400">Merek: {ri.brand}</span>
                          </div>
                          <div className="flex items-end gap-1 shrink-0">
                            <span className="font-bold text-sm text-neutral-100">{ri.quantity}</span>
                            <span className="text-xs text-neutral-400 font-medium">{ri.unit}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                      Tidak ada item.
                    </div>
                  )}
                </div>
              ) : request.requestItems && request.requestItems.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {request.requestItems.map((ri) => (
                    <div key={ri.id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/10 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-neutral-100">{ri.category}</span>
                          <span className="text-xs text-neutral-400">Merek: {ri.brand}</span>
                        </div>
                        <div className="flex items-end gap-1 shrink-0">
                          <span className="font-bold text-sm text-neutral-100">{ri.quantity}</span>
                          <span className="text-xs text-neutral-400 font-medium">{ri.unit || "Unit"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/5">
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
