"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Box, MoreVertical, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const getBaseUrl = () => {
  const baseUrl = import.meta.env.URL || import.meta.env.VITE_URL || "http://localhost:3000";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const getHeaders = () => {
  const token = localStorage.getItem("taslim-auth-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": token } : {})
  };
};

export default function TipeMaterialPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteAlertData, setDeleteAlertData] = useState({ isOpen: false, id: "", name: "" });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [brandId, setBrandId] = useState("");
  const [materialCategoryId, setMaterialCategoryId] = useState("");

  const [nameError, setNameError] = useState("");
  const [brandError, setBrandError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const loadTypes = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/material-types`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      }
    } catch (e) {
      toast.error("Gagal mengambil data tipe material.");
    }
  };

  const loadBrands = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/brands`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || data.brands || []);
        setBrands(list);
      }
    } catch (e) { }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/categories`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || data.categories || []);
        setCategories(list);
      }
    } catch (e) { }
  };

  useEffect(() => {
    loadTypes();
    loadBrands();
    loadCategories();
  }, []);

  const filteredTypes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return types.filter(t =>
      t.nama?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q) ||
      t.brand?.nama?.toLowerCase().includes(q) ||
      t.materialCategory?.nama?.toLowerCase().includes(q)
    );
  }, [types, searchQuery]);

  const handleOpenSheet = (id?: string) => {
    setNameError("");
    setBrandError("");
    setCategoryError("");

    if (id) {
      const t = types.find(x => String(x.id) === String(id));
      if (t) {
        setName(t.nama || "");
        setCode(t.code || "");
        setBrandId(t.brandId ? String(t.brandId) : "");
        setMaterialCategoryId(t.materialCategoryId ? String(t.materialCategoryId) : "");
        setEditId(id);
      }
    } else {
      setName("");
      setCode("");
      setBrandId("");
      setMaterialCategoryId("");
      setEditId(null);
    }
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const normalizedName = name.trim();

    let hasError = false;
    if (!brandId) {
      setBrandError("Merek wajib dipilih.");
      hasError = true;
    }
    if (!materialCategoryId) {
      setCategoryError("Kategori wajib dipilih.");
      hasError = true;
    }
    if (!normalizedName) {
      setNameError("Nama model material wajib diisi.");
      hasError = true;
    }

    if (hasError) return;

    if (types.some(t => String(t.id) !== String(editId) && t.nama.toLowerCase() === normalizedName.toLowerCase())) {
      setNameError("Nama model material sudah terdaftar.");
      return;
    }

    setIsSaving(true);
    try {
      const url = `${getBaseUrl()}/material-models${editId ? `/${editId}` : ""}`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          nama: normalizedName,
          code: code.trim() || undefined,
          brandId: parseInt(brandId),
          materialCategoryId: parseInt(materialCategoryId)
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Gagal menyimpan model material");
      }
      await loadTypes();
      setIsSheetOpen(false);
      toast.success(`Berhasil ${editId ? "memperbarui" : "menambahkan"} model material`);
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan model material");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting || !deleteAlertData.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${getBaseUrl()}/material-types/${deleteAlertData.id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal menghapus");
      await loadTypes();
      toast.success("Berhasil menghapus tipe material");
    } catch (e) {
      toast.error("Gagal menghapus tipe material karena sedang digunakan.");
    } finally {
      setIsDeleting(false);
      setDeleteAlertData({ isOpen: false, id: "", name: "" });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 text-foreground mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari tipe material..." className="w-full pl-9 bg-background border-border focus-visible:ring-1 focus-visible:ring-ring" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button className="w-full sm:w-auto gap-2" onClick={() => handleOpenSheet()}>
          <Plus className="w-4 h-4" /> Tambah Tipe Material
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-10">
        {filteredTypes.map(t => (
          <Card key={t.id} className="overflow-hidden relative group transition-all duration-300 hover:border-border hover:bg-muted/50">
            <CardContent className="px-5 py-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-blue-500/10 rounded-xl shrink-0">
                  <Box className="w-6 h-6 text-blue-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border text-foreground">
                    <DropdownMenuItem className="cursor-pointer focus:bg-muted" onClick={() => handleOpenSheet(t.id)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Tipe
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 focus:bg-red-950/50 focus:text-red-400 cursor-pointer" onClick={() => setDeleteAlertData({ isOpen: true, id: t.id, name: t.nama })}>
                      <Trash2 className="w-4 h-4 mr-2" /> Hapus Tipe
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">{t.nama}</h3>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Kode:</span> {t.code || '-'}</div>
                  <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Merek:</span> {t.brand?.nama || '-'}</div>
                  <div className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Kategori:</span> {t.materialCategory?.nama || '-'}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total Unit</span>
                <span className="text-xs font-medium text-foreground">{t._count?.items || 0} Unit</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredTypes.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Tipe Material Tidak Ditemukan</h3>
          </div>
        )}
      </div>

      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="w-[92%] sm:max-w-md rounded-2xl p-0 max-h-[85vh] flex flex-col border-border bg-popover text-foreground overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/40 text-left">
            <DialogTitle className="text-lg font-bold text-foreground">{editId ? "Edit Model Material" : "Tambah Model Material"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Kelola informasi referensi model material utama.</DialogDescription>
          </DialogHeader>
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Kode Material</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Masukkan Kode Material" className="bg-background border-border" />
              </div>

              <div className="space-y-2">
                <Label>Nama Material</Label>
                <Input value={name} onChange={e => { setName(e.target.value); setNameError(""); }} placeholder="Masukkan Nama Material" className={`bg-background ${nameError ? "border-destructive" : "border-border"}`} />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={brandId} onValueChange={(val) => { setBrandId(val); setBrandError(""); }}>
                  <SelectTrigger className={`bg-background ${brandError ? "border-destructive" : "border-border"}`}>
                    <SelectValue placeholder="Pilih Merek Material" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {brandError && <p className="text-xs text-destructive">{brandError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Kategori Material</Label>
                <Select value={materialCategoryId} onValueChange={(val) => { setMaterialCategoryId(val); setCategoryError(""); }}>
                  <SelectTrigger className={`bg-background ${categoryError ? "border-destructive" : "border-border"}`}>
                    <SelectValue placeholder="Pilih Kategori Material" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoryError && <p className="text-xs text-destructive">{categoryError}</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t border-border/50 bg-muted/40 flex flex-row justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} disabled={isSaving} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1 font-semibold">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? "Simpan Perubahan" : "Tambah Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertData.isOpen} onOpenChange={(open) => !open && !isDeleting && setDeleteAlertData({ ...deleteAlertData, isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
