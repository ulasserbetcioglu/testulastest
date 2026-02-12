import React, { useRef, useState } from 'react';
import { FileDown, Printer, Bug, Shield, CheckCircle2, XCircle, MapPin, Phone, Mail, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { IpmContract } from './IpmContractData';
import { PEST_CATEGORY_LABELS, PEST_SUBCATEGORIES, DEFAULT_CONTENT_SECTIONS, CONTENT_SECTION_LABELS } from './IpmContractData';

interface IpmContractPreviewProps {
  contract: IpmContract;
  companySettings?: {
    company_name: string;
    logo_url: string;
    stamp_url?: string;
    address: string;
    email: string;
    phone: string;
  } | null;
  compact?: boolean;
  branchName?: string;
  mainCustomerName?: string;
}

const IpmContractPreview: React.FC<IpmContractPreviewProps> = ({ contract, companySettings, compact, branchName, mainCustomerName }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const primaryColor = '#15803d';

  const startDateFormatted = contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: tr }) : '-';

  const replaceVars = (text: string) => {
    return text
      .replace(/\{customer_name\}/g, mainCustomerName || contract.customer_name)
      .replace(/\{customer_address\}/g, contract.customer_address)
      .replace(/\{customer_city\}/g, contract.customer_city)
      .replace(/\{contract_firm_name\}/g, contract.contract_firm_name)
      .replace(/\{responsible_person\}/g, contract.responsible_person || '(Belirtilmedi)')
      .replace(/\{routine_frequency\}/g, contract.routine_frequency)
      .replace(/\{start_date\}/g, startDateFormatted);
  };

  const getSection = (key: string) => {
    const sections = contract.content_sections || {};
    const raw = sections[key] ?? DEFAULT_CONTENT_SECTIONS[key] ?? '';
    return replaceVars(raw);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { generateIpmPdf } = await import('../../utils/ipmPdfGenerator');

      await generateIpmPdf({
        id: contract.id,
        customerName: contract.customer_name,
        branchName: branchName,
        mainCustomerName: mainCustomerName,
        customerAddress: contract.customer_address,
        customerCity: contract.customer_city,
        responsiblePerson: contract.responsible_person,
        contractFirmName: contract.contract_firm_name,
        contractFirmPhone: contract.contract_firm_phone,
        contractFirmEmail: contract.contract_firm_email,
        contractFirmContact: contract.contract_firm_contact,
        startDate: startDateFormatted,
        revisionDate: contract.revision_date ? format(new Date(contract.revision_date), 'dd.MM.yyyy') : null,
        revisionNumber: contract.revision_number,
        routineFrequency: contract.routine_frequency,
        targetPests: contract.target_pests || {},
        scopeAreas: contract.scope_areas || [],
        contentSections: contract.content_sections || {},
        customNotes: contract.custom_notes,
        companyLogo: companySettings?.logo_url,
        companyStamp: companySettings?.stamp_url
      });

    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const activePests = contract.target_pests || {};
  const scopeAreas = contract.scope_areas || [];

  const abbreviationLines = getSection('kisaltmalar').split('\n').filter(Boolean);
  const documentLines = getSection('ilgili_dokumanlar').split('\n').filter(Boolean);

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden">
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
          <Printer size={14} /> Yazdir
        </button>
        <button onClick={handleExportPdf} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-medium text-red-700 disabled:opacity-50">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          PDF Indir
        </button>
      </div>

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
              <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin size={10} /> {contract.customer_address}, {contract.customer_city}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1 mt-1"><User size={10} /> IPM Sorumlusu: <strong>{contract.responsible_person || '-'}</strong></p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Sozlesmeli Firma</p>
              <p className="font-bold text-sm text-gray-800">{contract.contract_firm_name}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={10} /> {contract.contract_firm_phone}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1"><Mail size={10} /> {contract.contract_firm_email}</p>
              {contract.contract_firm_contact && (
                <p className="text-xs text-gray-600 flex items-center gap-1"><User size={10} /> {contract.contract_firm_contact}</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>1 - AMAC</h2>
            <p className="text-[11px]">{getSection('amac')}</p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>2 - KISALTMALAR VE KAVRAMLAR</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <p><strong>ISLETME:</strong> {contract.customer_name}</p>
              <p><strong>SOZLESMELI FIRMA:</strong> {contract.contract_firm_name}</p>
              {abbreviationLines.map((line, i) => {
                const colonIdx = line.indexOf(':');
                if (colonIdx === -1) return <p key={i}>{line}</p>;
                return (
                  <p key={i}>
                    <strong>{line.substring(0, colonIdx).trim()}:</strong> {line.substring(colonIdx + 1).trim()}
                  </p>
                );
              })}
            </div>
            <p className="text-[10px] mt-2">
              <strong>SORUMLU:</strong> {contract.responsible_person || '(Belirtilmedi)'}
            </p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2 flex items-center gap-1" style={{ color: primaryColor }}>
              <Bug size={12} /> 3 - HEDEF ZARARLILAR
            </h2>
            <p className="text-[10px] text-gray-600 mb-3">{getSection('hedef_zararlilar_giris')}</p>

            {Object.entries(PEST_CATEGORY_LABELS).map(([key, label], idx) => {
              const isActive = activePests[key] === true;
              const subs = PEST_SUBCATEGORIES[key] || [];
              return (
                <div key={key} className={`mb-3 p-2 rounded-lg border ${isActive ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isActive ? <CheckCircle2 size={12} className="text-green-600" /> : <XCircle size={12} className="text-gray-400" />}
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

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2 flex items-center gap-1" style={{ color: '#2563eb' }}>
              <Shield size={12} /> UYGULAMA KAPSAMI
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {scopeAreas.map((area: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  <CheckCircle2 size={10} /> {area}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>4 - ILGILI DOKUMANLAR</h2>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {documentLines.map((doc, i) => (
                <p key={i} className="flex items-start gap-1"><span className="text-green-600 mt-0.5">&#8226;</span> {doc}</p>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>5 - IPM UYGULAMALARI</h2>
            <p className="text-[10px] mb-2">{getSection('ipm_uygulamalari_giris')}</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.1 - Gozlem Uygulamalari</h3>
            <p className="text-[10px]">{getSection('gozlem_uygulamalari')}</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.2 - Onleyici Uygulamalar</h3>
            <p className="text-[10px]">{getSection('onleyici_uygulamalar')}</p>

            <h3 className="text-[11px] font-bold text-gray-700 mt-3 mb-1">5.3 - Rutin Kontroller</h3>
            <p className="text-[10px]">{getSection('rutin_kontroller')}</p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>6 - IPM UYGULAMALARININ YURUTULMESI</h2>
            <div className="space-y-2 text-[10px]">
              <p><strong>6.1 - IPM:</strong> {getSection('ipm_yurutulme_1')}</p>
              <p><strong>6.2 - Zararli Takip Sistemi:</strong> {getSection('zararli_takip')}</p>
              <p><strong>6.3 - Ic Alan Aparatlari:</strong> {getSection('ic_alan_aparatlari')}</p>
              <p><strong>6.4 - Dis Alan Aparatlari:</strong> {getSection('dis_alan_aparatlari')}</p>
              <p><strong>6.10 - Rutin Periyotlar:</strong> {getSection('rutin_periyotlar')}</p>
              <p><strong>6.11 - Acil Cağrılar:</strong> {getSection('acil_carilar')}</p>
              <p><strong>6.13 - Egitim:</strong> {getSection('egitim')}</p>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>7 - KIMYASAL UYGULAMASI</h2>
            <p className="text-[10px]">{getSection('kimyasal')}</p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>8 - UYGULAMA PERSONELI</h2>
            <p className="text-[10px]">{getSection('personel')}</p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>9 - UYGULAMA ARAC GERECLERI, KIMYASALLAR</h2>
            <p className="text-[10px]">{getSection('arac_gerecler')}</p>
          </div>

          <div className="mb-4">
            <h2 className="text-xs font-bold border-b border-gray-200 pb-1 mb-2" style={{ color: primaryColor }}>10 - GECERLILIK</h2>
            <p className="text-[10px]">{getSection('gecerlilik')}</p>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[11px] font-bold text-green-800">{getSection('gecerlilik_detay')}</p>
            </div>
          </div>

          {contract.custom_notes && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[10px] font-bold text-amber-800 mb-1">Ek Notlar:</p>
              <p className="text-[10px] text-amber-700 whitespace-pre-wrap">{contract.custom_notes}</p>
            </div>
          )}

          {companySettings?.stamp_url && (
            <div className="mt-6 flex justify-end">
              <div className="text-center">
                <p className="text-[9px] text-gray-500 font-bold mb-1">SOZLESMELI FIRMA KASE / IMZA</p>
                <img src={companySettings.stamp_url} alt="Kase" className="h-24 object-contain" />
                <p className="text-[9px] text-gray-400 mt-1">{contract.contract_firm_name}</p>
              </div>
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
