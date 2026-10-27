# 🚗 JS OrçaFácil - Gestão Ágil para Oficinas & Orçamentos no WhatsApp

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Plus Jakarta Sans](https://img.shields.io/badge/Font-Plus%20Jakarta%20Sans-emerald?style=flat)](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20%26%20Storage-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Idioma PT-BR](https://img.shields.io/badge/Idioma-100%25%20PT--BR-brightgreen?style=flat)]()
[![Tests Passing](https://img.shields.io/badge/Tests-Passing%20100%25-brightgreen?style=flat)]()

Sistema moderno **mobile-first e desktop widescreen**, com **idioma 100% em Português (PT-BR)** para máxima praticidade na oficina mecânica. Desenvolvido com a identidade visual **JS OrçaFácil**: tema **Dark Navy profundo (`#080d14`)**, superfícies industriais (`#0e1724`), bordas em grafite azulado (`#1c2e42`), **acentos e botões em Verde Neon Vibrante (`#22c55e`)**, tipografia geométrica **Plus Jakarta Sans** e ícone de chaves cruzadas.

---

## 🎨 Identidade Visual & Design System (JS OrçaFácil)

- **Paleta de Cores:**
  - `Background Primário`: `#080d14` (Dark Navy ultra-escuro).
  - `Superfície / Barra Lateral`: `#0b121b` / `#0e1724`.
  - `Cards e Containers`: `#111d2c` / `#132234`.
  - `Bordas Sutis`: `#1c2e42` / `#1e354d`.
  - `Verde Neon (Destaque & Ações)`: `#22c55e` (Botões de ação primária, totais em destaque, ícones ativos).
  - `Badges de Status Interativos`:
    - `Orçamento (Aberto)`: Verde neon (`#22c55e`).
    - `Em Serviço (Na Oficina)`: Azul elétrico (`#38bdf8`).
    - `Aprovado (Aguardando Peças)`: Roxo vibrante (`#a855f7`).
    - `Finalizado (Pronto)`: Grafite elegante (`#94a3b8`).
- **Tipografia:** `Plus Jakarta Sans` com excelente legibilidade técnica e números tabulares para alinhamento de valores monetários.
- **Logotipo:** Chaves mecânicas cruzadas em verde neon com tipografia **JS OrçaFácil - Oficinas & Gestão Ágil**.

---

## ⚡ Layout Duplo: Desktop Widescreen & Mobile-First (100% PT-BR)

### 💻 1. Visualização Desktop
- **Barra Lateral Esquerda (Sidebar):** Logotipo JS OrçaFácil, menu com Painel Principal, Ordens de Serviço (ativo), Alertas 6 Meses, Clientes, Veículos, Estoque & Peças, Relatórios e Configurações, além de identificação da oficina no rodapé.
- **Barra Superior Global:** Campo de busca rápida (`Buscar por cliente, veículo, placa ou nº da OS...`), sininho de notificações e avatar do Gerente de Oficina.
- **Área Central de Ordens:** Cabeçalho com título, subtítulo e botão `+ Nova Ordem de Serviço`, abas com filtros pills (`Todas`, `Orçamentos`, `Em Serviço`, `Aprovadas`, `Finalizadas`) e tabela detalhada de ordens com seletor de status rápido.
- **Painel Lateral Direito (KPIs & Resumo Financeiro):**
  - **Resumo do Dia:** Total de ordens, em serviço, abertas e finalizadas com ícones verdes e data em português.
  - **Totais Financeiros:** Discriminação de Mão de Obra, Peças & Componentes, Insumos & Outros e Total Geral em destaque verde neon.
  - **Ordens Nesta Semana:** Gráfico de ondas em curva verde neon com atividade semanal (Seg a Dom).

### 📱 2. Visualização Mobile
- **Header Mobile:** Logotipo JS OrçaFácil, status da oficina e atalho de Nova OS.
- **Cards de Ordem de Serviço:** Título `Ordem de Serviço #OS-XXXX`, badge interativo de status, nome do cliente, modelo do veículo, placa com máscara e `Valor Total`.
- **Página do Cliente (`/os/[id]`):** Título da ordem, status, discriminação em cards separados de **Serviços & Mão de Obra** (com `Total de Serviços`) e **Peças & Componentes** (com `Total de Peças`), `Valor Total do Orçamento` em verde neon e botão de ação em largura total `APROVAR ORÇAMENTO AGORA`.
- **Barra de Navegação Inferior Fixa:** Abas `Início`, `Ordens`, `Nova OS` (botão central flutuante em verde), `Alertas` e `Sair`.

---

## ⚡ Principais Funcionalidades

### 1. 🔐 Acesso & Login Individual da Oficina (`/login`)
- Cada oficina possui sua própria conta, credenciais e pátio isolado.
- Botões de **Acesso Rápido de Demonstração (1 Clique)** para testes rápidos sem digitação.
- Contas demo pré-configuradas:
  - 🏢 `lider@oficina.com` (**AutoCenter Líder**) | Senha: `123456`
  - 🏢 `alemao@oficina.com` (**Oficina Mecânica Alemão & Especialistas**) | Senha: `123456`
  - 🏢 `cartech@oficina.com` (**CarTech Performance & Injeção**) | Senha: `123456`

### 2. 📋 Dashboard do Pátio em Tempo Real (`/`)
- Cabeçalho industrial dark exibindo a oficina autenticada ativa e botão de Logout ("Sair").
- **Aba "Pátio Agora"**: 
  - Listagem em tempo real das ordens ativas com placas no padrão Mercosul estilizadas.
  - Exibição de miniaturas das fotos de check-in e status do serviço.
  - Atualização instantânea via **Supabase Realtime** quando o cliente aprova o orçamento.
  - Botão de preview do link do cliente abrindo em nova aba sem sair do pátio.
- **Aba "Alertas de Retorno (6 Meses)"**: 
  - Identificação de revisões e trocas de óleo vencidas ou a vencer em até 15 dias.
  - Botão de 1 clique para reativar o cliente via WhatsApp com mensagem personalizada e data estimada.

### 3. ➕ Cadastro Ágil de Nova OS (`/nova-os`)
- Vinculação automática à oficina conectada.
- Entrada simplificada: Placa do veículo, Modelo, KM atual, Nome do cliente e WhatsApp.
- **Upload de Fotos de Entrada (Check-in)**: Envio direto para o bucket `fotos-os` do Supabase Storage ou conversão instantânea local.
- **Discriminação de Itens**: Peças e Mão de Obra com atalhos de sugestões frequentes (Óleo, Pastilhas, Alinhamento, etc.) e cálculo de total automático.
- **Salvar e Enviar**: Salva a OS, gera o link único e abre o WhatsApp com a mensagem pronta.
- Modal de confirmação com opções para abrir o WhatsApp, visualizar o link do cliente ou cadastrar outro veículo.

### 4. 🛡️ Página Pública do Cliente Blindada (`/os/[id]`)
- Totalmente **isolada de dados internos**: sem links para o painel da oficina ou dados de terceiros.
- Identificação da oficina emissora, dados do veículo e selo de verificação.
- Fotos do check-in com modal de zoom ao toque.
- Tabela discriminada com total de peças, serviços e valor total com garantia legal de 90 dias.
- Botão de destaque **"✅ APROVAR ORÇAMENTO AGORA"** que atualiza o status para `APROVADO` no banco em tempo real e dispara animação de confetes.
- Canal de dúvidas direto com a oficina no WhatsApp.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia | Versão / Detalhes |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router com Turbopack) | `16.4.2` |
| **Linguagem** | TypeScript | `^5.0` |
| **UI & Reatividade** | React (Server Components + Client Hooks) | `19.3.0` |
| **Estilização** | Tailwind CSS (tema dark industrial móvel) | `^4.0` |
| **Ícones** | Lucide React | `^1.60.0` |
| **Animações** | Canvas Confetti | `^1.9.4` |
| **Banco & Realtime** | Supabase (PostgreSQL, Storage e Realtime) | `@supabase/supabase-js ^2.118.0` |
| **PWA** | Manifest Web App | `public/manifest.json` |

---

## 💻 Scripts e Comandos Disponíveis

| Comando | Finalidade |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento com Turbopack em `http://localhost:3000`. |
| `npm run build` | Compila e otimiza a aplicação para produção (valida tipos e rotas estáticas). |
| `npm run lint` | Executa o ESLint 9 para garantir conformidade estrita com o padrão de código. |
| `npm test` | Executa a suíte de testes automatizados (UUID, WhatsApp, regras de negócio e cálculo). |
| `node seed-supabase.mjs` | Popula o banco Supabase com dados realistas de teste para as oficinas demo. |

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/ojoesevero/oficina-os-mvp.git
cd oficina-os-mvp
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar a Suíte de Testes
```bash
npm test
```

### 4. Configurar as Variáveis de Ambiente (Opcional para Modo Online)
Crie um arquivo `.env.local` na raiz com as chaves do seu projeto Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```
> **Nota de Modo Offline/Demo:** O sistema possui fallback inteligente completo em `localStorage`. Caso nenhuma chave seja configurada, o aplicativo funciona 100% de forma interativa com as oficinas de demonstração!

### 5. Configurar o Banco no Supabase (Se conectado)
Execute o script [`supabase_schema.sql`](./supabase_schema.sql) no **SQL Editor** do seu painel Supabase para criar as tabelas, índices, políticas de RLS e o bucket de storage `fotos-os`.

Para popular com ordens e itens de teste:
```bash
node seed-supabase.mjs
```

### 6. Iniciar o Servidor
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador. O sistema direcionará automaticamente para a tela de Login da oficina (`/login`).

---

## 🔒 Segurança e Isolamento Multi-tenant

- **Row Level Security (RLS)** habilitado em todas as tabelas (`oficinas`, `ordens_servico`, `itens_os`).
- **UUIDs v4 Criptográficos:** Identificadores gerados conforme o padrão RFC4122 para evitar enumeração de ordens.
- **Separação de Papéis:** O cliente acessa apenas a rota pública `/os/[id]` do seu próprio orçamento. As rotas internas de gestão (`/` e `/nova-os`) exigem autenticação ativa da oficina.

---

## 📑 Documentação e Manuais

- 📋 **Guia de Pré-Requisitos para Clientes:** [`PRE_REQUISITOS_IMPLANTACAO.md`](./PRE_REQUISITOS_IMPLANTACAO.md) — Tudo o que uma oficina mecânica precisa fornecer e providenciar para começar a usar o sistema em 15 minutos.
- 🛠️ **Relatório Técnico & Auditoria:** [`relatorio_auditoria_e_melhorias.md`](file:///C:/Users/jonat/.gemini/antigravity-ide/brain/933c90e6-a0ed-482e-8a25-15b14831db94/relatorio_auditoria_e_melhorias.md) — Histórico de arquitetura, testes e correções.
