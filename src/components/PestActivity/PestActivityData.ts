export interface PestLimitRow {
  description: string;
  level: 'kabul' | 'aktivite' | 'istila';
}

export interface PestRow {
  pest_name: string;
  responsible: string;
  limits: PestLimitRow[];
  action_text: string;
}

export interface PestActivityReport {
  id: string;
  customer_id: string;
  branch_id: string | null;
  customer_name: string;
  responsible_company: string;
  document_number: string;
  revision_number: number;
  revision_date: string | null;
  pest_rows: PestRow[];
  status: string;
  created_at: string;
  updated_at: string;
}

export const LEVEL_LABELS: Record<string, string> = {
  kabul: 'KABUL EDILEBILIR',
  aktivite: 'AKTIVITE',
  istila: 'ISTILA',
};

export const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  kabul: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  aktivite: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  istila: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const DEFAULT_PEST_ROWS: PestRow[] = [
  {
    pest_name: 'Kemirgenler',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis alanda gozlenen; mevcut yem istasyonu sayisinin %10 dan az - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Dis alanda gozlenen; mevcut yem istasyonu sayisinin %11 -%30 arasi - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen; mevcut yem istasyonu sayisinin %31 den fazla - ISTILA', level: 'istila' },
      { description: 'Ic alan da gozlenen; mevcut canli kapanlarda yakalanan 1 adet KEMIRGEN - ISTILA', level: 'istila' },
    ],
    action_text: 'KABUL EDILEBILIR: Mevcut kontrollerde degisiklik yapilmaz. Yemler yenilenir. AKTIVITE: Gozlem Noktalari sayisi aktivite gozlenen bolgelerde artirilir ve ziyaret sayisi iki katina cikar. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak; Tesis dis / ic alaninda kemirgen yuvalari aranir, istila kaynagi tesbit edilir, aktivite bir an once bertaraf edilir. Aktivite olusturan alanlar bertaraf edilir.',
  },
  {
    pest_name: 'Hamambocekleri',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %10 dan az - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %11 -%30 arasi - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %31 den fazla - ISTILA', level: 'istila' },
      { description: 'Ic alan da gozlenen; mevcut gozlem noktalarina yakalanan 1 adet HAMAMBOCEGI - ISTILA', level: 'istila' },
    ],
    action_text: 'KABUL EDILEBILIR: Mevcut kontrollerde degisiklik yapilmaz. Yenleme devam eder. AKTIVITE: Gozlem Noktalari sayisi aktivite gozlenen bolgelerde artirilir ve ziyaret sayisi iki katina cikar. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak; Tesis dis / ic alaninda hamambocegi yuvalari aranir, istila kaynagi tesbit edilir, aktivite bir an once bertaraf edilir. (Ilaclama). Aktivite olusturan alanlar bertaraf edilir.',
  },
  {
    pest_name: 'Sinekler',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis alanda gozlenen; 5 adetten az sinek - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Dis alanda gozlenen; 6 -10 adet sinek - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen; 11 adet ten fazla sinek - ISTILA', level: 'istila' },
      { description: 'Ic alan da gozlenen; ucan 1 adet sinek - AKTIVITE', level: 'aktivite' },
      { description: 'Ic alan da gozlenen; ucan 5 adet sinek - ISTILA', level: 'istila' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan; 1- 50 adet sinek - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan; 51 - 149 - adet sinek - AKTIVITE', level: 'aktivite' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan; 150 adet sinekten fazlasi - ISTILA', level: 'istila' },
    ],
    action_text: 'KABUL EDILEBILIR: Mevcut kontrollerde degisiklik yapilmaz. Hijyen- Izolasyon durumu kontrol edilir. AKTIVITE: Dis / Ic alanda sinek uremesine neden olan alanlar belirlenir ve bertaraf edilir, ziyaret sayisi iki katina cikar. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak, tesis te istila kaynagi tesbit edilir, aktivite bir an once bertaraf edilir. (Ilaclama). Aktivite olusturan alanlar bertaraf edilir. Yeni sinek oldurucu cihazlar sisteme ilave edilir.',
  },
  {
    pest_name: 'Depolanmis Urun Zararlisi',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %10 dan az - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %11 -%30 arasi - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen; mevcut gozlem noktalarinin sayisinin %31 den fazla - ISTILA', level: 'istila' },
      { description: 'Ic alanda gozlenen; mevcut gozlem noktalarina yakalanan 1 adet DEPO ZARARLISI BIT veya GUVE - ISTILA', level: 'istila' },
    ],
    action_text: 'KABUL EDILEBILIR: Mevcut kontrollerde degisiklik yapilmaz. Hijyen- Izolasyon durumu kontrol edilir. AKTIVITE: Aktivite gozlenen bolgelerde aktiviteye neden olan malzeme & alan aranir. Ziyaret sayisi iki katina cikar. Tuzak sayisi yapilar. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak, Tesis ic / dis alaninda Depo zararlisi yuvalari aranir; istila kaynagi tesbit edilir, aktivite bir an once bertaraf edilir. (Ilaclama - Fumigasyon). Aktivite olusturan alanlar bertaraf edilir.',
  },
  {
    pest_name: 'Kuslar',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis ve/veya Ic alanda gozlenen 1 adet KUS TUYU ve / veya DISKISI - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen 1 adet KUS YUVASI ve/veya Ic alanda gozlenen 1 adet KUS ve / veya YUVASI - ISTILA', level: 'istila' },
    ],
    action_text: 'AKTIVITE: Aktivite gozlenen bolgelerde aktiviteye neden olan zararli ve / veya etken aranir. (Catidaki delik -acik kapi vb). Bu etken bertaraf edilir. Var ise Kus yuvalari bozulur, beslenme - su icme alanlari bertaraf edilir. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak, Ic alana giren kus bir an once disan cikarilir, giris noktalari tesbit edilir ve kapatilir.',
  },
  {
    pest_name: 'Kinkanatli ve Diger Yabani Bocek Turleri',
    responsible: 'PestMentor & Musteri/Musteri Subesi',
    limits: [
      { description: 'Dis alanda gozlenen 5 adetten az KINKANATLI BOCEK - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Dis alanda gozlenen 5 -10 adet KINKANATLI BOCEK - AKTIVITE', level: 'aktivite' },
      { description: 'Dis alanda gozlenen 10 adet ten fazla KINKANATLI BOCEK - ISTILA', level: 'istila' },
      { description: 'Ic alan da gozlenen ucan 1 adet KINKANATLI BOCEK - AKTIVITE', level: 'aktivite' },
      { description: 'Ic alan da gozlenen ucan 5 adet KINKANATLI BOCEK - ISTILA', level: 'istila' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan 1-50 adet KINKANATLI BOCEK - KABUL EDILEBILIR', level: 'kabul' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan 50 - 149 - adet KINKANATLI BOCEK - AKTIVITE', level: 'aktivite' },
      { description: 'Ic alan da sinek cihazlarinda yakalanan 149 adet ve fazlasi KINKANATLI BOCEK - ISTILA', level: 'istila' },
    ],
    action_text: 'KABUL EDILEBILIR: Mevcut kontrollerde degisiklik yapilmaz. Hijyen- Izolasyon durumu kontrol edilir. AKTIVITE: Dis - Ic alanda kinkanatli uremesine neden olan alanlar belirlenir ve bertaraf edilir, ziyaret sayisi iki katina cikar. ISTILA: Aktivite durumunda alinan onlemlere ilave olarak, Tesis te istila kaynagi tesbit edilir, aktivite bir an once bertaraf edilir. (Ilaclama). Aktivite olusturan alanlar bertaraf edilir. Yeni sinek oldurucu cihazlar & bocek tutuca tuzaklar sisteme ilave edilir.',
  },
];
