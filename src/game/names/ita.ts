// Nomes de jogadores italianos (nomi, cognomi e soprannomi comuns na Itália).
const words = (s: string): string[] => s.trim().split(/\s+/);

export const NAMES = {
  FIRST: words(`
    Alessandro Andrea Lorenzo Matteo Francesco Luca Marco Giovanni Davide Federico Riccardo Simone Stefano Tommaso Nicolò Filippo
    Gabriele Leonardo Mattia Edoardo Pietro Emanuele Daniele Alberto Antonio Giuseppe Salvatore Vincenzo Gennaro Ciro Domenico Raffaele
    Claudio Fabio Roberto Paolo Massimo Gianluca Gianluigi Giorgio Enrico Samuele Michele Giacomo Cristiano Manuel Christian Mirko
    Alessio Diego Fabrizio Nicola Sandro Sergio Ivan Jacopo Kevin Moise Destiny Ettore Dario Mauro Walter Gaetano
    Rocco Cesare Bruno Carlo Franco Luigi Mario Aldo Angelo Arturo Valerio Tiziano Vittorio Ruggero Elia Denis
  `),
  LAST: words(`
    Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa
    Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile
    Martinelli Vitale Lombardo Serra Coppola De_Santis D'Angelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri Bianco Marini
    Grasso Valentini Messina Sala De_Rosa Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo Morelli Amato Silvestri
    Mazza Testa Grassi Pellegrino Carbone Giuliani Benedetti Barone Rossetti Caputo Montanari Guerra Palmieri Bernardi Orlando Donati
  `).map((s) => s.replace(/_/g, " ")),
  NICK: words(`
    Totò Gigi Pippo Beppe Nando Ciccio Peppino Tonino Gianni Sandrino Pupi Nino Bobo Titti Checco Lallo Mimmo Rino Enzino Cicci Gegè Pinturicchio
  `),
};
