import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

PRIMARY_COLOR = RGBColor(11, 26, 44)       # Dark Navy #0b1a2c
SECONDARY_COLOR = RGBColor(34, 197, 94)    # Neon Green #22c55e
DARK_TEXT = RGBColor(15, 23, 42)           # Slate 900 #0f172a

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_header(doc, title, subtitle):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.rows[0].cells[0]
    set_cell_background(cell, "0B1A2C")
    set_cell_margins(cell, top=180, bottom=180, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_brand = p.add_run("JS ORÇAFÁCIL — SISTEMA DE GESTÃO ÁGIL DE OFICINAS\n")
    run_brand.font.name = "Arial"
    run_brand.font.size = Pt(10)
    run_brand.font.bold = True
    run_brand.font.color.rgb = SECONDARY_COLOR
    
    run_title = p.add_run(title + "\n")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(15)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(255, 255, 255)
    
    run_sub = p.add_run(subtitle)
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(9.5)
    run_sub.font.color.rgb = RGBColor(203, 213, 225)
    
    doc.add_paragraph()

def format_row(row, is_header=False, bg_color=None):
    for cell in row.cells:
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        if is_header:
            set_cell_background(cell, bg_color or "0B1A2C")
            set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
            for p in cell.paragraphs:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    r.font.name = "Arial"
                    r.font.size = Pt(9.5)
                    r.font.bold = True
                    r.font.color.rgb = RGBColor(255, 255, 255)
        else:
            if bg_color:
                set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=90, bottom=90, left=120, right=120)
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.name = "Arial"
                    r.font.size = Pt(9)
                    r.font.color.rgb = DARK_TEXT

# 1. TABELA DE VALORES
def create_doc_tabela_valores(dest_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header(doc, "TABELA OFICIAL DE VALORES & PLANOS COMERCIAIS", "Apresentação Comercial de Planos, Implantação e Customização")

    p_intro = doc.add_paragraph()
    r = p_intro.add_run("O JS OrçaFácil foi desenhado para caber no bolso da oficina independente. Sem taxas ocultas, sem cobrança por usuário extra e sem burocracia.")
    r.font.name = "Arial"
    r.font.size = Pt(10)
    r.font.color.rgb = DARK_TEXT

    h1 = doc.add_paragraph()
    r_h1 = h1.add_run("1. PLANOS DE ASSINATURA MENSAL (SaaS)")
    r_h1.font.name = "Arial"
    r_h1.font.size = Pt(11.5)
    r_h1.font.bold = True
    r_h1.font.color.rgb = PRIMARY_COLOR

    tbl_planos = doc.add_table(rows=4, cols=4)
    tbl_planos.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers = ["Plano", "Mensalidade", "Capacidade", "Principais Recursos Inclusos"]
    for i, h in enumerate(headers):
        tbl_planos.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_planos.rows[0], is_header=True)

    data_planos = [
        ("Plano Essencial", "R$ 97,00 / mês", "1 Oficina (Até 30 OS/mês)", "Pátio em tempo real, OS via celular, link wa.me p/ cliente, backup em nuvem, usuários ilimitados."),
        ("Plano Oficina Pro\n(Mais Vendido)", "R$ 149,00 / mês", "1 Oficina (Ordens Ilimitadas)", "Tudo do Essencial + Módulo de Alertas 6 Meses + Relatórios de Mão de Obra vs. Peças + Suporte Prioritário."),
        ("Plano Auto Center\nMulti-Box", "R$ 249,00 / mês", "Alto Fluxo ou Múltiplos Pátios", "Tudo do Pro + Suporte VIP + Treinamento presencial semestral + Auditoria de processos.")
    ]

    for idx, (p_nome, p_val, p_cap, p_rec) in enumerate(data_planos, start=1):
        row = tbl_planos.rows[idx]
        row.cells[0].paragraphs[0].text = p_nome
        row.cells[1].paragraphs[0].text = p_val
        row.cells[2].paragraphs[0].text = p_cap
        row.cells[3].paragraphs[0].text = p_rec
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.add_paragraph()

    h2 = doc.add_paragraph()
    r_h2 = h2.add_run("2. PERÍODO DE TESTE & TAXA DE IMPLANTAÇÃO")
    r_h2.font.name = "Arial"
    r_h2.font.size = Pt(11.5)
    r_h2.font.bold = True
    r_h2.font.color.rgb = PRIMARY_COLOR

    tbl_setup = doc.add_table(rows=3, cols=3)
    tbl_setup.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers_setup = ["Modalidade", "Investimento", "Condições & Entregáveis Inclusos"]
    for i, h in enumerate(headers_setup):
        tbl_setup.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_setup.rows[0], is_header=True)

    data_setup = [
        ("Período de Degustação\n(Teste Gratuito)", "GRÁTIS\n(7 a 14 dias)", "Uso real no pátio da oficina sem compromisso. Sem necessidade de cartão de crédito antecipado."),
        ("Taxa de Implantação\n& Setup Completo", "R$ 250,00 a R$ 450,00\n(Pagamento Único)", "Configuração do ambiente, logotipo da oficina, cadastro de 10 serviços frequentes, atalho PWA no celular e treinamento de 15 min.")
    ]

    for idx, (m_nome, m_val, m_desc) in enumerate(data_setup, start=1):
        row = tbl_setup.rows[idx]
        row.cells[0].paragraphs[0].text = m_nome
        row.cells[1].paragraphs[0].text = m_val
        row.cells[2].paragraphs[0].text = m_desc
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.add_paragraph()

    h3 = doc.add_paragraph()
    r_h3 = h3.add_run("3. SERVIÇOS TÉCNICOS DE CUSTOMIZAÇÃO SOB DEMANDA")
    r_h3.font.name = "Arial"
    r_h3.font.size = Pt(11.5)
    r_h3.font.bold = True
    r_h3.font.color.rgb = PRIMARY_COLOR

    tbl_cust = doc.add_table(rows=5, cols=3)
    tbl_cust.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_cust = ["Tipo de Customização", "Estimativa de Tempo", "Valor de Referência"]
    for i, h in enumerate(headers_cust):
        tbl_cust.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_cust.rows[0], is_header=True)

    data_cust = [
        ("Hora Técnica de Programação / Ajuste Específico", "Cobrado por Hora (H/H)", "R$ 120,00 a R$ 180,00 / hora"),
        ("Adição de Campos Personalizados na OS (Ex: Combustível, Chassi, Cor)", "Pacote de 2 horas", "R$ 240,00 a R$ 300,00"),
        ("Layout Personalizado para Impressora Térmica de Balcão (80mm)", "Pacote de 3 horas", "R$ 360,00 a R$ 450,00"),
        ("Vetorização / Padronização de Logotipo Comercial", "Valor Fechado", "R$ 150,00 (único)")
    ]

    for idx, (c_nome, c_tempo, c_val) in enumerate(data_cust, start=1):
        row = tbl_cust.rows[idx]
        row.cells[0].paragraphs[0].text = c_nome
        row.cells[1].paragraphs[0].text = c_tempo
        row.cells[2].paragraphs[0].text = c_val
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.add_paragraph()

    p_prop = doc.add_paragraph()
    r = p_prop.add_run("PROPOSTA PERSONALIZADA PARA ESTA OFICINA (Preenchimento no Balcão):")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = PRIMARY_COLOR

    p_lines = doc.add_paragraph()
    p_lines.add_run("Oficina: __________________________________________________  Responsável: _______________________________\n")
    p_lines.add_run("Plano Escolhido: [  ] Essencial (R$ 97)   [  ] Oficina Pro (R$ 149)   [  ] Auto Center (R$ 249)\n")
    p_lines.add_run("Taxa de Setup Acordada: R$ _______________   Data de Início do Teste Gratuito: _____/_____/2026\n")
    p_lines.add_run("Observações / Serviços Extras Solicitados: ______________________________________________________________")

    doc.save(dest_path)

# 2. CONTRATO DE TESTE
def create_doc_contrato_teste(dest_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header(doc, "TERMO DE ADESÃO — PERÍODO DE TESTE GRATUITO", "Demonstração Operacional Guiada no Pátio Mecânico (7 a 14 dias)")

    p1 = doc.add_paragraph()
    p1.add_run("Pelo presente instrumento particular de Degustação Operacional, as partes abaixo qualificadas ajustam entre si o teste prático da plataforma JS OrçaFácil, conforme os termos a seguir:")

    tbl_partes = doc.add_table(rows=6, cols=2)
    tbl_partes.alignment = WD_TABLE_ALIGNMENT.CENTER
    fields = [
        ("NOME DA OFICINA (FANTASIA):", "________________________________________________________"),
        ("RAZÃO SOCIAL / CNPJ OU CPF:", "________________________________________________________"),
        ("RESPONSÁVEL LEGAL / CONTATO:", "________________________________________________________"),
        ("WHATSAPP DE ATENDIMENTO COMERCIAL:", "(____) ___________________"),
        ("E-MAIL COMERCIAL PARA LOGIN:", "________________________________________________________"),
        ("ENDEREÇO DA OFICINA:", "________________________________________________________")
    ]
    for idx, (f_label, f_val) in enumerate(fields):
        row = tbl_partes.rows[idx]
        row.cells[0].paragraphs[0].text = f_label
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(9)
        row.cells[1].paragraphs[0].text = f_val
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(9)
        set_cell_background(row.cells[0], "F1F5F9")
        set_cell_margins(row.cells[0], top=60, bottom=60, left=80, right=80)
        set_cell_margins(row.cells[1], top=60, bottom=60, left=80, right=80)

    doc.add_paragraph()

    clausulas = [
        ("CLÁUSULA 1ª — DO OBJETO E PRAZO DE DEGUSTAÇÃO:", 
         "O presente termo concede à Oficina o direito de uso completo e gratuito do software JS OrçaFácil em ambiente real de produção por um período de [  ] 7 dias ou [  ] 14 dias, com início em _____/_____/2026 e término em _____/_____/2026."),
        
        ("CLÁUSULA 2ª — DA GRATUIDADE E AUSÊNCIA DE FIDELIDADE:",
         "O período de teste é 100% gratuito. A Oficina NÃO terá nenhuma obrigação financeira automática ao final do prazo de testes, podendo cancelar a qualquer momento sem qualquer multa ou encargo."),
        
        ("CLÁUSULA 3ª — DO SUPORTE E TREINAMENTO DURANTE O TESTE:",
         "A equipe do JS OrçaFácil fornecerá treinamento de 15 minutos na recepção, auxílio na instalação do atalho PWA no celular dos mecânicos e suporte via WhatsApp em horário comercial para sanar dúvidas operacionais."),
        
        ("CLÁUSULA 4ª — DA PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD):",
         "Todas as ordens de serviço, dados de clientes e fotos geradas no sistema pertencem exclusivamente à Oficina participante, mantendo-se o isolamento absoluto e confidencialidade das informações."),
        
        ("CLÁUSULA 5ª — DA OPÇÃO DE CONTINUIDADE APÓS O TESTE:",
         "Ao término do período de degustação, caso a Oficina opte por continuar utilizando o sistema, passará a viger o plano escolhido:\n[  ] Plano Essencial (R$ 97/mês)       [  ] Plano Oficina Pro (R$ 149/mês)       [  ] Plano Auto Center (R$ 249/mês)\nTaxa de Implantação e Setup: [  ] Isento por promoção de campo     [  ] R$ _________")
    ]

    for tit, texto in clausulas:
        p_tit = doc.add_paragraph()
        r = p_tit.add_run(tit)
        r.font.name = "Arial"
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = PRIMARY_COLOR

        p_txt = doc.add_paragraph()
        r_txt = p_txt.add_run(texto)
        r_txt.font.name = "Arial"
        r_txt.font.size = Pt(9)
        r_txt.font.color.rgb = DARK_TEXT

    doc.add_paragraph()

    p_ass = doc.add_paragraph()
    p_ass.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ass.add_run("Canoas/RS, _____ de ____________________ de 2026.\n\n\n")
    p_ass.add_run("_________________________________________             _________________________________________\n")
    p_ass.add_run("           RESPONSÁVEL PELA OFICINA                                  CONSULTOR JS ORÇAFÁCIL\n")

    doc.save(dest_path)

# 3. FICHA DE CADASTRO
def create_doc_cadastro_cliente(dest_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header(doc, "FICHA DE ATIVAÇÃO & CADASTRO DE OFICINA", "Formulário de Entrada e Configuração dos 10 Serviços Frequentes")

    p = doc.add_paragraph()
    r = p.add_run("Preencha os campos abaixo durante a visita de implantação para liberar o acesso da oficina em até 15 minutos:")
    r.font.name = "Arial"
    r.font.size = Pt(9.5)

    tbl_oficina = doc.add_table(rows=7, cols=2)
    tbl_oficina.alignment = WD_TABLE_ALIGNMENT.CENTER
    fields_of = [
        ("Nome Fantasia da Oficina:", "________________________________________________________"),
        ("Razão Social / CNPJ:", "________________________________________________________"),
        ("Nome do Responsável / Gerente:", "________________________________________________________"),
        ("WhatsApp Oficial de Envio das OS:", "(____) ___________________"),
        ("E-mail Comercial para Login:", "________________________________________________________"),
        ("Senha Provisória Sugerida:", "____________________"),
        ("Endereço Completo & Bairro:", "________________________________________________________")
    ]
    for idx, (l, v) in enumerate(fields_of):
        row = tbl_oficina.rows[idx]
        row.cells[0].paragraphs[0].text = l
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(9)
        row.cells[1].paragraphs[0].text = v
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(9)
        set_cell_background(row.cells[0], "F1F5F9")
        set_cell_margins(row.cells[0], top=50, bottom=50, left=70, right=70)
        set_cell_margins(row.cells[1], top=50, bottom=50, left=70, right=70)

    doc.add_paragraph()

    h_serv = doc.add_paragraph()
    r = h_serv.add_run("TABELA DE SERVIÇOS MAIS FREQUENTES (Atalhos Rápidos de 1 Toque na OS):")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(10.5)
    r.font.color.rgb = PRIMARY_COLOR

    tbl_serv = doc.add_table(rows=11, cols=3)
    tbl_serv.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_s = ["#", "Descrição do Serviço Frequente (Mão de Obra + Peça)", "Valor Médio Praticado (R$)"]
    for i, h in enumerate(headers_s):
        tbl_serv.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_serv.rows[0], is_header=True)

    exemplos_s = [
        ("01", "Troca de Óleo Motor Sintético + Filtro de Óleo", "R$ _________________"),
        ("02", "Substituição de Pastilhas de Freio Dianteiras", "R$ _________________"),
        ("03", "Alinhamento de Direção 3D + Balanceamento 4 Rodas", "R$ _________________"),
        ("04", "Higienização de Ar-Condicionado + Filtro de Cabine", "R$ _________________"),
        ("05", "Limpeza de Bicos Injetores + TBI", "R$ _________________"),
        ("06", "Troca de Correia Dentada + Tensor", "R$ _________________"),
        ("07", "Substituição de Amortecedores Dianteiros (Par)", "R$ _________________"),
        ("08", "Revisão Preventiva Básica / Check-up Geral", "R$ _________________"),
        ("09", "Diagnóstico Eletrônico Computadorizado via Scanner", "R$ _________________"),
        ("10", "Regulagem / Troca de Velas e Cabos de Ignição", "R$ _________________")
    ]

    for idx, (num, desc, val) in enumerate(exemplos_s, start=1):
        row = tbl_serv.rows[idx]
        row.cells[0].paragraphs[0].text = num
        row.cells[1].paragraphs[0].text = desc
        row.cells[2].paragraphs[0].text = val
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.add_paragraph()

    p_check = doc.add_paragraph()
    r = p_check.add_run("CHECKLIST DE ATIVAÇÃO TÉCNICA (15 MINUTOS):")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(10)
    r.font.color.rgb = PRIMARY_COLOR

    p_boxes = doc.add_paragraph()
    p_boxes.add_run("[  ] Usuário e Senha criados e validados no sistema\n")
    p_boxes.add_run("[  ] Atalho PWA 'JS OrçaFácil' fixado na tela de início do celular do dono e mecânicos\n")
    p_boxes.add_run("[  ] Logotipo da oficina recebido ou configurado no portal\n")
    p_boxes.add_run("[  ] 1ª Ordem de Serviço de teste criada e enviada com sucesso no WhatsApp")

    doc.save(dest_path)

# 4. PLANO DE AÇÃO DE VENDAS
def create_doc_plano_vendas(dest_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header(doc, "GUIA RÁPIDO DE VENDAS & ABORDAGEM DE CAMPO", "Roteiro de 3 Minutos, Scripts Práticos e Quebra de Objeções")

    h1 = doc.add_paragraph()
    r = h1.add_run("1. O ROTEIRO DE IMPACTO DOS 3 MINUTOS ('SHOW, DON'T TELL')")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = PRIMARY_COLOR

    passos = [
        ("Minuto 1 — A Pergunta de Abertura:", 
         "'Amigo, quando você passa um orçamento hoje pro cliente pelo WhatsApp, quanto tempo ele demora pra responder se aprova ou não?' (Ouça a resposta dele com atenção)."),
        ("Minuto 2 — A Demonstração Ao Vivo com o Carro Dele:", 
         "Abra o sistema no seu celular. Peça a placa do carro dele. Mostre a máscara automática formatando a placa Mercosul. Tire uma foto do capô/painel. Adicione 2 serviços rápidos. Digite o WhatsApp do DONO e aperte 'Salvar e Enviar'."),
        ("Minuto 3 — O Efeito UAU e Fechamento do Teste:", 
         "O celular do dono toca. Peça para ele mesmo abrir o link. Mostre o visual dark moderno com a foto do carro dele. Peça para ele clicar no botão verde '✅ APROVAR AGORA'. Sobem confetes na tela dele e o pátio atualiza na hora na sua mão! Conclua: 'Quantos orçamentos a mais você aprovaria hoje se mandasse assim?'")
    ]
    for p_tit, p_desc in passos:
        p = doc.add_paragraph()
        r1 = p.add_run(p_tit + " ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r2 = p.add_run(p_desc)
        r2.font.size = Pt(9)

    doc.add_paragraph()

    h2 = doc.add_paragraph()
    r = h2.add_run("2. COMO QUEBRAR AS OBJEÇÕES MAIS COMUNS")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = PRIMARY_COLOR

    tbl_obj = doc.add_table(rows=5, cols=2)
    tbl_obj.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_o = ["O que o Dono Diz / Teme", "Como Responder e Desarmar na Hora"]
    for i, h in enumerate(headers_o):
        tbl_obj.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_obj.rows[0], is_header=True)

    data_obj = [
        ("'Já uso caderno / bloco de papel e dá certo.'", 
         "'Dá certo até o dia em que o cliente alegar que o carro não tinha um risco e você não tiver a foto da entrada, ou esquecer uma peça no papel. O sistema cria a OS em 1 minuto e blinda sua oficina.'"),
        
        ("'Não tenho tempo pra aprender sistema difícil.'", 
         "'Por isso o JS OrçaFácil tem só 3 telas. Se você sabe mandar mensagem no WhatsApp, você sabe usar o sistema. O treinamento leva 15 minutos cronometrados.'"),
         
        ("'Sistemas de oficina cobram muito caro.'", 
         "'Nossa mensalidade (R$ 97 a R$ 149) custa menos do que o lucro de 1 única troca de óleo por mês. Se você salvar 1 orçamento que ia perder por demora, já pagou o ano todo.'"),
         
        ("'Meus mecânicos não sabem mexer no computador.'", 
         "'Eles não usam computador. O sistema roda no celular deles, com botões grandes e direto ao ponto, igual ao WhatsApp que eles já usam todo dia.'")
    ]
    for idx, (ob, resp) in enumerate(data_obj, start=1):
        row = tbl_obj.rows[idx]
        row.cells[0].paragraphs[0].text = ob
        row.cells[1].paragraphs[0].text = resp
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.add_paragraph()

    h3 = doc.add_paragraph()
    r = h3.add_run("3. CHECKLIST ANTES DE ENTRAR NA OFICINA")
    r.font.name = "Arial"
    r.font.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = PRIMARY_COLOR

    p_chk = doc.add_paragraph()
    p_chk.add_run("[  ] Celular com 4G funcionando e bateria acima de 50%\n")
    p_chk.add_run("[  ] Atalho do JS OrçaFácil aberto e logado na tela inicial\n")
    p_chk.add_run("[  ] Termo de Teste Gratuito e Ficha de Cadastro impressos ou abertos no Drive\n")
    p_chk.add_run("[  ] Postura consultiva: falar menos e mostrar mais na tela do cliente")

    doc.save(dest_path)

# 5. ROTEIRO DE VISITAS CANOAS
def create_doc_roteiro_visitas(dest_path):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    add_header(doc, "FICHA DE CAMPO & CONTROLE DE VISITAS — CANOAS/RS", "16 Prospects Qualificados Divididos por Circuitos Geográficos")

    p = doc.add_paragraph()
    p.add_run("Acompanhe o status de cada visita em tempo real pelo seu smartphone:")

    tbl_visitas = doc.add_table(rows=17, cols=5)
    tbl_visitas.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers_v = ["#", "Oficina Prospectada", "Bairro", "Telefone / WhatsApp", "Status da Visita / Resultado"]
    for i, h in enumerate(headers_v):
        tbl_visitas.rows[0].cells[i].paragraphs[0].text = h
    format_row(tbl_visitas.rows[0], is_header=True)

    oficinas = [
        ("01", "Mecânica Trucolo", "Estância Velha", "(51) 3477-1006 / 99948-9459", "[  ] Visitado  [  ] Teste Ativo"),
        ("02", "Ávila Manutenção Automotiva", "Estância Velha", "(51) 99569-2525", "[  ] Visitado  [  ] Teste Ativo"),
        ("03", "Auto Tech Canoas", "Estância Velha", "(51) 99458-2798", "[  ] Visitado  [  ] Teste Ativo"),
        ("04", "Mecânica Fernandes", "Estância Velha", "(51) 99157-8703", "[  ] Visitado  [  ] Teste Ativo"),
        ("05", "MotoXcanoas", "Estância Velha", "(51) 99708-4635", "[  ] Visitado  [  ] Teste Ativo"),
        ("06", "Zoclinhos Motos", "Estância Velha", "(51) 98474-3901", "[  ] Visitado  [  ] Teste Ativo"),
        ("07", "Zick Centro Automotivo", "Guajuviras", "(51) 3115-3945 / 99304-8312", "[  ] Visitado  [  ] Teste Ativo"),
        ("08", "Oliveira Car Center", "Guajuviras", "(51) 99656-0052", "[  ] Visitado  [  ] Teste Ativo"),
        ("09", "Loko Motos", "Olaria", "(51) 99228-1171", "[  ] Visitado  [  ] Teste Ativo"),
        ("10", "JR Car Oficina Mecânica", "Rio Branco", "(51) 99135-6855", "[  ] Visitado  [  ] Teste Ativo"),
        ("11", "Mecânica Santo Antônio", "Rio Branco", "(51) 3476-XXXX", "[  ] Visitado  [  ] Teste Ativo"),
        ("12", "Mecânica Diesel Melagrani", "Harmonia", "(51) 99715-1126", "[  ] Visitado  [  ] Teste Ativo"),
        ("13", "Mundo da Moto", "Centro / Niterói", "(51) 3031-7396", "[  ] Visitado  [  ] Teste Ativo"),
        ("14", "Mecânica MT", "Canoas", "(51) 99329-8985", "[  ] Contatado [  ] Visita Marcada"),
        ("15", "Oficina Mecânica Fogaça", "Canoas", "(51) 99105-8226", "[  ] Contatado [  ] Visita Marcada"),
        ("16", "TEX MOTOS CANOAS", "Canoas", "(51) 99107-8491", "[  ] Contatado [  ] Visita Marcada")
    ]

    for idx, (n, of, b, tel, st) in enumerate(oficinas, start=1):
        row = tbl_visitas.rows[idx]
        row.cells[0].paragraphs[0].text = n
        row.cells[1].paragraphs[0].text = of
        row.cells[2].paragraphs[0].text = b
        row.cells[3].paragraphs[0].text = tel
        row.cells[4].paragraphs[0].text = st
        bg = "F1F5F9" if idx % 2 == 1 else "FFFFFF"
        format_row(row, bg_color=bg)

    doc.save(dest_path)

if __name__ == "__main__":
    drive_dir = r"C:\Users\jonat\Meu Drive\JSOrçaFácil"
    workspace_docs = os.path.join(os.getcwd(), "documentos_vendas")
    
    os.makedirs(drive_dir, exist_ok=True)
    os.makedirs(workspace_docs, exist_ok=True)
    
    docs_to_create = [
        ("01_Tabela_de_Valores_JS_OrcaFacil.docx", create_doc_tabela_valores),
        ("02_Contrato_Periodo_de_Teste_JS_OrcaFacil.docx", create_doc_contrato_teste),
        ("03_Ficha_de_Cadastro_Oficina_JS_OrcaFacil.docx", create_doc_cadastro_cliente),
        ("04_Plano_de_Acao_de_Vendas_JS_OrcaFacil.docx", create_doc_plano_vendas),
        ("05_Roteiro_e_Ficha_de_Visitas_Canoas.docx", create_doc_roteiro_visitas)
    ]
    
    for filename, fn in docs_to_create:
        drive_path = os.path.join(drive_dir, filename)
        ws_path = os.path.join(workspace_docs, filename)
        
        fn(drive_path)
        shutil.copy2(drive_path, ws_path)
        print(f"Gerado: {filename}")

    print("SUCESSO: Todos os arquivos .docx gerados no Google Drive e no Workspace!")
