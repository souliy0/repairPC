import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  ShieldAlert,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { AssetStatus, PartStatus, PMPriority, RepairStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export const AssetStatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  const { tv } = useLanguage();
  switch (status) {
    case 'ໃຊ້ງານປົກກະຕິ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ກຳລັງສ້ອມແປງ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ລໍຖ້າອະໄຫຼ່':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ປົດລະວາງ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
  }
};

export const RepairStatusText: React.FC<{ status: RepairStatus }> = ({ status }) => {
  const { tv } = useLanguage();
  switch (status) {
    case 'ສ້ອມແປງສຳເລັດ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ກຳລັງດຳເນີນການ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 whitespace-nowrap">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ລໍຖ້າອະໄຫຼ່':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ລໍຖ້າກວດສອບ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
  }
};

export const PartStatusText: React.FC<{ status: PartStatus }> = ({ status }) => {
  const { tv } = useLanguage();
  switch (status) {
    case 'ມີໃນສະຕອກ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 whitespace-nowrap">
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ຕິດຕັ້ງແລ້ວ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ລໍຖ້າຕິດຕັ້ງ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 whitespace-nowrap">
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ສັ່ງຊື້ແລ້ວ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Truck className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ສົ່ງເຄລມປະກັນ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 whitespace-nowrap">
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
    case 'ສົ່ງຄືນແລ້ວ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(status)}</span>
        </span>
      );
  }
};

export const PMPriorityText: React.FC<{ priority: PMPriority }> = ({ priority }) => {
  const { tv } = useLanguage();
  switch (priority) {
    case 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(priority)}</span>
        </span>
      );
    case 'ຄວນເຝົ້າລະວັງ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(priority)}</span>
        </span>
      );
    case 'ປົກກະຕິ':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{tv(priority)}</span>
        </span>
      );
  }
};
