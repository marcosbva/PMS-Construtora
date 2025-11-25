
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  getDoc,
  onSnapshot,
  Firestore
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDb, getStorageInstance } from "./firebase";
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder, FinanceCategoryDefinition, WorkBudget, InventoryItem, RentalItem } from "../types";

const COLLECTIONS = {
  USERS: 'users',
  WORKS: 'works',
  TASKS: 'tasks',
  FINANCE: 'finance',
  LOGS: 'logs',
  MATERIALS: 'materials',
  ORDERS: 'orders',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
  INVENTORY: 'inventory',
  RENTALS: 'rentals',
  SETTINGS: 'settings' // New collection for global settings
};

// Helper to remove undefined fields which Firestore hates
// Also ensures objects are plain JSON before sending
const cleanData = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

export const api = {
  isOnline: () => !!getDb(),

  // --- FILE UPLOAD (FIREBASE STORAGE) ---
  uploadImage: async (file: File, path: string): Promise<string> => {
      const storage = getStorageInstance();
      if (!storage) throw new Error("Storage não disponível (Modo Offline)");
      
      const storageRef = ref(storage, path);
      
      // Upload raw bytes
      await uploadBytes(storageRef, file);
      
      // Get URL
      return await getDownloadURL(storageRef);
  },

  // --- COMPANY SETTINGS ---
  getCompanySettings: async () => {
      const db = getDb();
      if (!db) return null;
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_info');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
          return snap.data();
      }
      return null;
  },
  
  subscribeToCompanySettings: (callback: (settings: any) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_info');
      return onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
              callback(snap.data());
          } else {
              callback(null);
          }
      });
  },
  
  updateCompanySettings: async (settings: { name?: string; logoUrl?: string; primaryColor?: string }) => {
      const db = getDb();
      if (!db) return;
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_info');
      await setDoc(docRef, settings, { merge: true });
  },

  // --- USERS ---
  subscribeToUsers: (callback: (users: User[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.USERS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as User));
      });
  },
  getUsers: async (): Promise<User[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      return snap.docs.map(d => d.data() as User);
  },
  createUser: async (user: User) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanData(user));
  },
  updateUser: async (user: User) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanData(user));
  },
  deleteUser: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.USERS, id));
  },

  // --- WORKS (OBRAS) ---
  subscribeToWorks: (callback: (works: ConstructionWork[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.WORKS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as ConstructionWork));
      });
  },
  getWorks: async (): Promise<ConstructionWork[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.WORKS));
      return snap.docs.map(d => d.data() as ConstructionWork);
  },
  createWork: async (work: ConstructionWork) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.WORKS, work.id), cleanData(work));
  },
  updateWork: async (work: ConstructionWork) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.WORKS, work.id), cleanData(work));
  },
  deleteWork: async (id: string) => {
      const db = getDb();
      if (!db) return; 
      
      try {
          // Cascade Delete Logic
          const tasksQ = query(collection(db, COLLECTIONS.TASKS), where('workId', '==', id));
          const finQ = query(collection(db, COLLECTIONS.FINANCE), where('workId', '==', id));
          const logsQ = query(collection(db, COLLECTIONS.LOGS), where('workId', '==', id));
          const ordersQ = query(collection(db, COLLECTIONS.ORDERS), where('workId', '==', id));
          const rentalsQ = query(collection(db, COLLECTIONS.RENTALS), where('workId', '==', id));
          const budgetRef = doc(db, COLLECTIONS.BUDGETS, id); // Budget ID = Work ID

          const [tS, fS, lS, oS, rS] = await Promise.all([getDocs(tasksQ), getDocs(finQ), getDocs(logsQ), getDocs(ordersQ), getDocs(rentalsQ)]);
          
          const subDeletions = [
              ...tS.docs.map(d => deleteDoc(d.ref)),
              ...fS.docs.map(d => deleteDoc(d.ref)),
              ...lS.docs.map(d => deleteDoc(d.ref)),
              ...oS.docs.map(d => deleteDoc(d.ref)),
              ...rS.docs.map(d => deleteDoc(d.ref)),
              deleteDoc(budgetRef)
          ];
          
          await Promise.allSettled(subDeletions);
          await deleteDoc(doc(db, COLLECTIONS.WORKS, id));
      } catch (error) {
          console.error("Erro crítico ao excluir obra:", error);
          throw error; 
      }
  },

  // --- TASKS ---
  subscribeToTasks: (callback: (tasks: Task[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.TASKS)); 
      return onSnapshot(q, (snap) => {
          const tasks = snap.docs.map(d => d.data() as Task);
          // Sort client side by dueDate descending (newest first)
          tasks.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
          callback(tasks);
      });
  },
  getTasks: async (): Promise<Task[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.TASKS));
      return snap.docs.map(d => d.data() as Task);
  },
  createTask: async (task: Task) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.TASKS, task.id), cleanData(task));
  },
  updateTask: async (task: Task) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.TASKS, task.id), cleanData(task));
  },
  deleteTask: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.TASKS, id));
  },

  // --- FINANCE ---
  subscribeToFinance: (callback: (records: FinancialRecord[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.FINANCE));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as FinancialRecord));
      });
  },
  getFinance: async (): Promise<FinancialRecord[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.FINANCE));
      return snap.docs.map(d => d.data() as FinancialRecord);
  },
  createFinance: async (rec: FinancialRecord) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.FINANCE, rec.id), cleanData(rec));
  },
  updateFinance: async (rec: FinancialRecord) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.FINANCE, rec.id), cleanData(rec));
  },
  deleteFinance: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.FINANCE, id));
  },

  // --- LOGS ---
  subscribeToAllLogs: (callback: (logs: DailyLog[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.LOGS));
      return onSnapshot(q, (snap) => {
          const logs = snap.docs.map(d => d.data() as DailyLog);
          // Sort by date desc
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(logs);
      });
  },
  subscribeToWorkLogs: (workId: string, callback: (logs: DailyLog[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      // Sort client-side to avoid index errors
      const q = query(collection(db, COLLECTIONS.LOGS), where('workId', '==', workId));
      return onSnapshot(q, (snap) => {
          const logs = snap.docs.map(d => d.data() as DailyLog);
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          callback(logs);
      });
  },
  getLogs: async (): Promise<DailyLog[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.LOGS));
      return snap.docs.map(d => d.data() as DailyLog);
  },
  createLog: async (log: DailyLog) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.LOGS, log.id), cleanData(log));
  },
  updateLog: async (log: DailyLog) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.LOGS, log.id), cleanData(log));
  },
  deleteLog: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.LOGS, id));
  },
  getLastLog: async (workId: string): Promise<DailyLog | null> => {
      const db = getDb();
      if (!db) return null;
      const q = query(collection(db, COLLECTIONS.LOGS), where('workId', '==', workId));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const logs = snap.docs.map(d => d.data() as DailyLog);
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return logs[0];
  },

  // --- MATERIALS ---
  subscribeToMaterials: (callback: (mats: Material[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.MATERIALS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as Material));
      });
  },
  getMaterials: async (): Promise<Material[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.MATERIALS));
      return snap.docs.map(d => d.data() as Material);
  },
  createMaterial: async (mat: Material) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.MATERIALS, mat.id), cleanData(mat));
  },
  updateMaterial: async (mat: Material) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.MATERIALS, mat.id), cleanData(mat));
  },
  deleteMaterial: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.MATERIALS, id));
  },

  // --- ORDERS ---
  subscribeToOrders: (callback: (orders: MaterialOrder[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.ORDERS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as MaterialOrder));
      });
  },
  getOrders: async (): Promise<MaterialOrder[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.ORDERS));
      return snap.docs.map(d => d.data() as MaterialOrder);
  },
  createOrder: async (order: MaterialOrder) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.ORDERS, order.id), cleanData(order));
  },
  updateOrder: async (order: MaterialOrder) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.ORDERS, order.id), cleanData(order));
  },

  // --- FINANCE CATEGORIES ---
  subscribeToCategories: (callback: (cats: FinanceCategoryDefinition[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.CATEGORIES));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as FinanceCategoryDefinition));
      });
  },
  getCategories: async (): Promise<FinanceCategoryDefinition[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
      return snap.docs.map(d => d.data() as FinanceCategoryDefinition);
  },
  createCategory: async (cat: FinanceCategoryDefinition) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, cat.id), cleanData(cat));
  },
  updateCategory: async (cat: FinanceCategoryDefinition) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, cat.id), cleanData(cat));
  },
  deleteCategory: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
  },

  // --- BUDGETS ---
  getBudget: async (workId: string): Promise<WorkBudget | null> => {
      const db = getDb();
      if (!db) return null;
      // Budget ID is 1:1 with Work ID for simplicity
      const snap = await getDoc(doc(db, COLLECTIONS.BUDGETS, workId));
      if (snap.exists()) {
          return snap.data() as WorkBudget;
      }
      return null;
  },
  saveBudget: async (budget: WorkBudget) => {
      const db = getDb();
      if (!db) return;
      // Using setDoc with workId as key
      await setDoc(doc(db, COLLECTIONS.BUDGETS, budget.workId), cleanData(budget));
  },

  // --- INVENTORY ---
  subscribeToInventory: (callback: (items: InventoryItem[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.INVENTORY));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as InventoryItem));
      });
  },
  getInventory: async (): Promise<InventoryItem[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
      return snap.docs.map(d => d.data() as InventoryItem);
  },
  createInventoryItem: async (item: InventoryItem) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.INVENTORY, item.id), cleanData(item));
  },
  updateInventoryItem: async (item: InventoryItem) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.INVENTORY, item.id), cleanData(item));
  },
  deleteInventoryItem: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.INVENTORY, id));
  },

  // --- RENTALS (ALUGUEIS) ---
  subscribeToRentals: (callback: (items: RentalItem[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.RENTALS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as RentalItem));
      });
  },
  getRentals: async (): Promise<RentalItem[]> => {
      const db = getDb();
      if (!db) return [];
      const snap = await getDocs(collection(db, COLLECTIONS.RENTALS));
      return snap.docs.map(d => d.data() as RentalItem);
  },
  createRental: async (item: RentalItem) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.RENTALS, item.id), cleanData(item));
  },
  updateRental: async (item: RentalItem) => {
      const db = getDb();
      if (!db) return;
      await setDoc(doc(db, COLLECTIONS.RENTALS, item.id), cleanData(item));
  },
  deleteRental: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.RENTALS, id));
  },

  restoreDefaults: async () => {
      console.log("Resetting database...");
  }
};
