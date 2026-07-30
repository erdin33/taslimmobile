import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IconFileText } from "@tabler/icons-react";
import { PackageCheck } from "lucide-react";
import { getBaseUrl } from "@/lib/api";
import { PengambilanQrModal } from "./PengambilanQrModal";
import type { DashboardRequest } from "@/types/transaction";

interface BastActionsProps {
  request: DashboardRequest;
  onStatusChange?: (id: string, status: string) => void;
}

export function BastActions({ request, onStatusChange }: BastActionsProps) {
  const status = request.status?.toUpperCase()?.trim();
  const [pengambilanModalOpen, setPengambilanModalOpen] = React.useState(false);

  const handleOpenDraftPDF = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const token = localStorage.getItem("arxiva-auth-token") || "";
        const url = `${getBaseUrl()}/requests/${request.id}/pdf-draft?token=${token}`;
        await openUrl(url);
      } catch (error) {
        toast.error("Gagal membuka PDF BAST Draft");
      }
    },
    [request.id]
  );

  const handleOpenSignedPDF = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const token = localStorage.getItem("arxiva-auth-token") || "";
        const url = `${getBaseUrl()}/requests/${request.id}/pdf-signed?token=${token}`;
        await openUrl(url);
      } catch (error) {
        toast.error("Gagal membuka PDF BAST Final");
      }
    },
    [request.id]
  );

  const handleOpenDrive = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const driveUrl = request.deliveryDocument?.driveViewUrl;
      if (driveUrl) {
        await openUrl(driveUrl);
      } else {
        toast.error("Link Google Drive belum tersedia");
      }
    },
    [request.deliveryDocument?.driveViewUrl]
  );

  const showBastActions = ["SIAP", "SELESAI", "DITERIMA"].includes(status || "");

  if (!showBastActions) return null;

  const isSigned = ["SELESAI", "DITERIMA"].includes(status || "");

  return (
    <div className="flex items-center gap-2">
      {!isSigned ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs text-muted-foreground font-medium cursor-pointer gap-1.5"
          title="Buka PDF BAST Draft (Tanpa TTD)"
          onClick={handleOpenDraftPDF}
        >
          <IconFileText size={16} />
          BAST Draft
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium cursor-pointer gap-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
          title="Buka PDF BAST Final (Ber-TTD)"
          onClick={handleOpenSignedPDF}
        >
          <IconFileText size={16} />
          BAST Final
        </Button>
      )}

      {isSigned && request.deliveryDocument?.driveViewUrl && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium cursor-pointer gap-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20"
          title="Buka di Google Drive"
          onClick={handleOpenDrive}
        >
          Google Drive
        </Button>
      )}

      {status === "SIAP" && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium cursor-pointer gap-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500/20"
            title="Pengambilan Material BAST"
            onClick={(e) => {
              e.stopPropagation();
              setPengambilanModalOpen(true);
            }}
          >
            <PackageCheck size={16} />
            Pengambilan
          </Button>
          <PengambilanQrModal
            isOpen={pengambilanModalOpen}
            onOpenChange={setPengambilanModalOpen}
            request={request}
            onSuccess={() => {
              if (onStatusChange) {
                onStatusChange(request.id, "SELESAI");
              } else {
                window.location.reload(); 
              }
            }}
          />
        </>
      )}
    </div>
  );
}
