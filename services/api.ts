
import { 
    User, ConstructionWork, Task, FinancialRecord, DailyLog, MaterialOrder, Material, 
    UserProfile, TaskStatusDefinition, FinanceCategoryDefinition 
} from '../types';
import { 
    MOCK_PROFILES, DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES 
} from '../constants';
import { getDb } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";

/**
 * API SERVICE HÍBRIDA (Dynnamic DB)
 * - Verifica a cada chamada se getDb() retorna uma instância válida do Firestore.
 * - Se sim, usa Nuvem (Equipe).
 * - Se não, usa LocalStorage (Pessoal/Teste).
 */

const DB_KEYS = {
    WORKS: 'pms_works',
    USERS: 'pms_users',
    PROFILES: 'pms_profiles',
    TASKS: 'pms_tasks',
    FINANCE: 'pms_finance',
    LOGS: 'pms_logs',
    MATERIALS: 'pms_materials',
    ORDERS: 'pms_orders',
    STATUSES: 'pms_statuses',
    CATEGORIES: 'pms_categories'
};

// --- HELPER: LOCAL STORAGE ---
const localLoad = <T>(key: string, fallback: T): T => {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    try { return JSON.parse(stored); } catch (e) { return fallback; }
};
const localSave = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- HELPER: FIREBASE ---
const getCollectionData = async <T>(collectionName: string): Promise<T[]> => {
    const db = getDb();
    if (!db) return [];
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
    } catch (error) {
        console.error(`Erro ao ler coleção ${collectionName}:`, error);
        throw error;
    }
};

export const api = {
    // Verificar status
    isOnline: () => !!getDb(),

    // --- INITIAL LOAD ---
    getAllData: async () => {
        const db = getDb();
        if (db) {
            // MODO ONLINE (FIREBASE)
            try {
                const [works, users, profiles, tasks, finance, logs, materials, orders, taskStatuses, financeCategories] = await Promise.all([
                    getCollectionData<ConstructionWork>('works'),
                    getCollectionData<User>('users'),
                    getCollectionData<UserProfile>('profiles'),
                    getCollectionData<Task>('tasks'),
                    getCollectionData<FinancialRecord>('finance'),
                    getCollectionData<DailyLog>('logs'),
                    getCollectionData<Material>('materials'),
                    getCollectionData<MaterialOrder>('orders'),
                    getCollectionData<TaskStatusDefinition>('statuses'),
                    getCollectionData<FinanceCategoryDefinition>('categories')
                ]);

                // Se for a primeira vez no Firebase e estiver vazio, usa os defaults estruturais
                return {
                    works, users, 
                    profiles: profiles.length ? profiles : MOCK_PROFILES,
                    tasks, finance, logs, materials, orders,
                    taskStatuses: taskStatuses.length ? taskStatuses : DEFAULT_TASK_STATUSES,
                    financeCategories: financeCategories.length ? financeCategories : DEFAULT_FINANCE_CATEGORIES
                };
            } catch (error) {
                console.error("Erro crítico ao carregar do Firebase:", error);
                alert("Erro ao conectar na nuvem. Verifique suas credenciais em Configurações.");
                // Fallback para evitar crash total, retorna vazio
                return { works: [], users: [], profiles: [], tasks: [], finance: [], logs: [], materials: [], orders: [], taskStatuses: [], financeCategories: [] };
            }
        } else {
            // MODO OFFLINE (LOCALSTORAGE)
            await new Promise(resolve => setTimeout(resolve, 300)); 
            return {
                works: localLoad<ConstructionWork[]>(DB_KEYS.WORKS, []),
                users: localLoad<User[]>(DB_KEYS.USERS, []),
                profiles: localLoad<UserProfile[]>(DB_KEYS.PROFILES, MOCK_PROFILES),
                tasks: localLoad<Task[]>(DB_KEYS.TASKS, []),
                finance: localLoad<FinancialRecord[]>(DB_KEYS.FINANCE, []),
                logs: localLoad<DailyLog[]>(DB_KEYS.LOGS, []),
                materials: localLoad<Material[]>(DB_KEYS.MATERIALS, []),
                orders: localLoad<MaterialOrder[]>(DB_KEYS.ORDERS, []),
                taskStatuses: localLoad<TaskStatusDefinition[]>(DB_KEYS.STATUSES, DEFAULT_TASK_STATUSES),
                financeCategories: localLoad<FinanceCategoryDefinition[]>(DB_KEYS.CATEGORIES, DEFAULT_FINANCE_CATEGORIES)
            };
        }
    },

    // --- GENERIC CRUD WRAPPERS ---
    // Helper para decidir onde salvar
    save: async (collectionName: string, id: string, data: any, localKey: string) => {
        const db = getDb();
        if (db) {
            await setDoc(doc(db, collectionName, id), data);
        } else {
            const items = localLoad<any[]>(localKey, []);
            // Update or Create logic for local array
            const index = items.findIndex((i: any) => i.id === id);
            if (index >= 0) items[index] = data;
            else items.push(data);
            localSave(localKey, items);
        }
    },

    delete: async (collectionName: string, id: string, localKey: string) => {
        const db = getDb();
        if (db) {
            await deleteDoc(doc(db, collectionName, id));
        } else {
            const items = localLoad<any[]>(localKey, []);
            localSave(localKey, items.filter((i: any) => i.id !== id));
        }
    },

    // --- SPECIFIC METHODS (Keeping signatures compatible) ---
    
    // Works
    createWork: async (item: ConstructionWork) => { await api.save('works', item.id, item, DB_KEYS.WORKS); return item; },
    updateWork: async (item: ConstructionWork) => { await api.save('works', item.id, item, DB_KEYS.WORKS); return item; },

    // Users
    createUser: async (item: User) => { await api.save('users', item.id, item, DB_KEYS.USERS); return item; },
    updateUser: async (item: User) => { await api.save('users', item.id, item, DB_KEYS.USERS); return item; },
    deleteUser: async (id: string) => { await api.delete('users', id, DB_KEYS.USERS); },

    // Tasks
    createTask: async (item: Task) => { await api.save('tasks', item.id, item, DB_KEYS.TASKS); return item; },
    updateTask: async (item: Task) => { await api.save('tasks', item.id, item, DB_KEYS.TASKS); return item; },

    // Finance
    createFinance: async (item: FinancialRecord) => { await api.save('finance', item.id, item, DB_KEYS.FINANCE); return item; },
    updateFinance: async (item: FinancialRecord) => { await api.save('finance', item.id, item, DB_KEYS.FINANCE); return item; },
    deleteFinance: async (id: string) => { await api.delete('finance', id, DB_KEYS.FINANCE); },

    // Logs
    createLog: async (item: DailyLog) => { 
        const db = getDb();
        if (db) {
            await setDoc(doc(db, 'logs', item.id), item);
        } else {
            const items = localLoad<DailyLog[]>(DB_KEYS.LOGS, []);
            items.unshift(item); // Logs usually prepend locally
            localSave(DB_KEYS.LOGS, items);
        }
        return item;
    },

    // Materials
    createMaterial: async (item: Material) => { await api.save('materials', item.id, item, DB_KEYS.MATERIALS); return item; },
    updateMaterial: async (item: Material) => { await api.save('materials', item.id, item, DB_KEYS.MATERIALS); return item; },
    deleteMaterial: async (id: string) => { await api.delete('materials', id, DB_KEYS.MATERIALS); },

    // Orders
    createOrder: async (item: MaterialOrder) => { await api.save('orders', item.id, item, DB_KEYS.ORDERS); return item; },
    updateOrder: async (item: MaterialOrder) => { await api.save('orders', item.id, item, DB_KEYS.ORDERS); return item; },

    // Configs
    createProfile: async (item: UserProfile) => { await api.save('profiles', item.id, item, DB_KEYS.PROFILES); return item; },
    updateProfile: async (item: UserProfile) => { await api.save('profiles', item.id, item, DB_KEYS.PROFILES); return item; },
    deleteProfile: async (id: string) => { await api.delete('profiles', id, DB_KEYS.PROFILES); },
    
    createCategory: async (item: FinanceCategoryDefinition) => { await api.save('categories', item.id, item, DB_KEYS.CATEGORIES); return item; },
    updateCategory: async (item: FinanceCategoryDefinition) => { await api.save('categories', item.id, item, DB_KEYS.CATEGORIES); return item; },
    deleteCategory: async (id: string) => { await api.delete('categories', id, DB_KEYS.CATEGORIES); },

    updateStatuses: async (statuses: TaskStatusDefinition[]) => {
        const db = getDb();
        if (db) {
            // Em Firestore, idealmente salvaríamos em um doc de config único.
            // Para manter consistência simples, vamos iterar e salvar como coleção 'statuses'
            // Nota: Isso pode ser lento se houver muitos status, mas geralmente são poucos (<10).
            // Primeiro, deletamos os antigos? Ou sobrescrevemos. 
            // Para simplificar neste MVP híbrido, salvamos um doc especial com array JSON ou sobrescrevemos ids fixos.
            // Vamos usar uma abordagem robusta: Salvar cada status como doc.
            for (const s of statuses) {
                await setDoc(doc(db, 'statuses', s.id), s);
            }
        } else {
            localSave(DB_KEYS.STATUSES, statuses);
        }
        return statuses;
    }
};
