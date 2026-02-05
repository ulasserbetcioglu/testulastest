import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound, Printer, Shield, Info, Bug, Calendar, Package, FileSignature, FileText } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProposalItem {
    service_name: string;
    service_description: string;
    image_url: string;
    visit_count: number;
    unit_price: number;
    explanation: string;
    unit_type: string;
    item_type?: 'service' | 'product';
}

interface Proposal {
    id: string;
    created_at: string;
    proposal_number: string;
    company_name: string;
    contact_person: string;
    recipient_email: string;
    total_amount: number;
    discount_amount: number;
    application_area: string;
    proposal_items: ProposalItem[];
    status: 'pending' | 'approved' | 'rejected';
    customer_notes: string | null;
    included_pests: string[] | string | null;
    contract_available: boolean;
    revision_number: number;
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
    footer_text: string;
    about_text?: string;
    website?: string;
}

const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep'
];

const TeklifGoruntule: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const proposalRef = useRef<HTMLDivElement>(null);
    const contractRef = useRef<HTMLDivElement>(null); 
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sözleşme State'leri
    const [showContractModal, setShowContractModal] = useState(false);
    const [contractHtml, setContractHtml] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
             try {
                 const { data: settingsData } = await supabase.from('company_settings').select('*').single();
                 setCompanySettings(settingsData);
             } catch (err) {
                 console.warn("Şirket ayarları yüklenemedi.");
             } finally {
                 setLoading(false);
             }
        };

        const pdfScript = document.createElement('script');
        pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        pdfScript.async = true;
        document.body.appendChild(pdfScript);

        fetchInitialData();
        
        return () => {
            if (document.body.contains(pdfScript)) {
                document.body.removeChild(pdfScript);
            }
        }
    }, []);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            toast.error("Lütfen şifreyi girin.");
            return;
        }
        setIsVerifying(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*, proposal_items(*)')
                .eq('id', id)
                .eq('access_password', password)
                .single();

            if (error) throw error;
            
            setProposal(data as Proposal);
            setNotes(data.customer_notes || '');
            setIsAuthenticated(true);
        } catch (err: any) {
            toast.error("Geçersiz şifre veya teklif bulunamadı.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDownloadPdf = (elementRef: React.RefObject<HTMLDivElement>, fileName: string) => {
        if (!elementRef.current || !(window as any).html2pdf) {
            toast.error("PDF oluşturucu hazır değil.");
            return;
        }
        
        const element = elementRef.current;
        const options = {
            margin:       10, 
            filename:     `${fileName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        (window as any).html2pdf().set(options).from(element).save();
    };

    // --- YARDIMCI FONKSİYON ---
    const getPestsString = (pests: string[] | string | null): string => {
        if (Array.isArray(pests)) {
            return pests.join(', ');
        }
        if (typeof pests === 'string') {
            return pests;
        }
        return 'Genel Haşere ve Kemirgen';
    };

    // --- SÖZLEŞME OLUŞTURMA FONKSİYONU (TAM METİN) ---
    const generateContractContent = (prop: Proposal, settings: CompanySettings | null, contractNo: string) => {
        const startDate = format(new Date(), 'dd.MM.yyyy');
        // Bitiş tarihi genelde yıl sonu veya 1 yıl sonra olur. Burada yıl sonunu baz alıyoruz:
        const currentYear = new Date().getFullYear();
        const endDate = `31/12/${currentYear}`; 
        
        const pestsString = getPestsString(prop.included_pests);
        const appArea = prop.application_area || 'İŞLETME GENELİ';

        // 1. HİZMETLER TABLOSU
        const serviceItems = prop.proposal_items.filter(i => i.item_type !== 'product');
        const serviceRows = serviceItems.map(item => {
             let visitFreq = '';
             if(item.unit_type === 'aylik') visitFreq = `AYDA ${item.visit_count} ZİYARET`;
             else if(item.unit_type === 'seferlik') visitFreq = 'TEK SEFERLİK';
             else visitFreq = `${item.visit_count} ADET`;

             let category = item.service_name.toUpperCase();
             let pestType = pestsString; 

             if(item.service_name.toLowerCase().includes('kemirgen')) pestType = 'Fare ve Sıçanlar';
             else if (item.service_name.toLowerCase().includes('yürüyen')) pestType = 'Hamam böceği ve Karınca';

             return `
            <tr>
                <td style="border: 1px solid #000; padding: 6px;">${category}</td>
                <td style="border: 1px solid #000; padding: 6px;">${pestType}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${visitFreq}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${appArea}</td>
            </tr>
        `}).join('');

        // 2. EKİPMAN TABLOSU
        const productItems = prop.proposal_items.filter(i => i.item_type === 'product');
        let productSection = '';
        if (productItems.length > 0) {
            const productRows = productItems.map(item => `
                <tr>
                    <td style="border: 1px solid #000; padding: 6px;">${item.service_name}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">-</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.visit_count} ${item.unit_type}</td>
                    <td style="border: 1px solid #000; padding: 6px; text-align: center;">${appArea}</td>
                </tr>
            `).join('');

            productSection = `
                ${productRows}
            `;
        }
        
        // Fiyat
        const totalAmount = prop.total_amount || 0;

        // --- TAM METİN HTML ---
        return `
            <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.3; color: #000; padding: 30px; position: relative;">
                
                <table style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px;">
                    <tr>
                        <td style="vertical-align: bottom;">
                             ${settings?.logo_url ? `<img src="${settings.logo_url}" style="height: 50px;" alt="Logo" />` : `<h2>${settings?.company_name}</h2>`}
                        </td>
                        <td style="text-align: right; vertical-align: bottom;">
                            <div style="font-weight: bold; font-size: 12pt;">HİZMET SÖZLEŞMESİ</div>
                            <div style="font-size: 10pt;">SÖZLEŞME NUMARASI : <strong>${contractNo}</strong></div>
                        </td>
                    </tr>
                </table>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">1. SÖZLEŞMENİN KONUSU</div>
                    <p style="margin: 3px 0; text-align: justify;">İşbu sözleşme, bir tarafta <strong>${prop.company_name.toUpperCase()}</strong> (Sözleşmede "İŞVEREN" olarak anılacaktır) ile diğer tarafta <strong>${settings?.company_name?.toUpperCase() || 'SİSTEM İLAÇLAMA SAN. VE TİC. LTD. ŞTİ.'}</strong> (Sözleşmede "PestMENTOR" olarak anılacaktır) arasında akdedilmiştir.</p>
                    <p style="margin: 3px 0;">Sözleşmenin konusu; İŞVEREN'e ait tesislerde, 1.1. İnsan sağlığını, 1.2. Hammadde güvenliğini, 1.3. Ürün kalitesini olumsuz yönde etkileyebilecek zararlı popülasyonunun kontrol altına alınması amacıyla, PestMENTOR tarafından "Onaylanmış Alanlarda" sunulacak Entegre Zararlı Mücadelesi (IPM) hizmetlerinin; teknik, idari, mali ve hukuki şartlarını ve tarafların karşılıklı yükümlülüklerini tanımlar.</p>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">2. TARAFLAR</div>
                    <table style="width: 100%; border: none; margin-bottom: 5px; font-size: 9pt;">
                        <tr><td style="width: 150px; font-weight: bold;">HİZMET ALAN FİRMA</td><td>: ${prop.company_name.toUpperCase()}</td></tr>
                        <tr><td style="font-weight: bold;">ADRES</td><td>: ${prop.customer_notes || 'Adres belirtilmedi'}</td></tr>
                        <tr><td style="font-weight: bold;">TELEFON</td><td>: ${prop.contact_person}</td></tr>
                        <tr><td colspan="2" style="font-style: italic;">SÖZLEŞME METNİNDE BUNDAN SONRA SADECE ‘’ İŞVEREN ‘’ OLARAK ANILACAKTIR.</td></tr>
                    </table>
                    <br/>
                    <table style="width: 100%; border: none; font-size: 9pt;">
                        <tr><td style="width: 150px; font-weight: bold;">HİZMET VEREN FİRMA</td><td>: SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ – PestMentor</td></tr>
                        <tr><td style="font-weight: bold;">ADRES</td><td>: ${settings?.address}</td></tr>
                        <tr><td style="font-weight: bold;">TELEFON</td><td>: ${settings?.phone}</td></tr>
                        <tr><td style="font-weight: bold;">E-POSTA</td><td>: ${settings?.email}</td></tr>
                        <tr><td style="font-weight: bold;">VERGİ NO / DAİRE</td><td>: 771 003 5611 / SETBAŞI</td></tr>
                        <tr><td colspan="2" style="font-style: italic;">SÖZLEŞME METNİNDE BUNDAN SONRA SADECE ‘’ PestMENTOR ‘’ OLARAK ANILACAKTIR.</td></tr>
                    </table>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">3. YAPILACAK İŞİN TANIMI</div>
                    <p style="margin: 3px 0;">Yukarıda adresi belirtilen İŞVEREN işletmesinde aşağıda belirtilen zararlılara karşı yapılacak mücadelenin denetimi, engellenmesi ve yok edilmesi hizmetleridir.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9pt;">
                        <thead>
                            <tr style="background-color: #f0f0f0;">
                                <th style="border: 1px solid #000; padding: 5px;">HİZMET KATEGORİSİ</th>
                                <th style="border: 1px solid #000; padding: 5px;">ZARARLI TÜRÜ</th>
                                <th style="border: 1px solid #000; padding: 5px;">PERİYODİK ZİYARET SIKLIĞI</th>
                                <th style="border: 1px solid #000; padding: 5px;">UYGULAMA ALAN(LAR)I</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${serviceRows}
                            ${productSection}
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">4. YETKİ VE SORUMLULUKLAR</div>
                    <p>PestMENTOR (Hizmet Sağlayıcı) ve İŞVEREN (Müşteri) taraflarının, sözleşme kapsamındaki entegre zararlı mücadelesi (IPM) hizmetlerine ilişkin yetki ve sorumluluklarını tanımlar.</p>
                    
                    <div style="margin-left: 10px;">
                        <p style="margin-top: 5px;"><strong>4.1. PestMENTOR'un Yetki ve Sorumlulukları</strong></p>
                        <p><strong>4.1.1. Hizmetin İcrası ve Gizlilik:</strong> PestMENTOR, IPM hizmetlerini İŞVEREN yetkilisinin gözetiminde icra edecektir. Hizmet süresince elde edilen tüm ticari bilgilere yönelik gizlilik kurallarına, özel mülkün korunmasına ve mahremiyet ilkelerine ilişkin yasal mevzuata tam olarak riayet edecektir.</p>
                        <p><strong>4.1.2. Profesyonel Yetkinlik ve Malzeme Kullanımı:</strong> PestMENTOR, T.C. Tarım ve Orman Bakanlığı ile Sağlık Bakanlığı tarafından onaylanmış ve ruhsatlandırılmış biyosidal ürünleri, cinsel çekici hormonları (feromon), monitörleri ve ilgili tüm ekipmanları kullanmaya yetkilidir.</p>
                        <p><strong>4.1.3. Operasyonel Karar Yetkisi:</strong> Hizmetin etkinliğini sağlamak amacıyla; kullanılacak ürünlerin türünü, dozajını, uygulama yöntemini (ULV, jel, spreyleme vb.) ve zamanlamasını belirleme yetkisi PestMENTOR'a aittir.</p>
                        <p><strong>4.1.4. Alan Güvenliği:</strong> PestMENTOR, uygulama sırasında yetkisiz kişilerin alandan uzak tutulmasını sağlama ve bu konuda talimat verme yetkisine sahiptir.</p>
                        <p><strong>4.1.5. Raporlama ve Takip:</strong> Hizmet sonrası gözlem, takip ve periyodik kontrollerin yapılması, bulguların ve uygunsuzlukların İŞVEREN'e raporlanması PestMENTOR'un sorumluluğundadır.</p>
                        <p><strong>4.1.6. Tedarikçi Denetimi:</strong> Gerekli görüldüğü takdirde İŞVEREN'in onayı ile tedarikçi firmaların denetlenmesi yapılabilir.</p>

                        <p style="margin-top: 5px;"><strong>4.2. İŞVEREN'in Yükümlülükleri</strong></p>
                        <p><strong>4.2.1. Alan Hazırlığı:</strong> İŞVEREN, her periyodik hizmet öncesinde, çalışma yapılacak alanları (dolap içleri, makine çevreleri vb.) erişilebilir hale getirmekle yükümlüdür.</p>
                        <p><strong>4.2.2. Aktivite Bildirimi:</strong> Hizmet sonrası görülebilecek yeni zararlı aktivitesinin derhal PestMENTOR'a bildirilmesi İŞVEREN'in sorumluluğundadır.</p>
                        <p><strong>4.2.3. Hizmet Münhasırlığı (Tek Yetkililik):</strong> İŞVEREN, sözleşme süresince PestMENTOR'un bilgisi dışında üçüncü taraflardan hizmet alamaz ve kendi bünyesinde kimyasal uygulama yapamaz.</p>
                        <p><strong>4.2.4. Ekipman Sorumluluğu:</strong> İŞVEREN tesisine kurulan monitörlerin ve ekipmanların kırılması veya kaybolması durumunda, bedeli İŞVEREN'e fatura edilir.</p>
                        <p><strong>4.2.5. Düzeltici Faaliyetlerin Uygulanması:</strong> İŞVEREN, raporlarda belirtilen yapısal (yalıtım eksiklikleri vb.) ve hijyenik iyileştirmeleri karşılamakla yükümlüdür.</p>
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">5. SÖZLEŞME SÜRESİ, YENİLENME VE FESİH ŞARTLARI</div>
                    <p>İşbu sözleşme, <strong>${startDate}</strong> tarihinde yürürlüğe girer ve <strong>${endDate}</strong> tarihine kadar geçerlidir.</p>
                    <p><strong>5.1. Otomatik Yenileme:</strong> Sözleşme bitiş tarihinden en az otuz (30) gün önce yazılı fesih ihbarında bulunulmaması halinde, sözleşme sona erer. Karşılıklı anlaşılması durumunda hizmet devam eder.</p>
                    <p><strong>5.2. Fesih Koşulları:</strong> Sözleşme ancak tarafların yetkili imzacıları tarafından usulüne uygun olarak feshedilebilir. Taraflar haklarını devredemez.</p>
                    <p><strong>5.3. Hizmetin Devamlılığı:</strong> Sözleşme sona erse bile, İŞVEREN'in talebi üzerine geçiş sürecinde (en fazla 1 ay) hizmet verilmeye devam edilebilir.</p>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">6. UYUŞMAZLIKLARIN ÇÖZÜMÜ</div>
                    <p>6.1. Uyuşmazlıkların çözümünde Bursa Mahkemeleri ve İcra Daireleri münhasıran yetkilidir.</p>
                    
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px; margin-top: 5px;">7. MÜCBİR SEBEPLER</div>
                    <p>7.1. Doğal afetler, salgın hastalıklar, savaş vb. durumlar "Mücbir Sebep" kabul edilir.</p>
                    <p>7.3. İŞVEREN yükümlülüklerini yerine getirmezse (örn: alanın hazırlanmaması), o periyoda ait hizmet yapılmış sayılır ve fatura edilir.</p>

                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px; margin-top: 5px;">8. MALİ YÜKÜMLÜLÜKLER</div>
                    <p>8.1. Damga Vergisi PestMENTOR tarafından ödenecektir.</p>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">9. MALİ HÜKÜMLER (FİYATLANDIRMA VE ÖDEME)</div>
                    <p><strong>9.1. Hizmet Bedeli</strong></p>
                    <div style="border: 2px solid #000; padding: 10px; margin: 5px 0; text-align: center; font-weight: bold; font-size: 11pt;">
                        9.1.1. Periyodik Hizmet Bedeli: ${totalAmount.toLocaleString('tr-TR')} TL + KDV / AY
                    </div>
                    
                    <p><strong>9.2. Faturalandırma ve Ödeme Koşulları</strong></p>
                    <p>9.2.1. Periyodik hizmet bedeli, ilgili hizmet ayının ilk beş (5) iş günü içinde faturalandırılır.</p>
                    <p>9.2.2. İŞVEREN, faturayı takip eden 30 gün içerisinde ödemeyi yapmakla yükümlüdür.</p>
                    <p>9.2.4. Tüm ödemeler aşağıdaki banka hesabına yapılacaktır:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9pt;">
                        <thead>
                            <tr style="background-color: #f0f0f0;">
                                <th style="border: 1px solid #000; padding: 5px;">BANKA ADI</th>
                                <th style="border: 1px solid #000; padding: 5px;">ŞUBE ADI</th>
                                <th style="border: 1px solid #000; padding: 5px;">HESAP NO</th>
                                <th style="border: 1px solid #000; padding: 5px;">IBAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000; padding: 5px;">GARANTİ BBVA</td>
                                <td style="border: 1px solid #000; padding: 5px;">Gazcılar Şubesi</td>
                                <td style="border: 1px solid #000; padding: 5px;">37-6202789</td>
                                <td style="border: 1px solid #000; padding: 5px;">TR66 0006 2000 0037 0000 6202 789</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">10. HÜKÜMLER VE TEBLİGAT</div>
                    <p>10.1. İşbu sözleşme, 10 madde ve 2 nüsha olarak ${startDate} tarihinde imzalanmıştır.</p>
                    <p>10.2. Tarafların tebligat adresleri giriş bölümünde belirtilen adreslerdir.</p>
                    <p>10.3. Adres değişiklikleri 7 gün içinde bildirilmelidir.</p>
                </div>

                <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                            <strong>HİZMETİ VEREN (Hizmet Sağlayıcı)</strong><br/>
                            <span style="font-size: 9pt;">PESTMENTOR (Sistem İlaçlama San. ve Tic. Ltd. Şti.)</span><br/><br/>
                            <div style="height: 60px;"></div>
                            <strong>İmza / Kaşe</strong>
                        </td>
                        <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                            <strong>HİZMETİ ALAN (İşveren / Müşteri)</strong><br/>
                            <span style="font-size: 9pt;">${prop.company_name.toUpperCase()}</span><br/><br/>
                            <div style="height: 60px;"></div>
                            <strong>İmza / Kaşe</strong>
                        </td>
                    </tr>
                </table>

                <div style="margin-top: 30px; text-align: center; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 5px;">
                    <strong>${settings?.company_name}</strong> | ${settings?.address}<br/>
                    Tel: ${settings?.phone} | Web: ${settings?.website || ''} | E-posta: ${settings?.email}
                </div>

            </div>
        `;
    };

    const handleApproveOnly = async () => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('proposals')
                .update({ status: 'approved', customer_notes: notes })
                .eq('id', proposal.id);
            if (error) throw error;
            setProposal(prev => prev ? { ...prev, status: 'approved', customer_notes: notes } : null);
            toast.success("Teklif başarıyla onaylandı.");
        } catch (err) {
            toast.error("İşlem başarısız.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveAndCreateContract = async () => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const currentYear = new Date().getFullYear();
            const { count } = await supabase
                .from('service_contracts')
                .select('*', { count: 'exact', head: true });
            
            const nextSequence = 100 + (count || 0) + 1;
            const contractNumber = `${currentYear}-${nextSequence}`;

            const { error: updateError } = await supabase
                .from('proposals')
                .update({ status: 'approved', customer_notes: notes })
                .eq('id', proposal.id);
            
            if (updateError) throw updateError;

            // HATA DÜZELTME: Güvenli string alma
            const pestsString = getPestsString(proposal.included_pests);

            const content = generateContractContent(proposal, companySettings, contractNumber);

            const { error: contractError } = await supabase
                .from('service_contracts')
                .insert({
                    proposal_id: proposal.id,
                    contract_number: contractNumber,
                    company_name: proposal.company_name,
                    contact_person: proposal.contact_person,
                    start_date: new Date(),
                    end_date: addYears(new Date(), 1),
                    contract_amount: proposal.total_amount,
                    content: content,
                    status: 'active',
                    pest_types: pestsString, 
                    application_area: proposal.application_area || ''
                });

            if (contractError) throw contractError;

            setProposal(prev => prev ? { ...prev, status: 'approved', customer_notes: notes } : null);
            setContractHtml(content);
            setShowContractModal(true); 
            toast.success(`Hizmet Sözleşmesi (${contractNumber}) oluşturuldu.`);

        } catch (err: any) {
            toast.error("Hata: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'rejected') => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('proposals').update({ status: newStatus, customer_notes: notes }).eq('id', proposal.id);
            if (error) throw error;
            setProposal(prev => prev ? { ...prev, status: newStatus, customer_notes: notes } : null);
            toast.success("Teklif reddedildi.");
        } catch (err) {
            toast.error("İşlem başarısız.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <KeyRound className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Teklif Erişimi</h2>
                    <p className="mt-2 text-sm text-gray-500">Lütfen size iletilen 6 haneli erişim kodunu giriniz.</p>
                    <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={6} className="w-full p-4 border border-gray-300 rounded-xl text-center text-3xl tracking-[12px] font-mono focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none" placeholder="••••••" />
                        <button type="submit" disabled={isVerifying} className="w-full flex items-center justify-center gap-2 p-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-70 shadow-lg shadow-blue-200">
                            {isVerifying ? <Loader className="animate-spin" /> : 'Görüntüle'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (!proposal) return null;

    const primaryColor = '#15803d'; 
    const lightBorder = '#e5e7eb';
    
    const totalAmount = proposal.total_amount || 0;
    const discountAmount = proposal.discount_amount || 0;
    const grandTotal = totalAmount + (totalAmount * 0.20); 

    return (
        <div className="bg-gray-100 min-h-screen font-sans pb-10">
            {/* ÜST BAR (Aynı) */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden shadow-sm">
                <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-700 font-bold">T</div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Teklif Detayı</h2>
                            <p className="text-[10px] text-gray-500">#{proposal.proposal_number}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                            <Printer size={16} /> Yazdır
                        </button>
                        <button onClick={() => handleDownloadPdf(proposalRef, `Teklif_${proposal.proposal_number}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                            <FileDown size={16} /> İndir
                        </button>
                    </div>
                </div>
            </div>
            
            {/* KAĞIT (TEKLİF) (Aynı) */}
            <div className="py-8 px-4 print:p-0 flex justify-center">
                <div ref={proposalRef} className="bg-white shadow-xl print:shadow-none relative flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
                    
                    {/* HEADER */}
                    <div style={{ height: '8px', width: '100%', backgroundColor: primaryColor }}></div>
                    <div style={{ padding: '40px 50px', flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            <div>
                                <img src={companySettings?.logo_url || "https://i.imgur.com/PajSpus.png"} alt="Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '10px' }} />
                                <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.4' }}>
                                    <strong>{companySettings?.company_name}</strong><br/>
                                    {companySettings?.address}<br/>
                                    {companySettings?.email} | {companySettings?.phone}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: '800', color: primaryColor, margin: 0 }}>FİYAT TEKLİFİ SUNULUR</h1>
                                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', letterSpacing: '1px' }}>HİZMET & ÜRÜN DETAYLARI</p>
                                <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 12px', borderRadius: '12px', backgroundColor: proposal.status === 'approved' ? '#dcfce7' : proposal.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: proposal.status === 'approved' ? '#166534' : proposal.status === 'rejected' ? '#991b1b' : '#854d0e', fontSize: '11px', fontWeight: 'bold' }}>
                                    {proposal.status === 'approved' ? 'ONAYLANDI' : proposal.status === 'rejected' ? 'REDDEDİLDİ' : 'BEKLEMEDE'}
                                </div>
                            </div>
                        </div>

                        {/* ALICI BİLGİLERİ */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                            <div style={{ width: '60%' }}>
                                <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>SAYIN / FİRMA</p>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 2px 0' }}>{proposal.company_name}</h3>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>{proposal.contact_person}</p>
                            </div>
                            <div style={{ width: '35%', textAlign: 'right' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>TARİH</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>TEKLİF NO</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>#{proposal.proposal_number}</p>
                                </div>
                            </div>
                        </div>

                        {/* HEDEF ZARARLILAR */}
                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '5px' }}>
                                <Bug size={12} /> HEDEF ZARARLILAR KAPSAMI ({proposal.application_area})
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {PEST_TYPES.map((pest, i) => {
                                    const isActive = Array.isArray(proposal.included_pests) && proposal.included_pests.includes(pest);
                                    return (
                                        <div key={i} style={{ 
                                            fontSize: '10px', padding: '4px 10px', borderRadius: '4px', 
                                            backgroundColor: isActive ? '#f0fdf4' : '#f9fafb', 
                                            color: isActive ? '#15803d' : '#9ca3af', 
                                            border: `1px solid ${isActive ? '#bbf7d0' : '#e5e7eb'}`,
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            textDecoration: isActive ? 'none' : 'line-through',
                                            opacity: isActive ? 1 : 0.6,
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {isActive ? <Check size={10}/> : <X size={10}/>} {pest}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* TABLO */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase' }}>AÇIKLAMA</th>
                                    <th style={{ padding: '10px 0', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '20%' }}>MİKTAR/KAPSAM</th>
                                    <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '25%' }}>BİRİM FİYAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposal.proposal_items.map((item, index) => {
                                    const isProduct = item.item_type === 'product';
                                    let unitText = '';
                                    if(isProduct) unitText = `${item.visit_count} ${item.unit_type || 'Adet'}`;
                                    else unitText = item.unit_type === 'seferlik' ? 'Tek Sefer' : `${item.visit_count} Ziyaret / Ay`;

                                    const itemPrice = item.unit_price || 0;

                                    return (
                                        <tr key={index} style={{ borderBottom: `1px solid ${lightBorder}` }}>
                                            <td style={{ padding: '15px 0', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {item.image_url ? (
                                                        <img src={item.image_url} style={{ width: '45px', height: '45px', borderRadius: '4px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '45px', height: '45px', borderRadius: '4px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isProduct ? <Package size={20} color="#9ca3af"/> : <Shield size={20} color="#9ca3af"/>}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                                                            {item.service_name} 
                                                            {isProduct && <span style={{fontSize:'9px', backgroundColor:'#eff6ff', color:'#1e40af', padding:'2px 6px', borderRadius:'4px', marginLeft:'6px'}}>ÜRÜN</span>}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 0', lineHeight: '1.3' }}>{item.service_description}</p>
                                                        {item.explanation && <p style={{ fontSize: '10px', color: '#4f46e5', marginTop: '4px', fontStyle: 'italic' }}>* {item.explanation}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 0', textAlign: 'center', verticalAlign: 'top', fontSize: '11px', fontWeight: '500', color: '#374151' }}>
                                                {unitText}
                                            </td>
                                            <td style={{ padding: '15px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>
                                                {itemPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* TOPLAM ALANI */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                            <div style={{ width: '250px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Ara Toplam</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}>
                                        <span style={{ fontSize: '11px' }}>İskonto</span>
                                        <span style={{ fontSize: '12px', fontWeight: '600' }}>-{discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${lightBorder}` }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>KDV (%20)</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{(totalAmount * 0.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: primaryColor }}>GENEL TOPLAM</span>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: primaryColor }}>{grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* ... (Hakkımızda vb. kısımlar aynı) ... */}
                    </div>
                    {/* Footer aynı */}
                </div>
                
                {/* ONAY BUTONLARI (Aynı) */}
                {proposal.status === 'pending' && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-center gap-4 print:hidden z-50">
                        <div className="flex flex-col md:flex-row items-center gap-4 max-w-2xl w-full">
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Varsa notunuzu buraya yazabilirsiniz..." className="flex-grow p-2 border rounded-lg text-sm w-full md:w-auto" rows={1} />
                            <div className="flex gap-2 w-full md:w-auto">
                                {proposal.contract_available ? (
                                    <button onClick={handleApproveAndCreateContract} disabled={isSubmitting} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                                        {isSubmitting ? <Loader className="animate-spin size-4"/> : <FileSignature size={18} />} Onayla ve Sözleşme Hazırla
                                    </button>
                                ) : (
                                    <button onClick={handleApproveOnly} disabled={isSubmitting} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                                        {isSubmitting ? <Loader className="animate-spin size-4"/> : <Check size={18} />} Teklifi Onayla
                                    </button>
                                )}
                                <button onClick={() => handleUpdateStatus('rejected')} disabled={isSubmitting} className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg font-bold shadow flex items-center justify-center gap-2 text-sm">
                                    <X size={18} /> Reddet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SÖZLEŞME MODALI AYNI */}
            {showContractModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                <FileText className="text-blue-600" /> Hizmet Sözleşmesi Oluşturuldu
                            </h2>
                            <button onClick={() => setShowContractModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto bg-gray-50 p-8 rounded border mb-4">
                            <div ref={contractRef} className="bg-white shadow-lg p-10 max-w-[210mm] mx-auto min-h-[297mm]" dangerouslySetInnerHTML={{ __html: contractHtml }} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowContractModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Kapat</button>
                            <button onClick={() => handleDownloadPdf(contractRef, `Sozlesme_${proposal.company_name}`)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                <FileDown size={18} /> Sözleşmeyi İndir (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeklifGoruntule;