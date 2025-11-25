
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
import { ProjectStages } from './components/ProjectStages';
import { ClientDashboard } from './components/ClientDashboard';
import { WeeklyPlanning } from './components/WeeklyPlanning';
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
  const [companySettings, setCompanySettings] = useState<{name?: string, logoUrl?: string, phone?: string} | null>(null);

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

              <main className="flex-1 overflow-auto relative w-full">
                  <ClientDashboard 
                    currentUser={currentUser} 
                    users={users}
                    works={works} 
                    finance={finance} 
                    logs={logs}
                    orders={orders}
                    materials={materials}
                    companySettings={companySettings}
                  />
              </main>
          </div>
      );
  }

  // --- ADMIN / INTERNAL MODE ---
  const activeWork = works.find(w => w.id === activeWorkId);
  const canManageWorks = currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.manageWorks;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      )}

      {/* SIDEBAR DRAWER (Mobile & Desktop) */}
      <aside 
        className={`fixed md:relative z-40 w-72 bg-slate-900 text-white flex flex-col shadow-2xl h-full transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-slate-800 relative">
            {/* Close Button (Mobile Only) */}
            <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white md:hidden"
            >
                <X size={24} />
            </button>

            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-black border border-slate-700 shadow-lg">
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
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Sistema de Gestão</p>
                </div>
            </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scroll">
          <div className="mb-6">
              <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Geral</p>
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewDashboard) && (
                  <button onClick={() => navigateTo('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'DASHBOARD' && !activeWorkId ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <LayoutGrid size={18} /> Dashboard
                  </button>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewWorks) && (
                  <div className="space-y-1 mt-1">
                      <div className="px-4 py-2 text-sm font-medium text-slate-300 flex items-center gap-3">
                          <Briefcase size={18} /> Obras
                      </div>
                      <div className="pl-10 space-y-1">
                          {works.map(work => (
                              <button 
                                key={work.id}
                                onClick={() => handleOpenWork(work.id)}
                                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors truncate ${activeWorkId === work.id ? 'bg-slate-800 text-pms-400 font-bold border-l-2 border-pms-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                              >
                                  {work.name}
                              </button>
                          ))}
                          {canManageWorks && (
                              <button 
                                onClick={handleCreateWork}
                                className="w-full text-left px-3 py-2 rounded-md text-xs text-pms-500 hover:text-pms-400 hover:bg-slate-800 font-bold flex items-center gap-2 transition-colors"
                              >
                                  <Plus size={12} /> Nova Obra
                              </button>
                          )}
                      </div>
                  </div>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewGlobalTasks) && (
                  <button onClick={() => navigateTo('TASKS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'TASKS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Briefcase size={18} /> Tarefas Gerais
                  </button>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewFinance) && (
                  <button onClick={() => navigateTo('FINANCE_GLOBAL')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'FINANCE_GLOBAL' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <DollarSign size={18} /> Financeiro Global
                  </button>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewMaterials) && (
                  <button onClick={() => navigateTo('MATERIALS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'MATERIALS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Package size={18} /> Materiais & Compras
                  </button>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.viewMaterials) && (
                  <button onClick={() => navigateTo('INVENTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'INVENTORY' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Wrench size={18} /> Patrimônio
                  </button>
              )}
              {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.manageUsers) && (
                  <button onClick={() => navigateTo('TEAM')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${currentView === 'TEAM' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/20 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Users size={18} /> Equipe & Config
                  </button>
              )}
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-pms-600 rounded-full -mr-10 -mt-10 opacity-20 blur-xl group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center gap-3 relative z-10">
                  <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-600" />
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-950 hover:bg-red-900/30 text-slate-400 hover:text-red-400 py-2 rounded-lg transition-all text-xs font-bold border border-slate-700 hover:border-red-900/50">
                  <LogOut size={14} /> Sair do Sistema
              </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative w-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30 shrink-0">
            <div className="flex items-center gap-2">
                <img 
                    src={companySettings?.logoUrl || "https://i.imgur.com/Qe2e0lQ.jpg"} 
                    alt="Logo" 
                    className="w-8 h-8 rounded bg-white object-contain p-0.5"
                />
                <h1 className="font-bold text-pms-400">
                    {companySettings?.name?.split(' ')[0] || 'PMS'}
                </h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white hover:bg-slate-800 rounded-lg">
                <Menu size={24} />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll w-full">
            {currentView === 'DASHBOARD' && (
                <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                    <Dashboard 
                        works={works} 
                        finance={finance} 
                        orders={orders} 
                        rentals={rentals} 
                        inventory={inventory}
                        onNavigate={navigateTo} 
                    />
                </div>
            )}

            {activeWork && (
                <div className="flex flex-col h-full">
                    {/* Work Header */}
                    <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-10">
                        <div>
                            <button onClick={() => navigateTo('DASHBOARD')} className="text-xs font-bold text-slate-400 hover:text-pms-600 mb-1 flex items-center gap-1 transition-colors">
                                ← Voltar
                            </button>
                            <div className="flex items-baseline gap-3">
                                <h1 className="text-2xl font-bold text-slate-900">{activeWork.name}</h1>
                                <span className="text-sm text-slate-500 font-medium">Painel de Obra</span>
                            </div>
                        </div>
                        
                        {/* Work Navigation Tabs */}
                        <div className="flex gap-1 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
                            {[
                                { id: 'RESUMO', label: 'Visão Geral' },
                                { id: 'KANBAN', label: 'Tarefas & Kanban' },
                                { id: 'LOGS', label: 'Diário de Obra' },
                                { id: 'FINANCE', label: 'Financeiro' },
                                { id: 'BUDGET', label: 'Orçamento' },
                                { id: 'RENTAL', label: 'Aluguéis' },
                                { id: 'STAGES', label: 'Cronograma' },
                                { id: 'PLANNING', label: 'Planejamento Semanal' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setCurrentView(tab.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                        currentView === tab.id 
                                        ? 'bg-slate-800 text-white shadow-md' 
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1600px] mx-auto w-full custom-scroll">
                        {currentView === 'RESUMO' && (
                            <WorkOverview 
                                work={activeWork} 
                                users={users}
                                logs={logs.filter(l => l.workId === activeWork.id)}
                                orders={orders.filter(o => o.workId === activeWork.id)}
                                onUpdateWork={async (w) => {
                                    await api.updateWork(w);
                                    setWorks(prev => prev.map(wk => wk.id === w.id ? w : wk));
                                }}
                                onDeleteWork={handleDeleteWork}
                            />
                        )}
                        
                        {currentView === 'KANBAN' && (
                            <KanbanBoard 
                                tasks={tasks.filter(t => t.workId === activeWork.id)} 
                                users={users}
                                currentUser={currentUser}
                                taskStatuses={DEFAULT_TASK_STATUSES}
                                onUpdateTask={(t) => api.updateTask(t)}
                                onAddTask={(t) => api.createTask(t)}
                                workId={activeWork.id}
                            />
                        )}

                        {currentView === 'LOGS' && (
                            <DailyLogView 
                                logs={logs.filter(l => l.workId === activeWork.id)}
                                users={users}
                                tasks={tasks.filter(t => t.workId === activeWork.id)}
                                workId={activeWork.id}
                                currentUser={currentUser}
                                onAddLog={(l) => api.createLog(l)}
                                onUpdateLog={(l) => api.updateLog(l)}
                                onDeleteLog={(id) => api.deleteLog(id)}
                            />
                        )}

                        {currentView === 'FINANCE' && (
                            <FinanceView 
                                records={finance.filter(f => f.workId === activeWork.id)}
                                currentUser={currentUser}
                                users={users}
                                work={activeWork}
                                financeCategories={financeCategories}
                                onAddRecord={(r) => api.createFinance(r)}
                                onUpdateRecord={(r) => api.updateFinance(r)}
                                onDeleteRecord={(id) => api.deleteFinance(id)}
                                onAddCategory={(c) => api.createCategory(c)}
                            />
                        )}

                        {currentView === 'BUDGET' && (
                            <BudgetPlanner
                                works={[activeWork]}
                                tasks={tasks}
                                activeWorkId={activeWork.id}
                                onAddTask={(t) => api.createTask(t)}
                                onUpdateTask={(t) => api.updateTask(t)}
                            />
                        )}

                        {currentView === 'RENTAL' && (
                            <RentalControl
                                rentals={rentals}
                                suppliers={users.filter(u => u.category === 'SUPPLIER')}
                                workId={activeWork.id}
                                onAdd={(r) => api.createRental(r)}
                                onUpdate={(r) => api.updateRental(r)}
                                onDelete={(id) => api.deleteRental(id)}
                                onAddFinance={(f) => api.createFinance(f)}
                            />
                        )}

                        {currentView === 'STAGES' && (
                            <ProjectStages
                                work={activeWork}
                                onUpdateWork={async (w) => {
                                    await api.updateWork(w);
                                    setWorks(prev => prev.map(wk => wk.id === w.id ? w : wk));
                                }}
                            />
                        )}

                        {currentView === 'PLANNING' && (
                            <WeeklyPlanning 
                                workId={activeWork.id}
                                tasks={tasks}
                                users={users}
                                onAddTask={(t) => api.createTask(t)}
                                onUpdateTask={(t) => api.updateTask(t)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Global Views */}
            {currentView === 'TASKS' && (
                <GlobalTaskList 
                    tasks={tasks} 
                    works={works} 
                    users={users}
                    taskStatuses={DEFAULT_TASK_STATUSES}
                    onUpdateTask={(t) => api.updateTask(t)}
                    onAddTask={(t) => api.createTask(t)}
                    onDeleteTask={(id) => api.deleteTask(id)}
                />
            )}

            {currentView === 'FINANCE_GLOBAL' && (
                <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                    <FinanceView 
                        records={finance}
                        currentUser={currentUser}
                        users={users}
                        financeCategories={financeCategories}
                        onAddRecord={(r) => api.createFinance(r)}
                        onUpdateRecord={(r) => api.updateFinance(r)}
                        onDeleteRecord={(id) => api.deleteFinance(id)}
                    />
                </div>
            )}

            {currentView === 'MATERIALS' && (
                <MaterialOrders 
                    orders={orders} 
                    works={works} 
                    tasks={tasks} 
                    users={users} 
                    materials={materials}
                    currentUser={currentUser}
                    onAddOrder={(o) => api.createOrder(o)}
                    onUpdateOrder={(o) => api.updateOrder(o)}
                    onOpenMaterialCatalog={() => setCurrentView('TEAM')} // Quick link to Catalog management
                />
            )}

            {currentView === 'INVENTORY' && (
                <InventoryManager 
                    inventory={inventory}
                    works={works}
                    users={users}
                    onAdd={(i) => api.createInventoryItem(i)}
                    onUpdate={(i) => api.updateInventoryItem(i)}
                    onDelete={(id) => api.deleteInventoryItem(id)}
                />
            )}

            {currentView === 'TEAM' && (
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
                    onUpdateStatuses={() => {}}
                    onAddMaterial={(m) => api.createMaterial(m)}
                    onUpdateMaterial={(m) => api.updateMaterial(m)}
                    onDeleteMaterial={(id) => api.deleteMaterial(id)}
                    onAddCategory={(c) => api.createCategory(c)}
                    onUpdateCategory={(c) => api.updateCategory(c)}
                    onDeleteCategory={(id) => api.deleteCategory(id)}
                    onUpdatePermissions={(p) => setPermissions(p)} // Local state for now
                />
            )}
        </div>
      </main>

      {/* CREATE WORK MODAL */}
      {isEditWorkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="text-pms-600" />
                    {editingWork.id ? 'Editar Obra' : 'Nova Obra'}
                </h3>
                <button onClick={() => setIsEditWorkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Obra</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                        value={editingWork.name}
                        onChange={(e) => setEditingWork({...editingWork, name: e.target.value})}
                        placeholder="Ex: Residencial Vila Verde"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                        value={editingWork.address}
                        onChange={(e) => setEditingWork({...editingWork, address: e.target.value})}
                        placeholder="Rua, Número, Bairro"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Cliente (Proprietário)</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                        value={editingWork.clientId || ''}
                        onChange={(e) => {
                            const client = users.find(u => u.id === e.target.value);
                            setEditingWork({...editingWork, clientId: e.target.value, client: client ? client.name : ''});
                        }}
                    >
                        <option value="">Selecione um cliente...</option>
                        {users.filter(u => u.category === UserCategory.CLIENT).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Responsável Técnico</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                        value={editingWork.responsibleId || ''}
                        onChange={(e) => setEditingWork({...editingWork, responsibleId: e.target.value})}
                    >
                        <option value="">Selecione o Engenheiro/Mestre...</option>
                        {users.filter(u => u.category === UserCategory.INTERNAL).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Início</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.startDate}
                            onChange={(e) => setEditingWork({...editingWork, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Previsão Fim</label>
                        <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.endDate}
                            onChange={(e) => setEditingWork({...editingWork, endDate: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Status Inicial</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                        value={editingWork.status}
                        onChange={(e) => setEditingWork({...editingWork, status: e.target.value as WorkStatus})}
                    >
                        {Object.values(WorkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-100">
                <button 
                    onClick={() => setIsEditWorkModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                    Cancelar
                </button>
                <button 
                    onClick={saveEditedWork}
                    disabled={isSavingWork || !editingWork.name}
                    className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold shadow-lg hover:bg-pms-500 disabled:opacity-70 flex items-center gap-2"
                >
                    {isSavingWork && <Loader2 size={18} className="animate-spin" />}
                    Salvar Obra
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
