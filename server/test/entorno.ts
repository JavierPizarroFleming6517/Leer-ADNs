// Llaves efímeras para las pruebas (no se usan las de server/.env). DATABASE_URL sí viene de .env.
import { generateKeyPairSync, randomBytes } from 'crypto';
import 'dotenv/config';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
process.env.JWT_SECRET = randomBytes(48).toString('base64url');
process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.BLIND_INDEX_KEY = randomBytes(32).toString('base64');
process.env.ED25519_PRIVATE_KEY = privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
process.env.ED25519_PUBLIC_KEY = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
process.env.APP_URL = 'https://trazagen.test';
