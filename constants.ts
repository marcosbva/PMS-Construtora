

import { ConstructionWork, User, UserRole, WorkStatus, Task, TaskStatus, TaskPriority, FinancialRecord, FinanceType, FinanceCategory, DailyLog, UserProfile, MaterialOrder, OrderStatus, TaskStatusDefinition, Material } from './types';

// Helper to get a date string relative to today
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// --- STATUS DEFINITIONS ---
export const DEFAULT_TASK_STATUSES: TaskStatusDefinition[] = [
  { id: TaskStatus.BACKLOG, label: 'Backlog', colorScheme: 'gray', order: 0 },
  { id: TaskStatus.PLANNING, label: 'Planejamento', colorScheme: 'blue', order: 1 },
  { id: TaskStatus.EXECUTION, label: 'Execução (Pedro)', colorScheme: 'orange', order: 2 },
  { id: TaskStatus.WAITING_MATERIAL, label: 'Aguard. Material', colorScheme: 'yellow', order: 3 },
  { id: TaskStatus.NC, label: 'Não Conformidade', colorScheme: 'red', order: 4 },
  { id: TaskStatus.DONE, label: 'Concluído', colorScheme: 'green', order: 5 },
];

// --- PROFILES ---
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

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Marcos (Admin)',
    category: 'EMPLOYEE',
    role: UserRole.ADMIN,
    profileId: 'p_admin',
    avatar: 'https://picsum.photos/id/1005/100/100',
    email: 'marcos@pms.com',
    phone: '(11) 99999-0001'
  },
  {
    id: 'u2',
    name: 'Pedro (Sócio/Campo)',
    category: 'EMPLOYEE',
    role: UserRole.PARTNER,
    profileId: 'p_partner',
    avatar: 'https://picsum.photos/id/1012/100/100',
    email: 'pedro@pms.com',
    phone: '(11) 99999-0002'
  },
  {
    id: 'u3',
    name: 'João (Mestre)',
    category: 'EMPLOYEE',
    role: UserRole.MASTER,
    profileId: 'p_master',
    avatar: 'https://picsum.photos/id/1025/100/100',
    email: 'joao@pms.com'
  },
  {
    id: 'u4',
    name: 'Dr. Roberto',
    category: 'CLIENT',
    role: UserRole.CLIENT,
    profileId: 'p_client',
    avatar: 'https://picsum.photos/id/1006/100/100',
    email: 'roberto@cliente.com',
    cpf: '123.456.789-00',
    address: 'Rua das Flores, 100, Jardim Paulista',
    phone: '(11) 98888-7777'
  },
  {
    id: 'u5',
    name: 'TecnoSoluções Ltda',
    category: 'CLIENT',
    role: UserRole.CLIENT,
    profileId: 'p_client',
    avatar: 'https://ui-avatars.com/api/?name=Tecno+Solucoes&background=random',
    email: 'contato@tecnosolucoes.com.br',
    cpf: '00.000.000/0001-99', // CNPJ technically
    address: 'Av. Central, 500'
  },
  {
    id: 'u6',
    name: 'Casa do Cimento',
    category: 'SUPPLIER',
    role: UserRole.VIEWER,
    profileId: 'p_supplier',
    avatar: 'https://ui-avatars.com/api/?name=Casa+Cimento&background=random',
    email: 'vendas@casadocimento.com',
    phone: '(11) 3333-4444',
    address: 'Rodovia BR 101, km 50'
  },
  {
    id: 'u7',
    name: 'ConstruMax Atacado',
    category: 'SUPPLIER',
    role: UserRole.VIEWER,
    profileId: 'p_supplier',
    avatar: 'https://ui-avatars.com/api/?name=Constru+Max&background=random',
    email: 'vendas@construmax.com',
    phone: '(11) 3333-5555',
    address: 'Av. Industrial, 200'
  },
  {
    id: 'u8',
    name: 'Elétrica & Cia',
    category: 'SUPPLIER',
    role: UserRole.VIEWER,
    profileId: 'p_supplier',
    avatar: 'https://ui-avatars.com/api/?name=Eletrica+Cia&background=random',
    email: 'vendas@eletricaecia.com',
    phone: '(11) 3333-6666',
    address: 'Rua da Luz, 300'
  }
];

export const MOCK_WORKS: ConstructionWork[] = [
  {
    id: 'w1',
    name: 'Residencial Vila Verde',
    client: 'Dr. Roberto',
    clientId: 'u4',
    address: 'Rua das Palmeiras, 120',
    status: WorkStatus.EXECUTION,
    progress: 65,
    budget: 450000,
    startDate: '2023-11-01',
    endDate: '2024-06-30',
    imageUrl: 'https://picsum.photos/id/122/800/400',
    description: 'Reforma completa de residência unifamiliar de alto padrão.',
    teamIds: ['u1', 'u2', 'u3', 'u4']
  },
  {
    id: 'w2',
    name: 'Escritório Centro',
    client: 'TecnoSoluções Ltda',
    clientId: 'u5',
    address: 'Av. Central, 500 - Sala 402',
    status: WorkStatus.PLANNING,
    progress: 15,
    budget: 120000,
    startDate: '2024-05-10',
    endDate: '2024-08-15',
    imageUrl: 'https://picsum.photos/id/195/800/400',
    description: 'Adequação comercial e instalações elétricas.',
    teamIds: ['u1', 'u2']
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    workId: 'w1',
    title: 'Compra de Revestimentos',
    description: 'Comprar porcelanato 90x90 para a sala principal. Verificar estoque na loja parceira.',
    status: TaskStatus.PURCHASE_LOGISTICS,
    priority: TaskPriority.HIGH,
    assignedTo: 'u1',
    dueDate: '2024-05-25',
    images: []
  },
  {
    id: 't2',
    workId: 'w1',
    title: 'Instalação Elétrica Quarto 1',
    description: 'Passar fiação e instalar tomadas conforme projeto luminotécnico.',
    status: TaskStatus.EXECUTION,
    priority: TaskPriority.MEDIUM,
    assignedTo: 'u2',
    dueDate: '2024-05-28',
    images: []
  },
  {
    id: 't3',
    workId: 'w1',
    title: 'Infiltração Parede Sul',
    description: 'Detectada umidade na parede externa. Necessário verificar calha.',
    status: TaskStatus.NC,
    priority: TaskPriority.HIGH,
    assignedTo: 'u2',
    dueDate: '2024-05-24',
    images: ['https://picsum.photos/id/20/200/200']
  }
];

export const MOCK_FINANCE: FinancialRecord[] = [
  {
    id: 'f1',
    workId: 'w1',
    entityId: 'u6', // Casa do Cimento
    type: FinanceType.EXPENSE,
    category: FinanceCategory.MATERIAL,
    description: 'Cimento e Areia (Lote 1)',
    amount: 2500.00,
    dueDate: '2024-05-15',
    status: 'Pago',
    paidDate: '2024-05-14'
  },
  {
    id: 'f2',
    workId: 'w1',
    entityId: 'u2', // Pedro
    type: FinanceType.EXPENSE,
    category: FinanceCategory.LABOR,
    description: 'Pagamento Quinzenal Equipe',
    amount: 8000.00,
    dueDate: '2024-05-30',
    status: 'Pendente'
  },
  {
    id: 'f3',
    workId: 'w2',
    entityId: 'u5', // TecnoSoluções
    type: FinanceType.INCOME,
    category: FinanceCategory.OTHER,
    description: 'Entrada Projeto',
    amount: 40000.00,
    dueDate: '2024-05-10',
    status: 'Pago',
    paidDate: '2024-05-10'
  },
  // Alert Trigger Record
  {
    id: 'f_alert_1',
    workId: 'w1',
    entityId: 'u8', // Elétrica & Cia
    type: FinanceType.EXPENSE,
    category: FinanceCategory.MATERIAL,
    description: 'Aço CA-50 10mm (Alerta)',
    amount: 1250.00,
    dueDate: getFutureDate(2), // Dynamically set to 2 days from now
    status: 'Pendente'
  }
];

export const MOCK_LOGS: DailyLog[] = [
  {
    id: 'l1',
    workId: 'w1',
    authorId: 'u2',
    date: '2024-05-20',
    type: 'Diário',
    content: 'Dia de sol. Equipe de alvenaria finalizou o fechamento da área gourmet. Eletricista iniciou a passagem de guias.',
    images: ['https://picsum.photos/id/40/200/200']
  }
];

export const MOCK_ORDERS: MaterialOrder[] = [
  {
    id: 'mo1',
    workId: 'w1',
    taskId: 't1',
    requesterId: 'u3',
    itemName: 'Cimento CP II',
    quantity: 50,
    unit: 'sacos',
    status: OrderStatus.PENDING,
    priority: TaskPriority.HIGH,
    requestDate: '2024-05-21',
    quotes: []
  },
  {
    id: 'mo2',
    workId: 'w1',
    taskId: 't1',
    requesterId: 'u3',
    itemName: 'Areia Média',
    quantity: 6,
    unit: 'm³',
    status: OrderStatus.QUOTING,
    priority: TaskPriority.MEDIUM,
    requestDate: '2024-05-20',
    quotes: [
        { id: 'q1', supplierId: 'u6', price: 720.00 },
    ]
  },
  {
    id: 'mo3',
    workId: 'w1',
    requesterId: 'u2',
    itemName: 'Tijolo 8 furos',
    quantity: 2000,
    unit: 'un',
    status: OrderStatus.PURCHASED,
    priority: TaskPriority.HIGH,
    requestDate: '2024-05-15',
    purchaseDate: '2024-05-18',
    finalCost: 1800.00,
    supplierId: 'u7',
    quotes: []
  },
  {
    id: 'mo4',
    workId: 'w1',
    requesterId: 'u2',
    itemName: 'Ferro 10mm',
    quantity: 20,
    unit: 'barras',
    status: OrderStatus.DELIVERED,
    priority: TaskPriority.HIGH,
    requestDate: '2024-05-10',
    purchaseDate: '2024-05-12',
    deliveryDate: '2024-05-14',
    finalCost: 1100.00,
    supplierId: 'u6',
    quotes: []
  }
];

export const MOCK_MATERIALS: Material[] = [
  {
    id: 'm1',
    name: 'Cimento CP II - 50kg',
    category: 'Alvenaria',
    unit: 'saco',
    brand: 'Votoran',
    priceEstimate: 32.50,
    description: 'Cimento Portland composto, uso geral em reboco, contrapiso e concreto magro.'
  },
  {
    id: 'm2',
    name: 'Areia Média Lavada',
    category: 'Alvenaria',
    unit: 'm³',
    priceEstimate: 120.00,
    description: 'Areia média para assentamento de blocos e chapisco.'
  },
  {
    id: 'm3',
    name: 'Tijolo Cerâmico 8 Furos',
    category: 'Alvenaria',
    unit: 'milheiro',
    brand: 'Olaria Regional',
    priceEstimate: 900.00,
    description: 'Bloco cerâmico de vedação 9x19x19.'
  },
  {
    id: 'm4',
    name: 'Cabo Flexível 2.5mm',
    category: 'Elétrica',
    unit: 'rolo 100m',
    brand: 'Sil',
    priceEstimate: 210.00,
    description: 'Fio elétrico anti-chama para circuitos de tomadas comuns.'
  },
  {
    id: 'm5',
    name: 'Tinta Acrílica Fosca Branco Neve',
    category: 'Pintura',
    unit: 'lata 18L',
    brand: 'Suvinil',
    priceEstimate: 450.00,
    description: 'Tinta de acabamento fosco para paredes internas.'
  }
];