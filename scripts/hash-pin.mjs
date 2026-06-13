// Generate the SHA-256 hash of a PIN, to put in VITE_<VIEW>_PIN_HASH.
// Usage:  npm run hash-pin -- 1234
import { createHash } from 'node:crypto'

const pin = process.argv[2]
if (!pin) {
  console.error('Usage: npm run hash-pin -- <PIN>')
  console.error('Example: npm run hash-pin -- 8472')
  process.exit(1)
}

const hash = createHash('sha256').update(String(pin)).digest('hex')
console.log('\nPIN:  ' + pin)
console.log('HASH: ' + hash)
console.log('\nPut the HASH in your .env, e.g.:')
console.log('  VITE_REPORTS_PIN_HASH=' + hash + '\n')
