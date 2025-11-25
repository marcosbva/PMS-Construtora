
import React, { useState, useEffect } from 'react';
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder, UserRole, UserCategory, WorkStatus, RolePermissionsMap, DEFAULT_ROLE_PERMISSIONS, FinanceType, TaskStatus, TaskPriority, FinanceCategoryDefinition, InventoryItem, RentalItem } from './types';
import { AuthScreen } from './components/AuthScreen';
import { KanbanBoard } from './components/KanbanBoard';
import { FinanceView } from './components/FinanceView';
import { GlobalTaskList } from './components/GlobalTaskList';
import { MaterialOrders } from './components/MaterialOrders';
import { UserManagement } from './components/UserManagement';
import { DailyLogView } from './components/DailyLog';
import { Dashboard } from './components/Dashboard';
import { WorkOverview } from './components/WorkOverview';
import { BudgetPlanner } from './components/BudgetPlanner';
import { InventoryManager } from './components/InventoryManager';
import { RentalControl } from './components/RentalControl';
import { ClientDashboard } from './components/ClientDashboard';
import { api } from './services/api';
import { DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES, DEFAULT_MATERIALS } from './constants';
import { Loader2, Trash2, LayoutGrid, HardHat, DollarSign, Users, Package, LogOut, Menu, Briefcase, Plus, X, AlertTriangle, Calculator, Wrench, Phone } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [works, setWorks] = useState<ConstructionWork[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finance, setFinance] = useState<FinancialRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rentals, setRentals] = useState<RentalItem[]>([]); // New State for Rentals
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryDefinition[]>(DEFAULT_FINANCE_CATEGORIES);
  const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_PERMISSIONS);
  const [companySettings, setCompanySettings] = useState<{name?: string, logoUrl?: string} | null>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);

  // Modals State
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<ConstructionWork>({
      id: '', name: '', address: '', client: '', status: WorkStatus.PLANNING, 
      progress: 0, budget: 0, startDate: '', endDate: '', imageUrl: '', description: ''
  });
  const [isSavingWork, setIsSavingWork] = useState(false);
  const [isDeletingWork, setIsDeletingWork] = useState(false);

  useEffect(() => {
      if (!api.isOnline()) {
          // Fallback for offline mode
          const loadOfflineData = async () => {
              const [u, w, t, f, l, m, o, cats, inv, r] = await Promise.all([
                  api.getUsers(), api.getWorks(), api.getTasks(), api.getFinance(), 
                  api.getLogs(), api.getMaterials(), api.getOrders(), api.getCategories(), api.getInventory(), api.getRentals()
              ]);
              setUsers(u); setWorks(w); setTasks(t); setFinance(f); setLogs(l); setMaterials(m); setOrders(o); setInventory(inv); setRentals(r);
              if (m.length === 0) setMaterials(DEFAULT_MATERIALS);
              if (cats.length > 0) setFinanceCategories(cats);
              setIsLoading(false);
          };
          loadOfflineData();
          return;
      }

      // Online: Setup Global Listeners
      setIsLoading(true);

      const unsubUsers = api.subscribeToUsers(setUsers);
      const unsubWorks = api.subscribeToWorks(setWorks);
      const unsubTasks = api.subscribeToTasks(setTasks);
      const unsubFinance = api.subscribeToFinance(setFinance);
      const unsubMaterials = api.subscribeToMaterials((mats) => {
          if (mats.length === 0) setMaterials(DEFAULT_MATERIALS);
          else setMaterials(mats);
      });
      const unsubOrders = api.subscribeToOrders(setOrders);
      const unsubCats = api.subscribeToCategories((cats) => {
          if (cats.length === 0) setFinanceCategories(DEFAULT_FINANCE_CATEGORIES);
          else setFinanceCategories(cats);
      });
      const unsubInventory = api.subscribeToInventory(setInventory);
      const unsubRentals = api.subscribeToRentals(setRentals);
      
      // Subscribe to Company Settings
      const unsubSettings = api.subscribeToCompanySettings(setCompanySettings);

      // Fetch global logs for global dashboard
      const unsubAllLogs = api.subscribeToAllLogs(setLogs);

      setTimeout(() => setIsLoading(false), 800);

      return () => {
          unsubUsers(); unsubWorks(); unsubTasks(); unsubFinance(); 
          unsubMaterials(); unsubOrders(); unsubCats(); unsubAllLogs(); unsubInventory(); unsubRentals(); unsubSettings();
      };
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  
  const handleRegister = async (user: User) => {
      await api.createUser(user);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setActiveWorkId(null);
      setCurrentView('DASHBOARD');
  };

  // --- NAVIGATION HANDLER (Auto-close mobile menu) ---
  const navigateTo = (view: string, workId: string | null = null) => {
      setCurrentView(view);
      setActiveWorkId(workId);
      setIsMobileMenuOpen(false); // Close drawer on mobile
  };

  // --- CRUD HANDLERS ---
  const handleCreateWork = () => {
      setEditingWork({
          id: '', name: '', address: '', client: '', status: WorkStatus.PLANNING,
          progress: 0, budget: 0, startDate: '', endDate: '', imageUrl: '', description: ''
      });
      setIsEditWorkModalOpen(true);
  };

  const handleEditWork = (work: ConstructionWork) => {
      setEditingWork(work);
      setIsEditWorkModalOpen(true);
  };

  const saveEditedWork = async () => {
      if (!editingWork.name) return;
      setIsSavingWork(true);
      try {
          if (editingWork.id) {
              await api.updateWork(editingWork);
          } else {
              const newWork = { ...editingWork, id: Math.random().toString(36).substr(2, 9) };
              await api.createWork(newWork);
          }
          setIsEditWorkModalOpen(false);
      } catch (err) {
          console.error(err);
      } finally {
          setIsSavingWork(false);
      }
  };

  const handleDeleteWork = async (id: string) => {
      if (!id) return;
      
      const confirmMessage = "⚠️ ATENÇÃO: Tem certeza que deseja excluir esta obra permanentemente?\n\nEsta ação apagará TODOS os dados relacionados:\n- Tarefas\n- Financeiro\n- Diários de Obra\n- Pedidos de Material\n\nEsta ação NÃO pode ser desfeita.";
      
      if (window.confirm(confirmMessage)) {
          setIsDeletingWork(true);
          try {
              await api.deleteWork(id);
              
              setWorks(prev => prev.filter(w => w.id !== id));
              setTasks(prev => prev.filter(t => t.workId !== id));
              setFinance(prev => prev.filter(f => f.workId !== id));
              setLogs(prev => prev.filter(l => l.workId !== id));
              setOrders(prev => prev.filter(o => o.workId !== id));
              setRentals(prev => prev.filter(r => r.workId !== id));

              setIsEditWorkModalOpen(false);
              
              if (activeWorkId === id) {
                  setActiveWorkId(null);
                  setCurrentView('DASHBOARD'); // Redirect to dashboard on delete
              }
              
              alert("Obra excluída com sucesso!");
          } catch (err: any) {
              console.error("Delete failed:", err);
              alert("Erro ao excluir obra: " + (err.message || "Erro desconhecido"));
          } finally {
              setIsDeletingWork(false);
          }
      }
  };

  // Helper to open a specific work view
  const handleOpenWork = (workId: string) => {
      navigateTo('RESUMO', workId);
  };

  if (!currentUser) {
      return <AuthScreen users={users} onLogin={handleLogin} onRegister={handleRegister} companySettings={companySettings} />;
  }

  // --- CLIENT PORTAL MODE ---
  if (currentUser.category === UserCategory.CLIENT) {
      return (
          <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
              {/* Minimal Client Sidebar */}
              <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 hidden md:flex">
                  <div className="p-6 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-black border border-slate-700">
                              <img 
                                src={companySettings?.logoUrl || "https://i.imgur.com/Qe2e0lQ.jpg"} 
                                alt={companySettings?.name || "PMS Construtora"} 
                                className="w-full h-full object-contain"
                              />
                          </div>
                          <div>
                              <h1 className="font-bold text-lg leading-tight text-pms-400 break-words">
                                  {companySettings?.name?.split(' ')[0] || 'PMS'}
                              </h1>
                              <p className="text-xs text-slate-400 font-medium">Área do Cliente</p>
                          </div>
                      </div>
                  </div>
                  
                  <nav className="flex-1 p-4 space-y-2">
                      <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300 mb-4">
                          Bem-vindo, <strong>{currentUser.name.split(' ')[0]}</strong>.
                      </div>
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold bg-pms-600 text-white shadow-lg shadow-pms-600/30">
                          <LayoutGrid size={18} /> Meu Painel
                      </button>
                  </nav>

                  <div className="p-4 border-t border-slate-800">
                      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-bold">
                          <LogOut size={16} /> Sair
                      </button>
                  </div>
              </aside>

              {/* Client Main Content */}
              <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                  <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30">
                      <div className="flex items-center gap-2">
                          <img src={companySettings?.logoUrl || "https://i.imgur.com/Qe2e0lQ.jpg"} alt="Logo" className="w-8 h-8 rounded border border-slate-700 object-contain bg-black" />
                          <span className="font-bold text-pms-400">Área do Cliente</span>
                      </div>
                      <button onClick={handleLogout}><LogOut size={20}/></button>
                  </header>

                  <div className="flex-1 overflow-auto p-4 md:p-8">
                      <ClientDashboard 
                          currentUser={currentUser}
                          users={users}
                          works={works}
                          finance={finance}
                          logs={logs}
                          orders={orders}
                          materials={materials}
                      />
                  </div>
              </main>
          </div>
      );
  }

  // --- ADMIN / INTERNAL MODE ---
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* RESPONSIVE SIDEBAR */}
      <aside 
        className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl 
            transition-transform duration-300 ease-in-out 
            md:relative md:translate-x-0
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-black border border-slate-700 shrink-0">
                      <img 
                        src={companySettings?.logoUrl || "https://i.imgur.com/Qe2e0lQ.jpg"} 
                        alt={companySettings?.name || "PMS Construtora"} 
                        className="w-full h-full object-contain"
                      />
                  </div>
                  <div>
                      <h1 className="font-bold text-sm leading-tight text-pms-400 break-words max-w-[120px]">
                          {companySettings?.name || "PMS Construtora"}
                      </h1>
                      <p className="text-[10px] text-slate-400 font-medium">Sistema de Gestão</p>
                  </div>
              </div>
              {/* Close Button (Mobile Only) */}
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
                  <X size={24} />
              </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto hide-scrollbar">
              <button onClick={() => navigateTo('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'DASHBOARD' && !activeWorkId ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <LayoutGrid size={18} /> Dashboard
              </button>
              <button onClick={() => navigateTo('WORKS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'WORKS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Briefcase size={18} /> Obras
              </button>
              <button onClick={() => navigateTo('BUDGET')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'BUDGET' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Calculator size={18} /> Orçamentos
              </button>
              <button onClick={() => navigateTo('TASKS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'TASKS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Menu size={18} /> Tarefas Gerais
              </button>
              <button onClick={() => navigateTo('FINANCE')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'FINANCE' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <DollarSign size={18} /> Financeiro Global
              </button>
              <button onClick={() => navigateTo('MATERIALS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'MATERIALS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Package size={18} /> Materiais & Compras
              </button>
              <button onClick={() => navigateTo('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'INVENTORY' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Wrench size={18} /> Estoque & Equip.
              </button>
              <button onClick={() => navigateTo('TEAM')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'TEAM' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Users size={18} /> Equipe & Config
              </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-4 px-2">
                  <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate text-pms-100">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-bold">
                  <LogOut size={16} /> Sair
              </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
          {/* MOBILE HEADER */}
          <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30 shrink-0">
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsMobileMenuOpen(true)} className="text-white p-1 rounded hover:bg-slate-800">
                      <Menu size={24} />
                  </button>
                  <div className="flex items-center gap-2">
                      <span className="font-bold text-pms-400 text-lg">{companySettings?.name || "PMS Construtora"}</span>
                  </div>
              </div>
              <img 
                src={companySettings?.logoUrl || "https://i.imgur.com/Qe2e0lQ.jpg"} 
                alt="Logo" 
                className="w-8 h-8 rounded border border-slate-700 object-contain bg-black" 
              />
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8 w-full">
              {currentView === 'DASHBOARD' && !activeWorkId && (
                  <Dashboard 
                    works={works} 
                    finance={finance} 
                    orders={orders}
                    rentals={rentals}
                    inventory={inventory}
                    onNavigate={(view) => navigateTo(view)}
                  />
              )}

              {currentView === 'WORKS' && !activeWorkId && (
                  <div>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                          <h2 className="text-2xl font-bold text-slate-800">Obras em Andamento</h2>
                          <button onClick={handleCreateWork} className="bg-pms-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pms-500 shadow w-full md:w-auto justify-center">
                              <Plus size={20} /> Nova Obra
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {works.map(work => (
                              <div key={work.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-slate-200 overflow-hidden group cursor-pointer" onClick={() => handleOpenWork(work.id)}>
                                  <div className="h-40 bg-slate-200 relative">
                                      {work.imageUrl && <img src={work.imageUrl} alt={work.name} className="w-full h-full object-cover" />}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                                          <h3 className="text-white font-bold text-lg">{work.name}</h3>
                                          <p className="text-white/80 text-xs">{work.address}</p>
                                      </div>
                                  </div>
                                  <div className="p-4">
                                      <div className="flex justify-between items-center mb-4">
                                          <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">{work.status}</span>
                                          <div className="flex gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); handleDeleteWork(work.id); }} className="text-slate-400 hover:text-red-600 p-1" title="Excluir Obra"><Trash2 size={16}/></button>
                                              <button onClick={(e) => { e.stopPropagation(); handleEditWork(work); }} className="text-slate-400 hover:text-pms-600 p-1" title="Editar Obra"><Briefcase size={16}/></button>
                                          </div>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full mb-2 overflow-hidden">
                                          <div className="bg-pms-600 h-full rounded-full transition-all duration-500" style={{width: `${work.progress}%`}}></div>
                                      </div>
                                      <div className="flex justify-between text-xs text-slate-500">
                                          <span>Progresso: {work.progress}%</span>
                                          <span>R$ {work.budget.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeWorkId && (
                  <div className="h-full flex flex-col">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                          <button 
                            onClick={() => { setActiveWorkId(null); setCurrentView('DASHBOARD'); }} 
                            className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors flex items-center gap-1"
                          >
                            ← Voltar
                          </button>
                          <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex flex-wrap items-center gap-2">
                              {works.find(w => w.id === activeWorkId)?.name} 
                              <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded whitespace-nowrap">Painel de Obra</span>
                          </h2>
                      </div>
                      
                      <div className="flex border-b border-slate-200 mb-4 overflow-x-auto hide-scrollbar">
                          {['RESUMO', 'KANBAN', 'DIARIO', 'FINANCEIRO', 'ORCAMENTO', 'ALUGUEIS'].map(tab => (
                              <button 
                                key={tab}
                                onClick={() => setCurrentView(tab)}
                                className={`px-4 md:px-6 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${currentView === tab ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                              >
                                  {tab === 'RESUMO' ? 'Visão Geral' : 
                                   tab === 'KANBAN' ? 'Tarefas & Kanban' : 
                                   tab === 'DIARIO' ? 'Diário de Obra' : 
                                   tab === 'ORCAMENTO' ? 'Orçamento' :
                                   tab === 'ALUGUEIS' ? 'Aluguéis' :
                                   'Financeiro'}
                              </button>
                          ))}
                      </div>

                      <div className={`flex-1 ${currentView === 'KANBAN' ? 'overflow-hidden' : 'overflow-y-auto custom-scroll'}`}>
                          {currentView === 'RESUMO' && (
                              <WorkOverview 
                                work={works.find(w => w.id === activeWorkId)!}
                                logs={logs.filter(l => l.workId === activeWorkId)}
                                users={users}
                                onUpdateWork={(w) => api.updateWork(w)}
                                onDeleteWork={async (id) => { await handleDeleteWork(id); }}
                              />
                          )}
                          {currentView === 'KANBAN' && (
                              <KanbanBoard 
                                workId={activeWorkId}
                                tasks={tasks.filter(t => t.workId === activeWorkId)}
                                users={users}
                                currentUser={currentUser}
                                taskStatuses={DEFAULT_TASK_STATUSES}
                                onAddTask={(t) => api.createTask(t)}
                                onUpdateTask={(t) => api.updateTask(t)}
                              />
                          )}
                          {currentView === 'DIARIO' && (
                              <DailyLogView 
                                workId={activeWorkId}
                                logs={logs.filter(l => l.workId === activeWorkId)}
                                users={users}
                                tasks={tasks.filter(t => t.workId === activeWorkId)}
                                currentUser={currentUser}
                                onAddLog={(l) => api.createLog(l)}
                                onUpdateLog={(l) => api.updateLog(l)}
                                onDeleteLog={(id) => api.deleteLog(id)}
                              />
                          )}
                          {currentView === 'FINANCEIRO' && (
                              <FinanceView 
                                work={works.find(w => w.id === activeWorkId)}
                                records={finance.filter(f => f.workId === activeWorkId)}
                                users={users}
                                currentUser={currentUser}
                                financeCategories={financeCategories}
                                onAddRecord={(r) => api.createFinance(r)}
                                onUpdateRecord={(r) => api.updateFinance(r)}
                                onDeleteRecord={(id) => api.deleteFinance(id)}
                                onAddCategory={(c) => api.createCategory(c)}
                              />
                          )}
                          {currentView === 'ORCAMENTO' && (
                              <BudgetPlanner 
                                works={works}
                                activeWorkId={activeWorkId}
                              />
                          )}
                          {currentView === 'ALUGUEIS' && (
                              <RentalControl
                                rentals={rentals}
                                workId={activeWorkId}
                                suppliers={users.filter(u => u.category === UserCategory.SUPPLIER)}
                                onAdd={(r) => api.createRental(r)}
                                onUpdate={(r) => api.updateRental(r)}
                                onDelete={(id) => api.deleteRental(id)}
                                onAddFinance={(f) => api.createFinance(f)} // PASSING FINANCE CREATION HANDLER
                              />
                          )}
                      </div>
                  </div>
              )}

              {/* BUDGET PLANNER VIEW (Global) */}
              {currentView === 'BUDGET' && !activeWorkId && (
                  <BudgetPlanner works={works} />
              )}

              {/* INVENTORY VIEW */}
              {currentView === 'INVENTORY' && !activeWorkId && (
                  <InventoryManager 
                    inventory={inventory}
                    works={works}
                    users={users}
                    onAdd={(item) => api.createInventoryItem(item)}
                    onUpdate={(item) => api.updateInventoryItem(item)}
                    onDelete={(id) => api.deleteInventoryItem(id)}
                  />
              )}

              {currentView === 'TASKS' && !activeWorkId && (
                  <GlobalTaskList 
                    tasks={tasks} 
                    works={works} 
                    users={users} 
                    taskStatuses={DEFAULT_TASK_STATUSES}
                    onAddTask={(t) => api.createTask(t)}
                    onUpdateTask={(t) => api.updateTask(t)}
                    onDeleteTask={(id) => api.deleteTask(id)}
                  />
              )}
              {currentView === 'FINANCE' && !activeWorkId && (
                  <FinanceView 
                    records={finance} 
                    users={users} 
                    currentUser={currentUser} 
                    financeCategories={financeCategories}
                    onAddRecord={(r) => api.createFinance(r)}
                    onUpdateRecord={(r) => api.updateFinance(r)}
                    onDeleteRecord={(id) => api.deleteFinance(id)}
                    onAddCategory={(c) => api.createCategory(c)}
                  />
              )}
              {currentView === 'MATERIALS' && !activeWorkId && (
                  <MaterialOrders 
                    orders={orders}
                    works={works}
                    tasks={tasks}
                    users={users}
                    materials={materials}
                    currentUser={currentUser}
                    onAddOrder={(o) => api.createOrder(o)}
                    onUpdateOrder={(o) => api.updateOrder(o)}
                    onOpenMaterialCatalog={() => setCurrentView('TEAM')}
                  />
              )}
              {currentView === 'TEAM' && !activeWorkId && (
                  <UserManagement 
                    currentUser={currentUser}
                    users={users}
                    materials={materials}
                    orders={orders}
                    logs={logs}
                    taskStatuses={DEFAULT_TASK_STATUSES}
                    financeCategories={financeCategories}
                    permissions={permissions}
                    onAddUser={(u) => api.createUser(u)}
                    onUpdateUser={(u) => api.updateUser(u)}
                    onDeleteUser={(id) => api.deleteUser(id)}
                    onAddMaterial={(m) => api.createMaterial(m)}
                    onUpdateMaterial={(m) => api.updateMaterial(m)}
                    onDeleteMaterial={(id) => api.deleteMaterial(id)}
                    onAddCategory={(c) => api.createCategory(c)}
                    onUpdateCategory={(c) => api.updateCategory(c)}
                    onDeleteCategory={(id) => api.deleteCategory(id)}
                    onUpdateStatuses={() => {}}
                    onUpdatePermissions={setPermissions}
                  />
              )}
          </div>
      </main>

      {isEditWorkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <HardHat className="text-pms-600" /> {editingWork.id ? 'Editar Obra' : 'Nova Obra'}
                    </h3>
                    <button onClick={() => setIsEditWorkModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                        <X size={24} />
                    </button>
                </div>
                {/* Form Content Omitted for brevity, logic handled in handler above */}
                <div className="space-y-4 overflow-y-auto max-h-[70vh] px-1">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Obra</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.name}
                            onChange={e => setEditingWork({...editingWork, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.address}
                            onChange={e => setEditingWork({...editingWork, address: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={editingWork.status}
                                onChange={e => setEditingWork({...editingWork, status: e.target.value as WorkStatus})}
                            >
                                <option value={WorkStatus.PLANNING}>Planejamento</option>
                                <option value={WorkStatus.EXECUTION}>Execução</option>
                                <option value={WorkStatus.PAUSED}>Pausada</option>
                                <option value={WorkStatus.COMPLETED}>Concluída</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Progresso (%)</label>
                            <input 
                                type="number" 
                                min="0" max="100"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.progress}
                                onChange={e => setEditingWork({...editingWork, progress: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Orçamento Total (R$)</label>
                            <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.budget}
                                onChange={e => setEditingWork({...editingWork, budget: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Cliente</label>
                             <select 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={editingWork.clientId || ''}
                                onChange={e => {
                                    const c = users.find(u => u.id === e.target.value);
                                    setEditingWork({...editingWork, clientId: e.target.value, client: c ? c.name : ''});
                                }}
                             >
                                 <option value="">Selecione...</option>
                                 {users.filter(u => u.category === UserCategory.CLIENT).map(u => (
                                     <option key={u.id} value={u.id}>{u.name}</option>
                                 ))}
                             </select>
                        </div>
                    </div>
                    
                    <div>
                         <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                             <HardHat size={16} /> Responsável Técnico (Engenheiro)
                         </label>
                         <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                            value={editingWork.responsibleId || ''}
                            onChange={e => setEditingWork({...editingWork, responsibleId: e.target.value})}
                         >
                             <option value="">Selecione o Responsável...</option>
                             {users.filter(u => u.category === UserCategory.INTERNAL).map(u => (
                                 <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                             ))}
                         </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descrição / Observações</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none h-20 resize-none"
                            value={editingWork.description}
                            onChange={e => setEditingWork({...editingWork, description: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 items-center">
                    {editingWork.id && (
                        <button 
                            type="button"
                            onClick={() => handleDeleteWork(editingWork.id)}
                            disabled={isSavingWork || isDeletingWork}
                            className="mr-auto text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isDeletingWork ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            <span className="hidden sm:inline">{isDeletingWork ? 'Excluindo...' : 'Excluir'}</span>
                        </button>
                    )}

                    <button 
                        type="button"
                        onClick={() => setIsEditWorkModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={saveEditedWork}
                        disabled={isSavingWork || isLoading || isDeletingWork}
                        className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg shadow-pms-600/20 flex items-center gap-2 disabled:opacity-70"
                    >
                        {isSavingWork && <Loader2 size={16} className="animate-spin" />}
                        {editingWork.id ? 'Salvar Alterações' : 'Criar Obra'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
