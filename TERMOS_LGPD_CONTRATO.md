# ⚖️ Governança SaaS, Regularização Comercial, LGPD e Termos de Uso
**Produto:** JS OrçaFácil — Gestão Ágil para Oficinas & Orçamentos no WhatsApp  
**Fornecedora Oficial:** **JoeSevero Tech**

---

## 🎯 1. Posicionamento Oficial da Marca

Para que o proprietário da oficina mecânica compreenda imediatamente quem fornece a tecnologia e qual problema o sistema resolve, toda a comunicação comercial e visual segue o padrão:

- **Nome do Produto / Plataforma:** **JS OrçaFácil**  
  *(O que faz: Elimina o bloco de papel na oficina, registra fotos de check-in do veículo e envia orçamentos profissionais aprovados em 1 clique no WhatsApp).*
- **Empresa Fornecedora / Desenvolvedora:** **JoeSevero Tech**  
  *(Quem fornece: Empresa responsável pelo desenvolvimento, infraestrutura em nuvem, implantação, suporte técnico e faturamento).*
- **Assinatura Oficial:**  
  > **"JS OrçaFácil • Uma solução JoeSevero Tech"**

---

## 🏢 2. Regularização Comercial e Emissão de Notas Fiscais (NFS-e)

Para comercializar o **JS OrçaFácil** como Software como Serviço (SaaS) + Taxa de Implantação/Treinamento, abaixo estão as diretrizes práticas de faturamento:

### A. Enquadramento Empresarial e CNAEs Recomendados
| Atividade | Código CNAE | Descrição Oficial | Observação Prática |
| :--- | :---: | :--- | :--- |
| **Licenciamento / Assinatura SaaS** | `6203-1/00` | Desenvolvimento e licenciamento de programas de computador não-customizáveis | Ideal para a mensalidade recorrente dos planos (R$ 97 / R$ 149 / R$ 249). |
| **Customização Sob Demanda** | `6202-3/00` | Desenvolvimento e licenciamento de programas de computador customizáveis | Para cobrança de horas técnicas ou layouts específicos. |
| **Suporte Técnico e Implantação** | `6209-1/00` | Suporte técnico, manutenção e outros serviços em tecnologia da informação | Compatível com MEI/Simples Nacional para taxa de setup, configuração e suporte. |
| **Treinamento Operacional** | `8599-6/03` | Treinamento em informática | Aplicável para o treinamento inicial da equipe da oficina. |

### B. Emissão de NFS-e (Nota Fiscal de Serviços Eletrônica)
- **Descrição Padrão para Mensalidade:**  
  *"Assinatura mensal de uso da plataforma em nuvem JS OrçaFácil (JoeSevero Tech) para gestão de ordens de serviço e orçamentos digitais — Competência MM/AAAA."*
- **Descrição Padrão para Taxa de Implantação:**  
  *"Serviço de implantação, parametrização, configuração de catálogo de serviços e treinamento operacional na plataforma JS OrçaFácil."*

---

## 🛡️ 3. Operação SaaS, Segurança, Backups e Resposta a Incidentes

### A. Isolamento Multi-Tenant e Autenticação
1. **Autenticação Estrita em Produção:** Em produção (`isSupabaseConfigured = true` e `NEXT_PUBLIC_ENABLE_DEMO` desativado), o login exige validação criptográfica via **Supabase Auth** (`signInWithPassword`). Contas de demonstração ficam bloqueadas no código.
2. **Row Level Security (RLS):** As políticas do PostgreSQL vinculam cada oficina ao seu `user_id = auth.uid()`. Uma oficina autenticada acessa exclusivamente suas próprias ordens de serviço.
3. **Portal Público do Cliente via RPC Blindada:** A página `/os/[id]` utiliza as funções `SECURITY DEFINER` (`obter_os_publica` e `aprovar_orcamento_publico`), permitindo ler e aprovar **apenas** a OS correspondente ao UUID v4 criptográfico recebido no WhatsApp, sem permitir listagem de outras ordens nem alteração de valores financeiros.

### B. Política de Backups e Recuperação (Disaster Recovery)
1. **Banco de Dados (PostgreSQL / Supabase):**
   - Backups automáticos diários gerenciados na nuvem com retenção de segurança.
   - Exportação periódica complementar via script seguro (`pg_dump` / export JSON) das tabelas `oficinas`, `ordens_servico` e `itens_os`.
2. **Arquivos de Mídia (Fotos de Check-in):**
   - Armazenadas no bucket redundante `fotos-os` do Supabase Storage em formato otimizado **WebP** (`~90 KB` por foto).
3. **Continuidade no Pátio (Modo Resiliente):**
   - Caso a internet da oficina oscile momentaneamente, a camada de serviço mantém cache local sincronizado para evitar perda de digitação da Ordem de Serviço aberta.

### C. Monitoramento e Tratamento de Incidentes
- **Logs Estruturados (`logEventoOS`):** Todos os eventos críticos (login, compressão de fotos, aprovação do cliente com protocolo `AUD-XXXX-XXXX` e falhas de rede) são registrados em JSON estruturado, visíveis em tempo real no painel **Vercel Logs**.
- **SLA de Atendimento a Incidentes:**
  - **Incidentes Críticos (Indisponibilidade de Login ou Aprovação):** Resposta em até 2 horas úteis via canal de suporte prioritário no WhatsApp.
  - **Dúvidas Operacionais e Ajustes de Catálogo:** Atendimento em horário comercial (Seg a Sex, das 08h às 18h; Sáb das 08h às 12h).

---

## 🔒 4. Conformidade com a LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018)

### A. Papéis das Partes segundo a LGPD
- **Controladora dos Dados (Oficina Mecânica Contratante):** É quem coleta os dados do proprietário do veículo no balcão (Nome, Telefone/WhatsApp, Placa, Modelo e Fotos do veículo) e define a finalidade do atendimento.
- **Operadora dos Dados (JoeSevero Tech / JS OrçaFácil):** Fornece a infraestrutura tecnológica segura para processar, armazenar e exibir o orçamento ao cliente final em nome da oficina.

### B. Dados Coletados e Base Legal
| Dado Coletado | Finalidade Estrita | Base Legal (Art. 7º da LGPD) |
| :--- | :--- | :--- |
| **Nome do Cliente e WhatsApp** | Envio do link do orçamento, comunicação sobre o serviço e aviso de revisão preventiva de 6 meses. | **Execução de Contrato / Procedimentos Preliminares** (Art. 7º, V) |
| **Placa, Modelo e KM do Veículo** | Identificação unívoca do bem sob reparo e controle de garantia legal de 90 dias (Art. 26 do CDC). | **Execução de Contrato e Exercício Regular de Direitos** (Art. 7º, V e VI) |
| **Fotos de Check-in na Entrada** | Registro visual do estado do veículo e das peças substituídas para transparência e proteção mútua. | **Legítimo Interesse e Exercício Regular de Direitos** (Art. 7º, VI e IX) |
| **Carimbo de Tempo e Dispositivo (`user_agent`)** | Trilha de auditoria eletrônica no momento do clique em "Aprovar Orçamento". | **Exercício Regular de Direitos em Contrato** (Art. 7º, VI) |

### C. Direitos do Titular (Exclusão e Correção)
- Caso o proprietário de um veículo solicite à oficina a exclusão do seu telefone da lista de lembretes preventivos de 6 meses ou a retificação de dados cadastrais, a oficina (ou o suporte da **JoeSevero Tech** mediante solicitação da oficina) realiza a atualização ou anonimização imediata no banco de dados.

---

## 📄 5. Modelo Prático de Termo de Adesão Comercial (Para Fechamento com a Oficina)

*(Copie e envie no WhatsApp ou imprima em 1 página no momento da ativação da oficina):*

> ### TERMO DE ADESÃO E LICENCIAMENTO DE SOFTWARE — JS ORÇAFÁCIL
> 
> **FORNECEDORA (OPERADORA):** **JOESEVERO TECH**, responsável pela plataforma **JS OrçaFácil**.  
> **CONTRATANTE (OFICINA):** `[Nome Fantasia / Razão Social da Oficina]`, inscrita no CPF/CNPJ nº `[Número]`, com sede em `[Endereço]`.
> 
> **1. OBJETO:** O presente termo tem por objeto o licenciamento de uso não exclusivo da plataforma em nuvem **JS OrçaFácil**, destinada à abertura de Ordens de Serviço, registro fotográfico de check-in e envio de orçamentos para aprovação via WhatsApp.
> 
> **2. PLANO E VALORES:**  
> - **Taxa Única de Implantação e Treinamento:** `R$ [Valor]`  
> - **Mensalidade do Plano `[Essencial / Oficina Pro]`:** `R$ [97,00 / 149,00]` mensais, com vencimento todo dia `[Dia]` de cada mês via PIX/Boleto.
> 
> **3. SEM FIDELIDADE / CANCELAMENTO LIVRE:** Não há multa de fidelidade. A CONTRATANTE poderá solicitar o cancelamento da assinatura a qualquer momento mediante aviso prévio simples de 15 (quinze) dias, sem cobranças adicionais.
> 
> **4. RESPONSABILIDADES E LGPD:**  
> - A **CONTRATANTE** é a única responsável pela veracidade dos valores de peças, mão de obra, diagnósticos mecânicos e garantias prestadas aos seus clientes finais.  
> - Em conformidade com a **Lei nº 13.709/2018 (LGPD)**, a **CONTRATANTE** atua como *Controladora* dos dados de seus clientes e a **JOESEVERO TECH** atua como *Operadora*, comprometendo-se a manter o sigilo, o isolamento de acesso por senha e a não compartilhar nem comercializar dados de clientes da oficina com terceiros.
> 
> **5. ACEITE:** O pagamento da taxa de implantação ou o início do uso efetivo da plataforma após o período de degustação implica na concordância integral com este Termo.
> 
> Local e Data: `Canoas/RS, ___ de _______________ de 2026.`

