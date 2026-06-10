// src/utils/passwordPolicy.js
// Politique de mot de passe commune à toute la plateforme : au moins 8
// caractères, avec une majuscule, une minuscule, un chiffre et un caractère
// spécial — appliquée à la création de compte (entreprise/admin), à la
// création/modification d'utilisateurs et au changement de mot de passe.

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;

const PASSWORD_MESSAGE =
  "Le mot de passe doit contenir au moins 8 caractères, avec une majuscule, " +
  "une minuscule, un chiffre et un caractère spécial (ex: ! @ # $ % &).";

function isPasswordValid(pwd) {
  return typeof pwd === "string" && PASSWORD_REGEX.test(pwd);
}

module.exports = { isPasswordValid, PASSWORD_REGEX, PASSWORD_MESSAGE };
