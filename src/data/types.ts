export type Kind = 'daily' | 'laundry' | 'raid' | 'radar';
export type When = 'manha' | 'noite';
export type PhaseId = 'prep' | 'quarto' | 'escritorio' | 'sala' | 'cozinha' | 'banheiro' | 'fechamento';
export type RoomId = Exclude<PhaseId, 'prep' | 'fechamento'>;

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
  /** Rotina de nível 2: id da rotina "mãe" */
  parent?: string;
  /** Vem desligada por padrão */
  defaultOff?: boolean;
  /** Já começa consolidada */
  preConsolidated?: boolean;
  /** Criada pelo usuário */
  custom?: boolean;
}
