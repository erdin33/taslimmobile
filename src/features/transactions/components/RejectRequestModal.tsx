import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

export function RejectRequestModal({ isOpen, onOpenChange, onSubmit, isSubmitting }: RejectRequestModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(reason.trim());
  };

  React.useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Tolak Request</DialogTitle>
          <DialogDescription>
            Masukkan alasan penolakan request ini. Catatan ini akan dapat dilihat oleh Mitra pembuat request.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ketik alasan penolakan di sini (contoh: Stok di gudang utama sedang kosong)..."
            className="min-h-[100px] resize-none"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Konfirmasi Tolak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
