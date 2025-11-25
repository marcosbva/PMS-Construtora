

export enum UserRole {
  ADMIN = 'ADMIN',   // Acesso Total (Super Usuário)
  EDITOR = 'EDITOR', // Pode criar/editar obras, tarefas, financeiro (Gerente/Mestre)
  VIEWER = 'VIEWER'  // Apenas visualização (Cliente, Fornecedor, Visitante)
}

export enum UserCategory {
  INTERNAL = 'INTERNAL', // Equipe interna (Engenheiros, Mestres, Sócios)
  CLIENT = 'CLIENT',     // Dono da obra
  SUPPLIER = 'SUPPLIER'  // Fornecedor de materiais
}

export interface AppPermissions {
  viewDashboard: boolean;
  viewWorks: boolean;
  manageWorks: boolean;
  viewFinance: boolean;
  manageFinance: boolean;
  viewGlobalTasks: boolean;
  viewMaterials: boolean;
  manageMaterials: boolean;
  manageUsers: boolean;
  isSystemAdmin: boolean;
}

export type RolePermissionsMap = Record<UserRole, AppPermissions>;

// Mapeamento Estático Inicial (Fallback)
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  [UserRole.ADMIN]: {
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
  },
  [UserRole.EDITOR]: {
    viewDashboard: true,
    viewWorks: true,
    manageWorks: true,
    viewFinance: true,
    manageFinance: true,
    viewGlobalTasks: true,
    viewMaterials: true,
    manageMaterials: true,
    manageUsers: false, // Editor não gerencia usuários
    isSystemAdmin: false
  },
  [UserRole.VIEWER]: {
    viewDashboard: false, // Visitante vê apenas o que é permitido explicitamente (ex: Cliente vê obra própria)
    viewWorks: true,
    manageWorks: false,
    viewFinance: false, // Por padrão false, lógica de negócio pode liberar financeiro específico
    manageFinance: false,
    viewGlobalTasks: false,
    viewMaterials: false,
    manageMaterials: false,
    manageUsers: false,
    isSystemAdmin: false
  }
};

// Mantendo exportação antiga para compatibilidade temporária, mas apontando para o default
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  
  // NEW STRUCTURE
  category: UserCategory; // QUEM É (Identidade)
  role: UserRole;         // O QUE FAZ (Permissão)
  
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  cpf?: string;
  address?: string;
  phone?: string;
  birthDate?: string;
  notes?: string;
  
  // SECURITY
  mustChangePassword?: boolean; // Obrigar troca de senha no primeiro acesso
}

export enum WorkStatus {
  PLANNING = 'Planejamento',
  EXECUTION = 'Execução',
  PAUSED = 'Pausada',
  COMPLETED = 'Concluída'
}

export interface ConstructionWork {
  id: string;
  name: string;
  client: string; 
  clientId?: string;
  address: string;
  status: WorkStatus;
  progress: number;
  budget: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
  description: string;
  teamIds?: string[];
  driveLink?: string; // Link para Google Drive / Projetos
}

export enum TaskStatus {
  BACKLOG = 'Backlog',
  PLANNING = 'Planejamento',
  EXECUTION = 'Execução',
  WAITING_MARCOS = 'Aguardando Marcos',
  PURCHASE_LOGISTICS = 'Compra & Logística',
  WAITING_MATERIAL = 'Aguardando Material',
  NC = 'Não Conformidade',
  PHOTO_REGISTRY = 'Registro Fotográfico',
  DONE = 'Concluído'
}

export interface TaskStatusDefinition {
  id: string;
  label: string;
  colorScheme: 'gray' | 'blue' | 'orange' | 'yellow' | 'red' | 'green' | 'purple';
  order: number;
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

export interface Task {
  id: string;
  workId: string;
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate: string;
  completedDate?: string;
  images: string[];
  aiAnalysis?: string;
}

export enum FinanceType {
  EXPENSE = 'Pagar',
  INCOME = 'Receber'
}

export type FinanceCategory = string;

export interface FinanceCategoryDefinition {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
}

export interface FinancialRecord {
  id: string;
  workId: string;
  entityId?: string;
  type: FinanceType;
  description: string;
  category: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  
  // LINK TO BUDGET (NEW)
  relatedBudgetCategoryId?: string;
}

// --- WORKFORCE TYPES ---
export type WorkforceRole = 'Pedreiro' | 'Servente' | 'Eletricista' | 'Bombeiro' | 'Carpinteiro' | 'Ferreiro' | 'Pintor' | 'Gesseiro' | 'Terceirizados';

export const WORKFORCE_ROLES_LIST: WorkforceRole[] = [
  'Pedreiro', 'Servente', 'Eletricista', 'Bombeiro', 'Carpinteiro', 'Ferreiro', 'Pintor', 'Gesseiro', 'Terceirizados'
];

// --- INTERCORRÊNCIA / ISSUE TYPES ---
export type IssueCategory = 
  | 'Acidente de Trabalho'
  | 'Erro de Execução'
  | 'Erro de Projeto'
  | 'Material Danificado/Faltante'
  | 'Equipamento Quebrado'
  | 'Condições Climáticas'
  | 'Embargo/Fiscalização'
  | 'Interferência Externa'
  | 'Outros';

export const ISSUE_CATEGORIES_LIST: IssueCategory[] = [
  'Acidente de Trabalho',
  'Erro de Execução',
  'Erro de Projeto',
  'Material Danificado/Faltante',
  'Equipamento Quebrado',
  'Condições Climáticas',
  'Embargo/Fiscalização',
  'Interferência Externa',
  'Outros'
];

export type IssueSeverity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type IssueImpact = 'Prazo' | 'Custo' | 'Qualidade' | 'Segurança' | 'Meio Ambiente';

export interface DailyLog {
  id: string;
  workId: string;
  authorId: string;
  date: string;
  content: string;
  images: string[];
  type: 'Diário' | 'Vistoria' | 'Alerta' | 'Intercorrência';
  weather?: 'Sol' | 'Nublado' | 'Chuva' | 'Neve';
  relatedTaskId?: string;
  teamIds?: string[];
  
  // Efetivo do dia
  workforce?: Record<string, number>; 

  // Campos de Intercorrência
  issueCategory?: IssueCategory;
  severity?: IssueSeverity;
  impacts?: IssueImpact[];
  actionPlan?: string; // O que foi feito imediatamente

  isResolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export enum OrderStatus {
  PENDING = 'Solicitado',
  QUOTING = 'Em Cotação',
  PURCHASED = 'Comprado',
  DELIVERED = 'Entregue no Local'
}

export interface MaterialQuote {
  id: string;
  supplierId: string;
  price: number;
}

export interface MaterialOrder {
  id: string;
  workId: string;
  taskId?: string;
  requesterId: string;
  supplierId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  status: OrderStatus;
  priority: TaskPriority;
  requestDate: string;
  purchaseDate?: string;
  deliveryDate?: string;
  estimatedCost?: number;
  finalCost?: number;
  notes?: string;
  quotes?: MaterialQuote[];
  selectedQuoteId?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  brand?: string;
  priceEstimate?: number;
  description?: string;
}

// --- BUDGETING TYPES (ORÇAMENTO) ---

export interface BudgetItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number; // Calculated: qty * unitPrice
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string; // e.g. "1. Serviços Preliminares"
  items: BudgetItem[];
  categoryTotal: number; // Calculated sum of items
}

export interface WorkBudget {
  id: string; // Usually matches workId for 1:1 relationship
  workId: string;
  totalValue: number;
  categories: BudgetCategory[];
  updatedAt: string;
  version?: number;
}

// --- INVENTORY & REAL ESTATE TYPES ---

export type AssetType = 'EQUIPMENT' | 'REAL_ESTATE';

export enum InventoryStatus {
  AVAILABLE = 'Disponível',
  IN_USE = 'Em Uso',
  MAINTENANCE = 'Manutenção',
  LOST = 'Perdido/Quebrado',
  LOANED = 'Emprestado'
}

export type RealEstateStatus = 'EM_CONSTRUCAO' | 'PRONTO' | 'ALUGADO' | 'A_VENDA' | 'VENDIDO';

export interface InventoryMovement {
  id: string;
  date: string;
  action: 'MOVIMENTACAO' | 'MANUTENCAO' | 'CRIACAO' | 'ATUALIZACAO';
  description: string;
  previousLocation?: string;
  newLocation?: string;
}

export interface InventoryItem {
  id: string;
  assetType?: AssetType; // Defaults to EQUIPMENT for compatibility
  
  // Common Fields
  name: string;
  category: string; // Equipment: Type | Real Estate: 'Planta', 'Pronto', etc.
  imageUrl?: string;
  notes?: string;
  lastMovementDate: string;

  // Equipment Specific
  brand?: string;
  serialNumber?: string;
  status: InventoryStatus | RealEstateStatus; // Polymorphic Status
  currentWorkId?: string;
  currentPartnerId?: string;
  estimatedValue?: number; // Current Asset Value (Equipment)
  history?: InventoryMovement[]; // New: Tracking history

  // Real Estate Specific
  developmentName?: string; // Empreendimento
  unitNumber?: string; // Unidade (Apt 101)
  developerName?: string; // Construtora Origem
  purchaseValue?: number; // Valor Contrato (Liability)
  amountPaid?: number; // Valor já pago (Equity)
  keyDeliveryDate?: string; // Previsão chaves
  documentLink?: string; // Drive Link
}

// --- RENTAL CONTROL TYPES (ALUGUEIS) ---

export enum RentalStatus {
  ACTIVE = 'Ativo (Em Uso)',
  RETURNED = 'Devolvido',
  OVERDUE = 'Atrasado'
}

export interface RentalItem {
  id: string;
  workId: string;
  itemName: string;
  supplierId?: string; // Link user category SUPPLIER
  supplierName?: string; // Fallback text
  
  quantity: number;
  unit: string; // e.g. 'pç', 'm²', 'conjunto'
  
  unitPrice: number; // Preço unitário do período
  billingPeriod: 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Total';
  
  startDate: string; // Data que chegou na obra
  endDate: string; // Data prevista de devolução / vencimento
  returnDate?: string; // Data real da devolução
  
  status: RentalStatus;
  notes?: string;
}