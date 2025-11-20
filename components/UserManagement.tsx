
import React, { useState } from 'react';
import { User, UserProfile, AppPermissions } from '../types';
import { Plus, Edit2, Trash2, X, Shield, User as UserIcon, Eye, Briefcase, Check, Settings } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  profiles: UserProfile[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddProfile: (profile: UserProfile) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
    users, profiles, 
    onAddUser, onUpdateUser, onDeleteUser,
    onAddProfile, onUpdateProfile, onDeleteProfile 
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'PROFILES'>('USERS');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // --- USER FORM STATE ---
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userProfileId, setUserProfileId] = useState('');

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

  // --- HANDLERS: USERS ---

  const openUserModal = (user?: User) => {
    if (user) {
        setEditingUser(user);
        setUserName(user.name);
        setUserEmail(user.email);
        setUserProfileId(user.profileId);
    } else {
        setEditingUser(null);
        setUserName('');
        setUserEmail('');
        setUserProfileId(profiles[1]?.id || ''); // Default to second profile (usually Partner)
    }
    setIsUserModalOpen(true);
  };

  const saveUser = () => {
      if (!userName || !userEmail || !userProfileId) return;
      
      // Legacy Enum Mapping for safety (optional, just to satisfy types if they are strict)
      const legacyRole = 'PARTNER'; // In a real refactor, we'd drop the enum.

      if (editingUser) {
          onUpdateUser({
              ...editingUser,
              name: userName,
              email: userEmail,
              profileId: userProfileId
          });
      } else {
          onAddUser({
            id: Math.random().toString(36).substr(2, 9),
            name: userName,
            email: userEmail,
            profileId: userProfileId,
            role: legacyRole as any,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`
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

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Acesso</h2>
          <p className="text-slate-500">Gerencie usuários e configure permissões detalhadas.</p>
        </div>
        
        {/* Main Action Button based on Tab */}
        <button 
          onClick={() => activeTab === 'USERS' ? openUserModal() : openProfileModal()}
          className="bg-pms-600 hover:bg-pms-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all"
        >
          <Plus size={20} />
          {activeTab === 'USERS' ? 'Novo Usuário' : 'Novo Perfil'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'USERS' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Usuários do Sistema
          </button>
          <button 
            onClick={() => setActiveTab('PROFILES')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'PROFILES' ? 'border-pms-600 text-pms-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Perfis e Permissões
          </button>
      </div>

      {/* --- USERS TAB CONTENT --- */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4 hidden sm:table-cell">Email</th>
                <th className="px-6 py-4">Perfil Atual</th>
                <th className="px-6 py-4 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                    const userProfile = profiles.find(p => p.id === user.profileId);
                    return (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                                <span className="font-medium text-slate-800">{user.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm hidden sm:table-cell">{user.email}</td>
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
            </tbody>
            </table>
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
                                      {profile.permissions.viewMaterials && <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded border border-orange-100">Materiais</span>}
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

      {/* --- USER MODAL --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: João da Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-pms-500 outline-none"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="joao@pms.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Perfil de Acesso</label>
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
                {userProfileId && (
                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded">
                        {profiles.find(p => p.id === userProfileId)?.description}
                    </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={saveUser} className="px-4 py-2 bg-pms-600 text-white rounded-lg hover:bg-pms-500 font-medium">
                Salvar Usuário
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

    </div>
  );
};
