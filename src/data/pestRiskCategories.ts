export interface PestType {
  key: string;
  label: string;
  labelEn: string;
}

export interface PestCategory {
  key: string;
  label: string;
  labelEn: string;
  pests: PestType[];
}

export const PEST_CATEGORIES: PestCategory[] = [
  {
    key: 'Kemirgenler',
    label: 'Kemirgenler',
    labelEn: 'Rodents',
    pests: [
      { key: 'fare', label: 'Fare', labelEn: 'Mouse' },
      { key: 'sican', label: 'Sican', labelEn: 'Rat' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'hamambocekleri',
    label: 'Hamambocekleri',
    labelEn: 'Cockroaches',
    pests: [
      { key: 'alman', label: 'Alman Hamambocegi', labelEn: 'German Cockroach' },
      { key: 'dogu', label: 'Dogu Hamambocegi', labelEn: 'Oriental Cockroach' },
      { key: 'amerikan', label: 'Amerikan Ham.', labelEn: 'American Cockroach' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'sinekler',
    label: 'Sinekler',
    labelEn: 'Flies',
    pests: [
      { key: 'karasinek', label: 'Karasinek', labelEn: 'House Fly' },
      { key: 'sivrisinek', label: 'Sivrisinek', labelEn: 'Mosquito' },
      { key: 'meyve_sin', label: 'Meyve Sin.', labelEn: 'Fruit Fly' },
      { key: 'kambur_sin', label: 'Kambur Sin.', labelEn: 'Humpback Fly' },
      { key: 'kucuk_sinek', label: 'Kucuk Sinek', labelEn: 'Small Fly' },
      { key: 'ari', label: 'Ari', labelEn: 'Bee' },
      { key: 'guve', label: 'Guve', labelEn: 'Moth' },
      { key: 'kinkanatli', label: 'Kinkanatli', labelEn: 'Beetle' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'dz_guveler',
    label: 'Depo Zararlıları Guveler',
    labelEn: 'S.P. Moths',
    pests: [
      { key: 'kuru_meyve', label: 'Kuru Meyve Guv.', labelEn: 'Dried Fruit Moth' },
      { key: 'degirmen', label: 'Degirmen Guv.', labelEn: 'Mill Moth' },
      { key: 'arpa', label: 'Arpa Guvesi', labelEn: 'Barley Moth' },
      { key: 'somonoz', label: 'Somonoz Guv.', labelEn: 'Semonoz Moth' },
      { key: 'un', label: 'Un Guvesi', labelEn: 'Flour Moth' },
      { key: 'tutun', label: 'Tutun Guvesi', labelEn: 'Tobacco Moth' },
      { key: 'kucuk_mum', label: 'Kucuk Mum Guv.', labelEn: 'Small Wax Moth' },
      { key: 'buyuk_mum', label: 'Buyuk Mum Guv.', labelEn: 'Large Wax Moth' },
      { key: 'kuru_incir', label: 'Kuru Incir Guv.', labelEn: 'Dried Fig Moth' },
      { key: 'patates', label: 'Patates Guvesi', labelEn: 'Potato Moth' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'dz_bitler',
    label: 'Depo Zararlıları Bitler',
    labelEn: 'S.P. Insects',
    pests: [
      { key: 'un_kirma', label: 'Un / Kirma Biti', labelEn: 'Flour/Grain Louse' },
      { key: 'bugday_misir', label: 'Bugday/Misir/Pirin', labelEn: 'Wheat/Corn/Rice' },
      { key: 'testereli', label: 'Testereli Bocek', labelEn: 'Saw-toothed Beetle' },
      { key: 'kuru_gida', label: 'Kuru Gida Boc.', labelEn: 'Dried Food Beetle' },
      { key: 'tohum', label: 'Tohum Bocekleri', labelEn: 'Seed Beetles' },
      { key: 'eskar', label: 'Eskar Bocekleri', labelEn: 'Grain Beetles' },
      { key: 'deri', label: 'Deri Bocekleri', labelEn: 'Leather Beetles' },
      { key: 'dermestidae', label: 'Dermestidae', labelEn: 'Dermestidae' },
      { key: 'hali', label: 'Hali Bocekleri', labelEn: 'Carpet Beetles' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'kuslar',
    label: 'Kuslar',
    labelEn: 'Birds',
    pests: [
      { key: 'serce', label: 'Serce', labelEn: 'Sparrow' },
      { key: 'guvercin', label: 'Guvercin', labelEn: 'Pigeon' },
      { key: 'kirlangic', label: 'Kirlangic', labelEn: 'Swallow' },
      { key: 'sigircik', label: 'Sigircik', labelEn: 'Starling' },
      { key: 'karga', label: 'Karga', labelEn: 'Crow' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
  {
    key: 'diger_zararlilar',
    label: 'Diger Zararlilar',
    labelEn: 'Other Pests',
    pests: [
      { key: 'karinca', label: 'Karinca', labelEn: 'Ant' },
      { key: 'kirkayak', label: 'Kirkayak', labelEn: 'Centipede' },
      { key: 'orumcek', label: 'Orumcek', labelEn: 'Spider' },
      { key: 'kulaga_kacan', label: 'Kulaga Kacan', labelEn: 'Earwig' },
      { key: 'tespih_bocegi', label: 'Tespih Bocegi', labelEn: 'Woodlouse' },
      { key: 'kertenkele', label: 'Kertenkele', labelEn: 'Lizard' },
      { key: 'akrep', label: 'Akrep', labelEn: 'Scorpion' },
      { key: 'yilan', label: 'Yilan', labelEn: 'Snake' },
      { key: 'diger', label: 'Diger', labelEn: 'Other' },
    ],
  },
];

export type PestDataMap = Record<string, Record<string, { pop: number; risk: number }>>;

export function getEmptyPestData(): PestDataMap {
  const data: PestDataMap = {};
  for (const cat of PEST_CATEGORIES) {
    data[cat.key] = {};
    for (const pest of cat.pests) {
      data[cat.key][pest.key] = { pop: 0, risk: 0 };
    }
  }
  return data;
}

export function getRiskScore(pop: number, risk: number): number {
  return pop * risk;
}

export function getRiskScoreColor(score: number): { bg: string; text: string } {
  if (score === 0) return { bg: '#FFFFFF', text: '#999999' };
  if (score <= 7) return { bg: '#C6EFCE', text: '#006100' };
  if (score <= 14) return { bg: '#FFEB9C', text: '#9C6500' };
  return { bg: '#FFC7CE', text: '#9C0006' };
}

export function getCategoryAverage(
  catData: Record<string, { pop: number; risk: number }> | undefined
): { avgPop: number; avgRisk: number; avgScore: number } {
  if (!catData) return { avgPop: 0, avgRisk: 0, avgScore: 0 };
  const entries = Object.values(catData).filter(p => p.pop > 0 || p.risk > 0);
  if (entries.length === 0) return { avgPop: 0, avgRisk: 0, avgScore: 0 };
  const sumPop = entries.reduce((s, p) => s + p.pop, 0);
  const sumRisk = entries.reduce((s, p) => s + p.risk, 0);
  const sumScore = entries.reduce((s, p) => s + p.pop * p.risk, 0);
  return {
    avgPop: Math.round((sumPop / entries.length) * 100) / 100,
    avgRisk: Math.round((sumRisk / entries.length) * 100) / 100,
    avgScore: Math.round((sumScore / entries.length) * 100) / 100,
  };
}
