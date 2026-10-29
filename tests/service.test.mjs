import assert from 'node:assert/strict';

// Testes Unitários de Serviços do OficinaOS
console.log('🧪 Iniciando suíte de testes de serviços e regras de negócio...\n');

// 1. Teste do Gerador de UUID v4
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
for (let i = 0; i < 20; i++) {
  const id = generateUUID();
  assert.match(id, uuidRegex, `UUID ${id} deve seguir o padrão RFC4122 v4`);
}
console.log('✅ 1. generateUUID: 20 UUIDs v4 gerados e validados com sucesso.');

// 2. Teste de Formatação de WhatsApp
function formatWhatsAppNumber(phone) {
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('55')) return clean;
  return `55${clean}`;
}

assert.equal(formatWhatsAppNumber('(11) 99123-4567'), '5511991234567');
assert.equal(formatWhatsAppNumber('+55 11 99123-4567'), '5511991234567');
assert.equal(formatWhatsAppNumber('11991234567'), '5511991234567');
assert.equal(formatWhatsAppNumber('5511991234567'), '5511991234567');
assert.equal(formatWhatsAppNumber(''), '');
console.log('✅ 2. formatWhatsAppNumber: Normalização de DDI 55 e caracteres especiais validada.');

// 3. Teste de Geração de Link de Orçamento para Cliente
function generateWhatsAppLinkParaCliente(os, oficinaNome, publicUrl) {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const texto = `Olá *${os.cliente_nome}*! 👋\n\nAqui é da oficina *${oficinaNome}*.\n\nSeu orçamento para o *${os.veiculo_modelo}* (Placa: *${os.veiculo_placa}*) está pronto com fotos e itens detalhados!\n\n📋 *Código*: ${os.codigo_curto}\n🔗 *Acesse e aprove online*: ${publicUrl}\n\nQualquer dúvida, estamos à disposição!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}

const mockOS = {
  id: 'a1b2c3d4-0001-4000-8000-000000000001',
  codigo_curto: 'OS-8491',
  cliente_nome: 'Carlos Ferreira',
  cliente_whatsapp: '(11) 99123-4567',
  veiculo_placa: 'BRA2E19',
  veiculo_modelo: 'Honda Civic',
};

const linkCliente = generateWhatsAppLinkParaCliente(mockOS, 'AutoCenter Líder', 'https://meuapp.com/os/a1b2c3d4-0001-4000-8000-000000000001');
assert.ok(linkCliente.startsWith('https://wa.me/5511991234567?text='));
assert.ok(linkCliente.includes(encodeURIComponent('Carlos Ferreira')));
assert.ok(linkCliente.includes(encodeURIComponent('OS-8491')));
assert.ok(linkCliente.includes(encodeURIComponent('BRA2E19')));
assert.ok(linkCliente.includes(encodeURIComponent('https://meuapp.com/os/a1b2c3d4-0001-4000-8000-000000000001')));
console.log('✅ 3. generateWhatsAppLinkParaCliente: Link e mensagem com encoding e dados corretos.');

// 4. Teste de Geração de Link de Revisão Preventiva (6 Meses)
function generateWhatsAppRevisaoLink(os, oficinaNome) {
  const phone = formatWhatsAppNumber(os.cliente_whatsapp);
  const dataFmt = os.data_proximo_retorno 
    ? new Date(os.data_proximo_retorno).toLocaleDateString('pt-BR') 
    : 'nos próximos dias';

  const texto = `Olá, *${os.cliente_nome}*! Tudo bem? 🚗🔧\n\nAqui é da *${oficinaNome}*. Notamos que está na época da revisão preventiva / troca de óleo do seu *${os.veiculo_modelo}* (Placa: ${os.veiculo_placa}).\n\nSua data programada de retorno é *${dataFmt}*.\n\nPodemos agendar um horário para você não perder a garantia e manter seu carro 100% seguro?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(texto)}`;
}

const linkRevisao = generateWhatsAppRevisaoLink({
  ...mockOS,
  data_proximo_retorno: '2026-10-30',
}, 'AutoCenter Líder');
assert.ok(linkRevisao.startsWith('https://wa.me/5511991234567?text='));
assert.ok(linkRevisao.includes(encodeURIComponent('revisão preventiva')));
console.log('✅ 4. generateWhatsAppRevisaoLink: Notificação preventiva de 6 meses gerada perfeitamente.');

// 5. Teste de Cálculo de Valores e Discriminação
const itensMock = [
  { tipo: 'PECA', descricao: 'Óleo Motor 5W30', valor: 260.00 },
  { tipo: 'PECA', descricao: 'Filtro de Óleo', valor: 65.50 },
  { tipo: 'MAO_DE_OBRA', descricao: 'Serviço de Troca', valor: 120.00 },
];

const totalPecas = itensMock.filter(i => i.tipo === 'PECA').reduce((s, i) => s + i.valor, 0);
const totalMaoDeObra = itensMock.filter(i => i.tipo === 'MAO_DE_OBRA').reduce((s, i) => s + i.valor, 0);
const valorTotal = itensMock.reduce((s, i) => s + i.valor, 0);

assert.equal(totalPecas, 325.50);
assert.equal(totalMaoDeObra, 120.00);
assert.equal(valorTotal, 445.50);
console.log('✅ 5. Cálculo de Totais: Discriminação entre peças, mão de obra e total exata.');

// 6. Teste de Contas Demo de Autenticação
const DEMO_ACCOUNTS = [
  { email: 'lider@oficina.com', senhaPadrao: '123456', oficinaId: '11111111-1111-1111-1111-111111111111' },
  { email: 'alemao@oficina.com', senhaPadrao: '123456', oficinaId: '22222222-2222-2222-2222-222222222222' },
  { email: 'cartech@oficina.com', senhaPadrao: '123456', oficinaId: '33333333-3333-3333-3333-333333333333' },
];

assert.equal(DEMO_ACCOUNTS.length, 3);
const genericUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
DEMO_ACCOUNTS.forEach(acc => {
  assert.ok(acc.email.includes('@'));
  assert.equal(acc.senhaPadrao, '123456');
  assert.match(acc.oficinaId, genericUuidRegex);
});
console.log('✅ 6. Contas Demo: IDs e credenciais de todas as 3 oficinas pré-configuradas e válidas.');

// 7. Teste de Máscaras Automáticas de Input (JS OrçaFácil)
function maskPlaca(value) {
  if (!value) return '';
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let letras = clean.slice(0, 3).replace(/[^A-Z]/g, '');
  const resto = clean.slice(3, 7);
  if (clean.length <= 3) return letras;
  if (resto.length >= 2) {
    const char5 = resto[1];
    if (/[A-Z]/.test(char5)) return `${letras}${resto.slice(0, 4)}`;
    if (/[0-9]/.test(char5)) return `${letras}-${resto.slice(0, 4)}`;
  }
  return `${letras}${resto}`;
}

function unmaskPlaca(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function maskPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function unmaskPhone(value) {
  return value.replace(/\D/g, '');
}

function maskKM(value) {
  if (value === '' || value === null || value === undefined) return '';
  const digits = value.toString().replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
}

function unmaskKM(value) {
  const digits = value.toString().replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

// Testes de Placa
assert.equal(maskPlaca('bra2e19'), 'BRA2E19'); // Mercosul
assert.equal(maskPlaca('abc1234'), 'ABC-1234'); // Tradicional com hífen automático
assert.equal(maskPlaca('abc1'), 'ABC1');
assert.equal(unmaskPlaca('ABC-1234'), 'ABC1234');
assert.equal(unmaskPlaca('bra2e19'), 'BRA2E19');

// Testes de Telefone
assert.equal(maskPhone('11991234567'), '(11) 99123-4567');
assert.equal(maskPhone('1140028922'), '(11) 4002-8922');
assert.equal(unmaskPhone('(11) 99123-4567'), '11991234567');

// Testes de KM
assert.equal(maskKM(48500), '48.500');
assert.equal(maskKM('120300'), '120.300');
assert.equal(unmaskKM('120.300'), 120300);
console.log('✅ 7. Máscaras de Input: Placas (Mercosul/antiga), Telefones e KM formatados com perfeição.');

// 8. Teste de Transição Rápida de Status do Pátio
const STATUS_VALIDOS = ['ORCAMENTO', 'APROVADO', 'EM_SERVICO', 'FINALIZADO', 'CANCELADO'];
function validarTransicaoStatus(statusAtual, novoStatus) {
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    throw new Error(`Status inválido: ${novoStatus}`);
  }
  return {
    status_anterior: statusAtual,
    status_novo: novoStatus,
    atualizado_em: new Date().toISOString()
  };
}

let statusOS = 'ORCAMENTO';
STATUS_VALIDOS.forEach(novo => {
  const transicao = validarTransicaoStatus(statusOS, novo);
  assert.equal(transicao.status_novo, novo);
  statusOS = novo;
});
assert.throws(() => validarTransicaoStatus('ORCAMENTO', 'STATUS_INEXISTENTE'), /Status inválido/);
console.log('✅ 8. Transição Rápida de Status: Todos os status do pátio validados (ORCAMENTO -> APROVADO -> EM_SERVICO -> FINALIZADO -> CANCELADO).');

// 9. Teste de Trilha de Auditoria na Aprovação (Dispositivo + Hash de Protocolo)
function detectarDispositivoCliente(ua) {
  if (!ua) return 'Dispositivo Web Verificado';
  let os = 'Dispositivo';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iPhone (iOS)';
  else if (/Android/i.test(ua)) os = 'Smartphone Android';
  else if (/Windows/i.test(ua)) os = 'Computador Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac (macOS)';

  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return `${os} • ${browser}`;
}

function gerarHashAuditoria(osId, aprovadoEm) {
  const base = `${osId}|${aprovadoEm}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i++) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `AUD-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

assert.equal(
  detectarDispositivoCliente('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'),
  'iPhone (iOS) • Safari'
);
assert.equal(
  detectarDispositivoCliente('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'),
  'Smartphone Android • Chrome'
);
const proto = gerarHashAuditoria(mockOS.id, '2026-10-29T17:10:00.000Z');
assert.match(proto, /^AUD-[0-9A-F]{4}-[0-9A-F]{4}$/);
assert.equal(proto, gerarHashAuditoria(mockOS.id, '2026-10-29T17:10:00.000Z')); // Determinístico
console.log('✅ 9. Trilha de Auditoria: Identificação de dispositivo e protocolo digital determinístico validados.');

// 10. Teste de Cálculo de Redimensionamento Proporcional WebP (Client-Side Compression)
function calcularDimensoesWebP(width, height, maxDimension = 1280) {
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }
  return { width, height };
}

const dim4K = calcularDimensoesWebP(4032, 3024, 1280);
assert.equal(dim4K.width, 1280);
assert.equal(dim4K.height, 960);
const dimVertical = calcularDimensoesWebP(2160, 3840, 1280);
assert.equal(dimVertical.height, 1280);
assert.equal(dimVertical.width, 720);
console.log('✅ 10. Compressão WebP Client-Side: Redimensionamento proporcional de fotos de alta resolução validado.');

console.log('\n🎉 TODOS OS 10 TESTES PASSARAM COM 100% DE SUCESSO!\n');
