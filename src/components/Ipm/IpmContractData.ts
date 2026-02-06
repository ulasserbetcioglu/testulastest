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
