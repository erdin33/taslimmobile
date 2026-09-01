import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AndroidLayout from "@/components/layout/AndroidLayout";

const DashboardPage = lazy(() => import("@/app/android/dashboard/page"));
const BarangMasukPage = lazy(() => import("@/app/android/barang-masuk/page"));
const BarangKeluarPage = lazy(() => import("@/app/android/barang-keluar/page"));
const DataBarangPage = lazy(() => import("@/app/android/data-barang/page"));
const DataTransaksiPage = lazy(() => import("@/app/android/request/page"));
const DataTransaksiDetailPage = lazy(() => import("@/app/android/request/detail/page"));
const LokasiBarangPage = lazy(() => import("@/app/android/lokasi-barang/page"));
const TipeMaterialPage = lazy(() => import("@/app/android/tipe-material/page"));
const KategoriBarangPage = lazy(() => import("@/app/android/kategori-barang/page"));
const MerekBarangPage = lazy(() => import("@/app/android/merek-barang/page"));
const MitraPage = lazy(() => import("@/app/android/mitra/page"));
const LoginPage = lazy(() => import("@/app/android/login/page"));
const PengaturanPage = lazy(() => import("@/app/android/pengaturan/page"));
const MobileSignPage = lazy(() => import("@/app/mobile-sign/page"));
const PartnerRequestNewPage = lazy(() => import("@/app/partner-request/new/page"));
const PartnerRequestHistoryPage = lazy(() => import("@/app/partner-request/history/page"));
const RequestPreparePage = lazy(() => import("@/app/request/prepare/page"));
const PenerimaanReturPage = lazy(() => import("@/app/desktop/penerimaan-retur/page"));
const TugasHarianPage = lazy(() => import("@/app/android/tugas-harian/page"));
const LaporanReconPage = lazy(() => import("@/app/android/laporan-recon/page"));

function PageLoader() {
	return (
		<div className="flex h-[50vh] w-full items-center justify-center">
			<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
		</div>
	);
}

export function AndroidRoutes() {
	return (
		<Suspense fallback={<PageLoader />}>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/mobile-sign/:sessionId" element={<MobileSignPage />} />
				<Route
					path="/"
					element={
						<ProtectedRoute>
							<AndroidLayout />
						</ProtectedRoute>
					}>
					<Route index element={<DashboardPage />} />
					<Route path="barang-masuk" element={<BarangMasukPage />} />
					<Route path="penerimaan-retur" element={
						<ProtectedRoute adminOnly>
							<PenerimaanReturPage />
						</ProtectedRoute>
					} />
					<Route path="laporan-recon" element={
						<ProtectedRoute adminOnly>
							<LaporanReconPage />
						</ProtectedRoute>
					} />
					<Route path="barang-keluar" element={<BarangKeluarPage />} />
					<Route path="request" element={<DataTransaksiPage />} />
					<Route path="request/:id" element={<DataTransaksiDetailPage />} />
					<Route path="request/:id/prepare" element={<RequestPreparePage />} />
					<Route path="partner-request/new" element={<PartnerRequestNewPage />} />
					<Route path="partner-request/history" element={<PartnerRequestHistoryPage />} />
					<Route path="tugas-harian" element={<TugasHarianPage />} />
					<Route path="data-barang" element={<DataBarangPage />} />
					<Route
						path="lokasi-barang"
						element={
							<ProtectedRoute adminOnly>
								<LokasiBarangPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="kategori-barang"
						element={
							<ProtectedRoute adminOnly>
								<KategoriBarangPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="tipe-material"
						element={
							<ProtectedRoute adminOnly>
								<TipeMaterialPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="merek-barang"
						element={
							<ProtectedRoute adminOnly>
								<MerekBarangPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="mitra"
						element={
							<ProtectedRoute adminOnly>
								<MitraPage />
							</ProtectedRoute>
						}
					/>
					<Route path="pengaturan" element={<PengaturanPage />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Suspense>
	);
}
