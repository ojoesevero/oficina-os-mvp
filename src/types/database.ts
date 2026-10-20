export type StatusOS = 'ORCAMENTO' | 'APROVADO' | 'EM_SERVICO' | 'FINALIZADO' | 'CANCELADO';

export type TipoItem = 'PECA' | 'MAO_DE_OBRA';

export interface Oficina {
  id: string;
  nome: string;
  whatsapp: string;
  created_at?: string;
}

export interface OrdemServico {
  id: string;
  codigo_curto: string;
  oficina_id: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  veiculo_placa: string;
  veiculo_modelo: string;
  km_atual: number;
  fotos_entrada: string[];
  status: StatusOS;
  valor_total: number;
  aprovado_em: string | null;
  data_proximo_retorno: string | null;
  created_at: string;
  oficinas?: Oficina;
}

export interface ItemOS {
  id: string;
  os_id: string;
  tipo: TipoItem;
  descricao: string;
  valor: number;
}
