import React, { useMemo, useState } from 'react';
import { CheckSquare, FileText, MapPin, Search, Wrench } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ComputerAsset, MachineAnalytics, PMPriority } from '../types';
import { PMPriorityText } from './StatusText';

interface PreventiveMaintenanceViewProps {
  analytics: MachineAnalytics[];
  onInspectMachine: (computerId: string) => void;
  onShowOnMap?: (computerId?: string) => void;
  onOpenReportForMachine: (computerId: string) => void;
  onCompletePm: (computer: ComputerAsset, notes: string) => void;
  onOpenNewRepair: (computerId?: string) => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  analytics,
  onInspectMachine,
  onShowOnMap,
  onOpenReportForMachine,
  onCompletePm,
  onOpenNewRepair,
}) => {
  const { t, tv, formatDate } = useLanguage();
  const [priorityFilter, setPriorityFilter] = useState<'all' | PMPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRows, setShowAllRows] = useState(false);
  const [pmModalTarget, setPmModalTarget] = useState<MachineAnalytics | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [pmNote, setPmNote] = useState('');

  const pmCounts = useMemo(() => {
    let urgent = 0;
    let watch = 0;
    let normal = 0;
    for (const item of analytics) {
      if (item.pmPriority === 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ') urgent++;
      else if (item.pmPriority === 'ຄວນເຝົ້າລະວັງ') watch++;
      else normal++;
    }
    return { urgent, watch, normal };
  }, [analytics]);

  const filteredAnalytics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return analytics
      .filter((item) => {
        if (priorityFilter !== 'all' && item.pmPriority !== priorityFilter) {
          return false;
        }
        if (!q) return true;
        return (
          item.computer.assetTag.toLowerCase().includes(q) ||
          item.computer.name.toLowerCase().includes(q) ||
          item.computer.department.toLowerCase().includes(q) ||
          item.computer.assignedUser.toLowerCase().includes(q) ||
          (item.topCategory && item.topCategory.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const order: Record<PMPriority, number> = {
          'ຕ້ອງບຳລຸງຮັກສາດ່ວນ': 0,
          'ຄວນເຝົ້າລະວັງ': 1,
          'ປົກກະຕິ': 2,
        };
        if (order[a.pmPriority] !== order[b.pmPriority]) {
          return order[a.pmPriority] - order[b.pmPriority];
        }
        return b.totalRepairs - a.totalRepairs;
      });
  }, [analytics, priorityFilter, searchQuery]);

  const isFiltered = priorityFilter !== 'all' || searchQuery.trim() !== '';
  const displayedAnalytics =
    showAllRows || isFiltered ? filteredAnalytics : filteredAnalytics.slice(0, 20);

  const openPmModal = (item: MachineAnalytics) => {
    const initialChecks: Record<number, boolean> = {};
    item.pmChecklist.forEach((_, idx) => {
      initialChecks[idx] = true;
    });
    setCheckedItems(initialChecks);
    setPmNote('');
    setPmModalTarget(item);
  };

  const handleConfirmPm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmModalTarget) return;
    const completedList = pmModalTarget.pmChecklist.filter((_, idx) => checkedItems[idx]);
    const summaryText =
      pmNote.trim() ||
      `ກວດເຊັກ PM ຕາມແຜນສຳເລັດ (${completedList.length}/${pmModalTarget.pmChecklist.length} ລາຍການ): ${completedList.join(', ')}`;
    onCompletePm(pmModalTarget.computer, summaryText);
    setPmModalTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* 3-Column PM Status Summary Strip */}
      <section aria-label={t('ສະຫຼຸບສະຖານະ PM', 'PM Status Summary')} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() =>
            setPriorityFilter((prev) =>
              prev === 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ' ? 'all' : 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ'
            )
          }
          className={`text-left bg-white border rounded-xl p-5 transition-colors cursor-pointer ${
            priorityFilter === 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ'
              ? 'border-rose-400 ring-1 ring-rose-300'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-medium text-slate-500">{tv('ຕ້ອງບຳລຸງຮັກສາດ່ວນ')}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
              {pmCounts.urgent}
            </span>
            <span className="text-xs text-slate-500">
              {t('ຮອດຮອບ PM ຫຼື ສ້ອມຊ້ຳສູງ', 'PM overdue or frequent repairs')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setPriorityFilter((prev) =>
              prev === 'ຄວນເຝົ້າລະວັງ' ? 'all' : 'ຄວນເຝົ້າລະວັງ'
            )
          }
          className={`text-left bg-white border rounded-xl p-5 transition-colors cursor-pointer ${
            priorityFilter === 'ຄວນເຝົ້າລະວັງ'
              ? 'border-amber-400 ring-1 ring-amber-300'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-medium text-slate-500">{tv('ຄວນເຝົ້າລະວັງ')}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
              {pmCounts.watch}
            </span>
            <span className="text-xs text-slate-500">{t('ໃກ້ຮອບກວດເຊັກ PM', 'Approaching PM cycle')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setPriorityFilter((prev) => (prev === 'ປົກກະຕິ' ? 'all' : 'ປົກກະຕິ'))
          }
          className={`text-left bg-white border rounded-xl p-5 transition-colors cursor-pointer ${
            priorityFilter === 'ປົກກະຕິ'
              ? 'border-emerald-400 ring-1 ring-emerald-300'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-medium text-slate-500">{t('ສະຖານະປົກກະຕິ', 'Normal Status')}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {pmCounts.normal}
            </span>
            <span className="text-xs text-slate-500">
              {t(`ຈາກທັງໝົດ ${analytics.length} ເຄື່ອງ`, `of ${analytics.length} total units`)}
            </span>
          </div>
        </button>
      </section>

      {/* Per-Machine Summary & Preventive Maintenance Planner */}
      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t(
                'ສະຫຼຸບສະຖິຕິການສ້ອມແປງລາຍເຄື່ອງ ແລະ ແຜນບຳລຸງຮັກສາເຊີງປ້ອງກັນ (Preventive Maintenance)',
                'Per-Machine Repair Summary & Preventive Maintenance (PM) Planner'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'ລະບົບວິເຄາະຄວາມຖີ່ການເສຍ ແລະ ບັນຫາຊ້ຳຊ້ອນຂອງແຕ່ລະເຄື່ອງອັດຕະໂນມັດ ພ້ອມຄຳແນະນຳການກວດເຊັກລ່ວງໜ້າ',
                'Automatically analyzes failure frequency and recurring issues with preventive check recommendations'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onShowOnMap && (
              <button
                type="button"
                onClick={() => onShowOnMap()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('ເປີດແຜນຜັງ Map 701 B', 'Open Map 701 B')}</span>
              </button>
            )}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('ຄົ້ນຫາຊື່ຄອມ, ລະຫັດເຄື່ອງ, ພະແນກ...', 'Search name, asset tag, department...')}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 w-60"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: t('ທັງໝົດ', 'All') },
                  { id: 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ', label: t('ຮີບດ່ວນ', 'Urgent') },
                  { id: 'ຄວນເຝົ້າລະວັງ', label: t('ເຝົ້າລະວັງ', 'Watch') },
                  { id: 'ປົກກະຕິ', label: t('ປົກກະຕິ', 'Normal') },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPriorityFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    priorityFilter === tab.id
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

        {filteredAnalytics.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {t('ບໍ່ພົບເຄື່ອງທີ່ກົງກັບເງື່ອນໄຂການຄົ້ນຫາ', 'No matching computers found')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('ລອງປັບຄຳຄົ້ນຫາ ຫຼື ເລືອກຕົວກອງສະຖານະທັງໝົດ', 'Try adjusting your search or filter settings')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">{t('ເຄື່ອງ / ພະແນກ', 'Computer / Dept.')}</th>
                  <th className="py-3 px-3 text-right">{t('ສ້ອມແລ້ວ', 'Repairs')}</th>
                  <th className="py-3 px-3">{t('ບັນຫາຊ້ຳທີ່ພົບເລື້ອຍ', 'Top Recurring Issue')}</th>
                  <th className="py-3 px-3 text-right">{t('ອະໄຫຼ່ທີ່ປ່ຽນ', 'Parts')}</th>
                  <th className="py-3 px-3">{t('ກຳນົດ PM ຖັດໄປ', 'Next PM Due')}</th>
                  <th className="py-3 px-3">{t('ລະດັບຄວາມສ່ຽງ', 'Risk Level')}</th>
                  <th className="py-3 px-4">{t('ແຜນບຳລຸງຮັກສາທີ່ແນະນຳ', 'Recommended PM Plan')}</th>
                  <th className="py-3 px-4 text-right">{t('ຈັດການ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {displayedAnalytics.map((item) => (
                  <tr key={item.computer.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => onInspectMachine(item.computer.id)}
                        className="text-left group cursor-pointer"
                      >
                        <div className="font-mono font-semibold text-slate-900 group-hover:text-sky-700">
                          {item.computer.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          {item.computer.assetTag}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.computer.assignedUser
                            ? `${item.computer.department} · ${item.computer.assignedUser}`
                            : item.computer.department}
                        </div>
                      </button>
                    </td>

                    <td className="py-3.5 px-3 text-right align-top font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">
                        {item.totalRepairs} {t('ຄັ້ງ', '')}
                      </div>
                      {item.avgDaysBetweenFailures !== null && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t(`ສະເລ່ຍທຸກ ${item.avgDaysBetweenFailures} ວັນ`, `avg. every ${item.avgDaysBetweenFailures}d`)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      {item.topCategory ? (
                        <div>
                          <div className="font-medium text-slate-800">{tv(item.topCategory)}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                            {t(`ເກີດຊ້ຳ ${item.topCategoryCount} ຄັ້ງ`, `${item.topCategoryCount}x`)} ·{' '}
                            {t('ຫຼ້າສຸດ', 'Latest')} {formatDate(item.lastRepairDate)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">{t('ຍັງບໍ່ເຄີຍມີປະຫວັດເສຍ', 'No failure history')}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right align-top font-mono tabular-nums">
                      <div className="text-slate-900 font-medium">
                        {item.partsReplacedCount} {t('ລາຍການ', 'items')}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top font-mono tabular-nums">
                      {item.nextPmDueDate ? (
                        <>
                          <div className="text-slate-800 font-medium">
                            {formatDate(item.nextPmDueDate)}
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              item.daysUntilPmDue < 0
                                ? 'text-rose-700 font-semibold'
                                : item.daysUntilPmDue <= 21
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.daysUntilPmDue < 0
                              ? t(`ເກີນກຳນົດ ${Math.abs(item.daysUntilPmDue)} ວັນ`, `${Math.abs(item.daysUntilPmDue)}d overdue`)
                              : t(`ອີກ ${item.daysUntilPmDue} ວັນ`, `in ${item.daysUntilPmDue}d`)}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">{t('ຍັງບໍ່ໄດ້ກຳນົດ', 'Not scheduled')}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <PMPriorityText priority={item.pmPriority} />
                    </td>

                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <p className="text-slate-700 leading-relaxed">{item.pmRecommendation}</p>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPmModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title={t('ບັນທຶກການກວດເຊັກບຳລຸງຮັກສາເຊີງປ້ອງກັນ', 'Record preventive maintenance check')}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>{t('ເຮັດ PM', 'Log PM')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenNewRepair(item.computer.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title={t('ແຈ້ງສ້ອມເຄື່ອງນີ້', 'Log repair for this unit')}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>{t('ແຈ້ງສ້ອມ', 'Repair')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenReportForMachine(item.computer.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title={t('ອອກລາຍງານສະຫຼຸບເຄື່ອງນີ້', 'Generate machine summary report')}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isFiltered && filteredAnalytics.length > 20 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono tabular-nums">
                  {t(
                    `ກຳລັງສະແດງ ${displayedAnalytics.length} ຈາກທັງໝົດ ${filteredAnalytics.length} ເຄື່ອງ`,
                    `Showing ${displayedAnalytics.length} of ${filteredAnalytics.length} computers`
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllRows((v) => !v)}
                  className="font-medium text-sky-700 hover:underline cursor-pointer"
                >
                  {showAllRows
                    ? t('ຫຍໍ້ເຫຼືອ 20 ລາຍການທຳອິດ', 'Show top 20 only')
                    : t(`ສະແດງທັງໝົດ ${filteredAnalytics.length} ເຄື່ອງ`, `Show all ${filteredAnalytics.length}`)}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* PM Checklist Completion Modal */}
      {pmModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {t('ບັນທຶກການບຳລຸງຮັກສາເຊີງປ້ອງກັນ (PM)', 'Record Preventive Maintenance (PM)')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {pmModalTarget.computer.assetTag} · {pmModalTarget.computer.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPmModalTarget(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
              >
                {t('ປິດ', 'Close')}
              </button>
            </div>

            <form onSubmit={handleConfirmPm} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  {t('ລາຍການກວດເຊັກແນະນຳຕາມປະຫວັດອາການເສຍຂອງເຄື່ອງ:', 'Recommended PM Checklist:')}
                </p>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {pmModalTarget.pmChecklist.map((task, idx) => (
                    <label key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!checkedItems[idx]}
                        onChange={(e) =>
                          setCheckedItems((prev) => ({ ...prev, [idx]: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                      />
                      <span>{task}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t('ໝາຍເຫດຜົນການກວດເຊັກເພີ່ມເຕີມ', 'Additional Inspection Notes')}
                </label>
                <textarea
                  rows={3}
                  value={pmNote}
                  onChange={(e) => setPmNote(e.target.value)}
                  placeholder={t(
                    'ລະບຸຄ່າອຸນຫະພູມທີ່ວັດໄດ້, ສຸຂະພາບ SSD ຫຼື ຂໍ້ສັງເກດຫຼັງເຮັດ PM...',
                    'Record measured temperature, SSD health, or observations...'
                  )}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPmModalTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  {t('ຍົກເລີກ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  {t('ຢືນຢັນການເຮັດ PM ແລະ ອັບເດດຮອບຖັດໄປ', 'Confirm PM & Schedule Next Cycle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
