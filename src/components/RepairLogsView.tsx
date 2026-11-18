import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Wrench } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ComputerAsset,
  IssueCategory,
  RepairRecord,
  RepairStatus,
  ReplacedPart,
} from '../types';
import { extractAvailableYears, LAO_FULL_MONTHS } from '../utils/analytics';
import { PartStatusText, RepairStatusText } from './StatusText';

interface RepairLogsViewProps {
  computers: ComputerAsset[];
  categories: string[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  onOpenNewRepair: () => void;
  onEditRepair: (repair: RepairRecord) => void;
  onUpdateRepairStatus: (repairId: string, status: RepairStatus) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onInspectMachine: (computerId: string) => void;
}

export const RepairLogsView: React.FC<RepairLogsViewProps> = ({
  computers,
  categories,
  repairs,
  parts,
  onOpenNewRepair,
  onEditRepair,
  onUpdateRepairStatus,
  onAddCategory,
  onDeleteCategory,
  onInspectMachine,
}) => {
  const { t, tv, formatDate, getMonthFull } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RepairStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | IssueCategory>('all');
  const [machineFilter, setMachineFilter] = useState<'all' | string>('all');
  const [yearFilter, setYearFilter] = useState<'all' | string>('all');
  const [monthFilter, setMonthFilter] = useState<'all' | string>('all');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');

  const availableYears = useMemo(
    () => extractAvailableYears(repairs.map((r) => r.reportedDate)),
    [repairs]
  );

  const compMap = useMemo(
    () => new Map(computers.map((c) => [c.id, c])),
    [computers]
  );

  const partsByRepair = useMemo(() => {
    const map = new Map<string, ReplacedPart[]>();
    for (const p of parts) {
      const list = map.get(p.repairId) || [];
      list.push(p);
      map.set(p.repairId, list);
    }
    return map;
  }, [parts]);

  const allCategoryList = useMemo(() => categories, [categories]);

  const filteredRepairs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...repairs]
      .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate))
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        if (machineFilter !== 'all' && r.computerId !== machineFilter) return false;
        if (yearFilter !== 'all' && !r.reportedDate.startsWith(`${yearFilter}-`)) return false;
        if (monthFilter !== 'all' && r.reportedDate.slice(5, 7) !== monthFilter) return false;
        if (!q) return true;
        const c = compMap.get(r.computerId);
        return (
          r.ticketCode.toLowerCase().includes(q) ||
          r.symptom.toLowerCase().includes(q) ||
          r.rootCause.toLowerCase().includes(q) ||
          r.resolution.toLowerCase().includes(q) ||
          r.technician.toLowerCase().includes(q) ||
          (c && (c.assetTag.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)))
        );
      });
  }, [repairs, statusFilter, categoryFilter, machineFilter, yearFilter, monthFilter, searchQuery, compMap]);

  const handleAddCategorySubmit = () => {
    const trimmed = newCategoryText.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategoryText('');
  };

  const handleRemoveCategory = (cat: string) => {
    onDeleteCategory(cat);
    if (categoryFilter === cat) {
      setCategoryFilter('all');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'ຄົ້ນຫາເລກໃບງານ, ອາການ, ສາເຫດ, ຊ່າງສ້ອມ...',
                  'Search ticket, symptom, root cause, tech...'
                )}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-72"
              />
            </div>

            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              aria-label={t('ກອງຕາມເຄື່ອງ', 'Filter by machine')}
            >
              <option value="all">{t(`ທຸກເຄື່ອງ (${computers.length})`, `All Units (${computers.length})`)}</option>
              {computers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.assetTag} — {c.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                aria-label={t('ກອງຕາມໝວດໝູ່ບັນຫາ', 'Filter by category')}
              >
                <option value="all">{t('ທຸກໝວດໝູ່ບັນຫາ', 'All Categories')}</option>
                {allCategoryList.map((cat) => (
                  <option key={cat} value={cat}>
                    {tv(cat)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoryManager((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  showCategoryManager
                    ? 'text-sky-900 bg-sky-100 border border-sky-300'
                    : 'text-sky-700 bg-sky-50 hover:bg-sky-100'
                }`}
                title={t('ເພີ່ມ ຫຼື ລົບໝວດໝູ່ບັນຫາ', 'Add or delete categories')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('ຈັດການໝວດໝູ່', 'Manage Categories')}</span>
              </button>
              {categoryFilter !== 'all' && categories.includes(categoryFilter) && (
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(categoryFilter)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title={t(`ລົບໝວດໝູ່ "${categoryFilter}"`, `Delete category "${tv(categoryFilter)}"`)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('ລົບໝວດໝູ່', 'Delete Category')}</span>
                </button>
              )}
            </div>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer font-mono"
              aria-label={t('ກອງຍ້ອນຫຼັງຕາມປີ', 'Filter by year')}
            >
              <option value="all">{t('ທຸກປີ', 'All Years')}</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {t(`ປີ ${yr}`, yr)}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              aria-label={t('ກອງຍ້ອນຫຼັງຕາມເດືອນ', 'Filter by month')}
            >
              <option value="all">{t('ທຸກເດືອນ', 'All Months')}</option>
              {LAO_FULL_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {getMonthFull(m.value)}
                </option>
              ))}
            </select>

            {(yearFilter !== 'all' || monthFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setYearFilter('all');
                  setMonthFilter('all');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('ລ້າງຊ່ວງເວລາ', 'Clear Period')}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewRepair}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ບັນທຶກງານສ້ອມໃໝ່', 'Log New Repair')}</span>
          </button>
        </div>

        {showCategoryManager && (
          <div className="space-y-3 pt-2.5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newCategoryText}
                onChange={(e) => setNewCategoryText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategorySubmit();
                  }
                }}
                placeholder={t(
                  'ພິມຊື່ໝວດໝູ່ບັນຫາໃໝ່ ເຊັ່ນ ລະບົບເຄືອຂ່າຍ / VPN...',
                  'New category name, e.g. Network / VPN...'
                )}
                className="px-3 py-1.5 text-xs bg-white border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-80"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCategorySubmit}
                className="px-3 py-1.5 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
              >
                {t('ເພີ່ມໝວດໝູ່', 'Add Category')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryManager(false);
                  setNewCategoryText('');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {t('ປິດ', 'Close')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                {t(`ໝວດໝູ່ທັງໝົດ (${categories.length}):`, `All Categories (${categories.length}):`)}
              </span>
              {categories.length === 0 ? (
                <span className="text-xs text-slate-400">
                  {t('ຍັງບໍ່ມີໝວດໝູ່ບັນຫາ', 'No categories yet')}
                </span>
              ) : (
                categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                  >
                    <span>{tv(cat)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="p-0.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-sm cursor-pointer"
                      title={t(`ລົບໝວດໝູ່ ${cat}`, `Delete category ${tv(cat)}`)}
                      aria-label={t(`ລົບໝວດໝູ່ ${cat}`, `Delete category ${tv(cat)}`)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'ລໍຖ້າກວດສອບ', 'ກຳລັງດຳເນີນການ', 'ລໍຖ້າອະໄຫຼ່', 'ສ້ອມແປງສຳເລັດ'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? t('ທັງໝົດ', 'All') : tv(st)}
                </button>
              )
            )}
          </div>

          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {t(
              `ສະແດງ ${filteredRepairs.length} ຈາກ ${repairs.length} ລາຍການ`,
              `Showing ${filteredRepairs.length} of ${repairs.length} records`
            )}
          </span>
        </div>
      </div>

      {/* Repair Records List */}
      {filteredRepairs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-800">
            {t('ບໍ່ພົບປະຫວັດການແຈ້ງສ້ອມຕາມເງື່ອນໄຂ', 'No matching repair logs found')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'ລອງປ່ຽນຕົວກອງ ຫຼື ຄລິກປຸ່ມບັນທຶກງານສ້ອມໃໝ່ເພື່ອເພີ່ມຂໍ້ມູນ',
              'Try adjusting your filters or log a new repair ticket'
            )}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filteredRepairs.map((rep) => {
            const comp = compMap.get(rep.computerId);
            const linkedParts = partsByRepair.get(rep.id) || [];

            return (
              <div key={rep.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {rep.ticketCode}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      {comp ? (
                        <button
                          type="button"
                          onClick={() => onInspectMachine(comp.id)}
                          className="font-medium text-sky-700 hover:underline cursor-pointer"
                        >
                          {comp.assetTag} ({comp.name})
                        </button>
                      ) : (
                        <span className="text-slate-500">{t('ບໍ່ລະບຸເຄື່ອງ', 'Unspecified Unit')}</span>
                      )}
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-slate-600">{tv(rep.category)}</span>
                      {rep.isPreventive && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-medium text-sky-700">
                            {t('ບັນທຶກ PM ເຊີງປ້ອງກັນ', 'Preventive Maintenance (PM)')}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                          {t('ອາການທີ່ແຈ້ງສ້ອມ', 'Reported Symptom')}
                        </div>
                        <p className="text-slate-900 leading-relaxed">{rep.symptom}</p>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                          {t('ສາເຫດທີ່ກວດພົບ', 'Root Cause')}
                        </div>
                        <p className="text-slate-700 leading-relaxed">{rep.rootCause || '—'}</p>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 mb-0.5">
                          {t('ຜົນລັບການແກ້ໄຂບັນຫາ', 'Resolution')}
                        </div>
                        <p className="text-slate-800 leading-relaxed">{rep.resolution || '—'}</p>
                      </div>
                    </div>

                    {linkedParts.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs border-t border-slate-100">
                        <span className="font-semibold text-slate-600">
                          {t('ອະໄຫຼ່ທີ່ກ່ຽວຂ້ອງ:', 'Related Parts:')}
                        </span>
                        {linkedParts.map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-2 text-slate-700">
                            <span>
                              {p.partName} ({p.brandModel})
                            </span>
                            <PartStatusText status={p.status} />
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums pt-1">
                      <span>
                        {t('ແຈ້ງເມື່ອ', 'Reported')} {formatDate(rep.reportedDate)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t('ຜູ້ແຈ້ງ:', 'Reporter:')} {rep.reporter}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t('ຊ່າງ:', 'Tech:')} {rep.technician}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 shrink-0">
                    <RepairStatusText status={rep.status} />
                    <div className="flex items-center gap-2">
                      <select
                        value={rep.status}
                        onChange={(e) =>
                          onUpdateRepairStatus(rep.id, e.target.value as RepairStatus)
                        }
                        aria-label={t(`ປ່ຽນສະຖານະໃບງານ ${rep.ticketCode}`, `Change status for ${rep.ticketCode}`)}
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                      >
                        <option value="ລໍຖ້າກວດສອບ">{tv('ລໍຖ້າກວດສອບ')}</option>
                        <option value="ກຳລັງດຳເນີນການ">{tv('ກຳລັງດຳເນີນການ')}</option>
                        <option value="ລໍຖ້າອະໄຫຼ່">{tv('ລໍຖ້າອະໄຫຼ່')}</option>
                        <option value="ສ້ອມແປງສຳເລັດ">{tv('ສ້ອມແປງສຳເລັດ')}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onEditRepair(rep)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t('ແກ້ໄຂ', 'Edit')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
