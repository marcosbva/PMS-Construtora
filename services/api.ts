
import { 
    User, ConstructionWork, Task, FinancialRecord, DailyLog, MaterialOrder, Material, 
    TaskStatusDefinition, FinanceCategoryDefinition, UserRole, UserCategory 
} from '../types';
import { 
    DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES, DEFAULT_MATERIALS 
} from '../constants';
import { getDb } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, writeBatch, query, where } from "firebase/firestore";

// Nomes das coleções no Firestore
const COLLECTIONS = {
    WORKS: 'works',
    USERS: 'users',
    TASKS: 'tasks',
    FINANCE: 'finance',
    LOGS: 'logs',
    MATERIALS: 'materials',
    ORDERS: 'orders',
    STATUSES: 'statuses',
    CATEGORIES: 'categories' 
};

// Chaves para LocalStorage (Fallback Offline)
const LOCAL_KEYS = {
    WORKS: 'pms_works',
    USERS: 'pms_users',
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

// --- HELPER: FIREBASE FETCH ---
const getCollectionData = async <T>(collectionName: string): Promise<T[]> => {
    const db = getDb();
    if (!db) return [];
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
    } catch (error) {
        console.error(`Erro ao ler coleção ${collectionName}:`, error);
        return [];
    }
};

export const api = {
    // Verificar status
    isOnline: () => !!getDb(),

    // --- SEED REFACTOR (NO PROFILES) ---
    checkAndSeedInitialData: async () => {
        const db = getDb();
        if (!db) return;

        try {
            console.log("🌱 Verificando integridade estrutural do banco...");

            // Rescue Logic
            const rescueEmail = "marcosbva@gmail.com";
            const usersRef = collection(db, COLLECTIONS.USERS);
            const q = query(usersRef, where("email", "==", rescueEmail));
            const rescueSnap = await getDocs(q);

            if (!rescueSnap.empty) {
                const userDoc = rescueSnap.docs[0];
                await updateDoc(doc(db, COLLECTIONS.USERS, userDoc.id), {
                    role: UserRole.ADMIN,
                    status: 'ACTIVE',
                    category: UserCategory.INTERNAL
                });
                console.log(`🔓 ACESSO RESTAURADO: Usuário ${rescueEmail} definido como ADMIN.`);
            }
            
            // Check if basic config exists (using Categories as canary)
            const catSnap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
            
            if (catSnap.empty) {
                console.warn("⚠️ Banco de dados detectado como VAZIO ou INCOMPLETO.");
                console.log("🚀 Iniciando Bootstrapping...");
                
                const batch = writeBatch(db);
                let opsCount = 0;

                DEFAULT_FINANCE_CATEGORIES.forEach(c => {
                    const ref = doc(db, COLLECTIONS.CATEGORIES, c.id);
                    batch.set(ref, c);
                    opsCount++;
                });

                DEFAULT_TASK_STATUSES.forEach(s => {
                    const ref = doc(db, COLLECTIONS.STATUSES, s.id);
                    batch.set(ref, s);
                    opsCount++;
                });

                DEFAULT_MATERIALS.forEach(m => {
                    const ref = doc(db, COLLECTIONS.MATERIALS, m.id);
                    batch.set(ref, m);
                    opsCount++;
                });

                if (opsCount > 0) {
                    await batch.commit();
                    console.log(`✅ Bootstrapping concluído! ${opsCount} registros criados.`);
                }
            }

        } catch (error) {
            console.error("❌ Erro Crítico no Bootstrapping do Banco:", error);
            throw error;
        }
    },

    restoreDefaults: async () => {
        const db = getDb();
        if(!db) return;
        if(!window.confirm("Isso irá recriar Categorias e Status. Continuar?")) return;
        const batch = writeBatch(db);
        DEFAULT_FINANCE_CATEGORIES.forEach(c => batch.set(doc(db, COLLECTIONS.CATEGORIES, c.id), c));
        DEFAULT_TASK_STATUSES.forEach(s => batch.set(doc(db, COLLECTIONS.STATUSES, s.id), s));
        await batch.commit();
        alert("Restaurado.");
        window.location.reload();
    },

    testFirebaseConnection: async () => {
        const db = getDb();
        if (!db) { alert("Offline."); return; }
        try {
            await addDoc(collection(db, "test_connectivity"), { date: new Date().toISOString() });
            alert("Conexão OK!");
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        }
    },

    getAllData: async () => {
        const db = getDb();
        if (db) {
            try {
                const [works, users, tasks, finance, logs, materials, orders, taskStatuses, financeCategories] = await Promise.all([
                    getCollectionData<ConstructionWork>(COLLECTIONS.WORKS),
                    getCollectionData<User>(COLLECTIONS.USERS),
                    getCollectionData<Task>(COLLECTIONS.TASKS),
                    getCollectionData<FinancialRecord>(COLLECTIONS.FINANCE),
                    getCollectionData<DailyLog>(COLLECTIONS.LOGS),
                    getCollectionData<Material>(COLLECTIONS.MATERIALS),
                    getCollectionData<MaterialOrder>(COLLECTIONS.ORDERS),
                    getCollectionData<TaskStatusDefinition>(COLLECTIONS.STATUSES),
                    getCollectionData<FinanceCategoryDefinition>(COLLECTIONS.CATEGORIES)
                ]);
                return { works, users, tasks, finance, logs, materials, orders, taskStatuses, financeCategories };
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                return { works: [], users: [], tasks: [], finance: [], logs: [], materials: [], orders: [], taskStatuses: [], financeCategories: [] };
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 300)); 
            return {
                works: localLoad(LOCAL_KEYS.WORKS, []),
                users: localLoad(LOCAL_KEYS.USERS, []),
                tasks: localLoad(LOCAL_KEYS.TASKS, []),
                finance: localLoad(LOCAL_KEYS.FINANCE, []),
                logs: localLoad(LOCAL_KEYS.LOGS, []),
                materials: localLoad(LOCAL_KEYS.MATERIALS, DEFAULT_MATERIALS),
                orders: localLoad(LOCAL_KEYS.ORDERS, []),
                taskStatuses: localLoad(LOCAL_KEYS.STATUSES, DEFAULT_TASK_STATUSES),
                financeCategories: localLoad(LOCAL_KEYS.CATEGORIES, DEFAULT_FINANCE_CATEGORIES)
            };
        }
    },
    
    getUsers: async (): Promise<User[]> => {
        const db = getDb();
        if (db) return await getCollectionData<User>(COLLECTIONS.USERS);
        return localLoad<User[]>(LOCAL_KEYS.USERS, []);
    },

    // GENERIC SAVE
    save: async (collectionName: string, id: string, data: any, localKey: string) => {
        const db = getDb();
        if (db) {
            await setDoc(doc(db, collectionName, id), data, { merge: true });
        } else {
            const items = localLoad<any[]>(localKey, []);
            const index = items.findIndex((i: any) => i.id === id);
            if (index >= 0) items[index] = data;
            else items.push(data);
            localSave(localKey, items);
        }
    },

    // GENERIC DELETE
    delete: async (collectionName: string, id: string, localKey: string) => {
        const db = getDb();
        if (db) {
            await deleteDoc(doc(db, collectionName, id));
        } else {
            const items = localLoad<any[]>(localKey, []);
            localSave(localKey, items.filter((i: any) => i.id !== id));
        }
    },

    createWork: async (item: ConstructionWork) => { await api.save(COLLECTIONS.WORKS, item.id, item, LOCAL_KEYS.WORKS); return item; },
    updateWork: async (item: ConstructionWork) => { await api.save(COLLECTIONS.WORKS, item.id, item, LOCAL_KEYS.WORKS); return item; },

    createUser: async (item: User) => { await api.save(COLLECTIONS.USERS, item.id, item, LOCAL_KEYS.USERS); return item; },
    updateUser: async (item: User) => { await api.save(COLLECTIONS.USERS, item.id, item, LOCAL_KEYS.USERS); return item; },
    deleteUser: async (id: string) => { await api.delete(COLLECTIONS.USERS, id, LOCAL_KEYS.USERS); },

    createTask: async (item: Task) => { await api.save(COLLECTIONS.TASKS, item.id, item, LOCAL_KEYS.TASKS); return item; },
    updateTask: async (item: Task) => { await api.save(COLLECTIONS.TASKS, item.id, item, LOCAL_KEYS.TASKS); return item; },

    createFinance: async (item: FinancialRecord) => { await api.save(COLLECTIONS.FINANCE, item.id, item, LOCAL_KEYS.FINANCE); return item; },
    updateFinance: async (item: FinancialRecord) => { await api.save(COLLECTIONS.FINANCE, item.id, item, LOCAL_KEYS.FINANCE); return item; },
    deleteFinance: async (id: string) => { await api.delete(COLLECTIONS.FINANCE, id, LOCAL_KEYS.FINANCE); },

    createLog: async (item: DailyLog) => { await api.save(COLLECTIONS.LOGS, item.id, item, LOCAL_KEYS.LOGS); return item; },

    createMaterial: async (item: Material) => { await api.save(COLLECTIONS.MATERIALS, item.id, item, LOCAL_KEYS.MATERIALS); return item; },
    updateMaterial: async (item: Material) => { await api.save(COLLECTIONS.MATERIALS, item.id, item, LOCAL_KEYS.MATERIALS); return item; },
    deleteMaterial: async (id: string) => { await api.delete(COLLECTIONS.MATERIALS, id, LOCAL_KEYS.MATERIALS); },

    createOrder: async (item: MaterialOrder) => { await api.save(COLLECTIONS.ORDERS, item.id, item, LOCAL_KEYS.ORDERS); return item; },
    updateOrder: async (item: MaterialOrder) => { await api.save(COLLECTIONS.ORDERS, item.id, item, LOCAL_KEYS.ORDERS); return item; },

    createCategory: async (item: FinanceCategoryDefinition) => { await api.save(COLLECTIONS.CATEGORIES, item.id, item, LOCAL_KEYS.CATEGORIES); return item; },
    updateCategory: async (item: FinanceCategoryDefinition) => { await api.save(COLLECTIONS.CATEGORIES, item.id, item, LOCAL_KEYS.CATEGORIES); return item; },
    deleteCategory: async (id: string) => { await api.delete(COLLECTIONS.CATEGORIES, id, LOCAL_KEYS.CATEGORIES); },

    updateStatuses: async (statuses: TaskStatusDefinition[]) => {
        const db = getDb();
        if (db) {
            const batch = writeBatch(db);
            statuses.forEach(s => batch.set(doc(db, COLLECTIONS.STATUSES, s.id), s));
            await batch.commit();
        } else {
            localSave(LOCAL_KEYS.STATUSES, statuses);
        }
        return statuses;
    }
};
