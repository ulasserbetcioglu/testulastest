// src/utils/contractGenerator.ts

interface ContractCompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
}

interface ContractProposalItem {
  service_name: string;
  service_description: string;
  visit_count: number;
  unit_price: number;
  unit_type: string;
  item_type?: 'service' | 'product';
}

interface ContractProposal {
  company_name: string;
  contact_person: string;
  recipient_email: string;
  total_amount: number;
  discount_amount: number;
  application_area: string;
  customer_notes: string | null;
  included_pests: string[] | string | null;
  proposal_items: ContractProposalItem[];
  summer_visit_frequency?: number;
  winter_visit_frequency?: number;
}

interface ContractParams {
  proposal: ContractProposal;
  settings: ContractCompanySettings | null;
  contractNumber: string;
  startDate?: string;
  endDate?: string;
}

function getPestsString(pests: string[] | string | null): string {
  if (!pests) return 'Genel Haşere ve Kemirgen';
  
  let pestList: string[] = [];

  if (Array.isArray(pests)) {
    pestList = pests;
  } else if (typeof pests === 'string') {
    if (pests.startsWith('[') && pests.endsWith(']')) {
        try {
            const parsed = JSON.parse(pests);
            if (Array.isArray(parsed)) pestList = parsed;
        } catch (e) {
            pestList = pests.replace(/[\[\]"]/g, '').split(',');
        }
    } else {
        pestList = pests.split(',');
    }
  }

  return pestList.map(p => p.trim()).filter(Boolean).join(', ');
}

function numberToTurkishWords(n: number): string {
  if (n === 0) return 'SIFIR';
  const units = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
  let result = '';
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tensD = Math.floor((n % 100) / 10);
  const unitsD = n % 10;
  if (thousands > 0) result += (thousands === 1 ? '' : units[thousands] + ' ') + 'BİN ';
  if (hundreds > 0) result += (hundreds === 1 ? '' : units[hundreds] + ' ') + 'YÜZ ';
  if (tensD > 0) result += tens[tensD] + ' ';
  if (unitsD > 0) result += units[unitsD] + ' ';
  return result.trim();
}

function formatTL(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function generateContractHtml({ proposal, settings, contractNumber, startDate: customStart, endDate: customEnd }: ContractParams): string {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const startDate = customStart || now.toLocaleDateString('tr-TR');
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  oneYearLater.setDate(oneYearLater.getDate() - 1);
  const endDate = customEnd || oneYearLater.toLocaleDateString('tr-TR');

  const pestsString = getPestsString(proposal.included_pests);
  const appArea = proposal.application_area || 'İŞLETME İÇ VE DIŞ ALANI';
  
  const serviceItems = proposal.proposal_items.filter(i => i.item_type !== 'product');
  const productItems = proposal.proposal_items.filter(i => i.item_type === 'product');
  
  const perVisitTotal = serviceItems.reduce((sum, item) => sum + item.unit_price, 0);
  
  const logoUrl = settings?.logo_url || '';
  const companyName = settings?.company_name || 'SİSTEM İLAÇLAMA SAN. VE TİC. LTD. ŞTİ.';
  const amountWords = numberToTurkishWords(Math.floor(perVisitTotal));

  const summerFreq = proposal.summer_visit_frequency || 1;
  const winterFreq = proposal.winter_visit_frequency || 1;

  const S = {
    h2: 'font-size: 11pt; font-weight: 700; text-decoration: underline; margin: 12px 0 8px 0;',
    p: 'font-size: 10pt; text-align: justify; margin: 3px 0;',
    sub: 'font-size: 10pt; margin: 2px 0 2px 20px;',
    subTitle: 'font-size: 10pt; margin: 6px 0 2px 0;',
    th: 'border: 1px solid #333; padding: 6px; font-size: 9pt; background-color: #f5f5f5; font-weight: 700; vertical-align: middle; text-align: center;',
    td: 'border: 1px solid #333; padding: 6px; font-size: 9pt; vertical-align: top; word-wrap: break-word;',
  };

  // YENİ: HİZMET KALEMLERİ TABLO - Detaylı Görünüm
  const serviceItemsTable = serviceItems.length > 0 ? `
    <p style="${S.subTitle}"><strong>9.1.1.1. Hizmet Kalemleri:</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:6px 0; table-layout: fixed;">
      <thead><tr>
        <th style="${S.th} width:5%;">NO</th>
        <th style="${S.th} width:30%;">HİZMET ADI</th>
        <th style="${S.th} width:35%;">AÇIKLAMA</th>
        <th style="${S.th} width:15%;">ZİYARET/AY</th>
        <th style="${S.th} width:15%; text-align:right;">BİRİM FİYAT</th>
      </tr></thead>
      <tbody>
        ${serviceItems.map((item, idx) => `
          <tr>
            <td style="${S.td} text-align:center;">${idx + 1}</td>
            <td style="${S.td}">${item.service_name.toUpperCase()}</td>
            <td style="${S.td}">${item.service_description || pestsString}</td>
            <td style="${S.td} text-align:center;">${item.unit_type === 'seferlik' ? 'Tek Sefer' : item.visit_count + ' ziyaret'}</td>
            <td style="${S.td} text-align:right; white-space:nowrap;">${formatTL(item.unit_price)}.-TL+KDV</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f0f9ff;">
          <td colspan="4" style="${S.td} text-align:right; font-weight:700;">TOPLAM HİZMET BEDELİ (SEFER BAŞI):</td>
          <td style="${S.td} text-align:right; font-weight:700; white-space:nowrap;">${formatTL(perVisitTotal)}.-TL+KDV</td>
        </tr>
      </tbody>
    </table>
  ` : '';

  const materialSection = productItems.length > 0 ? `
    <p style="${S.subTitle}"><strong>9.1.1.2.</strong> Ekipman ve Ürün Satışı:</p>
    <table style="width:100%; border-collapse:collapse; margin:6px 0; table-layout: fixed;">
      <thead><tr>
        <th style="${S.th} width:5%;">NO</th>
        <th style="${S.th} width:45%;">MALZEME</th>
        <th style="${S.th} width:15%; text-align:center;">MİKTAR</th>
        <th style="${S.th} width:15%; text-align:center;">BİRİM</th>
        <th style="${S.th} width:20%; text-align:right;">BİRİM FİYAT</th>
      </tr></thead>
      <tbody>
        ${productItems.map((item, idx) => {
          const unitLabel = (item.unit_type || 'ADET').toUpperCase();
          return `<tr>
            <td style="${S.td} text-align:center;">${idx + 1}</td>
            <td style="${S.td}">${item.service_name.toUpperCase()}</td>
            <td style="${S.td} text-align:center;">${item.visit_count} ${unitLabel}</td>
            <td style="${S.td} text-align:center;">TL/${unitLabel}</td>
            <td style="${S.td} text-align:right; white-space:nowrap;">${formatTL(item.unit_price)}.-TL+KDV/${unitLabel}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '';

  return `<div style="font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color: #1a1a1a; line-height: 1.45; font-size: 10pt;">
  <style>
    .contract-body p { page-break-inside: avoid; break-inside: avoid; }
    .contract-body h3 { page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
    .contract-body tr { page-break-inside: avoid; break-inside: avoid; }
    .contract-no-break { page-break-inside: avoid; break-inside: avoid; }
    table { width: 100%; table-layout: fixed; word-wrap: break-word; }
  </style>

  <div style="height: 247mm; display: flex; flex-direction: column; justify-content: space-between; padding: 30px 40px; page-break-after: always; overflow: hidden;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="font-size: 10px; color: #888;"></div>
      <div>${logoUrl ? `<img src="${logoUrl}" style="height: 65px; object-fit: contain;" crossorigin="anonymous" />` : `<span style="font-size: 28px; font-weight: 800; color: #1a7d37;">PestMENTOR</span>`}</div>
    </div>

    <div style="text-align: center; padding: 20px 0;">
      <div style="display: inline-flex; align-items: center; gap: 16px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: 700; color: #222; letter-spacing: 1.5px; line-height: 1.3;">ZARARLI MÜCADELESİ</div>
          <div style="font-size: 24px; font-weight: 700; color: #222; letter-spacing: 1.5px; line-height: 1.3;">HİZMET SÖZLEŞMESİ</div>
        </div>
        <div style="border-left: 3px solid #1a7d37; padding-left: 16px;">
          <div style="font-size: 52px; font-weight: 300; color: #222;">${currentYear}</div>
        </div>
      </div>
      <div style="margin-top: 30px; font-size: 13px; color: #444; line-height: 2;">
        <p style="margin:0;"><strong>${companyName}</strong></p>
        <p style="margin:0; font-size:11px; color:#888;">ve</p>
        <p style="margin:0;"><strong>${proposal.company_name.toUpperCase()}</strong></p>
      </div>
    </div>

    <div style="text-align: center; font-size: 11px; color: #555; line-height: 1.8;">
      <p style="margin:0; font-weight:600;">${settings?.phone || ''}</p>
      <p style="margin:0;">${settings?.website || ''}</p>
      <p style="margin:0;">${settings?.email || ''}</p>
    </div>
  </div>

  <div class="contract-body" style="padding: 10px 40px 30px 40px;">

    <h2 style="font-size: 14pt; font-weight: 800; margin: 0 0 12px 0; display: flex; justify-content: space-between; align-items: baseline;">
      <span>HİZMET SÖZLEŞMESİ</span>
      <span style="font-size: 10pt; font-weight: 600;">SÖZLEŞME NO: ${contractNumber}</span>
    </h2>

    <h3 style="${S.h2}">1. SÖZLEŞME TANIM</h3>
    <p style="${S.p}">İşbu sözleşme, <strong>${proposal.company_name.toUpperCase()}</strong> ("İŞVEREN") ile <strong>${companyName.toUpperCase()}</strong> ("PestMENTOR") arasında akdedilmiş olup, İŞVEREN tesislerinde Entegre Zararlı Mücadelesi (IPM) hizmetlerinin sunulmasına ilişkin hükümler içerir.</p>

    <h3 style="${S.h2}">2. TARAFLAR</h3>
    <table style="width:100%; font-size:9.5pt; margin-bottom:12px; border:none;">
      <tr><td style="width:155px; font-weight:700; padding:2px 0; border:none;">İŞVEREN</td><td style="padding:2px 0; border:none;">: <strong>${proposal.company_name.toUpperCase()}</strong></td></tr>
      <tr><td style="font-weight:700; padding:2px 0; border:none;">YETKİLİ</td><td style="padding:2px 0; border:none;">: ${proposal.contact_person || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0; border:none;">E-POSTA</td><td style="padding:2px 0; border:none;">: ${proposal.recipient_email || ''}</td></tr>
    </table>

    <table style="width:100%; font-size:9.5pt; margin-bottom:12px; border:none;">
      <tr><td style="width:155px; font-weight:700; padding:2px 0; border:none;">HİZMET SAĞLAYICI</td><td style="padding:2px 0; border:none;">: <strong>${companyName} - PestMentor</strong></td></tr>
      <tr><td style="font-weight:700; padding:2px 0; border:none;">ADRES</td><td style="padding:2px 0; border:none;">: ${settings?.address || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0; border:none;">TELEFON</td><td style="padding:2px 0; border:none;">: ${settings?.phone || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0; border:none;">E-POSTA</td><td style="padding:2px 0; border:none;">: ${settings?.email || ''}</td></tr>
    </table>

    <h3 style="${S.h2}">3. HİZMET KAPSAMI</h3>
    <p style="${S.p}; margin-bottom:8px;">Aşağıda belirtilen zararlılara karşı mücadele hizmetleri sunulacaktır:</p>
    
    <table style="width:100%; border-collapse:collapse; margin:8px 0; table-layout: fixed;">
      <thead><tr>
        <th style="${S.th} width: 35%;">ZARARLI TÜRÜ</th>
        <th style="${S.th} width: 20%;">YAZ SIKLIĞI<br/>(Nisan-Eylül)</th>
        <th style="${S.th} width: 20%;">KIŞ SIKLIĞI<br/>(Ekim-Mart)</th>
        <th style="${S.th} width: 25%;">UYGULAMA ALANI</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${S.td}">${pestsString}</td>
          <td style="${S.td} text-align:center;">${summerFreq} ziyaret/ay</td>
          <td style="${S.td} text-align:center;">${winterFreq} ziyaret/ay</td>
          <td style="${S.td}">${appArea}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="${S.h2}">4. SÖZLEŞME SÜRESİ</h3>
    <p style="${S.p}">Sözleşme <strong>${startDate}</strong> tarihinde başlar ve <strong>${endDate}</strong> tarihinde sona erer. Taraflardan herhangi birinin 30 gün önceden yazılı fesih bildirimi yapmaması halinde otomatik olarak 1 yıl uzar.</p>

    <h3 style="${S.h2}">5. MALİ HÜKÜMLER</h3>
    <p style="${S.sub}"><strong>5.1. Hizmet Bedeli: <u>${formatTL(perVisitTotal)}.-TL+KDV/SEFER (${amountWords} + KDV/SEFER)</u></strong></p>
    
    ${serviceItemsTable}
    ${materialSection}

    <p style="${S.subTitle}"><strong>5.2. Ödeme Koşulları</strong></p>
    <p style="${S.sub}">Faturalar hizmet ayının ilk 25 iş günü içinde düzenlenir ve 30 gün içinde ödenir.</p>

    <table style="width:100%; border-collapse:collapse; margin:8px 0;">
      <thead><tr>
        <th style="${S.th}">BANKA</th>
        <th style="${S.th}">ŞUBE</th>
        <th style="${S.th}">HESAP NO</th>
        <th style="${S.th}">IBAN</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${S.td} text-align:center;">GARANTİ BBVA</td>
          <td style="${S.td} text-align:center;">Gazcılar</td>
          <td style="${S.td} text-align:center;">37-6202789</td>
          <td style="${S.td} text-align:center;">TR660006200003700006202789</td>
        </tr>
      </tbody>
    </table>

    <h3 style="${S.h2}">6. YETKILER VE SORUMLULUKLAR</h3>
    <p style="${S.p}"><strong>6.1. PestMENTOR:</strong> Ruhsatlı ürün kullanma, uygulama stratejisi belirleme ve raporlama yetkisine sahiptir.</p>
    <p style="${S.p}"><strong>6.2. İŞVEREN:</strong> Çalışma alanlarını hazırlama, yeni aktiviteleri bildirme ve düzeltici faaliyetleri yerine getirme yükümlülüğü vardır.</p>

    <div style="page-break-inside: avoid; margin-top:30px;">
    <h3 style="${S.h2}">7. HÜKÜMLER</h3>
    <p style="${S.p}">İşbu sözleşme ${startDate} tarihinde imzalanmış ve 2 nüsha olarak düzenlenmiştir.</p>

    <table style="width:100%; margin-top:30px; border-collapse:collapse;">
      <tr>
        <td style="width:50%; text-align:center; padding:15px; border:1px solid #333; vertical-align:top;">
          <strong>HİZMET SAĞLAYICI</strong><br/><br/>
          ${companyName}<br/>
          <div style="height:70px;"></div>
          <strong style="font-size:9pt;">İmza / Kaşe</strong>
        </td>
        <td style="width:50%; text-align:center; padding:15px; border:1px solid #333; vertical-align:top;">
          <strong>İŞVEREN</strong><br/><br/>
          ${proposal.company_name.toUpperCase()}<br/>
          <div style="height:70px;"></div>
          <strong style="font-size:9pt;">İmza / Kaşe</strong>
        </td>
      </tr>
    </table>
    </div>
  </div>

</div>`;
}