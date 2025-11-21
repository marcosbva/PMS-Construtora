# PMS Construtora Manager

Sistema integrado para gestão de obras, financeiro e materiais.

## Estrutura do Projeto

*   **/**: Frontend (React + Vite + Tailwind)
*   **/backend**: Backend (Node.js + Express + Prisma)

## Como enviar para o GitHub

1.  Crie um repositório no GitHub.
2.  No terminal, na pasta raiz do projeto:
    ```bash
    git init
    git add .
    git commit -m "Primeiro commit"
    git branch -M main
    git remote add origin <SEU_LINK_DO_GITHUB>
    git push -u origin main
    ```

## Como fazer Deploy no Google

### 1. Banco de Dados (PostgreSQL)
Como o sistema usa Prisma, você precisa de um banco PostgreSQL hospedado na nuvem.
*   Sugestão: **Neon.tech** ou **Supabase** (Planos gratuitos excelentes).
*   Pegue a String de Conexão (`DATABASE_URL`) que eles fornecerem.

### 2. Backend (Google Cloud Run)
O backend deve ser implantado como um serviço Docker.
1.  Instale o Google Cloud SDK (`gcloud`).
2.  Na pasta `backend`:
    ```bash
    gcloud run deploy pms-backend --source . --allow-unauthenticated --set-env-vars DATABASE_URL="<SUA_URL_DO_NEON_OU_SUPABASE>"
    ```
3.  Copie a URL gerada (ex: `https://pms-backend-xyz.a.run.app`).

### 3. Frontend (Firebase Hosting)
1.  Instale o Firebase Tools: `npm install -g firebase-tools`
2.  Faça login: `firebase login`
3.  Inicie o projeto (se ainda não fez): `firebase init hosting`
    *   Use pasta `dist` como public directory.
    *   Configure como "single-page app" (Yes).
4.  Defina a variável de ambiente para conectar com o backend (substitua pela URL do passo 2):
    *   Crie um arquivo `.env.production` na raiz (não comite este arquivo se tiver senhas, mas URL é ok):
    ```
    VITE_API_URL=https://pms-backend-xyz.a.run.app
    ```
5.  Faça o build e deploy:
    ```bash
    npm run build
    firebase deploy
    ```

## Rodando Localmente

1.  Use `INSTALAR.bat` para configurar (usa SQLite localmente).
2.  Use `INICIAR.bat` para rodar.
