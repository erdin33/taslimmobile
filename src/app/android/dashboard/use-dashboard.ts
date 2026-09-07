import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { Transaction, DashboardTransaction, RequestSummary, ActivityItem } from "@/types/transaction"
import type { InventoryStats, MitraPerformanceMetrics } from "@/types/dashboard"
import { useAuth } from "@/lib/auth"
import type { AuthUser } from "@/types/auth"
import { formatItemStatus } from "@/lib/status-helper"

const DASHBOARD_TRANSACTION_LIMIT = 6;
const DASHBOARD_REFRESH_INTERVAL = 60000; // Refresh 60 detik agar tidak membebani CPU HP

const getRangeDays = (timeRange: string) => {
    if (timeRange === "30d") return 30;
    if (timeRange === "7d") return 7;
    if (timeRange === "90d") return 90;
    return 30;
}
const toDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
}
const parseDateKey = (dateKey: string) => new Date(`${dateKey}T00:00:00`)
const addDays = (date: Date, days: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

type RawRecord = Record<string, unknown>

const asRecord = (value: unknown): RawRecord =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {}

const normalizeText = (value: unknown) => {
    if (value === null || value === undefined || typeof value === "object") return ""
    return String(value).trim()
}

const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase()

const readFirstText = (...values: unknown[]) => {
    for (const value of values) {
        const text = normalizeText(value)
        if (text) return text
    }

    return ""
}

const readNumber = (value: unknown, fallback = 0) => {
    const numberValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(numberValue) ? numberValue : fallback
}

const requestBelongsToUser = (rawValue: unknown, user: AuthUser | null) => {
    if (!user) return false

    const raw = asRecord(rawValue)
    const requester = asRecord(raw.requester)
    const requesterProfile = asRecord(requester.profile)
    const partner = asRecord(raw.partner)
    const userProfile = asRecord(user.profile)

    const userId = normalizeKey(user.id)
    const userPartnerId = normalizeKey(user.partnerId)
    const userIdentityCode = normalizeKey(user.identityCode || userProfile.identityCode || userProfile.kode)
    const userUsername = normalizeKey(user.username)
    const userDisplayName = normalizeKey(user.displayName)

    const requestUserIds = [
        raw.requesterId,
        raw.userId,
        requester.id,
        requesterProfile.id,
    ].map(normalizeKey).filter(Boolean)

    const requestPartnerIds = [
        raw.partnerId,
        raw.mitraId,
        partner.id,
    ].map(normalizeKey).filter(Boolean)
    
    const requestIdentityCodes = [
        requesterProfile.identityCode,
        requesterProfile.kode,
        partner.identityCode,
        partner.kode,
    ].map(normalizeKey).filter(Boolean)

    if (userPartnerId && requestPartnerIds.includes(userPartnerId)) {
        return true
    }

    if (userId && requestUserIds.includes(userId)) {
        return true
    }

    if (userIdentityCode && requestIdentityCodes.includes(userIdentityCode)) {
        return true
    }

    const requesterName = normalizeKey(
        readFirstText(
            raw.requesterName,
            requesterProfile.nama,
            requesterProfile.name,
            requester.username
        )
    )
    
    if (requesterName && (requesterName === userDisplayName || requesterName === userUsername)) {
        return true
    }
    
    if (userIdentityCode && requesterName && requesterName.includes(userIdentityCode)) {
        return true
    }

    return false
}

const mapRequestSummary = (value: unknown): RequestSummary => {
    const request = asRecord(value)
    const requester = asRecord(request.requester)
    const requesterProfile = asRecord(requester.profile)
    const requestItems = Array.isArray(request.requestItems) ? request.requestItems : []

    return {
        id: readFirstText(request.id),
        requestNumber: readFirstText(request.requestNumber, request.nomor, request.id, "-"),
        requesterName: readFirstText(
            request.requesterName,
            requesterProfile.nama,
            requesterProfile.name,
            requester.username,
            "Unknown"
        ),
        partnerCategory: readFirstText(request.partnerCategory, requesterProfile.partnerType),
        status: readFirstText(request.status, "MENUNGGU"),
        requestedAt: readFirstText(request.requestedAt, request.createdAt, request.updatedAt),
        itemsCount:
            typeof request.itemsCount === "number"
                ? request.itemsCount
                : requestItems.reduce((total, item) => total + readNumber(asRecord(item).quantity), 0),
    }
}

export function useDashboard() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [chartTransactions, setChartTransactions] = useState<Transaction[]>([]);
    const [mitraOptions, setMitraOptions] = useState<string[]>([]);
    const [selectedMitra, setSelectedMitra] = useState("all");
    const [timeRange, setTimeRange] = useState("30d");

    const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
        totalItems: 0, tersedia: 0, diluar: 0, rusak: 0, hilang: 0,
    });
    const [mitraDistribution, setMitraDistribution] = useState<{ mitra: string; tersedia: number; diluar: number; total: number }[]>([]);
    const [mitraPerformanceMetrics, setMitraPerformanceMetrics] = useState<MitraPerformanceMetrics[]>([]);

    const [allRequests, setAllRequests] = useState<RequestSummary[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<ActivityItem[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [isLoadingActivity, setIsLoadingActivity] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    const isFetchingRef = useRef(false);

    const fetchDashboardData = useCallback(async () => {
        if (isFetchingRef.current || user?.role?.toLowerCase() === "mitra") {
            setIsLoadingRequests(false);
            setIsLoadingActivity(false);
            setIsLoading(false);
            return;
        }
        isFetchingRef.current = true;

        try {
            const [transactionData, itemData, requestData, performanceData] = await Promise.all([
                DashboardService.fetchTransactions(),
                DashboardService.fetchItems(),
                DashboardService.fetchRequests(),
                DashboardService.fetchMitraPerformance(),
            ]);

            const visibleTransactions = transactionData.filter(
                (transaction: any) =>
                    user?.role?.toLowerCase() !== "mitra" ||
                    transaction.mitra?.trim().toLowerCase() === user?.displayName?.trim().toLowerCase()
            );
            const mitraItemSNs = new Set(
                visibleTransactions.map((t: any) => t.sn || t.serialNumber)
            );

            const visibleItems = itemData.filter(
                (item: any) =>
                    user?.role?.toLowerCase() !== "mitra" ||
                    item.mitra?.trim().toLowerCase() === user?.displayName?.trim().toLowerCase() ||
                    mitraItemSNs.has(item.serialNumber)
            );
            const visibleRequests = requestData.filter(
                (req: any) =>
                    user?.role?.toLowerCase() !== "mitra" ||
                    requestBelongsToUser(req, user)
            );

            // Grouping by Mitra
            const mitraMap = new Map<string, { tersedia: number; diluar: number }>();
            
            const trxBySN = new Map<string, any[]>();
            transactionData.forEach((t: any) => {
                const sn = t.sn || t.serialNumber;
                if (!sn) return;
                if (!trxBySN.has(sn)) trxBySN.set(sn, []);
                trxBySN.get(sn)!.push(t);
            });

            // For tracking latest
            const latestTrxBySN = new Map<string, any>();
            transactionData.forEach((t: any) => {
                const sn = t.sn || t.serialNumber;
                if (!sn) return;
                const existing = latestTrxBySN.get(sn);
                const tDate = new Date(t.createdAt || t.tanggal || 0).getTime();
                if (!existing || tDate > new Date(existing.createdAt || existing.tanggal || 0).getTime()) {
                    latestTrxBySN.set(sn, t);
                }
            });

            itemData.forEach((item: any) => {
                const mitra = (item.mitra || "Lainnya").trim();
                
                if (!mitraMap.has(mitra)) {
                    mitraMap.set(mitra, { tersedia: 0, diluar: 0 });
                }
                const current = mitraMap.get(mitra)!;
                
                // For tracking Mitra distribution chart, calculate from Mitra perspective
                const itemStatus = formatItemStatus(item.status, "mitra", item.mitra, item.lokasiPenyimpanan, item.paNumber);
                
                if (itemStatus === "Tersedia") {
                    current.tersedia += 1;
                } else if (itemStatus === "Digunakan") {
                    current.diluar += 1;
                }
            });
            const distribution = Array.from(mitraMap.entries())
                .map(([mitra, counts]) => ({
                    mitra,
                    ...counts,
                    total: counts.tersedia + counts.diluar
                }))
                .sort((a, b) => b.total - a.total);
            setMitraDistribution(distribution);

            const flattened = visibleTransactions
                .slice(0, DASHBOARD_TRANSACTION_LIMIT)
                .map((transaction: any) => ({
                    id: transaction.id,
                    tanggal: transaction.tanggal,
                    nomor: transaction.nomor,
                    kategori: transaction.kategori,
                    status: transaction.status,
                    sn: transaction.sn,
                    merek: transaction.merek,
                    asal: transaction.asal || "-",
                    tujuan: transaction.tujuan || "-",
                    mitra: transaction.mitra || "-",
                    keterangan: transaction.keterangan || "-",
                }));

            setTransactions(flattened);
            setRequests(visibleRequests.slice(0, DASHBOARD_TRANSACTION_LIMIT));

            const mappedRequests = visibleRequests.map(mapRequestSummary);
            setAllRequests(mappedRequests);
            setIsLoadingRequests(false);

            const mappedActivities: ActivityItem[] = (visibleTransactions as any[])
                .slice(0, 10)
                .map((t) => ({
                    id: t.id,
                    type: (t.kategori?.toUpperCase() as ActivityItem["type"]) || "MASUK",
                    serialNumber: t.sn || t.serialNumber || "-",
                    mitra: t.mitra || "KP Tasikmalaya",
                    createdAt: t.createdAt || t.tanggal,
                }));
            setRecentTransactions(mappedActivities);
            setIsLoadingActivity(false);

            const uniqueMitras = Array.from(new Set(visibleTransactions.map((trx: any) => trx.mitra || "-").filter(Boolean))) as string[];
            setMitraOptions([
                "all",
                ...uniqueMitras.sort((a, b) => a.localeCompare(b))
            ]);

            setChartTransactions(visibleTransactions);

            const isMitra = user?.role === "mitra";
            const currentItems = isMitra 
                ? visibleItems.filter((item: any) => {
                    const normMitra = (item.mitra || "").trim().toLowerCase();
                    const userMitra = (user?.displayName || "").trim().toLowerCase();
                    return normMitra === userMitra;
                })
                : visibleItems;

            setInventoryStats({
                totalItems: currentItems.length,
                tersedia: currentItems.filter((item: any) => {
                    return formatItemStatus(item.status, user?.role, item.mitra, item.lokasiPenyimpanan, item.paNumber) === "Tersedia";
                }).length,
                diluar: currentItems.filter((item: any) => {
                    const status = formatItemStatus(item.status, user?.role, item.mitra, item.lokasiPenyimpanan, item.paNumber);
                    return status === "Digunakan" || (!isMitra && status === "Terdistribusi");
                }).length,
                rusak: currentItems.filter((item: any) => {
                    return formatItemStatus(item.status, user?.role, item.mitra, item.lokasiPenyimpanan, item.paNumber) === "Rusak";
                }).length,
                hilang: currentItems.filter((item: any) => {
                    return formatItemStatus(item.status, user?.role, item.mitra, item.lokasiPenyimpanan, item.paNumber) === "Hilang";
                }).length,
            });
            
            setMitraPerformanceMetrics(performanceData);
            
            setIsLoading(false);
        } catch (error) {
            console.error("Gagal mengambil data dashboard:", error);
            setIsLoadingRequests(false);
            setIsLoadingActivity(false);
            setIsLoading(false);
        } finally {
            isFetchingRef.current = false;
        }
    }, [user]);

    useEffect(() => {
        if (user?.role?.toLowerCase() === "mitra") {
            setIsLoadingRequests(false);
            setIsLoadingActivity(false);
            setIsLoading(false);
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") fetchDashboardData();
        };

        fetchDashboardData();
        const refreshInterval = window.setInterval(() => {
            if (!document.hidden) fetchDashboardData();
        }, DASHBOARD_REFRESH_INTERVAL);

        window.addEventListener("focus", fetchDashboardData);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.clearInterval(refreshInterval);
            window.removeEventListener("focus", fetchDashboardData);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchDashboardData]);

    const requestCounts = {
        menunggu: allRequests.filter((r) => normalizeKey(r.status) === "menunggu").length,
        disetujui: allRequests.filter((r) => normalizeKey(r.status) === "disetujui").length,
        siap: allRequests.filter((r) => normalizeKey(r.status) === "siap").length,
    };

    const recentRequests = [...allRequests]
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
        .slice(0, 5);

    const transactionSeries = useMemo(() => {
        const rangeDays = getRangeDays(timeRange);
        if (!chartTransactions.length) {
            // Generate empty series
            const referenceDate = new Date();
            const startDate = addDays(referenceDate, -(rangeDays - 1));
            const points = [];
            for (let day = 0; day < rangeDays; day += 1) {
                points.push({ date: toDateKey(addDays(startDate, day)), masuk: 0, keluar: 0 });
            }
            return points;
        }

        const validDates = chartTransactions
            .map((t) => t.tanggal)
            .filter((date) => !Number.isNaN(parseDateKey(date).getTime()))
            .sort();

        const referenceDate = validDates.length
            ? parseDateKey(validDates[validDates.length - 1])
            : new Date();
        const startDate = addDays(referenceDate, -(rangeDays - 1));

        const points = new Map<string, { date: string; masuk: number; keluar: number }>();
        for (let day = 0; day < rangeDays; day += 1) {
            const date = addDays(startDate, day);
            const dateKey = toDateKey(date);
            points.set(dateKey, { date: dateKey, masuk: 0, keluar: 0 });
        }

        for (const transaction of chartTransactions) {
            if (selectedMitra !== "all" && transaction.mitra?.trim().toLowerCase() !== selectedMitra.trim().toLowerCase()) {
                continue;
            }
            const date = parseDateKey(transaction.tanggal);
            if (Number.isNaN(date.getTime()) || date < startDate || date > referenceDate) {
                continue;
            }
            const dateKey = toDateKey(date);
            const point = points.get(dateKey);
            if (!point) continue;

            const kategori = (transaction.kategori || "").toLowerCase();
            if (kategori === "masuk") point.masuk += 1;
            else if (kategori === "keluar") point.keluar += 1;
        }
        return Array.from(points.values());
    }, [chartTransactions, timeRange, selectedMitra]);

    return {
        user,
        transactions,
        requests,
        chartTransactions,
        mitraOptions,
        selectedMitra,
        setSelectedMitra,
        timeRange,
        setTimeRange,
        mitraDistribution,
        mitraPerformanceMetrics,
        transactionSeries,
        inventoryStats,
        requestCounts,
        recentRequests,
        recentTransactions,
        isLoadingRequests,
        isLoadingActivity,
        isLoading,
    };
}
