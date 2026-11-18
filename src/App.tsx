import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Cloud,
  CloudOff,
  FileSpreadsheet,
  FileText,
  Languages,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { ComputerFormModal } from './components/ComputerFormModal';
import { EquipmentView } from './components/EquipmentView';
import { FilesAndTablesView } from './components/FilesAndTablesView';
import { FloorPlanView } from './components/FloorPlanView';
import { OneClickReportModal } from './components/OneClickReportModal';
import { OverviewAnalyticsView } from './components/OverviewAnalyticsView';
import { PreventiveMaintenanceView } from './components/PreventiveMaintenanceView';
import { RepairFormModal } from './components/RepairFormModal';
import { RepairLogsView } from './components/RepairLogsView';
import { Sidebar } from './components/Sidebar';
import { StockPartsView } from './components/StockPartsView';
import { exportExcelWorkbook } from './utils/fileImportExport';
import {
  loadLedgerData,
  resetLedgerData,
  saveLedgerData,
  StoredLedgerData,
} from './data/initialData';
import { useLanguage } from './i18n/LanguageContext';
import {
  AppsScriptSheetMeta,
  isAppsScriptRuntime,
  linkSheetInAppsScript,
  loadFromAppsScript,
  parseRawStateToLedger,
  saveToAppsScript,
} from './services/appsScriptBridge';
import {
  ActiveTab,
  ComputerAsset,
  MapPosition,
  RepairRecord,
  RepairStatus,
  ReplacedPart,
  StockPartItem,
} from './types';
import { computeMachineAnalytics, getTodayISO } from './utils/analytics';

const THEME_STORAGE_KEY = 'repair_ledger_theme';
const LOGO_STORAGE_KEY = 'repair_com_custom_logo_v1';

export default function App() {
  const { lang, toggleLang, t, tv } = useLanguage();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOGO_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [data, setData] = useState<StoredLedgerData>(() => loadLedgerData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedComputerId, setSelectedComputerId] = useState<string | null>(
    () => loadLedgerData().computers[0]?.id || null
  );

  const [computerModal, setComputerModal] = useState<{
    open: boolean;
    editing: ComputerAsset | null;
  }>({ open: false, editing: null });

  const [repairModal, setRepairModal] = useState<{
    open: boolean;
    editing: RepairRecord | null;
    defaultComputerId?: string;
  }>({ open: false, editing: null });

  const [reportModal, setReportModal] = useState<{
    open: boolean;
    computerId: string | 'all';
  }>({ open: false, computerId: 'all' });

  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const excelMenuRef = useRef<HTMLDivElement | null>(null);

  const [deleteTargetComputer, setDeleteTargetComputer] = useState<ComputerAsset | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isGas = useMemo(() => isAppsScriptRuntime(), []);
  const [gasReady, setGasReady] = useState(false);
  const [gasStatus, setGasStatus] = useState<
    'idle' | 'loading' | 'saving' | 'synced' | 'error'
  >(isGas ? 'loading' : 'idle');
  const [gasError, setGasError] = useState<string | null>(null);
  const [gasSheetMeta, setGasSheetMeta] = useState<AppsScriptSheetMeta | null>(null);
  const [gasLastSavedAt, setGasLastSavedAt] = useState<string | null>(null);
  const hydratingGasRef = useRef(false);
  const gasSaveTimerRef = useRef<number | null>(null);
  const latestStateRef = useRef<{ data: StoredLedgerData; logoUrl: string | null }>({
    data,
    logoUrl,
  });

  useEffect(() => {
    latestStateRef.current = { data, logoUrl };
  }, [data, logoUrl]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage write errors
    }
  }, [darkMode]);

  useEffect(() => {
    saveLedgerData(data);
  }, [data]);

  useEffect(() => {
    if (!isGas) return;
    let cancelled = false;

    const initGas = async () => {
      setGasStatus('loading');
      setGasError(null);
      try {
        const raw = await loadFromAppsScript();
        if (cancelled) return;
        setGasSheetMeta({
          spreadsheetId: raw.spreadsheetId,
          spreadsheetName: raw.spreadsheetName,
          spreadsheetUrl: raw.spreadsheetUrl,
        });

        if (raw.hasSheetData) {
          hydratingGasRef.current = true;
          const hydrated = parseRawStateToLedger(raw, latestStateRef.current.data);
          setData(hydrated);
          setSelectedComputerId((prev) =>
            prev && hydrated.computers.some((c) => c.id === prev)
              ? prev
              : hydrated.computers[0]?.id || null
          );
          if (raw.customLogo) {
            setLogoUrl(raw.customLogo);
          }
          setGasLastSavedAt(new Date().toISOString());
          setGasStatus('synced');
        } else {
          const saved = await saveToAppsScript(
            latestStateRef.current.data,
            latestStateRef.current.logoUrl
          );
          if (cancelled) return;
          setGasSheetMeta({
            spreadsheetId: saved.spreadsheetId,
            spreadsheetName: saved.spreadsheetName,
            spreadsheetUrl: saved.spreadsheetUrl,
          });
          setGasLastSavedAt(saved.savedAt);
          setGasStatus('synced');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setGasStatus('error');
        setGasError(msg);
      } finally {
        if (!cancelled) {
          setGasReady(true);
        }
      }
    };

    initGas();
    return () => {
      cancelled = true;
    };
  }, [isGas]);

  useEffect(() => {
    if (!isGas || !gasReady) return;
    if (hydratingGasRef.current) {
      hydratingGasRef.current = false;
      return;
    }

    if (gasSaveTimerRef.current) {
      window.clearTimeout(gasSaveTimerRef.current);
    }

    setGasStatus('saving');
    setGasError(null);

    gasSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await saveToAppsScript(data, logoUrl);
        setGasSheetMeta({
          spreadsheetId: res.spreadsheetId,
          spreadsheetName: res.spreadsheetName,
          spreadsheetUrl: res.spreadsheetUrl,
        });
        setGasLastSavedAt(res.savedAt);
        setGasStatus('synced');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setGasStatus('error');
        setGasError(msg);
      }
    }, 700);

    return () => {
      if (gasSaveTimerRef.current) {
        window.clearTimeout(gasSaveTimerRef.current);
      }
    };
  }, [isGas, gasReady, data, logoUrl]);

  useEffect(() => {
    if (!excelMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(e.target as Node)) {
        setExcelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [excelMenuOpen]);

  const tabBreadcrumbs: Record<ActiveTab, string> = {
    overview: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ພາບລວມ & ແດດບອດສະຖິຕິລາຍເດືອນ',
      'Maintenance Center / Overview & Monthly Dashboard'
    ),
    stock: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ອະໄຫຼ່ທີ່ມີໃນສະຕອກ (ທັງໝົດ & ຍັງເຫຼືອ)',
      'Maintenance Center / Spare Parts Stock (Total & Remaining)'
    ),
    pm: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ສະຫຼຸບສະຖິຕິລາຍເຄື່ອງ ແລະ ແຜນ PM',
      'Maintenance Center / Machine Summary & PM Plan'
    ),
    floorplan: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ແຜນຜັງທີ່ຕັ້ງອຸປະກອນ (Map 701 B)',
      'Maintenance Center / Equipment Floor Plan (Map 701 B)'
    ),
    equipment: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ທະບຽນອຸປະກອນ ແລະ ສະເປັກເຄື່ອງ',
      'Maintenance Center / Equipment & Hardware Specs'
    ),
    repairs: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / ປະຫວັດການແຈ້ງສ້ອມ ແລະ ຜົນລັບ',
      'Maintenance Center / Repair History & Resolutions'
    ),
    files: t(
      'ສູນບັນທຶກສ້ອມບຳລຸງ / Excel (.xlsx / .xls), CSV & ຕາຕະລາງຂໍ້ມູນ',
      'Maintenance Center / Excel (.xlsx / .xls), CSV & Data Tables'
    ),
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const handleGasSyncNow = async () => {
    if (!isGas) return;
    if (gasSaveTimerRef.current) {
      window.clearTimeout(gasSaveTimerRef.current);
    }
    setGasStatus('saving');
    setGasError(null);
    try {
      const res = await saveToAppsScript(data, logoUrl);
      setGasSheetMeta({
        spreadsheetId: res.spreadsheetId,
        spreadsheetName: res.spreadsheetName,
        spreadsheetUrl: res.spreadsheetUrl,
      });
      setGasLastSavedAt(res.savedAt);
      setGasStatus('synced');
      showToast(
        t(
          'ບັນທຶກຂໍ້ມູນທັງໝົດລົງ Google Sheets ສຳເລັດແລ້ວ',
          'Synced all data to Google Sheets'
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGasStatus('error');
      setGasError(msg);
      showToast(t(`ຊິງຄ໌ບໍ່ສຳເລັດ: ${msg}`, `Sync failed: ${msg}`));
    }
  };

  const handleGasReloadFromSheet = async () => {
    if (!isGas) return;
    setGasStatus('loading');
    setGasError(null);
    try {
      const raw = await loadFromAppsScript();
      setGasSheetMeta({
        spreadsheetId: raw.spreadsheetId,
        spreadsheetName: raw.spreadsheetName,
        spreadsheetUrl: raw.spreadsheetUrl,
      });
      if (raw.hasSheetData) {
        hydratingGasRef.current = true;
        const hydrated = parseRawStateToLedger(raw, data);
        setData(hydrated);
        setSelectedComputerId((prev) =>
          prev && hydrated.computers.some((c) => c.id === prev)
            ? prev
            : hydrated.computers[0]?.id || null
        );
        if (raw.customLogo) {
          setLogoUrl(raw.customLogo);
        }
        showToast(
          t(
            'ໂຫຼດຂໍ້ມູນຫຼ້າສຸດຈາກ Google Sheets ສຳເລັດແລ້ວ',
            'Reloaded latest data from Google Sheets'
          )
        );
      } else {
        showToast(
          t(
            'Google Sheet ຍັງວ່າງຢູ່ — ກຳລັງໃຊ້ຂໍ້ມູນປັດຈຸບັນ',
            'Google Sheet is empty — keeping current data'
          )
        );
      }
      setGasLastSavedAt(new Date().toISOString());
      setGasStatus('synced');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGasStatus('error');
      setGasError(msg);
      showToast(t(`ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ: ${msg}`, `Reload failed: ${msg}`));
    }
  };

  const handleGasLinkSheet = async (urlOrId: string) => {
    if (!isGas) return;
    setGasStatus('loading');
    setGasError(null);
    try {
      const raw = await linkSheetInAppsScript(urlOrId);
      setGasSheetMeta({
        spreadsheetId: raw.spreadsheetId,
        spreadsheetName: raw.spreadsheetName,
        spreadsheetUrl: raw.spreadsheetUrl,
      });
      if (raw.hasSheetData) {
        hydratingGasRef.current = true;
        const hydrated = parseRawStateToLedger(raw, data);
        setData(hydrated);
        setSelectedComputerId((prev) =>
          prev && hydrated.computers.some((c) => c.id === prev)
            ? prev
            : hydrated.computers[0]?.id || null
        );
        if (raw.customLogo) {
          setLogoUrl(raw.customLogo);
        }
        setGasLastSavedAt(new Date().toISOString());
        setGasStatus('synced');
        showToast(
          t(
            `ເຊື່ອມຕໍ່ ແລະ ໂຫຼດຂໍ້ມູນຈາກ "${raw.spreadsheetName}" ແລ້ວ`,
            `Connected and loaded from "${raw.spreadsheetName}"`
          )
        );
      } else {
        const saved = await saveToAppsScript(data, logoUrl);
        setGasLastSavedAt(saved.savedAt);
        setGasStatus('synced');
        showToast(
          t(
            `ເຊື່ອມຕໍ່ "${raw.spreadsheetName}" ແລະ ບັນທຶກຂໍ້ມູນປັດຈຸບັນລົງແລ້ວ`,
            `Connected "${raw.spreadsheetName}" and initialized sheets`
          )
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGasStatus('error');
      setGasError(msg);
      showToast(t(`ເຊື່ອມຕໍ່ Sheet ບໍ່ສຳເລັດ: ${msg}`, `Link sheet failed: ${msg}`));
    }
  };

  const analytics = useMemo(
    () => computeMachineAnalytics(data.computers, data.repairs, data.parts),
    [data.computers, data.repairs, data.parts]
  );

  const sidebarCounts = useMemo(() => {
    const openRepairs = data.repairs.filter(
      (r) => !r.isPreventive && r.status !== 'ສ້ອມແປງສຳເລັດ'
    ).length;
    const urgentPm = analytics.filter((a) => a.pmPriority === 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ').length;
    const stockRemaining = data.stockParts.reduce(
      (sum, item) => sum + Math.max(0, item.remainingQuantity),
      0
    );
    return {
      machines: data.computers.length,
      openRepairs,
      urgentPm,
      stockRemaining,
    };
  }, [data.computers.length, data.repairs, data.stockParts, analytics]);

  const deriveMachineStatusFromRepairs = (
    computerId: string,
    repairsList: RepairRecord[],
    currentStatus: ComputerAsset['status']
  ): ComputerAsset['status'] => {
    if (currentStatus === 'ປົດລະວາງ') return 'ປົດລະວາງ';
    const open = repairsList.filter(
      (r) => r.computerId === computerId && !r.isPreventive && r.status !== 'ສ້ອມແປງສຳເລັດ'
    );
    if (open.some((r) => r.status === 'ລໍຖ້າອະໄຫຼ່')) return 'ລໍຖ້າອະໄຫຼ່';
    if (open.length > 0) return 'ກຳລັງສ້ອມແປງ';
    return 'ໃຊ້ງານປົກກະຕິ';
  };

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    setData((prev) => {
      if (prev.categories.includes(trimmed)) return prev;
      return {
        ...prev,
        categories: [...prev.categories, trimmed],
      };
    });
    showToast(t(`ເພີ່ມໝວດໝູ່ບັນຫາ "${trimmed}" ແລ້ວ`, `Added category "${trimmed}"`));
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== categoryToDelete),
    }));
    showToast(t(`ລົບໝວດໝູ່ບັນຫາ "${categoryToDelete}" ແລ້ວ`, `Deleted category "${categoryToDelete}"`));
  };

  const handleSaveComputer = (
    payload: Omit<ComputerAsset, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setData((prev) => ({
        ...prev,
        computers: prev.computers.map((c) =>
          c.id === existingId ? { ...payload, id: existingId } : c
        ),
      }));
      showToast(
        t(
          `ອັບເດດຂໍ້ມູນສະເປັກ ${payload.assetTag} ຮຽບຮ້ອຍແລ້ວ`,
          `Updated specs for ${payload.assetTag}`
        )
      );
    } else {
      const newId = `comp-${Date.now()}`;
      setData((prev) => ({
        ...prev,
        computers: [{ ...payload, id: newId }, ...prev.computers],
      }));
      setSelectedComputerId(newId);
      showToast(
        t(
          `ເພີ່ມອຸປະກອນ ${payload.assetTag} ເຂົ້າທະບຽນແລ້ວ`,
          `Added equipment ${payload.assetTag}`
        )
      );
    }
    setComputerModal({ open: false, editing: null });
  };

  const handleDeleteComputer = (computerId: string) => {
    const target = data.computers.find((c) => c.id === computerId);
    if (!target) return;

    const remainingComputers = data.computers.filter((c) => c.id !== computerId);
    setData((prev) => ({
      ...prev,
      computers: prev.computers.filter((c) => c.id !== computerId),
      repairs: prev.repairs.filter((r) => r.computerId !== computerId),
      parts: prev.parts.filter((p) => p.computerId !== computerId),
    }));

    if (selectedComputerId === computerId) {
      setSelectedComputerId(remainingComputers[0]?.id || null);
    }
    if (computerModal.open && computerModal.editing?.id === computerId) {
      setComputerModal({ open: false, editing: null });
    }
    setDeleteTargetComputer(null);
    showToast(
      t(
        `ລົບອຸປະກອນ "${target.name}" (${target.assetTag}) ຮຽບຮ້ອຍແລ້ວ`,
        `Deleted "${target.name}" (${target.assetTag})`
      )
    );
  };

  const handleSaveRepair = (
    payload: Omit<RepairRecord, 'id' | 'ticketCode'>,
    existingId?: string,
    newPart?: Omit<ReplacedPart, 'id' | 'repairId' | 'computerId'>
  ) => {
    if (existingId) {
      setData((prev) => {
        const nextRepairs = prev.repairs.map((r) =>
          r.id === existingId ? { ...r, ...payload } : r
        );
        const nextParts = newPart
          ? [
              {
                ...newPart,
                id: `part-${Date.now()}`,
                repairId: existingId,
                computerId: payload.computerId,
              },
              ...prev.parts,
            ]
          : prev.parts;
        const nextComputers = prev.computers.map((c) =>
          c.id === payload.computerId
            ? {
                ...c,
                status: deriveMachineStatusFromRepairs(c.id, nextRepairs, c.status),
              }
            : c
        );
        const nextCategories = prev.categories.includes(payload.category)
          ? prev.categories
          : [...prev.categories, payload.category];
        return {
          ...prev,
          computers: nextComputers,
          repairs: nextRepairs,
          parts: nextParts,
          categories: nextCategories,
        };
      });
      showToast(t('ອັບເດດຂໍ້ມູນວຽກສ້ອມຮຽບຮ້ອຍແລ້ວ', 'Updated repair ticket'));
      setRepairModal({ open: false, editing: null });
      return;
    } else {
      const todayYM = payload.reportedDate.slice(2, 7).replace('-', '');
      const seq = String(data.repairs.length + 1).padStart(2, '0');
      const ticketCode = `REP-${todayYM}-${seq}`;
      const newRepairId = `rep-${Date.now()}`;
      const created: RepairRecord = {
        ...payload,
        id: newRepairId,
        ticketCode,
      };

      setData((prev) => {
        const nextRepairs = [created, ...prev.repairs];
        const nextParts = newPart
          ? [
              {
                ...newPart,
                id: `part-${Date.now() + 1}`,
                repairId: newRepairId,
                computerId: payload.computerId,
              },
              ...prev.parts,
            ]
          : prev.parts;
        const nextComputers = prev.computers.map((c) =>
          c.id === payload.computerId
            ? {
                ...c,
                status: deriveMachineStatusFromRepairs(c.id, nextRepairs, c.status),
              }
            : c
        );
        const nextCategories = prev.categories.includes(payload.category)
          ? prev.categories
          : [...prev.categories, payload.category];
        return {
          ...prev,
          computers: nextComputers,
          repairs: nextRepairs,
          parts: nextParts,
          categories: nextCategories,
        };
      });
      showToast(
        t(
          `ບັນທຶກໃບງານສ້ອມ ${ticketCode} ຮຽບຮ້ອຍແລ້ວ`,
          `Created repair ticket ${ticketCode}`
        )
      );
      setRepairModal({ open: false, editing: null });
      return;
    }
  };

  const handleUpdateRepairStatus = (repairId: string, nextStatus: RepairStatus) => {
    setData((prev) => {
      const target = prev.repairs.find((r) => r.id === repairId);
      if (!target) return prev;
      const nextRepairs = prev.repairs.map((r) =>
        r.id === repairId
          ? {
              ...r,
              status: nextStatus,
            }
          : r
      );
      const nextComputers = prev.computers.map((c) =>
        c.id === target.computerId
          ? {
              ...c,
              status: deriveMachineStatusFromRepairs(c.id, nextRepairs, c.status),
            }
          : c
      );
      return { ...prev, repairs: nextRepairs, computers: nextComputers };
    });
    showToast(
      t(
        `ອັບເດດສະຖານະວຽກສ້ອມເປັນ "${nextStatus}"`,
        `Updated repair status to "${tv(nextStatus)}"`
      )
    );
  };

  const handleCompletePm = (computer: ComputerAsset, notes: string) => {
    const today = getTodayISO();
    const pmTicketCode = `PM-${today.slice(2, 7).replace('-', '')}-${String(
      data.repairs.length + 1
    ).padStart(2, '0')}`;
    const pmRecord: RepairRecord = {
      id: `rep-pm-${Date.now()}`,
      ticketCode: pmTicketCode,
      computerId: computer.id,
      reportedDate: today,
      reporter: 'ແຜນບຳລຸງຮັກສາເຊີງປ້ອງກັນ',
      technician: 'ທີມຊ່າງ IT',
      category: 'ຄວາມຮ້ອນ ແລະ ລະບົບລະບາຍຄວາມຮ້ອນ',
      status: 'ສ້ອມແປງສຳເລັດ',
      symptom: 'ກວດເຊັກບຳລຸງຮັກສາເຊີງປ້ອງກັນຕາມຮອບ (Preventive Maintenance)',
      rootCause: 'ບຳລຸງຮັກສາຕາມແຜນປ້ອງກັນຄວາມເສຍຫາຍລ່ວງໜ້າ',
      resolution: notes,
      isPreventive: true,
    };

    setData((prev) => ({
      ...prev,
      computers: prev.computers.map((c) =>
        c.id === computer.id ? { ...c, lastPmDate: today } : c
      ),
      repairs: [pmRecord, ...prev.repairs],
    }));
    showToast(
      t(
        `ບັນທຶກການເຮັດ PM ສຳລັບ ${computer.assetTag} ແລະ ອັບເດດຮອບຖັດໄປແລ້ວ`,
        `Recorded PM for ${computer.assetTag} and scheduled next cycle`
      )
    );
  };

  const handleInspectMachine = (computerId: string) => {
    setSelectedComputerId(computerId);
    setActiveTab('equipment');
  };

  const handleShowOnMap = (computerId?: string) => {
    if (computerId) setSelectedComputerId(computerId);
    setActiveTab('floorplan');
  };

  const handleUpdateComputerPosition = (computerId: string, position: MapPosition) => {
    setData((prev) => ({
      ...prev,
      computers: prev.computers.map((c) =>
        c.id === computerId ? { ...c, mapPosition: position } : c
      ),
    }));
    showToast(
      t(
        'ອັບເດດຕຳແໜ່ງຄອມພິວເຕີເທິງແຜນຜັງແລ້ວ',
        'Updated computer position on floor plan'
      )
    );
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pc-repair-ledger-backup-${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(t('ສຳຮອງຂໍ້ມູນທັງໝົດເປັນໄຟລ໌ JSON ຮຽບຮ້ອຍແລ້ວ', 'Exported full JSON backup'));
  };

  const handleRestoreMap701b = () => {
    const fresh = resetLedgerData();
    setData(fresh);
    setSelectedComputerId(fresh.computers[0]?.id || null);
    showToast(
      t(
        `ໂຫຼດຈຸດຕັ້ງຜັງ Map 701 B (${fresh.computers.length} ຈຸດ) ຮຽບຮ້ອຍແລ້ວ`,
        `Loaded Map 701 B layout (${fresh.computers.length} stations)`
      )
    );
  };

  const handleApplyImportedData = (nextData: StoredLedgerData, message: string) => {
    setData(nextData);
    setSelectedComputerId((prev) => {
      if (prev && nextData.computers.some((c) => c.id === prev)) return prev;
      return nextData.computers[0]?.id || null;
    });
    showToast(message);
  };

  const handleChangeLogo = (dataUrl: string) => {
    setLogoUrl(dataUrl);
    try {
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    } catch {
      // Ignore storage write errors
    }
    showToast(t('ປ່ຽນຮູບໂລໂກ້ສຳເລັດແລ້ວ', 'Logo updated'));
  };

  const handleResetLogo = () => {
    setLogoUrl(null);
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    showToast(t('ກັບຄືນໃຊ້ໂລໂກ້ເດີມແລ້ວ', 'Restored default logo'));
  };

  const handleSaveStockPart = (
    payload: Omit<StockPartItem, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    const today = getTodayISO();
    const safeTotal = Math.max(0, Math.round(payload.totalQuantity));
    const safeRemaining = Math.max(0, Math.min(safeTotal, Math.round(payload.remainingQuantity)));

    if (existingId) {
      setData((prev) => ({
        ...prev,
        stockParts: prev.stockParts.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...payload,
                totalQuantity: safeTotal,
                remainingQuantity: safeRemaining,
                updatedAt: today,
              }
            : item
        ),
      }));
      showToast(t(`ອັບເດດສະຕອກ "${payload.name}" ແລ້ວ`, `Updated stock "${payload.name}"`));
    } else {
      const created: StockPartItem = {
        ...payload,
        id: `stk-${Date.now()}`,
        totalQuantity: safeTotal,
        remainingQuantity: safeRemaining,
        updatedAt: today,
      };
      setData((prev) => ({
        ...prev,
        stockParts: [...prev.stockParts, created],
      }));
      showToast(t(`ເພີ່ມ "${payload.name}" ເຂົ້າສະຕອກແລ້ວ`, `Added "${payload.name}" to stock`));
    }
  };

  const handleAdjustStockPart = (id: string, action: 'use' | 'restock' | 'return') => {
    const target = data.stockParts.find((item) => item.id === id);
    if (!target) return;
    const today = getTodayISO();

    if (action === 'use' && target.remainingQuantity <= 0) {
      showToast(t(`"${target.name}" ໝົດສະຕອກແລ້ວ`, `"${target.name}" is out of stock`));
      return;
    }
    if (action === 'return' && target.remainingQuantity >= target.totalQuantity) {
      showToast(
        t(`"${target.name}" ຍັງເຫຼືອເຕັມຈຳນວນທັງໝົດແລ້ວ`, `"${target.name}" is already at full stock`)
      );
      return;
    }

    setData((prev) => ({
      ...prev,
      stockParts: prev.stockParts.map((item) => {
        if (item.id !== id) return item;
        if (action === 'use') {
          return {
            ...item,
            remainingQuantity: Math.max(0, item.remainingQuantity - 1),
            updatedAt: today,
          };
        }
        if (action === 'restock') {
          return {
            ...item,
            totalQuantity: item.totalQuantity + 1,
            remainingQuantity: item.remainingQuantity + 1,
            updatedAt: today,
          };
        }
        return {
          ...item,
          remainingQuantity: Math.min(item.totalQuantity, item.remainingQuantity + 1),
          updatedAt: today,
        };
      }),
    }));

    if (action === 'use') {
      showToast(
        t(
          `ເບີກໃຊ້ "${target.name}" -1 (${Math.max(0, target.remainingQuantity - 1)} ຍັງເຫຼືອ)`,
          `Issued "${target.name}" -1 (${Math.max(0, target.remainingQuantity - 1)} left)`
        )
      );
    } else if (action === 'restock') {
      showToast(t(`ເຕີມສະຕອກ "${target.name}" +1`, `Restocked "${target.name}" +1`));
    } else {
      showToast(t(`ຄືນສະຕອກ "${target.name}" +1`, `Returned "${target.name}" +1`));
    }
  };

  const handleDeleteStockPart = (id: string) => {
    const target = data.stockParts.find((item) => item.id === id);
    if (!target) return;
    setData((prev) => ({
      ...prev,
      stockParts: prev.stockParts.filter((item) => item.id !== id),
    }));
    showToast(t(`ລົບ "${target.name}" ອອກຈາກສະຕອກແລ້ວ`, `Removed "${target.name}" from stock`));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block no-print">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          counts={sidebarCounts}
          onExportJson={handleExportJson}
          logoUrl={logoUrl}
          onChangeLogo={handleChangeLogo}
          onResetLogo={handleResetLogo}
          onNotify={showToast}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              counts={sidebarCounts}
              onExportJson={() => {
                handleExportJson();
                setMobileMenuOpen(false);
              }}
              logoUrl={logoUrl}
              onChangeLogo={handleChangeLogo}
              onResetLogo={handleResetLogo}
              onNotify={showToast}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label={t('ເປີດເມນູນຳທາງ', 'Open navigation menu')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm font-medium text-slate-600 truncate">
              {tabBreadcrumbs[activeTab]}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={t('ປ່ຽນພາສາ (ລາວ / English)', 'Switch Language (Lao / English)')}
              aria-label={t('ປ່ຽນພາສາ', 'Switch language')}
            >
              <Languages className="w-3.5 h-3.5 text-sky-700" />
              <span>{lang === 'lo' ? 'ລາວ / EN' : 'EN / ລາວ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={darkMode ? t('ປ່ຽນເປັນໂໝດແຈ້ງ', 'Switch to Light Mode') : t('ປ່ຽນເປັນໂໝດມືດ', 'Switch to Dark Mode')}
              aria-label={darkMode ? t('ປ່ຽນເປັນໂໝດແຈ້ງ', 'Switch to Light Mode') : t('ປ່ຽນເປັນໂໝດມືດ', 'Switch to Dark Mode')}
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">{t('ໂໝດແຈ້ງ', 'Light')}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">{t('ໂໝດມືດ', 'Dark')}</span>
                </>
              )}
            </button>

            {isGas && (
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  gasStatus === 'error'
                    ? 'text-rose-800 bg-rose-50 border-rose-200 hover:bg-rose-100'
                    : gasStatus === 'saving' || gasStatus === 'loading'
                    ? 'text-sky-800 bg-sky-50 border-sky-200 hover:bg-sky-100'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={t('ສະຖານະການເຊື່ອມຕໍ່ Google Sheets', 'Google Sheets sync status')}
              >
                {gasStatus === 'saving' || gasStatus === 'loading' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : gasStatus === 'error' ? (
                  <CloudOff className="w-3.5 h-3.5" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {gasStatus === 'loading'
                    ? t('ກຳລັງໂຫຼດ Sheet...', 'Loading Sheet...')
                    : gasStatus === 'saving'
                    ? t('ກຳລັງບັນທຶກ Sheet...', 'Saving Sheet...')
                    : gasStatus === 'error'
                    ? t('Sheet ຂັດຂ້ອງ', 'Sheet Error')
                    : t('Google Sheets ຊິງຄ໌ແລ້ວ', 'Sheets Synced')}
                </span>
              </button>
            )}

            <div className="relative" ref={excelMenuRef}>
              <button
                type="button"
                onClick={() => setExcelMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={t('ສົ່ງອອກ / ນຳເຂົ້າ Excel ເກົ່າ ແລະ ໃໝ່', 'Export / Import Legacy & Modern Excel')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Excel</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {excelMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      exportExcelWorkbook(data, 'xlsx');
                      setExcelMenuOpen(false);
                      showToast(t('ສົ່ງອອກໄຟລ໌ Excel ໃໝ່ (.xlsx) ແລ້ວ', 'Exported modern Excel (.xlsx)'));
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-slate-900">
                      {t('ບັນທຶກ Excel ໃໝ່ (.xlsx)', 'Save Modern Excel (.xlsx)')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">2007-365</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportExcelWorkbook(data, 'xls');
                      setExcelMenuOpen(false);
                      showToast(t('ສົ່ງອອກໄຟລ໌ Excel ເກົ່າ (.xls) ແລ້ວ', 'Exported legacy Excel (.xls)'));
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-medium text-slate-900">
                      {t('ບັນທຶກ Excel ເກົ່າ (.xls)', 'Save Legacy Excel (.xls)')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">97-2003</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('files');
                      setExcelMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-sky-700 font-medium cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isGas
                        ? t('ຈັດການ Google Sheets & Excel', 'Manage Google Sheets & Excel')
                        : t('ນຳເຂົ້າ / ໄຟລ໌ Apps Script & Excel', 'Import / Apps Script & Excel')}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setReportModal({ open: true, computerId: 'all' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {t('ອອກລາຍງານສະຫຼຸບວຽກສ້ອມ Computer', 'Computer Repair Summary Report')}
              </span>
              <span className="md:hidden">{t('ລາຍງານ', 'Report')}</span>
            </button>
            <button
              type="button"
              onClick={() => setRepairModal({ open: true, editing: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ແຈ້ງສ້ອມໃໝ່', 'New Repair')}</span>
            </button>
          </div>
        </header>

        <main className="no-print flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewAnalyticsView
              analytics={analytics}
              categories={data.categories}
              repairs={data.repairs}
              parts={data.parts}
              stockParts={data.stockParts}
              onInspectMachine={handleInspectMachine}
              onOpenNewRepair={(id) =>
                setRepairModal({ open: true, editing: null, defaultComputerId: id })
              }
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onOpenStockTab={() => setActiveTab('stock')}
              onAdjustStockPart={handleAdjustStockPart}
            />
          )}

          {activeTab === 'stock' && (
            <StockPartsView
              stockParts={data.stockParts}
              onSaveStockPart={handleSaveStockPart}
              onAdjustStockPart={handleAdjustStockPart}
              onDeleteStockPart={handleDeleteStockPart}
              onNotify={showToast}
            />
          )}

          {activeTab === 'pm' && (
            <PreventiveMaintenanceView
              analytics={analytics}
              onInspectMachine={handleInspectMachine}
              onShowOnMap={handleShowOnMap}
              onOpenReportForMachine={(id) =>
                setReportModal({ open: true, computerId: id })
              }
              onCompletePm={handleCompletePm}
              onOpenNewRepair={(id) =>
                setRepairModal({ open: true, editing: null, defaultComputerId: id })
              }
            />
          )}

          {activeTab === 'floorplan' && (
            <FloorPlanView
              computers={data.computers}
              analytics={analytics}
              repairs={data.repairs}
              parts={data.parts}
              selectedComputerId={selectedComputerId}
              onSelectComputer={setSelectedComputerId}
              onUpdatePosition={handleUpdateComputerPosition}
              onAddComputerOnMap={() => setComputerModal({ open: true, editing: null })}
              onEditComputer={(comp) => setComputerModal({ open: true, editing: comp })}
              onDeleteComputer={(comp) => setDeleteTargetComputer(comp)}
              onAddRepairForMachine={(id) =>
                setRepairModal({ open: true, editing: null, defaultComputerId: id })
              }
              onOpenReportForMachine={(id) =>
                setReportModal({ open: true, computerId: id })
              }
              onInspectInEquipment={handleInspectMachine}
              onRestoreMap701b={handleRestoreMap701b}
            />
          )}

          {activeTab === 'equipment' && (
            <EquipmentView
              computers={data.computers}
              analytics={analytics}
              repairs={data.repairs}
              parts={data.parts}
              selectedComputerId={selectedComputerId}
              onSelectComputer={setSelectedComputerId}
              onAddComputer={() => setComputerModal({ open: true, editing: null })}
              onEditComputer={(comp) => setComputerModal({ open: true, editing: comp })}
              onDeleteComputer={(comp) => setDeleteTargetComputer(comp)}
              onAddRepairForMachine={(id) =>
                setRepairModal({ open: true, editing: null, defaultComputerId: id })
              }
              onOpenReportForMachine={(id) =>
                setReportModal({ open: true, computerId: id })
              }
              onShowOnMap={handleShowOnMap}
              onRestoreMap701b={handleRestoreMap701b}
            />
          )}

          {activeTab === 'repairs' && (
            <RepairLogsView
              computers={data.computers}
              categories={data.categories}
              repairs={data.repairs}
              parts={data.parts}
              onOpenNewRepair={() => setRepairModal({ open: true, editing: null })}
              onEditRepair={(rep) => setRepairModal({ open: true, editing: rep })}
              onUpdateRepairStatus={handleUpdateRepairStatus}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onInspectMachine={handleInspectMachine}
            />
          )}

          {activeTab === 'files' && (
            <FilesAndTablesView
              data={data}
              onApplyImportedData={handleApplyImportedData}
              onExportJson={handleExportJson}
              onNotify={showToast}
              onInspectMachine={handleInspectMachine}
              isGas={isGas}
              gasStatus={gasStatus}
              gasError={gasError}
              gasSheetMeta={gasSheetMeta}
              gasLastSavedAt={gasLastSavedAt}
              onGasSyncNow={handleGasSyncNow}
              onGasReloadFromSheet={handleGasReloadFromSheet}
              onGasLinkSheet={handleGasLinkSheet}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {computerModal.open && (
        <ComputerFormModal
          initialComputer={computerModal.editing}
          onClose={() => setComputerModal({ open: false, editing: null })}
          onSave={handleSaveComputer}
          onDelete={(comp) => setDeleteTargetComputer(comp)}
        />
      )}

      {repairModal.open && (
        <RepairFormModal
          computers={data.computers}
          categories={data.categories}
          initialRepair={repairModal.editing}
          defaultComputerId={repairModal.defaultComputerId}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setRepairModal({ open: false, editing: null })}
          onSave={handleSaveRepair}
        />
      )}

      {reportModal.open && (
        <OneClickReportModal
          computers={data.computers}
          analytics={analytics}
          repairs={data.repairs}
          parts={data.parts}
          initialComputerId={reportModal.computerId}
          onClose={() => setReportModal({ open: false, computerId: 'all' })}
        />
      )}

      {/* Confirm Delete Single Equipment Dialog */}
      {deleteTargetComputer && (
        <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {t('ຢືນຢັນການລົບອຸປະກອນ?', 'Confirm Delete Equipment?')}
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTargetComputer(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                {t('ທ່ານຕ້ອງການລົບອຸປະກອນ', 'Are you sure you want to delete')}{' '}
                <span className="font-semibold text-slate-900">{deleteTargetComputer.name}</span>{' '}
                <span className="font-mono text-slate-700">
                  ({deleteTargetComputer.assetTag})
                </span>{' '}
                {t('ອອກຈາກລະບົບ ແລະ ແຜນຜັງແທ້ບໍ?', 'from the system and floor plan?')}
              </p>
              {(() => {
                const linkedRepairs = data.repairs.filter(
                  (r) => r.computerId === deleteTargetComputer.id
                ).length;
                const linkedParts = data.parts.filter(
                  (p) => p.computerId === deleteTargetComputer.id
                ).length;
                if (linkedRepairs === 0 && linkedParts === 0) return null;
                return (
                  <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 font-medium">
                    {t(
                      `ຄຳເຕືອນ: ປະຫວັດແຈ້ງສ້ອມ ${linkedRepairs} ລາຍການ ແລະ ອະໄຫຼ່ ${linkedParts} ລາຍການ ທີ່ຜູກກັບເຄື່ອງນີ້ຈະຖືກລົບອອກພ້ອມກັນ`,
                      `Warning: ${linkedRepairs} repair record(s) and ${linkedParts} part(s) linked to this device will also be deleted.`
                    )}
                  </p>
                );
              })()}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetComputer(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                {t('ຍົກເລີກ', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteComputer(deleteTargetComputer.id)}
                className="px-3.5 py-2 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                {t('ຢືນຢັນລົບອຸປະກອນ', 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-800"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
