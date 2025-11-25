

import React, { useState, useEffect, useMemo } from 'react';
import { User, UserCategory, UserRole, TaskStatusDefinition, Material, MaterialOrder, OrderStatus, FinanceCategoryDefinition, RolePermissionsMap, AppPermissions, DailyLog } from '../types';
import { Plus, Edit2, Trash2, X, Shield, User as UserIcon, Eye, Briefcase, Check, Settings, Contact, Truck, Users, List, Palette, ArrowUp, ArrowDown, Package, TrendingDown, TrendingUp, Wallet, Tag, Cloud, Database, Save, LogOut, Lock, AlertCircle, UserCheck, Activity, RefreshCw, AlertTriangle, Loader2, Camera, Upload, Link as LinkIcon, CheckSquare, Square, Key, Copy, ShieldCheck, Phone, Building2, MapPin, Globe, CreditCard, History, ShoppingBag, Search, MessageCircle, Smartphone } from 'lucide-react';
import { initializeFirebase, disconnectFirebase, getSavedConfig, getDb, createSecondaryAuthUser } from '../services/firebase';
import { api } from '../services/api';
import { uploadFile } from '../services/storage';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, badge }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap min-w-fit ${
            active 
                ? 'border-pms-600 text-pms-600 bg-blue-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
    >
        {icon}
        {label}
        {(badge || 0) > 0 && (
            <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-in zoom-in">
                {badge}
            </span>
        )}
    </button>
);

interface UserManagementProps {
  currentUser: User;
  users: User[];
  materials: Material[];
  orders?: MaterialOrder[];
  logs?: DailyLog[]; 
  initialTab?: 'INTERNAL' | 'CLIENTS' | 'SUPPLIERS' | 'SETTINGS' | 'MATERIALS' | 'FINANCE_CATEGORIES' | 'PERMISSIONS';
  taskStatuses: TaskStatusDefinition[];
  financeCategories?: FinanceCategoryDefinition[];
  permissions: RolePermissionsMap;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateStatuses: (statuses: TaskStatusDefinition[]) => void;
  onAddMaterial: (material: Material) => void;
  onUpdateMaterial: (material: Material) => void;
  onDeleteMaterial: (materialId: string) => void;
  onAddCategory?: (category: FinanceCategoryDefinition) => void;
  onUpdateCategory?: (category: FinanceCategoryDefinition) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onUpdatePermissions: (permissions: RolePermissionsMap) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
    currentUser, 
    users, materials, orders = [], logs = [], initialTab = 'INTERNAL', taskStatuses,
    financeCategories = [], permissions,
    onAddUser, onUpdateUser, onDeleteUser,
    onUpdateStatuses,
    onAddMaterial, onUpdateMaterial, onDeleteMaterial,
    onAddCategory, onUpdateCategory, onDeleteCategory,
    onUpdatePermissions
}) => {
  const [activeTab, setActiveTab] = useState<'INTERNAL' | 'CLIENTS' | 'SUPPLIERS' | 'SETTINGS' | 'MATERIALS' | 'FINANCE_CATEGORIES' | 'PERMISSIONS'>(initialTab);
  
  useEffect(() => {
      if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [supplierModalTab, setSupplierModalTab] = useState<'DATA' | 'HISTORY'>('DATA');
  
  // Feedback Modal State (New User Credentials)
  const [createdUserCreds, setCreatedUserCreds] = useState<{email: string, pass: string} | null>(null);

  // Cloud State
  const isCloudConnected = !!getDb();

  // Loading State
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingStatus, setEditingStatus] = useState<TaskStatusDefinition | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinanceCategoryDefinition | null>(null);

  // Permission Editing State
  const [localPermissions, setLocalPermissions] = useState<RolePermissionsMap>(permissions);

  // Company Settings State
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Update local permissions if parent state changes (sync)
  useEffect(() => {
      setLocalPermissions(permissions);
  }, [permissions]);

  // Load Company Settings on Tab Change
  useEffect(() => {
      if (activeTab === 'SETTINGS') {
          api.getCompanySettings().then(settings => {
              if (settings) {
                  setCompanyName(settings.name || '');
                  setCompanyPhone(settings.phone || '');
                  setCompanyLogo(settings.logoUrl || '');
              }
          });
      }
  }, [activeTab]);

  // --- FORM STATES ---
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userCategory, setUserCategory] = useState<UserCategory>(UserCategory.INTERNAL);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.VIEWER);
  const [userStatus, setUserStatus] = useState<'ACTIVE'|'PENDING'|'BLOCKED'>('ACTIVE');
  const [userCpf, setUserCpf] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userBirth, setUserBirth] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  
  // Supplier Specific Form States
  const [userCnpj, setUserCnpj] = useState('');
  const [userLegalName, setUserLegalName] = useState('');
  const [userTradeName, setUserTradeName] = useState('');
  const [userWebsite, setUserWebsite] = useState('');
  const [userPaymentInfo, setUserPaymentInfo] = useState('');
  const [userSellerName, setUserSellerName] = useState('');
  const [userSellerPhone, setUserSellerPhone] = useState('');

  const [statusLabel, setStatusLabel] = useState('');
  const [statusColor, setStatusColor] = useState<'gray' | 'blue' | 'orange' | 'yellow' | 'red' | 'green' | 'purple'>('gray');

  const [materialName, setMaterialName] = useState('');
  const [materialCategory, setMaterialCategory] = useState('');
  const [materialUnit, setMaterialUnit] = useState('');
  const [materialBrand, setMaterialBrand] = useState('');
  const [materialPrice, setMaterialPrice] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'EXPENSE' | 'INCOME' | 'BOTH'>('BOTH');

  // --- HELPERS ---
  const getCategoryLabel = (tab: string) => {
      switch(tab) {
          case 'INTERNAL': return 'Equipe Interna';
          case 'CLIENTS': return 'Clientes';
          case 'SUPPLIERS': return 'Fornecedores';
          case 'MATERIALS': return 'Materiais';
          case 'FINANCE_CATEGORIES': return 'Categorias Financeiras';
          case 'PERMISSIONS': return 'Permissões de Acesso';
          default: return '';
      }
  };

  const getFilteredUsers = () => {
      if (activeTab === 'SETTINGS' || activeTab === 'MATERIALS' || activeTab === 'FINANCE_CATEGORIES' || activeTab === 'PERMISSIONS') return [];
      const categoryMap: Record<string, UserCategory> = {
          'INTERNAL': UserCategory.INTERNAL,
          'CLIENTS': UserCategory.CLIENT,
          'SUPPLIERS': UserCategory.SUPPLIER
      };
      const cat = categoryMap[activeTab];
      return users
        .filter(u => u.category === cat)
        .sort((a, b) => {
            if (currentUser.id === a.id) return -1; // Current User first
            if (currentUser.id === b.id) return 1;
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
  };
  
  const pendingCount = users.filter(u => u.status === 'PENDING').length;

  // --- SUPPLIER HISTORY LOGIC ---
  const supplierHistory = useMemo(() => {
      if (!editingUser || editingUser.category !== UserCategory.SUPPLIER) return [];
      return orders.filter(o => o.supplierId === editingUser.id && (o.status === OrderStatus.PURCHASED || o.status === OrderStatus.DELIVERED))
                   .sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [editingUser, orders]);

  const supplierTotalSales = useMemo(() => {
      return supplierHistory.reduce((acc, order) => acc + (order.finalCost || 0), 0);
  }, [supplierHistory]);

  // --- HANDLERS ---
  
  const handleCnpjLookup = async () => {
      if (!userCnpj) {
          alert("Digite o CNPJ para buscar.");
          return;
      }
      
      const cleanCnpj = userCnpj.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) {
          alert("CNPJ inválido. Digite 14 números.");
          return;
      }

      setIsSearchingCnpj(true);
      try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (!response.ok) throw new Error("CNPJ não encontrado ou erro na API.");
          
          const data = await response.json();
          
          setUserLegalName(data.razao_social || '');
          setUserTradeName(data.nome_fantasia || data.razao_social || '');
          setUserName(data.nome_fantasia || data.razao_social || '');
          
          const address = `${data.logradouro}, ${data.numero} ${data.complemento ? '- ' + data.complemento : ''} - ${data.bairro}, ${data.municipio} - ${data.uf}, CEP: ${data.cep}`;
          setUserAddress(address);
          
          if (data.ddd_telefone_1) {
              setUserPhone(`(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}`);
          }

      } catch (error: any) {
          alert("Erro ao buscar CNPJ: " + error.message);
      } finally {
          setIsSearchingCnpj(false);
      }
  };

  const openUserModal = (user?: User) => {
    setSupplierModalTab('DATA');
    if (user) {
        setEditingUser(user);
        setUserName(user.name);
        setUserEmail(user.email);
        setUserCategory(user.category);
        setUserRole(user.role);
        setUserStatus(user.status || 'ACTIVE');
        setUserCpf(user.cpf || '');
        setUserAddress(user.address || '');
        setUserPhone(user.phone || '');
        setUserBirth(user.birthDate || '');
        setUserAvatar(user.avatar || '');
        
        // Supplier fields
        setUserCnpj(user.cnpj || '');
        setUserLegalName(user.legalName || '');
        setUserTradeName(user.tradeName || '');
        setUserWebsite(user.website || '');
        setUserPaymentInfo(user.paymentInfo || '');
        setUserSellerName(user.sellerName || '');
        setUserSellerPhone(user.sellerPhone || '');
    } else {
        setEditingUser(null);
        setUserName('');
        setUserEmail('');
        setUserStatus('ACTIVE');
        setUserCpf('');
        setUserAddress('');
        setUserPhone('');
        setUserBirth('');
        setUserAvatar('');
        
        // Clear supplier fields
        setUserCnpj('');
        setUserLegalName('');
        setUserTradeName('');
        setUserWebsite('');
        setUserPaymentInfo('');
        setUserSellerName('');
        setUserSellerPhone('');
        
        // Defaults based on Tab
        if (activeTab === 'CLIENTS') {
            setUserCategory(UserCategory.CLIENT);
            setUserRole(UserRole.VIEWER);
        } else if (activeTab === 'SUPPLIERS') {
            setUserCategory(UserCategory.SUPPLIER);
            setUserRole(UserRole.VIEWER);
        } else {
            setUserCategory(UserCategory.INTERNAL);
            setUserRole(UserRole.EDITOR);
        }
    }
    setIsUserModalOpen(true);
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        let targetId = editingUser?.id || 'temp_new_user';
        
        try {
            const url = await uploadFile(file, `usuarios/${targetId}`, { type: 'user_avatar' });
            setUserAvatar(url);
        } catch (error: any) {
            alert("Erro ao enviar avatar: " + error.message);
        }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          setIsUploadingLogo(true);
          try {
              const url = await uploadFile(file, `logos/${currentUser.id}`, { type: 'company_logo' });
              setCompanyLogo(url);
          } catch (error: any) {
              alert("Erro ao enviar logo: " + error.message);
          } finally {
              setIsUploadingLogo(false);
          }
      }
  };

  const handleSaveSettings = async () => {
      setIsSaving(true);
      try {
          await api.updateCompanySettings({
              name: companyName,
              phone: companyPhone,
              logoUrl: companyLogo
          });
          alert("Configurações salvas com sucesso!");
      } catch (error) {
          alert("Erro ao salvar configurações.");
      } finally {
          setIsSaving(false);
      }
  };

  const generateTemporaryPassword = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
      let pass = "";
      for (let i = 0; i < 8; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
  };

  const saveUser = async () => {
      if (!userName) return;
      setIsSaving(true);
      try {
        const finalAvatar = userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
        // Safety: If Client, enforce VIEWER role always
        const finalRole = userCategory === UserCategory.CLIENT ? UserRole.VIEWER : userRole;

        let uid = editingUser ? editingUser.id : Math.random().toString(36).substr(2, 9);
        let mustChangePassword = editingUser?.mustChangePassword || false;
        let tempPassword = "";

        // --- CREATE AUTH USER LOGIC (NEW USER & ONLINE) ---
        // Only create auth for INTERNAL users or CLIENTS. Suppliers usually don't login in this version.
        if (!editingUser && isCloudConnected && userEmail && (userCategory === UserCategory.INTERNAL || userCategory === UserCategory.CLIENT)) {
            tempPassword = generateTemporaryPassword();
            try {
                uid = await createSecondaryAuthUser(userEmail, tempPassword);
                mustChangePassword = true; 
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use') {
                     alert("Este e-mail já está cadastrado no sistema de autenticação.");
                     setIsSaving(false);
                     return;
                } else {
                    throw authError;
                }
            }
        }

        const userData: User = {
            id: uid,
            name: userName, 
            email: userEmail, 
            category: userCategory, 
            role: finalRole, 
            status: userStatus, 
            cpf: userCpf, 
            address: userAddress, 
            phone: userPhone, 
            birthDate: userBirth,
            avatar: finalAvatar,
            mustChangePassword: mustChangePassword,
            // Supplier Fields
            cnpj: userCnpj,
            legalName: userLegalName,
            tradeName: userTradeName,
            website: userWebsite,
            paymentInfo: userPaymentInfo,
            sellerName: userSellerName,
            sellerPhone: userSellerPhone
        };

        if (editingUser) {
            await onUpdateUser({ ...editingUser, ...userData });
        } else {
            await onAddUser(userData);
            if (tempPassword) {
                setCreatedUserCreds({ email: userEmail, pass: tempPassword });
            }
        }
        setIsUserModalOpen(false);
      } catch (error: any) {
          alert("Erro ao salvar usuário: " + error.message);
      } finally {
          setIsSaving(false);
      }
  };

  const openMaterialModal = (material?: Material) => {
    if (material) { setEditingMaterial(material); setMaterialName(material.name); setMaterialCategory(material.category); setMaterialUnit(material.unit); setMaterialBrand(material.brand || ''); setMaterialPrice(material.priceEstimate ? material.priceEstimate.toString() : ''); setMaterialDesc(material.description || ''); } 
    else { setEditingMaterial(null); setMaterialName(''); setMaterialCategory('Alvenaria'); setMaterialUnit('un'); setMaterialBrand(''); setMaterialPrice(''); setMaterialDesc(''); }
    setIsMaterialModalOpen(true);
  };

  const saveMaterial = async () => {
    if (!materialName) return;
    setIsSaving(true);
    try {
        const materialData: Material = { id: editingMaterial ? editingMaterial.id : `mat_${Math.random().toString(36).substr(2, 9)}`, name: materialName, category: materialCategory, unit: materialUnit, brand: materialBrand || undefined, priceEstimate: materialPrice ? parseFloat(materialPrice) : undefined, description: materialDesc || undefined };
        if (editingMaterial) await onUpdateMaterial(materialData); 
        else await onAddMaterial(materialData);
        setIsMaterialModalOpen(false);
    } catch (error: any) {
        alert("Erro ao salvar material: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const openCategoryModal = (cat?: FinanceCategoryDefinition) => {
      if (cat) { setEditingCategory(cat); setCategoryName(cat.name); setCategoryType(cat.type); } 
      else { setEditingCategory(null); setCategoryName(''); setCategoryType('BOTH'); }
      setIsCategoryModalOpen(true);
  };

  const saveCategory = async () => {
      if (!categoryName || !onAddCategory || !onUpdateCategory) return;
      setIsSaving(true);
      try {
          const catData: FinanceCategoryDefinition = { id: editingCategory ? editingCategory.id : `cat_${Math.random().toString(36).substr(2, 9)}`, name: categoryName, type: categoryType };
          if (editingCategory) await onUpdateCategory(catData); 
          else await onAddCategory(catData);
          setIsCategoryModalOpen(false);
      } catch (error: any) {
          alert("Erro ao salvar categoria: " + error.message);
      } finally {
          setIsSaving(false);
      }
  };

  // --- PERMISSION HANDLERS ---
  const togglePermission = (role: UserRole, key: keyof AppPermissions) => {
      setLocalPermissions(prev => {
          const newPermissions = { ...prev };
          newPermissions[role] = {
              ...newPermissions[role],
              [key]: !newPermissions[role][key]
          };
          return newPermissions;
      });
  };

  const savePermissions = async () => {
      setIsSaving(true);
      try {
          await onUpdatePermissions(localPermissions);
          alert("Permissões atualizadas com sucesso!");
      } catch (error) {
          alert("Erro ao salvar permissões.");
      } finally {
          setIsSaving(false);
      }
  };

  const PERMISSION_LABELS: Record<keyof AppPermissions, string> = {
      viewDashboard: "Visualizar Dashboard Geral",
      viewWorks: "Visualizar Lista de Obras",
      manageWorks: "Gerenciar (Criar/Editar) Obras",
      viewFinance: "Visualizar Módulo Financeiro",
      manageFinance: "Gerenciar Financeiro (Lançamentos)",
      viewGlobalTasks: "Visualizar Tarefas (Kanban)",
      viewMaterials: "Visualizar Catálogo de Materiais",
      manageMaterials: "Gerenciar Materiais e Pedidos",
      manageUsers: "Gerenciar Usuários e Configurações",
      isSystemAdmin: "Administrador do Sistema (Acesso Total)"
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastros e Acessos</h2>
          <p className="text-slate-500">Gerencie colaboradores, clientes, fornecedores e configurações.</p>
        </div>
        {activeTab !== 'SETTINGS' && activeTab !== 'PERMISSIONS' && (
          <button 
            onClick={() => {
                if (activeTab === 'MATERIALS') openMaterialModal();
                else if (activeTab === 'FINANCE_CATEGORIES') openCategoryModal();
                else openUserModal();
            }}
            className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
          >
            <Plus size={20} />
            {activeTab === 'MATERIALS' ? 'Novo Material' : activeTab === 'FINANCE_CATEGORIES' ? 'Nova Categoria' : `Novo ${getCategoryLabel(activeTab).slice(0, -1)}`}
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto flex-shrink-0">
          <TabButton active={activeTab === 'INTERNAL'} onClick={() => setActiveTab('INTERNAL')} icon={<Users size={18}/>} label="Equipe Interna" badge={activeTab !== 'INTERNAL' ? pendingCount : 0} />
          <TabButton active={activeTab === 'CLIENTS'} onClick={() => setActiveTab('CLIENTS')} icon={<Contact size={18}/>} label="Clientes" />
          <TabButton active={activeTab === 'SUPPLIERS'} onClick={() => setActiveTab('SUPPLIERS')} icon={<Truck size={18}/>} label="Fornecedores" />
          <TabButton active={activeTab === 'MATERIALS'} onClick={() => setActiveTab('MATERIALS')} icon={<Package size={18}/>} label="Materiais" />
          <TabButton active={activeTab === 'FINANCE_CATEGORIES'} onClick={() => setActiveTab('FINANCE_CATEGORIES')} icon={<Wallet size={18}/>} label="Categorias Fin." />
          {currentUser.role === UserRole.ADMIN && (
              <TabButton active={activeTab === 'PERMISSIONS'} onClick={() => setActiveTab('PERMISSIONS')} icon={<Shield size={18}/>} label="Permissões" />
          )}
          <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={18}/>} label="Configurações" />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="w-full space-y-6">
            
            {/* MATERIALS TAB */}
            {activeTab === 'MATERIALS' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-6 py-4">Item / Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Unidade</th>
                                <th className="px-6 py-4">Preço Est.</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {materials.map(mat => (
                                <tr key={mat.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{mat.name}</div>
                                        <div className="text-xs text-slate-500">{mat.brand || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">{mat.category}</span></td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{mat.unit}</td>
                                    <td className="px-6 py-4 font-medium text-green-600">R$ {mat.priceEstimate?.toFixed(2) || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openMaterialModal(mat)} className="p-2 text-slate-400 hover:text-pms-600 hover:bg-slate-100 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => onDeleteMaterial(mat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {materials.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum material cadastrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* USER LISTS */}
            {(activeTab === 'INTERNAL' || activeTab === 'CLIENTS' || activeTab === 'SUPPLIERS') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {getFilteredUsers().map(user => (
                    <div key={user.id} className={`bg-white p-6 rounded-xl shadow-sm border transition-all relative overflow-hidden ${user.status === 'PENDING' ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                        {user.status === 'PENDING' && <div className="absolute top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-bold text-center py-1">AGUARDANDO APROVAÇÃO</div>}
                        {user.status === 'BLOCKED' && <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-[10px] font-bold text-center py-1">BLOQUEADO</div>}
                        <div className="flex items-start justify-between mt-2">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    {user.name}
                                    {currentUser.id === user.id && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Você)</span>}
                                </h3>
                                {user.tradeName && <p className="text-xs text-slate-600 font-medium">{user.tradeName}</p>}
                                <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {user.sellerPhone && (
                                <a 
                                    href={`https://wa.me/55${user.sellerPhone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Whatsapp do Vendedor"
                                >
                                    <MessageCircle size={16} />
                                </a>
                            )}
                            <button onClick={() => openUserModal(user)} className="p-2 text-slate-400 hover:text-pms-600 hover:bg-slate-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            
                            {/* DELETE BUTTON - Now checks permission matrix OR Admin role */}
                            {(currentUser.role === UserRole.ADMIN || permissions[currentUser.role]?.manageUsers) && user.id !== currentUser.id && (
                                <button 
                                    onClick={() => onDeleteUser(user.id)} 
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir Usuário"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-slate-400 block uppercase">Categoria</span>
                            <span className="text-xs font-bold text-slate-700">{user.category}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-slate-400 block uppercase">Acesso</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 
                                user.role === UserRole.EDITOR ? 'bg-blue-100 text-blue-700' : 
                                'bg-slate-100 text-slate-500'
                            }`}>
                                {user.role}
                            </span>
                        </div>
                        </div>
                        {user.status === 'PENDING' && <button onClick={() => openUserModal(user)} className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse"><UserCheck size={16} /> Analisar Cadastro</button>}
                    </div>
                    ))}
                    {getFilteredUsers().length === 0 && (
                        <div className="col-span-full p-10 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                            <Users size={32} className="mx-auto mb-2 opacity-20" />
                            Nenhum usuário encontrado nesta categoria.
                        </div>
                    )}
                </div>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'PERMISSIONS' && currentUser.role === UserRole.ADMIN && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Shield size={20} className="text-pms-600"/> Matriz de Permissões
                                </h3>
                                <p className="text-sm text-slate-500">Defina o que cada cargo pode fazer no sistema.</p>
                            </div>
                            <button 
                                onClick={savePermissions}
                                disabled={isSaving}
                                className="px-4 py-2 bg-pms-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-pms-500 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                                Salvar Alterações
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-bold">
                                    <tr>
                                        <th className="px-6 py-4 w-1/3">Funcionalidade</th>
                                        <th className="px-6 py-4 text-center text-purple-600">ADMIN (Total)</th>
                                        <th className="px-6 py-4 text-center text-blue-600">EDITOR (Equipe)</th>
                                        <th className="px-6 py-4 text-center text-slate-600">VIEWER (Visitante)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(Object.keys(PERMISSION_LABELS) as Array<keyof AppPermissions>).map((key) => (
                                        <tr key={key} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                                {PERMISSION_LABELS[key]}
                                                <p className="text-[10px] font-normal text-slate-400 font-mono">{key}</p>
                                            </td>
                                            {/* ADMIN COLUMN (Usually Locked) */}
                                            <td className="px-6 py-4 text-center bg-purple-50/30">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => togglePermission(UserRole.ADMIN, key)}
                                                        className={`p-1 rounded transition-colors ${localPermissions[UserRole.ADMIN][key] ? 'text-green-600' : 'text-red-300'}`}
                                                        // We generally don't want to disable Admin permissions easily to prevent lockout, 
                                                        // but let's allow it if the user insists, except SystemAdmin
                                                        disabled={key === 'isSystemAdmin' || key === 'manageUsers'}
                                                    >
                                                        {localPermissions[UserRole.ADMIN][key] ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                    </button>
                                                </div>
                                            </td>
                                            {/* EDITOR COLUMN */}
                                            <td className="px-6 py-4 text-center bg-blue-50/30">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => togglePermission(UserRole.EDITOR, key)}
                                                        className={`p-1 rounded transition-colors ${localPermissions[UserRole.EDITOR][key] ? 'text-green-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                        disabled={key === 'isSystemAdmin'}
                                                    >
                                                        {localPermissions[UserRole.EDITOR][key] ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                    </button>
                                                </div>
                                            </td>
                                            {/* VIEWER COLUMN */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => togglePermission(UserRole.VIEWER, key)}
                                                        className={`p-1 rounded transition-colors ${localPermissions[UserRole.VIEWER][key] ? 'text-green-600' : 'text-slate-300 hover:text-slate-500'}`}
                                                        disabled={key === 'isSystemAdmin'}
                                                    >
                                                        {localPermissions[UserRole.VIEWER][key] ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-yellow-50 text-yellow-800 text-sm flex items-center gap-2 border-t border-yellow-100">
                            <AlertTriangle size={16} />
                            <strong>Nota:</strong> Usuários da categoria <strong>CLIENTE</strong> terão sempre acesso limitado, independentemente desta configuração, por segurança.
                        </div>
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'SETTINGS' && (
                <div className="animate-fade-in space-y-8">
                    {/* Connection Status */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                {isCloudConnected ? <Cloud size={24} className="text-green-600" /> : <Database size={24} className="text-red-600" />}
                                Conexão Nuvem
                            </h3>
                            <p className="text-sm text-slate-500">{isCloudConnected ? 'Conectado e sincronizando.' : 'Modo Local.'}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isCloudConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                <div className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`}></div>
                                {isCloudConnected ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                <div>
                                    <h4 className="text-orange-800 font-bold flex items-center gap-2"><AlertTriangle size={18}/> Diagnóstico de Dados</h4>
                                    <p className="text-sm text-orange-700 mt-1">Use esta opção para restaurar configurações padrão.</p>
                                </div>
                                <button 
                                    onClick={() => api.restoreDefaults()}
                                    className="mt-3 md:mt-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm"
                                >
                                    <RefreshCw size={18} /> Restaurar Sistema
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COMPANY SETTINGS / VISUAL IDENTITY */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Palette size={24} className="text-pms-600" />
                                    Identidade Visual & Dados
                                </h3>
                                <p className="text-sm text-slate-500">Personalize o nome e a logo que aparecem no sistema.</p>
                            </div>
                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving || isUploadingLogo}
                                className="px-4 py-2 bg-pms-600 hover:bg-pms-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                                Salvar Dados
                            </button>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Logo da Empresa</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden group">
                                        {isUploadingLogo ? (
                                            <div className="flex flex-col items-center text-pms-600">
                                                <Loader2 size={24} className="animate-spin mb-1" />
                                                <span className="text-[10px] font-bold">Enviando...</span>
                                            </div>
                                        ) : companyLogo ? (
                                            <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-slate-400 text-center">
                                                <Upload size={24} className="mx-auto mb-1"/>
                                                <span className="text-[10px]">Upload Logo</span>
                                            </div>
                                        )}
                                        
                                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-xs">
                                            Alterar
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                        </label>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                                            Recomendado: PNG Transparente ou JPG.<br/>
                                            Tamanho ideal: 500x500px.
                                        </p>
                                        {companyLogo && (
                                            <button 
                                                onClick={() => setCompanyLogo('')}
                                                className="text-xs text-red-600 hover:underline font-bold"
                                            >
                                                Remover Logo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Company Info Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Construtora</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                        placeholder="Ex: PMS Engenharia"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Telefone de Contato / Escritório</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="tel" 
                                            className="w-full pl-10 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                                            placeholder="(00) 00000-0000"
                                            value={companyPhone}
                                            onChange={(e) => setCompanyPhone(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Este número aparecerá no painel do cliente para contato.</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-700 flex gap-2">
                                    <ShieldCheck size={16} className="shrink-0 mt-0.5"/>
                                    <span>Essas informações aparecerão no cabeçalho do sistema, nos relatórios PDF e na tela de login.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'FINANCE_CATEGORIES' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold">
                        <tr><th className="px-6 py-4">Nome da Categoria</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4 text-right">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {financeCategories.map(cat => (
                            <tr key={cat.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-800">{cat.name}</td>
                                <td className="px-6 py-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{cat.type === 'BOTH' ? 'Receita & Despesa' : cat.type === 'EXPENSE' ? 'Despesa' : 'Receita'}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openCategoryModal(cat)} className="p-2 text-slate-400 hover:text-pms-600 hover:bg-slate-100 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => onDeleteCategory && onDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`bg-white rounded-xl w-full ${userCategory === UserCategory.SUPPLIER ? 'max-w-3xl' : 'max-w-2xl'} p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col`}>
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Cadastro' : `Novo Usuário`}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {/* SUPPLIER SPECIFIC TABS */}
            {userCategory === UserCategory.SUPPLIER && editingUser && (
                <div className="flex border-b border-slate-200 mb-4">
                    <button 
                        onClick={() => setSupplierModalTab('DATA')}
                        className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${supplierModalTab === 'DATA' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Dados Cadastrais
                    </button>
                    <button 
                        onClick={() => setSupplierModalTab('HISTORY')}
                        className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${supplierModalTab === 'HISTORY' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={16} /> Histórico de Compras
                    </button>
                </div>
            )}

            <div className="overflow-y-auto flex-1 px-2 custom-scroll">
                
                {/* --- HISTORY TAB (SUPPLIER ONLY) --- */}
                {userCategory === UserCategory.SUPPLIER && supplierModalTab === 'HISTORY' ? (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-green-600 uppercase">Total Comprado (Pago/Entregue)</p>
                                <p className="text-2xl font-bold text-green-800">R$ {supplierTotalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            </div>
                            <div className="p-3 bg-white rounded-full text-green-600 shadow-sm">
                                <ShoppingBag size={24} />
                            </div>
                        </div>

                        {/* History List */}
                        <div className="space-y-2">
                            {supplierHistory.length > 0 ? supplierHistory.map((order) => (
                                <div key={order.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{order.quantity} {order.unit} - {order.itemName}</p>
                                        <p className="text-xs text-slate-500">{new Date(order.requestDate).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-700 text-sm">R$ {order.finalCost?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">{order.status === OrderStatus.DELIVERED ? 'Entregue' : 'Comprado'}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-slate-400 italic">
                                    Nenhuma compra registrada com este fornecedor.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- DATA FORM (ALL USERS) ---
                    <div className="space-y-6">
                        {/* AVATAR UPLOAD */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 shadow-md bg-slate-50">
                                    <img 
                                        src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}`} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <label className="absolute bottom-0 right-0 bg-pms-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-pms-500 transition-colors shadow-sm">
                                    <Camera size={14} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
                                </label>
                            </div>
                        </div>

                        {/* CONDITIONAL FORM RENDERING */}
                        {userCategory === UserCategory.SUPPLIER ? (
                            // --- ADVANCED SUPPLIER FORM ---
                            <div className="space-y-6">
                                {/* Identification Section */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase"><Building2 size={16}/> Identificação da Empresa</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nome Fantasia (Principal)</label>
                                            <input type="text" className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Ex: Casa das Tintas" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">CNPJ</label>
                                            <div className="relative flex gap-2">
                                                <input 
                                                    type="text" 
                                                    className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none" 
                                                    value={userCnpj} 
                                                    onChange={(e) => setUserCnpj(e.target.value)} 
                                                    placeholder="00.000.000/0000-00" 
                                                />
                                                <button 
                                                    onClick={handleCnpjLookup}
                                                    disabled={isSearchingCnpj}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-lg flex items-center justify-center shadow-sm disabled:opacity-50 transition-colors"
                                                    title="Preencher automaticamente"
                                                >
                                                    {isSearchingCnpj ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Razão Social</label>
                                            <input type="text" className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none" value={userLegalName} onChange={(e) => setUserLegalName(e.target.value)} placeholder="Ex: Tintas LTDA" />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Section */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase"><Phone size={16}/> Contato e Endereço</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Email Comercial</label>
                                            <input type="email" className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Telefone / WhatsApp</label>
                                            <input type="tel" className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Endereço Completo</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-2 top-2 text-slate-400" size={16}/>
                                                <input type="text" className="w-full border rounded p-2 pl-8 focus:ring-2 focus:ring-pms-500 outline-none" value={userAddress} onChange={(e) => setUserAddress(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Site / Catálogo</label>
                                            <div className="relative">
                                                <Globe className="absolute left-2 top-2 text-slate-400" size={16}/>
                                                <input type="url" className="w-full border rounded p-2 pl-8 focus:ring-2 focus:ring-pms-500 outline-none text-blue-600" value={userWebsite} onChange={(e) => setUserWebsite(e.target.value)} placeholder="https://..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sales Representative */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2 text-sm uppercase"><UserCheck size={16}/> Contato do Vendedor</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Vendedor</label>
                                            <input type="text" className="w-full border rounded p-2 focus:ring-2 focus:ring-green-500 outline-none" value={userSellerName} onChange={(e) => setUserSellerName(e.target.value)} placeholder="Ex: João da Silva" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Whatsapp Direto</label>
                                            <div className="flex gap-2">
                                                <input type="tel" className="w-full border rounded p-2 focus:ring-2 focus:ring-green-500 outline-none" value={userSellerPhone} onChange={(e) => setUserSellerPhone(e.target.value)} placeholder="(00) 00000-0000" />
                                                {userSellerPhone && (
                                                    <a 
                                                        href={`https://wa.me/55${userSellerPhone.replace(/\D/g, '')}`} 
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="bg-green-600 text-white p-2 rounded-lg flex items-center justify-center hover:bg-green-500 transition-colors"
                                                        title="Ir para Whatsapp"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Finance Section */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase"><CreditCard size={16}/> Dados Financeiros</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Chave Pix / Dados Bancários</label>
                                        <textarea className="w-full border rounded p-2 focus:ring-2 focus:ring-pms-500 outline-none h-20 resize-none text-sm" value={userPaymentInfo} onChange={(e) => setUserPaymentInfo(e.target.value)} placeholder="Banco, Agência, Conta ou Chave Pix..." />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- STANDARD FORM (INTERNAL / CLIENT) ---
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label><input type="text" className="w-full border rounded p-2" value={userName} onChange={(e) => setUserName(e.target.value)} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">Email</label><input type="email" className="w-full border rounded p-2" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} /></div>
                                <div><label className="block text-sm font-bold text-slate-700 mb-1">CPF/CNPJ</label><input type="text" className="w-full border rounded p-2" value={userCpf} onChange={(e) => setUserCpf(e.target.value)} /></div>
                                {userCategory === UserCategory.CLIENT && (
                                    <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Endereço</label><input type="text" className="w-full border rounded p-2" value={userAddress} onChange={(e) => setUserAddress(e.target.value)} /></div>
                                )}
                                <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label><input type="text" className="w-full border rounded p-2" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} /></div>
                            </div>
                        )}

                        {/* SHARED ROLE & CATEGORY SECTION */}
                        <div className="bg-slate-50 p-4 rounded border mt-2">
                            <h4 className="font-bold mb-2 flex items-center gap-2 text-slate-700 text-sm uppercase"><Shield size={16}/> Definições de Acesso</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Quem é? (Categoria)</label>
                                    <select 
                                        className="w-full border rounded p-2 bg-white font-medium text-sm" 
                                        value={userCategory} 
                                        onChange={(e) => setUserCategory(e.target.value as UserCategory)}
                                        disabled={!!editingUser} // Lock category on edit to prevent mess
                                    >
                                        <option value={UserCategory.INTERNAL}>Equipe Interna</option>
                                        <option value={UserCategory.CLIENT}>Cliente (Dono de Obra)</option>
                                        <option value={UserCategory.SUPPLIER}>Fornecedor</option>
                                    </select>
                                </div>
                                
                                {/* Role Selection - Disabled for Clients to enforce VIEWER */}
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase text-slate-500">O que pode fazer? (Role)</label>
                                    <select 
                                        className="w-full border rounded p-2 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-400 text-sm" 
                                        value={userCategory === UserCategory.CLIENT ? UserRole.VIEWER : userRole} 
                                        onChange={(e) => setUserRole(e.target.value as UserRole)}
                                        disabled={userCategory === UserCategory.CLIENT}
                                    >
                                        <option value={UserRole.VIEWER}>Visitante (Visualizar)</option>
                                        <option value={UserRole.EDITOR}>Editor (Gerente/Mestre)</option>
                                        <option value={UserRole.ADMIN}>Administrador (Total)</option>
                                    </select>
                                    {userCategory === UserCategory.CLIENT && <p className="text-[10px] text-slate-400 mt-1">Clientes sempre possuem acesso de leitura.</p>}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Status da Conta</label>
                                    <select className={`w-full border rounded p-2 font-bold text-sm ${userStatus === 'ACTIVE' ? 'text-green-600' : 'text-orange-600'}`} value={userStatus} onChange={(e) => setUserStatus(e.target.value as any)}><option value="ACTIVE">ATIVO (Permitir Acesso)</option><option value="PENDING">PENDENTE (Aguardando)</option><option value="BLOCKED">BLOQUEADO</option></select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS (Only if not in History View) */}
            {supplierModalTab === 'DATA' && (
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-bold text-sm">Cancelar</button>
                    <button onClick={saveUser} disabled={isSaving} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-70 text-sm">
                        {isSaving && <Loader2 size={18} className="animate-spin"/>} {isSaving ? 'Salvando...' : 'Salvar Cadastro'}
                    </button>
                </div>
            )}
            {supplierModalTab === 'HISTORY' && (
                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm">Fechar</button>
                </div>
            )}
          </div>
        </div>
      )}
      
      {/* NEW USER CREDENTIALS MODAL */}
      {createdUserCreds && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-2xl text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Usuário Criado!</h3>
                  <p className="text-slate-500 mb-6">O login foi gerado automaticamente. Envie as credenciais abaixo para o usuário.</p>
                  
                  <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-left mb-6">
                      <div className="mb-3">
                          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Login / Email</label>
                          <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                              <code className="font-mono text-slate-800">{createdUserCreds.email}</code>
                              <button onClick={() => navigator.clipboard.writeText(createdUserCreds.email)} className="text-slate-400 hover:text-pms-600"><Copy size={16}/></button>
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Senha Provisória</label>
                          <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                              <code className="font-mono text-slate-800 font-bold tracking-wider">{createdUserCreds.pass}</code>
                              <button onClick={() => navigator.clipboard.writeText(createdUserCreds.pass)} className="text-slate-400 hover:text-pms-600"><Copy size={16}/></button>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs text-yellow-700 flex items-start gap-2 text-left mb-6">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      O usuário será obrigado a redefinir esta senha no primeiro acesso.
                  </div>

                  <button 
                    onClick={() => setCreatedUserCreds(null)}
                    className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                      Entendido, Fechar
                  </button>
              </div>
          </div>
      )}

      {/* MATERIAL MODAL */}
      {isMaterialModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-slate-800">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h3>
                     <button onClick={() => setIsMaterialModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                 </div>
                 <div className="space-y-4">
                     <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome do Material</label><input type="text" className="w-full border rounded p-2" value={materialName} onChange={(e) => setMaterialName(e.target.value)} /></div>
                     <div className="grid grid-cols-2 gap-4">
                         <div><label className="block text-sm font-bold text-slate-700 mb-1">Categoria</label><select className="w-full border rounded p-2 bg-white" value={materialCategory} onChange={(e) => setMaterialCategory(e.target.value)}><option value="Alvenaria">Alvenaria</option><option value="Acabamento">Acabamento</option><option value="Elétrica">Elétrica</option><option value="Hidráulica">Hidráulica</option><option value="Pintura">Pintura</option><option value="Outros">Outros</option></select></div>
                         <div><label className="block text-sm font-bold text-slate-700 mb-1">Unidade</label><select className="w-full border rounded p-2 bg-white" value={materialUnit} onChange={(e) => setMaterialUnit(e.target.value)}><option value="un">Unidade (un)</option><option value="m">Metro (m)</option><option value="m²">Metro Quadrado (m²)</option><option value="m³">Metro Cúbico (m³)</option><option value="kg">Quilo (kg)</option><option value="saco">Saco</option><option value="lata">Lata</option></select></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div><label className="block text-sm font-bold text-slate-700 mb-1">Preço Base (R$)</label><input type="number" className="w-full border rounded p-2" value={materialPrice} onChange={(e) => setMaterialPrice(e.target.value)} /></div>
                         <div><label className="block text-sm font-bold text-slate-700 mb-1">Marca/Ref</label><input type="text" className="w-full border rounded p-2" value={materialBrand} onChange={(e) => setMaterialBrand(e.target.value)} /></div>
                     </div>
                 </div>
                 <div className="flex gap-3 justify-end mt-6">
                     <button onClick={() => setIsMaterialModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancelar</button>
                     <button onClick={saveMaterial} disabled={isSaving} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-70">
                        {isSaving && <Loader2 size={18} className="animate-spin"/>} {isSaving ? 'Gravando...' : 'Salvar Material'}
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{editingCategory ? 'Editar Categoria' : 'Nova Categoria Financeira'}</h3>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">Nome da Categoria</label><input type="text" className="w-full border rounded p-2" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Movimentação</label>
                          <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => setCategoryType('EXPENSE')} className={`p-2 rounded border text-xs font-bold ${categoryType === 'EXPENSE' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white text-slate-500'}`}>DESPESA</button>
                              <button onClick={() => setCategoryType('INCOME')} className={`p-2 rounded border text-xs font-bold ${categoryType === 'INCOME' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white text-slate-500'}`}>RECEITA</button>
                              <button onClick={() => setCategoryType('BOTH')} className={`p-2 rounded border text-xs font-bold ${categoryType === 'BOTH' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>AMBOS</button>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                      <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={saveCategory} disabled={isSaving} className="px-6 py-2 bg-pms-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-70">
                         {isSaving && <Loader2 size={18} className="animate-spin"/>} {isSaving ? 'Salvando...' : 'Salvar Categoria'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};