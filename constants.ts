
import { ConstructionWork, User, Task, TaskStatus, FinancialRecord, DailyLog, MaterialOrder, TaskStatusDefinition, Material, FinanceCategoryDefinition } from './types';

// Helper to get a date string relative to today
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

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
  { id: 'cat_other', name: 'Outros', type: 'BOTH' }
];

// --- MATERIAL CATALOG SEED ---
export const DEFAULT_MATERIALS: Material[] = [
    { id: 'mat_cim_cp2', name: 'Cimento CP II - 50kg', category: 'Alvenaria', unit: 'saco', priceEstimate: 35.00 },
    { id: 'mat_areia_med', name: 'Areia Média Lavada', category: 'Alvenaria', unit: 'm³', priceEstimate: 120.00 },
    { id: 'mat_areia_fina', name: 'Areia Fina', category: 'Acabamento', unit: 'm³', priceEstimate: 130.00 },
    { id: 'mat_pedra_1', name: 'Pedra Brita 1', category: 'Concreto', unit: 'm³', priceEstimate: 110.00 },
    { id: 'mat_tijolo_8', name: 'Tijolo Baiano 8 Furos', category: 'Alvenaria', unit: 'milheiro', priceEstimate: 800.00 },
    { id: 'mat_bloco_con', name: 'Bloco de Concreto 14x19x39', category: 'Alvenaria', unit: 'milheiro', priceEstimate: 2500.00 },
    { id: 'mat_aco_5mm', name: 'Vergalhão CA-60 5.0mm', category: 'Estrutural', unit: 'barra', priceEstimate: 25.00 },
    { id: 'mat_aco_10mm', name: 'Vergalhão CA-50 10.0mm (3/8)', category: 'Estrutural', unit: 'barra', priceEstimate: 55.00 },
    { id: 'mat_cal', name: 'Cal Hidratada 20kg', category: 'Alvenaria', unit: 'saco', priceEstimate: 18.00 },
    { id: 'mat_arga_ac1', name: 'Argamassa AC-I', category: 'Acabamento', unit: 'saco', priceEstimate: 15.00 },
    { id: 'mat_arga_ac2', name: 'Argamassa AC-II', category: 'Acabamento', unit: 'saco', priceEstimate: 28.00 },
    { id: 'mat_arga_ac3', name: 'Argamassa AC-III', category: 'Acabamento', unit: 'saco', priceEstimate: 45.00 },
    { id: 'mat_tinta_ext', name: 'Tinta Acrílica Fosca - 18L', category: 'Pintura', unit: 'lata', priceEstimate: 350.00 },
    { id: 'mat_massa_corr', name: 'Massa Corrida PVA - 25kg', category: 'Pintura', unit: 'lata', priceEstimate: 60.00 },
    { id: 'mat_tubo_100', name: 'Tubo PVC Esgoto 100mm', category: 'Hidráulica', unit: 'barra', priceEstimate: 85.00 },
    { id: 'mat_tubo_25', name: 'Tubo PVC Soldável 25mm', category: 'Hidráulica', unit: 'barra', priceEstimate: 18.00 },
    { id: 'mat_fio_2_5', name: 'Cabo Flexível 2.5mm', category: 'Elétrica', unit: 'rolo', priceEstimate: 220.00 },
    { id: 'mat_disj_20', name: 'Disjuntor Unipolar 20A', category: 'Elétrica', unit: 'un', priceEstimate: 15.00 },
    { id: 'mat_telha_fib', name: 'Telha Fibrocimento 2.44m x 1.10m 6mm', category: 'Cobertura', unit: 'un', priceEstimate: 65.00 }
];

// --- ARRAYS VAZIOS (Sistema Zerado) ---
export const MOCK_USERS: User[] = [];
export const MOCK_WORKS: ConstructionWork[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_FINANCE: FinancialRecord[] = [];
export const MOCK_LOGS: DailyLog[] = [];
export const MOCK_ORDERS: MaterialOrder[] = [];
export const MOCK_MATERIALS: Material[] = [];
