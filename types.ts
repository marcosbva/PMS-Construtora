
export enum UserRole {
  ADMIN = 'ADMIN', // Marcos (Acesso total)
  PARTNER = 'PARTNER', // Pedro (Sócio/Campo)
  MASTER = 'MASTER', // Mestre de Obras
  CLIENT = 'CLIENT', // Cliente (Visualizar própria obra)
  VIEWER = 'VIEWER' // Apenas Visualização Geral
}

export type UserCategory = 'EMPLOYEE' | 'CLIENT' | 'SUPPLIER';

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
  category: UserCategory; // Classification
  role: UserRole; // System Access Role
  profileId: string; // Links to UserProfile
  avatar: string;
  email: string;
  // New Fields
  cpf?: string;
  address?: string;
  phone?: string;
  birthDate?: string;
  notes?: string;
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
  client: string; // Stored as name for display, but ideally linked to User ID
  clientId?: string; // Link to User ID
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

// Enum kept for ID references, but UI will be dynamic
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
  status: string; // Changed from TaskStatus enum to string to support dynamic statuses
  priority: TaskPriority;
  assignedTo?: string; // User ID
  dueDate: string;
  completedDate?: string; // Date when status became DONE
  images: string[];
  aiAnalysis?: string; // Stores Gemini analysis
}

export enum FinanceType {
  EXPENSE = 'Pagar',
  INCOME = 'Receber'
}

// Changed to simple string to allow dynamic creation
export type FinanceCategory = string;

export interface FinanceCategoryDefinition {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
}

export interface FinancialRecord {
  id: string;
  workId: string;
  entityId?: string; // ID of the Supplier or Client associated
  type: FinanceType;
  description: string;
  category: string; // Changed from enum to string
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
  // New fields for detailed reporting
  weather?: 'Sol' | 'Nublado' | 'Chuva' | 'Neve';
  relatedTaskId?: string;
  teamIds?: string[]; // Employees working that day
}

// --- MATERIAL ORDERS ---

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
  taskId?: string; // Optional link to a specific task
  requesterId: string; // User ID who requested
  supplierId?: string; // Preferred or selected supplier
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
  // Quotation Logic
  quotes?: MaterialQuote[];
  selectedQuoteId?: string;
}

// --- CATALOG ---
export interface Material {
  id: string;
  name: string;
  category: string; // e.g., 'Alvenaria', 'Elétrica'
  unit: string; // Default unit
  brand?: string;
  priceEstimate?: number;
  description?: string;
}
