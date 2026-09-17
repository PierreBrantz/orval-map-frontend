import { Language, translate, translations, TranslationKey } from '../i18n/translations';

export class HttpError extends Error {
  constructor(public readonly status: number, message = '') {
    super(message);
    this.name = 'HttpError';
  }
}

export class DuplicateSuggestionError extends HttpError {
  readonly duplicateType?: 'PLACE' | 'PLACE_REQUEST';
  readonly duplicateId?: number;
  constructor(payload: unknown) {
    const data = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    super(409, typeof data.error === 'string' && data.error.trim() ? data.error : '');
    this.name = 'DuplicateSuggestionError';
    if (data.duplicateType === 'PLACE' || data.duplicateType === 'PLACE_REQUEST') {
      this.duplicateType = data.duplicateType;
    }
    if (typeof data.duplicateId === 'number' && Number.isSafeInteger(data.duplicateId) && data.duplicateId > 0) {
      this.duplicateId = data.duplicateId;
    }
  }
}

// Duplicate creation responses explicitly contain display-ready text. Other
// server errors must use translated messages rather than raw response bodies.
export function getErrorMessage(language: Language, error: unknown, fallback: TranslationKey): string {
  if (error instanceof DuplicateSuggestionError) {
    return error.message || translate(language, 'Ce bar existe déjà ou fait déjà l’objet d’une suggestion.');
  }
  const message = error instanceof Error ? error.message : '';
  const status = error instanceof HttpError ? error.status : undefined;
  let key: string = fallback;
  if (message === 'SESSION_EXPIRED') key = 'SESSION_EXPIRED';
  else if (/network request failed|failed to fetch|networkerror|load failed/i.test(message)) key = 'Connexion impossible. Vérifiez votre connexion Internet, puis réessayez.';
  else if ((error instanceof Error && error.name === 'AbortError') || status === 408 || status === 504) key = 'Le serveur met trop de temps à répondre. Réessayez dans un instant.';
  else if (status === 429) key = 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  else if (status && status >= 500) key = 'Le service est temporairement indisponible. Réessayez dans quelques minutes.';
  else if (message && Object.prototype.hasOwnProperty.call(translations, message)) key = message;
  else if (status === 403) key = "Vous n’avez pas l’autorisation d’effectuer cette action.";
  else if (status === 404) key = "Cet élément n’est plus disponible. Actualisez la liste.";
  else if (status === 400 || status === 422) key = 'Certaines informations sont invalides. Vérifiez les champs saisis.';
  return translate(language, key);
}
