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
}

interface ContractParams {
  proposal: ContractProposal;
  settings: ContractCompanySettings | null;
  contractNumber: string;
  startDate?: string;
  endDate?: string;
}

function getPestsString(pests: string[] | string | null): string {
  if (Array.isArray(pests)) return pests.join(', ');
  if (typeof pests === 'string') return pests;
  return 'Genel Haşere ve Kemirgen';
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

function derivePestType(serviceName: string, fallback: string): string {
  const name = serviceName.toLowerCase();
  if (name.includes('kemirgen') || name.includes('fare')) return 'Fare ve Sıçanlar';
  if (name.includes('uçkun') || name.includes('sinek') || name.includes('sivrisinek')) return 'Karasinek, Sivrisinek, Arı';
  if (name.includes('yürüyen') || name.includes('haşere') || name.includes('böcek')) return 'Hamam böceği ve Karınca';
  if (name.includes('kuş') || name.includes('güvercin')) return 'Serçe, Güvercin';
  if (name.includes('sürüngen') || name.includes('yılan')) return 'Yılan';
  if (name.includes('ambar') || name.includes('güve')) return 'Güve';
  if (name.includes('pire') || name.includes('kene')) return 'Pire, Kene';
  return fallback;
}

function isObservationCategory(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('kuş') || n.includes('sürüngen') || n.includes('ambar');
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

  const S = {
    header: `display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #1a7d37; margin-bottom: 20px;`,
    h2: 'font-size: 11pt; font-weight: 700; text-decoration: underline; margin: 12px 0 8px 0;',
    p: 'font-size: 10pt; text-align: justify; margin: 3px 0;',
    sub: 'font-size: 10pt; margin: 2px 0 2px 20px;',
    subTitle: 'font-size: 10pt; margin: 6px 0 2px 0;',
    th: 'border: 1px solid #333; padding: 5px 6px; font-size: 8pt; background-color: #f5f5f5; font-weight: 700;',
    td: 'border: 1px solid #333; padding: 5px 6px; font-size: 8.5pt;',
  };

  const pageHeader = `
    <div style="${S.header}">
      <div>${logoUrl ? `<img src="${logoUrl}" style="height: 42px; object-fit: contain;" crossorigin="anonymous" />` : `<span style="font-size: 14px; font-weight: 800; color: #1a7d37;">PestMENTOR</span>`}</div>
      <div style="text-align: right; font-size: 9px; color: #555;">${companyName}</div>
    </div>`;

  const serviceRows = serviceItems.map(item => {
    const category = item.service_name.toUpperCase();
    const pestType = derivePestType(item.service_name, pestsString);
    const isObs = isObservationCategory(item.service_name);
    const baseFreq = item.unit_type === 'seferlik' ? 'Tek Seferlik' : `Aylık ${item.visit_count} Ziyaret`;
    const suffix = isObs ? '<br/>(Gözlem &amp; Danışmanlık)' : '';
    return `<tr>
      <td style="${S.td} font-weight:600;">${category}</td>
      <td style="${S.td}">${pestType}</td>
      <td style="${S.td}">${baseFreq}${suffix}</td>
      <td style="${S.td}">${baseFreq}${suffix}</td>
      <td style="${S.td}">${appArea}</td>
    </tr>`;
  }).join('');

  const materialRows = productItems.map((item, idx) => {
    const unitLabel = (item.unit_type || 'ADET').toUpperCase();
    return `<tr>
      <td style="${S.td} text-align:center;">${idx + 1}</td>
      <td style="${S.td}">${item.service_name.toUpperCase()}</td>
      <td style="${S.td} text-align:center;">1 ${unitLabel}</td>
      <td style="${S.td} text-align:center;">TL/${unitLabel}</td>
      <td style="${S.td} text-align:right; white-space:nowrap;">${formatTL(item.unit_price)}.-TL+KDV/${unitLabel}</td>
    </tr>`;
  }).join('');

  const materialSection = productItems.length > 0 ? `
    <p style="${S.subTitle}"><strong>9.1.1.3.</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:6px 0;">
      <thead><tr>
        <th style="${S.th} width:30px;">NO</th>
        <th style="${S.th}">MALZEME</th>
        <th style="${S.th} width:80px; text-align:center;">MİKTAR</th>
        <th style="${S.th} width:70px; text-align:center;">BİRİM</th>
        <th style="${S.th} width:130px; text-align:right;">BİRİM FİYAT</th>
      </tr></thead>
      <tbody>${materialRows}</tbody>
    </table>` : '';

  return `<div style="font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color: #1a1a1a; line-height: 1.45; font-size: 10pt;">
  <style>
    .contract-body p { page-break-inside: avoid; break-inside: avoid; }
    .contract-body h3 { page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
    .contract-body tr { page-break-inside: avoid; break-inside: avoid; }
    .contract-no-break { page-break-inside: avoid; break-inside: avoid; }
  </style>

  <!-- ==================== KAPAK SAYFASI ==================== -->
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

  <!-- ==================== TÜM İÇERİK: MADDE 1-10 (TEK AKIŞ) ==================== -->
  <div class="contract-body" style="padding: 10px 40px 30px 40px;">

    <h2 style="font-size: 14pt; font-weight: 800; margin: 0 0 12px 0; display: flex; justify-content: space-between; align-items: baseline;">
      <span>HİZMET SÖZLEŞMESİ</span>
      <span style="font-size: 10pt; font-weight: 600;">SÖZLEŞME NUMARASI :${contractNumber}</span>
    </h2>

    <h3 style="${S.h2}">1.&nbsp;&nbsp;&nbsp;&nbsp;SÖZLEŞMENİN KONUSU</h3>
    <p style="${S.p}">İşbu sözleşme, bir tarafta <strong>${proposal.company_name.toUpperCase()}</strong> (Sözleşmede "İŞVEREN" olarak anılacaktır) ile diğer tarafta <strong>${companyName.toUpperCase()}</strong> (Sözleşmede "PestMENTOR" olarak anılacaktır) arasında akdedilmiştir.</p>
    <p style="${S.p}">Sözleşmenin konusu; İŞVEREN'e ait tesislerde,</p>
    <p style="${S.sub}"><strong>1.1.</strong> İnsan sağlığını,</p>
    <p style="${S.sub}"><strong>1.2.</strong> Hammadde güvenliğini,</p>
    <p style="${S.sub}"><strong>1.3.</strong> Ürün kalitesini olumsuz yönde etkileyebilecek zararlı popülasyonunun kontrol altına alınması,</p>
    <p style="${S.p}">amacıyla, PestMENTOR tarafından "Onaylanmış Alanlarda" sunulacak Entegre Zararlı Mücadelesi (IPM) hizmetlerinin; teknik, idari, mali ve hukuki şartlarını ve tarafların karşılıklı yükümlülüklerini tanımlar.</p>

    <h3 style="${S.h2}">2.&nbsp;&nbsp;&nbsp;&nbsp;TARAFLAR</h3>
    <table style="width:100%; font-size:9.5pt; margin-bottom:6px; border:none;">
      <tr><td style="width:155px; font-weight:700; padding:2px 0;">HİZMET ALAN FİRMA</td><td style="padding:2px 0;">: <strong>${proposal.company_name.toUpperCase()}</strong></td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">ADRES</td><td style="padding:2px 0;">: ${proposal.customer_notes || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">TELEFON</td><td style="padding:2px 0;">: ${proposal.contact_person || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">E-POSTA</td><td style="padding:2px 0;">: ${proposal.recipient_email || ''}</td></tr>
    </table>
    <p style="font-size:9pt; font-weight:700; margin:4px 0 12px 0;">SÖZLEŞME METNİNDE BUNDAN SONRA SADECE '' İŞVEREN '' OLARAK ANILACAKTIR.</p>

    <table style="width:100%; font-size:9.5pt; margin-bottom:6px; border:none;">
      <tr><td style="width:155px; font-weight:700; padding:2px 0;">HİZMET VEREN FİRMA</td><td style="padding:2px 0;">: <strong>${companyName} – PestMentor</strong></td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">ADRES</td><td style="padding:2px 0;">: ${settings?.address || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">TELEFON</td><td style="padding:2px 0;">: ${settings?.phone || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">E-POSTA</td><td style="padding:2px 0;">: ${settings?.email || ''}</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">VERGİ NUMARASI</td><td style="padding:2px 0;">: 771 003 5611</td></tr>
      <tr><td style="font-weight:700; padding:2px 0;">VERGİ DAİRESİ</td><td style="padding:2px 0;">: SETBAŞI</td></tr>
    </table>
    <p style="font-size:9pt; font-weight:700; margin:4px 0 12px 0;">SÖZLEŞME METNİNDE BUNDAN SONRA SADECE '' PestMENTOR '' OLARAK ANILACAKTIR.</p>

    <h3 style="${S.h2}">3.&nbsp;&nbsp;&nbsp;&nbsp;YAPILACAK İŞİN TANIMI</h3>
    <p style="${S.p}; margin-bottom:8px;">Yukarıda adresi belirtilen İŞVEREN işletmesinde aşağıda belirtilen zararlılara karşı yapılacak mücadelenin denetimi, engellenmesi ve yok edilmesi hizmetleridir.</p>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr>
        <th style="${S.th}">HİZMET KATEGORİSİ</th>
        <th style="${S.th}">ZARARLI TÜRÜ</th>
        <th style="${S.th}">PERİYODİK ZİYARET SIKLIĞI<br/>(YAZ AYLARI NİSAN-EYLÜL<br/>AYLARI ARASI)</th>
        <th style="${S.th}">PERİYODİK ZİYARET SIKLIĞI<br/>(KIŞ AYLARI EKİM-MART<br/>AYLARI ARASI)</th>
        <th style="${S.th}">UYGULAMA<br/>ALAN(LAR)I</th>
      </tr></thead>
      <tbody>${serviceRows}</tbody>
    </table>

    <h3 style="${S.h2}">4.&nbsp;&nbsp;&nbsp;&nbsp;YETKİ VE SORUMLULUKLAR</h3>
    <p style="${S.p}">PestMENTOR (Hizmet Sağlayıcı) ve İŞVEREN (Müşteri) taraflarının, sözleşme kapsamındaki entegre zararlı mücadelesi (IPM) hizmetlerine ilişkin yetki ve sorumluluklarını tanımlar.</p>

    <p style="${S.subTitle}"><strong>4.1.&nbsp;&nbsp;PestMENTOR'un Yetki ve Sorumlulukları</strong></p>

    <p style="${S.subTitle}"><strong>4.1.1. Hizmetin İcrası ve Gizlilik</strong></p>
    <p style="${S.p}">PestMENTOR, IPM hizmetlerini İŞVEREN yetkilisinin gözetiminde icra edecektir. Hizmet süresince elde edilen tüm ticari bilgilere yönelik gizlilik kurallarına, özel mülkün korunmasına ve mahremiyet ilkelerine ilişkin yasal mevzuata tam olarak riayet edecektir.</p>

    <p style="${S.subTitle}"><strong>4.1.2. Profesyonel Yetkinlik ve Malzeme Kullanımı</strong></p>
    <p style="${S.p}">PestMENTOR, T.C. Tarım ve Orman Bakanlığı ile Sağlık Bakanlığı tarafından onaylanmış ve ruhsatlandırılmış biyosidal ürünleri (insektisit, rodentisit vb.), cinsel çekici hormonları (feromon), monitörleri (yem istasyonları, tuzaklar) ve ilgili tüm ekipmanları kullanmaya yetkilidir.</p>

    <p style="${S.subTitle}"><strong>4.1.3. Operasyonel Karar Yetkisi</strong></p>
    <p style="${S.p}">Hizmetin etkinliğini sağlamak amacıyla aşağıda belirtilen konularda tam karar yetkisi PestMENTOR'a aittir:</p>
    <p style="${S.sub}"><strong>4.1.3.1.</strong> Durum değerlendirmesine göre kullanılacak ürünlerin türünü, dozajını ve uygulama stratejisini belirlemek veya değiştirmek.</p>
    <p style="${S.sub}"><strong>4.1.3.2.</strong> Gerekli görülen durumlarda monitör ve tuzakların sayısını artırmak, azaltmak veya yerlerini değiştirmek.</p>
    <p style="${S.sub}"><strong>4.1.3.3.</strong> Uygulama yöntemine (örn: ULV, jel, spreyleme, yemleme) ve hizmetin zamanlamasına/sıklığına karar vermek.</p>

    <p style="${S.subTitle}"><strong>4.1.4. Alan Güvenliği</strong></p>
    <p style="${S.p}">PestMENTOR, uygulama sırasında ve sonrasındaki kritik süre boyunca, İŞVEREN personeli de dahil olmak üzere yetkisiz kişilerin uygulama alanından uzak tutulmasını sağlama ve bu konuda İŞVEREN'e bağlayıcı talimat verme yetkisine sahiptir.</p>

    <p style="${S.subTitle}"><strong>4.1.5. Raporlama ve Takip</strong></p>
    <p style="${S.p}">Hizmet sonrası gözlem, takip ve periyodik kontrollerin yapılması, bulguların ve tespit edilen uygunsuzlukların İŞVEREN'e raporlanması PestMENTOR'un sorumluluğundadır.</p>

    <p style="${S.subTitle}"><strong>4.1.6. Tedarikçi Denetimi</strong></p>
    <p style="${S.p}">Gerekli görüldüğü takdirde ve İŞVEREN'in onayı alınmak suretiyle, İŞVEREN'in gıda, ambalaj vb. tedarikçi firmalarının zararlı mücadele açısından denetlenmesi PestMENTOR tarafından yapılabilir.</p>

    <p style="${S.subTitle}"><strong>4.2.&nbsp;&nbsp;İŞVEREN'in Yükümlülükleri</strong></p>

    <p style="${S.subTitle}"><strong>4.2.1. Alan Hazırlığı</strong></p>
    <p style="${S.p}">İŞVEREN, her periyodik hizmet veya kontrol öncesinde, PestMENTOR tarafından çalışma yapılacak alanları (örn: dolap içleri, makine çevreleri, depo alanları) erişilebilir ve çalışmaya hazır hale getirmekle yükümlüdür.</p>

    <p style="${S.subTitle}"><strong>4.2.2. Aktivite Bildirimi</strong></p>
    <p style="${S.p}">Hizmet sonrası zararlıdan arındırılmış olarak teslim edilen tesislerde, bir sonraki periyodik hizmet tarihine kadar görülebilecek herhangi bir yeni zararlı aktivitesinin (canlı haşere, dışkı, kemirgen izi vb.) derhal PestMENTOR'a bildirilmesi İŞVEREN'in sorumluluğundadır.</p>

    <p style="${S.subTitle}"><strong>4.2.3. Hizmet Münhasırlığı (Tek Yetkililik)</strong></p>
    <p style="${S.p}">İŞVEREN, sözleşme devam ettiği sürece, sözleşme kapsamındaki zararlılarla mücadeleye yönelik olarak PestMENTOR'un bilgisi ve onayı dışında üçüncü taraflardan hizmet alamaz; kendi bünyesinde hiçbir kimyasal uygulama (ilaçlama) yapamaz veya fiziksel tuzak/monitör kullanamaz.</p>

    <p style="${S.subTitle}"><strong>4.2.4. Ekipman Sorumluluğu</strong></p>
    <p style="${S.p}">PestMENTOR mülkiyetinde olan ve İŞVEREN tesisine kurulan monitörlerin (yem istasyonları, canlı yakalama tuzakları vb.) İŞVEREN personelinin ihmali, kastı veya hatalı kullanımı (örn: forklift ile ezme, yerini kaybetme) sonucu kırılması, kaybolması veya kullanılamaz hale gelmesi durumunda, ilgili ekipmanın bedeli İŞVEREN'e fatura edilir.</p>

    <p style="${S.subTitle}"><strong>4.2.5. Düzeltici Faaliyetlerin Uygulanması</strong></p>
    <p style="${S.p}">İŞVEREN, PestMENTOR tarafından sunulan raporlarda belirtilen ve zararlı aktivitesine zemin hazırlayan tüm yapısal ve hijyenik iyileştirmeleri karşılamakla yükümlüdür. Bu kapsama:</p>
    <p style="${S.sub}"><strong>4.2.5.1.</strong> Bina izolasyonuna yönelik fiziki önlemler (delik, çatlak, boşlukların kapatılması, kapı altı fırçalarının takılması vb.).</p>
    <p style="${S.sub}"><strong>4.2.5.2.</strong> Hijyen ve sanitasyon eksikliklerinin giderilmesi.</p>
    <p style="${S.sub}"><strong>4.2.5.3.</strong> BU MADDE BOŞ BIRAKILMIŞTIR.</p>

    <h3 style="${S.h2}">5.&nbsp;&nbsp;&nbsp;&nbsp;SÖZLEŞME SÜRESİ, YENİLENME VE FESİH ŞARTLARI</h3>
    <p style="${S.p}">İşbu sözleşme, <strong>${startDate}</strong> tarihinde yürürlüğe girer ve <strong>${endDate}</strong> tarihine kadar geçerlidir. Bu, sözleşmenin "İlk Geçerlilik Dönemi" olarak anılacaktır.</p>

    <p style="${S.subTitle}"><strong>5.1. Otomatik Yenileme ve Fiyat Güncellemesi</strong></p>
    <p style="${S.sub}"><strong>5.1.1.</strong> Sözleşme, İlk Geçerlilik Dönemi'nin veya takip eden yenileme dönemlerinin bitiş tarihinden en az otuz (30) gün önce taraflardan herhangi birinin yazılı fesih ihbarında bulunmaması halinde, otomatik olarak bir (1) yıl süreyle yenilenmiş sayılır. Bu hüküm, takip eden tüm yıllar için aynı şekilde geçerlidir.</p>
    <p style="${S.sub}"><strong>5.1.2.</strong> BU MADDE BOŞ BIRAKILMIŞTIR.</p>

    <p style="${S.subTitle}"><strong>5.2. Fesih Koşulları ve Devir Yasağı</strong></p>
    <p style="${S.sub}"><strong>5.2.1.</strong> İŞVEREN, sözleşmenin İlk Geçerlilik Dönemi boyunca sözleşmeyi tek taraflı olarak feshetme hakkına sahip değildir.</p>
    <p style="${S.sub}"><strong>5.2.2.</strong> Sözleşme, ancak tarafların yetkili imzacıları tarafından usulüne uygun olarak feshedilebilir.</p>
    <p style="${S.sub}"><strong>5.2.3.</strong> Taraflardan hiçbiri, diğer tarafın önceden yazılı onayını almaksızın işbu sözleşmeyi veya sözleşmeden doğan hak ve yükümlülüklerini kısmen veya tamamen üçüncü bir şahsa devredemez veya temlik edemez.</p>

    <p style="${S.subTitle}"><strong>5.3. Hizmetin Devamlılığı Yükümlülüğü (Geçiş Süreci)</strong></p>
    <p style="${S.sub}"><strong>5.3.1.</strong> Sözleşmenin herhangi bir nedenle (sürenin dolması veya fesih) sona ermesi durumunda, İŞVEREN'in hizmet sürekliliğini sağlamak amacıyla yapacağı yazılı talep üzerine;</p>
    <p style="${S.sub}"><strong>5.3.2.</strong> PestMENTOR, İŞVEREN'in yeni bir hizmet sağlayıcı ile anlaşma sürecini tamamlayabilmesi için, sözleşmenin sona erme tarihinden itibaren en fazla bir (1) ay süreyle daha hizmet vermeyi taahhüt eder.</p>
    <p style="${S.sub}"><strong>5.3.3.</strong> Bu geçiş süreci hizmeti, işbu sözleşmede belirtilen aynı hükümler ve en son geçerli olan hizmet bedeli üzerinden faturalandırılır.</p>

    <h3 style="${S.h2}">6.&nbsp;&nbsp;&nbsp;&nbsp;UYUŞMAZLIKLARIN ÇÖZÜMÜ VE YETKİLİ HUKUK</h3>
    <p style="${S.p}"><strong>6.1.</strong> İşbu sözleşmenin yorumlanmasından veya uygulanmasından doğabilecek her türlü uyuşmazlık, ihtilaf veya talebin çözümünde Bursa Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.</p>

    <h3 style="${S.h2}">7.&nbsp;&nbsp;&nbsp;&nbsp;MÜCBİR SEBEPLER VE HİZMETİN ENGELLENMESİ</h3>
    <p style="${S.p}"><strong>7.1.</strong> Tarafların kontrolü dışında gelişen, öngörülemeyen ve makul çabayla önlenemeyen; savaş, terör eylemleri, iç savaş, ayaklanma, doğal afetler (deprem, sel, yangın, fırtına vb.), yaygın salgın hastalıklar, genel grev, lokavt veya resmi makamların hizmetin ifasını imkansız kılan karar ve yasakları "Mücbir Sebep" olarak kabul edilir.</p>
    <p style="${S.p}"><strong>7.2.</strong> Mücbir sebepten etkilenen taraf, durumu derhal diğer tarafa yazılı olarak bildirmekle yükümlüdür. Mücbir sebep süresince, etkilenen tarafın sözleşmeden doğan yükümlülükleri askıya alınır. Taraflar bu gecikmeden dolayı birbirlerinden tazminat talep edemezler.</p>
    <p style="${S.p}"><strong>7.3.</strong> Mücbir sebepler haricinde; İŞVEREN'in "Yükümlülükler" bölümünde tanımlanan çalışma şartlarını (örn: hizmet verilecek alanların erişilebilir hale getirilmesi, güvenli çalışma ortamının sağlanması vb.) yerine getirmemesi nedeniyle hizmetin verilememesi veya eksik verilmesi durumunda:</p>
    <p style="${S.sub}"><strong>7.3.1.</strong> PestMENTOR'un hizmeti ifa yükümlülüğü ortadan kalkar.</p>
    <p style="${S.sub}"><strong>7.3.2.</strong> O periyoda ait hizmet tam olarak ifa edilmiş (yapılmış) sayılır ve hizmet bedelinin tamamı İŞVEREN'e fatura edilir. PestMENTOR, bu sebeple "haklı bir sebep ileri sürmemiş" olarak nitelendirilemez.</p>

    <h3 style="${S.h2}">8.&nbsp;&nbsp;&nbsp;&nbsp;MALİ YÜKÜMLÜLÜKLER</h3>
    <p style="${S.p}"><strong>8.1.</strong> İşbu sözleşmenin imzalanmasından kaynaklanan Damga Vergisi'nin tamamı PestMENTOR tarafından beyan edilip ödenecektir.</p>

    <h3 style="${S.h2}">9.&nbsp;&nbsp;&nbsp;&nbsp;MALİ HÜKÜMLER (FİYATLANDIRMA VE ÖDEME)</h3>
    <p style="${S.subTitle}"><strong>9.1. Hizmet Bedeli</strong></p>
    <p style="${S.p}">İşbu sözleşmenin 3. Bölümünde ("YAPILACAK İŞİN TANIMI VE HİZMET KAPSAMI") tanımlanan hizmetler için uygulanacak fiyatlandırma aşağıdaki gibidir.</p>

    <p style="${S.sub}"><strong>9.1.1. Periyodik (Plana Dahil) Hizmet Bedeli : <u>${formatTL(perVisitTotal)}.-TL+KDV/SEFER ( ${amountWords} + KDV/SEFER)</u></strong></p>
    <p style="${S.sub}"><strong>9.1.1.1.</strong> Hizmet Kalemi: 3. YAPILACAK İŞİN TANIMI MADDESİNE BAKINIZ.</p>
    <p style="${S.sub}"><strong>9.1.1.2.</strong> Kapsam: 3. YAPILACAK İŞİN TANIMI MADDESİNE BAKINIZ.</p>
    ${materialSection}

    <p style="${S.subTitle}"><strong>9.2. Faturalandırma ve Ödeme Koşulları</strong></p>
    <p style="${S.sub}"><strong>9.2.1.</strong> Periyodik hizmet bedeli (9.1.1), ilgili hizmet ayının ilk yirmi beş (25) iş günü içinde faturalandırılır. Talep bazlı hizmetler (9.1.2) ise, hizmetin verildiği ayın sonunda düzenlenecek periyodik faturaya eklenir.</p>
    <p style="${S.sub}"><strong>9.2.2.</strong> İŞVEREN, faturanın kendisine tebliğ edildiği tarihi (e-posta veya e-fatura yoluyla) takip eden otuz (30) gün içerisinde ödemeyi yapmakla yükümlüdür.</p>
    <p style="${S.sub}"><strong>9.2.3.</strong> BU MADDE BOŞ BIRAKILMIŞTIR.</p>
    <p style="${S.sub}"><strong>9.2.4.</strong> Tüm ödemeler, PestMENTOR (${companyName}) adına açılmış aşağıdaki banka hesaplarına EFT/Havale yoluyla yapılır.</p>

    <table style="width:100%; border-collapse:collapse; margin:8px 0;">
      <thead><tr>
        <th style="${S.th}">BANKA ADI</th>
        <th style="${S.th}">ŞUBE ADI</th>
        <th style="${S.th}">HESAP NO</th>
        <th style="${S.th}">IBAN</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${S.td}">GARANTİ BBVA</td>
          <td style="${S.td}">Gazcılar Şubesi</td>
          <td style="${S.td}">37- 6202789</td>
          <td style="${S.td}">TR660006200003700006202789</td>
        </tr>
      </tbody>
    </table>

    <div style="page-break-inside: avoid; break-inside: avoid;">
    <h3 style="${S.h2}">10.&nbsp;&nbsp;&nbsp;&nbsp;HÜKÜMLER VE TEBLİGAT</h3>
    <p style="${S.p}"><strong>10.1.</strong> İşbu sözleşme, 10 (ON) madde ve 5 (BEŞ) sayfadan ibaret olup, 2 (iki) nüsha olarak (Sözleşme İmza Tarihi) tarihinde imzalanmış ve bir nüshası İŞVEREN'e, bir nüshası PestMENTOR'a teslim edilmiştir.</p>
    <p style="${S.p}"><strong>10.2.</strong> Tarafların kanuni tebligat adresleri, sözleşmenin giriş bölümünde belirtilen adreslerdir.</p>
    <p style="${S.p}"><strong>10.3.</strong> Taraflar, adres değişikliklerini diğer tarafa yedi (7) gün içinde iadeli taahhütlü mektup, noter veya KEP (Kayıtlı Elektronik Posta) yoluyla bildirmekle yükümlüdür. Bu bildirimin yapılmaması halinde, sözleşmede belirtilen mevcut adreslere yapılan her türlü tebligat, yasal olarak geçerli bir tebligatın tüm hüküm ve sonuçlarını doğurur.</p>

    <table style="width:100%; margin-top:30px; border-collapse:collapse;">
      <tr>
        <td style="width:50%; text-align:center; vertical-align:top; padding:12px 15px; border:1px solid #333;">
          <strong style="font-size:10pt;">HİZMETİ VEREN (Hizmet Sağlayıcı)</strong><br/><br/>
          <span style="font-size:9pt;">PESTMENTOR<br/>(${companyName})</span>
          <div style="height:70px;"></div>
          <strong style="font-size:9pt;">İmza / Kaşe</strong>
        </td>
        <td style="width:50%; text-align:center; vertical-align:top; padding:12px 15px; border:1px solid #333;">
          <strong style="font-size:10pt;">HİZMETİ ALAN (İşveren / Müşteri)</strong><br/><br/>
          <span style="font-size:9pt;">${proposal.company_name.toUpperCase()}</span>
          <div style="height:70px;"></div>
          <strong style="font-size:9pt;">İmza / Kaşe</strong>
        </td>
      </tr>
    </table>
    </div>
  </div>

</div>`;
}
