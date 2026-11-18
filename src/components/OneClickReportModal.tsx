import React, { useMemo, useRef, useState } from 'react';
import { Download, FileCode, Layers, List, Printer, X } from 'lucide-react';
import { FLOOR_ZONES } from '../data/map701bData';
import { ComputerAsset, MachineAnalytics, RepairRecord, ReplacedPart } from '../types';
import {
  computeMachineAnalytics,
  computeZoneReportSummaries,
  exportSummaryCSV,
  getTodayISO,
  LAO_FULL_MONTHS,
  matchesReportPeriod,
  ReportPeriod,
  resolveMachineZoneId,
} from '../utils/analytics';
import { useLanguage } from '../i18n/LanguageContext';
import { PartStatusText, RepairStatusText } from './StatusText';

interface OneClickReportModalProps {
  computers: ComputerAsset[];
  analytics: MachineAnalytics[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  initialComputerId: string | 'all';
  onClose: () => void;
}

export const OneClickReportModal: React.FC<OneClickReportModalProps> = ({
  computers,
  repairs,
  parts,
  initialComputerId,
  onClose,
}) => {
  const { lang, t, tv, formatDate, getMonthFull } = useLanguage();
  const todayISO = getTodayISO();
  const [defaultYear, defaultMonth] = todayISO.split('-');

  const [selectedZone, setSelectedZone] = useState<string | 'all'>('all');
  const [scopeId, setScopeId] = useState<string | 'all'>(initialComputerId);
  const [groupByZone, setGroupByZone] = useState<boolean>(true);
  const [periodMode, setPeriodMode] = useState<'all' | 'month' | 'year'>('all');
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const reportContentRef = useRef<HTMLDivElement | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>([defaultYear]);
    for (const r of repairs) {
      if (r.reportedDate.length >= 4) years.add(r.reportedDate.slice(0, 4));
    }
    for (const p of parts) {
      if (p.replacedDate.length >= 4) years.add(p.replacedDate.slice(0, 4));
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [repairs, parts, defaultYear]);

  const activePeriod: ReportPeriod = useMemo(() => {
    if (periodMode === 'all') return { mode: 'all' };
    if (periodMode === 'year') return { mode: 'year', year: selectedYear };
    return { mode: 'month', year: selectedYear, month: selectedMonth };
  }, [periodMode, selectedYear, selectedMonth]);

  const compMap = useMemo(
    () => new Map(computers.map((c) => [c.id, c])),
    [computers]
  );

  const zoneFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of computers) {
      const z = resolveMachineZoneId(c);
      counts.set(z, (counts.get(z) || 0) + 1);
    }

    const opts: { id: string; label: string; departmentName: string; dotColor: string; count: number }[] = [];
    for (const z of FLOOR_ZONES) {
      const cnt = counts.get(z.id) || 0;
      if (cnt > 0) {
        opts.push({
          id: z.id,
          label: z.label,
          departmentName: z.departmentName,
          dotColor: z.dotColor,
          count: cnt,
        });
      }
    }
    for (const [zId, cnt] of counts.entries()) {
      if (!FLOOR_ZONES.some((z) => z.id === zId)) {
        opts.push({
          id: zId,
          label: zId,
          departmentName: zId === 'ອື່ນໆ' ? t('ນອກໂຊນຫຼັກ / ອື່ນໆ', 'Other / Unassigned Zone') : zId,
          dotColor: '#64748b',
          count: cnt,
        });
      }
    }
    return opts;
  }, [computers]);

  const computersInSelectedZone = useMemo(() => {
    if (selectedZone === 'all') return computers;
    return computers.filter((c) => resolveMachineZoneId(c) === selectedZone);
  }, [computers, selectedZone]);

  const scopedComputers = useMemo(() => {
    if (scopeId !== 'all') return computers.filter((c) => c.id === scopeId);
    return computersInSelectedZone;
  }, [computers, computersInSelectedZone, scopeId]);

  const scopedComputerIds = useMemo(
    () => new Set(scopedComputers.map((c) => c.id)),
    [scopedComputers]
  );

  const scopedRepairs = useMemo(() => {
    return repairs
      .filter((r) => {
        const matchesScope =
          scopeId !== 'all'
            ? r.computerId === scopeId
            : selectedZone === 'all'
            ? true
            : scopedComputerIds.has(r.computerId);
        return matchesScope && matchesReportPeriod(r.reportedDate, activePeriod);
      })
      .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate));
  }, [repairs, scopeId, selectedZone, scopedComputerIds, activePeriod]);

  const scopedParts = useMemo(() => {
    return parts
      .filter((p) => {
        const matchesScope =
          scopeId !== 'all'
            ? p.computerId === scopeId
            : selectedZone === 'all'
            ? true
            : scopedComputerIds.has(p.computerId);
        return matchesScope && matchesReportPeriod(p.replacedDate, activePeriod);
      })
      .sort((a, b) => b.replacedDate.localeCompare(a.replacedDate));
  }, [parts, scopeId, selectedZone, scopedComputerIds, activePeriod]);

  const zoneSummaries = useMemo(
    () => computeZoneReportSummaries(scopedComputers, scopedRepairs, scopedParts),
    [scopedComputers, scopedRepairs, scopedParts]
  );

  const unlinkedParts = useMemo(
    () => scopedParts.filter((p) => !compMap.get(p.computerId)),
    [scopedParts, compMap]
  );

  const scopedAnalytics = useMemo(() => {
    const raw = computeMachineAnalytics(scopedComputers, scopedRepairs, scopedParts);
    const zoneOrder = new Map(FLOOR_ZONES.map((z, idx) => [z.id as string, idx]));
    return [...raw].sort((a, b) => {
      const za = zoneOrder.get(resolveMachineZoneId(a.computer)) ?? 999;
      const zb = zoneOrder.get(resolveMachineZoneId(b.computer)) ?? 999;
      if (za !== zb) return za - zb;
      if (b.totalRepairs !== a.totalRepairs) return b.totalRepairs - a.totalRepairs;
      return a.computer.assetTag.localeCompare(b.computer.assetTag);
    });
  }, [scopedComputers, scopedRepairs, scopedParts]);

  const totals = useMemo(() => {
    const nonPm = scopedRepairs.filter((r) => !r.isPreventive);
    const repairCount = nonPm.length;
    const completedRepairs = nonPm.filter((r) => r.status === 'ສ້ອມແປງສຳເລັດ').length;
    const openRepairs = repairCount - completedRepairs;
    const pendingParts = scopedParts.filter(
      (p) =>
        p.status === 'ສັ່ງຊື້ແລ້ວ' ||
        p.status === 'ລໍຖ້າຕິດຕັ້ງ' ||
        p.status === 'ສົ່ງເຄລມປະກັນ'
    ).length;
    return {
      repairCount,
      completedRepairs,
      openRepairs,
      pendingParts,
    };
  }, [scopedRepairs, scopedParts]);

  const selectedComputer = scopeId !== 'all' ? compMap.get(scopeId) : undefined;
  const selectedZoneMeta = zoneFilterOptions.find((z) => z.id === selectedZone);
  const periodLabel =
    activePeriod.mode === 'all'
      ? t('ທັງໝົດທຸກຊ່ວງເວລາ', 'All Time')
      : activePeriod.mode === 'year'
      ? t(`ປະຈຳປີ ${activePeriod.year}`, `Year ${activePeriod.year}`)
      : t(
          `ປະຈຳເດືອນ ${getMonthFull(activePeriod.month)} ${activePeriod.year}`,
          `${getMonthFull(activePeriod.month)} ${activePeriod.year}`
        );

  const handleZoneChange = (nextZone: string) => {
    setSelectedZone(nextZone);
    setScopeId('all');
  };

  const handleDownloadHtmlReport = () => {
    if (!reportContentRef.current) return;
    const bodyHtml = reportContentRef.current.innerHTML;
    const reportDocTitle = t(
      `ລາຍງານສະຫຼຸບວຽກສ້ອມ Computer (${todayISO})`,
      `Computer Repair Summary Report (${todayISO})`
    );
    const fullHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${reportDocTitle}</title>
<style>
  body { font-family: "Noto Sans Lao", "Phetsarath OT", system-ui, -apple-system, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; line-height: 1.5; background: #ffffff; }
  h1 { font-size: 20px; margin: 4px 0; }
  h2 { font-size: 14px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  .text-right { text-align: right; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; margin-bottom: 16px; }
  .rounded-lg { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `computer-repair-report-${todayISO}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0">
      <div className="print-only-container bg-white border border-slate-200 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Action Bar */}
        <div className="no-print px-6 py-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('ອອກລາຍງານສະຫຼຸບວຽກສ້ອມ Computer', 'Generate Computer Repair Summary Report')}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportSummaryCSV(
                    computers,
                    repairs,
                    parts,
                    scopeId,
                    activePeriod,
                    selectedZone
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('ດາວໂຫຼດ CSV (Excel / Sheets)', 'Download CSV (Excel / Sheets)')}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadHtmlReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{t('ບັນທຶກໄຟລ໌ລາຍງານ (.html)', 'Save Report (.html)')}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('ພິມລາຍງານ / ບັນທຶກ PDF', 'Print / Save PDF')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                aria-label={t('ປິດໜ້າຕ່າງລາຍງານ', 'Close report modal')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scope, Zone & Period Filters */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200">
            <select
              value={selectedZone}
              onChange={(e) => handleZoneChange(e.target.value)}
              aria-label={t('ເລືອກໂຊນຕາມແຜນທີ່ຄອມ', 'Select floor plan zone')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            >
              <option value="all">
                {t(`ທຸກໂຊນຕາມແຜນທີ່ (${computers.length} ເຄື່ອງ)`, `All Floor Plan Zones (${computers.length} units)`)}
              </option>
              {zoneFilterOptions.map((z) => (
                <option key={z.id} value={z.id}>
                  {t(
                    `ໂຊນ ${z.label} — ${z.departmentName} (${z.count} ເຄື່ອງ)`,
                    `Zone ${z.label} — ${tv(z.departmentName)} (${z.count} units)`
                  )}
                </option>
              ))}
            </select>

            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              aria-label={t('ເລືອກຂອບເຂດເຄື່ອງໃນລາຍງານ', 'Select machine scope')}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            >
              <option value="all">
                {selectedZone === 'all'
                  ? t(`ທຸກເຄື່ອງທັງໝົດ (${computers.length} ເຄື່ອງ)`, `All Machines (${computers.length} units)`)
                  : t(
                      `ທຸກເຄື່ອງໃນໂຊນ ${selectedZone} (${computersInSelectedZone.length} ເຄື່ອງ)`,
                      `All Machines in Zone ${selectedZone} (${computersInSelectedZone.length} units)`
                    )}
              </option>
              {computersInSelectedZone.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.assetTag} — {c.name} ({tv(resolveMachineZoneId(c))})
                </option>
              ))}
            </select>

            {scopeId === 'all' && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setGroupByZone(true)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    groupByZone
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('ແບ່ງຕາມໂຊນ', 'By Zone')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupByZone(false)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    !groupByZone
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{t('ລວມທຸກໂຊນ', 'Unified View')}</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  { id: 'all', label: t('ທັງໝົດ', 'All Time') },
                  { id: 'month', label: t('ລາຍເດືອນ', 'Monthly') },
                  { id: 'year', label: t('ລາຍປີ', 'Yearly') },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPeriodMode(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    periodMode === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {periodMode === 'month' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label={t('ເລືອກເດືອນ', 'Select month')}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                >
                  {LAO_FULL_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {getMonthFull(m.value)} ({m.value})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  aria-label={t('ເລືອກປີ', 'Select year')}
                  className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {t(`ປີ ${y}`, `${y}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodMode === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label={t('ເລືອກປີ', 'Select year')}
                className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {t(`ປີ ${y}`, `${y}`)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Printable Report Content */}
        <div ref={reportContentRef} className="print-paper p-8 overflow-y-auto space-y-7 text-xs text-slate-800">
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                PC REPAIR &amp; PREVENTIVE MAINTENANCE SUMMARY REPORT
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                {t('ລາຍງານສະຫຼຸບວຽກສ້ອມ Computer', 'Computer Repair Summary Report')}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {t('ຂອບເຂດຂໍ້ມູນ:', 'Scope:')}{' '}
                {selectedComputer
                  ? t(
                      `${selectedComputer.assetTag} · ${selectedComputer.name} · ໂຊນ ${resolveMachineZoneId(selectedComputer)} (ຜູ້ໃຊ້ງານ: ${selectedComputer.assignedUser})`,
                      `${selectedComputer.assetTag} · ${selectedComputer.name} · Zone ${tv(resolveMachineZoneId(selectedComputer))} (User: ${selectedComputer.assignedUser})`
                    )
                  : selectedZoneMeta
                  ? t(
                      `ໂຊນ ${selectedZoneMeta.label} (${selectedZoneMeta.departmentName} · ${scopedComputers.length} ເຄື່ອງ)`,
                      `Zone ${selectedZoneMeta.label} (${tv(selectedZoneMeta.departmentName)} · ${scopedComputers.length} units)`
                    )
                  : t(
                      `ແບ່ງຕາມໂຊນຕາມແຜນທີ່ຄອມ (${zoneSummaries.length} ໂຊນ · ${scopedComputers.length} ເຄື່ອງ)`,
                      `Grouped by Floor Plan Zones (${zoneSummaries.length} zones · ${scopedComputers.length} units)`
                    )}{' '}
                · {t('ໄລຍະເວລາ:', 'Period:')} <span className="font-semibold text-slate-900">{periodLabel}</span>
              </p>
            </div>
            <div className="text-left sm:text-right font-mono tabular-nums text-[11px] text-slate-600">
              <div>{t(`ວັນທີອອກລາຍງານ: ${formatDate(todayISO)}`, `Generated: ${formatDate(todayISO)}`)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
            <div>
              <div className="text-[11px] text-slate-500">{t('ຈຳນວນຄັ້ງທີ່ສ້ອມ', 'Total Repairs')}</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {t(`${totals.repairCount} ຄັ້ງ`, `${totals.repairCount} jobs`)}
                <span className="text-[11px] font-normal text-slate-500 ml-2">
                  {t(
                    `(ສຳເລັດ ${totals.completedRepairs} · ຄ້າງ ${totals.openRepairs})`,
                    `(Done ${totals.completedRepairs} · Open ${totals.openRepairs})`
                  )}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{t('ລາຍການອະໄຫຼ່ທັງໝົດ', 'Total Parts Logged')}</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {t(`${scopedParts.length} ລາຍການ`, `${scopedParts.length} items`)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">{t('ອະໄຫຼ່ຄ້າງ/ເຄລມ', 'Pending / Warranty Parts')}</div>
              <div className="text-base font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                {t(`${totals.pendingParts} ລາຍການ`, `${totals.pendingParts} items`)}
              </div>
            </div>
          </div>

          {/* Single Computer Mode vs Multi-Machine Zone-Grouped Mode */}
          {selectedComputer ? (
            <>
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {t(
                    `1. ຂໍ້ມູນສະເປັກຮາດແວ (${selectedComputer.assetTag} · ໂຊນ ${resolveMachineZoneId(selectedComputer)})`,
                    `1. Hardware Specifications (${selectedComputer.assetTag} · Zone ${tv(resolveMachineZoneId(selectedComputer))})`
                  )}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200 rounded-lg p-3.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">CPU</span>
                    <span className="font-medium text-slate-900">{selectedComputer.specs.cpu}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RAM</span>
                    <span className="font-medium text-slate-900">{selectedComputer.specs.ram}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Storage</span>
                    <span className="font-medium text-slate-900">{selectedComputer.specs.storage}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">GPU</span>
                    <span className="font-medium text-slate-900">{selectedComputer.specs.gpu}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mainboard / Model</span>
                    <span className="font-medium text-slate-900">
                      {selectedComputer.specs.motherboardOrModel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PSU / Battery</span>
                    <span className="font-medium text-slate-900">
                      {selectedComputer.specs.psuOrBattery}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">OS</span>
                    <span className="font-medium text-slate-900">{selectedComputer.specs.os}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('Serial Number ຫູຟັງ', 'Headset Serial Number')}</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedComputer.specs.serialNumber || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {t(
                    `2. ສະຫຼຸບສະຖານະອະໄຫຼ່ທີ່ປ່ຽນ ແລະ ສົ່ງເຄລມ (${scopedParts.length} ລາຍການ)`,
                    `2. Replaced & Warranty Parts Summary (${scopedParts.length} items)`
                  )}
                </h2>
                {scopedParts.length === 0 ? (
                  <p className="text-slate-500 py-3">
                    {t('ບໍ່ມີລາຍການປ່ຽນອະໄຫຼ່ໃນຊ່ວງທີ່ເລືອກ', 'No part replacements in the selected period')}
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-2 px-2.5">{t('ວັນທີ', 'Date')}</th>
                        <th className="py-2 px-2.5">{t('ລາຍການອະໄຫຼ່ / ລຸ້ນ', 'Part / Model')}</th>
                        <th className="py-2 px-2.5">{t('ປະເພດ', 'Action')}</th>
                        <th className="py-2 px-2.5">{t('ສະຖານະປັດຈຸບັນ', 'Current Status')}</th>
                        <th className="py-2 px-2.5">{t('ສູນ/ຜູ້ຈຳໜ່າຍ', 'Supplier / Center')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scopedParts.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap">
                            {formatDate(p.replacedDate)}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-medium text-slate-900">{p.partName}</div>
                            <div className="text-slate-500">
                              {p.brandModel} · S/N: {p.serialNumber}
                            </div>
                          </td>
                          <td className="py-2 px-2.5">{tv(p.action)}</td>
                          <td className="py-2 px-2.5">
                            <PartStatusText status={p.status} />
                          </td>
                          <td className="py-2 px-2.5">{p.supplier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {t(
                    `3. ປະຫວັດວຽກສ້ອມ ແລະ ຜົນລັບການແກ້ໄຂບັນຫາ (${scopedRepairs.length} ລາຍການ)`,
                    `3. Repair History & Resolutions (${scopedRepairs.length} records)`
                  )}
                </h2>
                {scopedRepairs.length === 0 ? (
                  <p className="text-slate-500 py-3">
                    {t('ບໍ່ມີປະຫວັດວຽກສ້ອມໃນຊ່ວງທີ່ເລືອກ', 'No repair records in the selected period')}
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-2 px-2.5">{t('ໃບງານ / ວັນທີ', 'Ticket / Date')}</th>
                        <th className="py-2 px-2.5">{t('ໝວດໝູ່ / ອາການແຈ້ງສ້ອມ', 'Category / Symptom')}</th>
                        <th className="py-2 px-2.5">{t('ສາເຫດ ແລະ ຜົນລັບການແກ້ໄຂ', 'Root Cause & Resolution')}</th>
                        <th className="py-2 px-2.5">{t('ຜູ້ແຈ້ງ / ຊ່າງ', 'Reporter / Tech')}</th>
                        <th className="py-2 px-2.5">{t('ສະຖານະ', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scopedRepairs.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-2.5 font-mono tabular-nums align-top whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{r.ticketCode}</div>
                            <div className="text-slate-500">{formatDate(r.reportedDate)}</div>
                          </td>
                          <td className="py-2 px-2.5 align-top">
                            <div className="font-medium text-slate-800">{tv(r.category)}</div>
                            <div className="text-slate-600 mt-0.5">{r.symptom}</div>
                          </td>
                          <td className="py-2 px-2.5 align-top">
                            {r.rootCause && (
                              <div className="text-slate-600">
                                {t('ສາເຫດ:', 'Cause:')} {r.rootCause}
                              </div>
                            )}
                            <div className="text-slate-900 mt-0.5">
                              {t('ຜົນລັບ:', 'Resolution:')} {r.resolution || '—'}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 align-top">
                            <div className="text-slate-700">{r.reporter}</div>
                            <div className="text-slate-500">
                              {t('ຊ່າງ:', 'Tech:')} {r.technician}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 align-top">
                            <RepairStatusText status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {t(
                    '4. ສະຫຼຸບແນວໂນ້ມບັນຫາ ແລະ ແຜນບຳລຸງຮັກສາເຊີງປ້ອງກັນ (PM Plan)',
                    '4. Issue Trends & Preventive Maintenance (PM) Plan'
                  )}
                </h2>
                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2 px-2.5">{t('ເຄື່ອງ', 'Machine')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ຈຳນວນສ້ອມ', 'Repairs')}</th>
                      <th className="py-2 px-2.5">{t('ບັນຫາທີ່ພົບ', 'Top Issue')}</th>
                      <th className="py-2 px-2.5">{t('ແນວທາງປ້ອງກັນທີ່ແນະນຳ', 'Recommended PM Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scopedAnalytics.map((a) => (
                      <tr key={a.computer.id}>
                        <td className="py-2 px-2.5 font-mono font-medium whitespace-nowrap">
                          {a.computer.assetTag}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                          {t(`${a.totalRepairs} ຄັ້ງ`, `${a.totalRepairs}`)}
                        </td>
                        <td className="py-2 px-2.5">
                          {a.topCategory ? `${tv(a.topCategory)} (${a.topCategoryCount})` : '—'}
                        </td>
                        <td className="py-2 px-2.5">{a.pmRecommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* 1. Zone Overview Table */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {t(
                    '1. ສະຫຼຸບວຽກສ້ອມ Computer ແບ່ງຕາມໂຊນ (ແຜນທີ່ຄອມ 701 B)',
                    '1. Computer Repair Summary by Zone (Map 701 B)'
                  )}
                </h2>
                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2 px-2.5">{t('ໂຊນ (Map)', 'Zone (Map)')}</th>
                      <th className="py-2 px-2.5">{t('ທີມ / ພະແນກ', 'Team / Department')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ຈຳນວນເຄື່ອງ', 'Machines')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ແຈ້ງສ້ອມ', 'Repairs')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ສຳເລັດ', 'Done')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ຄ້າງສ້ອມ', 'Open')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ອະໄຫຼ່', 'Parts')}</th>
                      <th className="py-2 px-2.5">{t('ບັນຫາທີ່ພົບ', 'Top Issue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {zoneSummaries.map((zs) => (
                      <tr key={zs.zoneId}>
                        <td className="py-2 px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: zs.dotColor }}
                              aria-hidden="true"
                            />
                            <span>{t(`ໂຊນ ${zs.label}`, `Zone ${tv(zs.label)}`)}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">{tv(zs.departmentName)}</td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                          {zs.computers.length}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {zs.repairCount}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700">
                          {zs.completedCount}
                        </td>
                        <td
                          className={`py-2 px-2.5 text-right font-mono tabular-nums ${
                            zs.openCount > 0 ? 'text-amber-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {zs.openCount}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                          {zs.partsCount}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700">
                          {zs.topCategory ? `${tv(zs.topCategory)} (${zs.topCategoryCount})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                      <td className="py-2 px-2.5" colSpan={2}>
                        {t(`ລວມທັງໝົດ (${zoneSummaries.length} ໂຊນ)`, `Total (${zoneSummaries.length} zones)`)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                        {scopedComputers.length}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                        {totals.repairCount}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700">
                        {totals.completedRepairs}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-amber-700">
                        {totals.openRepairs}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                        {scopedParts.length}
                      </td>
                      <td className="py-2 px-2.5 text-slate-500 font-normal">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 2. Details Grouped by Zone vs Unified */}
              {groupByZone ? (
                <div className="space-y-5">
                  <h2 className="text-sm font-bold text-slate-900">
                    {t('2. ລາຍລະອຽດວຽກສ້ອມ ແລະ ອະໄຫຼ່ ແບ່ງຕາມໂຊນ', '2. Repair & Parts Details by Zone')}
                  </h2>

                  {zoneSummaries.map((zs) => {
                    const hasActivity = zs.repairs.length > 0 || zs.parts.length > 0;
                    return (
                      <div
                        key={zs.zoneId}
                        className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid"
                      >
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: zs.dotColor }}
                              aria-hidden="true"
                            />
                            <span className="text-xs font-bold text-slate-900">
                              {t(`ໂຊນ ${zs.label}`, `Zone ${tv(zs.label)}`)}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              ({tv(zs.departmentName)})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-slate-600">
                            <span>{t(`ເຄື່ອງ: ${zs.computers.length}`, `Units: ${zs.computers.length}`)}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-900">
                              {t(`ແຈ້ງສ້ອມ: ${zs.repairCount} ຄັ້ງ`, `Repairs: ${zs.repairCount}`)}
                            </span>
                            <span>·</span>
                            <span className="text-emerald-700">
                              {t(`ສຳເລັດ: ${zs.completedCount}`, `Done: ${zs.completedCount}`)}
                            </span>
                            <span>·</span>
                            <span className={zs.openCount > 0 ? 'text-amber-700 font-semibold' : ''}>
                              {t(`ຄ້າງ: ${zs.openCount}`, `Open: ${zs.openCount}`)}
                            </span>
                            <span>·</span>
                            <span>{t(`ອະໄຫຼ່: ${zs.partsCount}`, `Parts: ${zs.partsCount}`)}</span>
                          </div>
                        </div>

                        {!hasActivity ? (
                          <div className="px-4 py-3 text-[11px] text-slate-500">
                            {t(
                              `ບໍ່ມີລາຍການແຈ້ງສ້ອມ ຫຼື ປ່ຽນອະໄຫຼ່ໃນໂຊນ ${zs.label} ສຳລັບຊ່ວງທີ່ເລືອກ`,
                              `No repair or part records in Zone ${tv(zs.label)} for the selected period`
                            )}
                          </div>
                        ) : (
                          <div className="p-4 space-y-4">
                            {zs.repairs.length > 0 && (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                                  {t(
                                    `ປະຫວັດວຽກສ້ອມໃນໂຊນ ${zs.label} (${zs.repairs.length} ລາຍການ)`,
                                    `Repair History in Zone ${tv(zs.label)} (${zs.repairs.length} records)`
                                  )}
                                </div>
                                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                                      <th className="py-1.5 px-2">{t('ໃບງານ / ວັນທີ', 'Ticket / Date')}</th>
                                      <th className="py-1.5 px-2">{t('ເຄື່ອງ', 'Machine')}</th>
                                      <th className="py-1.5 px-2">{t('ໝວດໝູ່ / ອາການແຈ້ງສ້ອມ', 'Category / Symptom')}</th>
                                      <th className="py-1.5 px-2">{t('ສາເຫດ ແລະ ຜົນລັບ', 'Cause & Resolution')}</th>
                                      <th className="py-1.5 px-2">{t('ຜູ້ແຈ້ງ / ຊ່າງ', 'Reporter / Tech')}</th>
                                      <th className="py-1.5 px-2">{t('ສະຖານະ', 'Status')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {zs.repairs.map((r) => {
                                      const comp = compMap.get(r.computerId);
                                      return (
                                        <tr key={r.id}>
                                          <td className="py-1.5 px-2 font-mono tabular-nums align-top whitespace-nowrap">
                                            <div className="font-semibold text-slate-900">
                                              {r.ticketCode}
                                            </div>
                                            <div className="text-slate-500">
                                              {formatDate(r.reportedDate)}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2 font-mono align-top whitespace-nowrap">
                                            <div className="font-medium text-slate-900">
                                              {comp?.name || comp?.assetTag || '—'}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2 align-top">
                                            <div className="font-medium text-slate-800">
                                              {tv(r.category)}
                                            </div>
                                            <div className="text-slate-600 mt-0.5">{r.symptom}</div>
                                          </td>
                                          <td className="py-1.5 px-2 align-top">
                                            {r.rootCause && (
                                              <div className="text-slate-600">
                                                {t('ສາເຫດ:', 'Cause:')} {r.rootCause}
                                              </div>
                                            )}
                                            <div className="text-slate-900 mt-0.5">
                                              {t('ຜົນລັບ:', 'Resolution:')} {r.resolution || '—'}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2 align-top">
                                            <div className="text-slate-700">{r.reporter}</div>
                                            <div className="text-slate-500">
                                              {t('ຊ່າງ:', 'Tech:')} {r.technician}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2 align-top">
                                            <RepairStatusText status={r.status} />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {zs.parts.length > 0 && (
                              <div>
                                <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                                  {t(
                                    `ອະໄຫຼ່ທີ່ປ່ຽນ / ສົ່ງເຄລມໃນໂຊນ ${zs.label} (${zs.parts.length} ລາຍການ)`,
                                    `Replaced / Warranty Parts in Zone ${tv(zs.label)} (${zs.parts.length} items)`
                                  )}
                                </div>
                                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                                      <th className="py-1.5 px-2">{t('ວັນທີ', 'Date')}</th>
                                      <th className="py-1.5 px-2">{t('ເຄື່ອງ', 'Machine')}</th>
                                      <th className="py-1.5 px-2">{t('ລາຍການອະໄຫຼ່ / ລຸ້ນ', 'Part / Model')}</th>
                                      <th className="py-1.5 px-2">{t('ປະເພດ', 'Action')}</th>
                                      <th className="py-1.5 px-2">{t('ສະຖານະ', 'Status')}</th>
                                      <th className="py-1.5 px-2">{t('ສູນ/ຜູ້ຈຳໜ່າຍ', 'Supplier')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {zs.parts.map((p) => {
                                      const comp = compMap.get(p.computerId);
                                      return (
                                        <tr key={p.id}>
                                          <td className="py-1.5 px-2 font-mono tabular-nums whitespace-nowrap">
                                            {formatDate(p.replacedDate)}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono font-medium whitespace-nowrap">
                                            {comp?.name || comp?.assetTag || tv('ໃນສະຕອກ')}
                                          </td>
                                          <td className="py-1.5 px-2">
                                            <div className="font-medium text-slate-900">
                                              {p.partName}
                                            </div>
                                            <div className="text-slate-500">
                                              {p.brandModel} · S/N: {p.serialNumber}
                                            </div>
                                          </td>
                                          <td className="py-1.5 px-2">{tv(p.action)}</td>
                                          <td className="py-1.5 px-2">
                                            <PartStatusText status={p.status} />
                                          </td>
                                          <td className="py-1.5 px-2">{p.supplier}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {unlinkedParts.length > 0 && selectedZone === 'all' && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-900">
                        {t(
                          `ອະໄຫຼ່ໃນສະຕອກ / ບໍ່ລະບຸເຄື່ອງ (${unlinkedParts.length} ລາຍການ)`,
                          `Stock / Unassigned Parts (${unlinkedParts.length} items)`
                        )}
                      </div>
                      <div className="p-4">
                        <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                          <thead>
                            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                              <th className="py-1.5 px-2">{t('ວັນທີ', 'Date')}</th>
                              <th className="py-1.5 px-2">{t('ລາຍການອະໄຫຼ່ / ລຸ້ນ', 'Part / Model')}</th>
                              <th className="py-1.5 px-2">{t('ປະເພດ', 'Action')}</th>
                              <th className="py-1.5 px-2">{t('ສະຖານະ', 'Status')}</th>
                              <th className="py-1.5 px-2">{t('ສູນ/ຜູ້ຈຳໜ່າຍ', 'Supplier')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {unlinkedParts.map((p) => (
                              <tr key={p.id}>
                                <td className="py-1.5 px-2 font-mono tabular-nums whitespace-nowrap">
                                  {formatDate(p.replacedDate)}
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="font-medium text-slate-900">{p.partName}</div>
                                  <div className="text-slate-500">
                                    {p.brandModel} · S/N: {p.serialNumber}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2">{tv(p.action)}</td>
                                <td className="py-1.5 px-2">
                                  <PartStatusText status={p.status} />
                                </td>
                                <td className="py-1.5 px-2">{p.supplier}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-2">
                      {t(
                        `2. ສະຫຼຸບສະຖານະອະໄຫຼ່ທີ່ປ່ຽນ ແລະ ສົ່ງເຄລມ (${scopedParts.length} ລາຍການ)`,
                        `2. Replaced & Warranty Parts Summary (${scopedParts.length} items)`
                      )}
                    </h2>
                    {scopedParts.length === 0 ? (
                      <p className="text-slate-500 py-3">
                        {t('ບໍ່ມີລາຍການປ່ຽນອະໄຫຼ່ໃນຊ່ວງທີ່ເລືອກ', 'No part replacements in the selected period')}
                      </p>
                    ) : (
                      <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                            <th className="py-2 px-2.5">{t('ໂຊນ', 'Zone')}</th>
                            <th className="py-2 px-2.5">{t('ວັນທີ', 'Date')}</th>
                            <th className="py-2 px-2.5">{t('ເຄື່ອງ', 'Machine')}</th>
                            <th className="py-2 px-2.5">{t('ລາຍການອະໄຫຼ່ / ລຸ້ນ', 'Part / Model')}</th>
                            <th className="py-2 px-2.5">{t('ປະເພດ', 'Action')}</th>
                            <th className="py-2 px-2.5">{t('ສະຖານະປັດຈຸບັນ', 'Current Status')}</th>
                            <th className="py-2 px-2.5">{t('ສູນ/ຜູ້ຈຳໜ່າຍ', 'Supplier')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {scopedParts.map((p) => {
                            const comp = compMap.get(p.computerId);
                            return (
                              <tr key={p.id}>
                                <td className="py-2 px-2.5 font-medium whitespace-nowrap">
                                  {comp ? tv(resolveMachineZoneId(comp)) : t('ສະຕອກ', 'Stock')}
                                </td>
                                <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap">
                                  {formatDate(p.replacedDate)}
                                </td>
                                <td className="py-2 px-2.5 font-mono font-medium">
                                  {comp?.assetTag || tv('ໃນສະຕອກ')}
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="font-medium text-slate-900">{p.partName}</div>
                                  <div className="text-slate-500">
                                    {p.brandModel} · S/N: {p.serialNumber}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">{tv(p.action)}</td>
                                <td className="py-2 px-2.5">
                                  <PartStatusText status={p.status} />
                                </td>
                                <td className="py-2 px-2.5">{p.supplier}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-2">
                      {t(
                        `3. ປະຫວັດວຽກສ້ອມ ແລະ ຜົນລັບການແກ້ໄຂບັນຫາ (${scopedRepairs.length} ລາຍການ)`,
                        `3. Repair History & Resolutions (${scopedRepairs.length} records)`
                      )}
                    </h2>
                    {scopedRepairs.length === 0 ? (
                      <p className="text-slate-500 py-3">
                        {t('ບໍ່ມີປະຫວັດວຽກສ້ອມໃນຊ່ວງທີ່ເລືອກ', 'No repair records in the selected period')}
                      </p>
                    ) : (
                      <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                            <th className="py-2 px-2.5">{t('ໂຊນ', 'Zone')}</th>
                            <th className="py-2 px-2.5">{t('ໃບງານ / ວັນທີ', 'Ticket / Date')}</th>
                            <th className="py-2 px-2.5">{t('ເຄື່ອງ', 'Machine')}</th>
                            <th className="py-2 px-2.5">{t('ໝວດໝູ່ / ອາການແຈ້ງສ້ອມ', 'Category / Symptom')}</th>
                            <th className="py-2 px-2.5">{t('ສາເຫດ ແລະ ຜົນລັບການແກ້ໄຂ', 'Cause & Resolution')}</th>
                            <th className="py-2 px-2.5">{t('ຜູ້ແຈ້ງ / ຊ່າງ', 'Reporter / Tech')}</th>
                            <th className="py-2 px-2.5">{t('ສະຖານະ', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {scopedRepairs.map((r) => {
                            const comp = compMap.get(r.computerId);
                            return (
                              <tr key={r.id}>
                                <td className="py-2 px-2.5 font-medium align-top whitespace-nowrap">
                                  {comp ? tv(resolveMachineZoneId(comp)) : '—'}
                                </td>
                                <td className="py-2 px-2.5 font-mono tabular-nums align-top whitespace-nowrap">
                                  <div className="font-semibold text-slate-900">{r.ticketCode}</div>
                                  <div className="text-slate-500">
                                    {formatDate(r.reportedDate)}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 font-mono align-top whitespace-nowrap">
                                  {comp?.assetTag || '—'}
                                </td>
                                <td className="py-2 px-2.5 align-top">
                                  <div className="font-medium text-slate-800">{tv(r.category)}</div>
                                  <div className="text-slate-600 mt-0.5">{r.symptom}</div>
                                </td>
                                <td className="py-2 px-2.5 align-top">
                                  {r.rootCause && (
                                    <div className="text-slate-600">
                                      {t('ສາເຫດ:', 'Cause:')} {r.rootCause}
                                    </div>
                                  )}
                                  <div className="text-slate-900 mt-0.5">
                                    {t('ຜົນລັບ:', 'Resolution:')} {r.resolution || '—'}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 align-top">
                                  <div className="text-slate-700">{r.reporter}</div>
                                  <div className="text-slate-500">
                                    {t('ຊ່າງ:', 'Tech:')} {r.technician}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 align-top">
                                  <RepairStatusText status={r.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {/* 3. Problem Summary & PM Plan by Zone */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-2">
                  {groupByZone ? '3.' : '4.'}{' '}
                  {t(
                    'ສະຫຼຸບແນວໂນ້ມບັນຫາ ແລະ ແຜນບຳລຸງຮັກສາເຊີງປ້ອງກັນ (PM Plan)',
                    'Issue Trends & Preventive Maintenance (PM) Plan'
                  )}
                </h2>
                <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2 px-2.5">{t('ໂຊນ', 'Zone')}</th>
                      <th className="py-2 px-2.5">{t('ເຄື່ອງ', 'Machine')}</th>
                      <th className="py-2 px-2.5 text-right">{t('ຈຳນວນສ້ອມ', 'Repairs')}</th>
                      <th className="py-2 px-2.5">{t('ບັນຫາທີ່ພົບ', 'Top Issue')}</th>
                      <th className="py-2 px-2.5">{t('ແນວທາງປ້ອງກັນທີ່ແນະນຳ', 'Recommended PM Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scopedAnalytics.map((a) => (
                      <tr key={a.computer.id}>
                        <td className="py-2 px-2.5 font-medium whitespace-nowrap">
                          {tv(resolveMachineZoneId(a.computer))}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-medium whitespace-nowrap">
                          {a.computer.name} ({a.computer.assetTag})
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                          {t(`${a.totalRepairs} ຄັ້ງ`, `${a.totalRepairs}`)}
                        </td>
                        <td className="py-2 px-2.5">
                          {a.topCategory ? `${tv(a.topCategory)} (${a.topCategoryCount})` : '—'}
                        </td>
                        <td className="py-2 px-2.5">{a.pmRecommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
