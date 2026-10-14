const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateGameCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_ALPHABET.length);
    result += CODE_ALPHABET[randomIndex];
  }
  return result;
}

export function sanitizeGameCode(input: string): string {
  return input.toUpperCase().trim().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '');
}
