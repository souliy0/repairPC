import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppLang = 'lo' | 'en';

const LANG_STORAGE_KEY = 'repair_ledger_lang';

const EN_SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const EN_FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LAO_SHORT_MONTHS = [
  'ມ.ກ.', 'ກ.ພ.', 'ມີ.ນ.', 'ມ.ສ.', 'ພ.ພ.', 'ມິ.ຖ.',
  'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.',
];

const LAO_FULL_MONTH_NAMES = [
  'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
  'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ',
];

const VALUE_TRANSLATIONS_EN: Record<string, string> = {
  // AssetStatus
  'ໃຊ້ງານປົກກະຕິ': 'Normal',
  'ກຳລັງສ້ອມແປງ': 'Under Repair',
  'ລໍຖ້າອະໄຫຼ່': 'Waiting for Parts',
  'ປົດລະວາງ': 'Decommissioned',
  // RepairStatus
  'ລໍຖ້າກວດສອບ': 'Pending Inspection',
  'ກຳລັງດຳເນີນການ': 'In Progress',
  'ສ້ອມແປງສຳເລັດ': 'Completed',
  // PartStatus
  'ມີໃນສະຕອກ': 'In Stock',
  'ສັ່ງຊື້ແລ້ວ': 'Ordered',
  'ລໍຖ້າຕິດຕັ້ງ': 'Awaiting Install',
  'ຕິດຕັ້ງແລ້ວ': 'Installed',
  'ສົ່ງເຄລມປະກັນ': 'Warranty Claim',
  'ສົ່ງຄືນແລ້ວ': 'Returned',
  // PartAction
  'ປ່ຽນອະໄຫຼ່ໃໝ່': 'Replaced Part',
  'ສ້ອມບຳລຸງສະເພາະຈຸດ': 'Spot Maintenance',
  // PMPriority
  'ຕ້ອງບຳລຸງຮັກສາດ່ວນ': 'Urgent PM',
  'ຄວນເຝົ້າລະວັງ': 'Watch Closely',
  'ປົກກະຕິ': 'Normal',
  // Default Issue Categories
  'ຄວາມຮ້ອນ ແລະ ລະບົບລະບາຍຄວາມຮ້ອນ': 'Thermal & Cooling System',
  'ອຸປະກອນຈັດເກັບຂໍ້ມູນ (SSD/HDD)': 'Storage Devices (SSD/HDD)',
  'ໜ່ວຍຄວາມຈຳ (RAM/Mainboard)': 'Memory & Mainboard (RAM)',
  'ພະລັງງານ ແລະ ແບັດເຕີຣີ (PSU/Battery)': 'Power & Battery (PSU/UPS)',
  'ລະບົບປະຕິບັດການ ແລະ ຊອບແວ': 'OS & Software',
  'ໜ້າຈໍ ແລະ ອຸປະກອນຕໍ່ພ່ວງ': 'Display & Peripherals',
  // Zone names / departments / miscellaneous
  'ທີມ Tplus': 'Tplus Team',
  'ທີມ CCare': 'CCare Team',
  'ທີມ CCT': 'CCT Team',
  'ທີມ Tele': 'Tele Team',
  'ທີມ IVR (Back Office)': 'IVR Team (Back Office)',
  'ທີມ DC (Back Office)': 'DC Team (Back Office)',
  'ອື່ນໆ': 'Other',
  'ນອກໂຊນຫຼັກ / ອື່ນໆ': 'Other / Unassigned Zone',
  'ໃນສະຕອກ': 'In Stock',
  'ບໍ່ພົບຂໍ້ມູນເຄື່ອງ': 'Unknown Machine',
  // Stock items, categories & units
  'ຈໍ LCD': 'LCD Monitor',
  'ຫູຟັງ': 'Headset',
  'ຄອມພິວເຕີ': 'Computers',
  'ໜ້າຈໍ': 'Monitors',
  'ອຸປະກອນຕໍ່ພ່ວງ': 'Peripherals',
  'ອຸປະກອນເສີມ': 'Accessories',
  'ເຄື່ອງ': 'units',
  'ໜ່ວຍ': 'pcs',
  'ອັນ': 'pcs',
  'ແຜ່ນ': 'sheets',
  'ຊຸດ': 'sets',
};

interface LanguageContextValue {
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
  t: (lo: string, en: string) => string;
  tv: (value: string) => string;
  formatDate: (dateStr: string | null) => string;
  getMonthShort: (monthNumOrIdx: string | number) => string;
  getMonthFull: (monthNumOrIdx: string | number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLang>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'lo') return saved;
    } catch {
      // Ignore storage access errors
    }
    return 'lo';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }
    document.documentElement.lang = lang;
    document.title =
      lang === 'en'
        ? 'Computer Repair & Maintenance Ledger — RepairCom'
        : 'ລະບົບບັນທຶກການສ້ອມແປງຄອມພິວເຕີ — RepairCom';
  }, [lang]);

  const setLang = (next: AppLang) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'lo' ? 'en' : 'lo'));

  const t = (lo: string, en: string) => (lang === 'en' ? en : lo);

  const tv = (value: string) => {
    if (lang === 'lo') return value;
    return VALUE_TRANSLATIONS_EN[value] ?? value;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = lang === 'en' ? EN_SHORT_MONTHS : LAO_SHORT_MONTHS;
    const month = months[d.getMonth()] || '';
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const resolveMonthIdx = (monthNumOrIdx: string | number): number => {
    if (typeof monthNumOrIdx === 'number') return monthNumOrIdx;
    const n = Number(monthNumOrIdx);
    return Number.isNaN(n) ? 0 : Math.max(0, Math.min(11, n - 1));
  };

  const getMonthShort = (monthNumOrIdx: string | number) => {
    const idx = resolveMonthIdx(monthNumOrIdx);
    return lang === 'en' ? EN_SHORT_MONTHS[idx] || '' : LAO_SHORT_MONTHS[idx] || '';
  };

  const getMonthFull = (monthNumOrIdx: string | number) => {
    const idx = resolveMonthIdx(monthNumOrIdx);
    return lang === 'en' ? EN_FULL_MONTHS[idx] || '' : LAO_FULL_MONTH_NAMES[idx] || '';
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        tv,
        formatDate,
        getMonthShort,
        getMonthFull,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
