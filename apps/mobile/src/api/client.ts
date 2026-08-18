import type { paths } from './types.gen';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

type Me = paths['/me']['post']['responses']['200']['content']['application/json'];

/** Idempotent: provisions the signed-in User's world on first sign-in. */
export async function provisionMe(accessToken: string): Promise<Me> {
  const response = await fetch(`${apiUrl}/me`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`provisioning responded ${response.status}`);
  }
  return (await response.json()) as Me;
}
