# Casa compartilhada com Supabase

Com isso, os dois celulares marcam tarefas no mesmo placar e veem as mudanças um do outro em tempo real.
Sem o Supabase configurado, o app continua funcionando normalmente, só que cada celular tem seu progresso.

Tempo total: uns 10 minutos. Tudo é feito no computador, em supabase.com, exceto o último passo (no iPhone).

---

## Passo 1 — Criar a conta e o projeto

1. Acesse https://supabase.com e clique em **Start your project**.
2. Entre com **Continue with GitHub** (mais simples, já que o app está no GitHub) ou com e-mail.
3. Se pedir para criar uma **organização**, dê um nome (ex.: `Nick`), tipo **Personal**, plano **Free**.
4. Clique em **New project** e preencha:
   - **Project name:** `faxina-quest`
   - **Database password:** clique em **Generate a password** e guarde num gerenciador de senhas. O app não usa essa senha, mas você pode precisar dela um dia.
   - **Region:** **South America (São Paulo)** — deixa o app mais rápido no Brasil.
   - Plano **Free**.
5. Clique em **Create new project** e espere 1 a 2 minutos até o painel ficar pronto.

> Plano grátis: o projeto pausa sozinho depois de 7 dias **sem nenhum uso**. Como vocês vão usar toda semana, não deve acontecer. Se pausar, basta entrar no painel e clicar em **Restore**.

---

## Passo 2 — Criar as tabelas (SQL)

1. No menu da esquerda, abra **SQL Editor**.
2. Clique em **New query** (ou no **+**).
3. Abra no GitHub o arquivo [`supabase/migrations/0001_casa.sql`](../supabase/migrations/0001_casa.sql), clique no botão **Copy raw file** e cole tudo no editor.
4. Clique em **Run** (ou Ctrl/Cmd + Enter).
5. Deve aparecer **Success. No rows returned**.
   - Se aparecer um aviso sobre "destructive operation", pode confirmar: o script só cria coisas.
6. Para conferir: menu **Table Editor** → devem existir as tabelas `households` e `household_members`, com o selo **RLS enabled**.

O que o script cria:
- `households`: cada casa, com o estado do jogo e um número de versão.
- `household_members`: quem faz parte de cada casa (máximo 2 pessoas).
- Regras de segurança (RLS): cada pessoa só enxerga a casa da qual é membro.
- Funções `create_household`, `join_household` e `save_household`, usadas pelo app.
- Tempo real ligado na tabela `households`.

---

## Passo 3 — Login com e-mail e senha

O app usa e-mail e senha (funciona dentro do app instalado no iPhone e não depende de modelos de e-mail,
que no plano grátis só podem ser editados com um servidor de e-mail próprio).

1. Menu **Authentication** → **Sign In / Providers** → clique em **Email**.
2. Deixe **Enable Email provider** ligado.
3. **Desligue "Confirm email"**. Assim a conta já entra na hora, sem precisar clicar em link no e-mail.
4. Clique em **Save**.

> Como só vocês dois usam e o acesso aos dados depende de estar na mesma casa (código de convite), não confirmar o e-mail é seguro aqui.
> Esqueceu a senha? Crie outra conta com outro e-mail e entre na casa de novo pelo código (quem saiu precisa tocar em "Sair da casa" antes, se a casa já tiver 2 pessoas).

---

## Passo 4 — Pegar a URL e a chave do projeto

1. **URL do projeto:** menu **Project Settings** (engrenagem) → **Data API** → copie a **Project URL** (algo como `https://abcdefgh.supabase.co`).
   Atalho: o botão **Connect**, no topo do painel, também mostra a URL.
2. **Chave publishable:** **Project Settings** → **API Keys** → aba **Publishable and secret API keys**.
   - Se aparecer o botão **Create new API keys**, clique nele.
   - Copie a **Publishable key** (começa com `sb_publishable_`).

> Segurança:
> - A **publishable key** é feita para ficar dentro de apps; a proteção vem das regras criadas no passo 2.
> - **Nunca** use nem compartilhe a **secret key** (`sb_secret_...`), a antiga `service_role` ou a senha do banco.
> - A antiga chave `anon` está sendo desativada pelo Supabase no fim de 2026; o app usa a publishable.

---

## Passo 5 — Ligar o app ao projeto

O app lê a URL e a chave do arquivo [`.env.production`](../.env.production), que fica no repositório:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Depois de preencher e enviar para a `main`, o GitHub publica o app de novo sozinho (Actions → Deploy no GitHub Pages).
Para rodar no computador, o mesmo vale para `.env.local` (copie de `.env.example`).

---

## Passo 6 — Usar no iPhone

1. Abra o app pelo ícone e puxe para atualizar, ou feche e abra de novo, para pegar a versão nova.
2. **Guia → Ajustes → Casa compartilhada** → **Criar conta** → e-mail e senha (mínimo 6 caracteres).
3. Nas próximas vezes, use **Entrar**.
4. Quem começa toca em **Criar a nossa casa**. Aparece um código de 6 letras e o botão **Enviar convite**.
5. No outro celular: faça login com o outro e-mail → digite o código da casa → **Entrar na casa**.
   O progresso que já existia nos dois celulares é juntado.
6. Pronto: o status mostra "Sincronizado às …" e o que um marca aparece no outro.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "A sincronização ainda não foi configurada" | As variáveis do passo 5 não estavam cadastradas no último deploy. Cadastre e rode o deploy de novo. |
| "Desligue Confirm email" ao criar conta | Faça o passo 3 e depois toque em **Entrar** com o mesmo e-mail e senha. |
| "E-mail ou senha incorretos" | Confira a senha. No primeiro acesso, use **Criar conta**. |
| "Código não encontrado" ao entrar na casa | Confira as 6 letras do convite (sem O, I, L, 0 ou 1). |
| "Esta casa já tem 2 pessoas" | Limite do app. Quem saiu precisa tocar em **Sair da casa**. |
| Erro de função ou tabela inexistente | O SQL do passo 2 não rodou até o fim. Rode o arquivo inteiro de novo (ele pode ser executado mais de uma vez). |

## Como funciona por dentro
- Cada gravação confere a versão da casa. Se o outro celular gravou antes, o app lê, **mescla** (`src/logic/merge.ts`) e grava de novo:
  tarefas marcadas, contadores, radar, sequência e recordes dos dois são somados; ajustes e nomes seguem quem mexeu por último.
- Mudanças chegam no outro celular em tempo real (Realtime) e também ao abrir o app.
- Sem internet, as marcações ficam no celular e sobem quando a conexão volta.
