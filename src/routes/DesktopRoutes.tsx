import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Layout from "@/components/layout/layout";
import DashboardPage from "@/app/desktop/dashboard/page";
import BarangMasukPage from "@/app/desktop/barang-masuk/page";
import BarangKeluarPage from "@/app/desktop/barang-keluar/page";
import DataBarangPage from "@/app/desktop/data-barang/page";
import DataTransaksiPage from "@/app/desktop/request/page";
import DataTransaksiDetailPage from "@/app/desktop/request/detail/page";
import LokasiBarangPage from "@/app/desktop/lokasi-barang/page";
import TipeMaterialPage from "@/app/desktop/tipe-material/page";
import KategoriBarangPage from "@/app/desktop/kategori-barang/page";
import MerekBarangPage from "@/app/desktop/merek-barang/page";
import MitraPage from "@/app/desktop/mitra/page";
import LoginPage from "@/app/desktop/login/page";
import PengaturanPage from "@/app/desktop/pengaturan/page";
import MobileSignPage from "@/app/mobile-sign/page";
import PartnerRequestNewPage from "@/app/partner-request/new/page";
import PartnerRequestHistoryPage from "@/app/partner-request/history/page";
import RequestPreparePage from "@/app/request/prepare/page";
import PenerimaanReturPage from "@/app/desktop/penerimaan-retur/page";

export function DesktopRoutes() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/mobile-sign/:sessionId" element={<MobileSignPage />} />
			<Route
				path="/"
				element={
					<ProtectedRoute>
						<Layout />
					</ProtectedRoute>
				}>
				<Route index element={<DashboardPage />} />
				<Route path="barang-masuk" element={<BarangMasukPage />} />
				<Route path="penerimaan-retur" element={
					<ProtectedRoute adminOnly>
						<PenerimaanReturPage />
					</ProtectedRoute>
				} />
				<Route path="barang-keluar" element={<BarangKeluarPage />} />
				<Route path="request" element={<DataTransaksiPage />} />
				<Route path="request/:id" element={<DataTransaksiDetailPage />} />
				<Route path="request/:id/prepare" element={<RequestPreparePage />} />
				<Route path="partner-request/new" element={<PartnerRequestNewPage />} />
				<Route path="partner-request/history" element={<PartnerRequestHistoryPage />} />
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
	);
}
