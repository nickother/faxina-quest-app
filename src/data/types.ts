export type Kind = 'daily' | 'laundry' | 'raid' | 'radar';
export type When = 'manha' | 'noite';
export type BaseRoomId = 'quarto' | 'escritorio' | 'sala' | 'cozinha' | 'banheiro';
/** Fases da raid: preparação, cômodos (base ou criados) e fechamento */
export type PhaseId = string;
export type RoomId = string;

export interface TaskDef {
  id: string;
  kind: Kind;
  name: string;
  /** Dica curta, visível na lista */
  tip?: string;
  /** Dica do mestre, mais longa, aparece ao concluir */
  master?: string;
  /** Como manter, aparece quando a rotina consolida */
  keep?: string;
  when?: When;
  phase?: PhaseId;
  /** Minutos estimados (raid) */
  min?: number;
  /** Frequência em dias (radar) */
  every?: number;
  /** Dia da semana da lavanderia: 1 = segunda ... 4 = quinta */
  weekday?: number;
  /** Rotina só em alguns dias (0 = domingo ... 6 = sábado). Vazio = todos os dias */
  days?: number[];
  /** Rotina de nível 2: id da rotina "mãe" */
  parent?: string;
  /** Vem desligada por padrão */
  defaultOff?: boolean;
  /** Já começa consolidada */
  preConsolidated?: boolean;
  /** Criada pelo usuário */
  custom?: boolean;
}
