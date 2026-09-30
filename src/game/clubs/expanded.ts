// Sete ligas adicionais: 32 clubes fictícios por país, em ordem de prestígio.
// Cada linha: nome | cidade | região. Pares consecutivos formam os clássicos.
import type { ClubSeed } from '../types';

const DATA: Record<'ger' | 'fra' | 'ned' | 'bel' | 'tur' | 'sco' | 'gre', string> = {
  ger: `Berliner Adler|Berlin|BE
Berliner Stern|Berlin|BE
Münchner Isar|München|BY
Münchner Tor|München|BY
Rhein Köln|Köln|NW
Kölner Domstadt|Köln|NW
Ruhr Eisen|Dortmund|NW
Ruhr Stahl|Essen|NW
Hamburger Hafen|Hamburg|HH
Hamburger Alster|Hamburg|HH
Frankfurter Main|Frankfurt|HE
Frankfurter Adler|Frankfurt|HE
Stuttgarter Neckar|Stuttgart|BW
Stuttgarter Rotwald|Stuttgart|BW
Bremer Weser|Bremen|HB
Bremer Hanse|Bremen|HB
Dresdner Elbe|Dresden|SN
Dresdner Zwinger|Dresden|SN
Leipziger Linden|Leipzig|SN
Leipziger Aue|Leipzig|SN
Hannoveraner Heide|Hannover|NI
Hannoveraner Leine|Hannover|NI
Nürnberger Burg|Nürnberg|BY
Nürnberger Pegnitz|Nürnberg|BY
Düsseldorfer Rhein|Düsseldorf|NW
Düsseldorfer Fortunaus|Düsseldorf|NW
Freiburger Schwarzwald|Freiburg|BW
Freiburger Dreisam|Freiburg|BW
Kieler Förde|Kiel|SH
Kieler Ostsee|Kiel|SH
Rostocker Hafen|Rostock|MV
Rostocker Warnow|Rostock|MV`,
  fra: `Paris Lumière|Paris|IDF
Paris Bastille|Paris|IDF
Marseille Phocéen|Marseille|PAC
Marseille Calanques|Marseille|PAC
Lyon Confluence|Lyon|ARA
Lyon Fourvière|Lyon|ARA
Lille Flandres|Lille|HDF
Lille Citadelle|Lille|HDF
Bordeaux Garonne|Bordeaux|NAQ
Bordeaux Gironde|Bordeaux|NAQ
Nice Azur|Nice|PAC
Nice Promenade|Nice|PAC
Toulouse Capitole|Toulouse|OCC
Toulouse Garonne|Toulouse|OCC
Nantes Erdre|Nantes|PDL
Nantes Atlantique|Nantes|PDL
Strasbourg Ill|Strasbourg|GES
Strasbourg Alsace|Strasbourg|GES
Rennes Vilaine|Rennes|BRE
Rennes Armorique|Rennes|BRE
Montpellier Lez|Montpellier|OCC
Montpellier Garrigue|Montpellier|OCC
Grenoble Alpes|Grenoble|ARA
Grenoble Isère|Grenoble|ARA
Reims Champagne|Reims|GES
Reims Marne|Reims|GES
Le Havre Océan|Le Havre|NOR
Le Havre Seine|Le Havre|NOR
Clermont Volcans|Clermont-Ferrand|ARA
Clermont Auvergne|Clermont-Ferrand|ARA
Brest Iroise|Brest|BRE
Brest Penfeld|Brest|BRE`,
  ned: `Amstel Stad|Amsterdam|NH
Amsterdam Noord|Amsterdam|NH
Rotterdam Maas|Rotterdam|ZH
Rotterdam Haven|Rotterdam|ZH
Eindhoven Licht|Eindhoven|NB
Eindhoven Dommel|Eindhoven|NB
Utrecht Domtoren|Utrecht|UT
Utrecht Vecht|Utrecht|UT
Den Haag Duinen|Den Haag|ZH
Den Haag Hofstad|Den Haag|ZH
Groningen Noorder|Groningen|GR
Groningen Martinus|Groningen|GR
Enschede Twente|Enschede|OV
Enschede Textiel|Enschede|OV
Arnhem Rijn|Arnhem|GE
Arnhem Veluwe|Arnhem|GE
Nijmegen Waal|Nijmegen|GE
Nijmegen Heuvel|Nijmegen|GE
Tilburg Spoor|Tilburg|NB
Tilburg Brabant|Tilburg|NB
Haarlem Kennemer|Haarlem|NH
Haarlem Spaarne|Haarlem|NH
Zwolle IJssel|Zwolle|OV
Zwolle Blauwvinger|Zwolle|OV
Leeuwarden Frisia|Leeuwarden|FR
Leeuwarden Waad|Leeuwarden|FR
Alkmaar Kaasstad|Alkmaar|NH
Alkmaar Noord|Alkmaar|NH
Breda Nassau|Breda|NB
Breda Mark|Breda|NB
Maastricht Maas|Maastricht|LI
Maastricht Vrijthof|Maastricht|LI`,
  bel: `Bruxelles Capitale|Bruxelles|BRU
Bruxelles Forêt|Bruxelles|BRU
Antwerpen Schelde|Antwerpen|ANT
Antwerpen Haven|Antwerpen|ANT
Brugge Reien|Brugge|WVL
Brugge Belfort|Brugge|WVL
Gent Leie|Gent|OVL
Gent Artevelde|Gent|OVL
Liège Meuse|Liège|LIE
Liège Citadelle|Liège|LIE
Charleroi Sambre|Charleroi|HAI
Charleroi Verriers|Charleroi|HAI
Genk Kempen|Genk|LIM
Genk Mijnstad|Genk|LIM
Leuven Dijle|Leuven|VBR
Leuven Academie|Leuven|VBR
Mechelen Dijle|Mechelen|ANT
Mechelen Toren|Mechelen|ANT
Namur Citadelle|Namur|NAM
Namur Sambre|Namur|NAM
Kortrijk Leie|Kortrijk|WVL
Kortrijk Broeltorens|Kortrijk|WVL
Oostende Kust|Oostende|WVL
Oostende Mercator|Oostende|WVL
Mons Borinage|Mons|HAI
Mons Beffroi|Mons|HAI
Hasselt Jenever|Hasselt|LIM
Hasselt Demer|Hasselt|LIM
Tournai Escaut|Tournai|HAI
Tournai Cathédrale|Tournai|HAI
Sint-Truiden Haspengouw|Sint-Truiden|LIM
Sint-Truiden Cicindria|Sint-Truiden|LIM`,
  tur: `İstanbul Boğaz|İstanbul|IST
İstanbul Haliç|İstanbul|IST
Ankara Başkent|Ankara|ANK
Ankara Kale|Ankara|ANK
İzmir Körfez|İzmir|IZM
İzmir Kordon|İzmir|IZM
Bursa Uludağ|Bursa|BUR
Bursa Yeşil|Bursa|BUR
Trabzon Karadeniz|Trabzon|TRA
Trabzon Liman|Trabzon|TRA
Antalya Akdeniz|Antalya|ANT
Antalya Kaleiçi|Antalya|ANT
Adana Seyhan|Adana|ADA
Adana Toros|Adana|ADA
Konya Ova|Konya|KON
Konya Meram|Konya|KON
Gaziantep Kale|Gaziantep|GAZ
Gaziantep Fırat|Gaziantep|GAZ
Samsun Atakum|Samsun|SAM
Samsun Canik|Samsun|SAM
Kayseri Erciyes|Kayseri|KAY
Kayseri Talas|Kayseri|KAY
Eskişehir Porsuk|Eskişehir|ESK
Eskişehir Odunpazarı|Eskişehir|ESK
Denizli Pamukkale|Denizli|DEN
Denizli Horoz|Denizli|DEN
Mersin Liman|Mersin|MER
Mersin Toros|Mersin|MER
Sivas Kızılırmak|Sivas|SIV
Sivas Selçuk|Sivas|SIV
Malatya Kayısı|Malatya|MAL
Malatya Fırat|Malatya|MAL`,
  sco: `Edinburgh Castle|Edinburgh|EDI
Edinburgh Forth|Edinburgh|EDI
Glasgow Clyde|Glasgow|GLA
Glasgow Kelvin|Glasgow|GLA
Aberdeen Granite|Aberdeen|ABD
Aberdeen Dee|Aberdeen|ABD
Dundee Tay|Dundee|DND
Dundee Law|Dundee|DND
Inverness Highland|Inverness|HLD
Inverness Ness|Inverness|HLD
Perth Fair City|Perth|PTH
Perth Almond|Perth|PTH
Stirling Castle|Stirling|STI
Stirling Forth|Stirling|STI
Paisley Abbey|Paisley|RFW
Paisley Cart|Paisley|RFW
Kilmarnock Irvine|Kilmarnock|EAY
Kilmarnock Ayrshire|Kilmarnock|EAY
Falkirk Wheel|Falkirk|FAL
Falkirk Carron|Falkirk|FAL
Hamilton Clyde|Hamilton|SLK
Hamilton Lanark|Hamilton|SLK
Motherwell Steel|Motherwell|NLK
Motherwell Calder|Motherwell|NLK
Dunfermline Abbey|Dunfermline|FIF
Dunfermline Fife|Dunfermline|FIF
Greenock Firth|Greenock|IVC
Greenock Inverclyde|Greenock|IVC
Ayr Doon|Ayr|SAY
Ayr Coast|Ayr|SAY
Oban Argyll|Oban|AGB
Oban Bay|Oban|AGB`,
  gre: `Athina Acropolis|Atenas|ATT
Athina Piraeus|Atenas|ATT
Thessaloniki Thermaikos|Salónica|CM
Thessaloniki Lefkos|Salónica|CM
Piraeus Limani|Pireu|ATT
Piraeus Akti|Pireu|ATT
Patras Achaia|Patras|WGR
Patras Gulf|Patras|WGR
Heraklion Knossos|Heraclião|CRE
Heraklion Kastro|Heraclião|CRE
Larissa Thessalia|Larissa|THE
Larissa Pineios|Larissa|THE
Volos Pagasitikos|Volos|THE
Volos Pelion|Volos|THE
Ioannina Epirus|Ioannina|EPI
Ioannina Pamvotida|Ioannina|EPI
Kavala Thalassa|Kavala|EM
Kavala Philippi|Kavala|EM
Chania Lefka|Chania|CRE
Chania Limani|Chania|CRE
Rhodes Helios|Rodes|SAE
Rhodes Lindos|Rodes|SAE
Kalamata Messinia|Calamata|PEL
Kalamata Taygetos|Calamata|PEL
Serres Macedon|Serres|CM
Serres Strymon|Serres|CM
Agrinio Aetolia|Agrínio|WGR
Agrinio Trichonida|Agrínio|WGR
Corfu Kerkyra|Corfu|ION
Corfu Ionio|Corfu|ION
Tripoli Arcadia|Trípoli|PEL
Tripoli Mainalo|Trípoli|PEL`,
};

const PALETTES: Record<keyof typeof DATA, [string, string][]> = {
  ger: [['#111827', '#FBBF24'], ['#B91C1C', '#FFFFFF'], ['#2563EB', '#F8FAFC'], ['#166534', '#FDE047']],
  fra: [['#1D4ED8', '#FFFFFF'], ['#B91C1C', '#FBBF24'], ['#0F766E', '#FFFFFF'], ['#6D28D9', '#F8FAFC']],
  ned: [['#EA580C', '#FFFFFF'], ['#DC2626', '#F8FAFC'], ['#1D4ED8', '#FACC15'], ['#166534', '#FFFFFF']],
  bel: [['#FACC15', '#111827'], ['#DC2626', '#FFFFFF'], ['#1D4ED8', '#FFFFFF'], ['#15803D', '#FACC15']],
  tur: [['#DC2626', '#F8FAFC'], ['#FACC15', '#1E3A8A'], ['#1D4ED8', '#FFFFFF'], ['#166534', '#FFFFFF']],
  sco: [['#1D4ED8', '#F8FAFC'], ['#991B1B', '#FFFFFF'], ['#166534', '#FFFFFF'], ['#FACC15', '#111827']],
  gre: [['#1D4ED8', '#FFFFFF'], ['#DC2626', '#FFFFFF'], ['#111827', '#FACC15'], ['#166534', '#FFFFFF']],
};

const NICKNAMES: Record<keyof typeof DATA, string[]> = {
  ger: ['die Adler', 'die Sterne', 'die Löwen', 'die Eisen'],
  fra: ['les Lumières', 'les Marins', 'les Lions', 'les Aigles'],
  ned: ['de Leeuwen', 'de Havenmannen', 'de Adelaars', 'de Roodwitten'],
  bel: ['les Lions', 'de Leeuwen', 'les Rouges', 'de Blauwzwarten'],
  tur: ['Kartallar', 'Aslanlar', 'Şahinler', 'Yıldızlar'],
  sco: ['The Thistles', 'The Stags', 'The Lions', 'The Highlanders'],
  gre: ['οι Αετοί', 'οι Λέοντες', 'οι Θαλασσινοί', 'οι Αστέρες'],
};

const MASCOTS = ['Águia', 'Leão', 'Lobo', 'Raposa', 'Falcão', 'Touro', 'Cervo', 'Urso'];
const PATTERNS: ClubSeed['pattern'][] = ['v', 'h', 'sash', 'solid', 'half'];

export function expandedClubs(league: keyof typeof DATA): ClubSeed[] {
  const rows = DATA[league].trim().split('\n').map((line) => line.split('|'));
  const usedShorts = new Set<string>();
  return rows.map(([name, city, uf], i) => {
    const id = `${league}-${String(i + 1).padStart(2, '0')}`;
    const initials = name.split(/\s+/).map((part) => part[0]).join('').toUpperCase();
    let short = (initials + name.replace(/[^\p{L}]/gu, '').toUpperCase()).slice(0, 3);
    if (usedShorts.has(short)) short = `${initials[0]}${(i + 1).toString(36).toUpperCase().padStart(2, '0')}`;
    usedShorts.add(short);
    return {
      id, name, short, city, uf,
      colors: PALETTES[league][i % 4], pattern: PATTERNS[i % PATTERNS.length],
      rep: Math.max(44, Math.round(87 - i * 1.35)), cap: Math.round(Math.max(4500, 52000 - i * 1450) / 500) * 500,
      nickname: NICKNAMES[league][i % 4], mascot: MASCOTS[i % MASCOTS.length],
      stadium: `Estádio ${name}`, rival: `${league}-${String((i ^ 1) + 1).padStart(2, '0')}`,
    };
  });
}

export const EXPANDED_CLUBS: Record<keyof typeof DATA, ClubSeed[]> = {
  ger: expandedClubs('ger'), fra: expandedClubs('fra'), ned: expandedClubs('ned'), bel: expandedClubs('bel'),
  tur: expandedClubs('tur'), sco: expandedClubs('sco'), gre: expandedClubs('gre'),
};
