import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const { secretKey } = decodeSuiPrivateKey(process.env.ADMIN_SECRET_KEY!);
const kp = Ed25519Keypair.fromSecretKey(secretKey);
console.log('admin address:', kp.toSuiAddress());
console.log(
  'pubkey (32B hex):',
  '0x' + Buffer.from(kp.getPublicKey().toRawBytes()).toString('hex'),
);
