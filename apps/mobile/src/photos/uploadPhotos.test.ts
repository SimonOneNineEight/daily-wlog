import { uploadPhotos } from './uploadPhotos';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

it('presigns, uploads bytes to storage, then registers metadata in order', async () => {
  const calls: { url: string; method: string; body?: string }[] = [];
  globalThis.fetch = jest.fn(async (url: unknown, init?: { method?: string; body?: unknown }) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined });
    if (u.endsWith('/photos/presign')) {
      return {
        ok: true,
        json: async () => ({
          uploads: [
            { objectPath: 'u/e/a.jpg', thumbPath: 'u/e/a_t.jpg', uploadUrl: 'https://store/up/a', thumbUploadUrl: 'https://store/up/at' },
            { objectPath: 'u/e/b.jpg', thumbPath: 'u/e/b_t.jpg', uploadUrl: 'https://store/up/b', thumbUploadUrl: 'https://store/up/bt' },
          ],
        }),
      };
    }
    if (u.startsWith('file://')) {
      return { ok: true, blob: async () => new Blob(['bytes']) };
    }
    if (u.startsWith('https://store/up/')) {
      return { ok: true, json: async () => ({}) };
    }
    if (u.endsWith('/photos')) {
      return { ok: true, status: 201, json: async () => ({ photos: [{ id: 'p1' }, { id: 'p2' }] }) };
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as jest.Mock;

  const photos = await uploadPhotos('tok', 'entry-1', [
    { fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg', takenAt: '2026-08-19T07:00:00Z' },
    { fullUri: 'file:///b.jpg', thumbUri: 'file:///b_t.jpg' },
  ]);

  expect(photos).toHaveLength(2);
  // The bytes went to storage, not the API.
  const puts = calls.filter((c) => c.method === 'PUT');
  expect(puts.map((c) => c.url)).toEqual([
    'https://store/up/a',
    'https://store/up/at',
    'https://store/up/b',
    'https://store/up/bt',
  ]);
  // Registration carries the presigned paths and the capture time.
  const register = calls.find((c) => c.url.endsWith('/photos') && c.method === 'POST');
  const body = JSON.parse(register?.body ?? '{}');
  expect(body.photos).toEqual([
    { objectPath: 'u/e/a.jpg', thumbPath: 'u/e/a_t.jpg', takenAt: '2026-08-19T07:00:00Z' },
    { objectPath: 'u/e/b.jpg', thumbPath: 'u/e/b_t.jpg' },
  ]);
  // Order: presign before any upload, register after every upload.
  const presignIndex = calls.findIndex((c) => c.url.endsWith('/presign'));
  const registerIndex = calls.findIndex((c) => c.url.endsWith('/photos') && c.method === 'POST');
  const lastPut = calls.map((c) => c.method).lastIndexOf('PUT');
  expect(presignIndex).toBeLessThan(calls.findIndex((c) => c.method === 'PUT'));
  expect(lastPut).toBeLessThan(registerIndex);
});

it('skips the network entirely with nothing staged', async () => {
  globalThis.fetch = jest.fn() as jest.Mock;
  const photos = await uploadPhotos('tok', 'entry-1', []);
  expect(photos).toEqual([]);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
