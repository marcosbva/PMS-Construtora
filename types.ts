
export enum UserRole {
  ADMIN = 'ADMIN', // Marcos (Acesso total)
  PARTNER = 'PARTNER', // Pedro (Sócio/Campo)
  MASTER = 'MASTER', // Mestre de Obras
  CLIENT = 'CLIENT', // Cliente (Visualizar própria obra)
  VIEWER = 'VIEWER' // Apenas Visualização Geral
}

export interface AppPermissions {
  viewDashboard: boolean;
  viewWorks: boolean;
  manageWorks: boolean; // Create/Edit works
  viewFinance: boolean; // Global Finance
  manageFinance: boolean; // Add/Edit records
  viewGlobalTasks: boolean;
  viewMaterials: boolean; // NEW: View Material Orders
  manageMaterials: boolean; // NEW: Create/Edit Material Orders
  manageUsers: boolean; // Access User/Profile Management
  isSystemAdmin?: boolean; // Bypass all checks
}

export interface UserProfile {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean; // If true, cannot be deleted
  permissions: AppPermissions;
}

export interface User {
  id: string;
  name: string;
  role: UserRole; // Kept for backward compatibility with components using Enums
  profileId: string; // Links to UserProfile
  avatar: string;
  email: string;
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
  address: string;
  status: WorkStatus;
  progress: number; // 0-100
  budget: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
  description: string;
  teamIds?: string[]; // IDs of users assigned to this work
}

export enum TaskStatus {
  BACKLOG = 'Backlog',
  PLANNING = 'Planejamento',
  EXECUTION = 'Execução (Pedro)',
  WAITING_MARCOS = 'Aguardando Marcos',
  PURCHASE_LOGISTICS = 'Compra & Logística',
  WAITING_MATERIAL = 'Aguardando Material',
  NC = 'Não Conformidade',
  PHOTO_REGISTRY = 'Registro Fotográfico',
  DONE = 'Concluído'
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
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string; // User ID
  dueDate: string;
  images: string[];
  aiAnalysis?: string; // Stores Gemini analysis
}

export enum FinanceType {
  EXPENSE = 'Pagar',
  INCOME = 'Receber'
}

export enum FinanceCategory {
  MATERIAL = 'Material',
  LABOR = 'Mão de Obra',
  FEE = 'Honorário',
  TAX = 'Imposto',
  OTHER = 'Outros'
}

export interface FinancialRecord {
  id: string;
  workId: string;
  type: FinanceType;
  description: string;
  category: FinanceCategory;
  amount: number;
  dueDate: string;
  paidDate?: string; // If present, it's paid
  status: 'Pendente' | 'Pago' | 'Atrasado';
}

export interface DailyLog {
  id: string;
  workId: string;
  authorId: string;
  date: string;
  content: string;
  images: string[];
  type: 'Diário' | 'Vistoria' | 'Alerta';
}

// --- MATERIAL ORDERS ---

export enum OrderStatus {
  PENDING = 'Solicitado',
  QUOTING = 'Em Cotação',
  PURCHASED = 'Comprado',
  DELIVERED = 'Entregue no Local'
}

export interface MaterialOrder {
  id: string;
  workId: string;
  taskId?: string; // Optional link to a specific task
  requesterId: string; // User ID who requested
  itemName: string;
  quantity: number;
  unit: string; // e.g., 'kg', 'saco', 'm', 'un'
  status: OrderStatus;
  priority: TaskPriority;
  requestDate: string;
  purchaseDate?: string;
  deliveryDate?: string;
  estimatedCost?: number; // For quoting
  finalCost?: number; // Actual cost when purchased
  notes?: string;
}
