// Nomes de jogadores espanhóis (nomes, sobrenomes e apelidos comuns na Espanha).
const words = (s: string): string[] => s.trim().split(/\s+/);

export const NAMES = {
  FIRST: words(`
    Alejandro Pablo Javier Sergio Álvaro Adrián Diego David Daniel Mario Carlos Jorge Iván Rubén Raúl Marcos
    Hugo Martín Lucas Manuel Antonio Francisco Miguel Luis Alberto Fernando Ignacio Gonzalo Rodrigo Víctor Óscar Íker
    Unai Aitor Asier Ander Mikel Gorka Jon Xabier Oriol Pol Jordi Marc Arnau Pau Gerard Sergi
    Joan Xavi Borja Nacho Dani Rafael Enrique Andrés Jesús José Juan Pedro Ángel Samuel Héctor Guillermo
    Nicolás Tomás Bruno Eric Aleix Aarón Cristian Jaime Julen Eneko Iñigo Brais Santi Fermín Isco Koldo
  `),
  LAST: words(`
    García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz
    Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez
    Ortega Delgado Castro Ortiz Rubio Marín Sanz Núñez Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero
    Cano Prieto Méndez Cruz Calvo Gallego Vidal León Márquez Herrera Peña Flores Cabrera Campos Vega Fuentes
    Carrasco Diez Caballero Reyes Nieto Aguilar Pascual Santana Herrero Montero Lorenzo Hidalgo Giménez Ibáñez Echeverría Aguirre
    Zubizarreta Etxeberria Goikoetxea Arrieta Puig Soler Ferrer Roca Casals Vilanova
  `),
  NICK: words(`
    Chema Pepe Paco Juanma Chus Rafa Nando Quique Chimo Kiko Fran Lolo Manolo Rulo Toni Chechu Moi Tito Curro Josete Isma Jandro
  `),
};
