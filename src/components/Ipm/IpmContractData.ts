export interface IpmContract {
  id: string;
  customer_id: string;
  branch_id: string | null;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  responsible_person: string;
  contract_firm_name: string;
  contract_firm_phone: string;
  contract_firm_email: string;
  contract_firm_contact: string;
  start_date: string;
  revision_date: string | null;
  revision_number: number;
  routine_frequency: string;
  target_pests: Record<string, boolean>;
  scope_areas: string[];
  content_sections: Record<string, string>;
  custom_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TARGET_PESTS: Record<string, boolean> = {
  kemirgenler: true,
  sinekler: true,
  depolanmis_urun: true,
  bocekler: true,
  diger_uckunlar: false,
  kuslar: false,
  diger_zararlilar: false,
  dogal_yasam: false,
};

export const PEST_CATEGORY_LABELS: Record<string, string> = {
  kemirgenler: 'Kemirgenler',
  sinekler: 'Sinekler',
  depolanmis_urun: 'Depolanmis Urun Zararlilari',
  bocekler: 'Bocekler',
  diger_uckunlar: 'Diger Uckunlar',
  kuslar: 'Kuslar',
  diger_zararlilar: 'Diger Zararlilar',
  dogal_yasam: 'Dogal Yasama Ait Canlilar',
};

export const PEST_SUBCATEGORIES: Record<string, { code: string; name: string; latin: string }[]> = {
  kemirgenler: [
    { code: '3.1.1', name: 'Findik faresi', latin: 'Mus musculus' },
    { code: '3.1.2', name: 'Cati sicani', latin: 'Rattus rattus' },
    { code: '3.1.3', name: 'Lagim sicani', latin: 'Rattus norvegicus' },
    { code: '3.1.4', name: 'Tarla faresi', latin: 'Microtus spp.' },
  ],
  sinekler: [
    { code: '3.2.1', name: 'Karasinek', latin: 'Musca domestica' },
    { code: '3.2.2', name: 'Sivrisinek', latin: 'Culex spp.' },
    { code: '3.2.3', name: 'Drenaj sinekleri', latin: 'Psychodidae spp.' },
    { code: '3.2.4', name: 'Meyve sinekleri', latin: 'Drosophila spp.' },
    { code: '3.2.5', name: 'Diger sinekler', latin: 'Diptera grubu' },
  ],
  depolanmis_urun: [
    { code: '3.3.1', name: 'Un bitleri', latin: 'Tribolium spp.' },
    { code: '3.3.2', name: 'Kagit biti', latin: 'Psocoptera spp.' },
    { code: '3.3.3', name: 'Gida guveleri', latin: 'Plodia interpunctella' },
    { code: '3.3.4', name: 'Pirinc / Bugday bitleri', latin: 'Sitophilus spp.' },
    { code: '3.3.5', name: 'Testereli bitler', latin: 'Oryzaephilus spp.' },
  ],
  bocekler: [
    { code: '3.4.1', name: 'Alman hamambocegi', latin: 'Blatella germanica' },
    { code: '3.4.2', name: 'Amerikan hamambocegi', latin: 'Periplaneta americana' },
    { code: '3.4.3', name: 'Sark hamambocegi', latin: 'Blatta orientalis' },
    { code: '3.4.4', name: 'Kinkanatli bocekler', latin: 'Coleoptera spp.' },
    { code: '3.4.5', name: 'Karincalar', latin: '' },
    { code: '3.4.6', name: 'Tespih bocekleri', latin: '' },
    { code: '3.4.7', name: 'Orumcekler', latin: '' },
  ],
  diger_uckunlar: [
    { code: '3.5.1', name: 'Bal arilari', latin: '' },
    { code: '3.5.2', name: 'Yaban arilari', latin: '' },
    { code: '3.5.3', name: 'Kelebekler, Gece kelebekleri', latin: '' },
    { code: '3.5.4', name: 'Kinkanatli uckunlar', latin: '' },
    { code: '3.5.5', name: 'Ucan karincalar', latin: '' },
  ],
  kuslar: [
    { code: '3.6.1', name: 'Guvercin', latin: '' },
    { code: '3.6.2', name: 'Serce', latin: '' },
    { code: '3.6.3', name: 'Kirlangic', latin: '' },
    { code: '3.6.4', name: 'Karga', latin: '' },
  ],
  diger_zararlilar: [
    { code: '3.7.1', name: 'Kedi', latin: '' },
    { code: '3.7.2', name: 'Kopek', latin: '' },
    { code: '3.7.3', name: 'Kertenkele', latin: '' },
    { code: '3.7.4', name: 'Pireler', latin: '' },
    { code: '3.7.5', name: 'Keneler', latin: '' },
  ],
  dogal_yasam: [
    { code: '3.8.1', name: 'Yilan', latin: '' },
    { code: '3.8.2', name: 'Baykus', latin: '' },
    { code: '3.8.3', name: 'Yirtici Kuslar (Sahin, Dogan, Atmaca)', latin: '' },
    { code: '3.8.4', name: 'Yarasa', latin: '' },
    { code: '3.8.5', name: 'Tilki, Yabani tavsan, Sincap', latin: '' },
    { code: '3.8.6', name: 'Zararli grubu disindaki kus turleri', latin: '' },
  ],
};

export const DEFAULT_SCOPE_AREAS = [
  'Isletme Geneli',
  'Idari Ofisler',
  'Uretim Alani',
  'Depo Alanlari',
  'Dis Alan',
  'Ic Alan',
  'Mutfak & Yemekhane',
  'Sosyal Alanlar',
];

export const CONTENT_SECTION_LABELS: Record<string, string> = {
  amac: '1 - AMAC',
  kisaltmalar: '2 - KISALTMALAR VE KAVRAMLAR',
  hedef_zararlilar_giris: '3 - HEDEF ZARARLILAR (Giris)',
  ilgili_dokumanlar: '4 - ILGILI DOKUMANLAR',
  ipm_uygulamalari_giris: '5 - IPM UYGULAMALARI (Giris)',
  gozlem_uygulamalari: '5.1 - Gozlem Uygulamalari',
  onleyici_uygulamalar: '5.2 - Onleyici Uygulamalar',
  rutin_kontroller: '5.3 - Rutin Kontroller',
  ipm_yurutulme_1: '6.1 - IPM',
  zararli_takip: '6.2 - Zararli Takip Sistemi',
  ic_alan_aparatlari: '6.3 - Ic Alan Aparatlari',
  dis_alan_aparatlari: '6.4 - Dis Alan Aparatlari',
  rutin_periyotlar: '6.10 - Rutin Periyotlar',
  acil_carilar: '6.11 - Acil Carilar',
  egitim: '6.13 - Egitim',
  kimyasal: '7 - KIMYASAL UYGULAMASI',
  personel: '8 - UYGULAMA PERSONELI',
  arac_gerecler: '9 - UYGULAMA ARAC GERECLERI',
  gecerlilik: '10 - GECERLILIK',
  gecerlilik_detay: '10 - GECERLILIK (Onay Metni)',
};

export const DEFAULT_CONTENT_SECTIONS: Record<string, string> = {
  amac: 'Bu program, {customer_address}, {customer_city} adresinde kurulu {customer_name} insan sagligini, hammadde ve urun kalitesini bozacak, olumsuz yonde etkileyecek zararlilara karsi yurutulecek entegre zararli yonetimi (Integrated Pest Management - IPM) calismalarini kapsar.',

  kisaltmalar: 'PEST KONTROL: Zararlilara karsi yapilan tum faaliyetler\nZARARLI: Hasere, pest\nRUTIN: Sozlesme kapsamindaki aylik ziyaret periyodu\nIPM: Integrated Pest Management\nPESTISIT: Zararli kontrol kimyasallari\nBIYOSIT: Saglik Bakanligi onayli kontrol kimyasallari\nLFT: Isikli Sinek Tutucu - Yapiskanli levhali\nSORUMLU: IPM\'den sorumlu urun guvenligi yetkilisi',

  hedef_zararlilar_giris: 'Gida ve urun guvenligi acisindan rutin kontrol, acil mudahale, takip, teshis veya denetleme faaliyetlerinde asagida yer alan zararlilarla ilgili faaliyetler IPM perspektifinde gerceklestirilir.',

  ilgili_dokumanlar: 'Entegre Zararli Yonetimi - IPM Sozlesmesi\nYazili IPM Programi\nAcil Durum Bilgileri\nSozlesmeli Firma Iletisim Bilgileri\nYillik Rutin Ziyaret Programi\nSaglik Bakanligi Uygulama Izin Belgesi\nMesul Mudurluk Belgesi\nMesul Mudur Sertifikasi\nTSE-8358 Hizmet Yeterlilik Belgesi\nMali Mesuliyet Sigortasi\nZararli Risk Analizi\nIzleme Aparatlari Yerlesim Planlari\nServis Raporlari\nAylik/Sezonluk Degerlendirme Raporlari\nOnayli Pestisit Listesi\nPestisit Kullanim Karti\nKullanilan Pestisitlere Ait MSDS ve Etiketler\nIsletmenin Egitim Belgeleri',

  ipm_uygulamalari_giris: 'Uygun kontrol, zararlilarin varliginin isaretinin cok cabuk gorulmesi ve zararli cogalip yayilmadan once yok edilmesi seklinde yapilir.',

  gozlem_uygulamalari: 'Kontrol calismalarindan once zararli populasyonunun turu ve yogunlugu saptanarak hayata gecirilecek mucadelenin yontemi ve zamani belirlenir. Gozlem uygulamalari, isletmelerin dis cevreleri ve ic alanlarinin tamamini icerir.',

  onleyici_uygulamalar: 'Zararli kontrolu oncelikle korunma yoluladir. Zararlilarin yasayamayacagi sartlari barindiran iyi bina dizayni, zararlilarin isletme icerisine girisini engelleyecek duzende yalitim, zamaninda gerektigi sekilde yapilan tamiratlar/bakimlar, zararli yonetimi konusunda egitimli personel.',

  rutin_kontroller: 'Sozlesmeli firma gida/urun guvenligi acisindan gozlemlerini asagida belirtilen zararlilarla ilgili olarak IPM perspektifinde gerceklestirecektir.',

  ipm_yurutulme_1: 'Sozlesmeli firma zararli kontrolunu entegre bir sekilde ele almayi; cevre, urun ve insan sagligi acisindan en az kimyasal kullanarak kontrolu saglamayi benimser.',

  zararli_takip: 'Isletmenin ic ve dis alaninda zararlilari izlemek ve kontrol etmek icin uygun aparatlar kullanilarak bir izleme sistemi olusturulur.',

  ic_alan_aparatlari: 'Canli yakalama kapanlari, yapiskan tuzaklar, bocek izleme tuzaklari, feromon traplari, EFK/ILT kullanilir.',

  dis_alan_aparatlari: 'Kilitli, iklim degisikliklerine karsi dayanikli, numaralandirilmis kemirgen yem istasyonlari kullanilir.',

  rutin_periyotlar: 'Rutin ziyaretler, {routine_frequency} olacak sekilde yapilacaktir.',

  acil_carilar: 'Sozlesmeli firma acil carilarda 24 saat icerisinde isletme alaninda gozlem, mudahale, tespit veya degerlendirme icin bulunacaktir.',

  egitim: 'Sozlesmeli firma sozlesme konusuyla ilgili yilda 1 kez egitim verecektir.',

  kimyasal: 'Pestisit/biyosit adi verilen yemler/zehirler/ilaclarla zararlilarin kontrol altina alinmasidir. Gida uretim alanlarinin icinde toksik rodentisitler ve yemler kullanilmaz, canli yakalama kapanlari kullanilir.',

  personel: 'Zararli kontrol calismalarinda gorevli personel sozlesmeli firma tarafindan temin edilir. Sozlesmeli firma personelinin uygulama esansinda verecegi zararlar tazmin edilecektir. Sozlesmeli firma Mali Mesuliyet Sigortasi\'na sahip olacaktir.',

  arac_gerecler: 'Sozlesme konusu zararlilarla mucadelede kullanilacak kimyasallarin temini sozlesmeli firmaya aittir. Kullanilacak insektisit ve rodentisitler Dunya Saglik Orgutu\'nun onerilerine uygun olacak ve Saglik Bakanligi tarafindan ruhsatlandirilmis olacaktir.',

  gecerlilik: 'Bu program hizmet alim sekline bagli olarak {contract_firm_name} ile yapilan sozlesmeye gore duzenlenmistir.',

  gecerlilik_detay: 'Isbu IPM Programi {start_date} tarihinden itibaren gecerli olup degisiklikler revizyon numarasi ve tarih verilerek gerekleri ile birlikte isletme IPM sorumlusu {responsible_person} tarafindan onaylanir.',
};
