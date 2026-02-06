import React, { useRef } from 'react';
import { FileDown, Printer, Bug, Shield, CheckCircle2, XCircle, MapPin, Phone, Mail, User, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { IpmContract } from './IpmContractData';
import { PEST_CATEGORY_LABELS, PEST_SUBCATEGORIES } from './IpmContractData';

interface IpmContractPreviewProps {
  contract: IpmContract;
  companySettings?: {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
  } | null;
  compact?: boolean;
}

const IpmContractPreview: React.FC<IpmContractPreviewProps> = ({ contract, companySettings, compact }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const primaryColor = '#15803d';

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>IPM Sozlesmesi - ${contract.customer_name}</title>
    <style>
      @page { size: A4 portrait; margin: 20mm 15mm; }
      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }
      h1 { font-size: 18px; color: #15803d; text-align: center; margin: 0 0 20px; }
      h2 { font-size: 13px; color: #15803d; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin: 16px 0 8px; }
      h3 { font-size: 11px; color: #374151; margin: 8px 0 4px; }
      p { margin: 4px 0; }
      .section { margin-bottom: 12px; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin: 2px; }
      .badge-active { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      .badge-inactive { background: #f3f4f6; color: #9ca3af; border: 1px solid #e5e7eb; text-decoration: line-through; }
      table { width: 100%; border-collapse: collapse; }
      td, th { padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 10px; }
      th { background: #f0fdf4; color: #166534; font-weight: 600; }
    </style></head><body>${reportRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const activePests = contract.target_pests || {};
  const scopeAreas = contract.scope_areas || [];
  const startDateFormatted = contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: tr }) : '-';

  return (
    <div>
      {!compact && (
        <div className="flex gap-2 mb-4 print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
            <Printer size={14} /> Yazdir
          </button>
        </div>
      )}

      <div ref={reportRef} className={compact ? '' : 'bg-white shadow-lg rounded-xl overflow-hidden'}>
        <div style={{ backgroundColor: primaryColor, height: 6 }} />
        <div className="p-6 sm:p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.6', color: '#1e293b' }}>

          <div className="text-center mb-6">
            {companySettings?.logo_url && (
              <img src={companySettings.logo_url} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
            )}
            <h1 className="text-lg font-bold" style={{ color: primaryColor }}>
              ENTEGRE ZARARLI YONETIMI (IPM) PROGRAMI
            </h1>
            <p className="text-xs text-gray-500 mt-1">{contract.customer_name}</p>
            <p className="text-xs text-gray-400">{startDateFormatted}</p>
            {contract.revision_number > 0 && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-200">
                Revizyon: {contract.revision_number}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Isletme Bilgileri</p>
              <p className="font-bold text-sm text-gray-800">{contract.customer_name}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin size={10}/> {contract.customer_address}, {contract.customer_city}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><User size={10}/> IPM Sorumlusu: <strong>{contract.responsible_person || '-'}</strong></p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Sozlesmeli Firma</p>
              <p className="font-bold text-sm text-gray-800">{contract.contract_firm_name}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={10}/> {contract.contract_firm_phone}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1"><Mail size={10}/> {contract.contract_firm_email}</p>
              {contract.contract_firm_contact && (
                <p className="text-xs text-gray-600 flex items-center gap-1"><User size={10}/> {contract.contract_firm_contact}</p>
              )}
            </div>
          </div>

          {/* 1 - AMAC */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>1 - AMAC</h2>
            <p className="text-[11px]">
              Bu program, <strong>{contract.customer_address}, {contract.customer_city}</strong> adresinde kurulu <strong>{contract.customer_name}</strong> insan sagligini, hammadde ve urun kalitesini bozacak, olumsuz yonde etkileyecek zararlilara karsi yurutulecek entegre zararli yonetimi (Integrated Pest Management - IPM) calismalarini kapsar.
            </p>
          </div>

          {/* 2 - KISALTMALAR */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>2 - KISALTMALAR VE KAVRAMLAR</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <p><strong>ISLETME:</strong> {contract.customer_name}</p>
              <p><strong>SOZLESMELI FIRMA:</strong> {contract.contract_firm_name}</p>
              <p><strong>PEST KONTROL:</strong> Zararlilara karsi yapilan tum faaliyetler</p>
              <p><strong>ZARARLI:</strong> Hasere, pest</p>
              <p><strong>RUTIN:</strong> Sozlesme kapsamindaki aylik ziyaret periyodu</p>
              <p><strong>IPM:</strong> Integrated Pest Management</p>
              <p><strong>PESTISIT:</strong> Zararli kontrol kimyasallari</p>
              <p><strong>BIYOSIT:</strong> Saglik Bakanligi onayli kontrol kimyasallari</p>
              <p><strong>LFT:</strong> Isikli Sinek Tutucu - Yapiskanli levhali</p>
              <p><strong>SORUMLU:</strong> IPM'den sorumlu urun guvenligi yetkilisi</p>
            </div>
            <p className="text-[10px] mt-2">
              <strong>SORUMLU:</strong> {contract.responsible_person || '(Belirtilmedi)'}
            </p>
          </div>

          {/* 3 - HEDEF ZARARLILAR */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2 flex items-center gap-1" style={{ color: primaryColor }}>
              <Bug size={12}/> 3 - HEDEF ZARARLILAR
            </h2>
            <p className="text-[10px] text-gray-600 mb-3">
              Gida ve urun guvenligi acisindan rutin kontrol, acil mudahale, takip, teshis veya denetleme faaliyetlerinde asagida yer alan zararlilarla ilgili faaliyetler IPM perspektifinde gerceklestirilir.
            </p>

            {Object.entries(PEST_CATEGORY_LABELS).map(([key, label], idx) => {
              const isActive = activePests[key] === true;
              const subs = PEST_SUBCATEGORIES[key] || [];
              return (
                <div key={key} className={`mb-3 p-2 rounded-lg border ${isActive ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isActive ? <CheckCircle2 size={12} className="text-green-600"/> : <XCircle size={12} className="text-gray-400"/>}
                    <span className={`text-[11px] font-bold ${isActive ? 'text-green-800' : 'text-gray-400 line-through'}`}>
                      3.{idx + 1} - {label}
                    </span>
                  </div>
                  {isActive && subs.length > 0 && (
                    <div className="ml-5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {subs.map(sub => (
                        <p key={sub.code} className="text-[10px] text-gray-600">
                          <strong>{sub.code}</strong> - {sub.name} {sub.latin && <em className="text-gray-400">/ {sub.latin}</em>}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* UYGULAMA KAPSAMI */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2 flex items-center gap-1" style={{ color: '#2563eb' }}>
              <Shield size={12}/> UYGULAMA KAPSAMI
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {scopeAreas.map((area: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  <CheckCircle2 size={10}/> {area}
                </span>
              ))}
            </div>
          </div>

          {/* 4 - ILGILI DOKUMANLAR */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>4 - ILGILI DOKUMANLAR</h2>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {[
                'Entegre Zararli Yonetimi - IPM Sozlesmesi',
                'Yazili IPM Programi',
                'Acil Durum Bilgileri',
                'Sozlesmeli Firma Iletisim Bilgileri',
                'Yillik Rutin Ziyaret Programi',
                'Saglik Bakanligi Uygulama Izin Belgesi',
                'Mesul Mudurluk Belgesi',
                'Mesul Mudur Sertifikasi',
                'TSE-8358 Hizmet Yeterlilik Belgesi',
                'Mali Mesuliyet Sigortasi',
                'Zararli Risk Analizi',
                'Izleme Aparatlari Yerlesim Planlari',
                'Servis Raporlari',
                'Aylik/Sezonluk Degerlendirme Raporlari',
                'Onayli Pestisit Listesi',
                'Pestisit Kullanim Karti',
                'Kullanilan Pestisitlere Ait MSDS ve Etiketler',
                'Isletmenin Egitim Belgeleri',
              ].map((doc, i) => (
                <p key={i} className="flex items-start gap-1"><span className="text-green-600 mt-0.5">&#8226;</span> {doc}</p>
              ))}
            </div>
          </div>

          {/* 5 - IPM UYGULAMALARI */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>5 - IPM UYGULAMALARI</h2>
            <p className="text-[10px] mb-2">Uygun kontrol, zararlilarin varliginin isaretinin cok cabuk gorulmesi ve zararli cogalip yayilmadan once yok edilmesi seklinde yapilir.</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.1 - Gozlem Uygulamalari</h3>
            <p className="text-[10px]">Kontrol calismalarindan once zararli populasyonunun turu ve yogunlugu saptanarak hayata gecirilecek mucadelenin yontemi ve zamani belirlenir. Gozlem uygulamalari, isletmelerin dis cevreleri ve ic alanlarinin tamamini icerir.</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.2 - Onleyici Uygulamalar</h3>
            <p className="text-[10px]">Zararli kontrolu oncelikle korunma yoluladir. Zararlilarin yasayamayacagi sartlari barindiran iyi bina dizayni, zararlilarin isletme icerisine girisini engelleyecek duzende yalitim, zamaninda gerektigi sekilde yapilan tamiratlar/bakimlar, zararli yonetimi konusunda egitimli personel.</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.3 - Rutin Kontroller</h3>
            <p className="text-[10px]">Sozlesmeli firma gida/urun guvenligi acisindan gozlemlerini asagida belirtilen zararlilarla ilgili olarak IPM perspektifinde gerceklestirecektir.</p>
          </div>

          {/* 6 - YURUTULME */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>6 - IPM UYGULAMALARININ YURUTULMESI</h2>
            <div className="space-y-2 text-[10px]">
              <p><strong>6.1 - IPM:</strong> Sozlesmeli firma zararli kontrolunu entegre bir sekilde ele almyi; cevre, urun ve insan sagligi acisindan en az kimyasal kullanarak kontrolu saglamayi benimser.</p>
              <p><strong>6.2 - Zararli Takip Sistemi:</strong> Isletmenin ic ve dis alaninda zararlilari izlemek ve kontrol etmek icin uygun aparatlar kullanilarak bir izleme sistemi olusturulur.</p>
              <p><strong>6.3 - Ic Alan Aparatlari:</strong> Canli yakalama kapanlari, yapiskan tuzaklar, bocek izleme tuzaklari, feromon traplari, EFK/ILT kullanilir.</p>
              <p><strong>6.4 - Dis Alan Aparatlari:</strong> Kilitli, iklim degisikliklerine karsi dayanikli, numaralandirilmis kemirgen yem istasyonlari kullanilir.</p>
              <p><strong>6.10 - Rutin Periyotlar:</strong> Rutin ziyaretler, <strong>{contract.routine_frequency}</strong> olacak sekilde yapilacaktir.</p>
              <p><strong>6.11 - Acil Carilar:</strong> Sozlesmeli firma acil carilarda 24 saat icerisinde isletme alaninda gozlem, mudahale, tespit veya degerlendirme icin bulunacaktir.</p>
              <p><strong>6.13 - Egitim:</strong> Sozlesmeli firma sozlesme konusuyla ilgili yilda 1 kez egitim verecektir.</p>
            </div>
          </div>

          {/* 7 - KIMYASAL */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>7 - KIMYASAL UYGULAMASI</h2>
            <p className="text-[10px]">Pestisit/biyosit adi verilen yemler/zehirler/ilaclarla zararlilarin kontrol altina alinmasidir. Gida uretim alanlarinin icinde toksik rodentisitler ve yemler kullanilmaz, canli yakalama kapanlari kullanilir.</p>
          </div>

          {/* 8 - PERSONEL */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>8 - UYGULAMA PERSONELI</h2>
            <p className="text-[10px]">Zararli kontrol calismalarinda gorevli personel sozlesmeli firma tarafindan temin edilir. Sozlesmeli firma personelinin uygulama esansinda verecegi zararlar tazmin edilecektir. Sozlesmeli firma Mali Mesuliyet Sigortasi'na sahip olacaktir.</p>
          </div>

          {/* 9 - ARAC GERECLER */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>9 - UYGULAMA ARAC GERECLERI, KIMYASALLAR</h2>
            <p className="text-[10px]">Sozlesme konusu zararlilarla mucadelede kullanilacak kimyasallarin temini sozlesmeli firmaya aittir. Kullanilacak insektisit ve rodentisitler Dunya Saglik Orgutu'nun onerilerine uygun olacak ve Saglik Bakanligi tarafindan ruhsatlandirilmis olacaktir.</p>
          </div>

          {/* 10 - GECERLILIK */}
          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>10 - GECERLILIK</h2>
            <p className="text-[10px]">
              Bu program hizmet alim sekline bagli olarak <strong>{contract.contract_firm_name}</strong> ile yapilan sozlesmeye gore duzenlenmistir.
            </p>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[11px] font-bold text-green-800">
                Isbu IPM Programi {startDateFormatted} tarihinden itibaren gecerli olup degisiklikler revizyon numarasi ve tarih verilerek gerekleri ile birlikte isletme IPM sorumlusu <strong>{contract.responsible_person || '(Belirtilmedi)'}</strong> tarafindan onaylanir.
              </p>
            </div>
          </div>

          {contract.custom_notes && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] font-bold text-amber-800 mb-1">Ek Notlar:</p>
              <p className="text-[10px] text-amber-700 whitespace-pre-wrap">{contract.custom_notes}</p>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-[9px] text-gray-400">
              {contract.customer_name} - IPM Programi | Baslangic: {startDateFormatted}
              {contract.revision_number > 0 && ` | Rev: ${contract.revision_number}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IpmContractPreview;
