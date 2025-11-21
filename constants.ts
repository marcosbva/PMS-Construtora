
import { ConstructionWork, User, UserRole, WorkStatus, Task, TaskStatus, TaskPriority, FinancialRecord, FinanceType, DailyLog, UserProfile, MaterialOrder, OrderStatus, TaskStatusDefinition, Material, FinanceCategoryDefinition } from './types';

// Helper to get a date string relative to today
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// --- STATUS DEFINITIONS (Mantidos pois são estrutura do sistema) ---
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
  { id: 'cat_proj', name: 'Projetos', type: 'BOTH' },
  { id: 'cat_other', name: 'Outros', type: 'BOTH' }
];

// --- PROFILES (Mantidos pois são estrutura do sistema) ---
export const MOCK_PROFILES: UserProfile[] = [
  {
    id: 'p_admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    isSystem: true,
    permissions: {
      viewDashboard: true,
      viewWorks: true,
      manageWorks: true,
      viewFinance: true,
      manageFinance: true,
      viewGlobalTasks: true,
      viewMaterials: true,
      manageMaterials: true,
      manageUsers: true,
      isSystemAdmin: true
    }
  },
  {
    id: 'p_partner',
    name: 'Sócio / Gerente',
    description: 'Gestão de obras e financeiro',
    isSystem: false,
    permissions: {
      viewDashboard: true,
      viewWorks: true,
      manageWorks: true,
      viewFinance: true,
      manageFinance: true,
      viewGlobalTasks: true,
      viewMaterials: true,
      manageMaterials: true,
      manageUsers: false,
      isSystemAdmin: false
    }
  },
  {
    id: 'p_master',
    name: 'Mestre de Obras',
    description: 'Foco em tarefas e diário de obra',
    isSystem: false,
    permissions: {
      viewDashboard: true,
      viewWorks: true,
      manageWorks: false,
      viewFinance: false,
      manageFinance: false,
      viewGlobalTasks: true,
      viewMaterials: true,
      manageMaterials: true, // Can request materials
      manageUsers: false,
      isSystemAdmin: false
    }
  },
  {
    id: 'p_client',
    name: 'Cliente (Visualização)',
    description: 'Acesso restrito para acompanhamento',
    isSystem: false,
    permissions: {
      viewDashboard: false,
      viewWorks: true,
      manageWorks: false,
      viewFinance: false,
      manageFinance: false,
      viewGlobalTasks: false,
      viewMaterials: false,
      manageMaterials: false,
      manageUsers: false,
      isSystemAdmin: false
    }
  },
  {
    id: 'p_supplier',
    name: 'Fornecedor',
    description: 'Apenas cadastro, sem acesso ao sistema',
    isSystem: false,
    permissions: {
      viewDashboard: false,
      viewWorks: false,
      manageWorks: false,
      viewFinance: false,
      manageFinance: false,
      viewGlobalTasks: false,
      viewMaterials: false,
      manageMaterials: false,
      manageUsers: false,
      isSystemAdmin: false
    }
  }
];

// --- ARRAYS VAZIOS (Sistema Zerado) ---
export const MOCK_USERS: User[] = [];
export const MOCK_WORKS: ConstructionWork[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_FINANCE: FinancialRecord[] = [];
export const MOCK_LOGS: DailyLog[] = [];
export const MOCK_ORDERS: MaterialOrder[] = [];
export const MOCK_MATERIALS: Material[] = [];
