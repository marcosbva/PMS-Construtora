const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendDir = path.join(__dirname, 'backend');

console.log('\x1b[36m%s\x1b[0m', '=============================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 INICIANDO CONFIGURAÇÃO DO SISTEMA PMS');
console.log('\x1b[36m%s\x1b[0m', '=============================================');

// 1. Verifica se a pasta existe
if (!fs.existsSync(backendDir)) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Erro: A pasta "backend" não foi encontrada.');
    process.exit(1);
}

try {
    // 2. Instalação de Dependências do Backend
    console.log('\n📦 Instalando dependências do Servidor (Backend)...');
    execSync('npm install', { cwd: backendDir, stdio: 'inherit' });

    // 2.1 Instalação de Dependências do Frontend (Raiz)
    console.log('\n📦 Instalando dependências do Painel (Frontend)...');
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });

    // 3. Configuração do Banco de Dados (SQLite)
    const envPath = path.join(backendDir, '.env');
    
    console.log('\n⚙️  Configurando Banco de Dados Local (SQLite)...');
    // Cria .env apontando para arquivo local
    const dbUrl = 'file:./dev.db';
    fs.writeFileSync(envPath, `DATABASE_URL="${dbUrl}"\n`);
    console.log(`   Arquivo .env criado.`);

    console.log('\n🗄️  Criando Tabelas no Banco de Dados...');
    // Generate Prisma Client
    execSync('npx prisma generate', { cwd: backendDir, stdio: 'inherit' });
    // Push schema to sqlite file
    execSync('npx prisma db push', { cwd: backendDir, stdio: 'inherit' });

    // 4. Popular Banco de Dados (Seed)
    console.log('\n🌱 Inserindo dados de exemplo...');
    execSync('npm run seed', { cwd: backendDir, stdio: 'inherit' });

    console.log('\n\x1b[32m%s\x1b[0m', '✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('---------------------------------------------');
    console.log('Agora você pode usar o arquivo "INICIAR.bat" para abrir o programa.');
    console.log('---------------------------------------------');

} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '\n❌ Ocorreu um erro durante a configuração:');
    console.error(error.message);
    // Pausa para ler o erro no Windows
    try { execSync('pause', { stdio: 'inherit' }); } catch(e){}
}