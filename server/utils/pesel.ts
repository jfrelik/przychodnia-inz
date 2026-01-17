import {
	createCipheriv,
	createDecipheriv,
	createHmac,
	randomBytes,
} from 'node:crypto';

const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

function getAesKey(): Buffer {
	const secret = process.env.NUXT_PESEL_ENC_KEY;
	if (!secret) throw new Error('Missing PESEL encryption key');

	const key = Buffer.from(secret, 'base64');
	if (key.length !== 32) {
		throw new Error(
			`Invalid AES key length: ${key.length} bytes (expected 32).`
		);
	}
	return key;
}

export function peselHmac(pesel: string) {
	const secret = process.env.NUXT_PESEL_HMAC_KEY;

	if (!secret) {
		throw new Error('Missing PESEL HMAC secret');
	}

	return createHmac('sha256', secret).update(pesel, 'utf8').digest('hex');
}

export function encryptPesel(pesel: string) {
	const key = getAesKey();

	const iv = randomBytes(GCM_IV_LENGTH);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(pesel, 'utf8'),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptPesel(payload: string) {
	if (!payload) throw new Error('Missing encrypted PESEL');
	const key = getAesKey();

	const data = Buffer.from(payload, 'base64');

	if (data.length <= GCM_IV_LENGTH + GCM_TAG_LENGTH) {
		throw new Error('Encrypted PESEL payload too short');
	}

	const iv = data.subarray(0, GCM_IV_LENGTH);
	const tag = data.subarray(GCM_IV_LENGTH, GCM_IV_LENGTH + GCM_TAG_LENGTH);
	const ciphertext = data.subarray(GCM_IV_LENGTH + GCM_TAG_LENGTH);

	const decipher = createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	const plaintext = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]).toString('utf8');

	return plaintext;
}
