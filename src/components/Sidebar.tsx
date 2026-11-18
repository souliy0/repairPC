import React, { useRef } from 'react';
import {
  Activity,
  Camera,
  ClipboardCheck,
  Cpu,
  Download,
  FileSpreadsheet,
  ImagePlus,
  Map as MapIcon,
  Monitor,
  Package,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  counts: {
    machines: number;
    openRepairs: number;
    urgentPm: number;
    stockRemaining: number;
  };
  onExportJson: () => void;
  logoUrl: string | null;
  onChangeLogo: (dataUrl: string) => void;
  onResetLogo: () => void;
  onNotify?: (message: string) => void;
}

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml' || file.size <= 120 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const result = canvas.toDataURL('image/png');
        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };
    img.src = objectUrl;
  });
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  onExportJson,
  logoUrl,
  onChangeLogo,
  onResetLogo,
  onNotify,
}) => {
  const { t } = useLanguage();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify?.(
        t('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (.png, .jpg, .svg, .webp)', 'Please select an image file (.png, .jpg, .svg, .webp)')
      );
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChangeLogo(dataUrl);
    } catch {
      onNotify?.(t('ບໍ່ສາມາດອ່ານໄຟລ໌ຮູບໂລໂກ້ໄດ້', 'Unable to load logo image'));
    }
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    meta?: string;
  }[] = [
    {
      id: 'overview',
      label: t('ພາບລວມ & ແດດບອດ', 'Overview & Dashboard'),
      icon: <Activity className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'stock',
      label: t('ອະໄຫຼ່ໃນສະຕອກ', 'Spare Parts Stock'),
      icon: <Package className="w-4 h-4 shrink-0" />,
      meta: `${counts.stockRemaining}`,
    },
    {
      id: 'pm',
      label: t('ສະຫຼຸບລາຍເຄື່ອງ & ແຜນ PM', 'Machine Summary & PM'),
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      meta: counts.urgentPm > 0 ? t(`${counts.urgentPm} ດ່ວນ`, `${counts.urgentPm} urgent`) : undefined,
    },
    {
      id: 'floorplan',
      label: t('ແຜນຜັງທີ່ຕັ້ງ (Map 701 B)', 'Floor Plan (Map 701 B)'),
      icon: <MapIcon className="w-4 h-4 shrink-0" />,
      meta: `${counts.machines}`,
    },
    {
      id: 'equipment',
      label: t('ອຸປະກອນ ແລະ ສະເປັກເຄື່ອງ', 'Equipment & Specs'),
      icon: <Monitor className="w-4 h-4 shrink-0" />,
      meta: `${counts.machines}`,
    },
    {
      id: 'repairs',
      label: t('ປະຫວັດການແຈ້ງສ້ອມ', 'Repair History'),
      icon: <Wrench className="w-4 h-4 shrink-0" />,
      meta: counts.openRepairs > 0 ? t(`${counts.openRepairs} ຄ້າງ`, `${counts.openRepairs} open`) : undefined,
    },
    {
      id: 'files',
      label: t('Excel & ຕາຕະລາງຂໍ້ມູນ', 'Excel & Data Tables'),
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside className="no-print w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between min-h-screen">
      <div>
        <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              title={t('ຄລິກເພື່ອປ່ຽນຮູບໂລໂກ້', 'Click to change logo image')}
              aria-label={t('ປ່ຽນຮູບໂລໂກ້', 'Change logo image')}
              className={`group relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden cursor-pointer transition-all ${
                logoUrl
                  ? 'border border-slate-200 bg-slate-50'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="RepairCom logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Cpu className="w-4 h-4" />
              )}
              <span className="absolute inset-0 bg-slate-950/55 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </button>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              RepairCom
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              title={t('ປ່ຽນຮູບໂລໂກ້', 'Change logo image')}
              aria-label={t('ປ່ຽນຮູບໂລໂກ້', 'Change logo image')}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={onResetLogo}
                title={t('ໃຊ້ໂລໂກ້ເດີມ', 'Reset to default logo')}
                aria-label={t('ໃຊ້ໂລໂກ້ເດີມ', 'Reset to default logo')}
                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <nav className="p-3 space-y-1" aria-label={t('ເມນູຫຼັກ', 'Main navigation')}>
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.meta && (
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.meta}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onExportJson}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>{t('ສຳຮອງຂໍ້ມູນທັງໝົດ (JSON)', 'Backup All Data (JSON)')}</span>
        </button>
      </div>
    </aside>
  );
};
