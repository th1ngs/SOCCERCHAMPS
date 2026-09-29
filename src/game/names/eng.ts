// Nomes de jogadores ingleses (nomes, sobrenomes e apelidos comuns na Inglaterra).
const words = (s: string): string[] => s.trim().split(/\s+/);

export const NAMES = {
  FIRST: words(`
    James Jack Harry Oliver Thomas George Charlie William Joshua Daniel Samuel Joseph Benjamin Luke Matthew Ryan
    Callum Connor Jordan Lewis Liam Jamie Kieran Adam Nathan Aaron Ben Tom Sam Josh Alfie Freddie
    Archie Oscar Max Henry Leo Ethan Mason Tyler Reece Kyle Dominic Declan Marcus Jacob Jake Jadon
    Harvey Toby Rhys Owen Michael David Paul Mark Steven Andrew Gary Wayne Ashley Jonathan Christopher Robert
    Ollie Bradley Curtis Dean Lee Jermaine Trent Kane Phil Cole Mitchell Morgan Ellis Bailey Louis Elliot
  `),
  LAST: words(`
    Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green
    Hall Wood Jackson Clarke Harris Clark Lewis Young Allen King Baker Hughes Turner Hill Moore Cooper
    Ward Morris Harrison Martin Watson Edwards Bennett Wilkinson Parker Carter Shaw Chapman Mitchell Barnes Palmer Richardson
    Marshall Barker Fletcher Holmes Lloyd Ellis Webb Pearson Hudson Dixon Rowe Foster Sutton Butler Gibson Hunt
    Mason Stone Cartwright Ashworth Hargreaves Whitaker Sheringham Pickford Barkley Maddison Rowley Oakley Tilling Brereton Ackroyd Fairclough
  `),
  NICK: words(`
    Jonno Robbo Gazza Wazza Stevie Macca Hendo Charlie Jonesy Smudge Chalky Lampy Walshy Tommo Deano Sparky Dicko Fozzy Bazza Kenno Stodge Robo
  `),
};
