
import React, { useState, useEffect, useMemo } from 'react';
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder, UserRole, UserCategory, WorkStatus, RolePermissionsMap, DEFAULT_ROLE_PERMISSIONS, InventoryItem, RentalItem, FinanceCategoryDefinition, FinanceType } from './types';
import { AuthScreen } from './components/AuthScreen';
import { FinanceView } from './components/FinanceView';
import { GlobalTaskList } from './components/GlobalTaskList';
import { MaterialOrders } from './components/MaterialOrders';
import { UserManagement } from './components/UserManagement';
import { DailyLogView } from './components/DailyLog';
import { Dashboard } from './components/Dashboard';
import { WorkOverview } from './components/WorkOverview';
import { PlanningCenter } from './components/PlanningCenter'; // NEW
import { WeeklyPlanning } from './components/WeeklyPlanning';
import { InventoryManager } from './components/InventoryManager';
import { RentalControl } from './components/RentalControl';
import { ClientDashboard } from './components/ClientDashboard';
import { api } from './services/api';
import { DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES, DEFAULT_MATERIALS } from './constants';
import { LayoutGrid, DollarSign, Users, Package, LogOut, Menu, Briefcase, Plus, X, Wrench, Archive, ChevronRight, HardHat, Settings, FolderOpen, CalendarCheck, ChevronDown, Circle, Siren, AlertTriangle, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryDefinition[]>(DEFAULT_FINANCE_CATEGORIES);
  const [companySettings, setCompanySettings] = useState<{name?: string, logoUrl?: string, phone?: string} | null>(null);

  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [activeWorkId, setActiveWorkId] = useState<string | null>(null);
  
  // UI State
  const [isWorksExpanded, setIsWorksExpanded] = useState(true); // Default open for easy access
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<ConstructionWork>({
      id: '', name: '', address: '', client: '', status: WorkStatus.PLANNING, 
      progress: 0, budget: 0, startDate: '', endDate: '', imageUrl: '', description: ''
  });

  useEffect(() => {
      // (Load data logic identical to original file, omitted for brevity but preserved in real build)
      const unsubUsers = api.subscribeToUsers(setUsers);
      const unsubWorks = api.subscribeToWorks(setWorks);
      const unsubTasks = api.subscribeToTasks(setTasks);
      const unsubFinance = api.subscribeToFinance(setFinance);
      const unsubMaterials = api.subscribeToMaterials(setMaterials);
      const unsubOrders = api.subscribeToOrders(setOrders);
      const unsubLogs = api.subscribeToAllLogs(setLogs);
      const unsubInv = api.subscribeToInventory(setInventory);
      const unsubRent = api.subscribeToRentals(setRentals);
      const unsubSet = api.subscribeToCompanySettings(setCompanySettings);
      setIsLoading(false);
      return () => { unsubUsers(); unsubWorks(); unsubTasks(); unsubFinance(); unsubMaterials(); unsubOrders(); unsubLogs(); unsubInv(); unsubRent(); unsubSet(); };
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  const handleLogout = () => { setCurrentUser(null); setActiveWorkId(null); setCurrentView('DASHBOARD'); };
  
  const navigateTo = (view: string, workId: string | null = null) => {
      setCurrentView(view);
      setActiveWorkId(workId);
      setIsMobileMenuOpen(false);
  };

  // --- DERIVED DATA FOR MENU ---
  const activeWorks = useMemo(() => works.filter(w => w.status !== WorkStatus.COMPLETED && w.status !== WorkStatus.PAUSED), [works]);
  const inactiveWorks = useMemo(() => works.filter(w => w.status === WorkStatus.COMPLETED || w.status === WorkStatus.PAUSED), [works]);

  if (!currentUser) return <AuthScreen users={users} onLogin={handleLogin} onRegister={async (u) => api.createUser(u)} companySettings={companySettings} />;

  if (currentUser.category === UserCategory.CLIENT) {
      return (
          <ClientDashboard 
            currentUser={currentUser} 
            users={users} works={works} finance={finance} logs={logs} orders={orders} materials={materials} companySettings={companySettings}
          />
      );
  }

  const activeWork = works.find(w => w.id === activeWorkId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* --- SIDEBAR --- */}
      <aside className={`fixed md:relative z-50 w-72 bg-slate-900 text-white flex flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          
          {/* 1. Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/30">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-pms-500/20">
                  <img src={companySettings?.logoUrl || ''} className="w-8 h-8 object-contain"/>
              </div>
              <div>
                  <h1 className="font-bold text-pms-400 text-sm leading-tight">{companySettings?.name || 'PMS Construtora'}</h1>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Painel Gestor</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden ml-auto text-slate-400"><X/></button>
          </div>

          {/* 2. Scrollable Nav */}
          <nav className="flex-1 overflow-y-auto custom-scroll py-6 px-3 space-y-8">
              
              {/* SECTION: GESTÃO */}
              <div>
                  <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visão Geral</p>
                  <div className="space-y-1">
                      <SidebarItem 
                          icon={<LayoutGrid size={18}/>} 
                          label="Dashboard" 
                          isActive={currentView === 'DASHBOARD'} 
                          onClick={() => navigateTo('DASHBOARD')} 
                      />
                      <SidebarItem 
                          icon={<DollarSign size={18}/>} 
                          label="Financeiro Global" 
                          isActive={currentView === 'GLOBAL_FINANCE'} 
                          onClick={() => navigateTo('GLOBAL_FINANCE')} 
                      />
                      <SidebarItem 
                          icon={<Wrench size={18}/>} 
                          label="Estoque & Patrimônio" 
                          isActive={currentView === 'INVENTORY'} 
                          onClick={() => navigateTo('INVENTORY')} 
                      />
                  </div>
              </div>

              {/* SECTION: OBRAS (ACCORDION STYLE) */}
              <div>
                  <div className="flex justify-between items-center px-3 mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projetos</p>
                      <button onClick={() => setIsEditWorkModalOpen(true)} className="text-pms-500 hover:text-pms-400"><Plus size={14}/></button>
                  </div>
                  
                  <div className="space-y-1">
                      {/* Active Works Accordion Header */}
                      <button 
                          onClick={() => setIsWorksExpanded(!isWorksExpanded)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                      >
                          <div className="flex items-center gap-3">
                              <HardHat size={18} className="text-pms-500"/>
                              <span>Obras em Andamento</span>
                          </div>
                          {isWorksExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                      </button>

                      {/* Active Works List (Expandable) */}
                      {isWorksExpanded && (
                          <div className="pl-9 pr-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                              {activeWorks.length > 0 ? activeWorks.map(w => (
                                  <button 
                                      key={w.id} 
                                      onClick={() => navigateTo('RESUMO', w.id)} 
                                      className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center gap-2 transition-colors ${
                                          activeWorkId === w.id 
                                          ? 'bg-slate-800 text-white border-l-2 border-pms-500' 
                                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent'
                                      }`}
                                  >
                                      <Circle size={6} className={activeWorkId === w.id ? 'fill-pms-500 text-pms-500' : 'text-slate-600'} />
                                      <span className="truncate">{w.name}</span>
                                  </button>
                              )) : (
                                  <div className="text-xs text-slate-500 py-2 italic pl-2">Nenhuma obra ativa.</div>
                              )}
                              
                              <button 
                                  onClick={() => setIsEditWorkModalOpen(true)}
                                  className="w-full text-left px-3 py-2 text-xs text-pms-500 hover:text-pms-400 font-bold flex items-center gap-2 mt-1"
                              >
                                  <Plus size={12}/> Criar Nova Obra
                              </button>
                          </div>
                      )}

                      {/* INACTIVE WORKS LINK */}
                      <SidebarItem 
                          icon={<Archive size={18}/>} 
                          label="Histórico / Concluídas" 
                          isActive={currentView === 'WORKS_ARCHIVE'} 
                          onClick={() => navigateTo('WORKS_ARCHIVE')} 
                      />
                  </div>
              </div>

              {/* SECTION: ADMIN */}
              <div>
                  <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Administração</p>
                  <div className="space-y-1">
                      <SidebarItem 
                          icon={<Users size={18}/>} 
                          label="Equipe & Config" 
                          isActive={currentView === 'TEAM'} 
                          onClick={() => navigateTo('TEAM')} 
                      />
                  </div>
              </div>

          </nav>

          {/* 3. Footer / User Profile */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/30">
              <div className="flex items-center gap-3">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-slate-600"/>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Sair">
                      <LogOut size={18} />
                  </button>
              </div>
          </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative w-full">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-40">
            <h1 className="font-bold text-pms-400">{companySettings?.name || 'PMS'}</h1>
            <button onClick={() => setIsMobileMenuOpen(true)}><Menu size={24}/></button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll w-full">
            {currentView === 'DASHBOARD' && <div className="p-8"><Dashboard works={works} finance={finance} inventory={inventory} rentals={rentals} onNavigate={(view) => navigateTo(view)}/></div>}
            
            {/* GLOBAL FINANCE (DEFAULT) */}
            {currentView === 'GLOBAL_FINANCE' && <div className="p-8"><FinanceView records={finance} currentUser={currentUser} users={users} onAddRecord={api.createFinance} onUpdateRecord={api.updateFinance} onDeleteRecord={api.deleteFinance} financeCategories={financeCategories}/></div>}
            
            {/* FINANCE - DEEP LINKS FROM DASHBOARD */}
            {currentView === 'FINANCE_PAYABLES' && (
                <div className="p-8">
                    <FinanceView 
                        records={finance} 
                        currentUser={currentUser} users={users} 
                        onAddRecord={api.createFinance} onUpdateRecord={api.updateFinance} onDeleteRecord={api.deleteFinance} 
                        financeCategories={financeCategories}
                        initialType={FinanceType.EXPENSE}
                        initialStatus="Pendente"
                    />
                </div>
            )}
            {currentView === 'FINANCE_RECEIVABLES' && (
                <div className="p-8">
                    <FinanceView 
                        records={finance} 
                        currentUser={currentUser} users={users} 
                        onAddRecord={api.createFinance} onUpdateRecord={api.updateFinance} onDeleteRecord={api.deleteFinance} 
                        financeCategories={financeCategories}
                        initialType={FinanceType.INCOME}
                        initialStatus="Pendente"
                    />
                </div>
            )}

            {currentView === 'INVENTORY' && <div className="p-8"><InventoryManager inventory={inventory} works={works} users={users} onAdd={api.createInventoryItem} onUpdate={api.updateInventoryItem} onDelete={api.deleteInventoryItem} /></div>}
            {currentView === 'TEAM' && <div className="p-8"><UserManagement currentUser={currentUser} users={users} materials={materials} orders={orders} taskStatuses={DEFAULT_TASK_STATUSES} financeCategories={financeCategories} permissions={DEFAULT_ROLE_PERMISSIONS} onAddUser={api.createUser} onUpdateUser={api.updateUser} onDeleteUser={api.deleteUser} onUpdateStatuses={()=>{}} onAddMaterial={api.createMaterial} onUpdateMaterial={api.updateMaterial} onDeleteMaterial={api.deleteMaterial} onAddCategory={api.createCategory} onUpdateCategory={api.updateCategory} onDeleteCategory={api.deleteCategory} onUpdatePermissions={()=>{}} /></div>}

            {/* --- NEW VIEW: WORKS ACTIVE (GRID) --- */}
            {currentView === 'WORKS_ACTIVE' && (
                <div className="p-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <HardHat className="text-pms-600" /> Obras em Andamento
                            </h2>
                            <p className="text-slate-500">Visão geral dos projetos ativos.</p>
                        </div>
                        <button onClick={() => setIsEditWorkModalOpen(true)} className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all font-bold text-sm">
                            <Plus size={18} /> Nova Obra
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeWorks.map(w => (
                            <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all hover:-translate-y-1">
                                <div className="h-48 bg-slate-200 relative cursor-pointer" onClick={() => navigateTo('RESUMO', w.id)}>
                                    <img src={w.imageUrl || 'https://via.placeholder.com/400x200'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm ${
                                            w.status === WorkStatus.EXECUTION ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {w.status}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-200">
                                        <div className="h-full bg-pms-500" style={{width: `${w.progress}%`}}></div>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-slate-800 mb-1 cursor-pointer hover:text-pms-600" onClick={() => navigateTo('RESUMO', w.id)}>{w.name}</h3>
                                    <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><CalendarCheck size={12}/> Início: {w.startDate ? new Date(w.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Orçamento</span>
                                            <span className="font-bold text-slate-700">R$ {w.budget.toLocaleString('pt-BR', {compactDisplay:'short', notation:'compact'})}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Progresso</span>
                                            <span className="font-bold text-pms-600">{w.progress}%</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigateTo('RESUMO', w.id)}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Acessar Painel <ArrowRight size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeWorks.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                                <HardHat size={48} className="mx-auto mb-3 opacity-20" />
                                <p>Nenhuma obra ativa no momento. Inicie um novo projeto!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- NEW VIEW: GLOBAL ISSUES --- */}
            {currentView === 'GLOBAL_ISSUES' && (
                <div className="p-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Siren className="text-red-600" /> Central de Intercorrências
                            </h2>
                            <p className="text-slate-500">Monitoramento global de problemas e alertas em aberto.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {logs.filter(l => l.type === 'Intercorrência' && !l.isResolved).length > 0 ? (
                            logs.filter(l => l.type === 'Intercorrência' && !l.isResolved).map(log => {
                                const work = works.find(w => w.id === log.workId);
                                const author = users.find(u => u.id === log.authorId);
                                return (
                                    <div key={log.id} className="bg-white p-5 rounded-xl border-l-4 border-l-red-500 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                    log.severity === 'Crítica' ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 
                                                    log.severity === 'Alta' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                }`}>
                                                    {log.severity || 'Média'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <Calendar size={12}/> {new Date(log.date).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {work?.name || 'Obra Desconhecida'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-lg">{log.issueCategory || 'Intercorrência Geral'}</h3>
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{log.content}</p>
                                            {author && <p className="text-xs text-slate-400 mt-2">Reportado por: {author.name}</p>}
                                        </div>
                                        
                                        <div className="flex items-center gap-3 md:border-l md:pl-4 md:border-slate-100">
                                            <button 
                                                onClick={() => {
                                                    // Navigate to specific work LOGS tab
                                                    setCurrentView('LOGS');
                                                    setActiveWorkId(log.workId);
                                                }}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                                            >
                                                Ver na Obra <ArrowRight size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center bg-green-50 rounded-xl border border-green-200 text-green-800">
                                <ShieldCheck size={48} className="mx-auto mb-3 opacity-30" />
                                <h3 className="text-xl font-bold">Tudo Certo!</h3>
                                <p>Nenhuma intercorrência pendente no momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- EXISTING VIEWS --- */}
            {currentView === 'WORKS_ARCHIVE' && (
                <div className="p-8 animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Archive className="text-slate-500" /> Histórico de Obras
                            </h2>
                            <p className="text-slate-500">Projetos concluídos, pausados ou arquivados.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inactiveWorks.map(w => (
                            <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                <div className="h-40 bg-slate-200 relative">
                                    <img src={w.imageUrl || 'https://via.placeholder.com/400x200'} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm ${
                                            w.status === WorkStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {w.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-slate-800 mb-1">{w.name}</h3>
                                    <p className="text-xs text-slate-500 mb-4">{w.address}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="block text-xs text-slate-400 font-bold uppercase">Orçamento</span>
                                            <span className="font-medium text-slate-700">R$ {w.budget.toLocaleString('pt-BR', {compactDisplay:'short', notation:'compact'})}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-400 font-bold uppercase">Conclusão</span>
                                            <span className="font-medium text-slate-700">{w.endDate ? new Date(w.endDate).toLocaleDateString('pt-BR') : '-'}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => navigateTo('RESUMO', w.id)}
                                        className="w-full py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-pms-600 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FolderOpen size={16}/> Acessar Dados
                                    </button>
                                </div>
                            </div>
                        ))}
                        {inactiveWorks.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                                <Archive size={48} className="mx-auto mb-3 opacity-20" />
                                <p>Nenhuma obra arquivada no momento.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeWork && (
                <div className="flex flex-col h-full">
                    {/* Work Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10 sticky top-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigateTo('DASHBOARD')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-pms-600 transition-colors">
                                <LayoutGrid size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    {activeWork.name}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${activeWork.status === 'Execução' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                        {activeWork.status}
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarCheck size={10}/> Início: {activeWork.startDate ? new Date(activeWork.startDate).toLocaleDateString() : 'N/D'}</p>
                            </div>
                        </div>
                        {/* REFACTORED TABS */}
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                            {[
                                { id: 'RESUMO', label: 'Visão Geral' },
                                { id: 'PLANNING_CENTER', label: 'Planejamento' },
                                { id: 'WEEKLY', label: 'Execução' },
                                { id: 'FINANCE', label: 'Financeiro' },
                                { id: 'MATERIALS', label: 'Compras' },
                                { id: 'LOGS', label: 'Diário' },
                                { id: 'RENTAL', label: 'Aluguéis' },
                            ].map(tab => (
                                <button 
                                    key={tab.id} 
                                    onClick={() => setCurrentView(tab.id)} 
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${currentView === tab.id ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto">
                        {currentView === 'RESUMO' && (
                            <WorkOverview work={activeWork} users={users} logs={logs} orders={orders} tasks={tasks} onUpdateWork={api.updateWork} onDeleteWork={api.deleteWork} />
                        )}
                        {currentView === 'PLANNING_CENTER' && (
                            <PlanningCenter work={activeWork} tasks={tasks} onUpdateWork={api.updateWork} />
                        )}
                        {currentView === 'WEEKLY' && (
                            <WeeklyPlanning workId={activeWork.id} tasks={tasks} users={users} onAddTask={api.createTask} onUpdateTask={api.updateTask} onDeleteTask={api.deleteTask} />
                        )}
                        {currentView === 'FINANCE' && (
                            <FinanceView records={finance.filter(f => f.workId === activeWork.id)} work={activeWork} currentUser={currentUser} users={users} onAddRecord={api.createFinance} onUpdateRecord={api.updateFinance} onDeleteRecord={api.deleteFinance} />
                        )}
                        {currentView === 'MATERIALS' && (
                            <MaterialOrders orders={orders} works={works} tasks={tasks} users={users} materials={materials} currentUser={currentUser} onAddOrder={api.createOrder} onUpdateOrder={api.updateOrder} onOpenMaterialCatalog={() => navigateTo('TEAM')} />
                        )}
                        {currentView === 'LOGS' && (
                            <DailyLogView logs={logs.filter(l => l.workId === activeWork.id)} users={users} tasks={tasks} workId={activeWork.id} currentUser={currentUser} onAddLog={api.createLog} onUpdateLog={api.updateLog} onDeleteLog={api.deleteLog} onUpdateTask={api.updateTask} />
                        )}
                        {currentView === 'RENTAL' && (
                            <RentalControl rentals={rentals} suppliers={users} workId={activeWork.id} onAdd={api.createRental} onUpdate={api.updateRental} onDelete={api.deleteRental} onAddFinance={api.createFinance} />
                        )}
                    </div>
                </div>
            )}
        </div>
      </main>
      
      {/* Create Work Modal */}
      {isEditWorkModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-96 shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-bold mb-4 text-slate-800">Nova Obra</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Projeto</label>
                          <input className="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-pms-500" placeholder="Ex: Residencial Flores" value={editingWork.name} onChange={e => setEditingWork({...editingWork, name: e.target.value})} autoFocus />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setIsEditWorkModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                      <button onClick={async () => {
                          if(!editingWork.name) return;
                          await api.createWork({...editingWork, id: Math.random().toString(36).substr(2,9)});
                          setEditingWork({...editingWork, name: ''});
                          setIsEditWorkModalOpen(false);
                      }} className="px-4 py-2 bg-pms-600 text-white font-bold rounded-lg hover:bg-pms-500 shadow-md">Criar Obra</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

// Helper Component for simple sidebar items
const SidebarItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive 
            ? 'bg-pms-600 text-white shadow-md shadow-pms-900/20' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
    >
        <span className={isActive ? 'text-white' : 'text-slate-400'}>{icon}</span>
        {label}
    </button>
);

export default App;
