# Guia de Deploy no Render 🚀

Este guia explica como colocar todo o projeto (Backend + OCR + Frontend) no ar usando o Render.

## Estrutura
- **Backend (Web Service):** Um único container Docker rodando o Backend (Node/Bun) e o serviço de OCR (Python) juntos em portas diferentes, mas no mesmo servidor.
- **Frontend (Web Service):** Um container Docker rodando o React servido pelo Nginx.

---

## Passo 1: Configurar no GitHub
1. Certifique-se de que todo o código está no seu repositório `Dannfonseca/SwProject`.
2. O arquivo `render.yaml` na raiz do projeto já contém a "receita" de tudo.

## Passo 2: Criar Projeto no Render
1. Acesse [dashboard.render.com](https://dashboard.render.com/).
2. Clique em **New +** -> **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositório `Dannfonseca/SwProject`.
4. Dê um nome para o Blueprint e clique em **Apply**.

## Passo 3: Configurar Variáveis de Ambiente
O Render vai pedir algumas variáveis que não estão no código (por segurança). Preencha:

### Para o Backend (`sw-project-backend`)
- `DATABASE_URL`: A URL de conexão do seu banco Supabase (postgres://...).
- `GOOGLE_CLIENT_ID`: Seu Client ID do Google Cloud Console (para login).
- `JWT_SECRET`: O Render vai gerar um automático, não precisa mexer.

### Para o Frontend (`sw-project-frontend`)
- `VITE_API_BASE_URL`: **ATENÇÃO:** Você precisa copiar a URL que o Render gerar para o Backend e colar aqui.
  - Ou configurar no `render.yaml` para pegar automaticamente (já está configurado, mas às vezes falha na primeira vez se o backend ainda não existe).

## Passo 4: Deploy
1. Clique em **Apply Changes**.
2. O Render vai começar a construir os dois serviços.
3. Isso pode demorar alguns minutos (o backend instala Python e Node, o frontend faz o build do React).

## Notas Importantes
- **Portas:**
  - O Backend roda publicamente na porta definida pelo Render (ex: 10000).
  - O OCR roda internamente na porta 8008 (não acessível de fora, apenas pelo backend).
- **Frontend:**
  - O Frontend acessa o Backend pela URL pública configurada.

---

**Sucesso!** Seu projeto estará online em duas URLs separadas (uma para o back, outra para o front).
