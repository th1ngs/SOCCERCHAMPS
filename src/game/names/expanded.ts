// Bancos de nomes locais das sete novas nacionalidades.
import type { LeagueId } from '../types';
import type { NameLists } from './index';

type NewLeague = Extract<LeagueId, 'ger' | 'fra' | 'ned' | 'bel' | 'tur' | 'sco' | 'gre'>;
const words = (s: string): string[] => s.trim().split(/\s+/);
const names = (first: string, last: string, nick: string): NameLists => ({ FIRST: words(first), LAST: words(last), NICK: words(nick) });

export const EXPANDED_NAMES: Record<NewLeague, NameLists> = {
  ger: names(
    'Lukas Leon Felix Jonas Finn Paul Elias Noah Ben Julian Max Moritz Florian Niklas Tim Tobias David Erik Jan Mats Marco Anton Fabian Hannes Simon Emil Johann Christoph Alexander Sebastian',
    'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Hoffmann Schulz Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hartmann Lange Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser Fuchs Peters Lang',
    'Luki Fritzi Hansi Manni Poldi Kalle Flo Tobi Niki Fabi Jogi',
  ),
  fra: names(
    'Lucas Gabriel Louis Arthur Hugo Raphaël Jules Adam Nathan Mohamed Enzo Maxime Antoine Julien Théo Mathis Alexandre Clément Baptiste Adrien Nicolas Victor Simon Paul Kylian Rayan Karim Mehdi Sofiane Olivier',
    'Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia Roux Fontaine Vincent Muller Lambert Bonnet François Legrand Gautier Faure Rousseau Duval André Mercier Girard Fournier Chevalier François Perrin Lemoine',
    'Lulu Gabi Toto Raph Juju Nico Titi Maxo Didi Kiki',
  ),
  ned: names(
    'Daan Sem Bram Luuk Jesse Finn Lars Milan Levi Thijs Noud Mees Sven Thomas Ruben Stijn Tim Joris Sander Wout Bas Joost Mats Teun Gijs Pieter Rick Kevin Robin Jeroen',
    'deJong Jansen deVries vanDijk Bakker Visser Smit Meijer deBoer Mulder Bos Vos Peters Hendriks vanLeeuwen Dekker Brouwer deWit Dijkstra Smits deGraaf vanBeek Kok Jacobs vanDam vanVliet deGroot Postma Vermeer vanDerMeer vanDenBerg Verhoeven',
    'Daanie Brammetje Luukie Piets Teunie Jopie Robbie Sennie Gijsie',
  ),
  bel: names(
    'Louis Lucas Arthur Noah Jules Victor Adam Liam Elias Finn Simon Matteo Milan Hugo Théo Nathan Maxime Olivier Thomas Julien Youssef Mehdi Ibrahim Pieter Jan Bram Wout Lars Kevin Niels',
    'Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters DeSmet Vermeulen Dubois Lambert Laurent Martin Bernard Dupont Leclercq Dumont Lefèvre Desmet Vandenberghe VanDam Verstraete Coppens Baert DeBruyne DeWilde DeWinter Vervloet',
    'Loulou Nico Toto Fons Jefke Simo Wouterke Brammie Didi',
  ),
  tur: names(
    'Emir Arda Kerem Yusuf Ömer Ali Mehmet Ahmet Mustafa Efe Deniz Burak Kaan Can Berk Mert Barış Oğuz Selim Hakan İsmail Murat Cem Enes Furkan Eren Uğur Serkan Onur Tolga',
    'Yılmaz Kaya Demir Çelik Şahin Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Güneş Acar Aksoy Karaca Yavuz Keskin Kaplan Taş Duman',
    'Kara Efe Memo Ardi Canço Kaptan Reis Kartal Boğa',
  ),
  sco: names(
    'James Jack Lewis Oliver Liam Logan Harris Finlay Archie Alexander Callum Fraser Ewan Ryan Ross Scott Andrew Jamie Connor Kyle Murray Cameron Angus Duncan Craig Graham Blair Aidan Brodie Sean Robbie',
    'MacDonald Campbell Stewart Robertson Thomson Anderson Scott Murray Reid Taylor Clark Ross Watson Morrison Fraser Graham MacKenzie Wallace McLeod Hamilton Ferguson Burns Crawford Boyd Johnston McGregor Davidson MacLean Munro Kerr Douglas Paterson',
    'Macca Robbo Fraz Tam Jock Wee Brodie Cammy Dunc Grumpy',
  ),
  gre: names(
    'Giorgos Dimitris Nikos Kostas Giannis Vasilis Christos Panagiotis Alexandros Andreas Michalis Stefanos Petros Antonis Thanos Manolis Spyros Leonidas Stavros Theodoros Apostolos Ilias Markos Pavlos Fotis Sotiris Anestis Kyriakos Aris Odysseas',
    'Papadopoulos Nikolaidis Georgiou Dimitriou Konstantinou Ioannou Vasileiou Christodoulou Karagiannis Pappas Antoniou Theodorou Panagiotou Stavropoulos Anagnostou Koutroubis Makris Kotsis Galanis Raptis Lykos Sideris Tsakiris Giannopoulos Vlachos Petrou Samaras Fotiou Kouris Tzimas',
    'Niko Dimi Yanni Kosta Taso Mano Spiro Leo Theo Foti',
  ),
};
