const test = require('node:test');
const assert = require('node:assert/strict');
const { HttpError, getErrorMessage, translate, languages } = require('./helpers/errors.cjs');

test('missing or malformed duplicate payloads use a translated fallback', () => {
  const { DuplicateSuggestionError } = require('./helpers/errors.cjs');
  for (const payload of [null, 'not JSON', {}, { error: ' ' }, { error: 42 }]) {
    for (const { code } of languages) {
      assert.equal(getErrorMessage(code, new DuplicateSuggestionError(payload), 'Erreur'),
        translate(code, 'Ce bar existe déjà ou fait déjà l’objet d’une suggestion.'));
    }
  }
});

test('technical payloads never leak into user-facing messages in any language', () => {
  for (const { code } of languages) {
    for (const error of [new Error('<html>SQL stacktrace</html>'), new Error('Token manquant dans la réponse'), { message: 'secret' }, null]) {
      assert.equal(getErrorMessage(code, error, "Impossible de vous connecter pour le moment. Réessayez dans un instant."), translate(code, "Impossible de vous connecter pour le moment. Réessayez dans un instant."));
    }
  }
});

test('network, timeout, rate limit and service errors are distinct and translated', () => {
  const cases = [
    [new TypeError('Failed to fetch'), 'Connexion impossible. Vérifiez votre connexion Internet, puis réessayez.'],
    [new Error('Network request failed'), 'Connexion impossible. Vérifiez votre connexion Internet, puis réessayez.'],
    [new HttpError(504), 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'],
    [new HttpError(429), 'Trop de tentatives. Patientez quelques instants avant de réessayer.'],
    [new HttpError(503, 'Le mot de passe est incorrect.'), 'Le service est temporairement indisponible. Réessayez dans quelques minutes.'],
    [new HttpError(403), 'Vous n’avez pas l’autorisation d’effectuer cette action.'],
    [new HttpError(404), 'Cet élément n’est plus disponible. Actualisez la liste.'],
  ];
  for (const { code } of languages) for (const [error, key] of cases) {
    assert.equal(getErrorMessage(code, error, "Impossible de traiter cette demande. Actualisez la liste et réessayez."), translate(code, key));
  }
});

test('known domain errors retain useful context instead of generic HTTP messages', () => {
  for (const key of ['SESSION_EXPIRED', 'Le mot de passe est incorrect.', 'Cette suggestion a déjà été traitée.', 'Ce nom d\'utilisateur est déjà pris.']) {
    assert.equal(getErrorMessage('fr', new HttpError(403, key), "Impossible de traiter cette demande. Actualisez la liste et réessayez."), translate('fr', key));
  }
});
