import React, { useMemo, useState } from 'react';
import {
  Download,
  Headphones,
  Keyboard,
  LayoutGrid,
  Minus,
  Monitor,
  Mouse,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { StockPartItem } from '../types';
import { getTodayISO } from '../utils/analytics';
import { downloadCsvRows } from '../utils/fileImportExport';

interface StockPartsViewProps {
  stockParts: StockPartItem[];
  onSaveStockPart: (
    payload: Omit<StockPartItem, 'id' | 'updatedAt'>,
    existingId?: string
  ) => void;
  onAdjustStockPart: (
    id: string,
    action: 'use' | 'restock' | 'return'
  ) => void;
  onDeleteStockPart: (id: string) => void;
  onNotify: (message: string) => void;
}

const DEFAULT_UNITS = ['ເຄື່ອງ', 'ໜ່ວຍ', 'ອັນ', 'ແຜ່ນ', 'ຊຸດ'];
const DEFAULT_STOCK_CATEGORIES = [
  'ຄອມພິວເຕີ',
  'ໜ້າຈໍ',
  'ອຸປະກອນຕໍ່ພ່ວງ',
  'ອຸປະກອນເສີມ',
  'ອະໄຫຼ່ພາຍໃນ',
];

function getItemIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('mouse')) return <Mouse className="w-4 h-4" />;
  if (lower.includes('sticker')) return <Tag className="w-4 h-4" />;
  if (lower.includes('keyboard')) return <Keyboard className="w-4 h-4" />;
  if (lower.includes('ຫູຟັງ') || lower.includes('head')) {
    return <Headphones className="w-4 h-4" />;
  }
  if (lower.includes('lcd') || lower.includes('pc') || lower.includes('ຈໍ')) {
    return <Monitor className="w-4 h-4" />;
  }
  return <Package className="w-4 h-4" />;
}

export const StockPartsView: React.FC<StockPartsViewProps> = ({
  stockParts,
  onSaveStockPart,
  onAdjustStockPart,
  onDeleteStockPart,
  onNotify,
}) => {
  const { t, tv, formatDate } = useLanguage();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockPartItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('ອຸປະກອນຕໍ່ພ່ວງ');
  const [formTotal, setFormTotal] = useState<string>('0');
  const [formRemaining, setFormRemaining] = useState<string>('0');
  const [formUnit, setFormUnit] = useState('ໜ່ວຍ');
  const [formNotes, setFormNotes] = useState('');
  const [remainingTouched, setRemainingTouched] = useState(false);

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState<StockPartItem | null>(null);

  const categoriesList = useMemo(() => {
    const set = new Set<string>(DEFAULT_STOCK_CATEGORIES);
    for (const item of stockParts) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [stockParts]);

  const totals = useMemo(() => {
    let totalAll = 0;
    let totalRemaining = 0;
    let outOfStockCount = 0;
    for (const item of stockParts) {
      totalAll += item.totalQuantity;
      totalRemaining += item.remainingQuantity;
      if (item.totalQuantity > 0 && item.remainingQuantity === 0) {
        outOfStockCount++;
      }
    }
    const totalUsed = Math.max(0, totalAll - totalRemaining);
    return {
      itemCount: stockParts.length,
      totalAll,
      totalRemaining,
      totalUsed,
      outOfStockCount,
    };
  }, [stockParts]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockParts.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        tv(item.name).toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        tv(item.category).toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    });
  }, [stockParts, categoryFilter, search, tv]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('ອຸປະກອນຕໍ່ພ່ວງ');
    setFormTotal('0');
    setFormRemaining('0');
    setFormUnit('ໜ່ວຍ');
    setFormNotes('');
    setRemainingTouched(false);
    setModalOpen(true);
  };

  const openEditModal = (item: StockPartItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormTotal(String(item.totalQuantity));
    setFormRemaining(String(item.remainingQuantity));
    setFormUnit(item.unit);
    setFormNotes(item.notes || '');
    setRemainingTouched(true);
    setModalOpen(true);
  };

  const handleTotalInputChange = (val: string) => {
    setFormTotal(val);
    if (!editingItem && !remainingTouched) {
      setFormRemaining(val);
    }
  };

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) return;

    const parsedTotal = Math.max(0, Math.floor(Number(formTotal) || 0));
    const parsedRemaining = Math.max(0, Math.floor(Number(formRemaining) || 0));
    const finalTotal = Math.max(parsedTotal, parsedRemaining);
    const finalRemaining = Math.min(parsedRemaining, finalTotal);

    onSaveStockPart(
      {
        name: cleanName,
        category: formCategory.trim() || 'ອື່ນໆ',
        totalQuantity: finalTotal,
        remainingQuantity: finalRemaining,
        unit: formUnit.trim() || 'ໜ່ວຍ',
        notes: formNotes.trim(),
      },
      editingItem?.id
    );
    setModalOpen(false);
  };

  const handleExportStockCsv = () => {
    const header = [
      t('ຊື່ອະໄຫຼ່', 'Item Name'),
      t('ໝວດໝູ່', 'Category'),
      t('ຈຳນວນທັງໝົດ', 'Total Quantity'),
      t('ໃຊ້ແລ້ວ', 'Used Quantity'),
      t('ຍັງເຫຼືອ', 'Remaining Quantity'),
      t('ໜ່ວຍນັບ', 'Unit'),
      t('ໝາຍເຫດ', 'Notes'),
      t('ອັບເດດຫຼ້າສຸດ', 'Last Updated'),
    ];
    const rows = stockParts.map((item) => [
      tv(item.name),
      tv(item.category),
      item.totalQuantity,
      Math.max(0, item.totalQuantity - item.remainingQuantity),
      item.remainingQuantity,
      tv(item.unit),
      item.notes || '',
      item.updatedAt || '',
    ]);
    downloadCsvRows(`stock-parts-${getTodayISO()}.csv`, [header, ...rows]);
    onNotify(t('ດາວໂຫຼດຕາຕະລາງສະຕອກອະໄຫຼ່ (.csv) ແລ້ວ', 'Downloaded spare parts stock (.csv)'));
  };

  const renderStockStatusBadge = (item: StockPartItem) => {
    if (item.totalQuantity === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
          {t('ຍັງບໍ່ລະບຸຈຳນວນ', 'Not Set')}
        </span>
      );
    }
    if (item.remainingQuantity === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          {t('ໝົດສະຕອກ', 'Out of Stock')}
        </span>
      );
    }
    if (item.remainingQuantity <= 2 || item.remainingQuantity / item.totalQuantity <= 0.25) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          {t('ໃກ້ໝົດ', 'Low Stock')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        {t('ພ້ອມໃຊ້ງານ', 'In Stock')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 3-Column KPI Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t('ລາຍການອະໄຫຼ່ໃນສະຕອກ', 'Spare Part Categories')}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.itemCount}
            </span>
            <span className="text-xs text-slate-500">{t('ລາຍການທັງໝົດ', 'tracked items')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t('ຈຳນວນທັງໝົດໃນສະຕອກ (Total)', 'Total Stock Quantity')}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.totalAll}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {t(`ເບີກໃຊ້ແລ້ວ ${totals.totalUsed}`, `Issued ${totals.totalUsed}`)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {t('ຈຳນວນທີ່ຍັງເຫຼືອ (Remaining)', 'Remaining Available')}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {totals.totalRemaining}
            </span>
            <span
              className={`text-xs font-mono tabular-nums ${
                totals.outOfStockCount > 0 ? 'text-rose-700 font-medium' : 'text-slate-500'
              }`}
            >
              {totals.outOfStockCount > 0
                ? t(`ໝົດສະຕອກ ${totals.outOfStockCount} ລາຍການ`, `${totals.outOfStockCount} out of stock`)
                : t('ພ້ອມເບີກໃຊ້ງານ', 'Ready to issue')}
            </span>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ຄົ້ນຫາຊື່ອະໄຫຼ່...', 'Search spare parts...')}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={t('ກອງຕາມໝວດໝູ່', 'Filter by category')}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
          >
            <option value="all">{t('ທຸກໝວດໝູ່', 'All Categories')}</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {tv(cat)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('ກາດສະຕອກ', 'Cards')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>{t('ຕາຕະລາງ', 'Table')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportStockCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('ດາວໂຫຼດ CSV', 'Export CSV')}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ເພີ່ມອະໄຫຼ່ໃນສະຕອກ', 'Add Stock Item')}</span>
          </button>
        </div>
      </div>

      {/* Items List: Cards or Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
          {t('ບໍ່ພົບລາຍການອະໄຫຼ່ທີ່ຄົ້ນຫາ', 'No matching spare parts found')}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const usedQty = Math.max(0, item.totalQuantity - item.remainingQuantity);
            const pct =
              item.totalQuantity > 0
                ? Math.round((item.remainingQuantity / item.totalQuantity) * 100)
                : 0;
            const barColor =
              item.totalQuantity === 0
                ? 'bg-slate-300'
                : item.remainingQuantity === 0
                ? 'bg-rose-500'
                : pct <= 25
                ? 'bg-amber-500'
                : 'bg-emerald-600';

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        {getItemIcon(item.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {tv(item.name)}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {tv(item.category)}
                        </p>
                      </div>
                    </div>
                    {renderStockStatusBadge(item)}
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 mt-2.5 line-clamp-2">
                      {item.notes}
                    </p>
                  )}

                  {/* Total / Used / Remaining Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {t('ຈຳນວນທັງໝົດ', 'Total')}
                      </div>
                      <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                        {item.totalQuantity}
                      </div>
                      <div className="text-[10px] text-slate-400">{tv(item.unit)}</div>
                    </div>

                    <div className="border-x border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {t('ເບີກໃຊ້ແລ້ວ', 'Used')}
                      </div>
                      <div className="text-base font-bold text-slate-600 font-mono tabular-nums mt-0.5">
                        {usedQty}
                      </div>
                      <div className="text-[10px] text-slate-400">{tv(item.unit)}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {t('ຍັງເຫຼືອ', 'Remaining')}
                      </div>
                      <div
                        className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                          item.totalQuantity === 0
                            ? 'text-slate-500'
                            : item.remainingQuantity === 0
                            ? 'text-rose-700'
                            : pct <= 25
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.remainingQuantity}
                      </div>
                      <div className="text-[10px] text-slate-400">{tv(item.unit)}</div>
                    </div>
                  </div>

                  {/* Stock Ratio Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                      <span>{t('ອັດຕາຄົງເຫຼືອ', 'Remaining Ratio')}</span>
                      <span>{item.totalQuantity > 0 ? `${pct}%` : '—'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAdjustStockPart(item.id, 'use')}
                      disabled={item.remainingQuantity <= 0}
                      title={t('ເບີກໃຊ້ 1 ໜ່ວຍ (ຫຼຸດຍັງເຫຼືອ)', 'Issue 1 unit (reduce remaining)')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-md cursor-pointer whitespace-nowrap"
                    >
                      <Minus className="w-3 h-3" />
                      <span>{t('ເບີກໃຊ້', 'Use 1')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAdjustStockPart(item.id, 'restock')}
                      title={t('ເຕີມສະຕອກ +1 (ເພີ່ມທັງໝົດ & ຍັງເຫຼືອ)', 'Restock +1 (adds to total & remaining)')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('ເຕີມ +1', 'Add +1')}</span>
                    </button>

                    {item.remainingQuantity < item.totalQuantity && (
                      <button
                        type="button"
                        onClick={() => onAdjustStockPart(item.id, 'return')}
                        title={t('ຄືນເຂົ້າສະຕອກ +1', 'Return 1 to stock')}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('ຄືນ', 'Return')}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>{t('ແກ້ໄຂ', 'Edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      title={t('ລົບລາຍການ', 'Delete item')}
                      aria-label={t('ລົບລາຍການ', 'Delete item')}
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">{t('ຊື່ອະໄຫຼ່ / ອຸປະກອນ', 'Item Name')}</th>
                  <th className="py-3 px-4">{t('ໝວດໝູ່', 'Category')}</th>
                  <th className="py-3 px-4 text-right">{t('ຈຳນວນທັງໝົດ', 'Total')}</th>
                  <th className="py-3 px-4 text-right">{t('ເບີກໃຊ້ແລ້ວ', 'Used')}</th>
                  <th className="py-3 px-4 text-right">{t('ຍັງເຫຼືອ', 'Remaining')}</th>
                  <th className="py-3 px-4">{t('ສະຖານະ', 'Status')}</th>
                  <th className="py-3 px-4">{t('ອັບເດດຫຼ້າສຸດ', 'Updated')}</th>
                  <th className="py-3 px-4 text-right">{t('ຈັດການ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const usedQty = Math.max(0, item.totalQuantity - item.remainingQuantity);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-500">{getItemIcon(item.name)}</span>
                          <div>
                            <div className="font-semibold text-slate-900">{tv(item.name)}</div>
                            {item.notes && (
                              <div className="text-[11px] text-slate-500">{item.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {tv(item.category)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {item.totalQuantity} {tv(item.unit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {usedQty} {tv(item.unit)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          item.totalQuantity === 0
                            ? 'text-slate-500'
                            : item.remainingQuantity === 0
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {item.remainingQuantity} {tv(item.unit)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStockStatusBadge(item)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {item.updatedAt ? formatDate(item.updatedAt) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAdjustStockPart(item.id, 'use')}
                            disabled={item.remainingQuantity <= 0}
                            className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 rounded cursor-pointer"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdjustStockPart(item.id, 'restock')}
                            className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded cursor-pointer"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            {t('ແກ້ໄຂ', 'Edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="p-1 text-slate-400 hover:text-rose-700 rounded cursor-pointer"
                            aria-label={t('ລົບ', 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Stock Part Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingItem
                  ? t(`ແກ້ໄຂສະຕອກ: ${tv(editingItem.name)}`, `Edit Stock: ${tv(editingItem.name)}`)
                  : t('ເພີ່ມອະໄຫຼ່ໃໝ່ໃນສະຕອກ', 'Add New Spare Part to Stock')}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ຊື່ອະໄຫຼ່ / ອຸປະກອນ *', 'Item Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('ຕົວຢ່າງ: ຈໍ LCD, Mouse, Keyboard...', 'e.g. LCD Monitor, Mouse, Keyboard...')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {t('ໝວດໝູ່', 'Category')}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {tv(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {t('ໜ່ວຍນັບ', 'Unit')}
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {tv(u)} ({u})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {t('ຈຳນວນທັງໝົດ (Total)', 'Total Quantity')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formTotal}
                    onChange={(e) => handleTotalInputChange(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {t('ຈຳນວນທີ່ຍັງເຫຼືອ (Remaining)', 'Remaining Quantity')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formRemaining}
                    onChange={(e) => {
                      setRemainingTouched(true);
                      setFormRemaining(e.target.value);
                    }}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ໝາຍເຫດ', 'Notes')}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={t('ລາຍລະອຽດເພີ່ມເຕີມ (ຖ້າມີ)...', 'Optional notes...')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  {t('ຍົກເລີກ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                >
                  {t('ບັນທຶກສະຕອກ', 'Save Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {t('ຢືນຢັນການລົບອະໄຫຼ່ໃນສະຕອກ?', 'Confirm Delete Stock Item?')}
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('ທ່ານຕ້ອງການລົບລາຍການ', 'Are you sure you want to delete')}{' '}
              <span className="font-semibold text-slate-900">"{tv(deleteTarget.name)}"</span>{' '}
              {t('ອອກຈາກສະຕອກແທ້ບໍ?', 'from stock?')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                {t('ຍົກເລີກ', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStockPart(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                {t('ຢືນຢັນລົບ', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
