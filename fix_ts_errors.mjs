import { readFileSync, writeFileSync } from 'fs';

function fix(file, replacements) {
  try {
    let content = readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
      if (content.includes(from)) {
        content = content.replace(from, to);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(file, content);
      console.log('Fixed: ' + file);
    } else {
      console.log('No changes needed: ' + file);
    }
  } catch (e) {
    console.error('Error fixing ' + file + ': ' + e.message);
  }
}

// android/barang-keluar - remove unused Tabs import line (line 25 is all unused)
fix('src/app/android/barang-keluar/page.tsx', [
  ['import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";\n', ''],
  // remove unused kuota vars
  [
    `  const _totalKuotaTersedia = Object.values(kuota).reduce((total, value) => total + value, 0);\n  const _validItems = barangMasuk.filter((item) => item.status === "Valid").length;\n`,
    ''
  ],
]);

// android/barang-masuk - remove unused kuota vars
fix('src/app/android/barang-masuk/page.tsx', [
  [
    `  const _totalKuotaTersedia = Object.values(kuota).reduce((total, value) => total + value, 0);\n  const _validItems = barangMasuk.filter((item) => item.status === "Valid").length;\n`,
    ''
  ],
]);

// desktop/barang-keluar - remove unused Tabs import
fix('src/app/desktop/barang-keluar/page.tsx', [
  ['import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";\n', ''],
  [
    `  const _totalKuotaTersedia = Object.values(kuota).reduce((total, value) => total + value, 0);\n  const _validItems = barangMasuk.filter((item) => item.status === "Valid").length;\n`,
    ''
  ],
]);

// desktop/barang-masuk
fix('src/app/desktop/barang-masuk/page.tsx', [
  [
    `  const _totalKuotaTersedia = Object.values(kuota).reduce((total, value) => total + value, 0);\n  const _validItems = barangMasuk.filter((item) => item.status === "Valid").length;\n`,
    ''
  ],
]);

// android/request/detail - multiple unused
fix('src/app/android/request/detail/page.tsx', [
  ['import { useState, useEffect, useRef, useCallback } from "react";\n', 'import { useState, useEffect, useCallback } from "react";\n'],
  ['import { useState, useEffect, useRef } from "react";\n', 'import { useState, useEffect } from "react";\n'],
  [', useRef', ''],
  ['Printer, ', ''],
  [', Printer', ''],
  // idx unused in map - replace with _idx or _ 
  [', idx) => {', ', _idx) => {'],
]);

// desktop/request/detail
fix('src/app/desktop/request/detail/page.tsx', [
  [', useRef', ''],
  ['import { useRef, ', 'import { '],
  ['Printer, ', ''],
  [', Printer', ''],
]);

// request/prepare
fix('src/app/request/prepare/page.tsx', [
  ['import { getBaseUrl, getHeaders } from "@/lib/api-config";\n', 'import { getHeaders } from "@/lib/api-config";\n'],
  ['import { getBaseUrl } from "@/lib/api-config";\n', ''],
  ['PackageCheck, ', ''],
  [', PackageCheck', ''],
  ['Boxes, ', ''],
  [', Boxes', ''],
  ['  CardDescription,\n', ''],
  ['  CardFooter,\n', ''],
  ['  CardTitle,\n', ''],
]);

// BarangDetailDrawer
fix('src/components/data-barang/BarangDetailDrawer.tsx', [
  ['Copy, Check, ', ''],
  [', Copy, Check', ''],
  ['Copy, ', ''],
  [', Copy', ''],
  ['Check, ', ''],
  [', Check', ''],
]);

// BarangFilterBar - remove unused React import
fix('src/components/data-barang/BarangFilterBar.tsx', [
  ['import React from "react";\n', ''],
  ['import React, { ', 'import { '],
]);

// BarangMobileCards - remove unused React import
fix('src/components/data-barang/BarangMobileCards.tsx', [
  ['import React from "react";\n', ''],
  ['import React, { ', 'import { '],
]);

// BarangTable - remove unused React import and formatTanggal
fix('src/components/data-barang/BarangTable.tsx', [
  ['import React from "react";\n', ''],
  ['import React, { ', 'import { '],
  ['formatTanggal, ', ''],
  [', formatTanggal', ''],
]);

// AndroidLayout - remove PackageMinus
fix('src/components/layout/AndroidLayout.tsx', [
  ['PackageMinus, ', ''],
  [', PackageMinus', ''],
]);

// app-sidebar - remove PackageMinus
fix('src/components/layout/navigation/app-sidebar.tsx', [
  ['PackageMinus, ', ''],
  [', PackageMinus', ''],
  ['  PackageMinus,\n', ''],
]);

// request-detail-drawer
fix('src/features/transactions/components/request-detail-drawer.tsx', [
  ['  const { user } = useAuth();\n', '  // const { user } = useAuth();\n'],
  ['  const { user, isLoading } = useAuth();\n', '  const { isLoading } = useAuth();\n'],
]);

// request-table
fix('src/features/transactions/components/request-table.tsx', [
  ['IconDotsVertical, ', ''],
  [', IconDotsVertical', ''],
  ['  IconDotsVertical,\n', ''],
  ['IconSignature, ', ''],
  [', IconSignature', ''],
  ['  IconSignature,\n', ''],
  ['PencilIcon, ', ''],
  [', PencilIcon', ''],
  ['  PencilIcon,\n', ''],
]);

// desktop/dashboard - isLoading property
fix('src/app/desktop/dashboard/page.tsx', [
  ['  isLoading,\n', '  // isLoading (removed - not in hook),\n'],
  ['const { isLoading } =', 'const { isLoadingActivity: isLoading } ='],
]);

console.log('Done!');
