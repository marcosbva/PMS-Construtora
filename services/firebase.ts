
import { initializeApp, getApps, getApp, FirebaseApp, deleteApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, createUserWithEmailAndPassword, signOut, updatePassword } from "firebase/auth";

// Configuração Fixa (Hardcoded)
// Credenciais limpas e corrigidas para garantir conexão
const firebaseConfig = {
  apiKey: "AIzaSyBUajc87kmIEOt24bZkLXD26Vlwpy6V8SQ",
  authDomain: "pms-engenharia-88ed8.firebaseapp.com",
  projectId: "pms-engenharia-88ed8",
  storageBucket: "pms-engenharia-88ed8.firebasestorage.app",
  messagingSenderId: "268784474256",
  appId: "1:268784474256:web:644f8fc994773561186015"
};

let app: FirebaseApp;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Inicialização Robusta (Singleton Pattern para evitar erros de re-init no React/Vite)
try {
    if (getApps().length > 0) {
        // Se já existe uma instância (ex: hot reload), usa ela
        app = getApp();
        console.log("🔄 Firebase reutilizado (HMR).");
    } else {
        // Se não existe, inicializa uma nova
        app = initializeApp(firebaseConfig);
        console.log("✅ Firebase inicializado com sucesso.");
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    
} catch (error) {
    console.error("❌ Erro CRÍTICO ao inicializar Firebase:", error);
    // Em caso de erro, db e auth permanecem null e o app entra em modo Offline/Local
}

/**
 * Retorna a instância do banco de dados se estiver conectada.
 */
export const getDb = (): Firestore | null => {
    return db;
};

/**
 * Retorna a instância de autenticação se estiver conectada.
 */
export const getAuthInstance = (): Auth | null => {
    return auth;
};

/**
 * Cria um usuário no Firebase Auth usando uma instância secundária do App.
 * Isso previne que o Administrador atual seja deslogado ao criar um novo usuário.
 */
export const createSecondaryAuthUser = async (email: string, pass: string): Promise<string> => {
    if (!db) throw new Error("Modo Offline: Não é possível criar autenticação.");

    // 1. Inicializa um app secundário com nome único
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        // 2. Cria o usuário na instância secundária
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        const uid = userCredential.user.uid;

        // 3. Desloga da instância secundária imediatamente
        await signOut(secondaryAuth);
        
        return uid;
    } catch (error: any) {
        console.error("Erro ao criar usuário secundário:", error);
        throw error;
    } finally {
        // 4. Limpeza: Remove a instância secundária da memória
        deleteApp(secondaryApp).catch(err => console.warn("Erro ao limpar app secundário", err));
    }
};

/**
 * Atualiza a senha do usuário atual
 */
export const updateUserPassword = async (newPass: string) => {
    if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
    await updatePassword(auth.currentUser, newPass);
}

// Funções mantidas para compatibilidade com o resto do sistema, mas simplificadas
export const initializeFirebase = (config: any): boolean => !!db;
export const disconnectFirebase = () => console.warn("Desconexão desabilitada (Config Fixa).");
export const getSavedConfig = (): any | null => firebaseConfig;
