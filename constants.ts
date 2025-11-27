
import { ConstructionWork, User, Task, TaskStatus, FinancialRecord, DailyLog, MaterialOrder, TaskStatusDefinition, Material, FinanceCategoryDefinition } from './types';

export const getLocalToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// --- STATUS DEFINITIONS ---
export const DEFAULT_TASK_STATUSES: TaskStatusDefinition[] = [
  { id: TaskStatus.BACKLOG, label: 'Backlog', colorScheme: 'gray', order: 0 },
  { id: TaskStatus.PLANNING, label: 'Planejamento', colorScheme: 'blue', order: 1 },
  { id: TaskStatus.EXECUTION, label: 'Execução', colorScheme: 'orange', order: 2 },
  { id: TaskStatus.WAITING_MATERIAL, label: 'Aguard. Material', colorScheme: 'yellow', order: 3 },
  { id: TaskStatus.NC, label: 'Não Conformidade', colorScheme: 'red', order: 4 },
  { id: TaskStatus.DONE, label: 'Concluído', colorScheme: 'green', order: 5 },
];

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryDefinition[] = [
  { id: 'cat_mat', name: 'Material', type: 'EXPENSE' },
  { id: 'cat_labor', name: 'Mão de Obra', type: 'EXPENSE' },
  { id: 'cat_fee', name: 'Honorário', type: 'INCOME' },
  { id: 'cat_tax', name: 'Imposto', type: 'EXPENSE' },
  { id: 'cat_log', name: 'Logística/Frete', type: 'EXPENSE' },
  { id: 'cat_serv', name: 'Serviços Terceiros', type: 'EXPENSE' },
  { id: 'cat_admin', name: 'Administrativo', type: 'EXPENSE' },
  { id: 'cat_alim', name: 'Alimentação', type: 'EXPENSE' },
  { id: 'cat_proj', name: 'Projetos', type: 'BOTH' },
  { id: 'cat_equip', name: 'Locação de Equipamentos', type: 'EXPENSE' },
  { id: 'cat_other', name: 'Outros', type: 'BOTH' }
];

// --- MATERIAL CATALOG SEED (COMPLETO & EXPANDIDO) ---
export const DEFAULT_MATERIALS: Material[] = [
    // 1. ESTRUTURA & ALVENARIA
    { id: 'mat_cim_cp2', name: 'Cimento CP II - 50kg', category: 'Estrutura & Alvenaria', unit: 'saco', priceEstimate: 36.90, brand: 'Votoran/Cauê' },
    { id: 'mat_areia_lav', name: 'Areia Média Lavada', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 160.00 },
    { id: 'mat_areia_fina', name: 'Areia Fina (Acabamento)', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 170.00 },
    { id: 'mat_areia_grossa', name: 'Areia Grossa (Contrapiso)', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 150.00 },
    { id: 'mat_brita_1', name: 'Pedra Brita 1', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 140.00 },
    { id: 'mat_brita_2', name: 'Pedra Brita 2 (Concreto)', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 135.00 },
    { id: 'mat_brita_0', name: 'Pedra Brita 0 (Pedrisco)', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 145.00 },
    { id: 'mat_bloco_estr', name: 'Bloco Estrutural Cerâmico 14x19x39', category: 'Estrutura & Alvenaria', unit: 'milheiro', priceEstimate: 2100.00 },
    { id: 'mat_bloco_conc', name: 'Bloco de Concreto 14x19x39', category: 'Estrutura & Alvenaria', unit: 'milheiro', priceEstimate: 3200.00 },
    { id: 'mat_tijolo_8f', name: 'Tijolo Baiano 8 Furos', category: 'Estrutura & Alvenaria', unit: 'milheiro', priceEstimate: 850.00 },
    { id: 'mat_aco_10', name: 'Vergalhão CA-50 10mm (3/8")', category: 'Estrutura & Alvenaria', unit: 'barra', priceEstimate: 58.00, brand: 'Gerdau/Arcelor' },
    { id: 'mat_aco_8', name: 'Vergalhão CA-50 8mm (5/16")', category: 'Estrutura & Alvenaria', unit: 'barra', priceEstimate: 38.00, brand: 'Gerdau/Arcelor' },
    { id: 'mat_aco_6', name: 'Vergalhão CA-60 5.0mm', category: 'Estrutura & Alvenaria', unit: 'barra', priceEstimate: 22.00 },
    { id: 'mat_trelica', name: 'Treliça H8 Leve 6m', category: 'Estrutura & Alvenaria', unit: 'barra', priceEstimate: 45.00 },
    { id: 'mat_arame_rec', name: 'Arame Recozido BWG 18 (1kg)', category: 'Estrutura & Alvenaria', unit: 'kg', priceEstimate: 18.00 },
    { id: 'mat_concreto_us', name: 'Concreto Usinado FCK 30Mpa', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 480.00 },
    { id: 'mat_aditivo_imp', name: 'Aditivo Impermeabilizante 18L', category: 'Estrutura & Alvenaria', unit: 'balde', priceEstimate: 210.00, brand: 'Vedacit' },
    { id: 'mat_cal_hid', name: 'Cal Hidratada CH-III 20kg', category: 'Estrutura & Alvenaria', unit: 'saco', priceEstimate: 18.00, brand: 'Votoran' },
    { id: 'mat_espacador_ferro', name: 'Espaçador Plástico para Ferragem (Cocada)', category: 'Estrutura & Alvenaria', unit: 'cento', priceEstimate: 25.00 },

    // 2. MADEIRAS & CARPINTARIA
    { id: 'mat_tabua_pinus', name: 'Tábua de Pinus 30cm (Fôrma)', category: 'Madeiras & Carpintaria', unit: 'm', priceEstimate: 12.00 },
    { id: 'mat_pontalete', name: 'Pontalete Eucalipto 6cm (Escora)', category: 'Madeiras & Carpintaria', unit: 'm', priceEstimate: 6.50 },
    { id: 'mat_sarrafo', name: 'Sarrafo Pinus 10cm', category: 'Madeiras & Carpintaria', unit: 'm', priceEstimate: 5.00 },
    { id: 'mat_comp_plast', name: 'Compensado Plastificado 18mm 1.10x2.20', category: 'Madeiras & Carpintaria', unit: 'chapa', priceEstimate: 210.00 },
    { id: 'mat_comp_res', name: 'Compensado Resinado 12mm (Tapume)', category: 'Madeiras & Carpintaria', unit: 'chapa', priceEstimate: 85.00 },
    { id: 'mat_prego_1827', name: 'Prego 18x27 com cabeça', category: 'Madeiras & Carpintaria', unit: 'kg', priceEstimate: 22.00 },
    { id: 'mat_prego_1721', name: 'Prego 17x21 com cabeça', category: 'Madeiras & Carpintaria', unit: 'kg', priceEstimate: 22.00 },

    // 3. IMPERMEABILIZAÇÃO & VEDAÇÃO
    { id: 'mat_manta_asf', name: 'Manta Asfáltica Aluminizada 3mm', category: 'Impermeabilização', unit: 'rolo', priceEstimate: 380.00, brand: 'Vedacit/Sika' },
    { id: 'mat_primer', name: 'Primer Asfáltico Base Água 18L', category: 'Impermeabilização', unit: 'lata', priceEstimate: 190.00 },
    { id: 'mat_arg_poly', name: 'Argamassa Polimérica (Cx 18kg)', category: 'Impermeabilização', unit: 'cx', priceEstimate: 85.00, brand: 'Viapol' },
    { id: 'mat_pu_40', name: 'Selante PU 40 Sachê 600ml', category: 'Impermeabilização', unit: 'un', priceEstimate: 35.00 },
    { id: 'mat_espuma_exp', name: 'Espuma Expansiva 500ml', category: 'Impermeabilização', unit: 'un', priceEstimate: 28.00 },
    { id: 'mat_neutrol', name: 'Tinta Asfáltica (Neutrol) 18L', category: 'Impermeabilização', unit: 'lata', priceEstimate: 250.00, brand: 'Vedacit' },

    // 4. INSTALAÇÕES HIDRÁULICAS (TUBOS & CONEXÕES)
    { id: 'mat_tubo_sold_25', name: 'Tubo Soldável PVC 25mm (Água Fria)', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 22.00, brand: 'Tigre/Amanco' },
    { id: 'mat_tubo_sold_50', name: 'Tubo Soldável PVC 50mm (Água Fria)', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 58.00, brand: 'Tigre/Amanco' },
    { id: 'mat_joelho_25', name: 'Joelho 90º PVC Soldável 25mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 1.50 },
    { id: 'mat_te_25', name: 'Te 90º PVC Soldável 25mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 2.00 },
    { id: 'mat_luva_25', name: 'Luva PVC Soldável 25mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 1.20 },
    { id: 'mat_cpvc_22', name: 'Tubo CPVC Aquatherm 22mm (Água Quente)', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 72.00, brand: 'Tigre/Amanco' },
    { id: 'mat_cpvc_28', name: 'Tubo CPVC Aquatherm 28mm (Água Quente)', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 115.00, brand: 'Tigre/Amanco' },
    { id: 'mat_tubo_esgoto_100', name: 'Tubo Esgoto SN 100mm', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 65.00 },
    { id: 'mat_tubo_esgoto_40', name: 'Tubo Esgoto SN 40mm', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 28.00 },
    { id: 'mat_joelho_esg_100', name: 'Joelho 90º Esgoto 100mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 12.00 },
    { id: 'mat_joelho_esg_40', name: 'Joelho 45º Esgoto 40mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 3.50 },
    { id: 'mat_caixa_gordura', name: 'Caixa de Gordura PVC Completa', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 180.00, brand: 'Tigre' },
    { id: 'mat_reg_esfera', name: 'Registro de Esfera PVC 3/4 (25mm)', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 18.00 },
    { id: 'mat_reg_gaveta_34', name: 'Registro de Gaveta Docol Base 3/4', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 55.00 },
    { id: 'mat_valv_ret', name: 'Válvula de Retenção Esgoto 100mm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 120.00 },
    { id: 'mat_sifao_univ', name: 'Sifão Universal Sanfonado', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 12.00 },
    { id: 'mat_engate_flex', name: 'Engate Flexível Trançado 40cm', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 25.00 },
    { id: 'mat_pressur', name: 'Pressurizador de Água (Até 20mca)', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 1400.00, brand: 'Lorenzetti/Komeco' },
    { id: 'mat_caixa_1000', name: 'Caixa D\'água Polietileno 1000L', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 450.00, brand: 'Fortlev' },
    { id: 'mat_boia_cx', name: 'Torneira de Boia 3/4', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 35.00 },
    { id: 'mat_ralo_lin', name: 'Ralo Linear Inox 70cm Invisible', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 420.00, brand: 'Elleve' },
    { id: 'mat_ralo_sif_100', name: 'Ralo Sifonado 100x100 Redondo', category: 'Instalações Hidráulicas', unit: 'un', priceEstimate: 25.00 },
    { id: 'mat_adesivo_pvc', name: 'Adesivo Plástico PVC (Cola) 175g', category: 'Instalações Hidráulicas', unit: 'frasco', priceEstimate: 18.00 },

    // 5. INSTALAÇÕES ELÉTRICAS & AUTOMAÇÃO
    { id: 'mat_cabo_1_5', name: 'Cabo Flexível 1.5mm (Iluminação)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 160.00, brand: 'Prysmian/Sil' },
    { id: 'mat_cabo_2_5', name: 'Cabo Flexível 2.5mm (Tomadas)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 260.00, brand: 'Prysmian/Sil' },
    { id: 'mat_cabo_4', name: 'Cabo Flexível 4.0mm (Chuveiro/AC)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 420.00, brand: 'Prysmian/Sil' },
    { id: 'mat_cabo_6', name: 'Cabo Flexível 6.0mm (Entrada)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 680.00, brand: 'Prysmian/Sil' },
    { id: 'mat_cabo_rede', name: 'Cabo de Rede CAT6 (Caixa 305m)', category: 'Automação', unit: 'cx', priceEstimate: 850.00, brand: 'Furukawa' },
    { id: 'mat_cabo_coaxial', name: 'Cabo Coaxial RG6 (Antena)', category: 'Instalações Elétricas', unit: 'm', priceEstimate: 2.50 },
    { id: 'mat_eletroduto_3_4', name: 'Eletroduto Corrugado Amarelo 3/4', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 75.00 },
    { id: 'mat_eletroduto_reforc', name: 'Eletroduto Corrugado Laranja 3/4 (Laje)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 110.00 },
    { id: 'mat_eletroduto_rig', name: 'Eletroduto Rígido PVC 3/4', category: 'Instalações Elétricas', unit: 'barra', priceEstimate: 18.00 },
    { id: 'mat_caixa_4x2', name: 'Caixa de Luz 4x2 Amarela', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 2.50 },
    { id: 'mat_caixa_4x4', name: 'Caixa de Luz 4x4 Amarela', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 4.50 },
    { id: 'mat_qd_dist', name: 'Quadro de Distribuição 24 Disjuntores', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 120.00, brand: 'Tigre/Steck' },
    { id: 'mat_haste_terra', name: 'Haste de Aterramento Cobreada 2.40m', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 45.00 },
    { id: 'mat_disjuntor_16', name: 'Disjuntor DIN Unipolar 16A', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 18.00, brand: 'Steck/Siemens' },
    { id: 'mat_disjuntor_20', name: 'Disjuntor DIN Unipolar 20A', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 18.00, brand: 'Steck/Siemens' },
    { id: 'mat_disjuntor_bip_40', name: 'Disjuntor DIN Bipolar 40A', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 65.00, brand: 'Steck/Siemens' },
    { id: 'mat_dr_40', name: 'Interruptor DR 4P 40A 30mA', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 280.00, brand: 'Schneider/Siemens' },
    { id: 'mat_tomada_10a', name: 'Conjunto Tomada 10A c/ Placa', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 15.00, brand: 'Tramontina/Pial' },
    { id: 'mat_interruptor_s', name: 'Conjunto Interruptor Simples c/ Placa', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 14.00 },
    { id: 'mat_fita_isolante', name: 'Fita Isolante 33+ 20m', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 18.00, brand: '3M' },
    { id: 'mat_mod_smart', name: 'Módulo Relé Wi-Fi 2 Canais', category: 'Automação', unit: 'un', priceEstimate: 95.00, brand: 'Sonoff/Tuya' },
    { id: 'mat_conector_wago', name: 'Conector de Torção/Wago (Pacote)', category: 'Instalações Elétricas', unit: 'pct', priceEstimate: 45.00 },

    // 5.1 ILUMINAÇÃO (NOVOS)
    { id: 'mat_painel_led_18', name: 'Painel LED Embutir 18W Quadrado', category: 'Iluminação', unit: 'un', priceEstimate: 35.00, brand: 'Avant/Taschibra' },
    { id: 'mat_lamp_led_9', name: 'Lâmpada LED Bulbo 9W E27', category: 'Iluminação', unit: 'un', priceEstimate: 9.50 },
    { id: 'mat_spot_led_5', name: 'Spot LED Direcionável 5W', category: 'Iluminação', unit: 'un', priceEstimate: 18.00 },
    { id: 'mat_fita_led_5m', name: 'Fita LED 3000K 5m + Fonte', category: 'Iluminação', unit: 'rolo', priceEstimate: 65.00 },
    { id: 'mat_perfil_led', name: 'Perfil de Alumínio para LED 2m', category: 'Iluminação', unit: 'barra', priceEstimate: 85.00 },

    // 6. REVESTIMENTOS & PISOS
    { id: 'mat_porc_120', name: 'Porcelanato Polido 120x120 Calacata', category: 'Revestimentos', unit: 'm²', priceEstimate: 280.00, brand: 'Portinari/Portobello' },
    { id: 'mat_porc_90', name: 'Porcelanato Acetinado 90x90 Cimento Queimado', category: 'Revestimentos', unit: 'm²', priceEstimate: 190.00, brand: 'Eliane/Villagres' },
    { id: 'mat_porc_madeira', name: 'Porcelanato Amadeirado 20x120', category: 'Revestimentos', unit: 'm²', priceEstimate: 120.00, brand: 'Ceusa/Portinari' },
    { id: 'mat_piso_ceramico', name: 'Piso Cerâmico PEI-4 60x60', category: 'Revestimentos', unit: 'm²', priceEstimate: 45.00 },
    { id: 'mat_vinilico', name: 'Piso Vinílico Click 5mm Capa 0.5', category: 'Revestimentos', unit: 'm²', priceEstimate: 165.00, brand: 'Tarkett' },
    { id: 'mat_intertravado', name: 'Piso Intertravado 16 faces (Paver)', category: 'Revestimentos', unit: 'm²', priceEstimate: 55.00 },
    { id: 'mat_rodape', name: 'Rodapé Poliestireno 15cm (Branco)', category: 'Revestimentos', unit: 'barra', priceEstimate: 110.00, brand: 'Santa Luzia' },
    { id: 'mat_arg_ac1', name: 'Argamassa AC-I (Interna)', category: 'Revestimentos', unit: 'saco', priceEstimate: 15.00, brand: 'Quartzolit' },
    { id: 'mat_arg_ac2', name: 'Argamassa AC-II (Externa)', category: 'Revestimentos', unit: 'saco', priceEstimate: 28.00, brand: 'Quartzolit' },
    { id: 'mat_arg_ac3', name: 'Argamassa AC-III (Porcelanato/Sobreposição)', category: 'Revestimentos', unit: 'saco', priceEstimate: 45.00, brand: 'Quartzolit' },
    { id: 'mat_rejunte_flex', name: 'Rejunte Flexível 1kg', category: 'Revestimentos', unit: 'saco', priceEstimate: 12.00 },
    { id: 'mat_rejunte_epoxi', name: 'Rejunte Epóxi Bicomponente 1kg', category: 'Revestimentos', unit: 'pote', priceEstimate: 95.00, brand: 'Portokoll/Quartzolit' },
    { id: 'mat_espacador', name: 'Espaçador/Nivelador de Piso (Pacote)', category: 'Revestimentos', unit: 'pct', priceEstimate: 35.00 },
    { id: 'mat_papelao_prot', name: 'Papelão Ondulado (Proteção Piso)', category: 'Revestimentos', unit: 'rolo', priceEstimate: 85.00 },
    { id: 'mat_salva_piso', name: 'Salva Piso (Plástico Bolha Alta Resistência)', category: 'Revestimentos', unit: 'rolo', priceEstimate: 150.00 },

    // 7. BANCADAS & PEDRAS NATURAIS
    { id: 'mat_granito_sg', name: 'Granito Preto São Gabriel', category: 'Bancadas & Pedras', unit: 'm²', priceEstimate: 650.00 },
    { id: 'mat_granito_vu', name: 'Granito Verde Ubatuba', category: 'Bancadas & Pedras', unit: 'm²', priceEstimate: 450.00 },
    { id: 'mat_marmore_br', name: 'Mármore Branco Prime', category: 'Bancadas & Pedras', unit: 'm²', priceEstimate: 900.00 },
    { id: 'mat_quartzo_br', name: 'Quartzo Branco Stellar (Silestone)', category: 'Bancadas & Pedras', unit: 'm²', priceEstimate: 2200.00 },
    { id: 'mat_soleira_sg', name: 'Soleira Granito São Gabriel 15cm', category: 'Bancadas & Pedras', unit: 'm', priceEstimate: 85.00 },
    { id: 'mat_peitoril_sg', name: 'Peitoril Granito São Gabriel 15cm', category: 'Bancadas & Pedras', unit: 'm', priceEstimate: 95.00 },
    { id: 'mat_cubo_inox', name: 'Cuba Inox Cozinha (Nº 1 ou 2)', category: 'Bancadas & Pedras', unit: 'un', priceEstimate: 280.00, brand: 'Tramontina' },

    // 8. GESSO & PINTURA
    { id: 'mat_placa_st', name: 'Chapa Drywall Standard (ST) 1.20x1.80', category: 'Gesso & Drywall', unit: 'chapa', priceEstimate: 38.00, brand: 'Knauf/Placo' },
    { id: 'mat_placa_ru', name: 'Chapa Drywall RU (Verde) 1.20x1.80', category: 'Gesso & Drywall', unit: 'chapa', priceEstimate: 52.00, brand: 'Knauf/Placo' },
    { id: 'mat_perfil_f530', name: 'Perfil Canaleta F530 (3m)', category: 'Gesso & Drywall', unit: 'barra', priceEstimate: 22.00 },
    { id: 'mat_tabica', name: 'Tabica Metálica Branca 3m', category: 'Gesso & Drywall', unit: 'barra', priceEstimate: 18.00 },
    { id: 'mat_parafuso_gn25', name: 'Parafuso GN25 (Ponta Agulha)', category: 'Gesso & Drywall', unit: 'cx', priceEstimate: 45.00 },
    { id: 'mat_fita_papel', name: 'Fita de Papel Microperfurada', category: 'Gesso & Drywall', unit: 'rolo', priceEstimate: 25.00 },
    { id: 'mat_massa_drywall', name: 'Massa para Drywall 20kg', category: 'Gesso & Drywall', unit: 'balde', priceEstimate: 85.00 },
    { id: 'mat_tinta_premium', name: 'Tinta Acrílica Premium Super Lavável 18L', category: 'Pintura', unit: 'lata', priceEstimate: 620.00, brand: 'Suvinil/Coral' },
    { id: 'mat_tinta_stand', name: 'Tinta Acrílica Standard 18L', category: 'Pintura', unit: 'lata', priceEstimate: 380.00, brand: 'Suvinil/Coral' },
    { id: 'mat_tinta_piso', name: 'Tinta para Piso 18L', category: 'Pintura', unit: 'lata', priceEstimate: 320.00 },
    { id: 'mat_selador_acr', name: 'Selador Acrílico 18L', category: 'Pintura', unit: 'lata', priceEstimate: 140.00 },
    { id: 'mat_massa_corrida', name: 'Massa Corrida PVA Premium 25kg', category: 'Pintura', unit: 'lata', priceEstimate: 130.00 },
    { id: 'mat_massa_acrilica', name: 'Massa Acrílica (Externa) 25kg', category: 'Pintura', unit: 'lata', priceEstimate: 160.00 },
    { id: 'mat_textura', name: 'Textura Projetada Granfino 25kg', category: 'Pintura', unit: 'barrica', priceEstimate: 150.00 },
    { id: 'mat_lixa_massa', name: 'Lixa Massa 150/180/220', category: 'Pintura', unit: 'un', priceEstimate: 1.50 },
    { id: 'mat_rolo_la', name: 'Rolo de Lã Baixa Anti-Respingo 23cm', category: 'Pintura', unit: 'un', priceEstimate: 35.00 },
    { id: 'mat_fita_crepe', name: 'Fita Crepe Automotiva 48mm', category: 'Pintura', unit: 'rolo', priceEstimate: 12.00 },
    { id: 'mat_aguarras', name: 'Aguarrás / Solvente 5L', category: 'Pintura', unit: 'lata', priceEstimate: 85.00 },
    { id: 'mat_lona_preta', name: 'Lona Plástica Preta 4x100m', category: 'Pintura', unit: 'rolo', priceEstimate: 220.00 },

    // 9. LOUÇAS & METAIS
    { id: 'mat_bacia_cx', name: 'Vaso Sanitário c/ Caixa Acoplada', category: 'Louças e Metais', unit: 'un', priceEstimate: 450.00, brand: 'Deca/Roca/Incepa' },
    { id: 'mat_bacia_mono', name: 'Bacia Sanitária Monobloco', category: 'Louças e Metais', unit: 'un', priceEstimate: 1800.00, brand: 'Deca/Roca' },
    { id: 'mat_assento_wc', name: 'Assento Sanitário Soft Close', category: 'Louças e Metais', unit: 'un', priceEstimate: 120.00 },
    { id: 'mat_tanque', name: 'Tanque de Louça G (40L)', category: 'Louças e Metais', unit: 'un', priceEstimate: 320.00, brand: 'Deca/Celite' },
    { id: 'mat_torneira_gourmet', name: 'Torneira Cozinha Monocomando Gourmet', category: 'Louças e Metais', unit: 'un', priceEstimate: 950.00, brand: 'Docol/Deca' },
    { id: 'mat_torn_simples', name: 'Torneira Lavatório Bica Baixa', category: 'Louças e Metais', unit: 'un', priceEstimate: 85.00 },
    { id: 'mat_cuba_esculpida', name: 'Cuba de Apoio/Sobrepor Premium', category: 'Louças e Metais', unit: 'un', priceEstimate: 600.00 },
    { id: 'mat_ducha_teto', name: 'Chuveiro de Teto Acqua Duo', category: 'Louças e Metais', unit: 'un', priceEstimate: 750.00, brand: 'Lorenzetti' },
    { id: 'mat_registro_gav', name: 'Registro de Gaveta 3/4', category: 'Louças e Metais', unit: 'un', priceEstimate: 45.00, brand: 'Deca/Docol' },
    { id: 'mat_acab_reg', name: 'Acabamento Registro Monocomando', category: 'Louças e Metais', unit: 'un', priceEstimate: 220.00, brand: 'Deca' },
    { id: 'mat_kit_wc', name: 'Kit Acessórios Banheiro 5 Peças (Metal)', category: 'Louças e Metais', unit: 'cj', priceEstimate: 180.00 },

    // 10. ESQUADRIAS, VIDROS & FERRAGENS
    { id: 'mat_janela_alum', name: 'Janela Integrada Motorizada Linha Gold', category: 'Esquadrias', unit: 'm²', priceEstimate: 1500.00 },
    { id: 'mat_porta_acm', name: 'Porta Pivotante ACM 1.20x2.40 (Instalada)', category: 'Esquadrias', unit: 'un', priceEstimate: 4500.00 },
    { id: 'mat_box_vidro', name: 'Box Vidro Temperado 8mm Incolor', category: 'Esquadrias', unit: 'm²', priceEstimate: 450.00 },
    { id: 'mat_pele_vidro', name: 'Vidro Laminado Refletivo (Pele de Vidro)', category: 'Esquadrias', unit: 'm²', priceEstimate: 900.00 },
    { id: 'mat_porta_madeira', name: 'Porta Madeira Lisa (Folha) 80x210', category: 'Esquadrias', unit: 'un', priceEstimate: 280.00 },
    { id: 'mat_batente_madeira', name: 'Jogo de Batente (Marco) 14cm', category: 'Esquadrias', unit: 'jg', priceEstimate: 150.00 },
    { id: 'mat_guarnicao', name: 'Jogo de Guarnição (Alisar) 7cm', category: 'Esquadrias', unit: 'jg', priceEstimate: 80.00 },
    { id: 'mat_fechadura_int', name: 'Fechadura Interna Banheiro/Quarto', category: 'Ferragens', unit: 'un', priceEstimate: 85.00, brand: 'Stam/Pado' },
    { id: 'mat_fechadura_ext', name: 'Fechadura Externa Inox Roseta', category: 'Ferragens', unit: 'un', priceEstimate: 180.00, brand: 'Stam/Pado' },
    { id: 'mat_dobradica', name: 'Dobradiça Inox 3.5" (Cartela c/ 3)', category: 'Ferragens', unit: 'cartela', priceEstimate: 45.00 },
    { id: 'mat_bucha_6', name: 'Bucha 6mm com Anel (Pacote)', category: 'Ferragens', unit: 'pct', priceEstimate: 12.00 },
    { id: 'mat_bucha_8', name: 'Bucha 8mm com Anel (Pacote)', category: 'Ferragens', unit: 'pct', priceEstimate: 15.00 },
    { id: 'mat_parafuso_chip', name: 'Parafuso Chipboard 4x40 (Caixa)', category: 'Ferragens', unit: 'cx', priceEstimate: 35.00 },

    // 11. CLIMATIZAÇÃO
    { id: 'mat_kit_infra', name: 'Kit Infra Ar Condicionado (Cobre 1/4+3/8)', category: 'Climatização', unit: 'm', priceEstimate: 85.00 },
    { id: 'mat_ar_12000', name: 'Ar Condicionado Split Inverter 12000 BTUs', category: 'Climatização', unit: 'un', priceEstimate: 2400.00, brand: 'Daikin/Fujitsu' },
    { id: 'mat_ar_18000', name: 'Ar Condicionado Split Inverter 18000 BTUs', category: 'Climatização', unit: 'un', priceEstimate: 3200.00, brand: 'Daikin/Fujitsu' },
    { id: 'mat_suporte_ar', name: 'Suporte para Condensadora (Par)', category: 'Climatização', unit: 'par', priceEstimate: 45.00 },

    // 12. COBERTURA & TELHADO
    { id: 'mat_telha_fibro', name: 'Telha Fibrocimento 2.44x1.10 6mm', category: 'Cobertura & Telhado', unit: 'un', priceEstimate: 65.00, brand: 'Brasilit' },
    { id: 'mat_telha_amer', name: 'Telha Cerâmica Americana', category: 'Cobertura & Telhado', unit: 'milheiro', priceEstimate: 1800.00 },
    { id: 'mat_telha_conc', name: 'Telha de Concreto Tégula', category: 'Cobertura & Telhado', unit: 'milheiro', priceEstimate: 2200.00 },
    { id: 'mat_manta_term', name: 'Manta Térmica Subcobertura (Face Dupla)', category: 'Cobertura & Telhado', unit: 'm²', priceEstimate: 8.50 },
    { id: 'mat_caibro_camb', name: 'Caibro Cambará 5x5', category: 'Cobertura & Telhado', unit: 'm', priceEstimate: 12.00 },
    { id: 'mat_viga_camb', name: 'Viga Cambará 6x12', category: 'Cobertura & Telhado', unit: 'm', priceEstimate: 35.00 },
    { id: 'mat_calha_galv', name: 'Calha Galvanizada Corte 33', category: 'Cobertura & Telhado', unit: 'm', priceEstimate: 45.00 },
    { id: 'mat_rufo_ping', name: 'Rufo Pingadeira Galvanizado Corte 28', category: 'Cobertura & Telhado', unit: 'm', priceEstimate: 35.00 },

    // 13. CONSUMÍVEIS & FERRAMENTAS
    { id: 'mat_disco_corte', name: 'Disco de Corte Fino Inox 4.1/2', category: 'Ferragens', unit: 'un', priceEstimate: 6.50 },
    { id: 'mat_disco_diam', name: 'Disco Diamantado Segmentado (Concreto)', category: 'Ferragens', unit: 'un', priceEstimate: 25.00 },
    { id: 'mat_broca_6', name: 'Broca de Widea 6mm', category: 'Ferragens', unit: 'un', priceEstimate: 8.00 },
    { id: 'mat_broca_8', name: 'Broca de Widea 8mm', category: 'Ferragens', unit: 'un', priceEstimate: 10.00 },
    { id: 'mat_saco_entulho', name: 'Saco de Ráfia para Entulho', category: 'Limpeza & Obra', unit: 'un', priceEstimate: 2.50 },
    { id: 'mat_vassoura', name: 'Vassourão Gari 60cm', category: 'Limpeza & Obra', unit: 'un', priceEstimate: 35.00 },

    // 14. JARDINAGEM
    { id: 'mat_grama', name: 'Grama Esmeralda em Placa', category: 'Jardinagem', unit: 'm²', priceEstimate: 12.00 },
    { id: 'mat_terra_veg', name: 'Terra Vegetal Adubada (Saco 20kg)', category: 'Jardinagem', unit: 'saco', priceEstimate: 18.00 },
    { id: 'mat_seixo', name: 'Seixo de Rio (Pedra de Jardim)', category: 'Jardinagem', unit: 'saco', priceEstimate: 35.00 }
];

// --- ARRAYS VAZIOS (Sistema Zerado) ---
export const MOCK_USERS: User[] = [];
export const MOCK_WORKS: ConstructionWork[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_FINANCE: FinancialRecord[] = [];
export const MOCK_LOGS: DailyLog[] = [];
export const MOCK_ORDERS: MaterialOrder[] = [];
export const MOCK_MATERIALS: Material[] = [];
