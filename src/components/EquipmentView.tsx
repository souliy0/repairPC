import React, { useMemo, useState } from 'react';
import {
  Edit3,
  FileText,
  MapPin,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AssetStatus,
  ComputerAsset,
  DeviceType,
  MachineAnalytics,
  RepairRecord,
  ReplacedPart,
} from '../types';
import {
  AssetStatusBadge,
  PartStatusText,
  PMPriorityText,
  RepairStatusText,
} from './StatusText';

interface EquipmentViewProps {
  computers: ComputerAsset[];
  analytics: MachineAnalytics[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  selectedComputerId: string | null;
  onSelectComputer: (id: string) => void;
  onAddComputer: () => void;
  onEditComputer: (computer: ComputerAsset) => void;
  onDeleteComputer: (computer: ComputerAsset) => void;
  onAddRepairForMachine: (computerId: string) => void;
  onOpenReportForMachine: (computerId: string) => void;
  onShowOnMap?: (computerId: string) => void;
  onRestoreMap701b?: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  computers,
  analytics,
  repairs,
  parts,
  selectedComputerId,
  onSelectComputer,
  onAddComputer,
  onEditComputer,
  onDeleteComputer,
  onAddRepairForMachine,
  onOpenReportForMachine,
  onShowOnMap,
  onRestoreMap701b,
}) => {
  const { t, tv, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');

  const analyticsMap = useMemo(
    () => new Map(analytics.map((a) => [a.computer.id, a])),
    [analytics]
  );

  const filteredComputers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return computers.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.assetTag.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.assignedUser.toLowerCase().includes(q) ||
        c.specs.cpu.toLowerCase().includes(q) ||
        c.specs.serialNumber.toLowerCase().includes(q)
      );
    });
  }, [computers, searchQuery, typeFilter, statusFilter]);

  const activeComputer = useMemo(() => {
    const found = computers.find((c) => c.id === selectedComputerId);
    return found || filteredComputers[0] || computers[0] || null;
  }, [computers, filteredComputers, selectedComputerId]);

  const activeAnalytics = activeComputer ? analyticsMap.get(activeComputer.id) : undefined;

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

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ຄົ້ນຫາຊື່ເຄື່ອງ, ລະຫັດເຄື່ອງ, ຜູ້ໃຊ້, CPU...', 'Search name, asset tag, user, CPU...')}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-64"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'Desktop', 'Laptop', 'Workstation', 'Server'] as const).map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setTypeFilter(dt)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  typeFilter === dt
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dt === 'all' ? t('ທຸກປະເພດ', 'All Types') : dt}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | AssetStatus)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            aria-label={t('ກອງຕາມສະຖານະເຄື່ອງ', 'Filter by equipment status')}
          >
            <option value="all">{t('ສະຖານະທັງໝົດ', 'All Statuses')}</option>
            <option value="ໃຊ້ງານປົກກະຕິ">{tv('ໃຊ້ງານປົກກະຕິ')}</option>
            <option value="ກຳລັງສ້ອມແປງ">{tv('ກຳລັງສ້ອມແປງ')}</option>
            <option value="ລໍຖ້າອະໄຫຼ່">{tv('ລໍຖ້າອະໄຫຼ່')}</option>
            <option value="ປົດລະວາງ">{tv('ປົດລະວາງ')}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onAddComputer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('ເພີ່ມອຸປະກອນ ແລະ ສະເປັກໃໝ່', 'Add Equipment & Specs')}</span>
        </button>
      </div>

      {/* Master-Detail Split Grid */}
      {computers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Monitor className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-800">
            {t('ຍັງບໍ່ມີລາຍການອຸປະກອນໃນທະບຽນ', 'No equipment registered yet')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'ເລີ່ມຕົ້ນດ້ວຍການເພີ່ມເຄື່ອງຄອມພິວເຕີໃໝ່ ຫຼື ໂຫຼດຈຸດຕັ້ງຜັງ Map 701 B',
              'Get started by adding a new computer or loading the Map 701 B layout'
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onAddComputer}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ເພີ່ມເຄື່ອງທຳອິດ', 'Add First Computer')}</span>
            </button>
            {onRestoreMap701b && (
              <button
                type="button"
                onClick={onRestoreMap701b}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ໂຫຼດຈຸດຕັ້ງຜັງ Map 701 B', 'Load Map 701 B Layout')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Asset Table */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {t(`ລາຍການອຸປະກອນ (${filteredComputers.length})`, `Equipment List (${filteredComputers.length})`)}
              </span>
              <span className="text-[11px] text-slate-500">
                {t('ຄລິກເລືອກເພື່ອເບິ່ງສະເປັກ ແລະ ປະຫວັດ', 'Click to view specs & history')}
              </span>
            </div>

            {filteredComputers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {t('ບໍ່ພົບອຸປະກອນທີ່ກົງກັບຕົວກອງ', 'No equipment matches filters')}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredComputers.map((comp) => {
                  const isSelected = activeComputer?.id === comp.id;
                  const stat = analyticsMap.get(comp.id);
                  return (
                    <div
                      key={comp.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectComputer(comp.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectComputer(comp.id);
                        }
                      }}
                      className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer block ${
                        isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {comp.assetTag}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <AssetStatusBadge status={comp.status} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteComputer(comp);
                            }}
                            title={t(`ລົບອຸປະກອນ ${comp.name}`, `Delete ${comp.name}`)}
                            aria-label={t(`ລົບອຸປະກອນ ${comp.name}`, `Delete ${comp.name}`)}
                            className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1 truncate">
                        {comp.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {[comp.type, comp.department, comp.assignedUser].filter(Boolean).join(' · ')}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-mono tabular-nums">
                        <span className="truncate max-w-[200px]">{comp.specs.cpu || '—'}</span>
                        <span>
                          {t(`ສ້ອມ ${stat?.totalRepairs || 0} ຄັ້ງ`, `${stat?.totalRepairs || 0} repairs`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Hardware Specs & History */}
          {activeComputer && (
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-900">
                      {activeComputer.assetTag}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeComputer.type}</span>
                    <span aria-hidden="true">·</span>
                    <AssetStatusBadge status={activeComputer.status} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1.5">
                    {activeComputer.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('ຜູ້ໃຊ້ງານ:', 'User:')} {activeComputer.assignedUser || '—'} ·{' '}
                    {t('ພະແນກ', 'Dept.')} {activeComputer.department || '—'}
                    {activeComputer.location ? ` · ${activeComputer.location}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onShowOnMap && (
                    <button
                      type="button"
                      onClick={() => onShowOnMap(activeComputer.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t('ເບິ່ງໃນແຜນຜັງ', 'View on Map')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditComputer(activeComputer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('ແກ້ໄຂສະເປັກ', 'Edit Specs')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteComputer(activeComputer)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 bg-rose-50/60 hover:bg-rose-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('ລົບອຸປະກອນ', 'Delete')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenReportForMachine(activeComputer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('ລາຍງານເຄື່ອງນີ້', 'Machine Report')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddRepairForMachine(activeComputer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{t('ບັນທຶກແຈ້ງສ້ອມ', 'Log Repair')}</span>
                  </button>
                </div>
              </div>

              {/* Hardware Specs Grid */}
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">
                  {t('ຂໍ້ມູນສະເປັກຮາດແວ ແລະ ຊອບແວ', 'Hardware & Software Specifications')}
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ໜ່ວຍປະມວນຜົນ (CPU)', 'Processor (CPU)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.cpu || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ໜ່ວຍຄວາມຈຳ (RAM)', 'Memory (RAM)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.ram || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ອຸປະກອນຈັດເກັບຂໍ້ມູນ (Storage)', 'Storage (SSD/HDD)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.storage || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ກາດຈໍ (GPU)', 'Graphics (GPU)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.gpu || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ເມນບອດ / ລຸ້ນເຄື່ອງ', 'Motherboard / Model')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.motherboardOrModel || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ແຫຼ່ງຈ່າຍໄຟ / ແບັດເຕີຣີ', 'PSU / Battery')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.psuOrBattery || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('ລະບົບປະຕິບັດການ (OS)', 'Operating System (OS)')}</dt>
                    <dd className="font-medium text-slate-900 mt-0.5">{activeComputer.specs.os || '—'}</dd>
                  </div>
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{t('Serial Number ຫູຟັງ', 'Headset Serial Number')}</dt>
                    <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                      {activeComputer.specs.serialNumber || '—'}
                    </dd>
                  </div>
                </dl>

                {activeComputer.notes && (
                  <p className="mt-4 text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-lg">
                    {t('ໝາຍເຫດເຄື່ອງ:', 'Notes:')} {activeComputer.notes}
                  </p>
                )}
              </div>

              {/* Preventive Insight Strip */}
              {activeAnalytics && (
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{t('ສະຫຼຸບການສ້ອມບຳລຸງ:', 'Maintenance Summary:')}</span>
                      <PMPriorityText priority={activeAnalytics.pmPriority} />
                    </div>
                    <p className="text-slate-600 mt-1">{activeAnalytics.pmRecommendation}</p>
                  </div>
                  <div className="flex items-center gap-5 shrink-0 font-mono tabular-nums">
                    <div>
                      <div className="text-[11px] text-slate-500">{t('ສ້ອມທັງໝົດ', 'Total Repairs')}</div>
                      <div className="font-semibold text-slate-900">
                        {activeAnalytics.totalRepairs} {t('ຄັ້ງ', 'tickets')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">{t('PM ຫຼ້າສຸດ', 'Last PM')}</div>
                      <div className="font-semibold text-slate-900">
                        {activeComputer.lastPmDate ? formatDate(activeComputer.lastPmDate) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replaced Parts on this Machine */}
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">
                  {t(
                    `ອະໄຫຼ່ທີ່ປ່ຽນ ແລະ ປະຫວັດເຄລມຂອງເຄື່ອງນີ້ (${activeParts.length})`,
                    `Replaced Parts & Warranty Claims (${activeParts.length})`
                  )}
                </h3>
                {activeParts.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {t('ຍັງບໍ່ມີລາຍການປ່ຽນອະໄຫຼ່ສຳລັບເຄື່ອງນີ້', 'No spare part replacements recorded for this unit')}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                          <th className="py-2 pr-3">{t('ວັນທີ', 'Date')}</th>
                          <th className="py-2 pr-3">{t('ລາຍການອະໄຫຼ່ / ລຸ້ນ', 'Part / Model')}</th>
                          <th className="py-2">{t('ສະຖານະ', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeParts.map((part) => (
                          <tr key={part.id}>
                            <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {formatDate(part.replacedDate)}
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className="font-medium text-slate-900">{part.partName}</div>
                              <div className="text-[11px] text-slate-500">
                                {part.brandModel} · {t(`ປະກັນ ${part.warrantyMonths} ເດືອນ`, `${part.warrantyMonths} mo warranty`)}
                              </div>
                            </td>
                            <td className="py-2.5">
                              <PartStatusText status={part.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Repair History Timeline */}
              <div className="p-6">
                <h3 className="text-xs font-semibold text-slate-500 mb-4">
                  {t(
                    `ປະຫວັດການແຈ້ງສ້ອມ ແລະ ຜົນລັບການແກ້ໄຂ (${activeRepairs.length})`,
                    `Repair History & Resolutions (${activeRepairs.length})`
                  )}
                </h3>
                {activeRepairs.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {t('ຍັງບໍ່ມີປະຫວັດແຈ້ງສ້ອມສຳລັບເຄື່ອງນີ້', 'No repair history recorded for this unit')}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {activeRepairs.map((rep) => (
                      <div key={rep.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-slate-900">
                              {rep.ticketCode}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500 font-mono tabular-nums">
                              {formatDate(rep.reportedDate)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-600 font-medium">{tv(rep.category)}</span>
                          </div>
                          <RepairStatusText status={rep.status} />
                        </div>

                        <div className="mt-2 space-y-1 text-xs">
                          <p className="text-slate-900 font-medium">
                            {t('ອາການ:', 'Symptom:')} {rep.symptom}
                          </p>
                          <p className="text-slate-600">
                            {t('ສາເຫດ:', 'Root Cause:')} {rep.rootCause}
                          </p>
                          <p className="text-emerald-800">
                            {t('ຜົນລັບການແກ້ໄຂ:', 'Resolution:')} {rep.resolution}
                          </p>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                          <span>{t('ຜູ້ແຈ້ງ:', 'Reporter:')} {rep.reporter}</span>
                          <span aria-hidden="true">·</span>
                          <span>{t('ຜູ້ສ້ອມ:', 'Technician:')} {rep.technician}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
