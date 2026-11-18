import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileUp,
  Link2,
  RefreshCw,
  Search,
  Table2,
  X,
} from 'lucide-react';
import { StoredLedgerData } from '../data/initialData';
import { AppsScriptSheetMeta } from '../services/appsScriptBridge';
import { extractAvailableYears, LAO_FULL_MONTHS } from '../utils/analytics';
import {
  downloadCsvTemplate,
  downloadExcelTemplate,
  exportComputersCSV,
  exportExcelWorkbook,
  exportPartsCSV,
  exportRepairsCSV,
  exportStockCSV,
  mergeOrReplaceLedgerData,
  ParsedExternalUpload,
  parseExternalUploadBinaryFile,
} from '../utils/fileImportExport';
import { useLanguage } from '../i18n/LanguageContext';
import { AssetStatusBadge, PartStatusText, RepairStatusText } from './StatusText';

interface FilesAndTablesViewProps {
  data: StoredLedgerData;
  onApplyImportedData: (nextData: StoredLedgerData, message: string) => void;
  onExportJson: () => void;
  onNotify: (message: string) => void;
  onInspectMachine: (computerId: string) => void;
  isGas?: boolean;
  gasStatus?: 'idle' | 'loading' | 'saving' | 'synced' | 'error';
  gasError?: string | null;
  gasSheetMeta?: AppsScriptSheetMeta | null;
  gasLastSavedAt?: string | null;
  onGasSyncNow?: () => Promise<void> | void;
  onGasReloadFromSheet?: () => Promise<void> | void;
  onGasLinkSheet?: (urlOrId: string) => Promise<void> | void;
}

export const FilesAndTablesView: React.FC<FilesAndTablesViewProps> = ({
  data,
  onApplyImportedData,
  onExportJson,
  onNotify,
  onInspectMachine,
  isGas = false,
  gasStatus = 'idle',
  gasError = null,
  gasSheetMeta = null,
  gasLastSavedAt = null,
  onGasSyncNow,
  onGasReloadFromSheet,
  onGasLinkSheet,
}) => {
  const { t, tv, formatDate, getMonthFull } = useLanguage();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingFileUpload, setPendingFileUpload] =
    useState<ParsedExternalUpload | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [linkingSheet, setLinkingSheet] = useState(false);
  const [copiedCodeGs, setCopiedCodeGs] = useState(false);

  const [tableTab, setTableTab] = useState<'computers' | 'repairs' | 'parts' | 'stock'>(
    'computers'
  );
  const [tableSearch, setTableSearch] = useState('');
  const [tableYearFilter, setTableYearFilter] = useState<'all' | string>('all');
  const [tableMonthFilter, setTableMonthFilter] = useState<'all' | string>('all');

  const handleDownloadGasAsset = async (
    fileName: 'Code.gs' | 'Index.html' | 'appsscript.json'
  ) => {
    try {
      const res = await fetch(`./apps-script/${fileName}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      onNotify(
        t(`ດາວໂຫຼດໄຟລ໌ "${fileName}" ສຳເລັດແລ້ວ`, `Downloaded "${fileName}"`)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        t(
          `ບໍ່ສາມາດດາວໂຫຼດ "${fileName}" ໄດ້: ${msg}`,
          `Could not download "${fileName}": ${msg}`
        )
      );
    }
  };

  const handleCopyCodeGs = async () => {
    try {
      const res = await fetch('./apps-script/Code.gs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedCodeGs(true);
      onNotify(t('ຄັດລອກໂຄ້ດ Code.gs ແລ້ວ', 'Copied Code.gs to clipboard'));
      window.setTimeout(() => setCopiedCodeGs(false), 2500);
    } catch {
      handleDownloadGasAsset('Code.gs');
    }
  };

  const handleLinkSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sheetUrlInput.trim();
    if (!trimmed || !onGasLinkSheet) return;
    setLinkingSheet(true);
    try {
      await onGasLinkSheet(trimmed);
      setSheetUrlInput('');
    } finally {
      setLinkingSheet(false);
    }
  };

  const processExternalFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const parsed = await parseExternalUploadBinaryFile(file, data.computers);
      if (
        parsed.summary.computersCount === 0 &&
        parsed.summary.repairsCount === 0 &&
        parsed.summary.partsCount === 0 &&
        parsed.summary.stockCount === 0 &&
        parsed.summary.categoriesCount === 0
      ) {
        setErrorMsg(
          t(
            `ບໍ່ພົບແຖວຂໍ້ມູນທີ່ຮອງຮັບໃນໄຟລ໌ "${file.name}" — ກະລຸນາກວດສອບຫົວຕາຕະລາງ ຫຼື ດາວໂຫຼດແບບຟອມ Excel/CSV ຕົວຢ່າງ`,
            `No supported data rows found in "${file.name}" — check table headers or download an Excel/CSV template`
          )
        );
        return;
      }
      setPendingFileUpload(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('ຮູບແບບໄຟລ໌ບໍ່ຖືກຕ້ອງ', 'Invalid file format');
      setErrorMsg(t(`ອ່ານໄຟລ໌ "${file.name}" ບໍ່ສຳເລັດ: ${msg}`, `Failed to read "${file.name}": ${msg}`));
    }
  };

  const handleConfirmFileUploadApply = (mode: 'merge' | 'replace') => {
    if (!pendingFileUpload) return;
    const nextData = mergeOrReplaceLedgerData(data, pendingFileUpload.data, mode);
    if (pendingFileUpload.summary.repairsCount > 0) {
      setTableTab('repairs');
    } else if (pendingFileUpload.summary.partsCount > 0) {
      setTableTab('parts');
    } else if (pendingFileUpload.summary.stockCount > 0) {
      setTableTab('stock');
    }
    setTableYearFilter('all');
    setTableMonthFilter('all');
    onApplyImportedData(
      nextData,
      mode === 'merge'
        ? t(
            `ຮວມຂໍ້ມູນຈາກໄຟລ໌ "${pendingFileUpload.fileName}" ຮຽບຮ້ອຍແລ້ວ`,
            `Merged data from file "${pendingFileUpload.fileName}"`
          )
        : t(
            `ແທນທີ່ຂໍ້ມູນຈາກໄຟລ໌ "${pendingFileUpload.fileName}" ຮຽບຮ້ອຍແລ້ວ`,
            `Replaced data from file "${pendingFileUpload.fileName}"`
          )
    );
    setPendingFileUpload(null);
  };

  const computerMap = useMemo(
    () => new Map(data.computers.map((c) => [c.id, c])),
    [data.computers]
  );

  const availableYears = useMemo(
    () =>
      extractAvailableYears([
        ...data.repairs.map((r) => r.reportedDate),
        ...data.parts.map((p) => p.replacedDate),
        ...data.computers.map((c) => c.lastPmDate),
        ...data.computers.map((c) => c.purchaseDate),
      ]),
    [data.repairs, data.parts, data.computers]
  );

  const pendingUploadYears = useMemo(() => {
    if (!pendingFileUpload) return [];
    return extractAvailableYears(
      [
        ...(pendingFileUpload.data.repairs || []).map((r) => r.reportedDate),
        ...(pendingFileUpload.data.parts || []).map((p) => p.replacedDate),
      ],
      false
    );
  }, [pendingFileUpload]);

  const matchesDateFilter = (dateStr: string | undefined | null): boolean => {
    if (tableYearFilter === 'all' && tableMonthFilter === 'all') return true;
    const d = String(dateStr || '');
    if (tableYearFilter !== 'all' && !d.startsWith(`${tableYearFilter}-`)) {
      return false;
    }
    if (tableMonthFilter !== 'all' && d.slice(5, 7) !== tableMonthFilter) {
      return false;
    }
    return true;
  };

  const filteredComputers = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return data.computers;
    return data.computers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.assetTag.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.assignedUser.toLowerCase().includes(q) ||
        c.specs.cpu.toLowerCase().includes(q)
    );
  }, [data.computers, tableSearch]);

  const filteredRepairs = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return [...data.repairs]
      .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate))
      .filter((r) => {
        if (!matchesDateFilter(r.reportedDate)) return false;
        if (!q) return true;
        const comp = computerMap.get(r.computerId);
        return (
          r.ticketCode.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.symptom.toLowerCase().includes(q) ||
          r.technician.toLowerCase().includes(q) ||
          (comp?.name.toLowerCase().includes(q) ?? false) ||
          (comp?.assetTag.toLowerCase().includes(q) ?? false)
        );
      });
  }, [data.repairs, computerMap, tableSearch, tableYearFilter, tableMonthFilter]);

  const filteredParts = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return [...data.parts]
      .sort((a, b) => b.replacedDate.localeCompare(a.replacedDate))
      .filter((p) => {
        if (!matchesDateFilter(p.replacedDate)) return false;
        if (!q) return true;
        const comp = computerMap.get(p.computerId);
        return (
          p.partName.toLowerCase().includes(q) ||
          p.brandModel.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          (comp?.name.toLowerCase().includes(q) ?? false)
        );
      });
  }, [data.parts, computerMap, tableSearch, tableYearFilter, tableMonthFilter]);

  const filteredStock = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return data.stockParts;
    return data.stockParts.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
    );
  }, [data.stockParts, tableSearch]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer shrink-0"
            aria-label={t('ປິດຂໍ້ຄວາມແຈ້ງເຕືອນ', 'Dismiss error')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Apps Script & Google Sheets Integration Card */}
      {isGas ? (
        <section className="bg-white border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-700 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900">
                  {t(
                    'ເຊື່ອມຕໍ່ Google Sheets ຜ່ານ Apps Script ແລ້ວ',
                    'Connected to Google Sheets via Apps Script'
                  )}
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    gasStatus === 'error'
                      ? 'bg-rose-100 text-rose-800'
                      : gasStatus === 'saving' || gasStatus === 'loading'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {gasStatus === 'loading'
                    ? t('ກຳລັງໂຫຼດ...', 'Loading...')
                    : gasStatus === 'saving'
                    ? t('ກຳລັງບັນທຶກ...', 'Saving...')
                    : gasStatus === 'error'
                    ? t('ຂັດຂ້ອງ', 'Error')
                    : t('ຊິງຄ໌ອັດຕະໂນມັດ', 'Auto-Synced')}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {gasSheetMeta ? (
                  <>
                    {t('ໄຟລ໌ປັດຈຸບັນ:', 'Active Spreadsheet:')}{' '}
                    <span className="font-semibold text-slate-900">
                      {gasSheetMeta.spreadsheetName}
                    </span>
                    {gasLastSavedAt && (
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">
                        ({new Date(gasLastSavedAt).toLocaleTimeString()})
                      </span>
                    )}
                  </>
                ) : (
                  t(
                    'ຂໍ້ມູນທັງໝົດ 5 ຊີດ (Equipment, Repairs, Parts, Stock, Categories) ກຳລັງບັນທຶກລົງ Google Sheets ອັດຕະໂນມັດ',
                    'All 5 sheets (Equipment, Repairs, Parts, Stock, Categories) sync automatically with Google Sheets.'
                  )
                )}
              </p>
              {gasError && (
                <p className="text-xs text-rose-700 font-medium">{gasError}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {gasSheetMeta?.spreadsheetUrl && (
                <a
                  href={gasSheetMeta.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('ເປີດ Google Sheet', 'Open Google Sheet')}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onGasReloadFromSheet?.()}
                disabled={gasStatus === 'loading' || gasStatus === 'saving'}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${gasStatus === 'loading' ? 'animate-spin' : ''}`}
                />
                <span>{t('ດຶງຂໍ້ມູນຈາກ Sheet', 'Reload from Sheet')}</span>
              </button>
              <button
                type="button"
                onClick={() => onGasSyncNow?.()}
                disabled={gasStatus === 'loading' || gasStatus === 'saving'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{t('ບັນທຶກລົງ Sheet ດຽວນີ້', 'Sync to Sheet Now')}</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleLinkSheetSubmit}
            className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder={t(
                  'ປ່ຽນໄຟລ໌ Google Sheet: ວາງ URL ຫຼື Spreadsheet ID ບ່ອນນີ້...',
                  'Switch Google Sheet: paste Spreadsheet URL or ID here...'
                )}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              type="submit"
              disabled={!sheetUrlInput.trim() || linkingSheet}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {linkingSheet
                ? t('ກຳລັງເຊື່ອມຕໍ່...', 'Connecting...')
                : t('ສະຫຼັບ Google Sheet', 'Switch Sheet')}
            </button>
          </form>
        </section>
      ) : (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-sky-700 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900">
                  {t(
                    'ຊຸດຕິດຕັ້ງ Google Apps Script (Run ເທິງ Google Sheets ຟຣີ 100%)',
                    'Google Apps Script Package (Run Natively on Google Sheets)'
                  )}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {t(
                  'ດາວໂຫຼດໄຟລ໌ສຳເລັດຮູບ Code.gs ແລະ Index.html ໄປວາງໃນ Extensions -> Apps Script ເພື່ອເຊື່ອມຕໍ່ Google Sheets ໂດຍບໍ່ຕ້ອງເສຍຄ່າ Server',
                  'Download ready-to-deploy Code.gs and Index.html for Extensions -> Apps Script to connect directly to Google Sheets with zero server cost.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadGasAsset('Code.gs')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Code.gs</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadGasAsset('Index.html')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Index.html</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadGasAsset('appsscript.json')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>appsscript.json</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCodeGs}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {copiedCodeGs ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{t('ຄັດລອກ Code.gs', 'Copy Code.gs')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="font-semibold text-slate-900 mb-0.5">
                {t('1. ເປີດ Apps Script', '1. Open Apps Script')}
              </div>
              <p>
                {t(
                  'ເປີດ Google Sheets ແລ້ວກົດ Extensions -> Apps Script',
                  'Open your Google Sheet and go to Extensions -> Apps Script.'
                )}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="font-semibold text-slate-900 mb-0.5">
                {t('2. ວາງ Code.gs', '2. Paste Code.gs')}
              </div>
              <p>
                {t(
                  'ລົບໂຄ້ດເດີມໃນ Code.gs ແລ້ວວາງໂຄ້ດຈາກໄຟລ໌ Code.gs ທີ່ດາວໂຫຼດ',
                  'Replace default Code.gs contents with the downloaded Code.gs.'
                )}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="font-semibold text-slate-900 mb-0.5">
                {t('3. ສ້າງໄຟລ໌ Index', '3. Create Index.html')}
              </div>
              <p>
                {t(
                  'ກົດ + ເລືອກ HTML ຕັ້ງຊື່ວ່າ Index ແລ້ວວາງເນື້ອໃນ Index.html',
                  'Click + -> HTML named Index, then paste the downloaded Index.html.'
                )}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
              <div className="font-semibold text-slate-900 mb-0.5">
                {t('4. Deploy Web App', '4. Deploy Web App')}
              </div>
              <p>
                {t(
                  'ກົດ Deploy -> New deployment -> Web app ແລ້ວເປີດລິ້ງໃຊ້ງານໄດ້ເລີຍ',
                  'Click Deploy -> New deployment -> Web app and open the URL.'
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Top Grid: Excel / CSV / JSON Import & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Upload Area */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-sky-700 shrink-0" />
              <h2 className="text-base font-semibold text-slate-900">
                {t('ນຳເຂົ້າໄຟລ໌ Excel (.xls / .xlsx), CSV & JSON', 'Import Excel (.xls / .xlsx), CSV & JSON')}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'ອັບໂຫຼດໄຟລ໌ຈາກ Excel ເວີຊັນເກົ່າ (.xls), Excel ເວີຊັນໃໝ່ (.xlsx), .CSV ຫຼື .JSON ແບບອອບໄລນ໌ 100%',
                'Upload legacy Excel (.xls), modern Excel (.xlsx), .CSV, or .JSON files 100% offline.'
              )}
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processExternalFile(file);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragActive
                ? 'border-sky-600 bg-sky-50/70'
                : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
            }`}
          >
            <FileUp className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-800">
              {t('ລາກໄຟລ໌ມາວາງບ່ອນນີ້ ຫຼື ເລືອກໄຟລ໌ຈາກເຄື່ອງ', 'Drag & drop file here or choose from device')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {t(
                'ຮອງຮັບ .XLS (Excel 97-2003), .XLSX (Excel 2007-365), .CSV ແລະ .JSON',
                'Supports .XLS (Excel 97-2003), .XLSX (Excel 2007-365), .CSV, and .JSON'
              )}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processExternalFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{t('ເລືອກໄຟລ໌ Excel / CSV / JSON', 'Choose Excel / CSV / JSON')}</span>
            </button>
          </div>
        </section>

        {/* Export & Templates */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
              <h2 className="text-base font-semibold text-slate-900">
                {t('ສົ່ງອອກ Excel (ເວີຊັນເກົ່າ-ໃໝ່) & ສຳຮອງຂໍ້ມູນ', 'Export Excel (Old & New) & Backup')}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(
                'ດາວໂຫຼດຂໍ້ມູນທັງໝົດ 5 ຊີດ (Equipment, Repairs, Parts, Stock, Categories) ໃນໄຟລ໌ Excel ດຽວ ຫຼື ແຍກ CSV',
                'Download all 5 sheets in a single Excel workbook (.xlsx or legacy .xls) or individual CSV files.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                exportExcelWorkbook(data, 'xlsx');
                onNotify(t('ສົ່ງອອກໄຟລ໌ Excel ໃໝ່ (.xlsx) ຄົບທຸກຊີດແລ້ວ', 'Exported modern Excel (.xlsx) workbook'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('Excel ໃໝ່ (.xlsx) — 2007-365', 'Modern Excel (.xlsx)')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportExcelWorkbook(data, 'xls');
                onNotify(t('ສົ່ງອອກໄຟລ໌ Excel ເກົ່າ (.xls) ຄົບທຸກຊີດແລ້ວ', 'Exported legacy Excel (.xls) workbook'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{t('Excel ເກົ່າ (.xls) — 97-2003', 'Legacy Excel (.xls)')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportComputersCSV(data);
                onNotify(t('ດາວໂຫຼດຕາຕະລາງອຸປະກອນ (.csv) ແລ້ວ', 'Downloaded equipment table (.csv)'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(`ອຸປະກອນ (${data.computers.length}) CSV`, `Equipment (${data.computers.length}) CSV`)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportRepairsCSV(data);
                onNotify(t('ດາວໂຫຼດຕາຕະລາງແຈ້ງສ້ອມ (.csv) ແລ້ວ', 'Downloaded repair logs (.csv)'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(`ປະຫວັດສ້ອມ (${data.repairs.length}) CSV`, `Repairs (${data.repairs.length}) CSV`)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportPartsCSV(data);
                onNotify(t('ດາວໂຫຼດຕາຕະລາງອະໄຫຼ່ (.csv) ແລ້ວ', 'Downloaded parts table (.csv)'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(`ອະໄຫຼ່ທີ່ປ່ຽນ (${data.parts.length}) CSV`, `Parts (${data.parts.length}) CSV`)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportStockCSV(data);
                onNotify(t('ດາວໂຫຼດຕາຕະລາງສະຕອກ (.csv) ແລ້ວ', 'Downloaded stock table (.csv)'));
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(`ສະຕອກອະໄຫຼ່ (${data.stockParts.length}) CSV`, `Stock (${data.stockParts.length}) CSV`)}</span>
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('ສຳຮອງທັງໝົດ JSON', 'Full Backup JSON')}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">{t('ແບບຟອມຕົວຢ່າງ:', 'Templates:')}</span>
            <button
              type="button"
              onClick={() => downloadExcelTemplate('xlsx')}
              className="text-emerald-700 font-medium hover:underline cursor-pointer"
            >
              {t('Excel (.xlsx)', 'Excel (.xlsx)')}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => downloadExcelTemplate('xls')}
              className="text-emerald-700 font-medium hover:underline cursor-pointer"
            >
              {t('Excel 97-2003 (.xls)', 'Excel 97-2003 (.xls)')}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => downloadCsvTemplate('computers')}
              className="text-sky-700 hover:underline cursor-pointer"
            >
              {t('CSV ອຸປະກອນ', 'Equipment CSV')}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => downloadCsvTemplate('repairs')}
              className="text-sky-700 hover:underline cursor-pointer"
            >
              {t('CSV ແຈ້ງສ້ອມ', 'Repairs CSV')}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => downloadCsvTemplate('parts')}
              className="text-sky-700 hover:underline cursor-pointer"
            >
              {t('CSV ອະໄຫຼ່', 'Parts CSV')}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => downloadCsvTemplate('stock')}
              className="text-sky-700 hover:underline cursor-pointer"
            >
              {t('CSV ສະຕອກ', 'Stock CSV')}
            </button>
          </div>
        </section>
      </div>

      {/* Bottom: Live Detailed Table Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-slate-600 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t('ຕາຕະລາງຂໍ້ມູນລະອຽດທັງໝົດ', 'Detailed Data Tables')}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t(
                  'ກວດສອບຂໍ້ມູນທຸກຖັນສຳລັບອຸປະກອນ, ປະຫວັດສ້ອມ, ອະໄຫຼ່ທີ່ປ່ຽນ ແລະ ສະຕອກອະໄຫຼ່',
                  'Inspect all columns across equipment, repair history, replaced parts, and stock'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={tableYearFilter}
              onChange={(e) => {
                setTableYearFilter(e.target.value);
                if (tableTab === 'computers' && e.target.value !== 'all') {
                  setTableTab('repairs');
                }
              }}
              aria-label={t('ກອງຍ້ອນຫຼັງຕາມປີ', 'Filter by year')}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer font-mono"
            >
              <option value="all">{t('ທຸກປີ', 'All Years')}</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {t(`ປີ ${yr}`, `${yr}`)}
                </option>
              ))}
            </select>

            <select
              value={tableMonthFilter}
              onChange={(e) => {
                setTableMonthFilter(e.target.value);
                if (tableTab === 'computers' && e.target.value !== 'all') {
                  setTableTab('repairs');
                }
              }}
              aria-label={t('ກອງຍ້ອນຫຼັງຕາມເດືອນ', 'Filter by month')}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            >
              <option value="all">{t('ທຸກເດືອນ', 'All Months')}</option>
              {LAO_FULL_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {getMonthFull(m.value)} ({m.value})
                </option>
              ))}
            </select>

            {(tableYearFilter !== 'all' || tableMonthFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setTableYearFilter('all');
                  setTableMonthFilter('all');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('ລ້າງຊ່ວງເວລາ', 'Clear Period')}
              </button>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={t('ຄົ້ນຫາໃນຕາຕະລາງ...', 'Search tables...')}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-52"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTableTab('computers')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tableTab === 'computers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ອຸປະກອນ (${filteredComputers.length})`, `Equipment (${filteredComputers.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setTableTab('repairs')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tableTab === 'repairs'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ປະຫວັດສ້ອມ (${filteredRepairs.length})`, `Repairs (${filteredRepairs.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setTableTab('parts')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tableTab === 'parts'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ອະໄຫຼ່ທີ່ປ່ຽນ (${filteredParts.length})`, `Parts (${filteredParts.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setTableTab('stock')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tableTab === 'stock'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(`ສະຕອກອະໄຫຼ່ (${filteredStock.length})`, `Stock (${filteredStock.length})`)}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          {tableTab === 'computers' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ລະຫັດເຄື່ອງ', 'Asset Tag')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຊື່ເຄື່ອງ', 'Name')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ໂຊນ / ພະແນກ', 'Zone / Dept')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຜູ້ໃຊ້ງານ', 'User')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">CPU</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">RAM</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Storage</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">OS</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('Serial Number ຫູຟັງ', 'Headset Serial Number')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ສະຖານະ', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComputers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      {t('ບໍ່ພົບຂໍ້ມູນອຸປະກອນ', 'No equipment records found')}
                    </td>
                  </tr>
                ) : (
                  filteredComputers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {c.assetTag}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectMachine(c.id)}
                          className="font-semibold text-sky-800 hover:underline cursor-pointer"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {c.floorZone ? tv(c.floorZone) : '—'} · {c.department ? tv(c.department) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {c.assignedUser || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {c.specs.cpu || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {c.specs.ram || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {c.specs.storage || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {c.specs.os || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {c.specs.serialNumber || '—'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <AssetStatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tableTab === 'repairs' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ລະຫັດໃບງານ', 'Ticket')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ວັນທີແຈ້ງສ້ອມ', 'Reported Date')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ເຄື່ອງ', 'Machine')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ໝວດໝູ່ບັນຫາ', 'Category')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ອາການແຈ້ງສ້ອມ', 'Symptom')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ສາເຫດທີ່ພົບ', 'Root Cause')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຜົນລັບການແກ້ໄຂ', 'Resolution')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຜູ້ແຈ້ງ / ຊ່າງ', 'Reporter / Tech')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ສະຖານະ', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      {t('ຍັງບໍ່ມີປະຫວັດການແຈ້ງສ້ອມ', 'No repair records found')}
                    </td>
                  </tr>
                ) : (
                  filteredRepairs.map((r) => {
                    const comp = computerMap.get(r.computerId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {r.ticketCode}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDate(r.reportedDate)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {comp ? (
                            <button
                              type="button"
                              onClick={() => onInspectMachine(comp.id)}
                              className="font-semibold text-sky-800 hover:underline cursor-pointer"
                            >
                              {comp.name} ({comp.assetTag})
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {tv(r.category)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 min-w-[200px]">
                          {r.symptom}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 min-w-[180px]">
                          {r.rootCause || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-800 min-w-[180px]">
                          {r.resolution || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {r.reporter} / {r.technician}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <RepairStatusText status={r.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === 'parts' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ວັນທີ', 'Date')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ເຄື່ອງ', 'Machine')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຊື່ອະໄຫຼ່', 'Part Name')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຍີ່ຫໍ້ / ລຸ້ນ', 'Brand / Model')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Serial Number</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ປະເພດ', 'Action')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ສະຖານະ', 'Status')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຜູ້ຈຳໜ່າຍ', 'Supplier')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      {t('ຍັງບໍ່ມີລາຍການອະໄຫຼ່ທີ່ປ່ຽນ', 'No spare part records found')}
                    </td>
                  </tr>
                ) : (
                  filteredParts.map((p) => {
                    const comp = computerMap.get(p.computerId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatDate(p.replacedDate)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {comp ? comp.name : tv('ໃນສະຕອກ')}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {p.partName}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {p.brandModel || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {p.serialNumber || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {tv(p.action)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <PartStatusText status={p.status} />
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {p.supplier || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {tableTab === 'stock' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 z-10">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຊື່ອະໄຫຼ່', 'Item Name')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ໝວດໝູ່', 'Category')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">{t('ຈຳນວນທັງໝົດ', 'Total')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">{t('ເບີກໃຊ້ແລ້ວ', 'Used')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-right">{t('ຍັງເຫຼືອ', 'Remaining')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ຫົວໜ່ວຍ', 'Unit')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ໝາຍເຫດ', 'Notes')}</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">{t('ອັບເດດຫຼ້າສຸດ', 'Updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      {t('ບໍ່ພົບລາຍການສະຕອກອະໄຫຼ່', 'No stock items found')}
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s) => {
                    const used = Math.max(0, s.totalQuantity - s.remainingQuantity);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {tv(s.name)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {tv(s.category)}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-800">
                          {s.totalQuantity}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-500">
                          {used}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right font-semibold text-emerald-700">
                          {s.remainingQuantity}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {tv(s.unit)}
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[220px] truncate">
                          {s.notes || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {formatDate(s.updatedAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Confirmation Dialog: External File Upload */}
      {pendingFileUpload && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {t('ຢືນຢັນການອັບໂຫຼດໄຟລ໌ເຂົ້າສູ່ລະບົບ?', 'Confirm File Upload?')}
              </h3>
              <button
                type="button"
                onClick={() => setPendingFileUpload(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                {t('ອ່ານຂໍ້ມູນຈາກໄຟລ໌', 'Parsed data from')}{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {pendingFileUpload.fileName}
                </span>{' '}
                ({pendingFileUpload.sourceType.toUpperCase()}) {t('ສຳເລັດ:', 'successfully:')}
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] space-y-1">
                <div>{t(`· ອຸປະກອນ: ${pendingFileUpload.summary.computersCount} ລາຍການ`, `· Equipment: ${pendingFileUpload.summary.computersCount} items`)}</div>
                <div>{t(`· ປະຫວັດແຈ້ງສ້ອມ: ${pendingFileUpload.summary.repairsCount} ລາຍການ`, `· Repair Logs: ${pendingFileUpload.summary.repairsCount} records`)}</div>
                <div>{t(`· ອະໄຫຼ່ທີ່ປ່ຽນ: ${pendingFileUpload.summary.partsCount} ລາຍການ`, `· Parts: ${pendingFileUpload.summary.partsCount} items`)}</div>
                <div>{t(`· ສະຕອກອະໄຫຼ່: ${pendingFileUpload.summary.stockCount} ລາຍການ`, `· Stock: ${pendingFileUpload.summary.stockCount} items`)}</div>
                {pendingFileUpload.summary.categoriesCount > 0 && (
                  <div>{t(`· ໝວດໝູ່ບັນຫາ: ${pendingFileUpload.summary.categoriesCount} ລາຍການ`, `· Categories: ${pendingFileUpload.summary.categoriesCount} items`)}</div>
                )}
                {pendingUploadYears.length > 0 && (
                  <div className="text-sky-800 pt-1 border-t border-slate-200 mt-1">
                    {t(`· ຊ່ວງປີໃນຂໍ້ມູນ: ${pendingUploadYears.join(', ')}`, `· Years in data: ${pendingUploadYears.join(', ')}`)}
                  </div>
                )}
              </div>
              <p className="text-slate-500">
                {t(
                  'ທ່ານຕ້ອງການຮວມເພີ່ມເຂົ້າກັບຂໍ້ມູນປັດຈຸບັນ ຫຼື ແທນທີ່ຕາຕະລາງທີ່ກ່ຽວຂ້ອງ?',
                  'Would you like to merge with existing data or replace the corresponding tables?'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingFileUpload(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                {t('ຍົກເລີກ', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmFileUploadApply('merge')}
                className="px-3.5 py-2 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg cursor-pointer"
              >
                {t('ຮວມເພີ່ມ (Merge)', 'Merge')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmFileUploadApply('replace')}
                className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                {t('ແທນທີ່ (Replace)', 'Replace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
