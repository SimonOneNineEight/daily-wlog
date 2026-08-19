import type { paths } from './types.gen';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export type Me = paths['/me']['post']['responses']['200']['content']['application/json'];
export type Category = Me['categories'][number];
export type CreateEntryBody =
  paths['/entries']['post']['requestBody']['content']['application/json'];
export type Entry = paths['/entries']['post']['responses']['201']['content']['application/json'];
type EntryList = paths['/entries']['get']['responses']['200']['content']['application/json'];
export type MonthDots =
  paths['/months/{month}']['get']['responses']['200']['content']['application/json'];
export type CreateCategoryBody =
  paths['/categories']['post']['requestBody']['content']['application/json'];

async function request<T>(
  accessToken: string,
  path: string,
  init: { method?: string; body?: object } = {},
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Idempotent: provisions the signed-in User's world on first sign-in. */
export function provisionMe(accessToken: string): Promise<Me> {
  return request<Me>(accessToken, '/me', { method: 'POST' });
}

export function createEntry(accessToken: string, body: CreateEntryBody): Promise<Entry> {
  return request<Entry>(accessToken, '/entries', { method: 'POST', body });
}

export function listEntries(accessToken: string, date: string): Promise<EntryList> {
  return request<EntryList>(accessToken, `/entries?date=${date}`);
}

export function getMonth(accessToken: string, month: string): Promise<MonthDots> {
  return request<MonthDots>(accessToken, `/months/${month}`);
}

type UpdateEntryBody =
  paths['/entries/{id}']['patch']['requestBody']['content']['application/json'];

export function updateEntry(accessToken: string, id: string, body: UpdateEntryBody): Promise<Entry> {
  return request<Entry>(accessToken, `/entries/${id}`, { method: 'PATCH', body });
}

export function deleteEntry(accessToken: string, id: string): Promise<void> {
  return request<void>(accessToken, `/entries/${id}`, { method: 'DELETE' });
}

export function reorderDay(accessToken: string, date: string, entryIds: string[]): Promise<EntryList> {
  return request<EntryList>(accessToken, `/days/${date}/order`, { method: 'PUT', body: { entryIds } });
}

export function createCategory(accessToken: string, body: CreateCategoryBody): Promise<Category> {
  return request<Category>(accessToken, '/categories', { method: 'POST', body });
}

type UpdateCategoryBody =
  paths['/categories/{id}']['patch']['requestBody']['content']['application/json'];

export function updateCategory(
  accessToken: string,
  id: string,
  body: UpdateCategoryBody,
): Promise<Category> {
  return request<Category>(accessToken, `/categories/${id}`, { method: 'PATCH', body });
}

export function deleteCategory(accessToken: string, id: string): Promise<void> {
  return request<void>(accessToken, `/categories/${id}`, { method: 'DELETE' });
}
