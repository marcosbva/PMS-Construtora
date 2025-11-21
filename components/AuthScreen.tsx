
import React, { useState } from 'react';
import { User, UserRole, UserProfile } from '../types';
import { HardHat, Lock, Mail, User as UserIcon, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Simulated password
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Se não houver usuários, força o modo de registro inicial
  const isFirstSetup = users.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering || isFirstSetup) {
        // Registration Logic
        if (!email || !password || !name) {
            setError('Preencha todos os campos.');
            return;
        }
        
        // Check if email already exists
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            setError('Este email já está cadastrado.');
            return;
        }

        // Se for o primeiro usuário do sistema, ele é ADMIN automaticamente
        const role = isFirstSetup ? UserRole.ADMIN : UserRole.MASTER;
        const profileId = isFirstSetup ? 'p_admin' : 'p_partner';

        const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            email,
            role: role,
            category: 'EMPLOYEE',
            profileId: profileId,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`
        };
        
        onRegister(newUser);

    } else {
        // Login Logic
        if (!email || !password) {
            setError('Preencha email e senha.');
            return;
        }

        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (user) {
            onLogin(user);
        } else {
            setError('Usuário não encontrado. Verifique o email.');
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 opacity-10">
             <div className="absolute -top-24 -left-24 w-96 h-96 bg-pms-500 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-80 h-80 bg-pms-orange rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-300">
            <div className="p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-pms-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-pms-600/30">
                        <HardHat size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">PMS Construtora</h1>
                    <p className="text-slate-500 text-sm">Sistema de Gestão Integrada</p>
                </div>

                {isFirstSetup && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-blue-800">Configuração Inicial</h3>
                            <p className="text-xs text-blue-600 mt-1">
                                Nenhum usuário encontrado. Crie a conta do <strong>Administrador</strong> para começar.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {(isRegistering || isFirstSetup) && (
                         <div className="space-y-1 animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nome Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                    placeholder="Ex: Carlos Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus={isFirstSetup}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 ml-1">Email Corporativo</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                placeholder="seu.nome@pms.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 animate-shake">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg group"
                    >
                        {isFirstSetup ? 'Criar Admin e Iniciar' : (isRegistering ? 'Criar Conta' : 'Acessar Sistema')}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    {!isFirstSetup && (
                        <p className="text-sm text-slate-500">
                            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
                            <button 
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setError('');
                                    setEmail('');
                                    setPassword('');
                                    setName('');
                                }}
                                className="ml-2 font-bold text-pms-600 hover:underline"
                            >
                                {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
            
            {/* Footer Hint */}
            {!isRegistering && !isFirstSetup && (
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Seus dados estão seguros localmente neste dispositivo.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};
