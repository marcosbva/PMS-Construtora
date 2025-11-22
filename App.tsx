
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { User, UserRole, UserCategory, ConstructionWork, Task, FinancialRecord, FinanceType, DailyLog, WorkStatus, AppPermissions, MaterialOrder, TaskStatusDefinition, Material, FinanceCategoryDefinition, ROLE_PERMISSIONS } from './types';
import { MOCK_USERS } from './constants'; 
import { LayoutDashboard, HardHat, Wallet, Settings, LogOut, Menu, X, Briefcase, Hammer, ChevronRight, ChevronDown, Landmark, Bell, Users, ListTodo, CheckCircle2, History, PauseCircle, ClipboardList, Truck, Contact, Shield, User as UserIcon, Loader2, Edit, Plus, Package, ExternalLink, ArrowLeft, Archive, Cloud, CloudOff, RefreshCw, Database } from 'lucide-react';
import { api } from './services/api';
import { AuthScreen } from './components/AuthScreen';

// --- LAZY LOADING COMPONENTS FOR PERFORMANCE ---
const KanbanBoard = React.lazy(() => import('./components/KanbanBoard').then(module => ({ default: module.KanbanBoard })));
const FinanceView = React.lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const DailyLogView = React.lazy(() => import('./components/DailyLog').then(module => ({ default: module.DailyLogView })));
const UserManagement = React.lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));
const GlobalTaskList = React.lazy(() => import('./components/GlobalTaskList').then(module => ({ default: module.GlobalTaskList })));
const MaterialOrders = React.lazy(() => import('./components/MaterialOrders').then(module => ({ default: module.MaterialOrders })));

// Loading Fallback Component
const LoadingSpinner = () => (
    <div className="flex h-full items-center justify-center p-10">
        <Loader2 className="animate-spin text-pms-600" size={32} />
        <span className="ml-2 text-slate-500 font-medium">Carregando módulo...</span>
    </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Global State
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined); 
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WORKS' | 'HISTORY' | 'FINANCE' | 'REGISTRATIONS' | 'ALL_TASKS' | 'MATERIALS'>('DASHBOARD');
  const [registrationSubTab, setRegistrationSubTab] = useState<'INTERNAL' | 'CLIENTS' | 'SUPPLIERS' | 'MATERIALS' | 'SETTINGS' | 'FINANCE_CATEGORIES'>('INTERNAL');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  // Data State (Fetched from API)
  const [works, setWorks] = useState<ConstructionWork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finance, setFinance] = useState<FinancialRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryDefinition[]>([]);

  // Work Detail Tab State
  const [workTab, setWorkTab] = useState<'OVERVIEW' | 'KANBAN' | 'FINANCE' | 'LOGS'>('OVERVIEW');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Edit Work State
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<ConstructionWork | null>(null);

  // Centralized Data Fetching
  const fetchData = async () => {
      setIsSyncing(true);
      const online = api.isOnline();
      setIsOnlineMode(online);
      
      if (online) {
          await api.checkAndSeedInitialData();
      }

      const data = await api.getAllData();
      
      setWorks(data.works);
      setUsers(data.users);
      setTasks(data.tasks);
      setFinance(data.finance);
      setLogs(data.logs);
      setMaterials(data.materials);
      setOrders(data.orders);
      setTaskStatuses(data.taskStatuses);
      setFinanceCategories(data.financeCategories);
      
      setIsSyncing(false);
      setIsLoading(false);
  };

  useEffect(() => {
    const initSystem = async () => {
        setIsInitializing(true);
        await fetchData();
        setIsInitializing(false);
    };
    initSystem();
  }, []);

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      fetchData();
  };

  const handleRegister = async (user: User) => {
      await api.createUser(user);
      await fetchData();
      if (user.status === 'ACTIVE') {
          setCurrentUser(user);
          setIsAuthenticated(true);
      }
  };

  const handleLogout = () => {
    setSelectedWorkId(null);
    setActiveTab('DASHBOARD');
    setIsAuthenticated(false);
  };

  // --- PERMISSION LOGIC (Refactored) ---
  
  // Helper to determine if user is just a Client category (Identity)
  const isClientIdentity = currentUser?.category === UserCategory.CLIENT;

  // Core permission checker based on ROLE
  const hasPermission = (permissionKey: keyof AppPermissions): boolean => {
      if (!currentUser) return false;

      // Regra Hardcoded: Categoria CLIENTE nunca tem permissões de gestão,
      // mesmo que por erro o Role seja ADMIN.
      if (currentUser.category === UserCategory.CLIENT) {
         if (permissionKey.startsWith('manage') || permissionKey === 'isSystemAdmin') {
             return false;
         }
      }

      // Look up permissions in static map based on Role
      const permissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS[UserRole.VIEWER];
      
      if (permissions.isSystemAdmin) return true;
      return !!permissions[permissionKey];
  };

  // --- DATA SCOPING (Isolation) ---

  const visibleWorks = useMemo(() => {
      return works.filter(w => {
          if (!currentUser) return false;
          // If Client Identity, strictly show only assigned works
          if (isClientIdentity) {
              return w.clientId === currentUser.id;
          }
          return true; // Internal/Suppliers see all (permissions control editing)
      });
  }, [works, currentUser, isClientIdentity]);

  const visibleTasks = useMemo(() => {
      if (isClientIdentity) {
          return tasks.filter(t => visibleWorks.some(w => w.id === t.workId));
      }
      return tasks;
  }, [tasks, visibleWorks, isClientIdentity]);

  const visibleFinance = useMemo(() => {
      if (isClientIdentity) {
           return finance.filter(f => visibleWorks.some(w => w.id === f.workId));
      }
      return finance;
  }, [finance, visibleWorks, isClientIdentity]);

  const visibleLogs = useMemo(() => {
      if (isClientIdentity) {
          return logs.filter(l => visibleWorks.some(w => w.id === l.workId));
      }
      return logs;
  }, [logs, visibleWorks, isClientIdentity]);

  const visibleOrders = useMemo(() => {
      if (isClientIdentity) {
          return orders.filter(o => visibleWorks.some(w => w.id === o.workId));
      }
      return orders;
  }, [orders, visibleWorks, isClientIdentity]);

  const selectedWork = visibleWorks.find(w => w.id === selectedWorkId);
  
  const activeTasks = visibleTasks.filter(t => t.workId === selectedWorkId);
  const activeFinance = visibleFinance.filter(f => f.workId === selectedWorkId);
  const activeLogs = visibleLogs.filter(l => l.workId === selectedWorkId);

  // --- FINANCIAL ALERTS ---
  const financialAlerts = visibleFinance.filter(record => {
    if (!hasPermission('viewFinance')) return false;
    if (record.status !== 'Pendente') return false;
    if (!record.dueDate) return false;
    const isVisibleWork = visibleWorks.some(w => w.id === record.workId);
    if (!isVisibleWork) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
        const [y, m, d] = record.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
    } catch (e) { return false; }
  }).sort((a,b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  // --- Handlers ---

  const handleUpdateWork = async (updatedWork: ConstructionWork) => {
      if (!hasPermission('manageWorks')) return;
      await api.updateWork(updatedWork);
      setWorks(prev => prev.map(w => w.id === updatedWork.id ? updatedWork : w));
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await api.updateTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleAddTask = async (newTask: Task) => {
    await api.createTask(newTask);
    setTasks(prev => [...prev, newTask]);
  };

  const handleAddLog = async (newLog: DailyLog) => {
    await api.createLog(newLog);
    setLogs(prev => [newLog, ...prev]);
  };

  const handleAddFinanceRecord = async (record: FinancialRecord) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    await api.createFinance(record);
    setFinance(prev => [...prev, record]);
  };

  const handleUpdateFinanceRecord = async (updatedRecord: FinancialRecord) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    await api.updateFinance(updatedRecord);
    setFinance(prev => prev.map(f => f.id === updatedRecord.id ? updatedRecord : f));
  };

  const handleDeleteFinanceRecord = async (recordId: string) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    if(window.confirm("Tem certeza que deseja excluir este lançamento?")) {
        await api.deleteFinance(recordId);
        setFinance(prev => prev.filter(f => f.id !== recordId));
    }
  };

  const handleAddCategory = async (newCat: FinanceCategoryDefinition) => {
    await api.createCategory(newCat);
    setFinanceCategories(prev => [...prev, newCat]);
  };

  const handleUpdateCategory = async (updatedCat: FinanceCategoryDefinition) => {
    await api.updateCategory(updatedCat);
    setFinanceCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      await api.deleteCategory(id);
      setFinanceCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleAddUser = async (newUser: User) => {
    await api.createUser(newUser);
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await api.updateUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleUpdateStatuses = async (newStatuses: TaskStatusDefinition[]) => {
    await api.updateStatuses(newStatuses); 
    setTaskStatuses(newStatuses);
  };

  const handleAddMaterial = async (newMaterial: Material) => {
      await api.createMaterial(newMaterial);
      setMaterials(prev => [...prev, newMaterial]);
  };
  
  const handleUpdateMaterial = async (updatedMaterial: Material) => {
      await api.updateMaterial(updatedMaterial);
      setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
  };

  const handleDeleteMaterial = async (materialId: string) => {
      if (window.confirm('Tem certeza que deseja excluir este material do catálogo?')) {
          await api.deleteMaterial(materialId);
          setMaterials(prev => prev.filter(m => m.id !== materialId));
      }
  };

  const handleAddOrder = async (newOrder: MaterialOrder) => {
    if (!hasPermission('manageMaterials')) { alert("Sem permissão."); return; }
    await api.createOrder(newOrder);
    setOrders(prev => [...prev, newOrder]);
  };

  const handleUpdateOrder = async (updatedOrder: MaterialOrder) => {
    if (!hasPermission('manageMaterials')) { alert("Sem permissão."); return; }
    await api.updateOrder(updatedOrder);
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const openEditWorkModal = () => {
      if (selectedWork && hasPermission('manageWorks')) {
          setEditingWork({ ...selectedWork, teamIds: selectedWork.teamIds || [] });
          setIsEditWorkModalOpen(true);
      }
  };

  const handleOpenCreateWorkModal = () => {
    if (!hasPermission('manageWorks')) { alert("Sem permissão."); return; }
    if (!currentUser) return;
    setEditingWork({
        id: '',
        name: '',
        client: '',
        clientId: '',
        address: '',
        status: WorkStatus.PLANNING,
        progress: 0,
        budget: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        imageUrl: `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/800/400`,
        description: '',
        teamIds: [currentUser.id]
    });
    setIsEditWorkModalOpen(true);
  };

  const saveEditedWork = async () => {
      if (editingWork && editingWork.name) {
          if (editingWork.id) {
              await handleUpdateWork(editingWork);
          } else {
              const newWork: ConstructionWork = {
                  ...editingWork,
                  id: Math.random().toString(36).substr(2, 9)
              };
              await api.createWork(newWork);
              setWorks(prev => [...prev, newWork]);
          }
          setIsEditWorkModalOpen(false);
          setEditingWork(null);
      }
  };

  const toggleTeamMember = (userId: string) => {
      if (!editingWork) return;
      const currentTeam = editingWork.teamIds || [];
      if (currentTeam.includes(userId)) {
          setEditingWork({ ...editingWork, teamIds: currentTeam.filter(id => id !== userId) });
      } else {
          setEditingWork({ ...editingWork, teamIds: [...currentTeam, userId] });
      }
  };

  const navigateToWorkBoard = (workId: string) => {
      setSelectedWorkId(workId);
      setActiveTab('WORKS');
      setWorkTab('KANBAN');
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    const activeWorksList = visibleWorks.filter(w => w.status !== WorkStatus.COMPLETED);
    
    const workStats = {
        execution: visibleWorks.filter(w => w.status === WorkStatus.EXECUTION).length,
        planning: visibleWorks.filter(w => w.status === WorkStatus.PLANNING).length,
        paused: visibleWorks.filter(w => w.status === WorkStatus.PAUSED).length,
        completed: visibleWorks.filter(w => w.status === WorkStatus.COMPLETED).length,
    };

    return (
      <div className="p-6 space-y-6 animate-fade-in pb-20">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
                Bem-vindo, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuário'}
            </h1>
            <div className="flex items-center gap-2 text-slate-500">
               <p>Visão geral das operações da PMS Construtora.</p>
               {isOnlineMode && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded border border-green-200 font-bold flex items-center gap-1"><Cloud size={10}/> Online</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Em Execução</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{workStats.execution}</div>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
                    <Hammer size={20} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Planejamento</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{workStats.planning}</div>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                    <ClipboardList size={20} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Pausadas</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{workStats.paused}</div>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:scale-110 transition-transform">
                    <PauseCircle size={20} />
                </div>
            </div>

             <div 
                onClick={() => setActiveTab('HISTORY')}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
             >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
                <div>
                    <span className="text-xs font-bold text-slate-500 uppercase group-hover:text-pms-600 transition-colors">Concluídas</span>
                    <div className="text-2xl font-bold text-slate-800 mt-1">{workStats.completed}</div>
                </div>
                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:scale-110 transition-transform group-hover:bg-pms-50 group-hover:text-pms-600">
                    <CheckCircle2 size={20} />
                </div>
            </div>
        </div>

        {financialAlerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
             <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0 mt-1 animate-pulse">
                <Bell size={20} />
             </div>
             <div className="flex-1">
                <h3 className="font-bold text-orange-800 mb-2">Atenção: Vencimentos Próximos (48h)</h3>
                <div className="space-y-2">
                   {financialAlerts.map(alert => {
                       const isIncome = alert.type === FinanceType.INCOME;
                       const workName = works.find(w => w.id === alert.workId)?.name || 'Obra Desconhecida';
                       const dateLabel = alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('pt-BR') : 'Data Inválida';

                       return (
                        <div key={alert.id} className="bg-white/80 p-3 rounded-lg border border-orange-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                           <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {isIncome ? 'Receber' : 'Pagar'}
                                </span>
                                <span className="text-xs text-slate-500">{workName}</span>
                              </div>
                              <p className="font-semibold text-slate-800 text-sm mt-1">{alert.description}</p>
                           </div>
                           <div className="flex items-center gap-3">
                               <span className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {alert.amount.toLocaleString('pt-BR')}
                               </span>
                               <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                                  {dateLabel}
                               </span>
                           </div>
                        </div>
                       )
                   })}
                </div>
             </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HardHat className="text-pms-600" size={20} /> Obras em Andamento
            </h3>
            {hasPermission('manageWorks') && (
                <button 
                    onClick={handleOpenCreateWorkModal}
                    className="text-sm bg-pms-600 hover:bg-pms-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                    <Plus size={16} /> Nova Obra
                </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeWorksList.map(work => (
              <div 
                key={work.id} 
                onClick={() => navigateToWorkBoard(work.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                <div className="h-32 bg-slate-200 relative overflow-hidden">
                  <img src={work.imageUrl} alt={work.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      work.status === WorkStatus.EXECUTION ? 'bg-green-500 text-white' :
                      work.status === WorkStatus.PLANNING ? 'bg-blue-500 text-white' :
                      'bg-orange-500 text-white'
                    }`}>
                      {work.status}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <h3 className="text-white font-bold text-lg truncate">{work.name}</h3>
                      <p className="text-white/80 text-xs flex items-center gap-1"><Contact size={12}/> {work.client}</p>
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                      <p className="text-slate-500 text-xs mb-3 line-clamp-2 h-8">{work.address}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>Progresso</span>
                          <span>{work.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-pms-500 h-2 rounded-full transition-all duration-1000" 
                            style={{ width: `${work.progress}%` }}
                          ></div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- BOOTSTRAP SCREEN ---
  if (isInitializing) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
              <div className="flex flex-col items-center animate-pulse">
                  <Database size={48} className="mb-4 text-pms-400" />
                  <h2 className="text-xl font-bold">Inicializando Sistema...</h2>
                  <p className="text-slate-400 text-sm mt-2">Verificando integridade do banco de dados.</p>
              </div>
          </div>
      )
  }

  if (!isAuthenticated || !currentUser) {
      return isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
              <Loader2 className="text-pms-500 animate-spin" size={48} />
          </div>
      ) : (
          <AuthScreen 
            users={users} 
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="bg-pms-600 p-2 rounded-lg">
            <HardHat size={24} />
          </div>
          <div>
             <h1 className="font-bold text-lg leading-tight">PMS</h1>
             <p className="text-[10px] text-slate-400 uppercase tracking-wider">Construtora</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4 overflow-y-auto custom-scroll">
            <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-2">Geral</div>
            <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'DASHBOARD'} onClick={() => { setActiveTab('DASHBOARD'); setSelectedWorkId(null); }} />
            
            {hasPermission('viewGlobalTasks') && (
                <SidebarItem icon={<ListTodo size={20} />} label="Tarefas Globais" active={activeTab === 'ALL_TASKS'} onClick={() => { setActiveTab('ALL_TASKS'); setSelectedWorkId(null); }} />
            )}
            {hasPermission('viewWorks') && (
                <SidebarItem icon={<Briefcase size={20} />} label="Histórico de Obras" active={activeTab === 'HISTORY'} onClick={() => { setActiveTab('HISTORY'); setSelectedWorkId(null); }} />
            )}

            {(hasPermission('manageUsers') || hasPermission('manageFinance') || hasPermission('viewMaterials')) && (
                <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-6">Gestão</div>
            )}
            
            {hasPermission('manageUsers') && (
                <SidebarItem icon={<Users size={20} />} label="Cadastros & Equipe" active={activeTab === 'REGISTRATIONS'} onClick={() => { setActiveTab('REGISTRATIONS'); setRegistrationSubTab('INTERNAL'); setSelectedWorkId(null); }} />
            )}
            
            {hasPermission('viewMaterials') && (
                <SidebarItem icon={<Package size={20} />} label="Materiais & Compras" active={activeTab === 'MATERIALS'} onClick={() => { setActiveTab('MATERIALS'); setSelectedWorkId(null); }} />
            )}
            
            {hasPermission('viewFinance') && (
                <SidebarItem icon={<Landmark size={20} />} label="Financeiro Global" active={activeTab === 'FINANCE'} onClick={() => { setActiveTab('FINANCE'); setSelectedWorkId(null); }} />
            )}
            
            {hasPermission('manageUsers') && (
                <SidebarItem icon={<Settings size={20} />} label="Configurações" active={activeTab === 'REGISTRATIONS' && registrationSubTab === 'SETTINGS'} onClick={() => { setActiveTab('REGISTRATIONS'); setRegistrationSubTab('SETTINGS'); setSelectedWorkId(null); }} />
            )}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4">
               <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="Profile" />
               <div className="overflow-hidden">
                   <p className="text-sm font-bold text-white truncate">{currentUser.name || 'Usuário'}</p>
                   <div className="flex gap-1 text-xs">
                        <span className="bg-slate-800 text-slate-300 px-1 rounded">{currentUser.category}</span>
                        <span className="bg-pms-900 text-pms-300 px-1 rounded">{currentUser.role}</span>
                   </div>
               </div>
           </div>
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full px-2 py-1 rounded hover:bg-slate-800 transition-colors"
           >
             <LogOut size={16} /> Sair
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white h-16 flex items-center justify-between px-4 z-50 shadow-md">
          <div className="flex items-center gap-2">
              <div className="bg-pms-600 p-1.5 rounded-lg">
                <HardHat size={20} />
              </div>
              <span className="font-bold">PMS Construtora</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900 z-40 pt-20 px-6 pb-6 md:hidden flex flex-col animate-in slide-in-from-top-10">
              <nav className="space-y-4 flex-1">
                  <SidebarItem icon={<LayoutDashboard size={24} />} label="Dashboard" active={activeTab === 'DASHBOARD'} onClick={() => { setActiveTab('DASHBOARD'); setSelectedWorkId(null); setMobileMenuOpen(false); }} />
                  
                  {hasPermission('viewWorks') && (
                      <SidebarItem icon={<Briefcase size={24} />} label="Obras" active={activeTab === 'WORKS' || activeTab === 'HISTORY'} onClick={() => { setActiveTab('DASHBOARD'); setSelectedWorkId(null); setMobileMenuOpen(false); }} />
                  )}
                  
                  {hasPermission('viewGlobalTasks') && (
                      <SidebarItem icon={<ListTodo size={24} />} label="Tarefas" active={activeTab === 'ALL_TASKS'} onClick={() => { setActiveTab('ALL_TASKS'); setMobileMenuOpen(false); }} />
                  )}
                  
                  {hasPermission('manageUsers') && (
                      <SidebarItem icon={<Users size={24} />} label="Equipe" active={activeTab === 'REGISTRATIONS'} onClick={() => { setActiveTab('REGISTRATIONS'); setMobileMenuOpen(false); }} />
                  )}
                  
                  {hasPermission('viewMaterials') && (
                      <SidebarItem icon={<Package size={24} />} label="Materiais" active={activeTab === 'MATERIALS'} onClick={() => { setActiveTab('MATERIALS'); setMobileMenuOpen(false); }} />
                  )}
                  
                  {hasPermission('viewFinance') && (
                      <SidebarItem icon={<Landmark size={24} />} label="Financeiro" active={activeTab === 'FINANCE'} onClick={() => { setActiveTab('FINANCE'); setMobileMenuOpen(false); }} />
                  )}
              </nav>
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 font-bold mt-auto py-4 border-t border-slate-800">
                  <LogOut size={20} /> Sair do Sistema
              </button>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative md:pt-0 pt-16">
        
        {/* Breadcrumb / Top Bar (Desktop) */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
               <span className="font-bold text-slate-800">PMS</span>
               <ChevronRight size={14} />
               <span>
                   {activeTab === 'DASHBOARD' && 'Visão Geral'}
                   {activeTab === 'WORKS' && selectedWork ? `Obra: ${selectedWork.name}` : 'Obras'}
                   {activeTab === 'REGISTRATIONS' && 'Cadastros'}
                   {activeTab === 'FINANCE' && 'Financeiro Global'}
                   {activeTab === 'ALL_TASKS' && 'Tarefas Gerais'}
                   {activeTab === 'MATERIALS' && 'Materiais & Compras'}
                   {activeTab === 'HISTORY' && 'Histórico de Obras'}
               </span>
            </div>
            <div className="flex items-center gap-4">
                {/* SYNC BUTTON */}
                <button 
                   onClick={() => fetchData()}
                   disabled={isSyncing}
                   className="flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
                   title="Forçar sincronização com a nuvem"
                >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> 
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>

                {isOnlineMode ? (
                    <div title="Conectado à Nuvem" className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <Cloud size={14} /> Online
                    </div>
                ) : (
                    <div title="Modo Offline (Local)" className="text-slate-400 bg-slate-100 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                        <CloudOff size={14} /> Offline
                    </div>
                )}
                <div className="relative cursor-pointer group">
                    <Bell size={20} className="text-slate-400 hover:text-slate-600" />
                    {financialAlerts.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
            <Suspense fallback={<LoadingSpinner />}>
                {activeTab === 'DASHBOARD' && renderDashboard()}
                
                {activeTab === 'HISTORY' && (
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Histórico de Obras Concluídas</h2>
                        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border border-slate-200 border-dashed">
                            <Archive size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Obras concluídas serão arquivadas aqui.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'ALL_TASKS' && (
                    <GlobalTaskList 
                        tasks={visibleTasks} 
                        works={visibleWorks} 
                        users={users} 
                        taskStatuses={taskStatuses}
                        onUpdateTask={handleUpdateTask}
                        onAddTask={handleAddTask}
                    />
                )}

                {activeTab === 'FINANCE' && (
                    <div className="p-6">
                        <FinanceView 
                            records={visibleFinance}
                            currentUser={currentUser} 
                            users={users} 
                            financeCategories={financeCategories}
                            onAddRecord={handleAddFinanceRecord}
                            onUpdateRecord={handleUpdateFinanceRecord}
                            onDeleteRecord={handleDeleteFinanceRecord}
                            onAddCategory={handleAddCategory}
                        />
                    </div>
                )}

                {activeTab === 'REGISTRATIONS' && (
                    <UserManagement 
                        currentUser={currentUser}
                        users={users}
                        materials={materials}
                        taskStatuses={taskStatuses}
                        financeCategories={financeCategories}
                        initialTab={registrationSubTab}
                        onAddUser={handleAddUser}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                        onUpdateStatuses={handleUpdateStatuses}
                        onAddMaterial={handleAddMaterial}
                        onUpdateMaterial={handleUpdateMaterial}
                        onDeleteMaterial={handleDeleteMaterial}
                        onAddCategory={handleAddCategory}
                        onUpdateCategory={handleUpdateCategory}
                        onDeleteCategory={handleDeleteCategory}
                    />
                )}

                {activeTab === 'MATERIALS' && (
                    <MaterialOrders 
                        orders={visibleOrders} 
                        works={visibleWorks} 
                        tasks={visibleTasks}
                        users={users}
                        materials={materials}
                        currentUser={currentUser}
                        onAddOrder={handleAddOrder}
                        onUpdateOrder={handleUpdateOrder}
                        onOpenMaterialCatalog={() => {
                            setActiveTab('REGISTRATIONS');
                            setRegistrationSubTab('MATERIALS');
                        }}
                    />
                )}

                {activeTab === 'WORKS' && selectedWork && (
                    <div className="h-full flex flex-col">
                        {/* Work Header */}
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
                            <div>
                                <button onClick={() => setActiveTab('DASHBOARD')} className="text-slate-400 hover:text-pms-600 text-xs font-bold flex items-center gap-1 mb-1">
                                    <ArrowLeft size={12}/> Voltar
                                </button>
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    {selectedWork.name}
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                        selectedWork.status === 'Execução' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                        {selectedWork.status}
                                    </span>
                                </h2>
                            </div>

                            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                                <WorkTabButton active={workTab === 'OVERVIEW'} onClick={() => setWorkTab('OVERVIEW')} label="Visão Geral" icon={<LayoutDashboard size={16}/>} />
                                {hasPermission('viewGlobalTasks') && <WorkTabButton active={workTab === 'KANBAN'} onClick={() => setWorkTab('KANBAN')} label="Tarefas (Kanban)" icon={<ListTodo size={16}/>} />}
                                {hasPermission('viewFinance') && <WorkTabButton active={workTab === 'FINANCE'} onClick={() => setWorkTab('FINANCE')} label="Financeiro" icon={<Landmark size={16}/>} />}
                                <WorkTabButton active={workTab === 'LOGS'} onClick={() => setWorkTab('LOGS')} label="Diário de Obra" icon={<ClipboardList size={16}/>} />
                            </div>
                            
                            {hasPermission('manageWorks') && (
                                <button 
                                    onClick={openEditWorkModal}
                                    className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2"
                                >
                                    <Edit size={16} /> Gerenciar Obra
                                </button>
                            )}
                        </div>

                        {/* Work Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-4 md:p-6">
                            
                            {workTab === 'OVERVIEW' && (
                                <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2 space-y-6">
                                            {/* Main Info Card */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <h3 className="font-bold text-slate-800 mb-4">Detalhes do Projeto</h3>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase">Cliente</span>
                                                        <span className="font-medium text-slate-700">{selectedWork.client}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase">Endereço</span>
                                                        <span className="font-medium text-slate-700">{selectedWork.address}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase">Início</span>
                                                        <span className="font-medium text-slate-700">{new Date(selectedWork.startDate).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-xs font-bold uppercase">Previsão</span>
                                                        <span className="font-medium text-slate-700">{selectedWork.endDate ? new Date(selectedWork.endDate).toLocaleDateString('pt-BR') : 'Em aberto'}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-6">
                                                    <span className="block text-slate-400 text-xs font-bold uppercase mb-2">Progresso Geral</span>
                                                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                                        <div 
                                                            className="bg-pms-600 h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-2" 
                                                            style={{ width: `${selectedWork.progress}%` }}
                                                        >
                                                            <span className="text-[10px] text-white font-bold">{selectedWork.progress}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-6 pt-6 border-t border-slate-100">
                                                    <p className="text-slate-600 text-sm leading-relaxed">
                                                        {selectedWork.description || "Sem descrição detalhada."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Team Card */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <h3 className="font-bold text-slate-800 mb-4">Equipe Alocada</h3>
                                                <div className="space-y-4">
                                                    {(selectedWork.teamIds || []).map(uid => {
                                                        const user = users.find(u => u.id === uid);
                                                        if (!user) return null;
                                                        return (
                                                            <div key={uid} className="flex items-center gap-3">
                                                                <img src={user.avatar} className="w-10 h-10 rounded-full" alt={user.name} />
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">{user.name}</p>
                                                                    <p className="text-xs text-slate-500">{user.category}</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {workTab === 'KANBAN' && hasPermission('viewGlobalTasks') && (
                                <KanbanBoard 
                                    tasks={activeTasks}
                                    users={users}
                                    currentUser={currentUser}
                                    taskStatuses={taskStatuses}
                                    onUpdateTask={handleUpdateTask}
                                    onAddTask={handleAddTask}
                                    workId={selectedWork.id}
                                />
                            )}

                            {workTab === 'FINANCE' && hasPermission('viewFinance') && (
                                <FinanceView 
                                    records={activeFinance}
                                    currentUser={currentUser}
                                    users={users}
                                    work={selectedWork}
                                    financeCategories={financeCategories}
                                    onAddRecord={handleAddFinanceRecord}
                                    onUpdateRecord={handleUpdateFinanceRecord}
                                    onDeleteRecord={handleDeleteFinanceRecord}
                                    onAddCategory={handleAddCategory}
                                />
                            )}

                            {workTab === 'LOGS' && (
                                <DailyLogView 
                                    logs={activeLogs}
                                    users={users}
                                    tasks={activeTasks}
                                    workId={selectedWork.id}
                                    currentUser={currentUser}
                                    onAddLog={handleAddLog}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Suspense>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
            active ? 'bg-pms-600 text-white shadow-md shadow-pms-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </button>
);

const WorkTabButton = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: any }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${
            active ? 'bg-white text-pms-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
    >
        {icon} {label}
    </button>
);

export default App;
