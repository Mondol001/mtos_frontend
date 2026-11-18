import type { Mouja, MoujaMapItem, PricingSettings } from '../types';
import { buildApiUrl } from '../config/api';

export const DEFAULT_MOUJA_ID = 'sthal-nawhata-74';

export const BUILTIN_MOUJAS: Mouja[] = [
  {
    id: DEFAULT_MOUJA_ID,
    name: 'স্থল নওহাটা',
    jlNo: '৭৪',
    upazila: 'চৌহালী',
    district: 'সিরাজগঞ্জ',
    division: 'রাজশাহী',
    surveyTypes: ['CS', 'SA'],
    isBuiltIn: true,
  },
];

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  khatianPrice: 10,
  defaultMapPrice: 300,
  bkashNumber: '01841246223',
  bkashAccountType: 'Personal (Send Money)',
  unlockDurationMinutes: 10,
  khatianServiceEnabled: true,
  mapServiceEnabled: true,
};

export const BUILTIN_MOUJA_MAPS: MoujaMapItem[] = [
  {
    id: 'map-sthal-nawhata-cs-1',
    moujaId: DEFAULT_MOUJA_ID,
    moujaName: 'স্থল নওহাটা',
    jlNo: '৭৪',
    surveyType: 'CS',
    sheetNo: 'সিট নং ১',
    title: 'মৌজা স্থল নওহাটা — সিএস (CS) মৌজা ম্যাপ (সিট ১)',
    description:
      'উপজেলা চৌহালী, জেলা সিরাজগঞ্জ, জেএল নং ৭৪ এর সিএস জরিপের উচ্চ রেজোলিউশন মৌজা ম্যাপ কপি।',
    price: 300,
    imageUrl: buildApiUrl('/api/maps/preview/map-sthal-nawhata-cs-1'),
    isBuiltIn: true,
  },
  {
    id: 'map-sthal-nawhata-sa-1',
    moujaId: DEFAULT_MOUJA_ID,
    moujaName: 'স্থল নওহাটা',
    jlNo: '৭৪',
    surveyType: 'SA',
    sheetNo: 'সিট নং ১',
    title: 'মৌজা স্থল নওহাটা — এসএ (SA) মৌজা ম্যাপ (সিট ১)',
    description:
      'উপজেলা চৌহালী, জেলা সিরাজগঞ্জ, জেএল নং ৭৪ এর এসএ জরিপের পূর্ণাঙ্গ দাগ-চিহ্নিত মৌজা ম্যাপ।',
    price: 300,
    imageUrl: buildApiUrl('/api/maps/preview/map-sthal-nawhata-sa-1'),
    isBuiltIn: true,
  },
];
