
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

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

// Funções mantidas para compatibilidade com o resto do sistema, mas simplificadas
export const initializeFirebase = (config: any): boolean => !!db;
export const disconnectFirebase = () => console.warn("Desconexão desabilitada (Config Fixa).");
export const getSavedConfig = (): any | null => firebaseConfig;
