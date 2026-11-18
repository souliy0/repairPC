import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AssetStatus, ComputerAsset, DeviceType } from '../types';

interface ComputerFormModalProps {
  initialComputer: ComputerAsset | null;
  onClose: () => void;
  onSave: (computer: Omit<ComputerAsset, 'id'>, existingId?: string) => void;
  onDelete?: (computer: ComputerAsset) => void;
}

export const ComputerFormModal: React.FC<ComputerFormModalProps> = ({
  initialComputer,
  onClose,
  onSave,
  onDelete,
}) => {
  const { t, tv } = useLanguage();
  const [assetTag, setAssetTag] = useState(initialComputer?.assetTag || '');
  const [name, setName] = useState(initialComputer?.name || '');
  const [floorZone, setFloorZone] = useState<string>(initialComputer?.floorZone || 'CCT');
  const [hasUps, setHasUps] = useState<boolean>(initialComputer?.hasUps || false);
  const [type, setType] = useState<DeviceType>(initialComputer?.type || 'Desktop');
  const [department, setDepartment] = useState(initialComputer?.department || '');
  const [assignedUser, setAssignedUser] = useState(initialComputer?.assignedUser || '');
  const [location, setLocation] = useState(initialComputer?.location || '');
  const [purchaseDate, setPurchaseDate] = useState(initialComputer?.purchaseDate || '');
  const [status, setStatus] = useState<AssetStatus>(initialComputer?.status || 'ໃຊ້ງານປົກກະຕິ');
  const [lastPmDate, setLastPmDate] = useState(initialComputer?.lastPmDate || '');
  const [pmIntervalDays, setPmIntervalDays] = useState(initialComputer?.pmIntervalDays || 180);
  const [notes, setNotes] = useState(initialComputer?.notes || '');

  const [cpu, setCpu] = useState(initialComputer?.specs.cpu || '');
  const [ram, setRam] = useState(initialComputer?.specs.ram || '');
  const [storage, setStorage] = useState(initialComputer?.specs.storage || '');
  const [gpu, setGpu] = useState(initialComputer?.specs.gpu || '');
  const [motherboardOrModel, setMotherboardOrModel] = useState(
    initialComputer?.specs.motherboardOrModel || ''
  );
  const [psuOrBattery, setPsuOrBattery] = useState(
    initialComputer?.specs.psuOrBattery || ''
  );
  const [os, setOs] = useState(initialComputer?.specs.os || '');
  const [serialNumber, setSerialNumber] = useState(
    initialComputer?.specs.serialNumber || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetTag.trim() || !name.trim()) return;

    onSave(
      {
        assetTag: assetTag.trim(),
        name: name.trim(),
        ipAddress: initialComputer?.ipAddress || '—',
        floorZone: floorZone || 'ອື່ນໆ',
        hasUps,
        mapPosition: initialComputer?.mapPosition ?? {
          x: 48,
          y: 82,
          w: 3.65,
          h: 5.45,
        },
        type,
        department: department.trim() || `ທີມ ${floorZone || 'ທົ່ວໄປ'}`,
        assignedUser: assignedUser.trim(),
        location: location.trim() || `ຫ້ອງ 701 B · ໂຊນ ${floorZone}`,
        purchaseDate,
        warrantyExpiry: '',
        status,
        lastPmDate,
        pmIntervalDays: Number(pmIntervalDays) || 180,
        notes: notes.trim() || undefined,
        specs: {
          cpu: cpu.trim(),
          ram: ram.trim(),
          storage: storage.trim(),
          gpu: gpu.trim(),
          motherboardOrModel: motherboardOrModel.trim(),
          psuOrBattery: psuOrBattery.trim(),
          os: os.trim(),
          serialNumber: serialNumber.trim(),
        },
      },
      initialComputer?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-slate-900">
            {initialComputer
              ? t(
                  `ແກ້ໄຂຂໍ້ມູນອຸປະກອນ (${initialComputer.assetTag})`,
                  `Edit Equipment (${initialComputer.assetTag})`
                )
              : t(
                  'ລົງທະບຽນອຸປະກອນ ແລະ ສະເປັກໃໝ່',
                  'Register New Equipment & Specs'
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto text-xs">
          <div>
            <h4 className="font-semibold text-slate-800 mb-3 pb-1 border-b border-slate-100">
              {t('ຂໍ້ມູນທົ່ວໄປ ແລະ ຜູ້ໃຊ້ງານ', 'General Information & User')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ລະຫັດເຄື່ອງ (Asset Tag) *', 'Asset Tag *')}
                </label>
                <input
                  required
                  type="text"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder={t('ເຊັ່ນ PC-ENG-002', 'e.g. PC-ENG-002')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ຊື່ເຄື່ອງ / ລຸ້ນ *', 'Computer Name / Model *')}
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('ເຊັ່ນ Engineering Workstation #02', 'e.g. Engineering Workstation #02')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('ປະເພດ', 'Device Type')}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DeviceType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  <option value="Desktop">Desktop</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Workstation">Workstation</option>
                  <option value="Server">Server</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('ພະແນກ', 'Department')}</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={t('ເຊັ່ນ ວິສະວະກຳ', 'e.g. Engineering')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ຜູ້ຖືຄອງ / ຜູ້ໃຊ້ງານ', 'Assigned User')}
                </label>
                <input
                  type="text"
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  placeholder={t('ຊື່-ນາມສະກຸນ', 'Full Name')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('ສະຖານທີ່ຕັ້ງ', 'Location')}</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('ຊັ້ນ / ຫ້ອງ', 'Floor / Room')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ໂຊນ / ທີມໃນແຜນຜັງ', 'Floor Plan Zone / Team')}
                </label>
                <select
                  value={floorZone}
                  onChange={(e) => setFloorZone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  <option value="Tplus">Tplus</option>
                  <option value="CCare">CCare</option>
                  <option value="CCT">CCT</option>
                  <option value="Tele">Tele</option>
                  <option value="IVR">IVR</option>
                  <option value="DC">DC</option>
                  <option value="ອື່ນໆ">{tv('ອື່ນໆ')}</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">{t('ສະຖານະເຄື່ອງ', 'Status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssetStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  <option value="ໃຊ້ງານປົກກະຕິ">{tv('ໃຊ້ງານປົກກະຕິ')}</option>
                  <option value="ກຳລັງສ້ອມແປງ">{tv('ກຳລັງສ້ອມແປງ')}</option>
                  <option value="ລໍຖ້າອະໄຫຼ່">{tv('ລໍຖ້າອະໄຫຼ່')}</option>
                  <option value="ປົດລະວາງ">{tv('ປົດລະວາງ')}</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ຮອບເຮັດ PM (ວັນ)', 'PM Interval (days)')}
                </label>
                <input
                  type="number"
                  min={30}
                  step={30}
                  value={pmIntervalDays}
                  onChange={(e) => setPmIntervalDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div className="sm:col-span-2 flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasUps}
                    onChange={(e) => setHasUps(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span>
                    {t(
                      'ມີເຄື່ອງສຳຮອງໄຟ (UPS) — ສາມາດລາກຍ້າຍ ແລະ ໝູນຕຳແໜ່ງໃນແຜນຜັງໄດ້ອິດສະລະ',
                      'Has UPS Backup — Position and rotation can be adjusted freely on the floor plan'
                    )}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-3 pb-1 border-b border-slate-100">
              {t('ຂໍ້ມູນສະເປັກຮາດແວ ແລະ ຊອບແວ', 'Hardware & Software Specifications')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 mb-1">CPU</label>
                <input
                  type="text"
                  value={cpu}
                  onChange={(e) => setCpu(e.target.value)}
                  placeholder={t('ເຊັ່ນ Intel Core i7-14700', 'e.g. Intel Core i7-14700')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">RAM</label>
                <input
                  type="text"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  placeholder={t('ເຊັ່ນ 32GB DDR5-5600', 'e.g. 32GB DDR5-5600')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Storage (SSD/HDD)</label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder={t('ເຊັ່ນ 1TB Samsung 990 Pro NVMe', 'e.g. 1TB Samsung 990 Pro NVMe')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('GPU / ກາດຈໍ', 'GPU / Graphics')}
                </label>
                <input
                  type="text"
                  value={gpu}
                  onChange={(e) => setGpu(e.target.value)}
                  placeholder={t('ເຊັ່ນ NVIDIA RTX 4070 12GB', 'e.g. NVIDIA RTX 4070 12GB')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ເມນບອດ / ລຸ້ນໂນດບຸກ', 'Motherboard / Laptop Model')}
                </label>
                <input
                  type="text"
                  value={motherboardOrModel}
                  onChange={(e) => setMotherboardOrModel(e.target.value)}
                  placeholder={t('ເຊັ່ນ ASUS TUF B760M-Plus', 'e.g. ASUS TUF B760M-Plus')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('PSU / ແບັດເຕີຣີ', 'PSU / Battery')}
                </label>
                <input
                  type="text"
                  value={psuOrBattery}
                  onChange={(e) => setPsuOrBattery(e.target.value)}
                  placeholder={t('ເຊັ່ນ Corsair RM750e / 65Wh', 'e.g. Corsair RM750e / 65Wh')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ລະບົບປະຕິບັດການ (OS)', 'Operating System (OS)')}
                </label>
                <input
                  type="text"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('Serial Number ຫູຟັງ', 'Headset Serial Number')}
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder={t('S/N ຫູຟັງ', 'Headset S/N')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ວັນທີຈັດຊື້', 'Purchase Date')}
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {t('ວັນທີເຮັດ PM ຫຼ້າສຸດ', 'Last PM Date')}
                </label>
                <input
                  type="date"
                  value={lastPmDate}
                  onChange={(e) => setLastPmDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              {t('ໝາຍເຫດເພີ່ມເຕີມ', 'Additional Notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'ຂໍ້ຄວນລະວັງໃນການໃຊ້ງານ ຫຼື ການບຳລຸງຮັກສາສະເພາະເຄື່ອງ...',
                'Special usage or maintenance notes for this unit...'
              )}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div>
              {initialComputer && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(initialComputer)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 font-medium text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('ລົບອຸປະກອນນີ້', 'Delete Equipment')}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                {initialComputer
                  ? t('ບັນທຶກການແກ້ໄຂສະເປັກ', 'Save Spec Changes')
                  : t('ເພີ່ມອຸປະກອນເຂົ້າທະບຽນ', 'Register Equipment')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
