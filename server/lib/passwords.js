// Password hashing (salted scrypt, built into Node) and the rules a new password must meet.
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const key = await scrypt(password, salt, 64, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(key, expected);
}

// Checked when someone does not exist, so a wrong username takes as long as a wrong password.
const DUMMY_HASH = hashPassword('not-a-real-password');

// The "Choose your password" page reads these from /auth/me, so what people see ticked off on
// screen is exactly what the server enforces.
const MIN_LENGTH = 6;
const TOO_EASY = ['password', '123456', 'qwerty', 'admin123', 'letmein', 'welcome', 'ipi2026', '111111', 'abc123'];
const RULES = { minLength: MIN_LENGTH, easyWords: TOO_EASY };

// null when the password is acceptable, otherwise a sentence telling the person what to fix.
function passwordProblem(password, username) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (password.length > 100) return 'Use at most 100 characters.';
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Use letters and at least one number.';
  const lower = password.toLowerCase();
  if (username && lower.includes(username.toLowerCase())) return 'Do not include your username in the password.';
  if (TOO_EASY.some((w) => lower.includes(w))) return 'That password is too easy to guess. Pick something less obvious.';
  return null;
}

// 12 characters, no look-alikes (0/O, 1/l/I), always at least one digit: easy to read out over the phone.
function temporaryPassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = Array.from({ length: 9 }, () => pick(letters)).concat(Array.from({ length: 3 }, () => pick(digits)));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { hashPassword, verifyPassword, DUMMY_HASH, RULES, passwordProblem, temporaryPassword };
