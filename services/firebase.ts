
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Variáveis para armazenar a instância ativa
let app: FirebaseApp | undefined;
let db: Firestore | null = null;

const CONFIG_KEY = 'pms_firebase_config_v1';

/**
 * Inicializa o Firebase com uma configuração fornecida.
 * Retorna true se sucesso, false se falha.
 */
export const initializeFirebase = (config: any): boolean => {
    if (!config || !config.apiKey || !config.projectId) {
        console.warn("Configuração do Firebase inválida ou incompleta.");
        return false;
    }

    try {
        // Verifica se já existe app inicializado com mesmo nome/config para evitar erros
        // Simplificação: Tenta inicializar direto. Se falhar, pega erro.
        app = initializeApp(config);
        db = getFirestore(app);
        
        // Salva no LocalStorage para persistir entre refreshes
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        
        console.log("✅ Firebase (Google Cloud) conectado com sucesso!");
        return true;
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        // Em caso de "App already exists", tentamos recuperar a instância (embora initializeApp deva lidar com isso em reload)
        return false;
    }
};

/**
 * Remove a configuração e desconecta.
 */
export const disconnectFirebase = () => {
    localStorage.removeItem(CONFIG_KEY);
    db = null;
    app = undefined;
    // Recarrega a página para limpar estados globais
    window.location.reload();
};

/**
 * Retorna a instância do banco de dados se estiver conectada.
 */
export const getDb = (): Firestore | null => {
    return db;
};

/**
 * Retorna a configuração salva (para preencher o formulário de settings).
 */
export const getSavedConfig = (): any | null => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
};

// --- AUTO-INICIALIZAÇÃO ---
// Tenta conectar automaticamente ao carregar o arquivo se houver config salva
const saved = localStorage.getItem(CONFIG_KEY);
if (saved) {
    try {
        initializeFirebase(JSON.parse(saved));
    } catch (e) {
        console.error("Falha na auto-conexão do Firebase.", e);
    }
}
