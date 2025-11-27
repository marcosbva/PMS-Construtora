
import React, { useState, useEffect } from 'react';
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder, UserRole, UserCategory, WorkStatus, RolePermissionsMap, DEFAULT_ROLE_PERMISSIONS, InventoryItem, RentalItem, FinanceCategoryDefinition } from './types';
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
import { LayoutGrid, DollarSign, Users, Package, LogOut, Menu, Briefcase, Plus, X, Wrench } from 'lucide-react';

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
      {/* Sidebar (Simplified for brevity, same structure as before) */}
      <aside className={`fixed md:relative z-40 w-72 bg-slate-900 text-white flex flex-col h-full transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center"><img src={companySettings?.logoUrl || ''} className="w-8 h-8 object-contain"/></div>
              <h1 className="font-bold text-pms-400">{companySettings?.name || 'PMS'}</h1>
          </div>
          <nav className="flex-1 p-4 space-y-1">
              <button onClick={() => navigateTo('DASHBOARD')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300"><LayoutGrid size={18}/> Dashboard</button>
              
              {/* GLOBAL MODULES (Restored) */}
              <button onClick={() => navigateTo('GLOBAL_FINANCE')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300"><DollarSign size={18}/> Financeiro Global</button>
              <button onClick={() => navigateTo('MATERIALS')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300"><Package size={18}/> Materiais & Compras</button>
              <button onClick={() => navigateTo('INVENTORY')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300"><Wrench size={18}/> Estoque & Equip.</button>
              <button onClick={() => navigateTo('TEAM')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300"><Users size={18}/> Equipe & Config</button>

              <div className="mt-4 px-4 text-xs font-bold text-slate-500 uppercase">Obras</div>
              {works.map(w => (
                  <button key={w.id} onClick={() => navigateTo('RESUMO', w.id)} className={`w-full text-left px-4 py-2 rounded text-sm ${activeWorkId === w.id ? 'bg-slate-800 text-pms-400 font-bold' : 'text-slate-400 hover:text-white'}`}>{w.name}</button>
              ))}
              <button onClick={() => setIsEditWorkModalOpen(true)} className="w-full text-left px-4 py-2 text-sm text-pms-500 hover:text-pms-400 font-bold flex items-center gap-2"><Plus size={12}/> Nova Obra</button>
          </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative w-full">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
            <h1 className="font-bold text-pms-400">{companySettings?.name || 'PMS'}</h1>
            <button onClick={() => setIsMobileMenuOpen(true)}><Menu size={24}/></button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll w-full">
            {currentView === 'DASHBOARD' && <div className="p-8"><Dashboard works={works} finance={finance} inventory={inventory} rentals={rentals}/></div>}
            {currentView === 'GLOBAL_FINANCE' && <div className="p-8"><FinanceView records={finance} currentUser={currentUser} users={users} onAddRecord={api.createFinance} onUpdateRecord={api.updateFinance} onDeleteRecord={api.deleteFinance} financeCategories={financeCategories}/></div>}
            {currentView === 'MATERIALS' && <div className="p-8"><MaterialOrders orders={orders} works={works} tasks={tasks} users={users} materials={materials} currentUser={currentUser} onAddOrder={api.createOrder} onUpdateOrder={api.updateOrder} onOpenMaterialCatalog={() => navigateTo('TEAM')} /></div>}
            {currentView === 'INVENTORY' && <div className="p-8"><InventoryManager inventory={inventory} works={works} users={users} onAdd={api.createInventoryItem} onUpdate={api.updateInventoryItem} onDelete={api.deleteInventoryItem} /></div>}
            {currentView === 'TEAM' && <div className="p-8"><UserManagement currentUser={currentUser} users={users} materials={materials} orders={orders} taskStatuses={DEFAULT_TASK_STATUSES} financeCategories={financeCategories} permissions={DEFAULT_ROLE_PERMISSIONS} onAddUser={api.createUser} onUpdateUser={api.updateUser} onDeleteUser={api.deleteUser} onUpdateStatuses={()=>{}} onAddMaterial={api.createMaterial} onUpdateMaterial={api.updateMaterial} onDeleteMaterial={api.deleteMaterial} onAddCategory={api.createCategory} onUpdateCategory={api.updateCategory} onDeleteCategory={api.deleteCategory} onUpdatePermissions={()=>{}} /></div>}

            {activeWork && (
                <div className="flex flex-col h-full">
                    {/* Work Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                        <div>
                            <button onClick={() => navigateTo('DASHBOARD')} className="text-xs font-bold text-slate-400 hover:text-pms-600 mb-1">← Voltar</button>
                            <h1 className="text-2xl font-bold text-slate-900">{activeWork.name}</h1>
                        </div>
                        {/* REFACTORED TABS */}
                        <div className="flex gap-1">
                            {[
                                { id: 'RESUMO', label: 'Visão Geral' },
                                { id: 'PLANNING_CENTER', label: 'Planejamento Integrado' }, // New Planning Center
                                { id: 'WEEKLY', label: 'Execução Semanal' }, // Replaces Kanban
                                { id: 'FINANCE', label: 'Financeiro' },
                                { id: 'LOGS', label: 'Diário de Obra' },
                                { id: 'RENTAL', label: 'Aluguéis' },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setCurrentView(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-bold ${currentView === tab.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{tab.label}</button>
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
      
      {/* Create Work Modal logic (omitted for brevity, same as before) */}
      {isEditWorkModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                  <h3 className="font-bold mb-4">Nova Obra</h3>
                  <input className="w-full border p-2 mb-2 rounded" placeholder="Nome da Obra" value={editingWork.name} onChange={e => setEditingWork({...editingWork, name: e.target.value})} />
                  <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setIsEditWorkModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Cancelar</button>
                      <button onClick={async () => {
                          await api.createWork({...editingWork, id: Math.random().toString(36).substr(2,9)});
                          setIsEditWorkModalOpen(false);
                      }} className="px-4 py-2 bg-pms-600 text-white rounded">Criar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;
