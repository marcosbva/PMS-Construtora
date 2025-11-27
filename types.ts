

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

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  [UserRole.ADMIN]: { viewDashboard: true, viewWorks: true, manageWorks: true, viewFinance: true, manageFinance: true, viewGlobalTasks: true, viewMaterials: true, manageMaterials: true, manageUsers: true, isSystemAdmin: true },
  [UserRole.EDITOR]: { viewDashboard: true, viewWorks: true, manageWorks: true, viewFinance: true, manageFinance: true, viewGlobalTasks: true, viewMaterials: true, manageMaterials: true, manageUsers: false, isSystemAdmin: false },
  [UserRole.VIEWER]: { viewDashboard: false, viewWorks: true, manageWorks: false, viewFinance: false, manageFinance: false, viewGlobalTasks: false, viewMaterials: false, manageMaterials: false, manageUsers: false, isSystemAdmin: false }
};

export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  category: UserCategory;
  role: UserRole;
  status?: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  cpf?: string;
  address?: string;
  phone?: string;
  birthDate?: string;
  notes?: string;
  cnpj?: string;
  legalName?: string;
  tradeName?: string;
  website?: string;
  paymentInfo?: string;
  sellerName?: string;
  sellerPhone?: string;
  mustChangePassword?: boolean;
}

export enum WorkStatus {
  PLANNING = 'Planejamento',
  EXECUTION = 'Execução',
  PAUSED = 'Pausada',
  COMPLETED = 'Concluída'
}

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface WorkStage {
  id: string;
  name: string;
  status: StageStatus;
  order: number;
}

export type ProgressMethod = 'STAGES' | 'TASKS';

export interface ConstructionWork {
  id: string;
  name: string;
  client: string; 
  clientId?: string;
  responsibleId?: string;
  address: string;
  status: WorkStatus;
  progress: number;
  progressMethod?: ProgressMethod;
  budget: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
  description: string;
  teamIds?: string[];
  driveLink?: string;
  contractUrl?: string;
  stages?: WorkStage[]; // Legacy field, now merged into Budget Categories in PlanningCenter
}

export enum TaskStatus {
  BACKLOG = 'Backlog',
  PLANNING = 'Planejamento', // Standard Status for Weekly Planning
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
  planningWeek?: string; // Format "YYYY-Wxx"
  
  // UNIFIED WORKFLOW LINK
  stageId?: string; // Links to BudgetCategory (Macro Stage)
  estimatedCost?: number;
  physicalProgress?: number;
  stageContribution?: number; // % that this task represents of the stageId total completion
}

export enum FinanceType {
  EXPENSE = 'Pagar',
  INCOME = 'Receber'
}

export interface FinanceCategoryDefinition {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
}

// Sub-items within a Financial Record to avoid double entry
export interface FinancialItemBreakdown {
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
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
  relatedBudgetCategoryId?: string;
  
  // NEW: Item Breakdown for Material Management
  items?: FinancialItemBreakdown[];
}

export type WorkforceRole = 'Pedreiro' | 'Servente' | 'Eletricista' | 'Bombeiro' | 'Carpinteiro' | 'Ferreiro' | 'Pintor' | 'Gesseiro' | 'Terceirizados';
export const WORKFORCE_ROLES_LIST: WorkforceRole[] = ['Pedreiro', 'Servente', 'Eletricista', 'Bombeiro', 'Carpinteiro', 'Ferreiro', 'Pintor', 'Gesseiro', 'Terceirizados'];

export type IssueCategory = 'Acidente de Trabalho' | 'Erro de Execução' | 'Erro de Projeto' | 'Material Danificado/Faltante' | 'Equipamento Quebrado' | 'Condições Climáticas' | 'Embargo/Fiscalização' | 'Interferência Externa' | 'Outros';
export const ISSUE_CATEGORIES_LIST: IssueCategory[] = ['Acidente de Trabalho', 'Erro de Execução', 'Erro de Projeto', 'Material Danificado/Faltante', 'Equipamento Quebrado', 'Condições Climáticas', 'Embargo/Fiscalização', 'Interferência Externa', 'Outros'];

export type IssueSeverity = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type IssueImpact = 'Prazo' | 'Custo' | 'Qualidade' | 'Segurança' | 'Meio Ambiente';

export interface DailyLogTaskUpdate {
    taskId: string;
    progressDelta: number;
    notes?: string;
}

export interface DailyLog {
  id: string;
  workId: string;
  authorId: string;
  date: string;
  content: string;
  images: string[];
  type: 'Diário' | 'Vistoria' | 'Alerta' | 'Intercorrência';
  weather?: 'Sol' | 'Nublado' | 'Chuva' | 'Neve';
  taskUpdates?: DailyLogTaskUpdate[];
  teamIds?: string[];
  workforce?: Record<string, number>; 
  issueCategory?: IssueCategory;
  severity?: IssueSeverity;
  impacts?: IssueImpact[];
  actionPlan?: string;
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

// --- UNIFIED PLANNING TYPES (BUDGET + SCHEDULE) ---

export interface BudgetItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  items: BudgetItem[];
  categoryTotal: number;
  
  // NEW: Schedule Fields (Gantt)
  startDate?: string;
  endDate?: string;
  status?: StageStatus;
  progress?: number; // Calculated from linked tasks
}

export interface WorkBudget {
  id: string;
  workId: string;
  totalValue: number;
  categories: BudgetCategory[];
  updatedAt: string;
  version?: number;
}

export type AssetType = 'EQUIPMENT' | 'REAL_ESTATE';
export enum InventoryStatus { AVAILABLE = 'Disponível', IN_USE = 'Em Uso', MAINTENANCE = 'Manutenção', LOST = 'Perdido/Quebrado', LOANED = 'Emprestado' }
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
  assetType?: AssetType;
  name: string;
  category: string;
  imageUrl?: string;
  notes?: string;
  lastMovementDate: string;
  brand?: string;
  serialNumber?: string;
  status: InventoryStatus | RealEstateStatus;
  currentWorkId?: string;
  currentPartnerId?: string;
  estimatedValue?: number;
  history?: InventoryMovement[];
  developmentName?: string;
  unitNumber?: string;
  developerName?: string;
  purchaseValue?: number;
  amountPaid?: number;
  keyDeliveryDate?: string;
  documentLink?: string;
}

export enum RentalStatus { ACTIVE = 'Ativo (Em Uso)', RETURNED = 'Devolvido', OVERDUE = 'Atrasado' }

export interface RentalItem {
  id: string;
  workId: string;
  itemName: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  billingPeriod: 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Total';
  startDate: string;
  endDate: string;
  returnDate?: string;
  status: RentalStatus;
  notes?: string;
}