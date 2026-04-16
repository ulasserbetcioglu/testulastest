// src/utils/branchAiReportGenerator.ts
// Generates a branded HTML report for Gemini AI Branch Analysis,
// matching the quality of contractGenerator.ts

export interface AiReportBranchInfo {
  sube_adi: string;
  sehir?: string;
  adres?: string;
  latitude?: number;
  longitude?: number;
}

export interface AiReportCustomerInfo {
  kisa_isim: string;
  cari_isim?: string;
  sehir?: string;
  telefon?: string;
  email?: string;
  sektorTahmini?: string;
}

export interface AiReportCompanySettings {
  company_name?: string;
  logo_url?: string;
  telefon?: string;
  email?: string;
  adres?: string;
  website?: string;
}

export interface AiReportParams {
  branch: AiReportBranchInfo;
  customer: AiReportCustomerInfo;
  settings: AiReportCompanySettings;
  analysisText: string;
  visitCount: number;
  topPests: string[];
  savedAt?: Date;
  generatedAt?: Date;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAnalysisText(raw: string): string {
  const lines = raw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br/>';
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 style="font-size:11pt; font-weight:700; color:#1e3a5f; margin:16px 0 5px 0; border-bottom:2px solid #dbeafe; padding-bottom:4px;">${trimmed.slice(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h3>`;
    } else if (trimmed.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 style="font-size:13pt; font-weight:800; color:#1e293b; margin:18px 0 6px 0;">${trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h2>`;
    } else if (trimmed.match(/^\d+\.\s/) || trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      if (!inList) { html += '<ul style="margin:5px 0 5px 18px; padding:0;">'; inList = true; }
      const content = trimmed.replace(/^(\d+\.|[-•*])\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<li style="margin:4px 0; font-size:10pt; color:#334155; line-height:1.6;">${content}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      const htmlContent = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p style="font-size:10pt; color:#374151; line-height:1.7; margin:5px 0; text-align:justify;">${htmlContent}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

export function generateBranchAiReportHtml(params: AiReportParams): string {
  const { branch, customer, settings, analysisText, visitCount, topPests, generatedAt = new Date(), savedAt } = params;

  const companyName = settings.company_name || 'İlaçlamatik';
  const dateStr = generatedAt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const koordinat = branch.latitude ? `${branch.latitude.toFixed(5)}, ${branch.longitude?.toFixed(5)}` : 'Kayıtsız';
  const analysisHtml = formatAnalysisText(analysisText);
  const riskLevel = visitCount > 15 ? 'Yüksek' : visitCount > 6 ? 'Orta' : 'Düşük';
  const riskColor = riskLevel === 'Yüksek' ? '#dc2626' : riskLevel === 'Orta' ? '#d97706' : '#16a34a';
  const riskBg = riskLevel === 'Yüksek' ? '#fef2f2' : riskLevel === 'Orta' ? '#fffbeb' : '#f0fdf4';

  const pestBadges = topPests.length > 0
    ? topPests.map(p => `<span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:8.5pt;padding:3px 10px;border-radius:20px;margin:3px 2px;">${escapeHtml(p)}</span>`).join(' ')
    : '<em style="color:#94a3b8">Kayıtlı zararlı tespit edilmedi</em>';

  // Logo block - LEFT side of header
  const logoBlock = settings.logo_url
    ? `<img src="${settings.logo_url}" style="height:60px;max-width:200px;object-fit:contain;" crossorigin="anonymous" alt="${escapeHtml(companyName)}" />`
    : `<span style="font-size:20px;font-weight:800;color:white;">${escapeHtml(companyName)}</span>`;

  // Company address / contact lines for header right
  const companyInfoLines = [
    `<strong style="font-size:13pt;font-weight:800;">${escapeHtml(companyName)}</strong>`,
    settings.adres ? `<span style="font-size:8pt;opacity:0.9;">${escapeHtml(settings.adres)}</span>` : '',
    [settings.telefon ? `Tel: ${escapeHtml(settings.telefon)}` : '', settings.email ? escapeHtml(settings.email) : ''].filter(Boolean).join(' &nbsp;|&nbsp; '),
    settings.website ? `<span style="font-size:8pt;opacity:0.75;">${escapeHtml(settings.website)}</span>` : '',
  ].filter(Boolean).map(l => `<div style="margin:1px 0;">${l}</div>`).join('');

  // Footer - full company block left, report info right
  const footerLeft = [
    `<strong>${escapeHtml(companyName)}</strong>`,
    settings.telefon ? `Tel: ${escapeHtml(settings.telefon)}` : '',
    settings.email ? escapeHtml(settings.email) : '',
    settings.adres ? escapeHtml(settings.adres) : '',
  ].filter(Boolean).join(' · ');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>AI Şube Risk Raporu — ${escapeHtml(branch.sube_adi)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', Helvetica, sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #fff; font-size: 10pt; line-height: 1.5; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); color: white; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; gap: 24px; }
    .header-logo { flex-shrink: 0; background: rgba(255,255,255,0.12); border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; }
    .header-company { color: white; text-align: right; line-height: 1.5; }
    .header-badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 4px 12px; font-size: 8pt; display: inline-block; margin-top: 6px; }
    .cover { padding: 20px 40px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    .cover-title { font-size: 15pt; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; }
    .cover-sub { font-size: 9.5pt; color: #64748b; margin: 0 0 18px 0; }
    .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-block { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }
    .info-block-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin: 0 0 10px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 9.5pt; margin: 4px 0; }
    .info-label { color: #64748b; font-weight: 600; min-width: 90px; }
    .info-value { color: #1e293b; text-align: right; max-width: 200px; }
    .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 0 0; }
    .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; text-align: center; }
    .stat-card .num { font-size: 24pt; font-weight: 800; line-height: 1; }
    .stat-card .lbl { font-size: 8pt; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 24px 40px 32px; }
    .section-title { font-size: 12pt; font-weight: 800; color: #1e3a8a; border-bottom: 2px solid #dbeafe; padding-bottom: 7px; margin: 20px 0 12px 0; }
    .pest-row { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 18px; margin-bottom: 18px; }
    .pest-row-title { font-size: 9pt; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; }
    .analysis-box { background: #fafbff; border: 1px solid #dbeafe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 20px 24px; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; color: #cbd5e1; padding: 10px 40px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; }
    .footer strong { color: white; }
    @page { margin: 0 0 50px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .footer { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>

<!-- ===== HEADER: LOGO LEFT + COMPANY RIGHT ===== -->
<div class="header">
  <div class="header-logo">
    ${logoBlock}
  </div>
  <div class="header-company">
    ${companyInfoLines}
    <div class="header-badge">🤖 AI Şube Risk Analiz Raporu · ${dateStr}</div>
  </div>
</div>

<!-- ===== COVER ===== -->
<div class="cover">
  <p class="cover-title">AI Şube Risk Analizi</p>
  <p class="cover-sub">
    ${escapeHtml(branch.sube_adi)}${branch.sehir ? ` &mdash; ${escapeHtml(branch.sehir)}` : ''}
    &nbsp;&bull;&nbsp; İLAÇLAMATİK AI tarafından üretilmiştir &nbsp;&bull;&nbsp; ${dateStr}
    ${savedAt ? `&nbsp;&bull;&nbsp; <em>Kaydedildi: ${savedAt.toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' })}</em>` : ''}
  </p>

  <div class="cover-grid">
    <!-- Şube Bilgileri -->
    <div class="info-block">
      <p class="info-block-title">📍 Şube Bilgileri</p>
      <div class="info-row"><span class="info-label">Şube Adı</span><span class="info-value" style="font-weight:700;">${escapeHtml(branch.sube_adi)}</span></div>
      <div class="info-row"><span class="info-label">Şehir</span><span class="info-value">${escapeHtml(branch.sehir || '-')}</span></div>
      <div class="info-row"><span class="info-label">Adres</span><span class="info-value">${escapeHtml(branch.adres || '-')}</span></div>
      <div class="info-row"><span class="info-label">Koordinat</span><span class="info-value" style="font-family:monospace;font-size:7.5pt;">${escapeHtml(koordinat)}</span></div>
    </div>

    <!-- Müşteri + Hizmet Veren -->
    <div class="info-block">
      <p class="info-block-title">🏢 Müşteri Bilgileri</p>
      <div class="info-row"><span class="info-label">Kısa İsim</span><span class="info-value" style="font-weight:700;">${escapeHtml(customer.kisa_isim)}</span></div>
      <div class="info-row"><span class="info-label">Cari İsim</span><span class="info-value">${escapeHtml(customer.cari_isim || customer.kisa_isim)}</span></div>
      ${customer.sehir ? `<div class="info-row"><span class="info-label">Şehir</span><span class="info-value">${escapeHtml(customer.sehir)}</span></div>` : ''}
      ${customer.telefon ? `<div class="info-row"><span class="info-label">Telefon</span><span class="info-value">${escapeHtml(customer.telefon)}</span></div>` : ''}
      <div class="info-row">
        <span class="info-label">Hizmet Veren</span>
        <span class="info-value" style="font-weight:600;color:#1d4ed8;">${escapeHtml(companyName)}</span>
      </div>
    </div>
  </div>

  <!-- İstatistikler -->
  <div class="stat-row">
    <div class="stat-card">
      <div class="num" style="color:#2563eb;">${visitCount}</div>
      <div class="lbl">Son 12 Ay Ziyaret</div>
    </div>
    <div class="stat-card">
      <div class="num" style="color:#7c3aed;">${topPests.length}</div>
      <div class="lbl">Tespit Edilen Zararlı Türü</div>
    </div>
    <div class="stat-card" style="background:${riskBg};border-color:${riskColor}30;">
      <div class="num" style="color:${riskColor};">${riskLevel}</div>
      <div class="lbl">Aktivite Düzeyi</div>
    </div>
  </div>
</div>

<!-- ===== CONTENT ===== -->
<div class="content">

  ${topPests.length > 0 ? `
  <div class="pest-row">
    <p class="pest-row-title">⚠ Tespit Edilen Başlıca Zararlılar</p>
    <div>${pestBadges}</div>
  </div>` : ''}

  <div class="section-title"> İLAÇLAMATİK AI Analiz Sonuçları</div>
  <div class="analysis-box">
    ${analysisHtml}
  </div>

  <p style="font-size:7.5pt;color:#94a3b8;margin-top:24px;text-align:right;font-style:italic;">
    Bu rapor; şube koordinatları, müşteri sektörü ve son 12 ay zararlı aktivite verileri kullanılarak İLAÇLAMATİK AI tarafından otomatik üretilmiştir.
    Rapor Tarihi: ${dateStr} &nbsp;|&nbsp; Düzenlendi: <strong style="color:#374151;">${escapeHtml(companyName)}</strong>
  </p>
</div>

<!-- ===== FOOTER: DARK BAR, FULL COMPANY INFO ===== -->
<div class="footer">
  <span>${footerLeft}</span>
  <span>Şube: <strong>${escapeHtml(branch.sube_adi)}</strong> &nbsp;|&nbsp; ${dateStr}</span>
</div>

</body>
</html>`;
}

/**
 * Opens a print window with the report HTML for browser-based printing to PDF.
 * Logo images are loaded before print dialog opens.
 */
export function printBranchAiReport(params: AiReportParams): void {
  const html = generateBranchAiReportHtml(params);
  const win = window.open('', '_blank', 'width=960,height=1200');
  if (!win) {
    alert('Popup engelleyici aktif. PDF için lütfen tarayıcı ayarlarından popup\'a izin verin.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Give images time to load before triggering print
  const tryPrint = () => {
    const imgs = win.document.images;
    const allLoaded = Array.from(imgs).every(img => img.complete);
    if (allLoaded) {
      win.print();
    } else {
      setTimeout(tryPrint, 300);
    }
  };
  win.onload = () => setTimeout(tryPrint, 400);
}
