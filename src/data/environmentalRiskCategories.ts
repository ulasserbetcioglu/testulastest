// src/data/environmentalRiskCategories.ts

export interface EnvRowData {
  hygiene: number;
  insulation: number;
  storage: number;
  monitoring: number;
  population: number;
}

export type EnvDataMap = Record<string, EnvRowData>;

export interface PestEnvRow {
  key: string;
  label: string;
  labelEn: string;
}

export const PEST_ENV_ROWS: PestEnvRow[] = [
  { key: 'cockroach', label: 'Hamam Böceği', labelEn: 'Cockroach' },
  { key: 'rodent', label: 'Kemirgen (Fare/Sıçan)', labelEn: 'Rodent' },
  { key: 'ant', label: 'Karınca', labelEn: 'Ant' },
  { key: 'fly', label: 'Sinek', labelEn: 'Fly' },
  { key: 'mosquito', label: 'Sivrisinek', labelEn: 'Mosquito' },
  { key: 'moth', label: 'Güve', labelEn: 'Moth' },
  { key: 'spider', label: 'Örümcek', labelEn: 'Spider' },
  { key: 'silverfish', label: 'Gümüş Balığı', labelEn: 'Silverfish' },
  { key: 'flea', label: 'Pire', labelEn: 'Flea' },
  { key: 'tick', label: 'Kene', labelEn: 'Tick' },
  { key: 'bedbug', label: 'Tahtakurusu', labelEn: 'Bedbug' },
  { key: 'scorpion', label: 'Akrep', labelEn: 'Scorpion' },
  { key: 'bird', label: 'Kuş (Güvercin/Serçe)', labelEn: 'Bird' },
];

export const getEmptyEnvData = (): EnvDataMap => {
  const data: EnvDataMap = {};
  PEST_ENV_ROWS.forEach(row => {
    data[row.key] = { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0 };
  });
  return data;
};

export const calculateEnvScore = (rowData: EnvRowData): number => {
  const envTotal = rowData.hygiene + rowData.insulation + rowData.storage + rowData.monitoring;
  return envTotal * rowData.population;
};

export const getEnvRiskColor = (score: number): { bg: string; text: string; label: string } => {
  if (score === 0) return { bg: '#ffffff', text: '#999999', label: 'Değerlendirme Yok' };
  if (score <= 6) return { bg: '#dcfce7', text: '#166534', label: 'Düşük Risk' };
  if (score <= 12) return { bg: '#fef9c3', text: '#854d0e', label: 'Orta Risk' };
  if (score <= 24) return { bg: '#fed7aa', text: '#9a3412', label: 'Yüksek Risk' };
  return { bg: '#fecaca', text: '#991b1b', label: 'Çok Yüksek Risk' };
};

export const getEnvAverages = (riskData: EnvDataMap) => {
  const rows = Object.values(riskData);
  const count = rows.length;
  
  if (count === 0) return { avgH: '0.0', avgI: '0.0', avgS: '0.0', avgM: '0.0', avgP: '0.0', avgScore: '0.0' };

  const totals = rows.reduce((acc, row) => ({
    hygiene: acc.hygiene + row.hygiene,
    insulation: acc.insulation + row.insulation,
    storage: acc.storage + row.storage,
    monitoring: acc.monitoring + row.monitoring,
    population: acc.population + row.population,
    score: acc.score + calculateEnvScore(row),
  }), { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0, score: 0 });

  return {
    avgH: (totals.hygiene / count).toFixed(1),
    avgI: (totals.insulation / count).toFixed(1),
    avgS: (totals.storage / count).toFixed(1),
    avgM: (totals.monitoring / count).toFixed(1),
    avgP: (totals.population / count).toFixed(1),
    avgScore: (totals.score / count).toFixed(1),
  };
};