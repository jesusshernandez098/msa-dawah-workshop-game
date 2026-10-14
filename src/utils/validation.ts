export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateTeamName(
  rawName: string,
  existingTeamNames: string[] = []
): ValidationResult {
  if (typeof rawName !== 'string') {
    return { valid: false, error: 'Team name must be a string' };
  }

  const trimmed = rawName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Team name cannot be empty' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Team name cannot exceed 20 characters' };
  }

  const lower = trimmed.toLowerCase();
  const isDuplicate = existingTeamNames.some(
    (name) => name.trim().toLowerCase() === lower
  );

  if (isDuplicate) {
    return { valid: false, error: 'That team name is already taken' };
  }

  return { valid: true, sanitized: trimmed };
}

export function validateWrittenResponse(rawText: string): ValidationResult {
  if (typeof rawText !== 'string') {
    return { valid: false, error: 'Response must be a string' };
  }

  const trimmed = rawText.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Response cannot be empty' };
  }

  if (rawText.length > 1000) {
    return { valid: false, error: 'Response cannot exceed 1,000 characters' };
  }

  return { valid: true, sanitized: rawText };
}
