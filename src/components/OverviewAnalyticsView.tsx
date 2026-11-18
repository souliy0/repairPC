import React, { useMemo, useState } from 'react';
import { BarChart3, MapPin, Minus, Package, Plus, Table2, Trash2 } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import {
  MachineAnalytics,
  RepairRecord,
  ReplacedPart,
  StockPartItem,
} from '../types';
import {
  computeMonthlyDashboard,
  computeZoneReportSummaries,
  getTodayISO,
  resolveMachineZoneId,
} from '../utils/analytics';
import { RepairStatusText } from './StatusText';

interface OverviewAnalyticsViewProps {
  analytics: MachineAnalytics[];
  categories: string[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  stockParts: StockPartItem[];
  onInspectMachine: (computerId: string) => void;
  onOpenNewRepair: (computerId?: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onOpenStockTab: () => void;
  onAdjustStockPart: (id: string, action: 'use' | 'restock' | 'return') => void;
}

export const OverviewAnalyticsView: React.FC<OverviewAnalyticsViewProps> = ({
  analytics,
  categories,
  repairs,
  parts,
  stockParts,
  onInspectMachine,
  onOpenNewRepair,
  onAddCategory,
  onDeleteCategory,
  onOpenStockTab,
  onAdjustStockPart,
}) => {
  const { t, tv, formatDate, getMonthShort, getMonthFull } = useLanguage();
  const todayISO = useMemo(() => getTodayISO(), []);
  const currentYear = todayISO.slice(0, 4);
  const currentMonth = todayISO.slice(5, 7);

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>([currentYear]);
    for (const r of repairs) {
      if (r.reportedDate && r.reportedDate.length >= 4) {
        yearSet.add(r.reportedDate.slice(0, 4));
      }
    }
    for (const p of parts) {
      if (p.replacedDate && p.replacedDate.length >= 4) {
        yearSet.add(p.replacedDate.slice(0, 4));
      }
    }
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [repairs, parts, currentYear]);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const hasCurrent =
      repairs.some((r) => r.reportedDate.startsWith(`${currentYear}-`)) ||
      parts.some((p) => p.replacedDate.startsWith(`${currentYear}-`));
    if (hasCurrent) return currentYear;
    const dataYears = availableYears.filter(
      (y) =>
        repairs.some((r) => r.reportedDate.startsWith(`${y}-`)) ||
        parts.some((p) => p.replacedDate.startsWith(`${y}-`))
    );
    return dataYears[0] || currentYear;
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [monthlyViewMode, setMonthlyViewMode] = useState<'chart' | 'table'>('chart');
  const [categoryScope, setCategoryScope] = useState<'all' | 'year'>('all');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [trendZoneFilter, setTrendZoneFilter] = useState<string>('all');
  const [zoneScope, setZoneScope] = useState<'all' | 'year' | 'month'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const computers = useMemo(() => analytics.map((a) => a.computer), [analytics]);

  const nonPmRepairs = useMemo(
    () => repairs.filter((r) => !r.isPreventive),
    [repairs]
  );

  const computerMap = useMemo(
    () => new Map(analytics.map((a) => [a.computer.id, a.computer])),
    [analytics]
  );

  const summaryStats = useMemo(() => {
    const totalMachines = analytics.length;
    const totalRepairs = nonPmRepairs.length;
    const openRepairs = nonPmRepairs.filter((r) => r.status !== 'ສ້ອມແປງສຳເລັດ').length;
    const stockTotalQty = stockParts.reduce((sum, item) => sum + Math.max(0, item.totalQuantity), 0);
    const stockRemainingQty = stockParts.reduce(
      (sum, item) => sum + Math.max(0, item.remainingQuantity),
      0
    );
    const stockUsedQty = Math.max(0, stockTotalQty - stockRemainingQty);
    return {
      totalMachines,
      totalRepairs,
      openRepairs,
      stockTotalQty,
      stockRemainingQty,
      stockUsedQty,
    };
  }, [analytics, nonPmRepairs, stockParts]);

  const zoneOptions = useMemo(() => {
    const base = computeZoneReportSummaries(computers, nonPmRepairs, parts);
    return base.map((z) => ({
      id: z.zoneId,
      label: z.label,
      departmentName: z.departmentName,
      dotColor: z.dotColor,
      machineCount: z.computers.length,
    }));
  }, [computers, nonPmRepairs, parts]);

  const trendScopedRepairs = useMemo(() => {
    if (trendZoneFilter === 'all') return repairs;
    return repairs.filter((r) => {
      const comp = computerMap.get(r.computerId);
      return comp ? resolveMachineZoneId(comp) === trendZoneFilter : false;
    });
  }, [repairs, trendZoneFilter, computerMap]);

  const trendScopedParts = useMemo(() => {
    if (trendZoneFilter === 'all') return parts;
    return parts.filter((p) => {
      const comp = computerMap.get(p.computerId);
      return comp ? resolveMachineZoneId(comp) === trendZoneFilter : false;
    });
  }, [parts, trendZoneFilter, computerMap]);

  const monthlyDashboard = useMemo(
    () =>
      computeMonthlyDashboard(trendScopedRepairs, trendScopedParts, selectedYear).map((m) => ({
        ...m,
        shortLabel: getMonthShort(m.month),
        fullLabel: getMonthFull(m.month),
      })),
    [trendScopedRepairs, trendScopedParts, selectedYear, getMonthShort, getMonthFull]
  );

  const yearTotals = useMemo(() => {
    let totalRepairs = 0;
    let completedRepairs = 0;
    let openRepairs = 0;
    let peakMonth = monthlyDashboard[0] || null;

    for (const m of monthlyDashboard) {
      totalRepairs += m.totalRepairs;
      completedRepairs += m.completedRepairs;
      openRepairs += m.openRepairs;
      if (!peakMonth || m.totalRepairs > peakMonth.totalRepairs) {
        peakMonth = m;
      }
    }

    return {
      totalRepairs,
      completedRepairs,
      openRepairs,
      peakMonth: peakMonth && peakMonth.totalRepairs > 0 ? peakMonth : null,
    };
  }, [monthlyDashboard]);

  const selectedMonthData = useMemo(
    () =>
      monthlyDashboard.find((m) => m.month === selectedMonth) ||
      monthlyDashboard[0],
    [monthlyDashboard, selectedMonth]
  );

  const zoneSummaries = useMemo(() => {
    const monthPrefix = `${selectedYear}-${selectedMonthData.month}`;
    const scopedR =
      zoneScope === 'all'
        ? repairs
        : zoneScope === 'year'
        ? repairs.filter((r) => r.reportedDate.startsWith(`${selectedYear}-`))
        : repairs.filter((r) => r.reportedDate.startsWith(monthPrefix));
    const scopedP =
      zoneScope === 'all'
        ? parts
        : zoneScope === 'year'
        ? parts.filter((p) => p.replacedDate.startsWith(`${selectedYear}-`))
        : parts.filter((p) => p.replacedDate.startsWith(monthPrefix));
    return computeZoneReportSummaries(computers, scopedR, scopedP);
  }, [computers, repairs, parts, zoneScope, selectedYear, selectedMonthData.month]);

  const activeZoneSummary = useMemo(() => {
    if (zoneSummaries.length === 0) return null;
    if (selectedZoneId) {
      const found = zoneSummaries.find((z) => z.zoneId === selectedZoneId);
      if (found) return found;
    }
    const busiest = [...zoneSummaries].sort((a, b) => b.repairCount - a.repairCount)[0];
    return busiest || zoneSummaries[0];
  }, [zoneSummaries, selectedZoneId]);

  const activeZoneMachineBreakdown = useMemo(() => {
    if (!activeZoneSummary) return [];
    const counts = new Map<string, { total: number; open: number; latestDate: string }>();
    for (const r of activeZoneSummary.repairs) {
      if (r.isPreventive) continue;
      const prev = counts.get(r.computerId) || { total: 0, open: 0, latestDate: '' };
      counts.set(r.computerId, {
        total: prev.total + 1,
        open: prev.open + (r.status !== 'ສ້ອມແປງສຳເລັດ' ? 1 : 0),
        latestDate:
          !prev.latestDate || r.reportedDate > prev.latestDate
            ? r.reportedDate
            : prev.latestDate,
      });
    }
    return activeZoneSummary.computers
      .map((comp) => {
        const stats = counts.get(comp.id) || { total: 0, open: 0, latestDate: '' };
        return { comp, ...stats };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || b.latestDate.localeCompare(a.latestDate));
  }, [activeZoneSummary]);

  const categoryBreakdown = useMemo(() => {
    const scopedRepairs =
      categoryScope === 'year'
        ? nonPmRepairs.filter((r) => r.reportedDate.startsWith(`${selectedYear}-`))
        : nonPmRepairs;
    const counts: Record<string, number> = {};
    for (const c of categories) {
      counts[c] = 0;
    }
    for (const r of scopedRepairs) {
      if (Object.prototype.hasOwnProperty.call(counts, r.category)) {
        counts[r.category] += 1;
      }
    }
    const total = Math.max(1, scopedRepairs.length);
    return categories
      .map((category) => {
        const count = counts[category] || 0;
        return {
          category,
          count,
          percent: scopedRepairs.length === 0 ? 0 : Math.round((count / total) * 100),
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [nonPmRepairs, categories, categoryScope, selectedYear]);

  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategoryInput('');
    setShowAddCategory(false);
  };

  return (
    <div className="space-y-6">
      {/* 3-Column KPI Strip */}
      <section aria-label={t('ຕົວຊີ້ວັດຫຼັກ', 'Key metrics')} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t('ອຸປະກອນທີ່ດູແລທັງໝົດ', 'Total Managed Equipment')}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {summaryStats.totalMachines}
            </span>
            <span className="text-xs text-slate-500">{t('ເຄື່ອງໃນທະບຽນ', 'registered units')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t('ປະຫວັດແຈ້ງສ້ອມສະສົມ / ຄ້າງສ້ອມ', 'Total Repairs / Open Tickets')}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {summaryStats.totalRepairs}
            </span>
            <span className="text-xs font-medium text-amber-700 font-mono tabular-nums">
              {t(`ກຳລັງດຳເນີນການ ${summaryStats.openRepairs} ງານ`, `${summaryStats.openRepairs} in progress`)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenStockTab}
          className="text-left bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-5 transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">
            {t('ອະໄຫຼ່ທີ່ມີໃນສະຕອກ', 'Spare Parts in Stock')}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {summaryStats.stockRemainingQty}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {t(
                `ທັງໝົດ ${summaryStats.stockTotalQty} (${stockParts.length} ລາຍການ)`,
                `Total ${summaryStats.stockTotalQty} (${stockParts.length} items)`
              )}
            </span>
          </div>
        </button>
      </section>

      {/* Compact Spare Parts Stock Overview */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-700 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t('ອະໄຫຼ່ທີ່ມີໃນສະຕອກ — ສະຫຼຸບຈຳນວນທັງໝົດ ແລະ ຍັງເຫຼືອ', 'Spare Parts in Stock — Total & Remaining Summary')}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  `ທັງໝົດ ${summaryStats.stockTotalQty} ໜ່ວຍ · ເບີກໃຊ້ແລ້ວ ${summaryStats.stockUsedQty} · ຍັງເຫຼືອ ${summaryStats.stockRemainingQty}`,
                  `Total ${summaryStats.stockTotalQty} units · Used ${summaryStats.stockUsedQty} · Remaining ${summaryStats.stockRemainingQty}`
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenStockTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5" />
            <span>{t('ຈັດການສະຕອກອະໄຫຼ່', 'Manage Stock')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {stockParts.map((item) => {
            const pct =
              item.totalQuantity > 0
                ? Math.min(100, Math.round((item.remainingQuantity / item.totalQuantity) * 100))
                : 0;
            const isOut = item.remainingQuantity <= 0;
            const isLow = !isOut && pct <= 25;
            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate" title={tv(item.name)}>
                      {tv(item.name)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        isOut
                          ? 'bg-rose-100 text-rose-700'
                          : isLow
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isOut
                        ? t('ໝົດ', 'Out')
                        : isLow
                        ? t('ໃກ້ໝົດ', 'Low')
                        : t('ພ້ອມໃຊ້', 'OK')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-500">
                      {t('ທັງໝົດ:', 'Total:')} <strong className="text-slate-800">{item.totalQuantity}</strong>
                    </span>
                    <span
                      className={`font-semibold ${
                        isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {t('ເຫຼືອ:', 'Left:')} {item.remainingQuantity} {tv(item.unit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => onAdjustStockPart(item.id, 'use')}
                    disabled={item.remainingQuantity <= 0}
                    title={t('ເບີກໃຊ້ 1', 'Issue 1')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                    <span>1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustStockPart(item.id, 'restock')}
                    title={t('ເຕີມສະຕອກ +1', 'Restock +1')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>1</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2-Column Monthly Repair Dashboard & Category Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t(
                  `ແດດບອດສະຖິຕິການແຈ້ງສ້ອມລາຍເດືອນ (ປີ ${selectedYear}${
                    trendZoneFilter !== 'all' ? ` · ໂຊນ ${trendZoneFilter}` : ''
                  })`,
                  `Monthly Repair Statistics Dashboard (${selectedYear}${
                    trendZoneFilter !== 'all' ? ` · Zone ${tv(trendZoneFilter)}` : ''
                  })`
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ກົດເລືອກແຕ່ລະເດືອນເພື່ອເບິ່ງຈຳນວນງານສ້ອມ, ອະໄຫຼ່ທີ່ປ່ຽນ ແລະ ລາຍຊື່ເຄື່ອງທີ່ແຈ້ງສ້ອມ',
                  'Select any month to view repair counts, replaced parts, and affected computers'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={trendZoneFilter}
                onChange={(e) => setTrendZoneFilter(e.target.value)}
                aria-label={t('ກອງແນວໂນ້ມຕາມໂຊນ', 'Filter trend by zone')}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              >
                <option value="all">{t('ທຸກໂຊນ', 'All Zones')}</option>
                {zoneOptions.map((z) => (
                  <option key={z.id} value={z.id}>
                    {t(`ໂຊນ ${z.label}`, `Zone ${tv(z.label)}`)} ({z.machineCount})
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label={t('ເລືອກປີ', 'Select year')}
                className="px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {t(`ປີ ${y}`, y)}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('chart')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    monthlyViewMode === 'chart'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{t('ກຣາຟ 12 ເດືອນ', '12-Month Chart')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('table')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    monthlyViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>{t('ຕາຕະລາງ 12 ເດືອນ', '12-Month Table')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Yearly Hairline Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-100 py-3.5 my-4 text-xs">
            <div>
              <div className="text-[11px] text-slate-500">
                {t(`ແຈ້ງສ້ອມທັງປີ ${selectedYear}`, `Total Repairs (${selectedYear})`)}
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {yearTotals.totalRepairs} {t('ຄັ້ງ', 'tickets')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{t('ສຳເລັດ / ຄ້າງສ້ອມ', 'Completed / Open')}</div>
              <div className="text-sm font-bold font-mono tabular-nums mt-0.5">
                <span className="text-emerald-700">{yearTotals.completedRepairs}</span>
                <span className="text-slate-300 mx-1">/</span>
                <span className={yearTotals.openRepairs > 0 ? 'text-amber-700' : 'text-slate-500'}>
                  {yearTotals.openRepairs}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{t('ເດືອນທີ່ແຈ້ງສ້ອມຫຼາຍສຸດ', 'Peak Repair Month')}</div>
              <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 truncate">
                {yearTotals.peakMonth
                  ? `${yearTotals.peakMonth.fullLabel} (${yearTotals.peakMonth.totalRepairs})`
                  : '—'}
              </div>
            </div>
          </div>

          {monthlyViewMode === 'chart' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mb-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-sky-700 inline-block" aria-hidden="true" />
                    {t('ສ້ອມສຳເລັດ', 'Completed')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" aria-hidden="true" />
                    {t('ກຳລັງສ້ອມ / ລໍຖ້າອະໄຫຼ່', 'In Progress / Waiting Parts')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-slate-900 inline-block rounded-full" aria-hidden="true" />
                    {t('ແນວໂນ້ມລວມ (ຄັ້ງ)', 'Total Trend')}
                  </span>
                </div>
                <span>{t('ຄລິກກຣາຟ ຫຼື ປຸ່ມເດືອນດ້ານລຸ່ມເພື່ອເບິ່ງລາຍລະອຽດ', 'Click chart or month buttons below for details')}</span>
              </div>

              <div className="w-full h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyDashboard}
                    margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
                    onClick={(chartState) => {
                      const label = chartState?.activeLabel;
                      if (typeof label === 'string') {
                        const found = monthlyDashboard.find((m) => m.shortLabel === label);
                        if (found) setSelectedMonth(found.month);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = payload[0]?.payload as (typeof monthlyDashboard)[number] | undefined;
                        if (!row) return null;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
                            <div className="font-semibold text-slate-900">
                              {row.fullLabel} {selectedYear}
                            </div>
                            <div className="font-mono tabular-nums text-slate-700">
                              {t('ແຈ້ງສ້ອມທັງໝົດ:', 'Total Repairs:')}{' '}
                              <span className="font-bold text-slate-900">
                                {row.totalRepairs} {t('ຄັ້ງ', 'tickets')}
                              </span>
                            </div>
                            <div className="font-mono tabular-nums text-emerald-700">
                              {t('ສຳເລັດ:', 'Completed:')} {row.completedRepairs} {t('ຄັ້ງ', '')}
                            </div>
                            <div className="font-mono tabular-nums text-amber-700">
                              {t('ຄ້າງສ້ອມ:', 'Open:')} {row.openRepairs} {t('ຄັ້ງ', '')}
                            </div>
                            <div className="font-mono tabular-nums text-slate-500 pt-1 border-t border-slate-100">
                              {t('ອະໄຫຼ່ທີ່ກ່ຽວຂ້ອງ:', 'Related Parts:')} {row.partsCount} {t('ລາຍການ', 'items')}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="completedRepairs"
                      stackId="monthlyRepairs"
                      fill="#0369a1"
                      barSize={24}
                      radius={[0, 0, 0, 0]}
                      name={t('ສ້ອມສຳເລັດ', 'Completed')}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="openRepairs"
                      stackId="monthlyRepairs"
                      fill="#f59e0b"
                      barSize={24}
                      radius={[4, 4, 0, 0]}
                      name={t('ກຳລັງສ້ອມ / ລໍຖ້າອະໄຫຼ່', 'In Progress')}
                      className="cursor-pointer"
                    />
                    <Line
                      type="monotone"
                      dataKey="totalRepairs"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#0f172a', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#0369a1' }}
                      name={t('ແນວໂນ້ມລວມ', 'Total Trend')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-3 border-t border-slate-100 mt-2 text-center">
                {monthlyDashboard.map((m) => {
                  const isSelected = m.month === selectedMonthData.month;
                  return (
                    <button
                      key={m.monthKey}
                      type="button"
                      onClick={() => setSelectedMonth(m.month)}
                      className={`py-1.5 px-1 rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[11px] font-semibold leading-tight">
                        {m.shortLabel}
                      </div>
                      <div
                        className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                          isSelected ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {m.totalRepairs} {t('ຄັ້ງ', '')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3">{t('ເດືອນ', 'Month')}</th>
                    <th className="py-2.5 px-2.5 text-right">{t('ແຈ້ງສ້ອມ', 'Total')}</th>
                    <th className="py-2.5 px-2.5 text-right">{t('ສຳເລັດ', 'Completed')}</th>
                    <th className="py-2.5 px-2.5 text-right">{t('ຄ້າງສ້ອມ', 'Open')}</th>
                    <th className="py-2.5 px-2.5 text-right">{t('ອະໄຫຼ່', 'Parts')}</th>
                    <th className="py-2.5 px-3">{t('ບັນຫາທີ່ພົບຫຼາຍສຸດ', 'Top Issue Category')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyDashboard.map((m) => {
                    const isSelected = m.month === selectedMonthData.month;
                    return (
                      <tr
                        key={m.monthKey}
                        onClick={() => setSelectedMonth(m.month)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {m.fullLabel} ({m.month})
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {m.totalRepairs}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700">
                          {m.completedRepairs}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums text-amber-700">
                          {m.openRepairs}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700">
                          {m.partsCount}
                        </td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[180px]">
                          {m.topCategory ? `${tv(m.topCategory)} (${m.topCategoryCount})` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Month Detail Breakdown */}
          <div className="border-t border-slate-200 pt-5 mt-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {t(
                    `ລາຍລະອຽດເດືອນ ${selectedMonthData.fullLabel} ${selectedYear}`,
                    `${selectedMonthData.fullLabel} ${selectedYear} Details`
                  )}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums">
                  <span>{t(`ແຈ້ງສ້ອມ ${selectedMonthData.totalRepairs} ຄັ້ງ`, `${selectedMonthData.totalRepairs} repairs`)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700">
                    {t(`ສຳເລັດ ${selectedMonthData.completedRepairs}`, `${selectedMonthData.completedRepairs} completed`)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={selectedMonthData.openRepairs > 0 ? 'text-amber-700' : ''}>
                    {t(`ຄ້າງ ${selectedMonthData.openRepairs}`, `${selectedMonthData.openRepairs} open`)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      `ເຄື່ອງທີ່ແຈ້ງສ້ອມ ${selectedMonthData.affectedMachinesCount} ເຄື່ອງ`,
                      `${selectedMonthData.affectedMachinesCount} unit(s)`
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      `ອະໄຫຼ່ ${selectedMonthData.partsCount} ລາຍການ`,
                      `${selectedMonthData.partsCount} part(s)`
                    )}
                  </span>
                </div>
              </div>

              {selectedMonthData.topCategory && (
                <div className="text-xs text-slate-600 shrink-0">
                  {t('ບັນຫາຫຼັກ:', 'Top Issue:')}{' '}
                  <span className="font-semibold text-slate-900">{tv(selectedMonthData.topCategory)}</span>
                </div>
              )}
            </div>

            {selectedMonthData.repairs.length === 0 ? (
              <div className="py-5 px-4 bg-slate-50/70 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  {t(
                    `ຍັງບໍ່ມີລາຍການແຈ້ງສ້ອມໃນເດືອນ ${selectedMonthData.fullLabel} ${selectedYear}`,
                    `No repair records in ${selectedMonthData.fullLabel} ${selectedYear}`
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenNewRepair()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('ບັນທຶກແຈ້ງສ້ອມໃໝ່', 'Log New Repair')}</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                {selectedMonthData.repairs.map((rep) => {
                  const comp = computerMap.get(rep.computerId);
                  return (
                    <div
                      key={rep.id}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900">
                            {rep.ticketCode}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono tabular-nums text-slate-500">
                            {formatDate(rep.reportedDate)}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          {comp ? (
                            <button
                              type="button"
                              onClick={() => onInspectMachine(comp.id)}
                              className="font-semibold text-sky-800 hover:underline cursor-pointer"
                            >
                              {comp.name} ({comp.assetTag})
                            </button>
                          ) : (
                            <span className="text-slate-500">{t('ບໍ່ພົບຂໍ້ມູນເຄື່ອງ', 'Unknown Machine')}</span>
                          )}
                        </div>
                        <p className="text-slate-700 mt-0.5 truncate">
                          {tv(rep.category)} — {rep.symptom}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <RepairStatusText status={rep.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t('ໝວດໝູ່ບັນຫາທີ່ພົບເລື້ອຍ', 'Common Issue Categories')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ວິເຄາະສາເຫດຫຼັກ ແລະ ເພີ່ມ/ລົບໝວດໝູ່ບັນຫາໄດ້',
                  'Analyze root causes and add/delete categories'
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md shrink-0">
              <button
                type="button"
                onClick={() => setCategoryScope('all')}
                className={`px-2 py-1 text-[11px] font-medium rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                  categoryScope === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('ທັງໝົດ', 'All')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryScope('year')}
                className={`px-2 py-1 text-[11px] font-medium rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                  categoryScope === 'year'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ປີ ${selectedYear}`, selectedYear)}
              </button>
            </div>
          </div>

          <div className="mb-3.5">
            {showAddCategory ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  placeholder={t('ຊື່ໝວດໝູ່ບັນຫາໃໝ່...', 'New category name...')}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-slate-50 border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer shrink-0"
                >
                  {t('ເພີ່ມ', 'Add')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryInput('');
                  }}
                  className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
                >
                  {t('ຍົກເລີກ', 'Cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('ເພີ່ມໝວດໝູ່ບັນຫາ', 'Add Category')}</span>
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t(
                  'ຍັງບໍ່ມີໝວດໝູ່ບັນຫາ — ກົດປຸ່ມ "ເພີ່ມໝວດໝູ່ບັນຫາ" ເພື່ອສ້າງໃໝ່',
                  'No issue categories yet — click "Add Category" to create one'
                )}
              </p>
            ) : (
              categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <span className="font-medium text-slate-700 truncate">{tv(item.category)}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-slate-600 tabular-nums">
                        {item.count} {t('ຄັ້ງ', '')} ({item.percent}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(item.category)}
                        title={t(`ລົບໝວດໝູ່ ${item.category}`, `Delete category ${tv(item.category)}`)}
                        aria-label={t(`ລົບໝວດໝູ່ ${item.category}`, `Delete category ${tv(item.category)}`)}
                        className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full transition-all duration-300"
                      style={{ width: `${item.count === 0 ? 0 : Math.max(4, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Zone Breakdown Dashboard Card (Recharts) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t(
                  'ພາບລວມການແຈ້ງສ້ອມແບ່ງຕາມໂຊນ (Zone) ຕາມແຜນທີ່ຄອມ',
                  'Repair Overview by Floor Plan Zone'
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'ປຽບທຽບຈຳນວນງານສ້ອມແຕ່ລະບໍລິເວນ (ຄລິກກຣາຟ ຫຼື ກາດໂຊນດ້ານຂ້າງເພື່ອເບິ່ງລາຍຊື່ເຄື່ອງໃນໂຊນ)',
                  'Compare repairs across areas (click chart or zone cards to inspect computers)'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: t('ທັງໝົດ', 'All') },
                  { id: 'year', label: t(`ປີ ${selectedYear}`, selectedYear) },
                  { id: 'month', label: `${selectedMonthData.shortLabel} ${selectedYear}` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setZoneScope(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    zoneScope === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-700 inline-block" aria-hidden="true" />
            {t('ສ້ອມສຳເລັດ', 'Completed')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" aria-hidden="true" />
            {t('ກຳລັງສ້ອມ / ຄ້າງສ້ອມ', 'In Progress / Open')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-slate-900 inline-block rounded-full" aria-hidden="true" />
            {t('ແຈ້ງສ້ອມລວມ (ຄັ້ງ)', 'Total Repairs')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={zoneSummaries.map((z) => ({ ...z, displayLabel: tv(z.label) }))}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                onClick={(chartState) => {
                  const label = chartState?.activeLabel;
                  if (typeof label === 'string') {
                    const found = zoneSummaries.find((z) => z.label === label || tv(z.label) === label);
                    if (found) setSelectedZoneId(found.zoneId);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="displayLabel"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0]?.payload as (typeof zoneSummaries)[number] | undefined;
                    if (!row) return null;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: row.dotColor }}
                          />
                          <span>
                            {t(`ໂຊນ ${row.label} (${row.departmentName})`, `Zone ${tv(row.label)} (${tv(row.departmentName)})`)}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-slate-600">
                          {t(`ເຄື່ອງໃນໂຊນ: ${row.computers.length} ເຄື່ອງ`, `Units in zone: ${row.computers.length}`)}
                        </div>
                        <div className="font-mono tabular-nums text-slate-700">
                          {t('ແຈ້ງສ້ອມທັງໝົດ:', 'Total Repairs:')}{' '}
                          <span className="font-bold text-slate-900">
                            {row.repairCount} {t('ຄັ້ງ', 'tickets')}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-emerald-700">
                          {t('ສຳເລັດ:', 'Completed:')} {row.completedCount} {t('ຄັ້ງ', '')}
                        </div>
                        <div className="font-mono tabular-nums text-amber-700">
                          {t('ຄ້າງສ້ອມ:', 'Open:')} {row.openCount} {t('ຄັ້ງ', '')}
                        </div>
                        <div className="font-mono tabular-nums text-slate-500 pt-1 border-t border-slate-100">
                          {t(`ອະໄຫຼ່: ${row.partsCount} ລາຍການ`, `Parts: ${row.partsCount}`)}
                          {row.topCategory
                            ? ` · ${t('ພົບຫຼາຍ:', 'Top:')} ${tv(row.topCategory)}`
                            : ''}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="completedCount"
                  stackId="zoneRepairs"
                  fill="#0369a1"
                  barSize={36}
                  radius={[0, 0, 0, 0]}
                  name={t('ສ້ອມສຳເລັດ', 'Completed')}
                  className="cursor-pointer"
                />
                <Bar
                  dataKey="openCount"
                  stackId="zoneRepairs"
                  fill="#f59e0b"
                  barSize={36}
                  radius={[4, 4, 0, 0]}
                  name={t('ຄ້າງສ້ອມ', 'Open')}
                  className="cursor-pointer"
                />
                <Line
                  type="monotone"
                  dataKey="repairCount"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0f172a', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#0369a1' }}
                  name={t('ແຈ້ງສ້ອມລວມ', 'Total')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-4 space-y-2 max-h-64 overflow-y-auto pr-1">
            {zoneSummaries.map((zs) => {
              const isSelected = activeZoneSummary?.zoneId === zs.zoneId;
              return (
                <button
                  key={zs.zoneId}
                  type="button"
                  onClick={() => setSelectedZoneId(zs.zoneId)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-50/90 border-sky-300 ring-1 ring-sky-200'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zs.dotColor }}
                        aria-hidden="true"
                      />
                      <span>{t(`ໂຊນ ${zs.label}`, `Zone ${tv(zs.label)}`)}</span>
                      <span className="text-[11px] font-normal text-slate-500 truncate">
                        ({zs.computers.length} {t('ເຄື່ອງ', 'units')})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                      {t('ສຳເລັດ', 'Done')} {zs.completedCount} · {t('ຄ້າງ', 'Open')} {zs.openCount} · {t('ອະໄຫຼ່', 'Parts')} {zs.partsCount}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {zs.repairCount} {t('ຄັ້ງ', '')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Zone Drill-Down */}
        {activeZoneSummary && (
          <div className="border-t border-slate-200 pt-4 mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeZoneSummary.dotColor }}
                  aria-hidden="true"
                />
                <span>
                  {t(
                    `ລາຍຊື່ເຄື່ອງທີ່ແຈ້ງສ້ອມໃນໂຊນ ${activeZoneSummary.label} (${activeZoneSummary.departmentName})`,
                    `Computers with Repairs in Zone ${tv(activeZoneSummary.label)} (${tv(activeZoneSummary.departmentName)})`
                  )}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {activeZoneSummary.topCategory
                  ? `${t('ບັນຫາຫຼັກ:', 'Top Issue:')} ${tv(activeZoneSummary.topCategory)} (${activeZoneSummary.topCategoryCount} ${t('ຄັ້ງ', '')})`
                  : t('ຍັງບໍ່ມີປະຫວັດແຈ້ງສ້ອມໃນຊ່ວງທີ່ເລືອກ', 'No repair history in selected range')}
              </div>
            </div>

            {activeZoneMachineBreakdown.length === 0 ? (
              <div className="py-3 px-4 bg-slate-50/70 rounded-lg text-xs text-slate-500">
                {t(
                  `ບໍ່ມີເຄື່ອງທີ່ແຈ້ງສ້ອມໃນໂຊນ ${activeZoneSummary.label} ສຳລັບຊ່ວງເວລາທີ່ເລືອກ`,
                  `No computers with repairs in Zone ${tv(activeZoneSummary.label)} for this period`
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeZoneMachineBreakdown.map(({ comp, total, open, latestDate }) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => onInspectMachine(comp.id)}
                    className="text-left p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-sky-50/60 hover:border-sky-300 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-sky-900 truncate">
                        {comp.name} ({comp.assetTag})
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {comp.assignedUser || comp.assetTag} · {t('ລ່າສຸດ', 'Latest')} {formatDate(latestDate)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900">{total} {t('ຄັ້ງ', '')}</div>
                      {open > 0 && (
                        <div className="text-[10px] font-medium text-amber-700">
                          {t('ຄ້າງ', 'Open')} {open}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
