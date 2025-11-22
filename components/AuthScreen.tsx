
import React, { useState } from 'react';
import { User, UserRole, UserCategory } from '../types';
import { HardHat, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck, Cloud, Database, Loader2, Clock, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { getAuthInstance } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

interface AuthScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users: initialUsers, onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const isOnline = api.isOnline();
  const auth = getAuthInstance();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingSuccess, setShowPendingSuccess] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const isFormValid = () => {
      if (!email || !password) return false;
      if (isRegistering && !name) return false;
      if (password.length < 6) return false;
      return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return; 

    setError('');
    setIsLoading(true);

    try {
        // REGISTER
        if (isRegistering) {
            if (!email || !password || !name) throw new Error('Preencha todos os campos.');
            if (password.length < 6) throw new Error('Senha deve ter 6+ caracteres.');

            if (isOnline && auth) {
                let userCredential;
                try {
                    userCredential = await createUserWithEmailAndPassword(auth, email, password);
                } catch (authError: any) {
                    if (authError.code === 'auth/email-already-in-use') throw new Error('Email já em uso.');
                    throw authError;
                }

                const uid = userCredential.user.uid;
                const currentUsers = await api.getUsers();
                const isFirstUser = currentUsers.length === 0;

                // DEFAULT: FIRST = ADMIN, OTHERS = VIEWER (Pending)
                const role = isFirstUser ? UserRole.ADMIN : UserRole.VIEWER;
                const status = isFirstUser ? 'ACTIVE' : 'PENDING';

                const newUser: User = {
                    id: uid,
                    name,
                    email,
                    role: role,
                    category: UserCategory.INTERNAL, // Default to Internal team
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`,
                    status: status
                };

                await onRegister(newUser);

                if (status === 'PENDING') {
                    await signOut(auth);
                    setPendingMessage('Seu cadastro foi realizado e está em análise. Aguarde liberação.');
                    setShowPendingSuccess(true);
                    setIsRegistering(false);
                    setName(''); setEmail(''); setPassword('');
                } else {
                    onLogin(newUser);
                }

            } else {
                // OFFLINE
                const isFirstUser = initialUsers.length === 0;
                const newUser: User = {
                    id: Math.random().toString(36).substr(2, 9),
                    name, email,
                    role: isFirstUser ? UserRole.ADMIN : UserRole.VIEWER,
                    category: UserCategory.INTERNAL,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                    status: isFirstUser ? 'ACTIVE' : 'PENDING'
                };
                await onRegister(newUser);
                if (newUser.status === 'PENDING') {
                    setPendingMessage('Modo Offline: Cadastro pendente.');
                    setShowPendingSuccess(true);
                    setIsRegistering(false);
                }
            }

        // LOGIN
        } else {
            if (!email || !password) throw new Error('Preencha email e senha.');

            if (isOnline && auth) {
                let userCredential;
                try {
                    userCredential = await signInWithEmailAndPassword(auth, email, password);
                } catch (authError: any) {
                    throw new Error('Email ou senha incorretos.');
                }

                const uid = userCredential.user.uid;
                const dbUsers = await api.getUsers();
                const user = dbUsers.find(u => u.id === uid);

                if (!user) {
                    await signOut(auth);
                    throw new Error('Perfil não encontrado.');
                }

                if (user.status === 'PENDING') {
                    await signOut(auth);
                    setPendingMessage('Cadastro em análise. Aguarde.');
                    setShowPendingSuccess(true);
                    return;
                }

                if (user.status === 'BLOCKED') {
                    await signOut(auth);
                    throw new Error('Acesso bloqueado.');
                }

                onLogin(user);

            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
                const user = initialUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
                
                if (user) {
                    if (user.status === 'PENDING') {
                        setPendingMessage('Cadastro local pendente.');
                        setShowPendingSuccess(true);
                        return;
                    }
                    if (user.status === 'BLOCKED') throw new Error('Bloqueado.');
                    onLogin(user);
                } else {
                    throw new Error('Usuário não encontrado localmente.');
                }
            }
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        setError(err.message || 'Ocorreu um erro.');
    } finally {
        setIsLoading(false);
    }
  };

  if (showPendingSuccess) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-300">
                 <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Clock size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Em Análise</h2>
                 <p className="text-slate-600 mb-6 leading-relaxed">
                     {pendingMessage}
                 </p>
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 mb-6">
                     Status: <span className="font-bold text-orange-600">AGUARDANDO APROVAÇÃO</span>
                 </div>
                 <button 
                    onClick={() => setShowPendingSuccess(false)}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                 >
                     <LogOut size={18} /> Voltar ao Início
                 </button>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
             <div className="absolute -top-24 -left-24 w-96 h-96 bg-pms-500 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-80 h-80 bg-pms-orange rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-300">
            <div className={`w-full py-2 text-center text-xs font-bold text-white flex items-center justify-center gap-2 ${isOnline ? 'bg-green-600' : 'bg-slate-500'}`}>
                {isOnline ? <><Cloud size={14} /> CONECTADO AO GOOGLE CLOUD</> : <><Database size={14} /> MODO LOCAL (OFFLINE)</>}
            </div>

            <div className="p-8 pt-6">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-pms-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-pms-600/30">
                        <HardHat size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">PMS Construtora</h1>
                    <p className="text-slate-500 text-sm">Sistema de Gestão Integrada</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                         <div className="space-y-1 animate-in slide-in-from-top-2">
                            <label className="text-xs font-bold text-slate-600 ml-1">Nome Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white disabled:bg-slate-100"
                                    placeholder="Ex: Carlos Silva"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
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
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white disabled:bg-slate-100"
                                placeholder="seu.nome@pms.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pms-500 outline-none transition-all bg-slate-50 focus:bg-white disabled:bg-slate-100"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 animate-shake border border-red-100">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span className="leading-tight font-medium">{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading || !isFormValid()}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <><Loader2 size={20} className="animate-spin" /> Processando...</> : <>{isRegistering ? 'Criar Conta' : 'Acessar Sistema'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        {isRegistering ? 'Já tem uma conta?' : 'Não tem acesso?'}
                        <button onClick={() => { setIsRegistering(!isRegistering); setError(''); setEmail(''); setPassword(''); setName(''); }} className="ml-2 font-bold text-pms-600 hover:underline" disabled={isLoading}>
                            {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};
