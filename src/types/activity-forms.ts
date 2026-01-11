export interface SettingsBase {
  dokumanNo: string;
  revizyonNo: string;
  yayinTarihi: string;
}

export interface FormData12 {
  ticariUnvan: string;
  faaliyetKonusu: string;
  vergiDairesi: string;
  vergiNo: string;
  mersisNo: string;
  adres: string;
  telefon: string;
  faks: string;
  eposta: string;
  webSitesi: string;
  yetkiliKisi: string;
  yetkiliUnvan: string;
  yetkiliTel: string;
  hizmetBaslangicTarihi: string;
}

export interface ContractData {
  sozlesmeTarihi: string;
  sozlesmeNo: string;
  hizmetPeriyodu: string;
  hizmetBedeli: string;
  paraBirimi: string;
  sozlesmeSuresi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  odemeSekli: string;
  kapsam: {
    kemirgen: boolean;
    yuruyenHasere: boolean;
    ucanHasere: boolean;
    dezenfeksiyon: boolean;
    [key: string]: boolean;
  };
}

export interface Permit {
  id: number;
  belgeAdi: string;
  belgeNo: string;
  verilisTarihi: string;
  gecerlilikTarihi: string;
  verenKurum: string;
}

export interface Staff {
  id: number;
  adSoyad: string;
  gorev: string;
  sertifikaNo: string;
  gecerlilikTarihi: string;
}

export interface LegendItem {
  id: number;
  kod: string;
  aciklama: string;
  renk: string;
  sekil: string;
}

export interface Station {
  id: number | string;
  no: string;
  location: string;
  type: string;
}

export interface Product {
  id: number | string;
  urunAdi: string;
  aktifMadde: string;
  ruhsatNo: string;
  hedefHasere: string;
  antidot: string;
}

export interface ApplicationRecord {
  id: number;
  uygulama_tarihi: string;
  baslangic_saati: string;
  bitis_saati: string;
  hava_durumu: string;
  sicaklik: string;
  nem: string;
  uygulanan_alan: string;
  hedef_hasere: string;
  kullanilan_urun: string;
  uygulama_metodu: string;
  dozaj: string;
  operatör: string;
  müşteri_yetkilisi: string;
  müşteri_imza: boolean;
  operatör_imza: boolean;
}

export interface UsageCard {
  id: number;
  urun_adi: string;
  baslangic_stok: number;
  kullanim_kayitlari: Array<{
    tarih: string;
    kullanilan_miktar: number;
    kalan_stok: number;
    aciklama: string;
  }>;
}

export interface DocumentEntry {
  id: number;
  baslik: string;
  aciklama: string;
  durum: 'mevcut' | 'eksik' | 'beklemede';
  sayfa_no?: string;
  son_guncelleme?: string;
}

export interface WasteRecord {
  id: number;
  atik_turu: string;
  miktar: string;
  imha_tarihi: string;
  imha_firması: string;
  belge_no: string;
  sorumlu_personel: string;
}