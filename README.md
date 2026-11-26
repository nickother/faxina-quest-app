# Faxina Quest

Rotina de limpeza da casa, gamificada, em português do Brasil. É um PWA para instalar no **iPhone** pela opção "Adicionar à Tela de Início" do Safari. Funciona offline, e os dados ficam no próprio aparelho (IndexedDB).

| Hoje | Mapa | Sexta | Radar | Guia |
|---|---|---|---|---|
| ![Hoje](docs/screenshots/today.png) | ![Mapa](docs/screenshots/mapa-progresso.png) | ![Sexta](docs/screenshots/raid.png) | ![Radar](docs/screenshots/radar.png) | ![Guia](docs/screenshots/guide.png) |

## O que tem

- **Hoje**: mascote que evolui com o nível, anel de progresso do dia, 3 missões diárias, faxina relâmpago de 15 minutos, rotinas da manhã e da noite (todo dia ou em dias escolhidos), lavanderia do dia, "Piloto automático" e o canto mais atrasado do radar.
- **Mapa**: planta baixa em SVG. Cada cômodo é pintado de baixo para cima conforme as tarefas da faxina são concluídas (coral → amarelo → verde). Cômodos criados aparecem como anexos; dá para adicionar tarefas direto no cômodo.
- **Faxina (raid)**: em qualquer dia da semana que vocês escolherem. Fases em ordem, cronômetro com recorde, combo de XP e 2 missões secretas vindas do radar.
- **Radar**: 26 cantos esquecidos com frequência de 15 a 180 dias.
- **Guia**:
  - *Histórico e recordes*: calendário do mês, XP por semana, tempo das raids, recordes (raid, cômodo, combo, semana, sequência), missões da semana e medalha do mês.
  - *Editar tarefas*: criar (rotina, dia da faxina ou radar), editar nome, dica, horário, dias e cômodo, pausar, excluir e restaurar.
  - *Cômodos*, *Produtos e compras* (lista para mandar no WhatsApp), *Rotinas*, *Ajustes* (mascote, dia da faxina, sons, congelamentos e modo férias), *Instalar no iPhone*, *Backup*, *Lavanderia*, *Vídeos*, *Segurança* e *Conquistas* (com cartão para compartilhar).
- **Apresentação** na primeira abertura, sons de comemoração e animações.

### Regras de jogo

- XP: rotina +5, rotina de nível 2 +8, rotina consolidada +2, lavanderia +15, tarefa da raid +10 (+ combo), canto do radar +25, cômodo 100% +30, raid completa +100, semana de lavanderia +30, consolidação +50, missão diária +10, missão semanal +40, relâmpago no tempo +20.
- O nível *n* exige `100 + 40·n` XP.
- A sequência conta o dia quando mais de 2 tarefas (3 ou mais) são marcadas no dia, de qualquer tipo: rotina (inclusive consolidada), lavanderia, raid ou radar.
- **Congelamento**: começa com 1, ganha mais 1 a cada 7 dias seguidos (máximo 2). Um dia perdido gasta um congelamento automaticamente. **Modo férias** segura a sequência sem gastar congelamento.
- Com 15 execuções a rotina **consolida**: confete, dica de "como manter", +50 XP e desbloqueio da rotina de nível 2.
- Combo: tarefas da raid marcadas com menos de 4 minutos entre si dão +2 XP por nível (máximo +10).
- Missões: 3 diárias e 3 semanais, sorteadas no começo do período. 20 missões diárias no mês valem a medalha do mês.

## Rodar localmente

Requer Node 20 ou mais recente.

```bash
npm install
```

```bash
npm run dev
```

O endereço aparece no terminal (por padrão, `http://localhost:5173/faxina-quest-app/`).

### Testes

```bash
npm test
```

Testes de lógica com Vitest: XP, nível, sequência, congelamento, férias, consolidação, desbloqueio, combo, missões, recordes, relâmpago, cômodos, editor, radar, chaves de período e migração de dados antigos.

```bash
npm run test:e2e
```

Testes com Playwright no viewport do iPhone 14 (390×844): mapa pintando, cômodos novos, apresentação, relâmpago, editor (excluir, restaurar, dias específicos), modo offline e screenshots em `docs/screenshots/`.

### Build

```bash
npm run build
```

O resultado fica em `dist/`. Para conferir o build:

```bash
npm run preview
```

## Deploy

### GitHub Pages (já configurado)

O workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica no GitHub Pages a cada push na branch `main`.

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Faça merge na `main` (ou rode o workflow manualmente em **Actions → Deploy no GitHub Pages → Run workflow**).
4. O app fica em `https://<seu-usuário>.github.io/faxina-quest-app/`.

O caminho base vem do nome do repositório. Se renomear o repositório, nada precisa mudar no workflow.

### Vercel (alternativa)

Importe o repositório na Vercel. O `vercel.json` já define `BASE=/ npm run build` e a pasta `dist`.

## Instalar no iPhone, passo a passo

1. Abra o endereço do app no **Safari**.
2. Toque no botão **Compartilhar** (o quadrado com a seta para cima) na barra de baixo.
3. Role a lista e toque em **Adicionar à Tela de Início**.
4. Confirme o nome **Faxina Quest** e toque em **Adicionar**.
5. Abra sempre pelo ícone na Tela de Início. Instalado, o app abre em tela cheia, funciona sem internet e o iOS não apaga os dados.

Cada iPhone tem o próprio placar. Para levar o progresso para outro aparelho, use **Guia → Backup → Exportar** e depois **Importar** no outro celular.

## Estrutura

```
src/
  data/content.ts     tarefas, dicas, radar, vídeos, segurança e lavanderia
  logic/period.ts     chaves de dia, semana (segunda) e raid (sexta)
  logic/game.ts       regras de XP, nível, sequência, congelamento, consolidação, combo, recordes e relâmpago
  logic/missions.ts   missões diárias e semanais e medalhas
  logic/rooms.ts      cômodos, produtos e edição de tarefas
  logic/history.ts    dados do histórico
  logic/state.ts      formato dos dados salvos (e migração)
  lib/sound.ts        sons sintetizados
  lib/share.ts        cartão de compartilhar
  db.ts               persistência com Dexie (IndexedDB)
  store.tsx           estado do app e recálculo ao voltar para o primeiro plano
  tabs/               Hoje, Mapa, Sexta, Radar, Guia e Editor
  components/         lista de tarefas, dica do mestre, modais e componentes de UI
e2e/                  testes Playwright
scripts/make-icons.mjs  gera os PNGs dos ícones a partir de public/favicon.svg
```

## Próximos passos

- Sincronizar o casal com Supabase (placar único, XP individual e da casa).
- Lembretes por Web Push (iOS 16.4+) ou um arquivo `.ics` para o Calendário.

## Casa compartilhada (Supabase)
Para os dois celulares marcarem no mesmo placar, siga [docs/SUPABASE.md](docs/SUPABASE.md). Sem isso, o app funciona normalmente com o progresso salvo em cada aparelho.
