
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ConstructionWork, Task, FinancialRecord, FinanceType, DailyLog, WorkStatus, UserProfile, AppPermissions, MaterialOrder, TaskStatusDefinition, TaskStatus, Material, FinanceCategoryDefinition } from './types';
import { MOCK_USERS, MOCK_WORKS, MOCK_TASKS, MOCK_FINANCE, MOCK_LOGS, MOCK_PROFILES, MOCK_ORDERS, DEFAULT_TASK_STATUSES, MOCK_MATERIALS, DEFAULT_FINANCE_CATEGORIES } from './constants';
import { KanbanBoard } from './components/KanbanBoard';
import { FinanceView } from './components/FinanceView';
import { DailyLogView } from './components/DailyLog';
import { UserManagement } from './components/UserManagement';
import { GlobalTaskList } from './components/GlobalTaskList';
import { MaterialOrders } from './components/MaterialOrders';
import { LayoutDashboard, HardHat, Wallet, Settings, LogOut, Menu, X, Briefcase, Hammer, ChevronRight, Landmark, Bell, Users, ListTodo, CheckCircle2, Calendar, Edit, Save, Image as ImageIcon, ExternalLink, Package, Plus, ChevronDown, ArrowLeft, Archive, History, PauseCircle, ClipboardList, Truck, Contact, Shield, User as UserIcon } from 'lucide-react';

// --- Main App Component ---

const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); // Default to Marcos
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WORKS' | 'HISTORY' | 'FINANCE' | 'REGISTRATIONS' | 'ALL_TASKS' | 'MATERIALS'>('DASHBOARD');
  const [registrationSubTab, setRegistrationSubTab] = useState<'HUB' | 'EMPLOYEES' | 'CLIENTS' | 'SUPPLIERS' | 'PROFILES' | 'MATERIALS' | 'SETTINGS' | 'FINANCE_CATEGORIES'>('HUB');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  // Data State (Simulating DB)
  const [works, setWorks] = useState<ConstructionWork[]>(MOCK_WORKS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [profiles, setProfiles] = useState<UserProfile[]>(MOCK_PROFILES);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [finance, setFinance] = useState<FinancialRecord[]>(MOCK_FINANCE);
  const [logs, setLogs] = useState<DailyLog[]>(MOCK_LOGS);
  const [orders, setOrders] = useState<MaterialOrder[]>(MOCK_ORDERS);
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusDefinition[]>(DEFAULT_TASK_STATUSES);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryDefinition[]>(DEFAULT_FINANCE_CATEGORIES);

  // Work Detail Tab State
  const [workTab, setWorkTab] = useState<'OVERVIEW' | 'KANBAN' | 'FINANCE' | 'LOGS'>('OVERVIEW');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Edit Work State
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<ConstructionWork | null>(null);

  // --- Computed Data: Visibility ---
  // Filter works based on user role. Clients see only their works. Others see all.
  const visibleWorks = useMemo(() => {
      if (currentUser.role === UserRole.CLIENT || currentUser.category === 'CLIENT') {
          return works.filter(w => w.clientId === currentUser.id);
      }
      return works;
  }, [works, currentUser]);

  // --- Helpers & Permissions ---
  // We search in 'works' generally, but access is implicitly restricted by UI. 
  // Security-wise, we could restrict selection here too.
  const selectedWork = visibleWorks.find(w => w.id === selectedWorkId);
  
  const activeTasks = tasks.filter(t => t.workId === selectedWorkId);
  const activeFinance = finance.filter(f => f.workId === selectedWorkId);
  const activeLogs = logs.filter(l => l.workId === selectedWorkId);

  // Check permission helper
  const hasPermission = (permissionKey: keyof AppPermissions): boolean => {
      const profile = profiles.find(p => p.id === currentUser.profileId);
      if (!profile) return false; // Safe default
      if (profile.permissions.isSystemAdmin) return true;
      return !!profile.permissions[permissionKey];
  };

  // --- Financial Alerts Logic ---
  const financialAlerts = useMemo(() => {
    // Check permission instead of strict role
    if (!hasPermission('viewFinance')) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return finance.filter(record => {
      if (record.status !== 'Pendente') return false;
      // Ensure we only show alerts for visible works
      const isVisibleWork = visibleWorks.some(w => w.id === record.workId);
      if (!isVisibleWork) return false;

      // Parse date manually to ensure local timezone comparison
      const [y, m, d] = record.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // "Vencendo em 2 dias" covers today (0), tomorrow (1), and day after (2) + overdue (negative)
      return diffDays <= 2;
    }).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  }, [finance, currentUser, profiles, visibleWorks]); 

  // --- Handlers ---

  const handleUpdateWork = (updatedWork: ConstructionWork) => {
      if (!hasPermission('manageWorks')) return;
      setWorks(prev => prev.map(w => w.id === updatedWork.id ? updatedWork : w));
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleAddLog = () => {
    alert("Funcionalidade de adicionar registro (mock)");
  };

  // Finance Handlers
  const handleAddFinanceRecord = (record: FinancialRecord) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    setFinance(prev => [...prev, record]);
  };

  const handleUpdateFinanceRecord = (updatedRecord: FinancialRecord) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    setFinance(prev => prev.map(f => f.id === updatedRecord.id ? updatedRecord : f));
  };

  const handleDeleteFinanceRecord = (recordId: string) => {
    if (!hasPermission('manageFinance')) { alert('Sem permissão'); return; }
    if(window.confirm("Tem certeza que deseja excluir este lançamento?")) {
        setFinance(prev => prev.filter(f => f.id !== recordId));
    }
  };

  const handleQuickPay = (record: FinancialRecord) => {
      if (!hasPermission('manageFinance')) return;
      const updatedRecord: FinancialRecord = {
          ...record,
          status: 'Pago',
          paidDate: new Date().toISOString().split('T')[0]
      };
      handleUpdateFinanceRecord(updatedRecord);
  };

  // Finance Category Handlers
  const handleAddCategory = (newCat: FinanceCategoryDefinition) => {
    setFinanceCategories(prev => [...prev, newCat]);
  };

  const handleUpdateCategory = (updatedCat: FinanceCategoryDefinition) => {
    setFinanceCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Lançamentos antigos manterão o nome, mas não será possível selecionar novamente.')) {
      setFinanceCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  // User Management Handlers
  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  // Profile Management Handlers
  const handleAddProfile = (newProfile: UserProfile) => {
      setProfiles(prev => [...prev, newProfile]);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
      setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const handleDeleteProfile = (profileId: string) => {
      if(window.confirm('Tem certeza? Usuários com este perfil precisarão ser realocados.')) {
          setProfiles(prev => prev.filter(p => p.id !== profileId));
      }
  };

  const handleUpdateStatuses = (newStatuses: TaskStatusDefinition[]) => {
    setTaskStatuses(newStatuses);
  };

  // Material Catalog Handlers
  const handleAddMaterial = (newMaterial: Material) => {
      setMaterials(prev => [...prev, newMaterial]);
  };
  
  const handleUpdateMaterial = (updatedMaterial: Material) => {
      setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
  };

  const handleDeleteMaterial = (materialId: string) => {
      if (window.confirm('Tem certeza que deseja excluir este material do catálogo?')) {
          setMaterials(prev => prev.filter(m => m.id !== materialId));
      }
  };

  // Material Order Handlers
  const handleAddOrder = (newOrder: MaterialOrder) => {
    if (!hasPermission('manageMaterials')) { alert("Sem permissão."); return; }
    setOrders(prev => [...prev, newOrder]);
  };

  const handleUpdateOrder = (updatedOrder: MaterialOrder) => {
    if (!hasPermission('manageMaterials')) { alert("Sem permissão."); return; }
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  // --- Work Edit / Create Handlers ---
  const openEditWorkModal = () => {
      if (selectedWork && hasPermission('manageWorks')) {
          setEditingWork({
              ...selectedWork,
              teamIds: selectedWork.teamIds || [] // Ensure array exists
          });
          setIsEditWorkModalOpen(true);
      }
  };

  const handleOpenCreateWorkModal = () => {
    if (!hasPermission('manageWorks')) { alert("Sem permissão."); return; }
    setEditingWork({
        id: '', // Empty ID signals new work
        name: '',
        client: '',
        clientId: '',
        address: '',
        status: WorkStatus.PLANNING,
        progress: 0,
        budget: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        imageUrl: `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/800/400`, // Random placeholder
        description: '',
        teamIds: [currentUser.id] // Auto-assign creator
    });
    setIsEditWorkModalOpen(true);
  };

  const saveEditedWork = () => {
      if (editingWork && editingWork.name) {
          if (editingWork.id) {
              // Update Existing
              handleUpdateWork(editingWork);
          } else {
              // Create New
              const newWork: ConstructionWork = {
                  ...editingWork,
                  id: Math.random().toString(36).substr(2, 9)
              };
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
    // Only show active works in dashboard (using visibleWorks for permission filtering)
    const activeWorksList = visibleWorks.filter(w => w.status !== WorkStatus.COMPLETED);
    
    // Work Status Counters (Visible works only)
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
          <p className="text-slate-500">Visão geral das operações da PMS Construtora.</p>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Execução */}
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

            {/* Planejamento */}
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

            {/* Pausadas */}
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

             {/* Concluídas */}
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

        {/* Financial Alerts (Incomes and Expenses) */}
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
                              <p className="text-xs text-orange-700 font-medium">Vence: {new Date(alert.dueDate).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
                              <span className={`font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                                  R$ {alert.amount.toLocaleString('pt-BR')}
                              </span>
                              {hasPermission('manageFinance') && (
                                <button 
                                    onClick={() => handleQuickPay(alert)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-green-500 hover:text-green-600 hover:bg-green-50 text-slate-500 text-xs font-bold rounded transition-all shadow-sm"
                                    title="Dar Baixa (Confirmar)"
                                >
                                    <CheckCircle2 size={14} />
                                    {isIncome ? 'Recebido' : 'Pago'}
                                </button>
                              )}
                           </div>
                        </div>
                       );
                   })}
                </div>
             </div>
          </div>
        )}

        {/* Quick Access & Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tarefas Abertas -> Tarefas Gerais (Se tiver permissao) */}
          <div 
            onClick={() => { 
                if (hasPermission('viewGlobalTasks')) {
                    setSelectedWorkId(null); 
                    setActiveTab('ALL_TASKS'); 
                }
            }}
            className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm group ${hasPermission('viewGlobalTasks') ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all' : ''}`}
          >
            <span className={`text-slate-500 text-xs font-bold uppercase ${hasPermission('viewGlobalTasks') ? 'group-hover:text-pms-600' : ''} transition-colors`}>Tarefas Totais</span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-pms-900">{tasks.length}</span>
              <Briefcase className={`text-pms-500 opacity-20 mb-1 ${hasPermission('viewGlobalTasks') ? 'group-hover:opacity-100' : ''} transition-opacity`} size={24} />
            </div>
          </div>

          {/* Saldo Atual em Caixa -> Financeiro Global (Se Permissão) */}
          {hasPermission('viewFinance') && (
            <div 
                onClick={() => { 
                    setSelectedWorkId(null); 
                    setActiveTab('FINANCE'); 
                }}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
            >
                <span className="text-slate-500 text-xs font-bold uppercase group-hover:text-green-600 transition-colors">Saldo em Caixa</span>
                <div className="flex items-end justify-between mt-2">
                {(() => {
                    const income = finance.filter(f => f.type === FinanceType.INCOME && f.status === 'Pago').reduce((acc, r) => acc + r.amount, 0);
                    const expense = finance.filter(f => f.type === FinanceType.EXPENSE && f.status === 'Pago').reduce((acc, r) => acc + r.amount, 0);
                    const balance = income - expense;
                    const isPos = balance >= 0;
                    
                    return (
                        <span className={`text-2xl font-bold ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    );
                })()}
                <Landmark className="text-green-500 opacity-20 mb-1 group-hover:opacity-100 transition-opacity" size={24} />
                </div>
            </div>
          )}

          {/* Contas a Pagar -> Financeiro Global (Se Permissão) */}
          {hasPermission('viewFinance') && (
              <div 
                onClick={() => { 
                    setSelectedWorkId(null); 
                    setActiveTab('FINANCE'); 
                }}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all"
              >
              <span className="text-slate-500 text-xs font-bold uppercase group-hover:text-orange-600 transition-colors">Contas a Pagar</span>
              <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-orange-600">
                    {finance.filter(f => f.status === 'Pendente' && f.type === FinanceType.EXPENSE).length}
                  </span>
                  <Wallet className="text-orange-500 opacity-20 mb-1 group-hover:opacity-100 transition-opacity" size={24} />
              </div>
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Works List Quick View (Filtered) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">Obras em Andamento</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    {hasPermission('manageWorks') && (
                        <button 
                            onClick={handleOpenCreateWorkModal}
                            className="bg-pms-600 text-white hover:bg-pms-500 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-md"
                        >
                            <Plus size={14} />
                            Nova Obra
                        </button>
                    )}
                </div>
             </div>
             <div className="p-4 grid grid-cols-1 gap-4">
                {activeWorksList.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <HardHat size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>Nenhuma obra ativa encontrada.</p>
                    </div>
                )}
                {activeWorksList.map(work => (
                    <div key={work.id} onClick={() => navigateToWorkBoard(work.id)} className="group flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-pms-200 hover:bg-pms-50 transition-all cursor-pointer">
                        <div className={`h-16 w-24 rounded-lg overflow-hidden shrink-0 relative`}>
                            <img src={work.imageUrl} alt={work.name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 group-hover:text-pms-700 transition-colors">{work.name}</h4>
                            <p className="text-sm text-slate-500">{work.client}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full bg-pms-500`} style={{ width: `${work.progress}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-600">{work.progress}%</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                work.status === WorkStatus.EXECUTION ? 'bg-green-100 text-green-700' : 
                                work.status === WorkStatus.PLANNING ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {work.status}
                            </span>
                            <ChevronRight className="ml-auto mt-2 text-slate-300 group-hover:text-pms-500" size={20} />
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* Recent Activity / Daily Logs Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Diário Recente</h3>
             </div>
             <div className="p-4 space-y-4">
                {logs.slice(0, 3).map(log => {
                    // Only show logs for visible works
                    const w = visibleWorks.find(w => w.id === log.workId);
                    if (!w) return null;
                    
                    return (
                        <div key={log.id} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                           <div className="mt-1">
                               <div className="h-8 w-8 rounded-full bg-pms-100 text-pms-600 flex items-center justify-center font-bold text-xs">
                                   {new Date(log.date).getDate()}
                               </div>
                           </div>
                           <div>
                               <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">{w.name}</p>
                               <p className="text-sm text-slate-700 line-clamp-2">{log.content}</p>
                           </div>
                        </div>
                    );
                })}
                {logs.filter(l => visibleWorks.some(w => w.id === l.workId)).length === 0 && <p className="text-slate-400 text-center py-4">Nenhum registro recente.</p>}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => {
      // Use visibleWorks so client only sees their own history
      const completedWorks = visibleWorks.filter(w => w.status === WorkStatus.COMPLETED);

      return (
          <div className="p-6 space-y-6 animate-fade-in pb-20">
              <div className="mb-6 border-b border-slate-200 pb-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <History size={28} className="text-slate-400" />
                      Histórico de Obras
                  </h2>
                  <p className="text-slate-500 mt-1">Arquivo de projetos concluídos e entregues.</p>
              </div>

              {completedWorks.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <Archive size={64} className="mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-bold text-slate-600">Nenhuma obra no histórico</h3>
                      <p className="text-slate-400">As obras marcadas como "Concluída" aparecerão aqui.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {completedWorks.map(work => (
                          <div 
                            key={work.id} 
                            onClick={() => navigateToWorkBoard(work.id)}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group cursor-pointer hover:shadow-md transition-all"
                          >
                              <div className="h-40 relative grayscale group-hover:grayscale-0 transition-all duration-500">
                                  <img src={work.imageUrl} alt={work.name} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                  <div className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded text-xs font-bold text-slate-700 shadow-sm">
                                      Entregue em: {new Date(work.endDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                  </div>
                              </div>
                              <div className="p-5">
                                  <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-pms-600 transition-colors">{work.name}</h3>
                                  <p className="text-sm text-slate-500 mb-4 flex items-center gap-1"><UserIcon size={14} /> {work.client}</p>
                                  
                                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">Concluída</span>
                                      <button className="text-sm font-bold text-slate-400 group-hover:text-pms-600 flex items-center gap-1 transition-colors">
                                          Acessar <ChevronRight size={16} />
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const renderRegistrationHub = () => {
      // If we are in a specific sub-tab, render UserManagement
      if (registrationSubTab !== 'HUB') {
          return (
              <div className="h-full flex flex-col">
                  <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
                      <button 
                        onClick={() => setRegistrationSubTab('HUB')}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        title="Voltar para o Menu"
                      >
                          <ArrowLeft size={20} />
                      </button>
                      <h2 className="text-lg font-bold text-slate-800">
                          {registrationSubTab === 'EMPLOYEES' ? 'Gestão de Funcionários' : 
                           registrationSubTab === 'CLIENTS' ? 'Gestão de Clientes' : 
                           registrationSubTab === 'SUPPLIERS' ? 'Gestão de Fornecedores' : 
                           registrationSubTab === 'PROFILES' ? 'Perfis de Acesso' : 
                           registrationSubTab === 'MATERIALS' ? 'Catálogo de Materiais' : 
                           registrationSubTab === 'FINANCE_CATEGORIES' ? 'Categorias Financeiras' : 'Configurações do Sistema'}
                      </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <UserManagement 
                        users={users} 
                        profiles={profiles}
                        materials={materials}
                        orders={orders}
                        initialTab={registrationSubTab}
                        taskStatuses={taskStatuses}
                        financeCategories={financeCategories}
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
                  </div>
              </div>
          );
      }

      // Hub View
      return (
          <div className="p-6 md:p-12 animate-fade-in max-w-6xl mx-auto">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Central de Cadastros</h2>
                  <p className="text-slate-500 text-lg">Selecione o tipo de cadastro que deseja gerenciar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {/* Employees */}
                  <button 
                    onClick={() => setRegistrationSubTab('EMPLOYEES')}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                  >
                      <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <HardHat size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-green-600 transition-colors">Funcionários</h3>
                      <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {users.filter(u => u.category === 'EMPLOYEE').length}
                      </span>
                  </button>

                  {/* Clients */}
                  <button 
                    onClick={() => setRegistrationSubTab('CLIENTS')}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                  >
                      <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Contact size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">Clientes</h3>
                      <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {users.filter(u => u.category === 'CLIENT').length}
                      </span>
                  </button>

                  {/* Suppliers */}
                  <button 
                    onClick={() => setRegistrationSubTab('SUPPLIERS')}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                  >
                      <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Truck size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-orange-600 transition-colors">Fornecedores</h3>
                      <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {users.filter(u => u.category === 'SUPPLIER').length}
                      </span>
                  </button>

                  {/* Materials Catalog */}
                  <button 
                    onClick={() => setRegistrationSubTab('MATERIALS')}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                  >
                      <div className="w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Package size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-cyan-600 transition-colors">Catálogo de Materiais</h3>
                      <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {materials.length} Itens
                      </span>
                  </button>

                  {/* New Work Button */}
                  {hasPermission('manageWorks') && (
                    <button 
                      onClick={handleOpenCreateWorkModal}
                      className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Hammer size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-purple-600 transition-colors">Nova Obra</h3>
                        <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Cadastrar Projeto
                        </span>
                    </button>
                  )}
                  
                  {/* Finance Categories */}
                  {hasPermission('manageFinance') && (
                      <button 
                        onClick={() => setRegistrationSubTab('FINANCE_CATEGORIES')}
                        className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                      >
                          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <Wallet size={32} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors">Categorias Financeiras</h3>
                          <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {financeCategories.length} Tipos
                          </span>
                      </button>
                  )}

                  {/* Settings / Statuses */}
                  <button 
                    onClick={() => setRegistrationSubTab('SETTINGS')}
                    className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center"
                  >
                      <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Settings size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-slate-600 transition-colors">Configurações</h3>
                      <span className="text-xs font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Status & Mais
                      </span>
                  </button>
              </div>

              {hasPermission('manageUsers') && (
                  <div className="mt-12 flex justify-center">
                      <button 
                        onClick={() => setRegistrationSubTab('PROFILES')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold uppercase tracking-wider hover:bg-slate-100 px-4 py-2 rounded-lg"
                      >
                          <Shield size={16} /> Gerenciar Perfis de Acesso
                      </button>
                  </div>
              )}
          </div>
      );
  };

  const renderWorkBoard = () => {
    if (!selectedWork) return null;

    // ... (Keep existing WorkBoard Logic, just returning the JSX)
    return (
      <div className="h-full flex flex-col animate-fade-in">
        {/* Work Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row justify-between md:items-center gap-3 shrink-0">
           <div className="flex items-center gap-3">
               <button onClick={() => { setSelectedWorkId(null); }} className="md:hidden p-2 -ml-2 text-slate-400">
                   <ArrowLeft size={24} />
               </button>
               <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">{selectedWork.name}</h2>
               
               {/* Status Toggle Dropdown */}
               <div className="relative group">
                  <button className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 uppercase transition-colors ${
                      selectedWork.status === WorkStatus.EXECUTION ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                      selectedWork.status === WorkStatus.PLANNING ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                      selectedWork.status === WorkStatus.PAUSED ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                      'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                      {selectedWork.status}
                      <ChevronDown size={14} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                      {Object.values(WorkStatus).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateWork({ ...selectedWork, status })}
                            className={`w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-slate-50 flex items-center justify-between ${selectedWork.status === status ? 'text-pms-600 bg-pms-50' : 'text-slate-600'}`}
                          >
                              {status}
                              {selectedWork.status === status && <CheckCircle2 size={12} />}
                          </button>
                      ))}
                  </div>
               </div>
           </div>

           <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <button 
                onClick={() => setWorkTab('OVERVIEW')}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${workTab === 'OVERVIEW' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                  Visão Geral
              </button>
              <button 
                onClick={() => setWorkTab('KANBAN')}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${workTab === 'KANBAN' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                  Tarefas
              </button>
              {hasPermission('viewFinance') && (
                  <button 
                    onClick={() => setWorkTab('FINANCE')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${workTab === 'FINANCE' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                      Financeiro
                  </button>
              )}
              <button 
                onClick={() => setWorkTab('LOGS')}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${workTab === 'LOGS' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                  Diário
              </button>
              {hasPermission('manageWorks') && (
                  <button 
                    onClick={openEditWorkModal}
                    className="px-3 py-2 text-slate-400 hover:text-pms-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Configurações da Obra"
                  >
                      <Settings size={20} />
                  </button>
              )}
           </div>
        </div>

        {/* Work Content */}
        <div className="flex-1 overflow-hidden bg-slate-50 relative">
            {workTab === 'OVERVIEW' && (
                <div className="p-6 overflow-y-auto h-full">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                          <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 mb-4 relative group">
                             <img src={selectedWork.imageUrl} alt={selectedWork.name} className="w-full h-full object-cover" />
                             {/* Edit Overlay hint */}
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                 {hasPermission('manageWorks') && <button onClick={openEditWorkModal} className="opacity-0 group-hover:opacity-100 bg-white/90 px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">Alterar Imagem</button>}
                             </div>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Detalhes do Projeto</h3>
                          <div className="space-y-3 text-sm text-slate-600">
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                  <span>Cliente:</span>
                                  <span className="font-bold text-slate-800">{selectedWork.client}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                  <span>Endereço:</span>
                                  <span className="font-bold text-slate-800 text-right max-w-[200px]">{selectedWork.address}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                  <span>Orçamento:</span>
                                  <span className="font-bold text-green-600">R$ {selectedWork.budget.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                  <span>Início:</span>
                                  <span className="font-bold text-slate-800">{new Date(selectedWork.startDate).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span>Previsão:</span>
                                  <span className="font-bold text-slate-800">{selectedWork.endDate ? new Date(selectedWork.endDate).toLocaleDateString('pt-BR') : 'Em aberto'}</span>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-6">
                          {/* Progress Card */}
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                              <h3 className="text-lg font-bold text-slate-800 mb-4">Progresso Físico</h3>
                              <div className="relative pt-2">
                                  <div className="flex mb-2 items-center justify-between">
                                      <div>
                                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pms-600 bg-pms-200">
                                              Conclusão
                                          </span>
                                      </div>
                                      <div className="text-right">
                                          <span className="text-xs font-semibold inline-block text-pms-600">
                                              {selectedWork.progress}%
                                          </span>
                                      </div>
                                  </div>
                                  <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-pms-100">
                                      <div style={{ width: `${selectedWork.progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pms-500 transition-all duration-1000"></div>
                                  </div>
                              </div>
                              <p className="text-slate-500 text-sm">{selectedWork.description}</p>
                          </div>

                          {/* Team Card */}
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                              <h3 className="text-lg font-bold text-slate-800 mb-4">Equipe Alocada</h3>
                              <div className="flex flex-wrap gap-3">
                                  {selectedWork.teamIds?.map(uid => {
                                      const u = users.find(usr => usr.id === uid);
                                      if (!u) return null;
                                      return (
                                          <div key={uid} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                                              <div>
                                                  <p className="text-xs font-bold text-slate-800">{u.name}</p>
                                                  <p className="text-[10px] text-slate-500 uppercase">{u.role}</p>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  {hasPermission('manageWorks') && (
                                      <button onClick={openEditWorkModal} className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-dashed border-slate-300 text-slate-400 hover:border-pms-500 hover:text-pms-500 transition-colors">
                                          <Plus size={20} />
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                   </div>
                </div>
            )}

            {workTab === 'KANBAN' && (
                <div className="h-full p-4 overflow-hidden">
                    <KanbanBoard 
                        tasks={activeTasks} 
                        users={users}
                        currentUser={currentUser}
                        taskStatuses={taskStatuses}
                        onUpdateTask={handleUpdateTask}
                        onAddTask={handleAddTask}
                        workId={selectedWork.id}
                    />
                </div>
            )}

            {workTab === 'FINANCE' && hasPermission('viewFinance') && (
                <div className="h-full p-6 overflow-y-auto">
                    <FinanceView 
                        records={activeFinance}
                        currentUser={currentUser}
                        users={users} // Pass Users for Supplier linking
                        work={selectedWork}
                        financeCategories={financeCategories}
                        onAddRecord={handleAddFinanceRecord}
                        onUpdateRecord={handleUpdateFinanceRecord}
                        onDeleteRecord={handleDeleteFinanceRecord}
                        onAddCategory={handleAddCategory}
                    />
                </div>
            )}

            {workTab === 'LOGS' && (
                <div className="h-full p-6 overflow-y-auto">
                    <DailyLogView 
                        logs={activeLogs}
                        users={users}
                        onAddLog={handleAddLog}
                    />
                </div>
            )}
        </div>
      </div>
    );
  };

  // Mobile Menu Rendering
  const renderMobileMenu = () => (
      <div className={`fixed inset-0 bg-slate-900 z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden`}>
          <div className="p-6 flex justify-between items-center border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                  <X size={24} />
              </button>
          </div>
          <nav className="p-6 space-y-4">
              <button onClick={() => { setSelectedWorkId(null); setActiveTab('DASHBOARD'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                  <LayoutDashboard size={24} /> Dashboard
              </button>
              {hasPermission('viewWorks') && (
                  <button onClick={() => { setSelectedWorkId(null); setActiveTab('WORKS'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                    <HardHat size={24} /> Obras
                </button>
              )}
               <button onClick={() => { setSelectedWorkId(null); setActiveTab('HISTORY'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                  <History size={24} /> Histórico
              </button>
              {hasPermission('viewGlobalTasks') && (
                  <button onClick={() => { setSelectedWorkId(null); setActiveTab('ALL_TASKS'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                    <ListTodo size={24} /> Tarefas
                  </button>
              )}
              {hasPermission('viewFinance') && (
                  <button onClick={() => { setSelectedWorkId(null); setActiveTab('FINANCE'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                    <Wallet size={24} /> Financeiro
                  </button>
              )}
              {hasPermission('viewMaterials') && (
                  <button onClick={() => { setSelectedWorkId(null); setActiveTab('MATERIALS'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                      <Package size={24} /> Materiais
                  </button>
              )}
              {hasPermission('manageUsers') && (
                  <button onClick={() => { setSelectedWorkId(null); setActiveTab('REGISTRATIONS'); setRegistrationSubTab('HUB'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-slate-300 hover:text-white text-lg w-full">
                      <Users size={24} /> Cadastros
                  </button>
              )}
          </nav>
      </div>
  );

  // Side Nav Helper: Organize works by status (ONLY ACTIVE)
  // Use visibleWorks here as well for sidebar
  const activeSidebarWorks = visibleWorks.filter(w => w.status !== WorkStatus.COMPLETED);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-full shadow-xl z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-pms-600 rounded-lg flex items-center justify-center font-bold text-white">P</div>
          <span className="text-lg font-bold tracking-tight">PMS Construtora</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scroll">
          <NavButton 
             active={activeTab === 'DASHBOARD' && !selectedWorkId} 
             onClick={() => { setSelectedWorkId(null); setActiveTab('DASHBOARD'); }} 
             icon={<LayoutDashboard size={20} />} label="Dashboard" 
          />
          
          {hasPermission('viewWorks') && (
              <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase">Obras Ativas</div>
                {activeSidebarWorks.map(w => (
                    <button 
                        key={w.id}
                        onClick={() => navigateToWorkBoard(w.id)}
                        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${selectedWorkId === w.id ? 'bg-pms-600 text-white shadow-md shadow-pms-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <span className="truncate">{w.name}</span>
                        {selectedWorkId === w.id && <ChevronRight size={14} />}
                    </button>
                ))}
                
                {/* History Button */}
                <NavButton 
                   active={activeTab === 'HISTORY' && !selectedWorkId} 
                   onClick={() => { setSelectedWorkId(null); setActiveTab('HISTORY'); }} 
                   icon={<History size={20} />} label="Histórico de Obras" 
                />
              </>
          )}

          <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase">Gestão</div>
          
          {hasPermission('manageUsers') && (
              <NavButton 
                  active={activeTab === 'REGISTRATIONS'} 
                  onClick={() => { setSelectedWorkId(null); setActiveTab('REGISTRATIONS'); setRegistrationSubTab('HUB'); }} 
                  icon={<Users size={20} />} label="Cadastros" 
              />
          )}

          {hasPermission('viewGlobalTasks') && (
             <NavButton 
                active={activeTab === 'ALL_TASKS'} 
                onClick={() => { setSelectedWorkId(null); setActiveTab('ALL_TASKS'); }} 
                icon={<ListTodo size={20} />} label="Tarefas Gerais" 
             />
          )}
          {hasPermission('viewFinance') && (
             <NavButton 
                active={activeTab === 'FINANCE' && !selectedWorkId} 
                onClick={() => { setSelectedWorkId(null); setActiveTab('FINANCE'); }} 
                icon={<Wallet size={20} />} label="Financeiro Global" 
             />
          )}
          {hasPermission('viewMaterials') && (
             <NavButton 
                active={activeTab === 'MATERIALS'} 
                onClick={() => { setSelectedWorkId(null); setActiveTab('MATERIALS'); }} 
                icon={<Package size={20} />} label="Materiais" 
             />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
            {/* User Profile Switcher (Simulating Auth) */}
            <div className="mb-4 px-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Simular Usuário</label>
                <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-white outline-none focus:border-pms-500"
                    value={currentUser.id}
                    onChange={(e) => {
                        const u = users.find(user => user.id === e.target.value);
                        if (u) setCurrentUser(u);
                    }}
                >
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                </select>
            </div>

            <button className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <LogOut size={20} />
                <span className="text-sm font-medium">Sair</span>
            </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-40 shadow-sm">
          <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="text-slate-600">
                  <Menu size={24} />
              </button>
              <span className="font-bold text-slate-800">PMS Manager</span>
          </div>
          <div className="h-8 w-8 bg-slate-200 rounded-full overflow-hidden">
              <img src={currentUser.avatar} alt="User" />
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative pt-16 md:pt-0">
        {selectedWorkId ? renderWorkBoard() : (
            <div className="h-full overflow-y-auto">
                {activeTab === 'DASHBOARD' && renderDashboard()}
                {activeTab === 'WORKS' && renderDashboard()} 
                {activeTab === 'HISTORY' && renderHistoryView()}
                {activeTab === 'REGISTRATIONS' && hasPermission('manageUsers') && renderRegistrationHub()}
                {activeTab === 'FINANCE' && hasPermission('viewFinance') && (
                    <div className="p-6">
                        <FinanceView 
                            records={finance} 
                            currentUser={currentUser}
                            users={users} // Pass users
                            financeCategories={financeCategories}
                            onAddRecord={handleAddFinanceRecord}
                            onUpdateRecord={handleUpdateFinanceRecord}
                            onDeleteRecord={handleDeleteFinanceRecord}
                            onAddCategory={handleAddCategory}
                        />
                    </div>
                )}
                {activeTab === 'ALL_TASKS' && hasPermission('viewGlobalTasks') && (
                    <GlobalTaskList 
                        tasks={tasks}
                        works={visibleWorks} 
                        users={users}
                        taskStatuses={taskStatuses}
                        onUpdateTask={handleUpdateTask}
                        onAddTask={handleAddTask}
                    />
                )}
                {activeTab === 'MATERIALS' && hasPermission('viewMaterials') && (
                    <MaterialOrders 
                        orders={orders}
                        works={works}
                        tasks={tasks}
                        users={users}
                        materials={materials} // Pass Materials
                        currentUser={currentUser}
                        onAddOrder={handleAddOrder}
                        onUpdateOrder={handleUpdateOrder}
                        onOpenMaterialCatalog={() => { // Shortcut Handler
                            setActiveTab('REGISTRATIONS');
                            setRegistrationSubTab('MATERIALS');
                        }}
                    />
                )}
            </div>
        )}
      </main>

      {renderMobileMenu()}

      {/* --- Modals --- */}

      {/* Create/Edit Work Modal */}
      {isEditWorkModalOpen && editingWork && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          {editingWork.id ? <Edit size={20} className="text-pms-600"/> : <Plus size={20} className="text-pms-600"/>}
                          {editingWork.id ? 'Editar Obra' : 'Nova Obra (Matriz)'}
                      </h3>
                      <button onClick={() => setIsEditWorkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 px-2">
                      {/* Main Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Obra</label>
                              <input 
                                  type="text" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                  value={editingWork.name}
                                  onChange={(e) => setEditingWork({...editingWork, name: e.target.value})}
                                  placeholder="Ex: Residencial Horizonte"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Cliente</label>
                              <select
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                                  value={editingWork.clientId || ''}
                                  onChange={(e) => {
                                      const selectedClient = users.find(u => u.id === e.target.value);
                                      setEditingWork({
                                          ...editingWork, 
                                          clientId: e.target.value,
                                          client: selectedClient ? selectedClient.name : ''
                                      })
                                  }}
                              >
                                  <option value="">Selecione um cliente...</option>
                                  {users.filter(u => u.category === 'CLIENT').map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                              </select>
                              <p className="text-[10px] text-slate-500 mt-1">Cadastre novos clientes no menu "Cadastros".</p>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Orçamento (R$)</label>
                              <input 
                                  type="number" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                  value={editingWork.budget}
                                  onChange={(e) => setEditingWork({...editingWork, budget: parseFloat(e.target.value)})}
                              />
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label>
                              <input 
                                  type="text" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                  value={editingWork.address}
                                  onChange={(e) => setEditingWork({...editingWork, address: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* Dates & Status */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
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
                              <label className="block text-sm font-bold text-slate-700 mb-1">Previsão Término</label>
                              <input 
                                  type="date" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                  value={editingWork.endDate}
                                  onChange={(e) => setEditingWork({...editingWork, endDate: e.target.value})}
                              />
                          </div>
                      </div>

                       {/* Status */}
                       <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Status Atual</label>
                            <div className="flex gap-2 flex-wrap">
                                {Object.values(WorkStatus).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setEditingWork({...editingWork, status})}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${editingWork.status === status ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                       </div>

                      {/* Description */}
                      <div className="mb-4">
                          <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                          <textarea 
                              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none h-20 resize-none"
                              value={editingWork.description}
                              onChange={(e) => setEditingWork({...editingWork, description: e.target.value})}
                          />
                      </div>
                      
                      {/* Image URL */}
                      <div className="mb-4">
                          <label className="block text-sm font-bold text-slate-700 mb-1">URL da Imagem (Capa)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none text-sm"
                                  value={editingWork.imageUrl}
                                  onChange={(e) => setEditingWork({...editingWork, imageUrl: e.target.value})}
                                  placeholder="https://..."
                              />
                              <div className="w-10 h-10 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                                  {editingWork.imageUrl && <img src={editingWork.imageUrl} className="w-full h-full object-cover" />}
                              </div>
                          </div>
                      </div>

                      {/* Team Assignment */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Equipe Vinculada</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {users.filter(u => u.category === 'EMPLOYEE').map(u => (
                                  <div 
                                      key={u.id} 
                                      onClick={() => toggleTeamMember(u.id)}
                                      className={`p-2 rounded border cursor-pointer flex items-center gap-2 transition-all ${editingWork.teamIds?.includes(u.id) ? 'bg-pms-50 border-pms-500 ring-1 ring-pms-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                  >
                                      <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                      <span className="text-xs font-bold text-slate-700 truncate">{u.name.split(' ')[0]}</span>
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
                          {editingWork.id ? 'Salvar Alterações' : 'Criar Obra'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

// Helper for Side Nav Buttons
const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-pms-600 text-white shadow-lg shadow-pms-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
);

export default App;
