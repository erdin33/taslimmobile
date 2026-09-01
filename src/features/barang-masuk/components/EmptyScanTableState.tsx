import { PackagePlus, RotateCcw } from "lucide-react";

export function EmptyScanTableState({ isMitra }: { isMitra?: boolean }) {
  return (
    <div className="flex items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground shadow-inner">
          {isMitra ? (
            <RotateCcw className="size-7 text-primary/70" strokeWidth={1.8} />
          ) : (
            <PackagePlus className="size-7" strokeWidth={1.8} />
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">
            {isMitra ? "Belum ada barang yang akan dikembalikan" : "Belum ada barang masuk"}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isMitra
              ? "Scan atau masukkan serial number material di form untuk menambahkan barang yang ingin dikembalikan ke Gudang KP."
              : "Scan atau masukkan serial number dari form untuk menambahkan item ke sesi barang masuk."}
          </p>
        </div>
      </div>
    </div>
  );
}
