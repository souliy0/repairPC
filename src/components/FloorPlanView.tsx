import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  FileText,
  MapPin,
  Monitor,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Tag,
  Trash2,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FLOOR_ZONES, ZoneVisualConfig } from '../data/map701bData';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AssetStatus,
  ComputerAsset,
  MachineAnalytics,
  MapPosition,
  RepairRecord,
  ReplacedPart,
} from '../types';
import { getTodayISO } from '../utils/analytics';
import {
  AssetStatusBadge,
  PartStatusText,
  PMPriorityText,
  RepairStatusText,
} from './StatusText';

interface FloorPlanViewProps {
  computers: ComputerAsset[];
  analytics: MachineAnalytics[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  selectedComputerId: string | null;
  onSelectComputer: (id: string | null) => void;
  onUpdatePosition: (computerId: string, position: MapPosition) => void;
  onAddComputerOnMap: () => void;
  onEditComputer: (computer: ComputerAsset) => void;
  onDeleteComputer: (computer: ComputerAsset) => void;
  onAddRepairForMachine: (computerId: string) => void;
  onOpenReportForMachine: (computerId: string) => void;
  onInspectInEquipment: (computerId: string) => void;
  onRestoreMap701b?: () => void;
}

const CANVAS_W = 1400;
const CANVAS_H = 820;

const ZONE_MAP = new Map<string, ZoneVisualConfig>(
  FLOOR_ZONES.map((z) => [z.id, z])
);

const DEFAULT_ZONE_STYLE: ZoneVisualConfig = {
  id: 'ອື່ນໆ',
  label: 'ອື່ນໆ',
  departmentName: 'ອື່ນໆ',
  bgClass: 'bg-slate-50 hover:bg-slate-100',
  borderClass: 'border-slate-400',
  textClass: 'text-slate-900',
  legendBg: 'bg-slate-600 border-slate-800',
  legendText: 'text-white',
  dotColor: '#64748b',
};

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  computers,
  analytics,
  repairs,
  parts,
  selectedComputerId,
  onSelectComputer,
  onUpdatePosition,
  onAddComputerOnMap,
  onEditComputer,
  onDeleteComputer,
  onAddRepairForMachine,
  onOpenReportForMachine,
  onInspectInEquipment,
  onRestoreMap701b,
}) => {
  const { t, tv, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [onlyWithRepairs, setOnlyWithRepairs] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [repositionMode, setRepositionMode] = useState(false);
  const [movingComputerId, setMovingComputerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    w: number;
    h: number;
    rotation?: number;
    hasMoved: boolean;
    latestX: number;
    latestY: number;
  } | null>(null);
  const justDraggedRef = useRef(false);

  const analyticsMap = useMemo(
    () => new Map(analytics.map((a) => [a.computer.id, a])),
    [analytics]
  );

  const matchingIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const set = new Set<string>();
    for (const c of computers) {
      if (zoneFilter !== 'all' && (c.floorZone || 'ອື່ນໆ') !== zoneFilter) continue;
      if (statusFilter !== 'all' && c.status !== statusFilter) continue;
      const stat = analyticsMap.get(c.id);
      if (onlyWithRepairs && (stat?.totalRepairs || 0) === 0 && c.status === 'ໃຊ້ງານປົກກະຕິ') {
        continue;
      }
      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          c.assetTag.toLowerCase().includes(q) ||
          c.assignedUser.toLowerCase().includes(q) ||
          c.specs.cpu.toLowerCase().includes(q);
        if (!hit) continue;
      }
      set.add(c.id);
    }
    return set;
  }, [computers, zoneFilter, statusFilter, onlyWithRepairs, searchQuery, analyticsMap]);

  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    zoneFilter !== 'all' ||
    statusFilter !== 'all' ||
    onlyWithRepairs;

  const mappedComputers = useMemo(
    () => computers.filter((c) => !!c.mapPosition),
    [computers]
  );

  const unmappedComputers = useMemo(
    () => computers.filter((c) => !c.mapPosition),
    [computers]
  );

  const activeComputer = useMemo(
    () => computers.find((c) => c.id === selectedComputerId) || null,
    [computers, selectedComputerId]
  );

  const activeAnalytics = activeComputer
    ? analyticsMap.get(activeComputer.id)
    : undefined;

  const activeRepairs = useMemo(() => {
    if (!activeComputer) return [];
    return repairs
      .filter((r) => r.computerId === activeComputer.id)
      .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate));
  }, [activeComputer, repairs]);

  const activeParts = useMemo(() => {
    if (!activeComputer) return [];
    return parts
      .filter((p) => p.computerId === activeComputer.id)
      .sort((a, b) => b.replacedDate.localeCompare(a.replacedDate));
  }, [activeComputer, parts]);

  const mapStats = useMemo(() => {
    const underRepair = computers.filter(
      (c) => c.status === 'ກຳລັງສ້ອມແປງ' || c.status === 'ລໍຖ້າອະໄຫຼ່'
    ).length;
    const upsCount = computers.filter((c) => c.hasUps).length;
    return {
      total: computers.length,
      matched: matchingIds.size,
      underRepair,
      upsCount,
    };
  }, [computers, matchingIds]);

  useEffect(() => {
    if (!repositionMode) {
      dragSessionRef.current = null;
      setDragPreview(null);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      const canvas = canvasRef.current;
      if (!session || !canvas) return;

      const dxPx = e.clientX - session.startClientX;
      const dyPx = e.clientY - session.startClientY;
      if (!session.hasMoved && Math.hypot(dxPx, dyPx) < 4) {
        return;
      }
      session.hasMoved = true;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxPct = (dxPx / rect.width) * 100;
      const dyPct = (dyPx / rect.height) * 100;

      const nextX = Math.max(
        0.5,
        Math.min(99 - session.w, Number((session.origX + dxPct).toFixed(2)))
      );
      const nextY = Math.max(
        0.5,
        Math.min(98.5 - session.h, Number((session.origY + dyPct).toFixed(2)))
      );

      session.latestX = nextX;
      session.latestY = nextY;
      setDragPreview({ id: session.id, x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      const session = dragSessionRef.current;
      if (!session) return;
      dragSessionRef.current = null;
      setDragPreview(null);

      if (session.hasMoved) {
        justDraggedRef.current = true;
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 60);
        onUpdatePosition(session.id, {
          x: session.latestX,
          y: session.latestY,
          w: session.w,
          h: session.h,
          rotation: session.rotation,
        });
        setMovingComputerId(session.id);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [repositionMode, onUpdatePosition]);

  const handleSeatPointerDown = (comp: ComputerAsset, e: React.PointerEvent) => {
    if (!repositionMode || !comp.mapPosition) return;
    e.preventDefault();
    e.stopPropagation();
    dragSessionRef.current = {
      id: comp.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: comp.mapPosition.x,
      origY: comp.mapPosition.y,
      w: comp.mapPosition.w ?? 3.65,
      h: comp.mapPosition.h ?? 5.45,
      rotation: comp.mapPosition.rotation,
      hasMoved: false,
      latestX: comp.mapPosition.x,
      latestY: comp.mapPosition.y,
    };
    setMovingComputerId(comp.id);
  };

  const handleSeatClick = (comp: ComputerAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (justDraggedRef.current) return;
    if (repositionMode) {
      setMovingComputerId(comp.id);
      return;
    }
    onSelectComputer(comp.id);
    setDrawerOpen(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDraggedRef.current) return;
    if (!repositionMode || !movingComputerId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    const targetComp = computers.find((c) => c.id === movingComputerId);
    const w = targetComp?.mapPosition?.w ?? 3.65;
    const h = targetComp?.mapPosition?.h ?? 5.45;
    const clampedX = Math.max(0.5, Math.min(99 - w, Number((clickX - w / 2).toFixed(2))));
    const clampedY = Math.max(0.5, Math.min(98.5 - h, Number((clickY - h / 2).toFixed(2))));

    onUpdatePosition(movingComputerId, {
      x: clampedX,
      y: clampedY,
      w,
      h,
      rotation: targetComp?.mapPosition?.rotation,
    });
  };

  const handleRotateMovingComputer = (nextRotation: number) => {
    if (!movingComputerId) return;
    const comp = computers.find((c) => c.id === movingComputerId);
    if (!comp?.mapPosition) return;
    const normalized = ((nextRotation + 180) % 360 + 360) % 360 - 180;
    onUpdatePosition(movingComputerId, {
      ...comp.mapPosition,
      rotation: normalized === 0 ? undefined : normalized,
    });
  };

  const handleExportFloorPlanSvg = () => {
    const esc = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const zoneFillHex: Record<string, { fill: string; stroke: string; text: string }> = {
      Tplus: { fill: '#fef3c7', stroke: '#d97706', text: '#78350f' },
      CCare: { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
      CCT: { fill: '#ffedd5', stroke: '#ea580c', text: '#7c2d12' },
      Tele: { fill: '#d1fae5', stroke: '#059669', text: '#064e3b' },
      IVR: { fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95' },
      DC: { fill: '#e0f2fe', stroke: '#0284c7', text: '#0c4a6e' },
    };

    const seatsSvg = mappedComputers
      .map((c) => {
        const pos = c.mapPosition!;
        const x = ((pos.x / 100) * CANVAS_W).toFixed(1);
        const y = ((pos.y / 100) * CANVAS_H).toFixed(1);
        const w = (((pos.w ?? 3.65) / 100) * CANVAS_W).toFixed(1);
        const h = (((pos.h ?? 5.45) / 100) * CANVAS_H).toFixed(1);
        const rot = pos.rotation || 0;
        const palette = zoneFillHex[c.floorZone || ''] || {
          fill: '#f8fafc',
          stroke: '#64748b',
          text: '#0f172a',
        };
        const hasIssue = c.status === 'ກຳລັງສ້ອມແປງ' || c.status === 'ລໍຖ້າອະໄຫຼ່';
        const strokeColor = hasIssue ? '#e11d48' : palette.stroke;
        const strokeWidth = hasIssue ? '2.2' : '1.2';
        const transformAttr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : '';
        const cx = (Number(x) + Number(w) / 2).toFixed(1);
        const cy1 = (Number(y) + Number(h) * 0.44).toFixed(1);
        const cy2 = (Number(y) + Number(h) * 0.72).toFixed(1);
        return `<g${transformAttr}>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${palette.fill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
  <text x="${cx}" y="${cy1}" font-family="sans-serif" font-size="9" font-weight="700" fill="${palette.text}" text-anchor="middle">${esc(c.name)}</text>
  <text x="${cx}" y="${cy2}" font-family="monospace" font-size="7.5" fill="${palette.text}" text-anchor="middle">${esc(c.assetTag)}</text>
</g>`;
      })
      .join('\n');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="#ffffff" stroke="#1e293b" stroke-width="4" />
  <rect x="${(0.326 * CANVAS_W).toFixed(1)}" y="${(0.005 * CANVAS_H).toFixed(1)}" width="${(0.306 * CANVAS_W).toFixed(1)}" height="${(0.205 * CANVAS_H).toFixed(1)}" fill="#cbd5e1" stroke="#334155" stroke-width="2" />
  <text x="${(0.34 * CANVAS_W).toFixed(1)}" y="${(0.055 * CANVAS_H).toFixed(1)}" font-family="sans-serif" font-size="22" font-weight="700" fill="#0f172a">Map 701 B</text>
  <rect x="${(0.65 * CANVAS_W).toFixed(1)}" y="${(0.21 * CANVAS_H).toFixed(1)}" width="5" height="${(0.79 * CANVAS_H).toFixed(1)}" fill="#0f172a" />
  <rect x="${(0.65 * CANVAS_W).toFixed(1)}" y="${(0.586 * CANVAS_H).toFixed(1)}" width="${(0.345 * CANVAS_W).toFixed(1)}" height="5" fill="#0f172a" />
  <rect x="${(0.462 * CANVAS_W).toFixed(1)}" y="${(0.958 * CANVAS_H).toFixed(1)}" width="${(0.072 * CANVAS_W).toFixed(1)}" height="28" rx="4" fill="#ecfdf5" stroke="#1e293b" stroke-width="2" />
  <text x="${(0.498 * CANVAS_W).toFixed(1)}" y="${(0.98 * CANVAS_H).toFixed(1)}" font-family="sans-serif" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">ປະຕູ 701</text>
  ${seatsSvg}
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-701b-floorplan-${getTodayISO()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const movingComputer = movingComputerId
    ? computers.find((c) => c.id === movingComputerId)
    : null;
  const movingRotation = movingComputer?.mapPosition?.rotation ?? 0;

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ຄົ້ນຫາຊື່ຄອມ, ລະຫັດເຄື່ອງ, ຜູ້ໃຊ້...', 'Search name, asset tag, user...')}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | AssetStatus)}
              aria-label={t('ກອງຕາມສະຖານະ', 'Filter by status')}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            >
              <option value="all">{t('ສະຖານະທັງໝົດ', 'All Statuses')}</option>
              <option value="ໃຊ້ງານປົກກະຕິ">{tv('ໃຊ້ງານປົກກະຕິ')}</option>
              <option value="ກຳລັງສ້ອມແປງ">{tv('ກຳລັງສ້ອມແປງ')}</option>
              <option value="ລໍຖ້າອະໄຫຼ່">{tv('ລໍຖ້າອະໄຫຼ່')}</option>
              <option value="ປົດລະວາງ">{tv('ປົດລະວາງ')}</option>
            </select>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyWithRepairs}
                onChange={(e) => setOnlyWithRepairs(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              <span>{t('ສະເພາະເຄື່ອງເຄີຍສ້ອມ/ຄ້າງສ້ອມ', 'Repaired / Open issues only')}</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Zoom controls */}
            <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                title={t('ຫຍໍ້ແຜນຜັງ', 'Zoom out')}
                aria-label={t('ຫຍໍ້ແຜນຜັງ', 'Zoom out')}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-2 py-1 text-[11px] font-mono font-medium text-slate-700 hover:bg-slate-200/70 cursor-pointer tabular-nums"
                title={t('ຂະໜາດປົກກະຕິ 100%', 'Reset zoom 100%')}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                title={t('ຂະຫຍາຍແຜນຜັງ', 'Zoom in')}
                aria-label={t('ຂະຫຍາຍແຜນຜັງ', 'Zoom in')}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportFloorPlanSvg}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={t('ດາວໂຫຼດຮູບແຜນຜັງ Map 701 B (.svg)', 'Download Map 701 B Floor Plan (.svg)')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('ບັນທຶກແຜນຜັງ (.svg)', 'Save Floor Plan (.svg)')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRepositionMode((v) => !v);
                setMovingComputerId(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                repositionMode
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>
                {repositionMode
                  ? t('ສຳເລັດການຍ້າຍ/ໝູນ', 'Done Moving / Rotating')
                  : t('ຍ້າຍ / ໝູນຕຳແໜ່ງເຄື່ອງ', 'Move / Rotate Stations')}
              </span>
            </button>

            <button
              type="button"
              onClick={onAddComputerOnMap}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ເພີ່ມຄອມໃສ່ແຜນຜັງ', 'Add Computer to Map')}</span>
            </button>
          </div>
        </div>

        {/* Zone Filter & Quiet Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setZoneFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                zoneFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('ທຸກໂຊນ', 'All Zones')} ({computers.length})
            </button>
            {FLOOR_ZONES.map((zone) => {
              const count = computers.filter((c) => c.floorZone === zone.id).length;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setZoneFilter((prev) => (prev === zone.id ? 'all' : zone.id))}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    zoneFilter === zone.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: zone.dotColor }}
                    aria-hidden="true"
                  />
                  <span>{zone.label}</span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
            <span>
              {t(`ສະແດງ ${mapStats.matched}/${mapStats.total} ເຄື່ອງ`, `Showing ${mapStats.matched}/${mapStats.total}`)}
            </span>
            <span aria-hidden="true">·</span>
            <span className={mapStats.underRepair > 0 ? 'text-amber-700 font-semibold' : ''}>
              {t(
                `ກຳລັງສ້ອມ/ລໍຖ້າອະໄຫຼ່ ${mapStats.underRepair} ເຄື່ອງ`,
                `${mapStats.underRepair} under repair/waiting`
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>UPS {mapStats.upsCount} {t('ຊຸດ', 'sets')}</span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setZoneFilter('all');
                  setStatusFilter('all');
                  setOnlyWithRepairs(false);
                }}
                className="font-sans text-xs font-medium text-sky-700 hover:underline cursor-pointer"
              >
                {t('ລ້າງຕົວກອງ', 'Clear Filters')}
              </button>
            )}
          </div>
        </div>

        {/* Reposition & Rotation helper banner */}
        {repositionMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-xs text-amber-950 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {movingComputer
                  ? t(
                      `ກຳລັງປັບຕຳແໜ່ງ "${movingComputer.name}" (${movingComputer.assetTag}) — ລາກວາງເທິງແຜນຜັງໄດ້ອິດສະລະ ຫຼື ປັບມຸມໝູນດ້ານລຸ່ມ`,
                      `Adjusting "${movingComputer.name}" (${movingComputer.assetTag}) — drag freely on the floor plan or rotate below`
                    )
                  : t(
                      'ໂໝດປັບຕຳແໜ່ງອິດສະລະ: ກົດຄ້າງແລ້ວລາກຮູບຄອມເພື່ອຍ້າຍບ່ອນ ຫຼື ຄລິກເລືອກເຄື່ອງເພື່ອໝູນອົງສາ',
                      'Free Reposition Mode: press and drag any computer station freely, or click one to rotate'
                    )}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {movingComputer && (
                  <button
                    type="button"
                    onClick={() => setMovingComputerId(null)}
                    className="text-amber-800 font-medium underline cursor-pointer"
                  >
                    {t('ເຊົາເລືອກເຄື່ອງ', 'Deselect')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRepositionMode(false);
                    setMovingComputerId(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('ບັນທຶກຕຳແໜ່ງ', 'Save Layout')}</span>
                </button>
              </div>
            </div>

            {movingComputer && movingComputer.mapPosition && (
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-amber-200/80">
                <span className="font-semibold text-amber-900">
                  {t(`ໝູນເຄື່ອງ (${movingRotation}°):`, `Rotate (${movingRotation}°):`)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRotateMovingComputer(movingRotation - 15)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded-md font-mono font-medium cursor-pointer"
                  title={t('ໝູນຊ້າຍ 15 ອົງສາ', 'Rotate left 15°')}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>-15°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateMovingComputer(movingRotation + 15)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded-md font-mono font-medium cursor-pointer"
                  title={t('ໝູນຂວາ 15 ອົງສາ', 'Rotate right 15°')}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>+15°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotateMovingComputer(movingRotation + 90)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded-md font-mono font-medium cursor-pointer"
                  title={t('ໝູນຂວາ 90 ອົງສາ', 'Rotate right 90°')}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>+90°</span>
                </button>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={movingRotation}
                  onChange={(e) => handleRotateMovingComputer(Number(e.target.value))}
                  aria-label={t('ປັບມຸມໝູນຄອມພິວເຕີແບບອິດສະລະ', 'Adjust computer rotation angle')}
                  className="w-36 sm:w-48 accent-amber-700 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleRotateMovingComputer(0)}
                  className="px-2 py-1 text-[11px] bg-white border border-amber-300 hover:bg-amber-100 rounded-md cursor-pointer"
                >
                  {t('ຕັ້ງຄ່າ 0°', 'Reset 0°')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty Map Banner when all equipment cleared */}
      {computers.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              {t('ຍັງບໍ່ມີຈຸດເຄື່ອງຄອມພິວເຕີເທິງແຜນຜັງ Map 701 B', 'No computers placed on Map 701 B yet')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t(
                'ທ່ານສາມາດເພີ່ມເຄື່ອງໃໝ່ເອງ ຫຼື ໂຫຼດໂຄງສ້າງຈຸດຕັ້ງຄອມ Map 701 B (139 ຈຸດ) ຄືນມາໄດ້',
                'You can add computers manually or restore the Map 701 B layout (139 stations)'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAddComputerOnMap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ເພີ່ມຄອມໃສ່ແຜນຜັງ', 'Add Computer to Map')}</span>
            </button>
            {onRestoreMap701b && (
              <button
                type="button"
                onClick={onRestoreMap701b}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ໂຫຼດຈຸດຕັ້ງຜັງ Map 701 B (139 ຈຸດ)', 'Load Map 701 B (139 Stations)')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floor Plan Interactive Canvas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            {t(
              'ແຜນຜັງຫ້ອງປະຕິບັດການ Map 701 B — ຄລິກທີ່ຮູບຄອມເພື່ອເບິ່ງສະເປັກ ແລະ ປະຫວັດສ້ອມ ຫຼື ກົດ "ຍ້າຍ / ໝູນຕຳແໜ່ງເຄື່ອງ" ເພື່ອຈັດຜັງອິດສະລະ',
              'Operations Floor Plan Map 701 B — Click any computer to view specs/history, or click "Move / Rotate Stations" to rearrange freely'
            )}
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-slate-600" />
              {t('ປົກກະຕິ', 'Normal')}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              {t('ກຳລັງສ້ອມ / ລໍຖ້າອະໄຫຼ່', 'Under Repair / Waiting')}
            </span>
          </div>
        </div>

        <div className="overflow-auto p-4 bg-slate-100/70">
          <div
            style={{
              width: `${CANVAS_W * zoom}px`,
              height: `${CANVAS_H * zoom}px`,
            }}
            className="relative mx-auto"
          >
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                width: `${CANVAS_W}px`,
                height: `${CANVAS_H}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
              className={`map-blueprint-canvas relative bg-white border-2 border-slate-800 shadow-xs select-none ${
                repositionMode && movingComputerId ? 'cursor-crosshair' : ''
              }`}
            >
              {/* Subtle architectural blueprint grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-35"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Top-Center Map 701 B Header & Color Legend */}
              <div
                style={{ left: '32.6%', top: '0.5%', width: '30.6%', height: '20.5%' }}
                className="absolute bg-slate-300/80 border-2 border-slate-700 p-3 flex flex-col justify-between z-10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      Map 701 B
                    </h2>
                    <div className="text-[11px] font-medium text-slate-800 mt-1 space-y-0.5 font-mono">
                      <div>* All UPS: - Computer 34 sets</div>
                      <div className="pl-12">- Switch hup 02 sets</div>
                    </div>
                  </div>

                  {/* Interactive 6-team legend matching screenshot */}
                  <div className="grid grid-cols-2 gap-1.5 w-44 shrink-0">
                    {FLOOR_ZONES.map((z) => {
                      const active = zoneFilter === z.id;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoneFilter((prev) => (prev === z.id ? 'all' : z.id));
                          }}
                          className={`px-2 py-1 text-xs font-bold border text-center cursor-pointer transition-transform ${
                            z.legendBg
                          } ${z.legendText} ${active ? 'ring-2 ring-slate-900 scale-105' : ''}`}
                          title={t(`ກອງສະແດງສະເພາະທີມ ${z.label}`, `Filter team ${z.label}`)}
                        >
                          {z.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Structural Partition Walls (Tele / Back Office divider) */}
              {/* Main vertical wall */}
              <div
                style={{ left: '65.0%', top: '21.0%', width: '5px', height: '79.0%' }}
                className="absolute bg-slate-900 pointer-events-none"
              />
              {/* Horizontal divider between Tele & Back Office */}
              <div
                style={{ left: '65.0%', top: '58.6%', width: '34.5%', height: '5px' }}
                className="absolute bg-slate-900 pointer-events-none"
              />

              {/* Structural Pillars (Black rectangles from map) */}
              {/* MNT:08 pillar */}
              <div
                style={{ left: '9.5%', top: '14.8%', width: '4.1%', height: '6.3%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />
              <div
                style={{ left: '9.5%', top: '21.2%', width: '4.1%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[10px] font-mono text-center py-0.5 text-slate-800 pointer-events-none"
              >
                MNT:08
              </div>

              {/* MNT:06 Switch UPS pillar */}
              <div
                style={{ left: '9.5%', top: '58.6%', width: '3.9%', height: '7.5%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />
              <div
                style={{ left: '9.5%', top: '66.2%', width: '3.9%' }}
                className="absolute bg-emerald-200 border border-slate-700 text-[9px] font-semibold text-center py-0.5 leading-tight text-slate-900 pointer-events-none"
              >
                Switch
                <br />
                UPS
              </div>
              <div
                style={{ left: '13.5%', top: '58.0%', width: '1.6%', height: '9.2%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[9px] font-mono flex items-center justify-center pointer-events-none"
              >
                <span className="-rotate-90 whitespace-nowrap">MNT:06</span>
              </div>

              {/* Lower-left black pillar */}
              <div
                style={{ left: '9.8%', top: '73.2%', width: '3.6%', height: '12.2%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />

              {/* MNT:04 pillar */}
              <div
                style={{ left: '32.8%', top: '58.6%', width: '3.8%', height: '7.4%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />
              <div
                style={{ left: '32.6%', top: '66.2%', width: '4.2%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[10px] font-mono text-center py-0.5 text-slate-800 pointer-events-none"
              >
                MNT:04
              </div>

              {/* MNT:03 pillar */}
              <div
                style={{ left: '86.8%', top: '14.2%', width: '3.7%', height: '10.6%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />
              <div
                style={{ left: '85.3%', top: '15.2%', width: '1.5%', height: '9.4%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[9px] font-mono flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">MNT:03</span>
              </div>

              {/* Back Office right black pillar */}
              <div
                style={{ left: '86.8%', top: '73.0%', width: '3.7%', height: '12.2%' }}
                className="absolute bg-slate-950 pointer-events-none"
              />

              {/* MNT Wall / Door Tags */}
              <div
                style={{ left: '31.7%', top: '10.6%', width: '1.4%', height: '9.5%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[9px] font-mono flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">MNT:T-plus</span>
              </div>
              <div
                style={{ left: '32.6%', top: '20.4%', width: '5.5%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[10px] font-mono text-center py-0.5 pointer-events-none"
              >
                MNT:07
              </div>
              <div
                style={{ left: '63.1%', top: '8.4%', width: '3.2%' }}
                className="absolute bg-sky-50 border border-slate-700 text-[9px] font-mono text-center py-0.5 pointer-events-none"
              >
                MNT:5
              </div>
              <div
                style={{ left: '65.0%', top: '11.4%', width: '1.6%', height: '9.8%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[9px] font-mono flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">MNT:05</span>
              </div>
              <div
                style={{ left: '64.0%', top: '37.5%', width: '2.6%', height: '5.5%' }}
                className="absolute bg-emerald-50 border border-slate-700 text-[10px] font-semibold flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">Tele</span>
              </div>
              <div
                style={{ left: '64.5%', top: '58.6%', width: '1.6%', height: '9.8%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[9px] font-mono flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">MNT:02</span>
              </div>
              <div
                style={{ left: '64.3%', top: '72.0%', width: '2.1%', height: '10.8%' }}
                className="absolute bg-emerald-50 border border-slate-700 text-[9px] font-semibold flex items-center justify-center pointer-events-none"
              >
                <span className="rotate-90 whitespace-nowrap">Back Office</span>
              </div>

              {/* Bottom Switch UPS & Entrance Door ປະຕູ 701 */}
              <div
                style={{ left: '67.7%', top: '91.6%', width: '3.2%', height: '7.4%' }}
                className="absolute bg-emerald-200 border border-slate-700 text-[9px] font-semibold flex flex-col items-center justify-center text-center leading-tight pointer-events-none"
              >
                Switch
                <br />
                UPS
              </div>
              <div
                style={{ left: '24.8%', top: '96.2%', width: '8.2%' }}
                className="absolute bg-white border border-sky-700 text-[10px] font-mono text-sky-900 flex items-center justify-around py-0.5 pointer-events-none"
              >
                <span>MNT</span>
                <span>2</span>
                <span>7</span>
                <span>4</span>
                <span>1</span>
              </div>
              <div
                style={{ left: '33.0%', top: '96.2%', width: '5.0%' }}
                className="absolute bg-amber-50 border border-slate-700 text-[10px] font-mono text-center py-0.5 pointer-events-none"
              >
                MNT:01
              </div>
              <div
                style={{ left: '46.2%', top: '95.8%', width: '7.2%' }}
                className="absolute bg-emerald-50 border-2 border-slate-800 rounded-md text-xs font-bold text-slate-900 text-center py-1 pointer-events-none"
              >
                ປະຕູ 701
              </div>

              {/* UPS Cluster Labels */}
              <div
                style={{ left: '41.2%', top: '23.3%' }}
                className="absolute text-[10px] font-bold text-slate-700 font-mono pointer-events-none"
              >
                UPS:06 sets
              </div>
              <div
                style={{ left: '52.1%', top: '23.3%' }}
                className="absolute text-[10px] font-bold text-slate-700 font-mono pointer-events-none"
              >
                UPS:06 sets
              </div>
              <div
                style={{ left: '30.5%', top: '56.0%' }}
                className="absolute text-[10px] font-bold text-slate-700 font-mono rotate-90 origin-top-left pointer-events-none"
              >
                UPS:06 sets
              </div>
              <div
                style={{ left: '44.8%', top: '53.6%' }}
                className="absolute text-[10px] font-bold text-slate-700 font-mono rotate-36 pointer-events-none"
              >
                UPS:06 sets
              </div>
              <div
                style={{ left: '56.8%', top: '53.6%' }}
                className="absolute text-[10px] font-bold text-slate-700 font-mono rotate-36 pointer-events-none"
              >
                UPS:06 sets
              </div>

              {/* Empty Desk Slots shown in original floor plan */}
              {[
                { x: 23.9, y: 21.0 },
                { x: 27.6, y: 21.0 },
                { x: 77.6, y: 42.5 },
                { x: 81.3, y: 42.5 },
              ].map((slot, i) => (
                <div
                  key={`empty-slot-${i}`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: '3.65%', height: '5.45%' }}
                  className="absolute border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center text-[9px] text-slate-400 pointer-events-none"
                >
                  {t('ວ່າງ', 'Open')}
                </div>
              ))}

              {/* Mapped Computer Workstations */}
              {mappedComputers.map((comp) => {
                const pos = comp.mapPosition!;
                const isDraggingThis = dragPreview?.id === comp.id;
                const displayX = isDraggingThis ? dragPreview.x : pos.x;
                const displayY = isDraggingThis ? dragPreview.y : pos.y;
                const zoneCfg = ZONE_MAP.get(comp.floorZone || '') || DEFAULT_ZONE_STYLE;
                const isMatched = matchingIds.has(comp.id);
                const isSelected = activeComputer?.id === comp.id && drawerOpen;
                const isMoving = movingComputerId === comp.id;
                const stat = analyticsMap.get(comp.id);
                const hasIssue =
                  comp.status === 'ກຳລັງສ້ອມແປງ' || comp.status === 'ລໍຖ້າອະໄຫຼ່';
                const repairCount = stat?.totalRepairs || 0;

                return (
                  <button
                    key={comp.id}
                    type="button"
                    onPointerDown={(e) => handleSeatPointerDown(comp, e)}
                    onClick={(e) => handleSeatClick(comp, e)}
                    style={{
                      left: `${displayX}%`,
                      top: `${displayY}%`,
                      width: `${pos.w ?? 3.65}%`,
                      height: `${pos.h ?? 5.45}%`,
                      transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
                      transformOrigin: 'top left',
                    }}
                    title={`${comp.name} · ${comp.assetTag} · ${tv(comp.status)}`}
                    className={`absolute border flex flex-col items-center justify-center px-0.5 text-center group ${
                      isDraggingThis
                        ? 'cursor-grabbing ring-2 ring-sky-600 shadow-xl z-40'
                        : repositionMode
                        ? 'cursor-grab transition-shadow'
                        : 'cursor-pointer transition-all'
                    } ${zoneCfg.bgClass} ${
                      hasIssue
                        ? 'border-rose-600 ring-2 ring-rose-500/70 z-20'
                        : zoneCfg.borderClass
                    } ${
                      isSelected
                        ? 'ring-2 ring-slate-900 shadow-md scale-110 z-30'
                        : ''
                    } ${
                      isMoving && !isDraggingThis
                        ? 'ring-2 ring-amber-600 shadow-lg z-30'
                        : ''
                    } ${!isMatched ? 'opacity-20' : 'opacity-100 hover:z-20'}`}
                  >
                    {/* Top-right indicator: wrench if under repair, or subtle repair count */}
                    {hasIssue ? (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white flex items-center justify-center rounded-xs shadow-xs"
                        aria-label={comp.status}
                      >
                        <Wrench className="w-2.5 h-2.5" />
                      </span>
                    ) : repairCount > 0 ? (
                      <span className="absolute -top-1 -right-1 px-0.5 bg-slate-800 text-white text-[8px] font-mono leading-tight rounded-xs">
                        {repairCount}
                      </span>
                    ) : null}

                    <div className={`flex items-center gap-0.5 max-w-full ${zoneCfg.textClass}`}>
                      <Monitor className="w-2.5 h-2.5 shrink-0 opacity-75" />
                      <span className="text-[8.5px] font-bold leading-none truncate">
                        {comp.name}
                      </span>
                    </div>
                    <div className={`text-[7px] font-mono font-semibold leading-tight mt-0.5 truncate max-w-full opacity-80 ${zoneCfg.textClass}`}>
                      {comp.assetTag}
                    </div>
                    {comp.hasUps && (
                      <div className="text-[6.5px] font-mono font-bold text-slate-600 leading-none">
                        UPS
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unmapped Computers List (if any new computers lack mapPosition) */}
      {unmappedComputers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-semibold text-slate-800">
              {t(
                `ອຸປະກອນທີ່ຍັງບໍ່ໄດ້ກຳນົດຈຸດເທິງແຜນຜັງ (${unmappedComputers.length})`,
                `Unplaced Equipment (${unmappedComputers.length})`
              )}
            </h3>
            <span className="text-[11px] text-slate-500">
              {t(
                'ກົດ "ຍ້າຍ / ໝູນຕຳແໜ່ງເຄື່ອງ" ຫຼື ເປີດລາຍລະອຽດເພື່ອກຳນົດຈຸດ',
                'Use "Move / Rotate Stations" or open details to assign placement'
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unmappedComputers.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  if (repositionMode) {
                    setMovingComputerId(comp.id);
                  } else {
                    onSelectComputer(comp.id);
                    setDrawerOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-900">{comp.name}</span>
                <span className="font-mono text-slate-500">{comp.assetTag}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slide-Over Detail Drawer when clicking a computer on the map */}
      {drawerOpen && activeComputer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-900">
                    {activeComputer.assetTag}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t(
                      `ໂຊນ ${activeComputer.floorZone || 'ທົ່ວໄປ'}`,
                      `Zone ${activeComputer.floorZone ? tv(activeComputer.floorZone) : 'General'}`
                    )}
                  </span>
                  <span aria-hidden="true">·</span>
                  <AssetStatusBadge status={activeComputer.status} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1 truncate">
                  {activeComputer.name}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {t('ຜູ້ໃຊ້ງານ:', 'User:')} {activeComputer.assignedUser || '—'}
                  {activeComputer.location ? ` · ${activeComputer.location}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer shrink-0"
                aria-label={t('ປິດໜ້າຕ່າງຂໍ້ມູນເຄື່ອງ', 'Close computer details')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Quick Summary without IP or manual X/Y coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-sky-700" />
                    <span>{t('ລະຫັດເຄື່ອງ (Asset Tag)', 'Asset Tag')}</span>
                  </div>
                  <div className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900">
                    {activeComputer.assetTag}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {activeComputer.type}
                    {activeComputer.hasUps ? t(' · ມີເຄື່ອງສຳຮອງໄຟ (UPS)', ' · With UPS') : ''}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-600" />
                    <span>{t('ພະແນກ / ຕຳແໜ່ງໃນແຜນຜັງ', 'Department / Floor Placement')}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {activeComputer.department}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {activeComputer.mapPosition
                      ? t('ວາງເທິງແຜນຜັງແລ້ວ', 'Placed on floor plan')
                      : t('ຍັງບໍ່ໄດ້ວາງເທິງແຜນຜັງ', 'Not yet placed on floor plan')}
                    {activeComputer.mapPosition?.rotation
                      ? t(` · ມຸມໝູນ ${activeComputer.mapPosition.rotation}°`, ` · Angle ${activeComputer.mapPosition.rotation}°`)
                      : ''}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onAddRepairForMachine(activeComputer.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t('ບັນທຶກແຈ້ງສ້ອມ', 'Log Repair')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setRepositionMode(true);
                    setMovingComputerId(activeComputer.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>{t('ຍ້າຍ / ໝູນເທິງແຜນຜັງ', 'Move / Rotate on Map')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEditComputer(activeComputer);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('ແກ້ໄຂສະເປັກ', 'Edit Specs')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReportForMachine(activeComputer.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('ອອກລາຍງານເຄື່ອງນີ້', 'Machine Report')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComputer(activeComputer)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50/70 border border-rose-200 hover:bg-rose-100 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('ລົບອຸປະກອນ', 'Delete')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onInspectInEquipment(activeComputer.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <span>{t('ເປີດໃນທະບຽນອຸປະກອນ', 'Open in Registry')}</span>
                </button>
              </div>

              {/* Hardware Specs */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-3">
                  {t('ສະເປັກຮາດແວ ແລະ ຊອບແວ', 'Hardware & Software Specifications')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 border border-slate-200 rounded-xl p-4">
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">CPU</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.cpu || '—'}</dd>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">RAM</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.ram || '—'}</dd>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Storage</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.storage || '—'}</dd>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">GPU</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.gpu || '—'}</dd>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ເມນບອດ / ລຸ້ນເຄື່ອງ', 'Motherboard / Model')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">
                      {activeComputer.specs.motherboardOrModel || '—'}
                    </dd>
                  </div>
                  <div className="border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('PSU / ແບັດເຕີຣີ / UPS', 'PSU / Battery / UPS')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">
                      {activeComputer.specs.psuOrBattery || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('ລະບົບປະຕິບັດການ (OS)', 'Operating System (OS)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.os || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('Serial Number ຫູຟັງ', 'Headset Serial Number')}</dt>
                    <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                      {activeComputer.specs.serialNumber || '—'}
                    </dd>
                  </div>
                </dl>
                {activeComputer.notes && (
                  <p className="mt-2.5 text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                    {t('ໝາຍເຫດ:', 'Notes:')} {activeComputer.notes}
                  </p>
                )}
              </div>

              {/* PM & Cost Summary */}
              {activeAnalytics && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{t('ແຜນບຳລຸງຮັກສາ (PM)', 'Preventive Maintenance (PM)')}</span>
                    <PMPriorityText priority={activeAnalytics.pmPriority} />
                  </div>
                  <p className="text-slate-600">{activeAnalytics.pmRecommendation}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 font-mono tabular-nums">
                    <div>
                      <div className="text-[11px] text-slate-500">{t('ສ້ອມສະສົມ', 'Total Repairs')}</div>
                      <div className="font-semibold text-slate-900">
                        {activeAnalytics.totalRepairs} {t('ຄັ້ງ', 'tickets')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">{t('PM ຖັດໄປ', 'Next PM Due')}</div>
                      <div className="font-semibold text-slate-900">
                        {activeAnalytics.nextPmDueDate
                          ? formatDate(activeAnalytics.nextPmDueDate)
                          : t('ຍັງບໍ່ໄດ້ກຳນົດ', 'Not scheduled')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replaced Parts */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
                  {t(`ອະໄຫຼ່ທີ່ປ່ຽນ (${activeParts.length})`, `Replaced Parts (${activeParts.length})`)}
                </h3>
                {activeParts.length === 0 ? (
                  <p className="text-slate-400">
                    {t('ຍັງບໍ່ມີປະຫວັດການປ່ຽນອະໄຫຼ່ສຳລັບເຄື່ອງນີ້', 'No spare part replacements recorded for this unit')}
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {activeParts.map((part) => (
                      <div key={part.id} className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{part.partName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {part.brandModel} · {formatDate(part.replacedDate)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <PartStatusText status={part.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repair History */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2.5">
                  {t(`ປະຫວັດການສ້ອມແປງ (${activeRepairs.length})`, `Repair History (${activeRepairs.length})`)}
                </h3>
                {activeRepairs.length === 0 ? (
                  <p className="text-slate-400">
                    {t('ຍັງບໍ່ມີປະຫວັດການແຈ້ງສ້ອມສຳລັບເຄື່ອງນີ້', 'No repair history for this unit')}
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {activeRepairs.map((rep) => (
                      <div key={rep.id} className="p-3.5 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">
                              {rep.ticketCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-500">
                              {formatDate(rep.reportedDate)}
                            </span>
                          </div>
                          <RepairStatusText status={rep.status} />
                        </div>
                        <div className="text-slate-600 font-medium">{tv(rep.category)}</div>
                        <p className="text-slate-900 font-medium">
                          {t('ອາການ:', 'Symptom:')} {rep.symptom}
                        </p>
                        {rep.rootCause && (
                          <p className="text-slate-600">
                            {t('ສາເຫດ:', 'Root Cause:')} {rep.rootCause}
                          </p>
                        )}
                        <p className="text-emerald-800">
                          {t('ຜົນລັບການແກ້ໄຂ:', 'Resolution:')} {rep.resolution || '—'}
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {t('ຜູ້ແຈ້ງ:', 'Reporter:')} {rep.reporter} · {t('ຊ່າງ:', 'Tech:')} {rep.technician}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
