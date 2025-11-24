import React, { useState, useEffect } from 'react';
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder, UserRole, UserCategory, WorkStatus, RolePermissionsMap, DEFAULT_ROLE_PERMISSIONS, FinanceType, TaskStatus, TaskPriority } from './types';
import { AuthScreen } from './components/AuthScreen';
import { KanbanBoard } from './components/KanbanBoard';
import { FinanceView } from './components/FinanceView';
import { GlobalTaskList } from './components/GlobalTaskList';
import { MaterialOrders } from './components/MaterialOrders';
import { UserManagement } from './components/UserManagement';
import { DailyLogView } from './components/DailyLog';
import { api } from './services/api';
import { DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES, DEFAULT_MATERIALS } from './constants';
import { Loader2, Trash2, LayoutGrid, HardHat, DollarSign, Users, Package, LogOut, Menu, Briefcase, Plus, X, AlertTriangle } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [works, setWorks] = useState<ConstructionWork[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finance, setFinance] = useState<FinancialRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_PERMISSIONS);

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

  // Fetch Data on Load
  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true);
          try {
              if (api.isOnline()) {
                  const [u, w, t, f, l, m, o] = await Promise.all([
                      api.getUsers(), api.getWorks(), api.getTasks(), api.getFinance(), api.getLogs(), api.getMaterials(), api.getOrders()
                  ]);
                  setUsers(u); setWorks(w); setTasks(t); setFinance(f); setLogs(l); setMaterials(m); setOrders(o);
                  if (m.length === 0) setMaterials(DEFAULT_MATERIALS);
              }
          } catch (error) {
              console.error("Failed to load data", error);
          } finally {
              setIsLoading(false);
          }
      };
      loadData();
  }, []);

  const handleLogin = (user: User) => setCurrentUser(user);
  
  const handleRegister = async (user: User) => {
      await api.createUser(user);
      setUsers([...users, user]);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setActiveWorkId(null);
      setCurrentView('DASHBOARD');
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
              setWorks(prev => prev.map(w => w.id === editingWork.id ? editingWork : w));
          } else {
              const newWork = { ...editingWork, id: Math.random().toString(36).substr(2, 9) };
              await api.createWork(newWork);
              setWorks(prev => [...prev, newWork]);
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
              // 1. Delete from Backend
              await api.deleteWork(id);
              
              // 2. Cascade Delete in Frontend State (Immediate Visual Feedback)
              setWorks(prev => prev.filter(w => w.id !== id));
              setTasks(prev => prev.filter(t => t.workId !== id));
              setFinance(prev => prev.filter(f => f.workId !== id));
              setLogs(prev => prev.filter(l => l.workId !== id));
              setOrders(prev => prev.filter(o => o.workId !== id));

              // 3. Close Modal and Reset Navigation
              setIsEditWorkModalOpen(false);
              
              // If we were inside the work we just deleted, go back to Dashboard
              if (activeWorkId === id) {
                  setActiveWorkId(null);
                  setCurrentView('WORKS');
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

  // --- DASHBOARD CALCULATIONS ---
  const activeWorksList = works.filter(w => w.status === WorkStatus.EXECUTION);
  const pendingTasksList = tasks.filter(t => t.status !== TaskStatus.DONE);
  const highPriorityTasks = tasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE);
  const totalBalance = finance.reduce((acc, curr) => {
      return curr.type === FinanceType.INCOME ? acc + curr.amount : acc - curr.amount;
  }, 0);

  if (!currentUser) {
      return <AuthScreen users={users} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  // --- RENDER MAIN LAYOUT ---
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-20 hidden md:flex">
          <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pms-600 rounded-lg flex items-center justify-center">
                      <HardHat size={24} />
                  </div>
                  <div>
                      <h1 className="font-bold text-lg leading-tight">PMS Eng.</h1>
                      <p className="text-xs text-slate-400">Gestão de Obras</p>
                  </div>
              </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
              <button onClick={() => { setCurrentView('DASHBOARD'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'DASHBOARD' && !activeWorkId ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <LayoutGrid size={18} /> Dashboard
              </button>
              <button onClick={() => { setCurrentView('WORKS'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'WORKS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Briefcase size={18} /> Obras
              </button>
              <button onClick={() => { setCurrentView('TASKS'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'TASKS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Menu size={18} /> Tarefas Gerais
              </button>
              <button onClick={() => { setCurrentView('FINANCE'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'FINANCE' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <DollarSign size={18} /> Financeiro Global
              </button>
              <button onClick={() => { setCurrentView('MATERIALS'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'MATERIALS' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Package size={18} /> Materiais & Compras
              </button>
              <button onClick={() => { setCurrentView('TEAM'); setActiveWorkId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${currentView === 'TEAM' ? 'bg-pms-600 text-white shadow-lg shadow-pms-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Users size={18} /> Equipe & Config
              </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-4 px-2">
                  <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
                  <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
                  </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white py-2 rounded-lg transition-colors text-sm font-bold">
                  <LogOut size={16} /> Sair
              </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Mobile Header */}
          <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-30">
              <div className="flex items-center gap-2">
                  <HardHat size={20} className="text-pms-600" />
                  <span className="font-bold">PMS Eng.</span>
              </div>
              <button onClick={handleLogout}><LogOut size={20}/></button>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
              {/* DYNAMIC CONTENT SWITCHER */}
              
              {currentView === 'DASHBOARD' && !activeWorkId && (
                  <div className="space-y-6 animate-fade-in">
                      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
                      
                      {/* KPI Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Works Card */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                  <HardHat size={24} />
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500 font-bold">Obras em Andamento</p>
                                  <p className="text-2xl font-bold text-slate-800">{activeWorksList.length}</p>
                              </div>
                          </div>

                          {/* Tasks Card */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                  <Briefcase size={24} />
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500 font-bold">Tarefas Pendentes</p>
                                  <p className="text-2xl font-bold text-slate-800">{pendingTasksList.length}</p>
                              </div>
                          </div>

                          {/* Finance Card */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${totalBalance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  <DollarSign size={24} />
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500 font-bold">Balanço Global</p>
                                  <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { notation: 'compact' })}
                                  </p>
                              </div>
                          </div>
                           {/* Team Card */}
                           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                  <Users size={24} />
                              </div>
                              <div>
                                  <p className="text-sm text-slate-500 font-bold">Equipe Ativa</p>
                                  <p className="text-2xl font-bold text-slate-800">{users.filter(u => u.status === 'ACTIVE').length}</p>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Active Works List */}
                          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-slate-800 text-lg">Obras Principais</h3>
                                  <button onClick={() => setCurrentView('WORKS')} className="text-sm text-pms-600 font-bold hover:underline">Ver todas</button>
                              </div>
                              <div className="space-y-4">
                                  {activeWorksList.slice(0, 3).map(work => (
                                       <div key={work.id} onClick={() => setActiveWorkId(work.id)} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-pms-300 hover:bg-slate-50 cursor-pointer transition-all">
                                           <div className="w-16 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                               {work.imageUrl ? <img src={work.imageUrl} className="w-full h-full object-cover"/> : <HardHat className="m-auto text-slate-400 mt-4"/>}
                                           </div>
                                           <div className="flex-1">
                                               <h4 className="font-bold text-slate-800">{work.name}</h4>
                                               <p className="text-xs text-slate-500">{work.address}</p>
                                               <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                   <div className="bg-pms-600 h-full" style={{width: `${work.progress}%`}}></div>
                                               </div>
                                           </div>
                                           <div className="text-right">
                                               <span className="text-xs font-bold text-slate-600 block">{work.progress}%</span>
                                               <span className="text-[10px] text-slate-400">Progresso</span>
                                           </div>
                                       </div>
                                  ))}
                                  {activeWorksList.length === 0 && <p className="text-slate-400 text-center py-4">Nenhuma obra em execução no momento.</p>}
                              </div>
                          </div>

                          {/* Urgent Tasks */}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                  <AlertTriangle size={20} className="text-red-500" /> Prioridade Alta
                              </h3>
                              <div className="space-y-3">
                                  {highPriorityTasks.slice(0, 5).map(task => (
                                      <div key={task.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                                           <p className="text-sm font-bold text-slate-800 line-clamp-1">{task.title}</p>
                                           <div className="flex justify-between items-center mt-2">
                                               <span className="text-[10px] text-red-600 font-bold bg-white px-2 py-0.5 rounded-full border border-red-100">{task.status}</span>
                                               <span className="text-[10px] text-slate-500">{works.find(w=>w.id===task.workId)?.name.substring(0, 15)}...</span>
                                           </div>
                                      </div>
                                  ))}
                                  {highPriorityTasks.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Nenhuma tarefa crítica pendente. Bom trabalho!</p>}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {currentView === 'WORKS' && !activeWorkId && (
                  <div>
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-2xl font-bold text-slate-800">Obras em Andamento</h2>
                          <button onClick={handleCreateWork} className="bg-pms-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-pms-500 shadow">
                              <Plus size={20} /> Nova Obra
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {works.map(work => (
                              <div key={work.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-slate-200 overflow-hidden group cursor-pointer" onClick={() => setActiveWorkId(work.id)}>
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

              {/* SINGLE WORK VIEW (TABS INSIDE) */}
              {activeWorkId && (
                  <div className="h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                          <button onClick={() => setActiveWorkId(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">← Voltar</button>
                          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                              {works.find(w => w.id === activeWorkId)?.name} 
                              <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Painel de Obra</span>
                          </h2>
                      </div>
                      
                      {/* Tabs for Work */}
                      <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
                          {['KANBAN', 'DIARIO', 'FINANCEIRO'].map(tab => (
                              <button 
                                key={tab}
                                onClick={() => setCurrentView(tab)}
                                className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${currentView === tab ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                              >
                                  {tab === 'KANBAN' ? 'Tarefas & Kanban' : tab === 'DIARIO' ? 'Diário de Obra' : 'Financeiro'}
                              </button>
                          ))}
                      </div>

                      <div className="flex-1 overflow-hidden">
                          {currentView === 'KANBAN' && (
                              <KanbanBoard 
                                workId={activeWorkId}
                                tasks={tasks.filter(t => t.workId === activeWorkId)}
                                users={users}
                                currentUser={currentUser}
                                taskStatuses={DEFAULT_TASK_STATUSES}
                                onAddTask={(t) => { setTasks([...tasks, t]); api.createTask(t); }}
                                onUpdateTask={(t) => { setTasks(tasks.map(old => old.id === t.id ? t : old)); api.updateTask(t); }}
                              />
                          )}
                          {currentView === 'DIARIO' && (
                              <DailyLogView 
                                workId={activeWorkId}
                                logs={logs.filter(l => l.workId === activeWorkId)}
                                users={users}
                                tasks={tasks.filter(t => t.workId === activeWorkId)}
                                currentUser={currentUser}
                                onAddLog={(l) => { setLogs([...logs, l]); api.createLog(l); }}
                                onUpdateLog={(l) => { setLogs(logs.map(old => old.id === l.id ? l : old)); api.updateLog(l); }}
                                onDeleteLog={(id) => { setLogs(logs.filter(l => l.id !== id)); api.deleteLog(id); }}
                              />
                          )}
                          {currentView === 'FINANCEIRO' && (
                              <FinanceView 
                                work={works.find(w => w.id === activeWorkId)}
                                records={finance.filter(f => f.workId === activeWorkId)}
                                users={users}
                                currentUser={currentUser}
                                financeCategories={DEFAULT_FINANCE_CATEGORIES}
                                onAddRecord={(r) => { setFinance([...finance, r]); api.createFinance(r); }}
                                onUpdateRecord={(r) => { setFinance(finance.map(old => old.id === r.id ? r : old)); api.updateFinance(r); }}
                                onDeleteRecord={(id) => { setFinance(finance.filter(f => f.id !== id)); api.deleteFinance(id); }}
                              />
                          )}
                      </div>
                  </div>
              )}

              {/* GLOBAL VIEWS */}
              {currentView === 'TASKS' && !activeWorkId && (
                  <GlobalTaskList 
                    tasks={tasks} 
                    works={works} 
                    users={users} 
                    taskStatuses={DEFAULT_TASK_STATUSES}
                    onAddTask={(t) => { setTasks([...tasks, t]); api.createTask(t); }}
                    onUpdateTask={(t) => { setTasks(tasks.map(old => old.id === t.id ? t : old)); api.updateTask(t); }}
                    onDeleteTask={(id) => { setTasks(tasks.filter(t => t.id !== id)); api.deleteTask(id); }}
                  />
              )}
              {currentView === 'FINANCE' && !activeWorkId && (
                  <FinanceView 
                    records={finance} 
                    users={users} 
                    currentUser={currentUser} 
                    financeCategories={DEFAULT_FINANCE_CATEGORIES}
                    onAddRecord={(r) => { setFinance([...finance, r]); api.createFinance(r); }}
                    onUpdateRecord={(r) => { setFinance(finance.map(old => old.id === r.id ? r : old)); api.updateFinance(r); }}
                    onDeleteRecord={(id) => { setFinance(finance.filter(f => f.id !== id)); api.deleteFinance(id); }}
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
                    onAddOrder={(o) => { setOrders([...orders, o]); api.createOrder(o); }}
                    onUpdateOrder={(o) => { setOrders(orders.map(old => old.id === o.id ? o : old)); api.updateOrder(o); }}
                    onOpenMaterialCatalog={() => setCurrentView('TEAM')}
                  />
              )}
              {currentView === 'TEAM' && !activeWorkId && (
                  <UserManagement 
                    currentUser={currentUser}
                    users={users}
                    materials={materials}
                    orders={orders}
                    taskStatuses={DEFAULT_TASK_STATUSES}
                    financeCategories={DEFAULT_FINANCE_CATEGORIES}
                    permissions={permissions}
                    onAddUser={(u) => { setUsers([...users, u]); api.createUser(u); }}
                    onUpdateUser={(u) => { setUsers(users.map(old => old.id === u.id ? u : old)); api.updateUser(u); }}
                    onDeleteUser={(id) => { setUsers(users.filter(u => u.id !== id)); }}
                    onAddMaterial={(m) => { setMaterials([...materials, m]); api.createMaterial(m); }}
                    onUpdateMaterial={(m) => { setMaterials(materials.map(old => old.id === m.id ? m : old)); api.updateMaterial(m); }}
                    onDeleteMaterial={(id) => { setMaterials(materials.filter(m => m.id !== id)); api.deleteMaterial(id); }}
                    onUpdateStatuses={() => {}}
                    onUpdatePermissions={setPermissions}
                  />
              )}
          </div>
      </main>

      {/* EDIT WORK MODAL */}
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
                            title="Excluir permanentemente"
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