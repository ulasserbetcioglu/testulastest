// Dosya: src/data/environmentalRiskCategories.ts

export interface PestEnvRow {
  key: string;
  label: string;
  labelEn: string;
}

// Rapor Satırları (Zararlı Türleri)
export const PEST_ENV_ROWS: PestEnvRow[] = [
  { key: 'kemirgen', label: 'Kemirgenler', labelEn: 'Rodents' },
  { key: 'hamambocegi', label: 'Hamamböcekleri', labelEn: 'Cockroaches' },
  { key: 'sinek', label: 'Sinekler', labelEn: 'Flies' },
  { key: 'karinca', label: 'D.K. Karıncalar', labelEn: 'Ants' },
  { key: 'dk_bocek', label: 'D.K. Böcekler', labelEn: 'Stored Product Insects' }, // Depo zararlıları
  { key: 'kus', label: 'Kuşlar', labelEn: 'Birds' },
  { key: 'diger', label: 'Diğer Zararlılar', labelEn: 'Other Pests' },
];

// Veri Tipi: Her zararlı için 5 farklı puan
export interface EnvRowData {
  hygiene: number;    // Hijyen (1-3)
  insulation: number; // Yalıtım (1-3)
  storage: number;    // Depolama (1-3)
  monitoring: number; // Gözlem Noktaları (1-3)
  population: number; // Popülasyon (1-3)
}

export type EnvDataMap = Record<string, EnvRowData>;

export const getEmptyEnvData = (): EnvDataMap => {
  const data: EnvDataMap = {};
  PEST_ENV_ROWS.forEach(row => {
    data[row.key] = { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0 };
  });
  return data;
};

// --- HESAPLAMA FORMÜLÜ ---
// Skor = (Hijyen + Yalıtım + Depolama + Gözlem) * Popülasyon
export const calculateEnvScore = (d: EnvRowData) => {
  // Eğer veriler boşsa (0 ise) hesaplama yapma
  if (d.hygiene === 0 && d.population === 0) return 0;

  const envTotal = d.hygiene + d.insulation + d.storage + d.monitoring;
  return envTotal * d.population;
};

// --- RENK KODLARI (Skor Tablosuna Göre) ---
export const getEnvRiskColor = (score: number) => {
  if (score === 0) return { bg: '#ffffff', text: '#9ca3af', label: '-' };
  
  // 1-16 YOK / NO (Yeşil)
  if (score <= 16) return { bg: '#dcfce7', text: '#15803d', label: 'YOK / LOW' };
  
  // 17-27 ORTA / MEDIUM (Sarı/Turuncu)
  if (score <= 27) return { bg: '#fef9c3', text: '#a16207', label: 'ORTA / MED' };
  
  // 28-36 YÜKSEK / HIGH (Kırmızı)
  return { bg: '#fee2e2', text: '#b91c1c', label: 'YÜKSEK / HIGH' };
};

// Sütun Ortalamaları
export const getEnvAverages = (data: EnvDataMap) => {
  const keys = Object.keys(data);
  if (keys.length === 0) return { avgH: 0, avgI: 0, avgS: 0, avgM: 0, avgP: 0, avgScore: 0 };

  let totalH = 0, totalI = 0, totalS = 0, totalM = 0, totalP = 0, totalScore = 0;
  let count = 0;

  keys.forEach(k => {
    const d = data[k];
    // Sadece dolu satırları hesaba kat
    if (d.population > 0 || d.hygiene > 0) {
      totalH += d.hygiene;
      totalI += d.insulation;
      totalS += d.storage;
      totalM += d.monitoring;
      totalP += d.population;
      totalScore += calculateEnvScore(d);
      count++;
    }
  });

  if (count === 0) return { avgH: 0, avgI: 0, avgS: 0, avgM: 0, avgP: 0, avgScore: 0 };

  return {
    avgH: parseFloat((totalH / count).toFixed(1)),
    avgI: parseFloat((totalI / count).toFixed(1)),
    avgS: parseFloat((totalS / count).toFixed(1)),
    avgM: parseFloat((totalM / count).toFixed(1)),
    avgP: parseFloat((totalP / count).toFixed(1)),
    avgScore: parseFloat((totalScore / count).toFixed(1)),
  };
};