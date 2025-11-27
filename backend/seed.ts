
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manually defining a subset of the rich material list to avoid import issues in pure node script
// In a real monorepo, we would import from a shared package
const SEED_MATERIALS = [
    { id: 'mat_cim_cp2', name: 'Cimento CP II - 50kg', category: 'Estrutura & Alvenaria', unit: 'saco', priceEstimate: 36.90, brand: 'Votoran/Cauê' },
    { id: 'mat_areia_lav', name: 'Areia Média Lavada', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 160.00 },
    { id: 'mat_areia_fina', name: 'Areia Fina (Acabamento)', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 170.00 },
    { id: 'mat_brita_1', name: 'Pedra Brita 1', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 140.00 },
    { id: 'mat_bloco_estr', name: 'Bloco Estrutural Cerâmico 14x19x39', category: 'Estrutura & Alvenaria', unit: 'milheiro', priceEstimate: 2100.00 },
    { id: 'mat_aco_10', name: 'Vergalhão CA-50 10mm (3/8")', category: 'Estrutura & Alvenaria', unit: 'barra', priceEstimate: 58.00 },
    { id: 'mat_concreto_us', name: 'Concreto Usinado FCK 30Mpa', category: 'Estrutura & Alvenaria', unit: 'm³', priceEstimate: 480.00 },
    { id: 'mat_tabua_pinus', name: 'Tábua de Pinus 30cm (Fôrma)', category: 'Madeiras & Carpintaria', unit: 'm', priceEstimate: 12.00 },
    { id: 'mat_manta_asf', name: 'Manta Asfáltica Aluminizada 3mm', category: 'Impermeabilização', unit: 'rolo', priceEstimate: 380.00 },
    { id: 'mat_tubo_sold_25', name: 'Tubo Soldável PVC 25mm (Água Fria)', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 22.00 },
    { id: 'mat_tubo_esgoto_100', name: 'Tubo Esgoto SN 100mm', category: 'Instalações Hidráulicas', unit: 'barra', priceEstimate: 65.00 },
    { id: 'mat_cabo_2_5', name: 'Cabo Flexível 2.5mm (Tomadas)', category: 'Instalações Elétricas', unit: 'rolo', priceEstimate: 260.00 },
    { id: 'mat_disjuntor_20', name: 'Disjuntor DIN Unipolar 20A', category: 'Instalações Elétricas', unit: 'un', priceEstimate: 18.00 },
    { id: 'mat_porc_120', name: 'Porcelanato Polido 120x120 Calacata', category: 'Revestimentos', unit: 'm²', priceEstimate: 280.00 },
    { id: 'mat_arg_ac3', name: 'Argamassa AC-III', category: 'Revestimentos', unit: 'saco', priceEstimate: 45.00 },
    { id: 'mat_tinta_premium', name: 'Tinta Acrílica Premium 18L', category: 'Pintura', unit: 'lata', priceEstimate: 620.00 },
    { id: 'mat_bacia_cx', name: 'Vaso Sanitário c/ Caixa Acoplada', category: 'Louças e Metais', unit: 'un', priceEstimate: 450.00 },
    { id: 'mat_telha_amer', name: 'Telha Cerâmica Americana', category: 'Cobertura & Telhado', unit: 'milheiro', priceEstimate: 1800.00 }
];

async function main() {
  console.log("🌱 Iniciando Seed (Banco de Dados SQLite)...");

  // Limpar banco antes de popular (opcional, para evitar duplicatas em re-runs)
  try {
      await prisma.materialOrder.deleteMany();
      await prisma.dailyLog.deleteMany();
      await prisma.financialRecord.deleteMany();
      await prisma.task.deleteMany();
      await prisma.constructionWork.deleteMany();
      await prisma.user.deleteMany();
      await prisma.userProfile.deleteMany();
      await prisma.taskStatus.deleteMany();
      await prisma.financeCategory.deleteMany();
      await prisma.material.deleteMany();
  } catch (e) {
      console.log("Nota: Tabelas provavelmente vazias ou novas.");
  }

  // 1. Profiles
  const profiles = [
    {
        id: 'p_admin', name: 'Administrador', description: 'Acesso total', isSystem: true,
        permissions: JSON.stringify({ viewDashboard: true, viewWorks: true, manageWorks: true, viewFinance: true, manageFinance: true, viewGlobalTasks: true, viewMaterials: true, manageMaterials: true, manageUsers: true, isSystemAdmin: true })
    },
    {
        id: 'p_partner', name: 'Sócio / Gerente', description: 'Gestão de obras', isSystem: false,
        permissions: JSON.stringify({ viewDashboard: true, viewWorks: true, manageWorks: true, viewFinance: true, manageFinance: true, viewGlobalTasks: true, viewMaterials: true, manageMaterials: true, manageUsers: false, isSystemAdmin: false })
    },
    {
        id: 'p_master', name: 'Mestre de Obras', description: 'Campo', isSystem: false,
        permissions: JSON.stringify({ viewDashboard: true, viewWorks: true, manageWorks: false, viewFinance: false, manageFinance: false, viewGlobalTasks: true, viewMaterials: true, manageMaterials: true, manageUsers: false, isSystemAdmin: false })
    },
    {
        id: 'p_client', name: 'Cliente', description: 'Visualização', isSystem: false,
        permissions: JSON.stringify({ viewDashboard: false, viewWorks: true, manageWorks: false, viewFinance: false, manageFinance: false, viewGlobalTasks: false, viewMaterials: false, manageMaterials: false, manageUsers: false, isSystemAdmin: false })
    },
    {
        id: 'p_supplier', name: 'Fornecedor', description: 'Cadastro', isSystem: false,
        permissions: JSON.stringify({ viewDashboard: false, viewWorks: false, manageWorks: false, viewFinance: false, manageFinance: false, viewGlobalTasks: false, viewMaterials: false, manageMaterials: false, manageUsers: false, isSystemAdmin: false })
    }
  ];

  for (const p of profiles) {
      await prisma.userProfile.create({ data: p });
  }

  // 2. Users
  const users = [
    { id: 'u1', name: 'Marcos (Admin)', category: 'EMPLOYEE', role: 'ADMIN', profileId: 'p_admin', email: 'marcos@pms.com', avatar: 'https://ui-avatars.com/api/?name=Marcos&background=0ea5e9&color=fff', phone: '(11) 99999-0001' },
    { id: 'u2', name: 'Pedro (Sócio)', category: 'EMPLOYEE', role: 'PARTNER', profileId: 'p_partner', email: 'pedro@pms.com', avatar: 'https://ui-avatars.com/api/?name=Pedro&background=random', phone: '(11) 99999-0002' },
    { id: 'u3', name: 'João (Mestre)', category: 'EMPLOYEE', role: 'MASTER', profileId: 'p_master', email: 'joao@pms.com', avatar: 'https://ui-avatars.com/api/?name=Joao&background=random' },
    { id: 'u4', name: 'Dr. Roberto', category: 'CLIENT', role: 'CLIENT', profileId: 'p_client', email: 'roberto@cli.com', avatar: 'https://ui-avatars.com/api/?name=Roberto&background=random', address: 'Rua das Flores, 100', phone: '(11) 98888-7777' },
    { id: 'u6', name: 'Casa do Cimento', category: 'SUPPLIER', role: 'VIEWER', profileId: 'p_supplier', email: 'vendas@cc.com', avatar: 'https://ui-avatars.com/api/?name=Casa&background=random', address: 'Rodovia BR 101, km 50' },
    { id: 'u7', name: 'Elétrica & Cia', category: 'SUPPLIER', role: 'VIEWER', profileId: 'p_supplier', email: 'contato@eletrica.com', avatar: 'https://ui-avatars.com/api/?name=Eletrica&background=random' }
  ];

  for (const u of users) {
      await prisma.user.create({ data: u });
  }

  // 3. Task Statuses
  const statuses = [
      { id: 'Backlog', label: 'Backlog', colorScheme: 'gray', order: 0 },
      { id: 'Planejamento', label: 'Planejamento', colorScheme: 'blue', order: 1 },
      { id: 'Execução', label: 'Execução', colorScheme: 'orange', order: 2 },
      { id: 'Aguardando Material', label: 'Aguard. Material', colorScheme: 'yellow', order: 3 },
      { id: 'Não Conformidade', label: 'Não Conformidade', colorScheme: 'red', order: 4 },
      { id: 'Concluído', label: 'Concluído', colorScheme: 'green', order: 5 }
  ];
  for (const s of statuses) {
      await prisma.taskStatus.create({ data: s });
  }

  // 4. Works
  const works = [
      { 
          id: 'w1', name: 'Residencial Vila Verde', clientId: 'u4', address: 'Rua das Palmeiras, 120', status: 'Execução', 
          progress: 65, budget: 450000, startDate: '2023-11-01', imageUrl: 'https://picsum.photos/id/122/800/400', 
          description: 'Reforma completa de residência unifamiliar de alto padrão.', teamIds: JSON.stringify(['u1', 'u2', 'u3', 'u4']), client: 'Dr. Roberto'
      },
      {
          id: 'w2', name: 'Escritório Centro', clientId: 'u4', address: 'Av. Central, 500', status: 'Planejamento',
          progress: 15, budget: 120000, startDate: '2024-05-10', imageUrl: 'https://picsum.photos/id/195/800/400',
          description: 'Adequação comercial.', teamIds: JSON.stringify(['u1', 'u2']), client: 'Dr. Roberto'
      }
  ];
  for (const w of works) {
      await prisma.constructionWork.create({ data: w });
  }

  // 5. Tasks
  const tasks = [
      { id: 't1', workId: 'w1', title: 'Compra de Revestimentos', description: 'Comprar porcelanato.', status: 'Execução', priority: 'Alta', assignedTo: 'u1', dueDate: '2024-05-25', images: '[]' },
      { id: 't2', workId: 'w1', title: 'Instalação Elétrica', description: 'Fiação quartos.', status: 'Planejamento', priority: 'Média', assignedTo: 'u2', dueDate: '2024-05-28', images: '[]' }
  ];
  for (const t of tasks) {
      await prisma.task.create({ data: t });
  }

  // 6. Categories
  const cats = [
      { id: 'cat_mat', name: 'Material', type: 'EXPENSE' },
      { id: 'cat_labor', name: 'Mão de Obra', type: 'EXPENSE' },
      { id: 'cat_fee', name: 'Honorário', type: 'INCOME' },
      { id: 'cat_tax', name: 'Imposto', type: 'EXPENSE' },
      { id: 'cat_proj', name: 'Projetos', type: 'BOTH' }
  ];
  for (const c of cats) {
      await prisma.financeCategory.create({ data: c });
  }

  // 7. Finance
  const finance = [
      { id: 'f1', workId: 'w1', entityId: 'u6', type: 'EXPENSE', category: 'Material', description: 'Cimento e Areia', amount: 2500.00, dueDate: '2024-05-15', status: 'Pago', paidDate: '2024-05-14' },
      { id: 'f2', workId: 'w1', entityId: 'u2', type: 'EXPENSE', category: 'Mão de Obra', description: 'Pagamento Equipe', amount: 8000.00, dueDate: '2024-05-30', status: 'Pendente' }
  ];
  for (const f of finance) {
      await prisma.financialRecord.create({ data: f });
  }

  // 8. Materials (Rich Seed)
  console.log(`Inserindo ${SEED_MATERIALS.length} materiais base...`);
  for (const m of SEED_MATERIALS) {
      await prisma.material.create({ data: m });
  }

  console.log("✅ Seed completo! Banco de dados SQLite pronto para uso.");
}

main()
  .catch((e) => { console.error(e); (process as any).exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
