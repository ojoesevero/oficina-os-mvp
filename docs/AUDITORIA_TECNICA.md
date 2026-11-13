# AUDITORIA TÉCNICA COMPLETA — JS ORÇAFÁCIL (OFICINA OS)

**Projeto:** JS OrçaFácil (`oficina-os-mvp`)  
**Proprietário / Fornecedor:** Jonatan Severo Tech  
**Data da Auditoria:** 13/11/2026  
**Escopo:** Revisão estática integral do código-fonte, esquema SQL, autenticação, isolamento multi-tenant, fluxos funcionais, UX/UI, qualidade e execução de verificações automatizadas disponíveis (sem alteração de arquivos do sistema).

---

## A. Resumo Executivo

O projeto **JS OrçaFácil** apresenta uma interface moderna, responsiva e bem direcionada para a dor real de oficinas mecânicas (check-in com fotos comprimidas em WebP no cliente, orçamento rápido e aprovação em 1 clique pelo cliente via link enviado no WhatsApp). O esquema SQL (`supabase_schema.sql`) já evoluiu para contemplar isolamento multi-tenant com Row Level Security (RLS) e RPCs `SECURITY DEFINER` para o portal público do cliente.

Contudo, **o sistema NÃO está pronto para produção comercial nem para um piloto com dados reais de clientes sem correções prévias obrigatórias**. O principal motivo é uma **desconexão crítica entre a arquitetura de segurança desenhada no SQL e a implementação real no frontend**:

1. **Autenticação vulnerável e contornável no cliente:** O fluxo de login de oficinas (`src/lib/authService.ts`) permite acesso com **qualquer senha de 6+ caracteres** caso a oficina não tenha `senha_acesso` definida ou o Supabase Auth falhe, além de validar credenciais de Super Admin (`/admin`) exclusivamente no navegador com senha padrão (`admin123` ou variável `NEXT_PUBLIC_*` exposta no bundle).
2. **Sessão baseada em `localStorage` e ausência de backend/API:** Toda a aplicação roda em Client Components (`'use client'`), sem rotas `/api/*` nem `middleware.ts`. A sessão ativa da oficina é lida de `localStorage`, o que permite falsificação local e faz com que ações feitas via Painel Admin ou login de fallback não gerem um JWT válido do Supabase (`auth.uid()`), quebrando as políticas RLS reais no banco.
3. **Funcionalidades parciais ou simuladas:** O cadastro estruturado de **Clientes**, **Veículos** e **Catálogo** em tabelas relacionais existe no SQL, mas não é utilizado pela aplicação. Os cards financeiros laterais ("Totais Financeiros" e "Ordens Nesta Semana") exibem **porcentagens estimadas fixas (`45% / 50% / 5%`) e gráfico estático (`+18%`)** em vez de dados reais.
4. **Cobertura de testes ilusória:** A suíte `tests/service.test.mjs` passa 10/10, mas **reimplementa cópias das funções dentro do próprio arquivo de teste** em vez de importar os módulos reais de `src/`.

---

## Mapeamento da Arquitetura Atual

### Tecnologias, Frameworks e Versões
| Item | Versão / Tecnologia | Evidência |
| :--- | :--- | :--- |
| Framework Web | Next.js `16.4.2` (App Router + Turbopack, `cacheComponents: true`, `partialPrefetching: true`) | `package.json`, `next.config.ts` |
| Biblioteca UI | React `19.3.0` / React DOM `19.3.0` | `package.json` |
| Linguagem | TypeScript `^5` (`strict: true`) | `package.json`, `tsconfig.json` |
| Estilização | Tailwind CSS `^4` (`@tailwindcss/turbopack`) | `package.json`, `next.config.ts` |
| Banco / Auth / Storage / Realtime | `@supabase/supabase-js` `^2.118.0` | `package.json`, `src/lib/supabase.ts` |
| Ícones e Efeitos | `lucide-react` `^1.60.0`, `canvas-confetti` `^1.9.4` | `package.json` |
| Qualidade | ESLint `^9` (`eslint-config-next` `16.4.2`) | `package.json`, `eslint.config.mjs` |
| Testes | Node Test script customizado (`node tests/service.test.mjs`) | `package.json`, `tests/service.test.mjs` |

### Estrutura de Diretórios e Rotas
- `src/app/page.tsx` (`/`): Painel principal da oficina (Dashboard de OS, alteração de status, adição de itens pós-aprovação, link de veículo pronto, alertas de retorno 6 meses).
- `src/app/login/page.tsx` (`/login`): Tela de autenticação das oficinas.
- `src/app/nova-os/page.tsx` (`/nova-os`): Abertura de Ordem de Serviço / Orçamento com check-in fotográfico e envio via WhatsApp.
- `src/app/os/[id]/page.tsx` (`/os/[id]`): Portal público do cliente final para visualização de fotos/itens e aprovação do orçamento em 1 clique.
- `src/app/admin/page.tsx` (`/admin`): Painel Administrativo Master (Jonatan Severo Tech) para cadastrar/editar/suspender/excluir oficinas, upload de logo, cor primária e catálogo rápido.
- `src/lib/supabase.ts`: Cliente Supabase e massa de dados estática `DEMO_OFICINAS`, `DEMO_ORDENS_SERVICO`, `DEMO_ITENS_OS`.
- `src/lib/authService.ts`: Gestão de sessão em `localStorage`, login de oficina, modo demo e autenticação do Super Admin.
- `src/lib/osService.ts`: Camada de acesso a dados (híbrida: Supabase + fallback/cache em `localStorage`), compressão WebP, upload para Storage, geração de links `wa.me` e logger estruturado.
- `src/types/database.ts`: Interfaces TypeScript (`Oficina`, `OrdemServico`, `ItemOS`, `ServicoCatalogo`).
- `src/utils/masks.ts`: Máscaras de placa (Mercosul/tradicional), telefone BR e quilometragem.
- `supabase_schema.sql`: DDL das tabelas, índices, trigger, políticas RLS e RPCs públicas.

### Variáveis de Ambiente Identificadas
- **Documentadas em `.env.example` e presentes em `.env.local`:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Referenciadas no código, mas ausentes do `.env.example`:**
  - `NEXT_PUBLIC_ENABLE_DEMO` (`src/lib/authService.ts:12`)
  - `NEXT_PUBLIC_ADMIN_EMAIL` (`src/lib/authService.ts:231`)
  - `NEXT_PUBLIC_ADMIN_PASSWORD` (`src/lib/authService.ts:232`) — **Risco crítico: prefixo `NEXT_PUBLIC_` expõe a senha no bundle do navegador.**

### Pontos de Acoplamento e Fragilidade
- **Acoplamento total ao navegador (`localStorage`):** `osService.ts` e `authService.ts` misturam dados reais do Supabase com chaves locais (`oficina_os_items_data_v1`, `oficina_os_oficinas_v1`, `oficina_os_branding_v1`, `oficina_os_deleted_oficinas_v1`). Em múltiplos fluxos, falhas no Supabase são capturadas em `try/catch` e mascaradas com sucesso local, gerando falsa sensação de persistência.
- **Ausência de Backend Próprio (`/api/*`):** Operações administrativas (`/admin`) e de criação de usuários no Supabase Auth não possuem camada server-side segura com `SUPABASE_SERVICE_ROLE_KEY`.

---

## B. Inventário de Funcionalidades

| Funcionalidade | Situação | Evidência no Código | Observações |
| :--- | :--- | :--- | :--- |
| **Cadastro e edição de clientes** | **Parcial** | `supabase_schema.sql:46-55`, `src/app/nova-os/page.tsx:390-425` | Tabela `clientes` existe no SQL, mas nunca é consultada/gravada. Nome e WhatsApp são digitados a cada OS como texto livre em `ordens_servico`. Não há tela de edição/listagem de clientes. |
| **Cadastro e edição de veículos** | **Parcial** | `supabase_schema.sql:58-69`, `src/app/nova-os/page.tsx:333-379` | Tabela `veiculos` existe no SQL, mas não é usada pelo frontend. Placa, modelo e KM são gravados direto na OS. |
| **Histórico de veículos e serviços** | **Ausente** | `src/app/page.tsx:287-306` | Existe apenas busca textual na lista de OS da oficina (placa/modelo/cliente/código). Não existe tela ou linha do tempo consolidada por veículo/placa. |
| **Abertura de ordens de serviço** | **Implementado (com ressalvas)** | `src/app/nova-os/page.tsx`, `src/lib/osService.ts:732-818` | Interface funcional e mobile-first, mas inicia com 2 itens fictícios pré-preenchidos e não valida erro ao inserir em `itens_os` no Supabase. |
| **Inclusão de peças e mão de obra (Serviço Técnico)** | **Implementado** | `src/app/nova-os/page.tsx:491-627`, `src/app/page.tsx:1189-1391` | Permite incluir itens manuais e via catálogo rápido na abertura e também editar/adicionar após aprovação. |
| **Cálculo de valores, descontos e totais** | **Parcial** | `src/app/nova-os/page.tsx:99-105`, `src/lib/osService.ts:736` | Soma corretamente Peças + Serviços Técnicos no frontend e backend. **Não há suporte a quantidade, descontos ou acréscimos.** |
| **Orçamentos** | **Implementado** | `src/app/nova-os/page.tsx`, `src/app/os/[id]/page.tsx` | Toda OS nasce com status `ORCAMENTO` e link público dedicado para o cliente. |
| **Aprovação ou rejeição de orçamentos pelo cliente** | **Parcial** | `src/app/os/[id]/page.tsx:83-118`, `src/lib/osService.ts:884-914` | Aprovação funciona via RPC `aprovar_orcamento_publico` com carimbo de data/dispositivo/hash. **Não existe botão/fluxo de rejeição pelo cliente**, nem feedback visual de erro se a aprovação falhar. |
| **Alteração de status da OS** | **Implementado** | `src/app/page.tsx:315-373`, `src/lib/osService.ts:821-881` | Transição rápida via `<select>` (`ORCAMENTO`, `APROVADO`, `EM_SERVICO`, `FINALIZADO`, `CANCELADO`), abrindo modal de link pronto ao finalizar. |
| **Registro de entrada e saída de veículos** | **Parcial** | `src/app/nova-os/page.tsx`, `src/app/page.tsx:1390-1496` | Há check-in fotográfico e KM na entrada, e status `FINALIZADO` ("Pronto para Retirada"). Não há registro formal de data/hora/responsável pela entrega/saída física. |
| **Fotos e anexos** | **Implementado (com risco)** | `src/lib/osService.ts:609-718` | Compressão client-side para WebP funciona bem. Porém, se o upload ao Supabase Storage falhar (ex.: sem JWT válido), salva `Data URL (base64)` no `localStorage` ou no banco. |
| **Controle financeiro** | **Com defeito / Simulado** | `src/app/page.tsx:309-313`, `1098-1132` | O painel "Totais Financeiros" calcula `45%`, `50%` e `5%` fixos sobre o total bruto das OS (inclusive canceladas e em orçamento), em vez de somar itens reais ou registrar pagamentos/recebimentos. |
| **Dashboard e indicadores** | **Parcial / Simulado** | `src/app/page.tsx:254-313`, `1033-1182` | Contadores por status funcionam sobre as OS carregadas. Card "Ordens Nesta Semana" (`+18%` e SVG) é totalmente estático/fictício. |
| **Notificações e integração com WhatsApp** | **Implementado** | `src/lib/osService.ts:974-1117` | Gera links `wa.me` bem formatados (orçamento detalhado, reenvio adicional, veículo pronto e revisão preventiva). Depende de abertura manual pelo usuário no WhatsApp Web/App. |
| **Alertas de retorno e manutenção** | **Implementado (parcial no cálculo)** | `src/app/page.tsx:261-284`, `968-1027` | Calcula automaticamente +180 dias na criação da OS e lista vencidos/a vencer em 15 dias na aba "Alertas 6 Meses". Não permite personalizar o prazo por serviço. |
| **Relatórios e consultas** | **Ausente** | — | Não há exportação CSV/PDF, impressão de OS/recibo, nem relatórios por período/faturamento real. |

---

## C. Bugs Encontrados

### BUG-01 — Totais Financeiros simulados por porcentagem fixa no Dashboard
- **Arquivo e localização:** `src/app/page.tsx:309-313` e `1098-1132`
- **Descrição:** Os valores exibidos em "Serviço Técnico", "Peças & Componentes" e "Insumos & Outros" são calculados multiplicando `totalGeral` por `0.45`, `0.50` e `0.05` (incluindo OS com status `ORCAMENTO` e `CANCELADO`).
- **Como reproduzir:** Criar uma OS apenas com R$ 1.000,00 de Peças e R$ 0,00 de Serviço Técnico. O Dashboard exibirá R$ 450,00 de Serviço Técnico e R$ 500,00 de Peças.
- **Impacto:** Informações financeiras incorretas para o dono da oficina, gerando desconfiança imediata no produto.
- **Correção sugerida:** Calcular os totais reais a partir dos itens (`itens_os`) filtrando por status válidos (ex.: `APROVADO`, `EM_SERVICO`, `FINALIZADO`).

### BUG-02 — Gráfico "Ordens Nesta Semana" estático e hardcoded
- **Arquivo e localização:** `src/app/page.tsx:1135-1180`
- **Descrição:** O card exibe um SVG fixo e o selo `+18%` independentemente dos dados reais da oficina.
- **Como reproduzir:** Acessar o painel com uma oficina recém-criada sem nenhuma OS; o gráfico continuará mostrando crescimento de `+18%`.
- **Impacto:** Métrica enganosa na tela principal.
- **Correção sugerida:** Agregar `ordens` por dia da semana com base em `created_at` e calcular a variação percentual real em relação à semana anterior.

### BUG-03 — Operação não atômica ao editar itens de OS e dessincronização de `aprovado_dispositivo`
- **Arquivo e localização:** `src/lib/osService.ts:511-539`
- **Descrição:** `atualizarItensEReenviarOS` executa `delete` em `itens_os`, depois `insert` em `itens_os` e depois `update` em `ordens_servico`, sem transação no banco e sem checar o erro do `delete`/`insert`. Além disso, o `update` na linha 524 zera `aprovado_em: null`, mas **esquece de zerar `aprovado_dispositivo: null`** no Supabase.
- **Como reproduzir:** Editar uma OS já aprovada com conexão instável ou erro de RLS no `insert`; a OS pode ficar sem itens no banco. Ao reabrir, o dispositivo da aprovação anterior permanece gravado no banco.
- **Impacto:** Perda de itens do orçamento e inconsistência na trilha de auditoria.
- **Correção sugerida:** Criar uma RPC transacional no PostgreSQL (`atualizar_itens_os`) que execute `DELETE` + `INSERT` + `UPDATE` atomicamente e limpe `aprovado_dispositivo = null`.

### BUG-04 — Criação de OS não trata falha parcial ao inserir itens no Supabase
- **Arquivo e localização:** `src/lib/osService.ts:772-805`
- **Descrição:** `createOrdemServico` insere em `ordens_servico`, obtém `data.id`, e chama `await supabase.from('itens_os').insert(itensToInsert)` sem verificar `{ error }`. Se `itens_os` falhar (ex.: RLS ou timeout), a OS é criada vazia sem aviso.
- **Como reproduzir:** Simular erro na inserção de `itens_os` após sucesso em `ordens_servico`.
- **Impacto:** Ordem de Serviço salva com `valor_total` preenchido, porém sem nenhum item visível para o cliente.
- **Correção sugerida:** Criar RPC transacional `criar_os_completa` ou verificar `error` em `itens_os` com tratamento explícito de falha.

### BUG-05 — Pré-preenchimento de itens fictícios no formulário de Nova OS
- **Arquivo e localização:** `src/app/nova-os/page.tsx:62-65`
- **Descrição:** O estado inicial de `itens` já vem populado com `"Óleo Sintético 5W30 + Filtro" (R$ 280)` e `"Serviço Técnico: Troca e Check-up 20 Itens" (R$ 150)`.
- **Como reproduzir:** Abrir `/nova-os`; os dois itens já estão na lista antes de o mecânico digitar qualquer coisa.
- **Impacto:** Alto risco de erro operacional: mecânico apressado pode enviar orçamento cobrando troca de óleo que não faz parte do serviço do cliente.
- **Correção sugerida:** Iniciar `itens` como array vazio `[]` (exibindo um estado vazio orientando o toque no catálogo rápido ou adição manual).

### BUG-06 — Mensagem de WhatsApp enviada pela lista do Dashboard omite detalhamento quando em modo Supabase
- **Arquivo e localização:** `src/app/page.tsx:733-753` e `850-870`; `src/lib/osService.ts:1013-1020`
- **Descrição:** Nas linhas da tabela e cards mobile do Dashboard, `generateWhatsAppLinkParaCliente` é chamado sem passar `itens`. A função tenta buscar em `getLocalItens()`, que só possui dados quando a OS foi criada/salva no `localStorage`. No Supabase em produção, `itensOS` fica vazio e a mensagem perde o detalhamento e os subtotais de Peças vs. Serviços Técnicos.
- **Como reproduzir:** Carregar uma OS vinda exclusivamente do Supabase no Dashboard e clicar no ícone do WhatsApp na linha da OS.
- **Impacto:** Inconsistência entre o link gerado na criação/edição e o link reenviado pelo painel.
- **Correção sugerida:** Carregar os itens junto na consulta (`select('*, oficinas(*), itens_os(*)')`) ou buscar os itens ao clicar para abrir o WhatsApp.

### BUG-07 — `aprovarOrçamento` sem feedback de erro na tela do cliente e fallback sem validação
- **Arquivo e localização:** `src/app/os/[id]/page.tsx:83-118`
- **Descrição:** Se `aprovarOrçamento(os.id)` retornar `{ ok: false }` ou lançar exceção, a UI apenas encerra o loading (`finally`) sem exibir mensagem de erro ao cliente final.
- **Como reproduzir:** Acessar `/os/[id]` com rede offline ou RPC retornando `false` (ex.: OS já não está em `ORCAMENTO`).
- **Impacto:** Cliente clica em "Aprovar Orçamento", nada acontece visualmente e ele acredita que aprovou ou acha que o botão quebrou.
- **Correção sugerida:** Exibir alerta claro de erro na interface quando `!resultado.ok` ou no `catch`.

### BUG-08 — `handleAcessarPatioOficina` no `/admin` troca apenas `localStorage` sem sessão Supabase
- **Arquivo e localização:** `src/app/admin/page.tsx:265-268`
- **Descrição:** Ao clicar para entrar no pátio de uma oficina pelo `/admin`, o sistema apenas grava a oficina no `localStorage` sem autenticar no Supabase Auth.
- **Como reproduzir:** Usar o botão de acessar pátio no `/admin` com RLS ativo no Supabase.
- **Impacto:** O painel não consegue ler nem gravar dados reais daquela oficina no banco protegido por RLS.
- **Correção sugerida:** Remover acesso direto sem autenticação em produção ou implementar impersonação controlada via backend/edge function com trilha de auditoria.

### BUG-09 — `next build` falha no ambiente local Windows/sandbox por `EPERM` ao limpar `.next`
- **Arquivo e localização:** Diretório `.next/static/` (observado ao executar `npm.cmd run build`)
- **Descrição:** O comando `npm.cmd run build` falhou com `Error: EPERM: operation not permitted, rmdir '...\oficina-os-mvp-1\.next\static\...'`.
- **Impacto:** Impede validar o build de produção completo localmente dentro do sandbox/OneDrive.
- **Correção sugerida:** Executar builds fora de pastas sincronizadas pelo OneDrive ou limpar `.next` antes do build em ambiente CI/Vercel.

---

## D. Vulnerabilidades de Segurança

### VULN-01 — [CRÍTICA] Bypass completo de autenticação em `loginOficina` (qualquer senha >= 6 caracteres)
- **Evidência:** `src/lib/authService.ts:204-209`
  ```ts
  // 3. Acesso para oficinas cadastradas sem senha customizada / modo demonstração
  if (foundOficina && password.length >= 6) {
    setCurrentOficina(foundOficina);
    return { success: true, oficina: foundOficina };
  }
  ```
- **Cenário de exploração:** Qualquer atacante que descubra o e-mail de uma oficina (ex.: via lista padrão, OS ou engenharia social) pode fazer login digitando qualquer senha com 6 ou mais caracteres (ex.: `123456` ou `aaaaaa`) caso `senha_acesso` não esteja preenchida naquela máquina. Como `senha_acesso` no fluxo atual do `/admin` é salva apenas no `localStorage` do navegador do administrador (não existe coluna `senha_acesso` na tabela `oficinas` do `supabase_schema.sql`), **em qualquer outro dispositivo `foundOficina.senha_acesso` será `undefined`**, ativando o bypass imediatamente!
- **Impacto:** Comprometimento total da conta da oficina.
- **Correção recomendada:** Remover completamente os blocos de fallback (linhas 172-184 e 204-216). Exigir exclusivamente `supabase.auth.signInWithPassword` em produção, mantendo modo demo apenas se `!isSupabaseConfigured` ou em build de desenvolvimento isolado.

### VULN-02 — [CRÍTICA] Painel Administrativo (`/admin`) protegido apenas no cliente com senha exposta no bundle
- **Evidência:** `src/lib/authService.ts:227-284`
  - `process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'`
  - `localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true')`
- **Cenário de exploração:**
  1. Variáveis `NEXT_PUBLIC_*` são compiladas em texto claro no JavaScript público servido ao navegador. Qualquer usuário pode inspecionar o código-fonte no DevTools e descobrir o e-mail e a senha master.
  2. Mesmo sem descobrir a senha, basta abrir o Console do navegador e executar `localStorage.setItem('jonatansevero_super_admin_session_v1', 'true')` e recarregar `/admin` para ganhar acesso completo ao painel administrativo.
- **Impacto:** Acesso irrestrito ao backoffice SaaS, podendo visualizar, alterar, suspender ou excluir oficinas no estado local e acessar pátios.
- **Correção recomendada:** Mover a autenticação e autorização do `/admin` para o servidor (Supabase Auth com role/claim `is_super_admin` validada no JWT + Route Handlers/Server Actions protegidos no servidor, usando `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor). Nunca usar `NEXT_PUBLIC_*` para senhas.

### VULN-03 — [CRÍTICA] Sessão baseada em `localStorage` sem verificação de JWT e incompatibilidade com RLS
- **Evidência:** `src/lib/authService.ts:47-76`, `src/app/page.tsx:96-100`, `src/app/nova-os/page.tsx:78-82`
- **Cenário de exploração:** A proteção das rotas privadas (`/`, `/nova-os`) verifica apenas se existe um JSON em `localStorage` (`oficina_os_current_auth_v1`). Um usuário mal-intencionado pode injetar qualquer objeto `Oficina` com outro `id` no `localStorage`. Além disso, quando o login ocorre sem `supabase.auth.signInWithPassword`, o cliente Supabase envia requisições com a `anon key` (role `anon`), sendo bloqueado pelo RLS (`to authenticated`) e caindo silenciosamente no fallback local.
- **Impacto:** Quebra de confiança na sessão, falha silenciosa de persistência no Supabase e risco de exposição caso políticas de banco sejam relaxadas.
- **Correção recomendada:** Usar `supabase.auth.getSession()` / `@supabase/ssr` com cookies `HttpOnly` e `middleware.ts` no Next.js para proteger rotas no servidor, derivando a oficina ativa exclusivamente do usuário autenticado no Supabase.

### VULN-04 — [ALTA] Modo Demo habilitado por padrão em produção
- **Evidência:** `src/lib/authService.ts:9-12`
  ```ts
  export const isDemoModeEnabled =
    process.env.NODE_ENV === 'development' ||
    !isSupabaseConfigured ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'false';
  ```
- **Cenário de exploração:** Se o deploy na Vercel não definir explicitamente `NEXT_PUBLIC_ENABLE_DEMO=false`, `isDemoModeEnabled` permanece `true` em produção, permitindo login nas contas `DEMO_ACCOUNTS` com qualquer senha >= 6 caracteres.
- **Impacto:** Acesso indevido em ambiente de produção.
- **Correção recomendada:** Inverter a lógica para opt-in estrito: `process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'` (e jamais permitir quando `NODE_ENV === 'production'` sem flag explícita, preferencialmente removendo contas demo do bundle de produção).

### VULN-05 — [ALTA] Fluxo de `/admin` e `/login` incompatível com RLS estrito de `oficinas`
- **Evidência:** `supabase_schema.sql:198-218` vs `src/lib/osService.ts:152`, `294-314`, `362-373`
- **Cenário de exploração:** No SQL blindado, `oficinas` só permite `SELECT`/`INSERT`/`UPDATE`/`DELETE` para `authenticated` onde `user_id = auth.uid() or id = public.current_oficina_id()`. Logo:
  - Na tela `/login`, um usuário anônimo (`anon`) não pode consultar `oficinas` (embora `loginOficina` tente chamar `fetchOficinas()` antes de logar).
  - No `/admin`, o administrador não cria usuários em `auth.users` nem possui `service_role`, logo suas operações de criar/editar/excluir oficinas falham no Supabase e ficam apenas no `localStorage` do seu navegador.
- **Impacto:** Oficinas cadastradas no `/admin` não existem de fato no banco para outros dispositivos nem conseguem autenticar no Supabase Auth.
- **Correção recomendada:** Criar API Routes server-side (`/api/admin/oficinas`) protegidas por sessão de Super Admin real, utilizando `supabaseAdmin` (`SUPABASE_SERVICE_ROLE_KEY`) para criar o usuário no `auth.users` (via `auth.admin.createUser` com `app_metadata: { oficina_id }`) e inserir/atualizar a tabela `oficinas` atomicamente.

### VULN-06 — [MÉDIA] Bucket `fotos-os` com leitura pública irrestrita e upload sem restrição de caminho/MIME/tamanho
- **Evidência:** `supabase_schema.sql:447-459`
  ```sql
  create policy "Upload de fotos de OS" on storage.objects
    for insert to authenticated with check (bucket_id = 'fotos-os');
  create policy "Visualização de fotos de OS" on storage.objects
    for select using (bucket_id = 'fotos-os');
  ```
- **Cenário de exploração:** Qualquer usuário autenticado de uma oficina pode subir arquivos arbitrários (sem restrição de MIME type ou tamanho no bucket) e não há prefixo por `oficina_id` na pasta do arquivo (`src/lib/osService.ts:687`). Além disso, qualquer pessoa com a URL (ou listagem se permitida) acessa fotos de veículos (que podem conter placas visíveis, dado pessoal sob LGPD).
- **Impacto:** Exposição potencial de imagens entre tenants e abuso de armazenamento.
- **Correção recomendada:** Organizar uploads em `${oficina_id}/${os_id}/${fileName}`, restringir `insert`/`delete` no Storage por prefixo de pasta (`(storage.foldername(name))[1] = public.current_oficina_id()::text`), limitar `allowed_mime_types` (`image/webp`, `image/jpeg`, `image/png`) e `file_size_limit`, e avaliar Signed URLs temporárias para visualização.

### VULN-07 — [MÉDIA] Ausência de cabeçalhos de segurança HTTP e proteção contra enumeração/abuso em RPC pública
- **Evidência:** `next.config.ts`, `vercel.json`, `supabase_schema.sql:378-442`
- **Descrição:** Não há configuração de headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`). A RPC `aprovar_orcamento_publico` aceita `p_dispositivo` enviado pelo cliente (apenas truncado em 255 chars) sem rate limiting.
- **Correção recomendada:** Adicionar `headers()` no `next.config.ts` e considerar token secundário/expiração para links públicos de aprovação.

### VULN-08 — [BAIXA] Logs de eventos contêm identificadores e dados operacionais no console do navegador
- **Evidência:** `src/lib/osService.ts:553-572`, `src/lib/authService.ts:274`
- **Descrição:** `logEventoOS` imprime JSON estruturado via `console.info`/`warn`/`error` no cliente (incluindo e-mail do admin no login). Embora útil em dev, em produção expõe fluxo interno no console do navegador.
- **Correção recomendada:** Enviar logs críticos para endpoint server-side ou restringir verbosidade no cliente em produção.

---

## E. Problemas de Arquitetura, Banco de Dados e Manutenção

### Auditoria do Banco de Dados (`supabase_schema.sql`)
1. **Tabelas subutilizadas (Desacoplamento Modelo x Código):** As tabelas `clientes`, `veiculos` e `catalogo_itens` foram criadas no SQL com chaves estrangeiras corretas (`oficina_id`, `cliente_id`, `veiculo_id`), porém **nenhuma delas é lida ou escrita por `osService.ts`**. O sistema opera de forma desnormalizada gravando tudo em `ordens_servico` e `oficinas.servicos_rapidos` (JSONB).
2. **Duplicidade potencial de `codigo_curto`:** `createOrdemServico` gera `OS-${1000..9999}` aleatoriamente (`Math.random()`), sem constraint `UNIQUE (oficina_id, codigo_curto)` no banco. Após algumas centenas de OS, há risco real de colisão de códigos visíveis para os clientes.
3. **Políticas RLS vs Realtime:** O RLS em `supabase_schema.sql` está corretamente estruturado para isolamento por `oficina_id = public.current_oficina_id()`, com remoção de políticas legadas permissivas. Porém, `supabase_schema.sql` não inclui `alter publication supabase_realtime add table public.ordens_servico;` nem `FORCE ROW LEVEL SECURITY` explícito (embora para `anon`/`authenticated` no Supabase o `ENABLE ROW LEVEL SECURITY` já aplique).
4. **Exclusões e Integridade:** `clientes` e `veiculos` em `ordens_servico` usam `on delete set null`, enquanto `oficinas` usa `on delete cascade` — adequado, desde que não haja exclusão acidental de oficina ativa em produção (recomenda-se soft delete via `ativo = false`).
5. **Fallback silencioso mascarando falhas de banco:** Em `osService.ts`, praticamente todas as funções (`fetchOrdensServico`, `createOrdemServico`, `updateOrdemServicoStatus`, `saveOficinaAdmin`) engolem erros do Supabase e retornam dados do `localStorage`. Em produção real, isso é perigoso: se o banco falhar ou bloquear por RLS, o mecânico acha que salvou a OS no celular, mas ela só existe no navegador dele e o cliente receberá *"Orçamento Não Localizado"* ao abrir o link!

### Qualidade, Desempenho e Manutenção
- **Arquivos grandes e baixa modularização:** `src/app/page.tsx` possui **1.594 linhas**, `src/app/admin/page.tsx` possui **1.177 linhas** e `src/lib/osService.ts` possui **1.117 linhas**. Misturam regras de negócio, acesso a dados, cache local e UI no mesmo arquivo.
- **Consultas redundantes:** `fetchOficinas()` é chamado em `useEffect` tanto em `src/app/page.tsx:105` quanto em `src/app/nova-os/page.tsx:84` sempre que `currentOficina` altera, além de usar `JSON.stringify` para comparação.
- **Dependência de scripts soltos na raiz:** Existem arquivos auxiliares na raiz (`seed-supabase.mjs`, `setup-storage.mjs`, `test-frontend-query.mjs`, `test-supabase.mjs`, `RELATORIO_AUDITORIA.md`, `generate-docs.py`) que devem ser revisados/organizados para não confundir o repositório de produção.

---

## F. Testes Realizados e Limitações

### Comandos Executados Nesta Auditoria
| Comando | Resultado | Detalhes / Observações |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | **Passou (código 0)** | Sem erros de tipagem TypeScript no estado atual do código. |
| `npm.cmd run lint` | **Passou (código 0)** | ESLint (`eslint-config-next`) concluiu sem erros nem warnings. |
| `npm.cmd test` | **Passou (10/10)** | Executou `tests/service.test.mjs`. **Limitação grave:** o arquivo de teste duplica funções localmente em vez de importar `src/lib/*`, não testando os módulos reais nem fluxos com Supabase/UI. |
| `npm.cmd run build` | **Falhou (código 1)** | `Error: EPERM: operation not permitted, rmdir '...\oficina-os-mvp-1\.next\static\...'` ao tentar limpar `.next` no ambiente Windows/sandbox. |

### Validação dos 12 Cenários Críticos (Análise de Código + Testes)
1. **Login de usuário:** **Falho em segurança.** Permite bypass com qualquer senha >= 6 chars se `senha_acesso` não existir no `localStorage`; não exige sessão Supabase Auth real.
2. **Cadastro de cliente:** **Parcial.** Digitado apenas dentro da abertura da OS; tabela `clientes` não é utilizada.
3. **Cadastro de veículo:** **Parcial.** Digitado apenas dentro da abertura da OS; tabela `veiculos` não é utilizada.
4. **Abertura de OS:** **Funcional na UI**, mas traz 2 itens fictícios pré-populados (risco de erro operacional) e não trata falha parcial de inserção em `itens_os`.
5. **Adição de peças e serviços técnicos:** **Funcional** na abertura e edição pós-aprovação; UX mobile-first bem ajustada.
6. **Cálculo do valor total:** **Funcional** nos itens da OS; **com defeito** no card "Totais Financeiros" do Dashboard (usa `45%/50%/5%` hardcoded).
7. **Recebimento e aprovação pelo cliente:** **Funcional** via `obter_os_publica` e `aprovar_orcamento_publico` com auditoria; falta fluxo de **rejeição** e feedback de erro na falha de aprovação.
8. **Mudança de status da OS:** **Funcional** no pátio e dispara modal de "Veículo Pronto" ao marcar `FINALIZADO`.
9. **Consulta de histórico do veículo:** **Ausente** como módulo dedicado (apenas filtro de busca textual na listagem geral de OS).
10. **Tentativa de acesso sem permissão:** **Vulnerável.** Rotas `/`, `/nova-os` e `/admin` são protegidas apenas no cliente via `localStorage`, facilmente contornáveis via DevTools.
11. **Tentativa de acesso a dados de outra empresa:** **Protegido no SQL (RLS)** quando o usuário possui JWT válido no Supabase; **vulnerável no cliente** caso `localStorage` ou modo demo estejam ativos.
12. **Uso pelo celular:** **Bom** nas telas `/nova-os`, `/os/[id]` e cards mobile de `/` (botões `>= 44px`, inputs `text-base sm:text-sm`, sem quebra horizontal).

### Limitações da Auditoria
- Não foram executados testes E2E em navegador real nem testes de integração contra a instância remota do Supabase (sem credenciais de usuários de teste reais e sem acesso de escrita/execução SQL no projeto Supabase remoto durante esta auditoria somente-leitura).
- O `npm audit` de rede não foi executado por restrição de rede no sandbox padrão.

---

## G. Plano de Correção Priorizado

### P0 — Bloqueia uso comercial ou representa risco crítico
1. **Remover bypass de autenticação e modo demo em produção (`src/lib/authService.ts`):** Exigir `supabase.auth.signInWithPassword` real para oficinas; remover fallback `password.length >= 6` e desativar `isDemoModeEnabled` em produção. *(Complexidade: Média)*
2. **Blindar `/admin` no servidor (`src/app/admin/page.tsx` + API Routes):** Remover `NEXT_PUBLIC_ADMIN_PASSWORD`, `'admin123'` e flag em `localStorage`. Implementar autenticação server-side (Supabase Auth com role/claim de Super Admin) e endpoints `/api/admin/*` com `SUPABASE_SERVICE_ROLE_KEY` para provisionar usuários reais no `auth.users` ao cadastrar oficinas. *(Complexidade: Alta)*
3. **Substituir sessão em `localStorage` por sessão Supabase real + `middleware.ts`:** Proteger rotas no servidor usando `@supabase/ssr` (cookies seguros) e eliminar mistura de dados fake/demo com dados de produção em `osService.ts`. *(Complexidade: Alta)*
4. **Eliminar fallback silencioso em operações de escrita no Supabase (`src/lib/osService.ts`):** Se o usuário está em produção e o Supabase falhar, exibir erro explícito para o mecânico em vez de salvar apenas no `localStorage` e gerar um link quebrado para o cliente. *(Complexidade: Média)*

### P1 — Deve ser corrigido antes do piloto
5. **Corrigir cálculos financeiros simulados e gráfico estático (`src/app/page.tsx`):** Calcular totais reais de Serviços Técnicos e Peças a partir dos itens e gerar o gráfico semanal com dados reais. *(Complexidade: Média)*
6. **Tornar criação e edição de OS atômicas via RPC no PostgreSQL:** Evitar perda de itens em queda de 4G (`atualizarItensEReenviarOS` e `createOrdemServico`) e limpar `aprovado_dispositivo` ao reabrir orçamento. *(Complexidade: Média)*
7. **Remover itens pré-preenchidos em `/nova-os` (`src/app/nova-os/page.tsx`):** Iniciar lista vazia para evitar cobranças indevidas por descuido. *(Complexidade: Baixa)*
8. **Implementar rejeição/observação de orçamento e tratamento de erro no portal `/os/[id]`:** Permitir que o cliente recuse ou solicite ajuste formalmente e mostrar erro caso a requisição falhe. *(Complexidade: Média)*
9. **Restringir Storage `fotos-os` por pasta do tenant (`oficina_id/`) e tipo/tamanho de arquivo:** Evitar upload irrestrito e exposição cruzada. *(Complexidade: Baixa)*

### P2 — Melhorias importantes
10. **Integrar tabelas `clientes`, `veiculos` e `catalogo_itens` no frontend:** Permitir autocomplete por placa/telefone e histórico real do veículo por placa. *(Complexidade: Alta)*
11. **Garantir `codigo_curto` único por oficina e incluir itens na listagem do Dashboard:** Resolver `BUG-06` (WhatsApp do Dashboard sem itens) e evitar colisões de `OS-XXXX`. *(Complexidade: Média)*
12. **Refatorar testes automatizados reais:** Importar funções reais (`src/lib/*`, `src/utils/*`) e adicionar testes de integração para fluxos críticos e isolamento multi-tenant. *(Complexidade: Média)*
13. **Adicionar headers de segurança HTTP no `next.config.ts`.** *(Complexidade: Baixa)*

### P3 — Melhorias futuras
14. **Modularizar componentes grandes (`src/app/page.tsx`, `src/app/admin/page.tsx`).** *(Complexidade: Média)*
15. **Implementar exportação de OS em PDF / impressão térmica e relatórios de faturamento por período.** *(Complexidade: Média)*
16. **Implementar envio ativo via WhatsApp Cloud API (opcional, para automação sem clique manual).** *(Complexidade: Alta)*

---

## H. Parecer Final

1. **O sistema está pronto para um piloto real?**  
   **Não.** Mesmo em um piloto controlado com 1 ou 2 oficinas, o bypass de senha (`password.length >= 6`), o `/admin` exposto no navegador e o fallback silencioso para `localStorage` (que pode gerar links de WhatsApp que não abrem no celular do cliente) representam risco alto de falha operacional e exposição de dados.

2. **O sistema está pronto para produção?**  
   **Não.** Faltam autenticação server-side sólida, integração real do `/admin` com o `auth.users` do Supabase e correção dos indicadores financeiros simulados.

3. **Quais riscos impedem sua comercialização?**  
   - Invasão trivial de contas de oficinas e do painel `/admin` pelo navegador;  
   - Desalinhamento entre login local e JWT do Supabase (impedindo o RLS real de funcionar);  
   - Perda silenciosa de dados quando o Supabase falha e o sistema grava apenas no `localStorage`;  
   - Indicadores financeiros fictícios (`45%/50%/5%` e `+18%`) exibidos ao dono da oficina.

4. **Quais são as cinco primeiras correções?**  
   1. Remover o bypass de senha (`password.length >= 6`) e travar o modo demo em `src/lib/authService.ts`.  
   2. Proteger `/admin` no servidor com Supabase Auth + API Route para criar usuários reais de oficinas no `auth.users`.  
   3. Adotar sessão real via Supabase (`@supabase/ssr` + `middleware.ts`) e remover fallback silencioso para `localStorage` em produção.  
   4. Corrigir os cálculos de "Totais Financeiros" e "Ordens Nesta Semana" em `src/app/page.tsx` para usar dados reais.  
   5. Remover os 2 itens fictícios pré-preenchidos em `/nova-os` e tornar a edição/criação de itens da OS atômica via RPC.

5. **O que pode ser mantido como está?**  
   - **Identidade visual e UX Mobile-First** das telas `/nova-os`, `/os/[id]` e cards mobile de `/` (muito bem adaptadas para uso com uma mão no pátio);  
   - **Compressão de fotos client-side para WebP** (`compressImageToWebP`) para economizar 4G;  
   - **Estrutura base do `supabase_schema.sql`** (tabelas multi-tenant, função `current_oficina_id()`, políticas RLS estritas e RPCs `obter_os_publica` / `aprovar_orcamento_publico`);  
   - **Máscaras de input (`src/utils/masks.ts`)** e **formatação de mensagens WhatsApp (`osService.ts`)**;  
   - **Branding atualizado** para `Jonatan Severo Tech` e produto `JS OrçaFácil`.

