// Seleções disponíveis. `rating` influencia os resultados simulados da Copa.
window.SC = window.SC || {};

SC.TEAMS = [
  { id: 'bra', name: 'Brasil', rating: 92, flag: { type: 'brazil' } },
  { id: 'arg', name: 'Argentina', rating: 92, flag: { type: 'h', colors: ['#74acdf', '#ffffff', '#74acdf'] } },
  { id: 'fra', name: 'França', rating: 90, flag: { type: 'v', colors: ['#0055a4', '#ffffff', '#ef4135'] } },
  { id: 'ger', name: 'Alemanha', rating: 88, flag: { type: 'h', colors: ['#000000', '#dd0000', '#ffce00'] } },
  { id: 'esp', name: 'Espanha', rating: 88, flag: { type: 'h', colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] } },
  { id: 'eng', name: 'Inglaterra', rating: 87, flag: { type: 'cross', bg: '#ffffff', fg: '#ce1124' } },
  { id: 'por', name: 'Portugal', rating: 86, flag: { type: 'v', colors: ['#006600', '#006600', '#ff0000', '#ff0000', '#ff0000'] } },
  { id: 'ned', name: 'Holanda', rating: 85, flag: { type: 'h', colors: ['#ae1c28', '#ffffff', '#21468b'] } },
  { id: 'ita', name: 'Itália', rating: 85, flag: { type: 'v', colors: ['#009246', '#ffffff', '#ce2b37'] } },
  { id: 'bel', name: 'Bélgica', rating: 83, flag: { type: 'v', colors: ['#000000', '#fdda24', '#ef3340'] } },
  { id: 'cro', name: 'Croácia', rating: 82, flag: { type: 'h', colors: ['#ff0000', '#ffffff', '#171796'] } },
  { id: 'uru', name: 'Uruguai', rating: 81, flag: { type: 'h', colors: ['#ffffff', '#0038a8', '#ffffff', '#0038a8', '#ffffff'] } },
  { id: 'col', name: 'Colômbia', rating: 80, flag: { type: 'h', colors: ['#fcd116', '#fcd116', '#003893', '#ce1126'] } },
  { id: 'mar', name: 'Marrocos', rating: 79, flag: { type: 'star', bg: '#c1272d', fg: '#006233' } },
  { id: 'sui', name: 'Suíça', rating: 79, flag: { type: 'swiss', bg: '#d52b1e', fg: '#ffffff' } },
  { id: 'mex', name: 'México', rating: 78, flag: { type: 'v', colors: ['#006847', '#ffffff', '#ce1126'] } },
  { id: 'jpn', name: 'Japão', rating: 78, flag: { type: 'circle', bg: '#ffffff', fg: '#bc002d' } },
  { id: 'den', name: 'Dinamarca', rating: 78, flag: { type: 'nordic', bg: '#c8102e', fg: '#ffffff' } },
  { id: 'usa', name: 'EUA', rating: 77, flag: { type: 'usa' } },
  { id: 'sen', name: 'Senegal', rating: 77, flag: { type: 'v', colors: ['#00853f', '#fdef42', '#e31b23'] } },
  { id: 'swe', name: 'Suécia', rating: 76, flag: { type: 'nordic', bg: '#006aa7', fg: '#fecc00' } },
  { id: 'pol', name: 'Polônia', rating: 75, flag: { type: 'h', colors: ['#ffffff', '#dc143c'] } },
  { id: 'aut', name: 'Áustria', rating: 74, flag: { type: 'h', colors: ['#ed2939', '#ffffff', '#ed2939'] } },
  { id: 'nga', name: 'Nigéria', rating: 74, flag: { type: 'v', colors: ['#008751', '#ffffff', '#008751'] } },
  { id: 'per', name: 'Peru', rating: 73, flag: { type: 'v', colors: ['#d91023', '#ffffff', '#d91023'] } },
  { id: 'cmr', name: 'Camarões', rating: 72, flag: { type: 'v', colors: ['#007a5e', '#ce1126', '#fcd116'] } },
];

SC.teamById = function (id) {
  return SC.TEAMS.find((t) => t.id === id);
};
