
import React, { useState, useEffect, Suspense } from 'react';
import { User, UserRole, ConstructionWork, Task, FinancialRecord, FinanceType, DailyLog, WorkStatus, UserProfile, AppPermissions, MaterialOrder, TaskStatusDefinition, Material, FinanceCategoryDefinition } from './types';
import { MOCK_USERS } from './constants'; 
import { LayoutDashboard, HardHat, Wallet, Settings, LogOut, Menu, X, Briefcase, Hammer, ChevronRight, ChevronDown, Landmark, Bell, Users, ListTodo, CheckCircle2, History, PauseCircle, ClipboardList, Truck, Contact, Shield, User as UserIcon, Loader2, Edit, Plus, Package, ExternalLink, ArrowLeft, Archive, Cloud, CloudOff } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); 
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WORKS' | 'HISTORY' | 'FINANCE' | 'REGISTRATIONS' | 'ALL_TASKS' | 'MATERIALS'>('DASHBOARD');
  const [registrationSubTab, setRegistrationSubTab] = useState<'HUB' | 'EMPLOYEES' | 'CLIENTS' | 'SUPPLIERS' | 'PROFILES' | 'MATERIALS' | 'SETTINGS' | 'FINANCE_CATEGORIES'>('HUB');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  // Data State (Fetched from API)
  const [works, setWorks] = useState<ConstructionWork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
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

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        // Check mode
        setIsOnlineMode(api.isOnline());
        
        const data = await api.getAllData();
        
        setWorks(data.works);
        setUsers(data.users);
        setProfiles(data.profiles);
        setTasks(data.tasks);
        setFinance(data.finance);
        setLogs(data.logs);
        setMaterials(data.materials);
        setOrders(data.orders);
        setTaskStatuses(data.taskStatuses);
        setFinanceCategories(data.financeCategories);
        
        setIsLoading(false);
    };
    
    // Mesmo se não autenticado, carregamos perfis e usuários para o login funcionar
    // Se o usuário já estiver "logado" via persistência (future feature), setAuthenticated aqui
    loadData();
  }, []);


  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
  };

  const handleRegister = async (user: User) => {
      await api.createUser(user);
      setCurrentUser(user);
      setUsers(prev => [...prev, user]);
      setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setSelectedWorkId(null);
    setActiveTab('DASHBOARD');
    setIsAuthenticated(false);
  };

  // --- Computed Data: Visibility ---
  const visibleWorks = works.filter(w => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.CLIENT || currentUser.category === 'CLIENT') {
          return w.clientId === currentUser.id;
      }
      return true;
  });

  const selectedWork = visibleWorks.find(w => w.id === selectedWorkId);
  const activeTasks = tasks.filter(t => t.workId === selectedWorkId);
  const activeFinance = finance.filter(f => f.workId === selectedWorkId);
  const activeLogs = logs.filter(l => l.workId === selectedWorkId);

  // Check permission helper
  const hasPermission = (permissionKey: keyof AppPermissions): boolean => {
      if (!currentUser) return false;
      const profile = profiles.find(p => p.id === currentUser.profileId);
      if (!profile) return false; 
      if (profile.permissions.isSystemAdmin) return true;
      return !!profile.permissions[permissionKey];
  };

  // --- Financial Alerts Logic ---
  const financialAlerts = finance.filter(record => {
    if (!hasPermission('viewFinance')) return false;
    if (record.status !== 'Pendente') return false;
    const isVisibleWork = visibleWorks.some(w => w.id === record.workId);
    if (!isVisibleWork) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = record.dueDate.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 2;
  }).sort((a,b) => a.dueDate.localeCompare(b.dueDate));

  // --- Handlers (Updated to use API) ---

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

  // Finance Handlers
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

  const handleQuickPay = async (record: FinancialRecord) => {
      if (!hasPermission('manageFinance')) return;
      const updatedRecord: FinancialRecord = {
          ...record,
          status: 'Pago',
          paidDate: new Date().toISOString().split('T')[0]
      };
      await handleUpdateFinanceRecord(updatedRecord);
  };

  // Finance Category Handlers
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

  // User Management Handlers
  const handleAddUser = async (newUser: User) => {
    await api.createUser(newUser);
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await api.updateUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      await api.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  // Profile Management Handlers
  const handleAddProfile = async (newProfile: UserProfile) => {
      await api.createProfile(newProfile);
      setProfiles(prev => [...prev, newProfile]);
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
      await api.updateProfile(updatedProfile);
      setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const handleDeleteProfile = async (profileId: string) => {
      if(window.confirm('Tem certeza? Usuários com este perfil precisarão ser realocados.')) {
          await api.deleteProfile(profileId);
          setProfiles(prev => prev.filter(p => p.id !== profileId));
      }
  };

  const handleUpdateStatuses = async (newStatuses: TaskStatusDefinition[]) => {
    await api.updateStatuses(newStatuses); 
    setTaskStatuses(newStatuses);
  };

  // Material Catalog Handlers
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

  // Material Order Handlers
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

  // --- Work Edit / Create Handlers ---
  const openEditWorkModal = () => {
      if (selectedWork && hasPermission('manageWorks')) {
          setEditingWork({
              ...selectedWork,
              teamIds: selectedWork.teamIds || []
          });
          setIsEditWorkModalOpen(true);
      }
  };

  const handleOpenCreateWorkModal = () => {
    if (!hasPermission('manageWorks')) { alert("Sem permissão."); return; }
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
          setEditingWork({
              ...editingWork,
              teamIds: currentTeam.filter(id => id !== userId)
          });
      } else {
          setEditingWork({
              ...editingWork,
              teamIds: [...currentTeam, userId]
          });
      }
  };

  const navigateToWorkBoard = (workId: string) => {
      setSelectedWorkId(workId);
      setActiveTab('WORKS');
      setWorkTab('KANBAN');
  };

  // --- Views ---

  const renderDashboard = () => {
    const activeWorksList = visibleWorks.filter(w => w.status !== WorkStatus.COMPLETED);
    
    const workStats = {
        execution: visibleWorks.filter(w => w.status === WorkStatus.EXECUTION).length,
        planning: visibleWorks.filter(w => w.status === WorkStatus.PLANNING).length,
        paused: visibleWorks.filter(w => w.status === WorkStatus.PAUSED).length,
        completed: visibleWorks.filter(w => w.status === WorkStatus.COMPLETED).length,
    };

    return (
      <div className="p-6 space-y-6 animate-fade-in pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Bem-vindo, {currentUser.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 text-slate-500">
             <p>Visão geral das operações da PMS Construtora.</p>
             {isOnlineMode && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded border border-green-200 font-bold flex items-center gap-1"><Cloud size={10}/> Online</span>}
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
                <ExternalLink size={12} className="absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                  {new Date(alert.dueDate).toLocaleDateString('pt-BR')}
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

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex -space-x-2">
                          {(work.teamIds || []).slice(0, 3).map(uid => {
                              const u = users.find(user => user.id === uid);
                              if (!u) return null;
                              return (
                                  <img key={uid} src={u.avatar} className="w-6 h-6 rounded-full border-2 border-white" title={u.name} />
                              )
                          })}
                          {(work.teamIds?.length || 0) > 3 && (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                  +{work.teamIds!.length - 3}
                              </div>
                          )}
                      </div>
                      <div className="text-pms-600 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Acessar Painel <ChevronRight size={14} />
                      </div>
                  </div>
                </div>
              </div>
            ))}
            {activeWorksList.length === 0 && (
                <div className="col-span-full bg-slate-50 border border-slate-200 rounded-xl p-10 text-center text-slate-400">
                    <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhuma obra ativa encontrada.</p>
                    {hasPermission('manageWorks') && <p className="text-sm mt-2">Clique em "Nova Obra" para começar.</p>}
                </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  if (!isAuthenticated) {
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
            <SidebarItem icon={<ListTodo size={20} />} label="Tarefas Globais" active={activeTab === 'ALL_TASKS'} onClick={() => { setActiveTab('ALL_TASKS'); setSelectedWorkId(null); }} />
            <SidebarItem icon={<Briefcase size={20} />} label="Histórico de Obras" active={activeTab === 'HISTORY'} onClick={() => { setActiveTab('HISTORY'); setSelectedWorkId(null); }} />

            <div className="text-xs font-bold text-slate-500 uppercase px-4 mb-2 mt-6">Gestão</div>
            <SidebarItem icon={<Users size={20} />} label="Cadastros & Equipe" active={activeTab === 'REGISTRATIONS'} onClick={() => { setActiveTab('REGISTRATIONS'); setSelectedWorkId(null); }} />
            <SidebarItem icon={<Package size={20} />} label="Materiais & Compras" active={activeTab === 'MATERIALS'} onClick={() => { setActiveTab('MATERIALS'); setSelectedWorkId(null); }} />
            <SidebarItem icon={<Landmark size={20} />} label="Financeiro Global" active={activeTab === 'FINANCE'} onClick={() => { setActiveTab('FINANCE'); setSelectedWorkId(null); }} />
            <SidebarItem icon={<Settings size={20} />} label="Configurações" active={activeTab === 'REGISTRATIONS' && registrationSubTab === 'SETTINGS'} onClick={() => { setActiveTab('REGISTRATIONS'); setRegistrationSubTab('SETTINGS'); setSelectedWorkId(null); }} />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4">
               <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="Profile" />
               <div className="overflow-hidden">
                   <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                   <p className="text-xs text-slate-500 truncate">{profiles.find(p=>p.id===currentUser.profileId)?.name}</p>
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
                  <SidebarItem icon={<Briefcase size={24} />} label="Obras" active={activeTab === 'WORKS' || activeTab === 'HISTORY'} onClick={() => { setActiveTab('DASHBOARD'); setSelectedWorkId(null); setMobileMenuOpen(false); }} />
                  <SidebarItem icon={<ListTodo size={24} />} label="Tarefas" active={activeTab === 'ALL_TASKS'} onClick={() => { setActiveTab('ALL_TASKS'); setMobileMenuOpen(false); }} />
                  <SidebarItem icon={<Users size={24} />} label="Equipe" active={activeTab === 'REGISTRATIONS'} onClick={() => { setActiveTab('REGISTRATIONS'); setMobileMenuOpen(false); }} />
                  <SidebarItem icon={<Package size={24} />} label="Materiais" active={activeTab === 'MATERIALS'} onClick={() => { setActiveTab('MATERIALS'); setMobileMenuOpen(false); }} />
                  <SidebarItem icon={<Landmark size={24} />} label="Financeiro" active={activeTab === 'FINANCE'} onClick={() => { setActiveTab('FINANCE'); setMobileMenuOpen(false); }} />
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
                        {/* Reusing Dashboard Logic for completed works list could go here, simplified */}
                        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border border-slate-200 border-dashed">
                            <Archive size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Obras concluídas serão arquivadas aqui.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'ALL_TASKS' && (
                    <GlobalTaskList 
                        tasks={tasks} 
                        works={works} 
                        users={users} 
                        taskStatuses={taskStatuses}
                        onUpdateTask={handleUpdateTask}
                        onAddTask={handleAddTask}
                    />
                )}

                {activeTab === 'FINANCE' && (
                    <div className="p-6">
                        <FinanceView 
                            records={finance} 
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
                        users={users}
                        profiles={profiles}
                        materials={materials}
                        taskStatuses={taskStatuses}
                        financeCategories={financeCategories}
                        initialTab={registrationSubTab}
                        onAddUser={handleAddUser}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                        onAddProfile={handleAddProfile}
                        onUpdateProfile={handleUpdateProfile}
                        onDeleteProfile={handleDeleteProfile}
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
                        orders={orders}
                        works={works}
                        tasks={tasks}
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
                                <WorkTabButton active={workTab === 'KANBAN'} onClick={() => setWorkTab('KANBAN')} label="Tarefas (Kanban)" icon={<ListTodo size={16}/>} />
                                <WorkTabButton active={workTab === 'FINANCE'} onClick={() => setWorkTab('FINANCE')} label="Financeiro" icon={<Landmark size={16}/>} />
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

                                            {/* Recent Activity / Tasks Preview */}
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-bold text-slate-800">Tarefas Recentes</h3>
                                                    <button onClick={() => setWorkTab('KANBAN')} className="text-pms-600 text-xs font-bold hover:underline">Ver Todas</button>
                                                </div>
                                                <div className="space-y-3">
                                                    {activeTasks.slice(0, 3).map(t => (
                                                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${t.status === 'Concluído' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                                                <span className="text-sm font-medium text-slate-700">{t.title}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-400">{t.status}</span>
                                                        </div>
                                                    ))}
                                                    {activeTasks.length === 0 && <p className="text-slate-400 text-sm italic">Nenhuma tarefa registrada.</p>}
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
                                                                    <p className="text-xs text-slate-500">{profiles.find(p => p.id === user.profileId)?.name}</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                {hasPermission('manageWorks') && (
                                                    <button 
                                                        onClick={openEditWorkModal}
                                                        className="w-full mt-6 py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-50 hover:text-pms-600 transition-colors"
                                                    >
                                                        + Gerenciar Equipe
                                                    </button>
                                                )}
                                            </div>

                                            {/* Finance Summary Mini */}
                                            <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-pms-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                                                <h3 className="font-bold text-lg mb-1">Resumo Financeiro</h3>
                                                <p className="text-slate-400 text-xs mb-6">Acumulado da Obra</p>
                                                
                                                <div className="space-y-4 relative z-10">
                                                    <div>
                                                        <span className="text-xs text-slate-400 uppercase">Total Despesas</span>
                                                        <p className="text-2xl font-bold text-red-400">
                                                            R$ {activeFinance.filter(f => f.type === 'Pagar').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                    <div className="pt-4 border-t border-slate-800">
                                                        <span className="text-xs text-slate-400 uppercase">Orçamento</span>
                                                        <p className="text-lg font-medium text-green-400">
                                                            R$ {selectedWork.budget.toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setWorkTab('FINANCE')}
                                                    className="w-full mt-6 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    Ver Detalhes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {workTab === 'KANBAN' && (
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

                            {workTab === 'FINANCE' && (
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

      {/* Edit Work Modal */}
      {isEditWorkModalOpen && editingWork && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          {editingWork.id ? 'Editar Obra' : 'Nova Obra'}
                      </h3>
                      <button onClick={() => setIsEditWorkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="overflow-y-auto custom-scroll flex-1 pr-2 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Obra</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.name}
                            onChange={(e) => setEditingWork({...editingWork, name: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Cliente</label>
                              <select 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={editingWork.clientId || ''}
                                onChange={(e) => {
                                    const client = users.find(u => u.id === e.target.value);
                                    setEditingWork({
                                        ...editingWork, 
                                        clientId: e.target.value,
                                        client: client ? client.name : ''
                                    })
                                }}
                              >
                                  <option value="">Selecione...</option>
                                  {users.filter(u => u.category === 'CLIENT').map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                              <select 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                value={editingWork.status}
                                onChange={(e) => setEditingWork({...editingWork, status: e.target.value as WorkStatus})}
                              >
                                  {Object.values(WorkStatus).map(s => (
                                      <option key={s} value={s}>{s}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={editingWork.address}
                            onChange={(e) => setEditingWork({...editingWork, address: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Orçamento (R$)</label>
                              <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.budget}
                                onChange={(e) => setEditingWork({...editingWork, budget: parseFloat(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Progresso (%)</label>
                              <input 
                                type="number" 
                                max="100"
                                min="0"
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.progress}
                                onChange={(e) => setEditingWork({...editingWork, progress: parseInt(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Data Início</label>
                              <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.startDate}
                                onChange={(e) => setEditingWork({...editingWork, startDate: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Data Fim (Prev.)</label>
                              <input 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                value={editingWork.endDate}
                                onChange={(e) => setEditingWork({...editingWork, endDate: e.target.value})}
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                          <textarea 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none h-24 resize-none"
                            value={editingWork.description}
                            onChange={(e) => setEditingWork({...editingWork, description: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Equipe Alocada</label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                              {users.filter(u => u.category === 'EMPLOYEE').map(u => (
                                  <div 
                                    key={u.id} 
                                    onClick={() => toggleTeamMember(u.id)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                        (editingWork.teamIds || []).includes(u.id) ? 'bg-pms-100 border border-pms-300' : 'bg-white hover:bg-slate-100 border border-transparent'
                                    }`}
                                  >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                          (editingWork.teamIds || []).includes(u.id) ? 'bg-pms-600 border-pms-600' : 'border-slate-300'
                                      }`}>
                                          {(editingWork.teamIds || []).includes(u.id) && <CheckCircle2 size={12} className="text-white" />}
                                      </div>
                                      <span className="text-xs font-medium text-slate-700">{u.name}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                      <button onClick={() => setIsEditWorkModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                          Cancelar
                      </button>
                      <button onClick={saveEditedWork} className="px-6 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-lg">
                          Salvar Obra
                      </button>
                  </div>
              </div>
          </div>
      )}

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
