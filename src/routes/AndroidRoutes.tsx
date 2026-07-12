import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Layout from "@/components/layout/layout";
import DashboardPage from "@/app/android/dashboard/page";
import BarangMasukPage from "@/app/android/barang-masuk/page";
import BarangKeluarPage from "@/app/android/barang-keluar/page";
import DataBarangPage from "@/app/android/data-barang/page";
import DataTransaksiPage from "@/app/android/data-transaksi/page";
import DataTransaksiDetailPage from "@/app/android/data-transaksi/detail/page";
import LokasiBarangPage from "@/app/android/lokasi-barang/page";
import KategoriBarangPage from "@/app/android/kategori-barang/page";
import MerekBarangPage from "@/app/android/merek-barang/page";
import MitraPage from "@/app/android/mitra/page";
import LoginPage from "@/app/android/login/page";
import PengaturanPage from "@/app/android/pengaturan/page";

export function AndroidRoutes() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route
				path="/"
				element={
					<ProtectedRoute>
						<Layout />
					</ProtectedRoute>
				}>
				<Route index element={<DashboardPage />} />
				<Route path="barang-masuk" element={<BarangMasukPage />} />
				<Route path="barang-keluar" element={<BarangKeluarPage />} />
				<Route path="riwayat" element={<DataTransaksiPage />} />
				<Route path="riwayat/:id" element={<DataTransaksiDetailPage />} />
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
