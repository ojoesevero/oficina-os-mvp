# 🚗 OficinaOS MVP - Gestão Ágil & Orçamentos no WhatsApp

MVP mobile-first completo desenvolvido para oficinas mecânicas locais, com pátio em tempo real, geração rápida de orçamentos pelo WhatsApp, upload de fotos de check-in e alertas de retorno preventivo (6 meses).

---

## ⚡ Principais Funcionalidades

1. **Dashboard da Oficina (`/`)**:
   - **Seletor de Oficinas (Modo Demo)** no topo para alternar entre estabelecimentos.
   - **Aba "Pátio Agora"**: Listagem em tempo real das ordens de serviço ativas com placas estilo Mercosul, fotos e atualização instantânea via **Supabase Realtime** quando o cliente aprova o orçamento.
   - **Aba "Alertas de Retorno (6 Meses)"**: Identificação automática de veículos com revisão preventiva ou troca de óleo vencida ou a vencer em até 15 dias, com botão de 1 clique para reativar o cliente via WhatsApp com mensagem pronta.

2. **Cadastro Ágil de Nova OS (`/nova-os`)**:
   - Dados rápidos do veículo (Placa, Modelo, KM) e do cliente.
   - Upload de fotos de entrada direto para o bucket `fotos-os` do **Supabase Storage**.
   - Adição dinâmica de itens categorizados entre **Peça** e **Mão de Obra**, com atalhos de 1 clique e soma automática do valor total.
   - Botão **Salvar e Enviar p/ Cliente** que grava os dados e abre o WhatsApp com a mensagem e o link de aprovação.

3. **Página Pública do Cliente (`/os/[id]`)**:
   - Interface móvel limpa com dados da oficina, selo de verificação e canal direto de dúvidas no WhatsApp.
   - Tabela discriminada de peças e serviços com transparência de valores e garantia legal.
   - Botão de destaque **"✅ APROVAR ORÇAMENTO AGORA"** que atualiza o status para `APROVADO` no banco em tempo real e dispara uma animação de confetes.

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (tema dark / industrial)
- **Ícones:** Lucide React
- **Efeitos:** canvas-confetti
- **Banco de Dados & Storage:** Supabase (PostgreSQL, Storage e Realtime)

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

### 3. Configurar as variáveis de ambiente
Crie um arquivo `.env.local` na raiz com as chaves do seu Supabase (consulte `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-secreta
```

### 4. Executar o Script SQL no Supabase
Execute o script [`supabase_schema.sql`](./supabase_schema.sql) no **SQL Editor** do painel Supabase para criar as tabelas, políticas de RLS e o bucket de storage `fotos-os`.

### 5. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador ou emulando visualização de celular.
