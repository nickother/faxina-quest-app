# Casa compartilhada com Supabase

Com isso, os dois celulares marcam tarefas no mesmo placar e veem as mudanças um do outro em tempo real.
Sem o Supabase configurado, o app continua funcionando normalmente, só que cada celular tem seu progresso.

## 1. Criar o projeto (5 min)
1. Entre em https://supabase.com e crie uma conta grátis.
2. **New project** → nome `faxina-quest`, região **South America (São Paulo)**, defina uma senha do banco e guarde.

## 2. Criar as tabelas
1. No projeto, abra **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/migrations/0001_casa.sql` e clique em **Run**. Deve aparecer "Success".

## 3. Login por código (importante para o iPhone)
No iPhone, o app instalado e o Safari guardam dados separados, então o login usa um **código** digitado no app em vez de um link.
1. **Authentication → Sign In / Providers → Email**: deixe **Email** ligado. "Confirm email" pode ficar ligado.
2. **Authentication → Emails → Templates → Magic Link**: troque o corpo do e-mail por algo como:
   ```html
   <h2>Seu código do Faxina Quest</h2>
   <p>Digite este código no app: <strong>{{ .Token }}</strong></p>
   ```
   Faça o mesmo no template **Confirm signup** (usado no primeiro acesso).
3. O e-mail grátis do Supabase tem limite baixo de envios por hora. Para uso do casal, é suficiente.

## 4. Ligar o app ao projeto
1. **Project Settings → API**: copie a **Project URL** e a chave **anon public**.
   A chave anon é pública por desenho; a segurança vem das regras (RLS) criadas no passo 2. Nunca use a `service_role`.
2. No GitHub do repositório: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_ANON_KEY` = chave anon public
3. **Actions → Deploy no GitHub Pages → Run workflow** (ou qualquer push na `main`).
4. Para rodar no computador: copie `.env.example` para `.env.local` e preencha.

## 5. Usar no iPhone
1. Abra o app → **Ajustes → Casa compartilhada** → e-mail → digite o código recebido.
2. Um de vocês toca em **Criar a nossa casa** e envia o código de 6 letras.
3. O outro faz login e toca em **Entrar na casa** com o código. O progresso dos dois celulares é juntado.

## Como funciona
- Tabela `households`: o estado do jogo da casa (`jsonb`) e um número de versão.
- Cada gravação confere a versão. Se o outro celular gravou antes, o app lê, **mescla** (`src/logic/merge.ts`) e grava de novo:
  tarefas marcadas, contadores, radar, sequência e recordes dos dois são somados; ajustes e nomes seguem quem mexeu por último.
- Mudanças chegam no outro celular em tempo real (Realtime) e também ao abrir o app.
- Sem internet, as marcações ficam no celular e sobem quando a conexão volta.
- Limite: no máximo 2 pessoas por casa.
