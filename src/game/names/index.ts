// Listas de nomes por nacionalidade.
import type { LeagueId } from '../types';
import { NAMES as ARG } from './arg';
import { NAMES as BRA } from './bra';
import { NAMES as ENG } from './eng';
import { NAMES as ESP } from './esp';
import { NAMES as ITA } from './ita';
import { NAMES as POR } from './por';

export interface NameLists {
  FIRST: string[];
  LAST: string[];
  NICK: string[];
}

export const NAMES_BY_NAT: Record<LeagueId, NameLists> = { bra: BRA, arg: ARG, por: POR, esp: ESP, eng: ENG, ita: ITA };
