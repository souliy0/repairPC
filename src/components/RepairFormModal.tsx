import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ComputerAsset,
  IssueCategory,
  PartAction,
  PartStatus,
  RepairRecord,
  RepairStatus,
  ReplacedPart,
} from '../types';
import { getTodayISO } from '../utils/analytics';

interface RepairFormModalProps {
  computers: ComputerAsset[];
  categories: string[];
  initialRepair: RepairRecord | null;
  defaultComputerId?: string;
  onAddCategory: (newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
  onClose: () => void;
  onSave: (
    repair: Omit<RepairRecord, 'id' | 'ticketCode'>,
    existingId?: string,
    newPart?: Omit<ReplacedPart, 'id' | 'repairId' | 'computerId'>
  ) => void;
}

export const RepairFormModal: React.FC<RepairFormModalProps> = ({
  computers,
  categories,
  initialRepair,
  defaultComputerId,
  onAddCategory,
  onDeleteCategory,
  onClose,
  onSave,
}) => {
  const { t, tv } = useLanguage();
  const today = getTodayISO();
  const [computerId, setComputerId] = useState(
    initialRepair?.computerId || defaultComputerId || computers[0]?.id || ''
  );
  const [reportedDate, setReportedDate] = useState(initialRepair?.reportedDate || today);
  const [reporter, setReporter] = useState(initialRepair?.reporter || '');
  const [technician, setTechnician] = useState(
    initialRepair?.technician || 'ທ້າວ ສົມຊາຍ ກິດຈະເລີນ'
  );
  const [category, setCategory] = useState<IssueCategory>(
    initialRepair?.category || categories[0] || ''
  );
  const [status, setStatus] = useState<RepairStatus>(
    initialRepair?.status || 'ກຳລັງດຳເນີນການ'
  );
  const [symptom, setSymptom] = useState(initialRepair?.symptom || '');
  const [rootCause, setRootCause] = useState(initialRepair?.rootCause || '');
  const [resolution, setResolution] = useState(initialRepair?.resolution || '');

  // Inline add new category state
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Optional inline part attachment
  const [attachPart, setAttachPart] = useState(false);
  const [partName, setPartName] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [partSerial, setPartSerial] = useState('');
  const [partAction, setPartAction] = useState<PartAction>('ປ່ຽນອະໄຫຼ່ໃໝ່');
  const [partStatus, setPartStatus] = useState<PartStatus>('ຕິດຕັ້ງແລ້ວ');
  const [partWarranty, setPartWarranty] = useState(12);
  const [partSupplier, setPartSupplier] = useState('');

  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setCategory(trimmed);
    setNewCategoryName('');
    setAddingCategory(false);
  };

  const handleDeleteSelectedCategory = () => {
    if (!category || !categories.includes(category)) return;
    onDeleteCategory(category);
    const remaining = categories.filter((c) => c !== category);
    setCategory(remaining[0] || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!computerId || !symptom.trim()) return;

    const newPart =
      attachPart && partName.trim()
        ? {
            partName: partName.trim(),
            partCategory: category,
            brandModel: brandModel.trim() || '-',
            serialNumber: partSerial.trim() || '-',
            action: partAction,
            status: partStatus,
            replacedDate: reportedDate,
            warrantyMonths: Number(partWarranty) || 0,
            supplier: partSupplier.trim() || '-',
          }
        : undefined;

    onSave(
      {
        computerId,
        reportedDate,
        reporter: reporter.trim() || 'ຜູ້ໃຊ້ງານ',
        technician: technician.trim() || 'ຝ່າຍ IT',
        category,
        status,
        symptom: symptom.trim(),
        rootCause: rootCause.trim(),
        resolution: resolution.trim(),
      },
      initialRepair?.id,
      newPart
    );
  };

  const allCategoryOptions = Array.from(
    new Set(category ? [...categories, category] : categories)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-slate-900">
            {initialRepair
              ? t(
                  `ແກ້ໄຂບັນທຶກວຽກສ້ອມແປງ (${initialRepair.ticketCode})`,
                  `Edit Repair Ticket (${initialRepair.ticketCode})`
                )
              : t(
                  'ບັນທຶກການແຈ້ງສ້ອມ ແລະ ຜົນການແກ້ໄຂບັນຫາ',
                  'Log Repair Ticket & Resolution'
                )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
          >
            {t('ປິດ', 'Close')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ເຄື່ອງທີ່ແຈ້ງສ້ອມ *', 'Computer / Equipment *')}
              </label>
              <select
                required
                value={computerId}
                onChange={(e) => setComputerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                {computers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.assetTag} — {c.name} ({c.assignedUser})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700">
                  {t('ໝວດໝູ່ບັນຫາ *', 'Issue Category *')}
                </label>
                <button
                  type="button"
                  onClick={() => setAddingCategory((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-800 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    {addingCategory ? t('ຍົກເລີກ', 'Cancel') : t('ເພີ່ມຫົວຂໍ້ໃໝ່', 'Add Category')}
                  </span>
                </button>
              </div>

              {addingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmNewCategory();
                      }
                    }}
                    placeholder={t('ພິມຊື່ໝວດໝູ່ບັນຫາໃໝ່...', 'Enter new category name...')}
                    className="flex-1 px-3 py-2 border border-sky-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    className="px-3 py-2 font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {t('ເພີ່ມ', 'Add')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    {allCategoryOptions.length === 0 ? (
                      <option value="">{t('ຍັງບໍ່ມີໝວດໝູ່', 'No categories')}</option>
                    ) : (
                      allCategoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {tv(cat)}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedCategory}
                    disabled={!category || !categories.includes(category)}
                    title={t('ລົບໝວດໝູ່ທີ່ເລືອກ', 'Delete selected category')}
                    aria-label={t('ລົບໝວດໝູ່ທີ່ເລືອກ', 'Delete selected category')}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('ລົບ', 'Delete')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ວັນທີແຈ້ງສ້ອມ', 'Reported Date')}
              </label>
              <input
                type="date"
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ສະຖານະວຽກສ້ອມ', 'Repair Status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RepairStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="ລໍຖ້າກວດສອບ">{tv('ລໍຖ້າກວດສອບ')}</option>
                <option value="ກຳລັງດຳເນີນການ">{tv('ກຳລັງດຳເນີນການ')}</option>
                <option value="ລໍຖ້າອະໄຫຼ່">{tv('ລໍຖ້າອະໄຫຼ່')}</option>
                <option value="ສ້ອມແປງສຳເລັດ">{tv('ສ້ອມແປງສຳເລັດ')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              {t('ອາການທີ່ແຈ້ງສ້ອມ *', 'Reported Symptom *')}
            </label>
            <textarea
              required
              rows={2}
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder={t(
                'ອະທິບາຍອາການຜິດປົກກະຕິທີ່ພົບ ເຊັ່ນ ຈໍຟ້າ, ດັບເອງ, ສຽງພັດລົມດັງ, ສາກບໍ່ເຂົ້າ...',
                'Describe the observed issue, e.g. BSOD, random shutdown, loud fan, not charging...'
              )}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ສາເຫດທີ່ກວດພົບ (Root Cause)', 'Root Cause')}
              </label>
              <textarea
                rows={3}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder={t(
                  'ຜົນການວິເຄາະສາເຫດ ເຊັ່ນ ຊິລິໂຄນແຫ້ງ / SSD Bad Block / ໄດຣເວີຂັດແຍ້ງ...',
                  'Diagnosis result, e.g. dry thermal paste / SSD bad blocks / driver conflict...'
                )}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ຜົນລັບການແກ້ໄຂບັນຫາ (Resolution)', 'Resolution')}
              </label>
              <textarea
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={t(
                  'ຂັ້ນຕອນການແກ້ໄຂ ແລະ ຜົນທົດສອບຫຼັງສ້ອມ...',
                  'Steps taken and post-repair test results...'
                )}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ຜູ້ແຈ້ງສ້ອມ', 'Reporter')}
              </label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder={t('ຊື່ຜູ້ໃຊ້ງານ', 'User name')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                {t('ຊ່າງຜູ້ຮັບຜິດຊອບ', 'Assigned Technician')}
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPart}
                onChange={(e) => setAttachPart(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              <span>
                {t(
                  'ເພີ່ມລາຍການອະໄຫຼ່ທີ່ປ່ຽນ / ສົ່ງເຄລມໃນໃບງານນີ້ນຳ',
                  'Attach replaced / warranty-claimed spare part to this ticket'
                )}
              </span>
            </label>

            {attachPart && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ຊື່ອະໄຫຼ່ *', 'Part Name *')}
                    </label>
                    <input
                      required={attachPart}
                      type="text"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      placeholder={t('ເຊັ່ນ ພັດລົມເຄສ / NVMe SSD', 'e.g. Case Fan / NVMe SSD')}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ຍີ່ຫໍ້ / ລຸ້ນ', 'Brand / Model')}
                    </label>
                    <input
                      type="text"
                      value={brandModel}
                      onChange={(e) => setBrandModel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={partSerial}
                      onChange={(e) => setPartSerial(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ປະເພດ', 'Action')}
                    </label>
                    <select
                      value={partAction}
                      onChange={(e) => setPartAction(e.target.value as PartAction)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                    >
                      <option value="ປ່ຽນອະໄຫຼ່ໃໝ່">{tv('ປ່ຽນອະໄຫຼ່ໃໝ່')}</option>
                      <option value="ສົ່ງເຄລມປະກັນ">{tv('ສົ່ງເຄລມປະກັນ')}</option>
                      <option value="ສ້ອມບຳລຸງສະເພາະຈຸດ">{tv('ສ້ອມບຳລຸງສະເພາະຈຸດ')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ສະຖານະອະໄຫຼ່', 'Part Status')}
                    </label>
                    <select
                      value={partStatus}
                      onChange={(e) => setPartStatus(e.target.value as PartStatus)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                    >
                      <option value="ມີໃນສະຕອກ">{tv('ມີໃນສະຕອກ')}</option>
                      <option value="ສັ່ງຊື້ແລ້ວ">{tv('ສັ່ງຊື້ແລ້ວ')}</option>
                      <option value="ລໍຖ້າຕິດຕັ້ງ">{tv('ລໍຖ້າຕິດຕັ້ງ')}</option>
                      <option value="ຕິດຕັ້ງແລ້ວ">{tv('ຕິດຕັ້ງແລ້ວ')}</option>
                      <option value="ສົ່ງເຄລມປະກັນ">{tv('ສົ່ງເຄລມປະກັນ')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ປະກັນ (ເດືອນ)', 'Warranty (mo)')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={partWarranty}
                      onChange={(e) => setPartWarranty(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      {t('ຮ້ານຄ້າ/ສູນ', 'Supplier')}
                    </label>
                    <input
                      type="text"
                      value={partSupplier}
                      onChange={(e) => setPartSupplier(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              {t('ຍົກເລີກ', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {initialRepair
                ? t('ບັນທຶກການແກ້ໄຂວຽກສ້ອມ', 'Save Ticket Changes')
                : t('ບັນທຶກໃບງານສ້ອມ', 'Create Repair Ticket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
