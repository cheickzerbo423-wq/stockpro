// src/utils/passwordPolicy.js
// Politique de mot de passe commune à toute la plateforme : au moins 8
// caractères, avec une majuscule, une minuscule, un chiffre et un caractère
// spécial. Utilisée pour valider les mots de passe côté frontend (création
// d'utilisateur, création d'entreprise, changement de mot de passe) et pour
// afficher une checklist en temps réel à l'utilisateur.

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

export const PASSWORD_HINT =
  "8 caractères min., avec majuscule, minuscule, chiffre et caractère spécial (! @ # $ % ...)";

export function checkPasswordRules(pwd) {
  const value = pwd || "";
  return {
    length:  value.length >= 8,
    upper:   /[A-Z]/.test(value),
    lower:   /[a-z]/.test(value),
    digit:   /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value),
  };
}

export function isPasswordValid(pwd) {
  const r = checkPasswordRules(pwd);
  return r.length && r.upper && r.lower && r.digit && r.special;
}
