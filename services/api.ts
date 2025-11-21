
import { 
    User, ConstructionWork, Task, FinancialRecord, DailyLog, MaterialOrder, Material, 
    UserProfile, TaskStatusDefinition, FinanceCategoryDefinition 
} from '../types';
import { 
    MOCK_USERS, MOCK_WORKS, MOCK_TASKS, MOCK_FINANCE, MOCK_LOGS, MOCK_MATERIALS, 
    MOCK_ORDERS, MOCK_PROFILES, DEFAULT_TASK_STATUSES, DEFAULT_FINANCE_CATEGORIES 
} from '../constants';

// Automatically detects if running locally or in production (Vite env vars)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper to try fetching from backend, fallback to mock if fails
async function fetchWithFallback<T>(endpoint: string, mockData: T): Promise<T> {
    try {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) throw new Error('Backend unavailable');
        return await response.json();
    } catch (error) {
        console.warn(`API Error on ${endpoint}: Using Fallback Data.`);
        return mockData;
    }
}

// Helper for POST/PUT/DELETE
async function sendData<T>(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', data?: any): Promise<T | null> {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Action failed');
        return await response.json();
    } catch (error) {
        console.error(`API Action Error ${method} ${endpoint}:`, error);
        // In a real app, you might throw here. For this demo, we assume success in UI 
        // if backend is down to keep the "Simulation" alive.
        return data as T; 
    }
}

export const api = {
    // --- INITIAL LOAD ---
    getAllData: async () => {
        try {
            const response = await fetch(`${API_URL}/initial-data`);
            if (!response.ok) throw new Error('Backend unavailable');
            return await response.json();
        } catch (error) {
            console.warn("Backend offline or CORS error. Loading complete Mock set.");
            return {
                works: MOCK_WORKS,
                users: MOCK_USERS,
                profiles: MOCK_PROFILES,
                tasks: MOCK_TASKS,
                finance: MOCK_FINANCE,
                logs: MOCK_LOGS,
                materials: MOCK_MATERIALS,
                orders: MOCK_ORDERS,
                taskStatuses: DEFAULT_TASK_STATUSES,
                financeCategories: DEFAULT_FINANCE_CATEGORIES
            };
        }
    },

    // --- WORKS ---
    createWork: (work: ConstructionWork) => sendData<ConstructionWork>('/works', 'POST', work),
    updateWork: (work: ConstructionWork) => sendData<ConstructionWork>(`/works/${work.id}`, 'PUT', work),

    // --- USERS ---
    createUser: (user: User) => sendData<User>('/users', 'POST', user),
    updateUser: (user: User) => sendData<User>(`/users/${user.id}`, 'PUT', user),
    deleteUser: (id: string) => sendData<void>(`/users/${id}`, 'DELETE'),

    // --- TASKS ---
    createTask: (task: Task) => sendData<Task>('/tasks', 'POST', task),
    updateTask: (task: Task) => sendData<Task>(`/tasks/${task.id}`, 'PUT', task),

    // --- FINANCE ---
    createFinance: (rec: FinancialRecord) => sendData<FinancialRecord>('/finance', 'POST', rec),
    updateFinance: (rec: FinancialRecord) => sendData<FinancialRecord>(`/finance/${rec.id}`, 'PUT', rec),
    deleteFinance: (id: string) => sendData<void>(`/finance/${id}`, 'DELETE'),

    // --- LOGS ---
    createLog: (log: DailyLog) => sendData<DailyLog>('/logs', 'POST', log),

    // --- MATERIALS ---
    createMaterial: (mat: Material) => sendData<Material>('/materials', 'POST', mat),
    updateMaterial: (mat: Material) => sendData<Material>(`/materials/${mat.id}`, 'PUT', mat),
    deleteMaterial: (id: string) => sendData<void>(`/materials/${id}`, 'DELETE'),

    // --- ORDERS ---
    createOrder: (order: MaterialOrder) => sendData<MaterialOrder>('/orders', 'POST', order),
    updateOrder: (order: MaterialOrder) => sendData<MaterialOrder>(`/orders/${order.id}`, 'PUT', order),

    // --- SETTINGS ---
    createProfile: (p: UserProfile) => sendData<UserProfile>('/profiles', 'POST', p),
    updateProfile: (p: UserProfile) => sendData<UserProfile>(`/profiles/${p.id}`, 'PUT', p),
    createCategory: (c: FinanceCategoryDefinition) => sendData<FinanceCategoryDefinition>('/categories', 'POST', c),
    updateStatuses: (statuses: TaskStatusDefinition[]) => {
        // Batch update usually requires specific endpoint, implementing simplified here
        // In production: POST /api/statuses/batch
        return Promise.resolve(statuses); 
    }
};
