export type DeleteDialogState =
  | {
      type: "single";
      ids: string[];
      serialNumber?: string;
      transactionNumber?: string;
    }
  | {
      type: "bulk";
      ids: string[];
    };

export type SheetMode =
  | "closed"
  | "add-rak"
  | "add-kardus"
  | "add-pallet"
  | "add-mitra"
  | "edit-rak"
  | "edit-kardus"
  | "edit-pallet"
  | "edit-mitra"
  | "add-level"
  | "edit-level";
