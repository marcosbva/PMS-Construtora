
import React, { useState, useEffect } from 'react';
import { User, UserProfile, AppPermissions, UserCategory, UserRole, TaskStatusDefinition, Material, MaterialOrder, OrderStatus } from '../types';
import { Plus, Edit2, Trash2, X, Shield, User as UserIcon, Eye, Briefcase, Check, Settings, Contact, Truck, Users, List, Palette, ArrowUp, ArrowDown, Package, TrendingDown, TrendingUp } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  profiles: UserProfile[];
  materials: Material[];
  orders?: MaterialOrder[];
  initialTab?: 'EMPLOYEES' | 'CLIENTS' | 'SUPPLIERS' | 'PROFILES' | 'SETTINGS' | 'MATERIALS';
  taskStatuses: TaskStatusDefinition[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddProfile: (profile: UserProfile) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  onUpdateStatuses: (statuses: TaskStatusDefinition[]) => void;
  onAddMaterial: (material: Material) => void;
  onUpdateMaterial: (material: Material) => void;
  onDeleteMaterial: (materialId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
    users, profiles, materials, orders = [], initialTab = 'EMPLOYEES', taskStatuses,
    onAddUser, onUpdateUser, onDeleteUser,
    onAddProfile, onUpdateProfile, onDeleteProfile,
    onUpdateStatuses,
    onAddMaterial, onUpdateMaterial, onDeleteMaterial
}) => {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'CLIENTS' | 'SUPPLIERS' | 'PROFILES' | 'SETTINGS' | 'MATERIALS'>(initialTab);
  
  useEffect(() => {
      if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  
  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editingStatus, setEditingStatus] = useState<TaskStatusDefinition | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // --- USER FORM STATE ---
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userProfileId, setUserProfileId] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userBirth, setUserBirth] = useState('');

  // --- PROFILE FORM STATE ---
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [permissions, setPermissions] = useState<AppPermissions>({
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
  });

  // --- STATUS FORM STATE ---
  const [statusLabel, setStatusLabel] = useState('');
  const [statusColor, setStatusColor] = useState<'gray' | 'blue' | 'orange' | 'yellow' | 'red' | 'green' | 'purple'>('gray');

  // --- MATERIAL FORM STATE ---
  const [materialName, setMaterialName] = useState('');
  const [materialCategory, setMaterialCategory] = useState('');
  const [materialUnit, setMaterialUnit] = useState('');
  const [materialBrand, setMaterialBrand] = useState('');
  const [materialPrice, setMaterialPrice] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');

  // --- HELPERS ---
  const getCategoryLabel = (tab: string) => {
      switch(tab) {
          case 'EMPLOYEES': return 'Funcionários';
          case 'CLIENTS': return 'Clientes';
          case 'SUPPLIERS': return 'Fornecedores';
          case 'MATERIALS': return 'Materiais';
          default: return '';
      }
  };

  const getFilteredUsers = () => {
      if (activeTab === 'PROFILES' || activeTab === 'SETTINGS' || activeTab === 'MATERIALS') return [];
      const categoryMap: Record<string, UserCategory> = {
          'EMPLOYEES': 'EMPLOYEE',
          'CLIENTS': 'CLIENT',
          'SUPPLIERS': 'SUPPLIER'
      };
      const cat = categoryMap[activeTab];
      return users.filter(u => u.category === cat);
  };

  const getLastPurchaseInfo = (materialName: string) => {
      // Filter orders for this material that are purchased or delivered
      const history = orders
        .filter(o => o.itemName === materialName && (o.status === OrderStatus.PURCHASED || o.status === OrderStatus.DELIVERED) && o.finalCost && o.purchaseDate)
        .sort((a, b) => {
             const dateA = a.purchaseDate || '';
             const dateB = b.purchaseDate || '';
             return dateB.localeCompare(dateA);
        });
      
      if (history.length === 0) return null;
      
      const last = history[0];
      const supplier = users.find(u => u.id === last.supplierId);
      const unitPrice = last.finalCost ? (last.finalCost / last.quantity) : 0;
      
      return {
          unitPrice,
          supplierName: supplier ? supplier.name : 'Não ident.',
          date: last.purchaseDate
      };
  };

  // --- HANDLERS: USERS ---

  const openUserModal = (user?: User) => {
    if (user) {
        setEditingUser(user);
        setUserName(user.name);
        setUserEmail(user.email);
        setUserProfileId(user.profileId);
        setUserCpf(user.cpf || '');
        setUserAddress(user.address || '');
        setUserPhone(user.phone || '');
        setUserBirth(user.birthDate || '');
    } else {
        setEditingUser(null);
        setUserName('');
        setUserEmail('');
        setUserCpf('');
        setUserAddress('');
        setUserPhone('');
        setUserBirth('');
        // Default Profile based on category
        if (activeTab === 'CLIENTS') setUserProfileId(profiles.find(p => p.id === 'p_client')?.id || '');
        else if (activeTab === 'SUPPLIERS') setUserProfileId(profiles.find(p => p.id === 'p_supplier')?.id || '');
        else setUserProfileId(profiles[1]?.id || ''); // Partner default for employees
    }
    setIsUserModalOpen(true);
  };

  const saveUser = () => {
      if (!userName) return;
      
      const currentCategoryMap: Record<string, UserCategory> = {
        'EMPLOYEES': 'EMPLOYEE',
        'CLIENTS': 'CLIENT',
        'SUPPLIERS': 'SUPPLIER'
      };
      const category = currentCategoryMap[activeTab];

      // Auto-assign Role based on Category if not specified
      let role = UserRole.VIEWER;
      if (category === 'CLIENT') role = UserRole.CLIENT;
      if (category === 'EMPLOYEE') role = UserRole.MASTER; // Default

      if (editingUser) {
          onUpdateUser({
              ...editingUser,
              name: userName,
              email: userEmail,
              profileId: userProfileId,
              cpf: userCpf,
              address: userAddress,
              phone: userPhone,
              birthDate: userBirth
          });
      } else {
          onAddUser({
            id: Math.random().toString(36).substr(2, 9),
            name: userName,
            email: userEmail,
            profileId: userProfileId,
            category: category,
            role: role,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
            cpf: userCpf,
            address: userAddress,
            phone: userPhone,
            birthDate: userBirth
          });
      }
      setIsUserModalOpen(false);
  };

  // --- HANDLERS: PROFILES ---

  const openProfileModal = (profile?: UserProfile) => {
      if (profile) {
          setEditingProfile(profile);
          setProfileName(profile.name);
          setProfileDesc(profile.description);
          setPermissions(profile.permissions);
      } else {
          setEditingProfile(null);
          setProfileName('');
          setProfileDesc('');
          setPermissions({
            viewDashboard: true,
            viewWorks: true,
            manageWorks: false,
            viewFinance: false,
            manageFinance: false,
            viewGlobalTasks: false,
            viewMaterials: false,
            manageMaterials: false,
            manageUsers: false,
            isSystemAdmin: false
          });
      }
      setIsProfileModalOpen(true);
  };

  const saveProfile = () => {
      if (!profileName) return;

      if (editingProfile) {
          onUpdateProfile({
              ...editingProfile,
              name: profileName,
              description: profileDesc,
              permissions
          });
      } else {
          onAddProfile({
              id: `p_${Math.random().toString(36).substr(2, 6)}`,
              name: profileName,
              description: profileDesc,
              isSystem: false,
              permissions
          });
      }
      setIsProfileModalOpen(false);
  };

  const togglePermission = (key: keyof AppPermissions) => {
      setPermissions(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  // --- HANDLERS: STATUSES ---

  const openStatusModal = (status?: TaskStatusDefinition) => {
    if (status) {
      setEditingStatus(status);
      setStatusLabel(status.label);
      setStatusColor(status.colorScheme);
    } else {
      setEditingStatus(null);
      setStatusLabel('');
      setStatusColor('gray');
    }
    setIsStatusModalOpen(true);
  };

  const saveStatus = () => {
    if (!statusLabel) return;

    if (editingStatus) {
      const updated = taskStatuses.map(s => s.id === editingStatus.id ? { ...s, label: statusLabel, colorScheme: statusColor } : s);
      onUpdateStatuses(updated);
    } else {
      const newId = statusLabel.toUpperCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      const newStatus: TaskStatusDefinition = {
        id: newId,
        label: statusLabel,
        colorScheme: statusColor,
        order: taskStatuses.length
      };
      onUpdateStatuses([...taskStatuses, newStatus]);
    }
    setIsStatusModalOpen(false);
  };

  const deleteStatus = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este status?\n\nAtenção: Tarefas que estiverem neste status não aparecerão mais no quadro até serem movidas para outro status.")) {
      const updatedStatuses = taskStatuses.filter(s => s.id !== id);
      onUpdateStatuses(updatedStatuses);
    }
  };

  const moveStatus = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === taskStatuses.length - 1) return;

    const newStatuses = [...taskStatuses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    [newStatuses[index], newStatuses[targetIndex]] = [newStatuses[targetIndex], newStatuses[index]];

    // Update orders
    const reordered = newStatuses.map((s, i) => ({ ...s, order: i }));
    onUpdateStatuses(reordered);
  };

  // --- HANDLERS: MATERIALS ---
  const openMaterialModal = (material?: Material) => {
    if (material) {
        setEditingMaterial(material);
        setMaterialName(material.name);
        setMaterialCategory(material.category);
        setMaterialUnit(material.unit);
        setMaterialBrand(material.brand || '');
        setMaterialPrice(material.priceEstimate ? material.priceEstimate.toString() : '');
        setMaterialDesc(material.description || '');
    } else {
        setEditingMaterial(null);
        setMaterialName('');
        setMaterialCategory('Alvenaria');
        setMaterialUnit('un');
        setMaterialBrand('');
        setMaterialPrice('');
        setMaterialDesc('');
    }
    setIsMaterialModalOpen(true);
  };

  const saveMaterial = () => {
    if (!materialName) return;

    const materialData: Material = {
        id: editingMaterial ? editingMaterial.id : `mat_${Math.random().toString(36).substr(2, 9)}`,
        name: materialName,
        category: materialCategory,
        unit: materialUnit,
        brand: materialBrand || undefined,
        priceEstimate: materialPrice ? parseFloat(materialPrice) : undefined,
        description: materialDesc || undefined
    };

    if (editingMaterial) {
        onUpdateMaterial(materialData);
    } else {
        onAddMaterial(materialData);
    }
    setIsMaterialModalOpen(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastros e Acessos</h2>
          <p className="text-slate-500">Gerencie colaboradores, clientes, fornecedores e materiais.</p>
        </div>
        
        {/* Main Action Button */}
        {activeTab !== 'SETTINGS' && (
          <button 
            onClick={() => {
                if (activeTab === 'PROFILES') openProfileModal();
                else if (activeTab === 'MATERIALS') openMaterialModal();
                else openUserModal();
            }}
            className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
          >
            <Plus size={20} />
            {activeTab === 'PROFILES' ? 'Novo Perfil' : activeTab === 'MATERIALS' ? 'Novo Material' : `Novo ${getCategoryLabel(activeTab).slice(0, -1)}`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          <TabButton active={activeTab === 'EMPLOYEES'} onClick={() => setActiveTab('EMPLOYEES')} icon={<Users size={18}/>} label="Funcionários" />
          <TabButton active={activeTab === 'CLIENTS'} onClick={() => setActiveTab('CLIENTS')} icon={<Contact size={18}/>} label="Clientes" />
          <TabButton active={activeTab === 'SUPPLIERS'} onClick={() => setActiveTab('SUPPLIERS')} icon={<Truck size={18}/>} label="Fornecedores" />
          <TabButton active={activeTab === 'MATERIALS'} onClick={() => setActiveTab('MATERIALS')} icon={<Package size={18}/>} label="Materiais" />
          <TabButton active={activeTab === 'PROFILES'} onClick={() => setActiveTab('PROFILES')} icon={<Shield size={18}/>} label="Perfis de Acesso" />
          <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={18}/>} label="Configurações" />
      </div>

      {/* --- USERS LIST CONTENT --- */}
      {(activeTab === 'EMPLOYEES' || activeTab === 'CLIENTS' || activeTab === 'SUPPLIERS') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4 hidden sm:table-cell">Contato</th>
                <th className="px-6 py-4 hidden md:table-cell">Detalhes</th>
                <th className="px-6 py-4">Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {getFilteredUsers().map((user) => {
                    const userProfile = profiles.find(p => p.id === user.profileId);
                    return (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                                <div>
                                    <span className="font-bold text-slate-800 block">{user.name}</span>
                                    <span className="text-xs text-slate-500">{user.email}</span>
                                </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm hidden sm:table-cell">
                                {user.phone || '-'}
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                                {user.cpf && <div className="text-xs text-slate-500">CPF/CNPJ: {user.cpf}</div>}
                                {user.address && <div className="text-xs text-slate-500 truncate max-w-[200px]" title={user.address}>{user.address}</div>}
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                                    {userProfile?.name || 'Sem Perfil'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => openUserModal(user)}
                                    className="p-2 text-slate-400 hover:text-pms-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    onClick={() => onDeleteUser(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {getFilteredUsers().length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                            Nenhum registro encontrado para {getCategoryLabel(activeTab).toLowerCase()}.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      )}

      {/* --- MATERIALS TAB CONTENT --- */}
      {activeTab === 'MATERIALS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4">Preço Est.</th>
                <th className="px-6 py-4 bg-green-50/50 text-green-700">Últ. Pago (Unit.)</th>
                <th className="px-6 py-4 bg-blue-50/50 text-blue-700">Últ. Fornecedor</th>
                <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {materials.map((material) => {
                    const lastInfo = getLastPurchaseInfo(material.name);
                    
                    return (
                        <tr key={material.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{material.name}</span>
                                    {material.description && <span className="text-xs text-slate-500 truncate max-w-[250px]">{material.description}</span>}
                                    {material.brand && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded w-fit mt-1">Marca: {material.brand}</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                                    {material.category}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                {material.unit}
                            </td>
                            <td className="px-6 py-4">
                                {material.priceEstimate ? `R$ ${material.priceEstimate.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-6 py-4 bg-green-50/20">
                                {lastInfo ? (
                                    <div>
                                        <span className="text-sm font-bold text-green-700">R$ {lastInfo.unitPrice.toFixed(2)}</span>
                                        <div className="text-[10px] text-slate-400">
                                            {new Date(lastInfo.date || '').toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 bg-blue-50/20">
                                {lastInfo ? (
                                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                        <Truck size={12} />
                                        {lastInfo.supplierName}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openMaterialModal(material)}
                                        className="p-2 text-slate-400 hover:text-pms-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar Material"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteMaterial(material.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir Material"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                {materials.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                            Nenhum material cadastrado.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
            </div>
        </div>
      )}

      {/* --- PROFILES TAB CONTENT --- */}
      {activeTab === 'PROFILES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
              {profiles.map(profile => (
                  <div key={profile.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group">
                      <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                  <Shield className={profile.permissions.isSystemAdmin ? "text-pms-600" : "text-slate-400"} size={20} />
                                  <h3 className="font-bold text-slate-800 text-lg">{profile.name}</h3>
                              </div>
                              {profile.isSystem && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Sistema</span>}
                          </div>
                          <p className="text-sm text-slate-500 mb-4">{profile.description}</p>
                          
                          <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Acessos:</p>
                              {profile.permissions.isSystemAdmin ? (
                                  <span className="text-sm text-pms-600 font-medium flex items-center gap-2"><Check size={14}/> Acesso Total (Admin)</span>
                              ) : (
                                  <div className="flex flex-wrap gap-2">
                                      {profile.permissions.viewDashboard && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-100">Dashboard</span>}
                                      {profile.permissions.viewFinance && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] rounded border border-green-100">Financeiro</span>}
                                      {profile.permissions.manageWorks && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100">Editar Obras</span>}
                                      {profile.permissions.manageUsers && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded border border-purple-100">Gerir Usuários</span>}
                                      {/* Fallback if few permissions */}
                                      {!profile.permissions.viewDashboard && !profile.permissions.viewWorks && !profile.permissions.viewMaterials && (
                                          <span className="text-xs text-red-400">Acesso restrito</span>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                      <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end gap-2">
                          <button 
                            onClick={() => openProfileModal(profile)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white hover:text-pms-600 rounded border border-transparent hover:border-slate-200 transition-all"
                          >
                              <Settings size={14} /> Configurar
                          </button>
                          {!profile.isSystem && (
                              <button 
                                onClick={() => onDeleteProfile(profile.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                  <Trash2 size={14} /> Excluir
                              </button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- SETTINGS TAB CONTENT (Task Statuses) --- */}
      {activeTab === 'SETTINGS' && (
        <div className="animate-fade-in space-y-8">
          {/* Task Statuses Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <div>
                 <h3 className="font-bold text-lg text-slate-800">Status de Tarefas (Kanban)</h3>
                 <p className="text-sm text-slate-500">Defina as colunas do quadro Kanban, suas cores e ordem.</p>
               </div>
               <button 
                  onClick={() => openStatusModal()}
                  type="button"
                  className="text-sm bg-pms-600 hover:bg-pms-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  <Plus size={16} /> Novo Status
                </button>
            </div>
            <div className="p-0">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-3">Ordem</th>
                    <th className="px-6 py-3">Nome do Status</th>
                    <th className="px-6 py-3">Cor (Tema)</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {taskStatuses.map((status, index) => (
                    <tr key={status.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4 text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{status.label}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${status.colorScheme}-100 text-${status.colorScheme}-700 border border-${status.colorScheme}-200 capitalize`}>
                           {status.colorScheme}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                            <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveStatus(index, 'up');
                                }} 
                                disabled={index === 0}
                                className="p-2 text-slate-400 hover:text-pms-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 rounded transition-colors"
                                title="Mover para cima"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  moveStatus(index, 'down');
                                }} 
                                disabled={index === taskStatuses.length - 1}
                                className="p-2 text-slate-400 hover:text-pms-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 rounded transition-colors"
                                title="Mover para baixo"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openStatusModal(status);
                              }} 
                              className="p-2 text-slate-400 hover:text-pms-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteStatus(status.id);
                              }} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Excluir Status"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- USER / ENTITY MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
              <h3 className="text-xl font-bold text-slate-800">
                  {editingUser ? 'Editar Cadastro' : `Novo ${getCategoryLabel(activeTab).slice(0, -1)}`}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo / Razão Social</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex: João da Silva ou Construtora XYZ"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="joao@email.com"
                    />
                  </div>

                   <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Telefone / Celular</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CPF / CNPJ</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userCpf}
                      onChange={(e) => setUserCpf(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Data de Nascimento</label>
                    <input 
                      type="date" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userBirth}
                      onChange={(e) => setUserBirth(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Endereço Completo</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                    />
                  </div>

                  <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Perfil de Acesso ao Sistema</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                      value={userProfileId}
                      onChange={(e) => setUserProfileId(e.target.value)}
                    >
                        <option value="" disabled>Selecione um perfil</option>
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Defina se este cadastro terá acesso ao sistema e quais suas permissões.</p>
                  </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={saveUser} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-medium shadow-md">
                Salvar Cadastro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFILE MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield size={24} className="text-pms-600"/>
                    {editingProfile ? 'Configurar Perfil' : 'Novo Perfil de Acesso'}
                </h3>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
             </div>

             <div className="overflow-y-auto custom-scroll px-1 flex-1">
                 {/* Basic Info */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Perfil</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Ex: Financeiro Junior"
                        />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                            value={profileDesc}
                            onChange={(e) => setProfileDesc(e.target.value)}
                            placeholder="Ex: Acesso apenas para lançar despesas"
                        />
                     </div>
                 </div>

                 {/* Permission Toggles */}
                 <div className="space-y-4">
                     <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-3">Definição de Permissões</h4>
                     
                     {/* Admin Override */}
                     <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-center justify-between">
                         <div>
                             <p className="font-bold text-purple-800 text-sm">Super Administrador</p>
                             <p className="text-xs text-purple-600">Acesso irrestrito a todas as funções do sistema.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={permissions.isSystemAdmin} onChange={() => togglePermission('isSystemAdmin')} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                         </label>
                     </div>

                     <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${permissions.isSystemAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                         {/* Permission Items */}
                         {[
                             { id: 'viewDashboard', label: 'Visualizar Dashboard', desc: 'Acesso à tela inicial e resumos.' },
                             { id: 'viewWorks', label: 'Visualizar Obras', desc: 'Ver lista de obras e detalhes básicos.' },
                             { id: 'manageWorks', label: 'Gerenciar Obras', desc: 'Criar, editar e excluir obras e equipes.' },
                             { id: 'viewFinance', label: 'Visualizar Financeiro', desc: 'Ver gráficos e relatórios globais.' },
                             { id: 'manageFinance', label: 'Gerenciar Financeiro', desc: 'Lançar e editar receitas/despesas.' },
                             { id: 'viewMaterials', label: 'Visualizar Materiais', desc: 'Ver pedidos e relatórios de materiais.' },
                             { id: 'manageMaterials', label: 'Gerenciar Materiais', desc: 'Criar e atualizar pedidos de compra.' },
                             { id: 'viewGlobalTasks', label: 'Tarefas Globais', desc: 'Ver lista consolidada de tarefas.' },
                             { id: 'manageUsers', label: 'Gestão de Usuários', desc: 'Criar perfis e usuários (Perigo).' },
                         ].map((item) => (
                             <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                 <div className="pt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-pms-600 rounded focus:ring-pms-500 border-gray-300"
                                        checked={(permissions as any)[item.id]}
                                        onChange={() => togglePermission(item.id as keyof AppPermissions)}
                                    />
                                 </div>
                                 <div>
                                     <p className="font-bold text-sm text-slate-700">{item.label}</p>
                                     <p className="text-xs text-slate-500 leading-tight">{item.desc}</p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancelar
                </button>
                <button onClick={saveProfile} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-medium shadow-lg">
                    {editingProfile ? 'Salvar Alterações' : 'Criar Perfil'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MATERIAL MODAL --- */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Package size={20} className="text-pms-600"/>
                    {editingMaterial ? 'Editar Material' : 'Novo Material'}
                 </h3>
                 <button onClick={() => setIsMaterialModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[70vh]">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Material</label>
                     <input 
                        type="text" 
                        placeholder="Ex: Cimento CP II"
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                        value={materialName}
                        onChange={(e) => setMaterialName(e.target.value)}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label>
                        <select 
                           className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                           value={materialCategory}
                           onChange={(e) => setMaterialCategory(e.target.value)}
                        >
                           <option value="Alvenaria">Alvenaria</option>
                           <option value="Elétrica">Elétrica</option>
                           <option value="Hidráulica">Hidráulica</option>
                           <option value="Pintura">Pintura</option>
                           <option value="Acabamento">Acabamento</option>
                           <option value="Outros">Outros</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Unidade de Medida</label>
                        <select 
                           className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none bg-white"
                           value={materialUnit}
                           onChange={(e) => setMaterialUnit(e.target.value)}
                        >
                           <option value="un">Unidade (un)</option>
                           <option value="saco">Saco</option>
                           <option value="kg">Quilo (kg)</option>
                           <option value="m">Metro (m)</option>
                           <option value="m²">Metro Quadrado (m²)</option>
                           <option value="m³">Metro Cúbico (m³)</option>
                           <option value="lata">Lata</option>
                           <option value="caixa">Caixa</option>
                           <option value="milheiro">Milheiro</option>
                        </select>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Marca (Opcional)</label>
                        <input 
                           type="text" 
                           placeholder="Ex: Votoran"
                           className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                           value={materialBrand}
                           onChange={(e) => setMaterialBrand(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Preço Estimado (R$)</label>
                        <input 
                           type="number" 
                           placeholder="0.00"
                           className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                           value={materialPrice}
                           onChange={(e) => setMaterialPrice(e.target.value)}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-1">Descrição / Observações</label>
                     <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none h-24 resize-none"
                        placeholder="Dimensões, especificações técnicas..."
                        value={materialDesc}
                        onChange={(e) => setMaterialDesc(e.target.value)}
                     />
                  </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                 <button onClick={() => setIsMaterialModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancelar
                 </button>
                 <button onClick={saveMaterial} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-md">
                    {editingMaterial ? 'Salvar' : 'Cadastrar'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- STATUS MODAL --- */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <List size={20} className="text-pms-600"/>
                    {editingStatus ? 'Editar Status' : 'Novo Status'}
                 </h3>
                 <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Status</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                      value={statusLabel}
                      onChange={(e) => setStatusLabel(e.target.value)}
                      placeholder="Ex: Em Aprovação"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Cor do Tema (Kanban)</label>
                    <div className="grid grid-cols-4 gap-2">
                       {['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple'].map((color) => (
                          <button
                             key={color}
                             onClick={() => setStatusColor(color as any)}
                             className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${
                                statusColor === color ? 'border-slate-800 scale-105' : 'border-transparent hover:scale-105'
                             } bg-${color}-100`}
                          >
                             <div className={`w-4 h-4 rounded-full bg-${color}-500`}></div>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                 <button onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    Cancelar
                 </button>
                 <button onClick={saveStatus} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-bold shadow-md">
                    Salvar
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button 
      onClick={onClick}
      className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
          active ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
);
