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
import { getDb } from "./firebase";
import { User, ConstructionWork, Task, FinancialRecord, DailyLog, Material, MaterialOrder } from "../types";

const COLLECTIONS = {
  USERS: 'users',
  WORKS: 'works',
  TASKS: 'tasks',
  FINANCE: 'finance',
  LOGS: 'logs',
  MATERIALS: 'materials',
  ORDERS: 'orders'
};

export const api = {
  isOnline: () => !!getDb(),

  // --- USERS ---
  // Users rarely change, getDocs is fine, but for status updates (block/approve), snapshot is better.
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
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), user);
  },
  updateUser: async (user: User) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.USERS, user.id), { ...user });
  },

  // --- WORKS (OBRAS) ---
  subscribeToWorks: (callback: (works: ConstructionWork[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.WORKS)); // Fetch ALL works to ensure visibility
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
      await setDoc(doc(db, COLLECTIONS.WORKS, work.id), work);
  },
  updateWork: async (work: ConstructionWork) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.WORKS, work.id), { ...work });
  },
  deleteWork: async (id: string) => {
      const db = getDb();
      if (!db) return; 
      
      try {
          console.log(`Iniciando exclusão da obra: ${id}`);
          
          const tasksQ = query(collection(db, COLLECTIONS.TASKS), where('workId', '==', id));
          const finQ = query(collection(db, COLLECTIONS.FINANCE), where('workId', '==', id));
          const logsQ = query(collection(db, COLLECTIONS.LOGS), where('workId', '==', id));
          const ordersQ = query(collection(db, COLLECTIONS.ORDERS), where('workId', '==', id));

          const [tS, fS, lS, oS] = await Promise.all([getDocs(tasksQ), getDocs(finQ), getDocs(logsQ), getDocs(ordersQ)]);
          
          const subDeletions = [
              ...tS.docs.map(d => deleteDoc(d.ref)),
              ...fS.docs.map(d => deleteDoc(d.ref)),
              ...lS.docs.map(d => deleteDoc(d.ref)),
              ...oS.docs.map(d => deleteDoc(d.ref))
          ];
          
          await Promise.allSettled(subDeletions);
          await deleteDoc(doc(db, COLLECTIONS.WORKS, id));
          
          console.log(`Obra ${id} excluída com sucesso.`);
      } catch (error) {
          console.error("Erro crítico ao excluir obra:", error);
          throw error; 
      }
  },

  // --- TASKS (TAREFAS) ---
  // "Mural Rule": Tasks are team property. Subscribe to ALL or filter by work in component.
  // For Dashboard to work (pending tasks count), we need GLOBAL subscription.
  subscribeToTasks: (callback: (tasks: Task[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.TASKS)); 
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as Task));
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
      await setDoc(doc(db, COLLECTIONS.TASKS, task.id), task);
  },
  updateTask: async (task: Task) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.TASKS, task.id), { ...task });
  },
  deleteTask: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.TASKS, id));
  },

  // --- FINANCE (FINANCEIRO) ---
  // "Mural Rule": Finance is project property. Dashboard needs global balance.
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
      await setDoc(doc(db, COLLECTIONS.FINANCE, rec.id), rec);
  },
  updateFinance: async (rec: FinancialRecord) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.FINANCE, rec.id), { ...rec });
  },
  deleteFinance: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.FINANCE, id));
  },

  // --- LOGS (DIÁRIO / INTERCORRÊNCIAS) ---
  // Optimized: Logs are heavy. We subscribe ONLY when entering a Work context (filtered by workId).
  // NO AUTHOR FILTER.
  subscribeToWorkLogs: (workId: string, callback: (logs: DailyLog[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      
      const q = query(
          collection(db, COLLECTIONS.LOGS), 
          where('workId', '==', workId),
          orderBy('date', 'desc')
      );
      
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as DailyLog));
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
      await setDoc(doc(db, COLLECTIONS.LOGS, log.id), log);
  },
  updateLog: async (log: DailyLog) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.LOGS, log.id), { ...log });
  },
  deleteLog: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.LOGS, id));
  },
  getLastLog: async (workId: string): Promise<DailyLog | null> => {
      const db = getDb();
      if (!db) return null;
      const q = query(collection(db, COLLECTIONS.LOGS), where('workId', '==', workId), orderBy('date', 'desc'), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as DailyLog;
  },

  // --- MATERIALS & ORDERS ---
  subscribeToMaterials: (callback: (mats: Material[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.MATERIALS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as Material));
      });
  },
  subscribeToOrders: (callback: (orders: MaterialOrder[]) => void) => {
      const db = getDb();
      if (!db) return () => {};
      const q = query(collection(db, COLLECTIONS.ORDERS));
      return onSnapshot(q, (snap) => {
          callback(snap.docs.map(d => d.data() as MaterialOrder));
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
      await setDoc(doc(db, COLLECTIONS.MATERIALS, mat.id), mat);
  },
  updateMaterial: async (mat: Material) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.MATERIALS, mat.id), { ...mat });
  },
  deleteMaterial: async (id: string) => {
      const db = getDb();
      if (!db) return;
      await deleteDoc(doc(db, COLLECTIONS.MATERIALS, id));
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
      await setDoc(doc(db, COLLECTIONS.ORDERS, order.id), order);
  },
  updateOrder: async (order: MaterialOrder) => {
      const db = getDb();
      if (!db) return;
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), { ...order });
  },

  restoreDefaults: async () => {
      console.log("Resetting database...");
  }
};