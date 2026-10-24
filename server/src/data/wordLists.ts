import { WORDS } from "./words.js";
import type { Language } from "../types/index.js";

// Har language ki word list (category -> words).
// Hindi roman letters mein hai (English keyboard se type ho sake).
// Spanish/French words bina accent ke likhe hain; guess match karte waqt accent hata diya jata hai.
export const WORD_LISTS: Record<Language, Record<string, string[]>> = {
  English: WORDS,

  Hindi: {
    animals: ["billi", "kutta", "haathi", "sher", "bandar", "mor", "gaay", "ghoda", "bakri", "machhli", "saanp", "tota", "kachhua", "titli", "bhalu", "hiran", "oont", "chuha"],
    objects: ["kursi", "mez", "chaabi", "ghadi", "chhaata", "kitaab", "pankha", "taala", "diya", "jhaadu", "balti", "darpan", "kainchi", "chashma"],
    food: ["roti", "chawal", "dal", "samosa", "jalebi", "paneer", "aam", "kela", "seb", "doodh", "chai", "laddu", "pakora", "paratha", "dahi", "naariyal", "anaar"],
    actions: ["nachna", "gaana", "sona", "daudna", "tairna", "likhna", "hasna", "rona", "khelna", "padhna", "pakana", "kudna", "chadhna"],
    places: ["ghar", "school", "mandir", "bazaar", "aspatal", "station", "nadi", "pahad", "khet", "bagicha", "mela", "qila", "pul", "dukaan"],
    nature: ["suraj", "chaand", "taara", "badal", "baarish", "hawa", "phool", "ped", "patta", "samundar", "aag", "barf", "indradhanush", "bijli"],
  },

  Spanish: {
    animals: ["perro", "gato", "elefante", "leon", "tigre", "caballo", "vaca", "pajaro", "pez", "mono", "conejo", "tortuga", "raton", "jirafa", "serpiente", "oso"],
    objects: ["mesa", "silla", "libro", "reloj", "paraguas", "llave", "telefono", "lampara", "espejo", "tijeras", "cama", "puerta", "ventana", "mochila", "guitarra"],
    food: ["pizza", "manzana", "pan", "queso", "huevo", "leche", "arroz", "helado", "platano", "sopa", "tortilla", "galleta", "naranja", "fresa", "pollo"],
    actions: ["correr", "saltar", "nadar", "bailar", "cantar", "dormir", "comer", "leer", "escribir", "llorar", "reir", "cocinar", "pintar"],
    places: ["casa", "escuela", "playa", "montana", "ciudad", "hospital", "iglesia", "parque", "puente", "granja", "museo", "estadio"],
    nature: ["sol", "luna", "estrella", "nube", "lluvia", "viento", "flor", "arbol", "rio", "fuego", "nieve", "arcoiris", "volcan"],
  },

  French: {
    animals: ["chien", "chat", "elephant", "lion", "cheval", "vache", "oiseau", "poisson", "singe", "lapin", "tortue", "souris", "girafe", "serpent", "ours", "papillon"],
    objects: ["table", "chaise", "livre", "montre", "parapluie", "cle", "telephone", "lampe", "miroir", "ciseaux", "lit", "porte", "fenetre", "valise", "guitare"],
    food: ["pomme", "pain", "fromage", "oeuf", "lait", "riz", "glace", "banane", "soupe", "gateau", "orange", "fraise", "poulet", "croissant"],
    actions: ["courir", "sauter", "nager", "danser", "chanter", "dormir", "manger", "lire", "ecrire", "pleurer", "rire", "cuisiner", "peindre"],
    places: ["maison", "ecole", "plage", "montagne", "ville", "hopital", "eglise", "parc", "pont", "ferme", "musee", "stade"],
    nature: ["soleil", "lune", "etoile", "nuage", "pluie", "vent", "fleur", "arbre", "riviere", "feu", "neige", "volcan"],
  },
};
