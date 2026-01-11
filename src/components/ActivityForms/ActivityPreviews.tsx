import React from 'react';
import { 
  Building2, Store, FileSignature, Award, Users, Map, ClipboardList, 
  FileText, Beaker, Package, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { 
  SettingsBase, FormData12, ContractData, Permit, Staff, 
  LegendItem, Station, Product, ApplicationRecord, UsageCard, 
  DocumentEntry, WasteRecord 
} from '../../types/activity-forms';

const BRAND_GREEN = '#006837';
const BRAND_LIGHT_GREEN = '#e6f4ea';
const LOGO_URL = "https://pestmentor.com.tr/pestmentor-logo-png-297x97.webp";

// --- HEADER ---
export const A4Header = ({ title, settings }: { title: string, settings: SettingsBase }) => (
  <div className="border-2 border-black mb-6">
    <div className="flex">
      <div className="w-1/4 border-r-2 border-black flex flex-col items-center justify-center p-2 text-center">
        <img src={LOGO_URL} alt="Mentor Logo" className="max-h-12 mb-1" />
        <div className="text-[10px] italic font-bold" style={{ color: BRAND_GREEN }}>Leave pest to us.</div>
      </div>
      <div className="w-2/4 border-r-2 border-black flex items-center justify-center p-2">
        <h1 className="text-xl font-bold text-center uppercase">{title}</h1>
      </div>
      <div className="w-1/4 text-xs">
        <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Doküman No:</span><span>{settings.dokumanNo}</span></div>
        <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Yayın Tarihi:</span><span>{settings.yayinTarihi}</span></div>
        <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Revizyon No:</span><span>{settings.revizyonNo}</span></div>
        <div className="p-1 flex justify-between"><span className="font-bold">Sayfa No:</span><span>1 / 1</span></div>
      </div>
    </div>
  </div>
);

// --- 1.1 FAALİYET DOSYASI İÇERİĞİ ---
export const Preview11 = ({ data, settings, customerName }: { data: DocumentEntry[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="FAALİYET DOSYASI İÇERİĞİ" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Müşteri: {customerName}</div>
      <div className="mb-6 p-4 bg-green-50 border border-green-200 text-sm"><strong>ZARARLI MÜCADELESİ FAALİYET DOSYASI - İÇİNDEKİLER</strong></div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-2 w-12 text-center">NO</th>
            <th className="border border-black p-2 text-left">EVRAK ADI</th>
            <th className="border border-black p-2 text-left">EVRAK AÇIKLAMALARI</th>
            <th className="border border-black p-2 w-20 text-center">DURUM</th>
          </tr>
        </thead>
        <tbody>
          {data.map((doc, index) => (
            <tr key={doc.id}>
              <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
              <td className="border border-black p-2 font-semibold">{doc.baslik}</td>
              <td className="border border-black p-2 text-xs">{doc.aciklama}</td>
              <td className="border border-black p-2 text-center">
                <span className={`inline-block w-3 h-3 rounded-full ${doc.durum === 'mevcut' ? 'bg-green-500' : doc.durum === 'beklemede' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 1.2 MÜŞTERİ BİLGİLERİ ---
export const Preview12 = ({ data, settings }: { data: FormData12, settings: SettingsBase }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="MÜŞTERİ BİLGİ FORMU" settings={settings} />
    <div className="flex-grow">
      <p className="mb-6 text-sm">Aşağıdaki bilgiler, hizmet sözleşmesinin hazırlanması ve yasal bildirimlerin yapılabilmesi için hizmet alan firma (Müşteri) tarafından beyan edilmiştir.</p>
      <table className="w-full border-collapse border border-black text-sm">
        <tbody>
          <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FİRMA TİCARİ ÜNVANI</td><td className="border border-black p-3 uppercase font-semibold">{data.ticariUnvan}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FAALİYET KONUSU</td><td className="border border-black p-3">{data.faaliyetKonusu}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>AÇIK ADRES (MERKEZ)</td><td className="border border-black p-3">{data.adres}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ DAİRESİ</td><td className="border border-black p-3">{data.vergiDairesi}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ NUMARASI</td><td className="border border-black p-3 font-mono">{data.vergiNo}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>MERSİS NUMARASI</td><td className="border border-black p-3 font-mono">{data.mersisNo}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>TELEFON</td><td className="border border-black p-3">{data.telefon}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>E-POSTA</td><td className="border border-black p-3">{data.eposta}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3 align-top py-6" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ KİŞİ / ÜNVAN</td><td className="border border-black p-3 py-6"><div className="font-bold">{data.yetkiliKisi}</div><div className="text-gray-600 italic">{data.yetkiliUnvan}</div></td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ CEP TEL</td><td className="border border-black p-3">{data.yetkiliTel}</td></tr>
          <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>HİZMET BAŞLANGIÇ</td><td className="border border-black p-3">{data.hizmetBaslangicTarihi.split('-').reverse().join('.')}</td></tr>
        </tbody>
      </table>
      <div className="mt-16 flex justify-between px-4">
        <div className="text-center w-1/3">
          <h4 className="font-bold mb-1">MÜŞTERİ YETKİLİSİ</h4>
          <div className="text-xs mb-8">(Kaşe - İmza)</div>
          <div className="border-b border-black w-full"></div>
          <div className="text-xs mt-1">{data.yetkiliKisi}</div>
        </div>
        <div className="text-center w-1/3">
          <h4 className="font-bold mb-1">MENTOR YETKİLİSİ</h4>
          <div className="text-xs mb-8">(Kaşe - İmza)</div>
          <div className="border-b border-black w-full"></div>
          <div className="text-xs mt-1">Operasyon Müdürü</div>
        </div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-4">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 1.3 ŞUBE BİLGİLERİ ---
export const Preview13 = ({ data, settings, customerName }: { data: any[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="MÜŞTERİ ŞUBELERİNİN BİLGİLERİ" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {customerName}</div>
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-2 w-10 text-center">NO</th>
            <th className="border border-black p-2 text-left">ŞUBE ADI</th>
            <th className="border border-black p-2 text-left">ŞUBE YETKİLİSİ</th>
            <th className="border border-black p-2 w-16 text-center">ALAN (m²)</th>
            <th className="border border-black p-2 text-left">İLETİŞİM / ADRES</th>
          </tr>
        </thead>
        <tbody>
          {data.map((branch, index) => (
            <tr key={branch.id}>
              <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
              <td className="border border-black p-2 font-semibold">{branch.subeAdi}</td>
              <td className="border border-black p-2">{branch.yetkili}</td>
              <td className="border border-black p-2 text-center">{branch.metrekare}</td>
              <td className="border border-black p-2"><div><strong>Tel:</strong> {branch.telefon}</div><div className="italic text-[10px] mt-1">{branch.adres}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 2.1 HİZMET SÖZLEŞMESİ ---
export const Preview21 = ({ data, settings, customerName, customerAddress, customerAuth }: { data: ContractData, settings: SettingsBase, customerName: string, customerAddress: string, customerAuth: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="HİZMET SÖZLEŞMESİ" settings={settings} />
    <div className="flex-grow text-sm leading-relaxed text-justify">
      <h3 className="font-bold mb-2">1. TARAFLAR</h3>
      <p className="mb-4">Bir tarafta <strong>MENTOR ÇEVRE SAĞLIĞI HİZMETLERİ</strong> (Bundan böyle "Yüklenici" olarak anılacaktır) ile diğer tarafta <strong>{customerName}</strong> (Bundan böyle "İşveren" olarak anılacaktır) arasında aşağıda belirtilen şartlarda anlaşmaya varılmıştır.</p>
      <h3 className="font-bold mb-2">2. HİZMETİN KONUSU</h3>
      <p className="mb-4">İşveren'in <strong>{customerAddress}</strong> adresindeki tesislerinde/iş yerinde, halk sağlığını tehdit eden vektörlerle (zararlılarla) mücadele kapsamında, Sağlık Bakanlığı mevzuatına uygun olarak ilaçlama ve pest kontrol hizmetinin verilmesidir.</p>
      <h3 className="font-bold mb-2">3. HİZMETİN KAPSAMI</h3>
      <p className="mb-4">Bu sözleşme kapsamında aşağıdaki zararlılarla mücadele edilecektir:
        <ul className="list-disc pl-6 mt-1 space-y-1">
          {data.kapsam.kemirgen && <li>Kemirgenler (Rattus norvegicus, Rattus rattus, Mus musculus)</li>}
          {data.kapsam.yuruyenHasere && <li>Yürüyen Haşereler (Hamamböceği, Karınca, Örümcek vb.)</li>}
          {data.kapsam.ucanHasere && <li>Uçan Haşereler (Karasinek, Sivrisinek vb. - Larva mücadelesi dahil)</li>}
          {data.kapsam.dezenfeksiyon && <li>Dezenfeksiyon Hizmeti (Virüs ve bakterilere karşı ortam dezenfeksiyonu)</li>}
        </ul>
      </p>
      <h3 className="font-bold mb-2">4. HİZMET PERİYODU VE SÜRESİ</h3>
      <p className="mb-4">Hizmet, <strong>{data.baslangicTarihi}</strong> ile <strong>{data.bitisTarihi}</strong> tarihleri arasında geçerlidir. Uygulama periyodu: <strong>{data.hizmetPeriyodu}</strong> olarak belirlenmiştir. Acil durumlarda (garanti kapsamındaki çağrılarda) Yüklenici, ekstra ücret talep etmeden 24-48 saat içinde müdahale edecektir.</p>
      <h3 className="font-bold mb-2">5. HİZMET BEDELİ VE ÖDEME KOŞULLARI</h3>
      <p className="mb-4">Sözleşme konusu hizmet bedeli, uygulama başına/aylık <strong>{data.hizmetBedeli} {data.paraBirimi} + KDV</strong> olarak belirlenmiştir. Ödeme, {data.odemeSekli}</p>
      <h3 className="font-bold mb-2">6. TARAFLARIN YÜKÜMLÜLÜKLERİ</h3>
      <p className="mb-2"><strong>Yüklenici:</strong> Sağlık Bakanlığı onaylı biyosidal ürünleri kullanmakla, uygulamayı sertifikalı personel ile yapmakla ve yapılan işlemi EK-1 Biyosidal Ürün Uygulama İşlem Formu ile belgelemekle yükümlüdür.</p>
      <p className="mb-4"><strong>İşveren:</strong> Uygulama öncesi ve sonrası Yüklenici'nin belirteceği güvenlik tedbirlerine (gıda maddelerinin korunması, temizlik vb.) uymakla ve Yüklenici personeline çalışma sahasında kolaylık sağlamakla yükümlüdür.</p>
      <div className="mt-8 border border-gray-300 p-4 bg-gray-50 text-xs"><strong>Not:</strong> Bu sözleşme iki nüsha olarak düzenlenmiş olup, taraflarca okunarak {data.sozlesmeTarihi.split('-').reverse().join('.')} tarihinde imza altına alınmıştır. Anlaşmazlık durumunda İstanbul Mahkemeleri yetkilidir.</div>
      <div className="mt-12 flex justify-between px-8">
        <div className="text-center w-1/3">
          <h4 className="font-bold mb-1">İŞVEREN (MÜŞTERİ)</h4>
          <div className="text-xs mb-8">Kaşe - İmza</div>
          <div className="border-b border-black w-full"></div>
          <div className="text-xs mt-1">{customerAuth}</div>
        </div>
        <div className="text-center w-1/3">
          <h4 className="font-bold mb-1">YÜKLENİCİ (MENTOR)</h4>
          <div className="text-xs mb-8">Kaşe - İmza</div>
          <div className="border-b border-black w-full"></div>
          <div className="text-xs mt-1">Şirket Müdürü</div>
        </div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 3.1 İZİN VE RUHSATLAR ---
export const Preview31 = ({ data, settings }: { data: Permit[], settings: SettingsBase }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="İZİN VE RUHSATLAR" settings={settings} />
    <div className="flex-grow">
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde yer alan belgeler, firmanın yasal olarak pest kontrol hizmeti verebilmesi için gerekli olan resmi izin ve ruhsatları kapsamaktadır. İlgili belgelerin suretleri aşağıda listelenmiştir.</div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-3 text-left w-1/3">BELGE ADI</th>
            <th className="border border-black p-3 text-left">BELGE NUMARASI</th>
            <th className="border border-black p-3 text-center">TARİH</th>
            <th className="border border-black p-3 text-left">VEREN KURUM</th>
          </tr>
        </thead>
        <tbody>
          {data.map(permit => (
            <tr key={permit.id}>
              <td className="border border-black p-3 font-bold">{permit.belgeAdi}</td>
              <td className="border border-black p-3 font-mono">{permit.belgeNo}</td>
              <td className="border border-black p-3 text-center"><div>{permit.verilisTarihi}</div><div className="text-[10px] text-gray-500">(Geçerlilik: {permit.gecerlilikTarihi})</div></td>
              <td className="border border-black p-3">{permit.verenKurum}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-12 text-center border-t border-b border-black py-8 bg-gray-50">
        <h3 className="font-bold text-lg mb-2 text-gray-800">EKLER</h3>
        <p className="text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen belgelerin fotokopileri/suretleri yer almaktadır.</p>
        <div className="flex justify-center gap-4 mt-4"><ShieldCheck size={32} className="text-gray-300" /><ShieldCheck size={32} className="text-gray-300" /><ShieldCheck size={32} className="text-gray-300" /></div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 3.2 SERTİFİKALAR ---
export const Preview32 = ({ data, settings }: { data: Staff[], settings: SettingsBase }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="MESUL MÜDÜR VE OPERATÖR SERTİFİKALARI" settings={settings} />
    <div className="flex-grow">
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde, hizmeti planlayan mesul müdür ve sahada fiilen uygulamayı yapan operatörlerin yetkinliklerini gösteren Sağlık Bakanlığı onaylı sertifikalarının suretleri yer almaktadır.</div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-3 text-left w-1/4">ADI SOYADI</th>
            <th className="border border-black p-3 text-left w-1/3">GÖREVİ</th>
            <th className="border border-black p-3 text-left">SERTİFİKA NO</th>
            <th className="border border-black p-3 text-center">GEÇERLİLİK TARİHİ</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s.id}>
              <td className="border border-black p-3 font-bold">{s.adSoyad}</td>
              <td className="border border-black p-3">{s.gorev}</td>
              <td className="border border-black p-3 font-mono">{s.sertifikaNo}</td>
              <td className="border border-black p-3 text-center">{s.gecerlilikTarihi}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-12 text-center border-t border-b border-black py-8 bg-gray-50">
        <h3 className="font-bold text-lg mb-2 text-gray-800">EKLER</h3>
        <p className="text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen personelin sertifika fotokopileri/suretleri yer almaktadır.</p>
        <div className="flex justify-center gap-4 mt-4"><Users size={32} className="text-gray-300" /><Users size={32} className="text-gray-300" /><Users size={32} className="text-gray-300" /></div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 4.1 EKİPMAN KROKİSİ ---
export const Preview41 = ({ krokiImage, legendItems, settings, customerName }: { krokiImage: string | null, legendItems: LegendItem[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="ZARARLI MÜCADELESİ EKİPMAN KROKİSİ" settings={settings} />
    <div className="flex-grow flex flex-col">
      <div className="mb-2 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {customerName}</div>
      <div className="flex-1 border-2 border-dashed border-gray-300 rounded flex items-center justify-center relative overflow-hidden mb-4">
        {krokiImage ? (<img src={krokiImage} alt="Kroki" className="max-w-full max-h-full object-contain" />) : (<div className="text-gray-300 text-center"><Map size={48} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Kroki Görseli Yüklenmedi</p></div>)}
      </div>
      <div className="border border-black p-2 mt-auto">
        <h4 className="font-bold border-b border-black mb-2 pb-1 text-sm bg-gray-100 px-1">LEJANT / İŞARET DİLİ</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {legendItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="font-bold border border-black w-8 h-6 flex items-center justify-center bg-white">{item.kod}</div>
              <span>{item.aciklama}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 4.2 EKİPMAN TAKİP ---
export const Preview42 = ({ stations, settings, customerName }: { stations: Station[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="EKİPMAN TAKİP VE KONTROL FORMU" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-xs font-bold uppercase border-b border-gray-400 pb-1 flex justify-between"><span>Firma: {customerName}</span><span>Tarih: .........................</span></div>
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-1 w-12 text-center">NO</th>
            <th className="border border-black p-1 text-left">LOKASYON</th>
            <th className="border border-black p-1 text-center w-12">TİP</th>
            <th className="border border-black p-1 w-16 text-center">DURUM</th>
            <th className="border border-black p-1 w-20 text-center">AKTİVİTE</th>
            <th className="border border-black p-1 w-16 text-center">TEMİZLİK</th>
            <th className="border border-black p-1 text-left">UYGULAMA / AÇIKLAMA</th>
          </tr>
        </thead>
        <tbody>
          {stations.length === 0 ? (
            <tr><td colSpan={7} className="p-4 text-center italic text-gray-500">Lütfen soldaki panelden istasyon listesini oluşturunuz.</td></tr>
          ) : (
            stations.map((station, index) => (
              <tr key={station.id} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                <td className="border border-black p-1 text-center font-bold">{station.no}</td>
                <td className="border border-black p-1">{station.location}</td>
                <td className="border border-black p-1 text-center">{station.type.charAt(0)}</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1"></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-4 text-[10px] border border-black p-2 bg-gray-50">
        <div className="font-bold mb-1">KISALTMALAR VE İŞARETLER:</div>
        <div className="grid grid-cols-4 gap-2">
          <div><strong>Durum:</strong> (S) Sağlam, (K) Kırık/Hasarlı, (Y) Yok</div>
          <div><strong>Aktivite:</strong> (Y) Yok, (T) Yem Tüketimi, (C) Canlı, (Ö) Ölü</div>
          <div><strong>Temizlik:</strong> (U) Uygun, (UD) Uygun Değil</div>
          <div><strong>Tip:</strong> (K) Kemirgen, (Y) Yürüyen, (I) ILT, (F) Feromon</div>
        </div>
      </div>
      <div className="mt-6 flex justify-between gap-4">
        <div className="border border-black p-2 w-1/2 h-20"><div className="text-[10px] font-bold border-b border-gray-300 mb-1">KONTROL EDEN (OPERATÖR)</div></div>
        <div className="border border-black p-2 w-1/2 h-20"><div className="text-[10px] font-bold border-b border-gray-300 mb-1">TESLİM ALAN (MÜŞTERİ YETKİLİSİ)</div></div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 5.1 EK-1 FORMU ---
export const Preview51 = ({ data, settings, customerName }: { data: ApplicationRecord, settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="EK-1 BİYOSİDAL ÜRÜN UYGULAMA İŞLEM FORMU" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1 flex justify-between">
        <span>Firma: {customerName}</span>
        <span>Tarih: {data.uygulama_tarihi.split('-').reverse().join('.')}</span>
      </div>
      <table className="w-full border-collapse border border-black text-sm mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>UYGULAMA TARİHİ</td>
            <td className="border border-black p-2">{data.uygulama_tarihi.split('-').reverse().join('.')}</td>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>BAŞLANGIÇ SAATİ</td>
            <td className="border border-black p-2">{data.baslangic_saati}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>BİTİŞ SAATİ</td>
            <td className="border border-black p-2">{data.bitis_saati}</td>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>HAVA DURUMU</td>
            <td className="border border-black p-2">{data.hava_durumu}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>SICAKLIK</td>
            <td className="border border-black p-2">{data.sicaklik}</td>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>NEM ORANI</td>
            <td className="border border-black p-2">{data.nem}</td>
          </tr>
        </tbody>
      </table>
      {/* Ana içerik */}
      <table className="w-full border-collapse border border-black text-sm mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>UYGULANAN ALAN</td>
            <td className="border border-black p-2">{data.uygulanan_alan}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>HEDEF HASERE</td>
            <td className="border border-black p-2">{data.hedef_hasere}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>KULLANILAN ÜRÜN</td>
            <td className="border border-black p-2">{data.kullanilan_urun}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>UYGULAMA METODU</td>
            <td className="border border-black p-2">{data.uygulama_metodu}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>DOZAJ / MİKTAR</td>
            <td className="border border-black p-2">{data.dozaj}</td>
          </tr>
        </tbody>
      </table>
      <div className="border border-black p-4 mb-4">
        <div className="font-bold border-b border-black mb-2 pb-1 text-sm">UYGULAMA DETAYLARI VE AÇIKLAMALAR:</div>
        <div className="h-20"></div>
      </div>
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="border border-black p-4 h-20">
          <div className="text-xs font-bold border-b border-gray-300 mb-2">UYGULAYAN OPERATÖR</div>
          <div className="font-semibold">{data.operatör}</div>
          <div className="text-xs text-gray-500 mt-2">(İmza)</div>
        </div>
        <div className="border border-black p-4 h-20">
          <div className="text-xs font-bold border-b border-gray-300 mb-2">MÜŞTERİ YETKİLİSİ</div>
          <div className="font-semibold">{data.müşteri_yetkilisi}</div>
          <div className="text-xs text-gray-500 mt-2">(İmza)</div>
        </div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 5.2 ÜRÜN LİSTESİ ---
export const Preview52 = ({ products, settings, customerName }: { products: Product[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="ONAYLI BİYOSİDAL ÜRÜN LİSTESİ" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {customerName}</div>
      <div className="mb-4 p-2 bg-gray-50 border text-xs italic">Bu liste, işletmede haşere mücadelesi kapsamında kullanılması planlanan ve T.C. Sağlık Bakanlığı tarafından ruhsatlandırılmış biyosidal ürünleri içerir.</div>
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-2 w-10 text-center">S.NO</th>
            <th className="border border-black p-2 text-left">ÜRÜN TİCARİ ADI</th>
            <th className="border border-black p-2 text-left">AKTİF MADDESİ</th>
            <th className="border border-black p-2 text-left">RUHSAT NO</th>
            <th className="border border-black p-2 text-left">HEDEF HAŞERE</th>
            <th className="border border-black p-2 text-left">ANTİDOTU</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.id}>
              <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
              <td className="border border-black p-2 font-semibold">{product.urunAdi}</td>
              <td className="border border-black p-2">{product.aktifMadde}</td>
              <td className="border border-black p-2 font-mono">{product.ruhsatNo}</td>
              <td className="border border-black p-2">{product.hedefHasere}</td>
              <td className="border border-black p-2">{product.antidot}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-xs text-gray-600">* Listede belirtilen ürünlerin Malzeme Güvenlik Bilgi Formları (MSDS) ve Etiket örnekleri dosya ekinde mevcuttur.</div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 5.3 KULLANIM KARTI ---
export const Preview53 = ({ usageCards, settings, customerName }: { usageCards: UsageCard[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="BİYOSİDAL ÜRÜN KULLANIM KARTI" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {customerName}</div>
      {usageCards.length === 0 ? (
        <div className="text-center text-gray-400 py-20 text-lg border-2 border-dashed rounded">Henüz kullanım kartı oluşturulmamış.</div>
      ) : (
        <div className="space-y-6">
          {usageCards.slice(0, 2).map((card, index) => (
            <div key={card.id} className="border border-black">
              <div className="bg-gray-100 p-2 border-b border-black">
                <h3 className="font-bold text-sm">ÜRÜN ADI: {card.urun_adi}</h3>
                <div className="text-xs">Başlangıç Stoku: {card.baslangic_stok} birim</div>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
                    <th className="border border-black p-1 w-20">TARİH</th>
                    <th className="border border-black p-1">KULLANILAN MİKTAR</th>
                    <th className="border border-black p-1">KALAN STOK</th>
                    <th className="border border-black p-1">AÇIKLAMA</th>
                    <th className="border border-black p-1 w-20">İMZA</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);

// --- 6.1 ATIK İMHA ---
export const Preview61 = ({ records, settings, customerName }: { records: WasteRecord[], settings: SettingsBase, customerName: string }) => (
  <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
    <A4Header title="ATIK İMHA BELGESİ" settings={settings} />
    <div className="flex-grow">
      <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {customerName}</div>
      <div className="mb-4 p-2 bg-gray-50 border text-xs italic">Bu belge, biyosidal ürün uygulaması sonrası ortaya çıkan boş ambalajların ve atık malzemelerin çevre mevzuatına uygun olarak bertaraf edildiğini kanıtlar.</div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
            <th className="border border-black p-2 w-10 text-center">S.NO</th>
            <th className="border border-black p-2 text-left">ATIK TÜRÜ</th>
            <th className="border border-black p-2 w-16 text-center">MİKTAR</th>
            <th className="border border-black p-2 w-20 text-center">İMHA TARİHİ</th>
            <th className="border border-black p-2 text-left">İMHA FİRMASI</th>
            <th className="border border-black p-2 text-left">BELGE NO</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr key={record.id}>
              <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
              <td className="border border-black p-2">{record.atik_turu}</td>
              <td className="border border-black p-2 text-center">{record.miktar}</td>
              <td className="border border-black p-2 text-center">{record.imha_tarihi.split('-').reverse().join('.')}</td>
              <td className="border border-black p-2">{record.imha_firması}</td>
              <td className="border border-black p-2 font-mono">{record.belge_no}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 text-xs border border-black p-4 bg-gray-50">
        <div className="font-bold mb-2">ÖNEMLİ NOT:</div>
        <div>Yukarıda listelenen atık malzemeler, T.C. Çevre ve Şehircilik Bakanlığı tarafından yetkilendirilmiş lisanslı bertaraf firmasına teslim edilmiştir. İlgili makbuzlar bu dokümanın ekinde bulunmaktadır.</div>
      </div>
      <div className="mt-8 flex justify-between gap-8">
        <div className="border border-black p-4 w-1/2 h-24">
          <div className="text-xs font-bold border-b border-gray-300 mb-2">SORUMLU OPERATÖR</div>
          <div className="text-xs text-gray-500 mt-8">(İmza ve Kaşe)</div>
        </div>
        <div className="border border-black p-4 w-1/2 h-24">
          <div className="text-xs font-bold border-b border-gray-300 mb-2">MÜŞTERİ YETKİLİSİ</div>
          <div className="text-xs text-gray-500 mt-8">(İmza ve Kaşe)</div>
        </div>
      </div>
    </div>
    <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
  </div>
);