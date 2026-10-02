// Clubes das divisões de baixo (expansão para 20 clubes por divisão e mais divisões): nomes fictícios no estilo
// dos demais (cidade + marco, rio, bairro ou apelido local), para não coincidir com clubes reais conhecidos.
// Cada linha: nome | cidade | região. Pares consecutivos formam os clássicos. Ordem = prestígio, continuando
// depois dos clubes que a liga já tinha.
import type { ClubSeed, LeagueId } from '../types';

const DATA: Record<LeagueId, string> = {
  // Brasil: completa a Série C e cria a Série D (32 clubes).
  bra: `Jequitibá EC|Teófilo Otoni|MG
Ipê Amarelo FC|Montes Claros|MG
Carnaúba AC|Mossoró|RN
Mandacaru EC|Caicó|RN
Cajueiro FC|Parnaíba|PI
Babaçu EC|Caxias|MA
Seringal AC|Cruzeiro do Sul|AC
Buritizal FC|Barreiras|BA
Xaréu EC|Aracaju|SE
Jangadeiro FC|Fortaleza|CE
Cerrado Mineiro EC|Patos de Minas|MG
Araucária FC|Guarapuava|PR
Serra Gaúcha AC|Bento Gonçalves|RS
Coxilha EC|Santana do Livramento|RS
Vale do Café FC|Vassouras|RJ
Mantiqueira EC|Pouso Alegre|MG
Lagoa da Prata AC|Lagoa da Prata|MG
Carijó FC|Chapecó|SC
Pinhão EC|Lages|SC
Piracema FC|Piracicaba|SP
Taquaral EC|Campinas|SP
Rio Preto Velho AC|São José do Rio Preto|SP
Juazeiro do Norte FC|Juazeiro do Norte|CE
Cariri Velho EC|Crato|CE
Lençóis AC|Lençóis|BA
Chapada FC|Mucugê|BA
Tapajós EC|Santarém|PA
Marajó FC|Soure|PA
Rio Negro Alto EC|São Gabriel da Cachoeira|AM
Pantanal Sul FC|Corumbá|MS
Araguaia AC|Barra do Garças|MT
Tocantins Velho EC|Araguaína|TO`,
  arg: `Quebracho de Santiago|Santiago del Estero|SE
Algarrobo FC|La Rioja|LR
Calchaquí de Salta|Cafayate|SA
Yerba Mate de Misiones|Oberá|MI
Ñandú de Corrientes|Goya|CR
Esteros del Iberá|Mercedes|CR
Viñedo de San Rafael|San Rafael|MZ
Aconcagua Sport|Uspallata|MZ
Lago Nahuel|Bariloche|RN
Viento Austral|Río Gallegos|SC
Pingüino de Chubut|Puerto Madryn|CH
Meseta Patagónica|Trelew|CH
Pampa Húmeda|Pergamino|BA
Trigal de Junín|Junín|BA
Médanos de Gesell|Villa Gesell|BA
Faro del Sur|Necochea|BA
Sierra de Tandil|Tandil|BA
Laguna de Chascomús|Chascomús|BA
Delta del Paraná|Tigre|BA
Río Uruguay FC|Concordia|ER
Palmar de Colón|Colón|ER
Puna Jujeña|Humahuaca|JU
Quebrada de Tilcara|Tilcara|JU
Valle de Uco|Tunuyán|MZ
Sol de San Juan|San Juan|SJ
Ischigualasto FC|San Agustín|SJ
Llanura Pampeana|Santa Rosa|LP
Salitral del Oeste|General Acha|LP`,
  por: `Douro Vinhateiro|Peso da Régua|VR
Serra da Estrela|Covilhã|CB
Ria de Aveiro FC|Ílhavo|AV
Montado Alentejano|Évora|EV
Planície de Beja|Beja|BJ
Barlavento Algarvio|Lagos|FA
Sotavento FC|Tavira|FA
Ribeira de Coimbra|Coimbra|CO
Mondego FC|Figueira da Foz|CO
Leiria do Lis|Leiria|LE
Pinhal de Leiria|Marinha Grande|LE
Tejo Ribatejano|Santarém|SA
Lezíria FC|Almeirim|SA
Costa da Caparica|Almada|SE
Arrábida FC|Setúbal|SE
Sintra Romântica|Sintra|LI
Cascais Marítimo|Cascais|LI
Minho Verde|Viana do Castelo|VC
Lima Ponte|Ponte de Lima|VC
Gerês FC|Terras de Bouro|BR
Barroso Montanhês|Montalegre|VR
Nordeste Transmontano|Bragança|BG
Mirandês FC|Miranda do Douro|BG
Raia de Elvas|Elvas|PO
São Mamede FC|Portalegre|PO
Açores Atlântico|Ponta Delgada|AC
Madeira Laurissilva|Funchal|MA
Porto Santo Dourado|Porto Santo|MA`,
  esp: `Rías Baixas CF|Pontevedra|GA
Costa da Morte|Carballo|GA
Picos de Europa|Cangas de Onís|AS
Cantábrico Oriental|Castro Urdiales|CB
Bardenas Reales|Tudela|NA
Moncayo Deportivo|Tarazona|AR
Pirineo Oscense|Jaca|AR
Delta del Ebro|Amposta|CT
Costa Brava CF|Palamós|CT
Montserrat Unió|Manresa|CT
Albufera CF|Sueca|VC
Marina Alta CF|Dénia|VC
Huerta de Murcia|Molina de Segura|MC
Mar Menor CF|San Javier|MC
Alpujarra Deportiva|Órgiva|AN
Sierra Nevada CF|Guadix|AN
Campiña Cordobesa|Montilla|AN
Doñana Atlética|Almonte|AN
Costa de la Luz CF|Conil|AN
Serranía de Ronda|Ronda|AN
La Mancha Quijote|Alcázar de San Juan|CM
Vega del Tajo|Talavera|CM
Gredos Deportivo|Ávila|CL
Ribera del Duero|Aranda de Duero|CL
Tierra de Campos|Medina de Rioseco|CL
Bierzo Minero|Ponferrada|CL
Vera Extremeña|Jaraíz|EX
Teide Atlético|La Orotava|CN`,
  eng: `Malvern Hills Larks|Malvern|WOR
Cotswold Drovers|Cirencester|GLO
Fenland Eels|Wisbech|CAM
Broads Wherrymen|Great Yarmouth|NFK
Peak District Rangers|Buxton|DBY
Pennine Weavers|Todmorden|WYK
Dales Shepherds|Skipton|NYK
Moors Ironstone|Whitby|NYK
Lakeland Fellsmen|Kendal|CMA
Tyne Valley Keelmen|Hexham|NBL
Wear Glassworks|Sunderland|TWR
Tees Transporter|Middlesbrough|NYK
Humber Trawlers|Grimsby|LIN
Wolds Ploughmen|Louth|LIN
Sherwood Archers|Mansfield|NTT
Soar Valley Hosiers|Loughborough|LEI
Severn Bargemen|Shrewsbury|SHR
Wrekin Forge|Telford|SHR
Chiltern Beechers|High Wycombe|BKM
Thames Lightermen|Gravesend|KEN
Weald Hoppickers|Tonbridge|KEN
South Downs Shepherds|Lewes|ESX
Solent Mariners|Gosport|HAM
New Forest Ponies|Lymington|HAM
Exmoor Stags|Minehead|SOM
Mendip Quarrymen|Shepton Mallet|SOM
Dartmoor Tors|Okehampton|DEV
Penwith Tinners|Penzance|CON`,
  ita: `Langhe Calcio|Alba|PIE
Monferrato Unione|Casale|PIE
Valtellina Sportiva|Sondrio|LOM
Lago d'Iseo Calcio|Iseo|LOM
Franciacorta Unione|Rovato|LOM
Dolomiti Bellunesi|Belluno|VEN
Laguna Veneta|Chioggia|VEN
Carso Triestino|Opicina|FVG
Collio Goriziano|Gorizia|FVG
Lunigiana Calcio|Pontremoli|TOS
Maremma Sportiva|Grosseto|TOS
Chianti Unione|Greve|TOS
Valle Umbra|Foligno|UMB
Conero Calcio|Ancona|MAR
Sibillini Sportiva|Camerino|MAR
Gran Sasso Unione|L'Aquila|ABR
Maiella Calcio|Sulmona|ABR
Matese Sportiva|Campobasso|MOL
Cilento Calcio|Agropoli|CAM
Irpinia Unione|Avellino|CAM
Gargano Sportiva|Vieste|PUG
Valle d'Itria|Martina Franca|PUG
Salento Unione|Gallipoli|PUG
Pollino Calcio|Castrovillari|CAL
Sila Sportiva|Camigliatello|CAL
Etna Unione|Acireale|SIC
Madonie Calcio|Cefalù|SIC
Gallura Sportiva|Olbia|SAR`,
  ger: `Harzer Brocken|Wernigerode|ST
Altmärker Hanse|Stendal|ST
Lausitzer Seen|Senftenberg|BB
Spreewälder Kahn|Lübbenau|BB
Uckermärker Heide|Prenzlau|BB
Vogtländer Spitze|Plauen|SN
Erzgebirger Glück|Annaberg|SN
Thüringer Rennsteig|Suhl|TH
Saale Unstrut|Naumburg|ST
Rhöner Kuppen|Fulda|HE
Vogelsberger Vulkan|Lauterbach|HE
Westerwälder Basalt|Montabaur|RP
Eifeler Maare|Daun|RP
Hunsrücker Höhe|Simmern|RP
Pfälzer Wein|Neustadt|RP
Saarländer Schleife|Merzig|SL
Schwarzwälder Kuckuck|Villingen|BW
Hohenloher Burgen|Öhringen|BW
Bodensee Ufer|Friedrichshafen|BW
Allgäuer Alpen|Kempten|BY
Chiemgauer Seen|Traunstein|BY
Bayerwald Glas|Zwiesel|BY
Fränkische Schweiz|Forchheim|BY
Lüneburger Heide|Uelzen|NI
Ostfriesen Watt|Aurich|NI
Emsländer Moor|Meppen|NI
Sauerländer Berge|Meschede|NW
Münsterland Parkland|Coesfeld|NW`,
  fra: `Bocage Normand|Vire|NOR
Pays d'Auge FC|Lisieux|NOR
Côte d'Opale|Boulogne|HDF
Baie de Somme|Abbeville|HDF
Champagne Crayeuse|Épernay|GES
Vosges Bleues|Épinal|GES
Jura Comtois|Lons-le-Saunier|BFC
Morvan Sauvage|Château-Chinon|BFC
Sologne FC|Romorantin|CVL
Berry Champêtre|Bourges|CVL
Marais Poitevin|Niort|NAQ
Périgord Noir|Sarlat|NAQ
Landes Océanes|Mont-de-Marsan|NAQ
Pays Basque Côte|Saint-Jean-de-Luz|NAQ
Béarn Pyrénées|Pau|NAQ
Gers Gascon|Auch|OCC
Causses du Lot|Cahors|OCC
Cévennes Sportives|Alès|OCC
Camargue Gardians|Arles|PAC
Lubéron FC|Apt|PAC
Verdon Gorges|Manosque|PAC
Haute-Provence FC|Digne|PAC
Vercors Alpin|Villard-de-Lans|ARA
Chartreuse FC|Voiron|ARA
Auvergne Volcans|Aurillac|ARA
Beaujolais Sportif|Villefranche|ARA
Bretagne Armor|Lannion|BRE
Finistère Iroise|Morlaix|BRE`,
  ned: `Veluwse Heide|Apeldoorn|GE
Zeeuwse Delta|Middelburg|ZE
Drentse Hunebed|Emmen|DR
Friese Meren|Sneek|FR
Achterhoekse Boer|Doetinchem|GE
Brabantse Kempen|Eindhoven|NB
Waddeneilanden|Den Helder|NH
Twentse Textiel|Enschede|OV`,
  bel: `Ardennes Forestières|Bastogne|LUX
Fagnes Sportives|Malmedy|LIE
Kempense Heide|Geel|ANT
Westhoek FC|Ieper|WVL
Polders Oostende|Oostende|WVL
Meuse Namuroise|Dinant|NAM
Pajottenland SK|Halle|VBR
Gaume Lorraine|Virton|LUX`,
  tur: `Kapadokya Peribacası|Nevşehir|NEV
Karadeniz Fındık|Giresun|GIR
Ege Zeytin|Ayvalık|BAL
Toros Dağları|Mersin|MER
Fırat Havzası|Elazığ|ELA
Van Gölü|Van|VAN
Pamukkale Travertin|Denizli|DEN
Uludağ Eteği|İnegöl|BUR`,
  sco: `Highland Glen|Fort William|HLD
Islay Distillers|Bowmore|AGB
Borders Reivers|Hawick|SCB
Fife Coast|Kirkcaldy|FIF
Perthshire Tay|Pitlochry|PKN
Galloway Hills|Newton Stewart|DGY
Orkney Isles|Kirkwall|ORK
Moray Firth|Elgin|MRY`,
  gre: `Olympos Litochoro|Litóchoro|CMA
Meteora Kalambaka|Kalambáka|THE
Pelion Volos|Vólos|THE
Zagori Ioannina|Ioánnina|EPI
Mani Gytheio|Gýtheio|PEL
Kyklades Naxos|Náxos|SAE
Dodekanisa Rodos|Rodes|SAE
Kriti Chania|Chaniá|CRE`,
};

const PALETTES: [string, string][] = [
  ['#1D4ED8', '#FFFFFF'], ['#B91C1C', '#FFFFFF'], ['#166534', '#FDE047'], ['#111827', '#FBBF24'],
  ['#7C3AED', '#F8FAFC'], ['#EA580C', '#111827'], ['#0F766E', '#FDE68A'], ['#BE123C', '#1E3A8A'],
];
const PATTERNS: ClubSeed['pattern'][] = ['v', 'h', 'sash', 'solid', 'half'];
const NICKNAMES: Record<LeagueId, string[]> = {
  bra: ['Leão do Interior', 'Tricolor da Serra', 'Alviverde do Sertão', 'Colorado do Vale'],
  arg: ['El Fortín', 'Los Pumas', 'El Ciclón', 'Los Cóndores'],
  por: ['os Serranos', 'os Ribeirinhos', 'os Leões da Vila', 'os Marinheiros'],
  esp: ['los Serranos', 'los Marineros', 'los Leones', 'los Halcones'],
  eng: ['the Larks', 'the Drovers', 'the Mariners', 'the Foresters'],
  ita: ['i Lupi', 'gli Aquilotti', 'i Galletti', 'i Delfini'],
  ger: ['die Bergleute', 'die Fischer', 'die Wölfe', 'die Falken'],
  fra: ['les Paysans', 'les Marins', 'les Loups', 'les Faucons'],
  ned: ['de Boeren', 'de Vissers', 'de Wolven', 'de Valken'],
  bel: ['les Sangliers', 'de Polderjongens', 'les Loups', 'de Valken'],
  tur: ['Kartallar', 'Dağ Keçileri', 'Martılar', 'Yıldızlar'],
  sco: ['The Glensmen', 'The Islanders', 'The Reivers', 'The Stags'],
  gre: ['οι Ορειβάτες', 'οι Ναύτες', 'οι Αετοί', 'οι Λύκοι'],
};
const MASCOTS = ['Águia', 'Leão', 'Lobo', 'Raposa', 'Falcão', 'Touro', 'Cervo', 'Urso', 'Coruja', 'Javali'];

/**
 * Clubes novos de uma liga. `start` é quantos clubes a liga já tinha (continua a ordem de prestígio);
 * `repFrom` é a reputação do primeiro novo e cai até `repTo` no último.
 */
export function lowerClubs(league: LeagueId, start: number, repFrom: number, repTo: number, usedShorts: Set<string>): ClubSeed[] {
  const rows = DATA[league].trim().split('\n').map((line) => line.split('|'));
  const n = rows.length;
  return rows.map(([name, city, uf], i) => {
    const id = `${league}-n${String(i + 1).padStart(2, '0')}`;
    const words = name.split(/[\s'-]+/).filter((x) => x && x[0] === x[0].toUpperCase());
    const initials = words.map((part) => part[0]).join('').toUpperCase();
    let short = (initials + name.replace(/[^\p{L}]/gu, '').toUpperCase()).slice(0, 3);
    for (let k = 0; usedShorts.has(short) && k < 99; k++) short = `${initials[0] ?? 'X'}${(start + i + k).toString(36).toUpperCase().padStart(2, '0')}`.slice(0, 3);
    usedShorts.add(short);
    const t = n > 1 ? i / (n - 1) : 0;
    const rep = Math.round(repFrom + (repTo - repFrom) * t);
    return {
      id, name, short, city, uf,
      colors: PALETTES[(start + i) % PALETTES.length], pattern: PATTERNS[(start + i) % PATTERNS.length],
      rep, cap: Math.round(Math.max(1500, 9000 - i * 220 - (start > 40 ? 2000 : 0)) / 500) * 500,
      nickname: NICKNAMES[league][i % 4], mascot: MASCOTS[(start + i) % MASCOTS.length],
      stadium: league === 'bra' ? `Estádio Municipal de ${city}` : `Estádio de ${city}`,
      rival: `${league}-n${String((i ^ 1) + 1 > n ? i + 1 : (i ^ 1) + 1).padStart(2, '0')}`,
    };
  });
}

/** Quantos clubes novos cada liga recebe (as linhas acima). */
export const LOWER_COUNT = Object.fromEntries(Object.entries(DATA).map(([k, v]) => [k, v.trim().split('\n').length])) as Record<LeagueId, number>;
