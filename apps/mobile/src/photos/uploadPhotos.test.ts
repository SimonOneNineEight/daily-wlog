import { installMockApi, type MockApi } from '../testing/mockApi';

import { uploadPhotos } from './uploadPhotos';

let api: MockApi;

afterEach(() => {
  api.restore();
});

it('presigns, uploads bytes to storage, then registers metadata in order', async () => {
  api = installMockApi({
    presignUploads: [
      { objectPath: 'u/e/a.jpg', thumbPath: 'u/e/a_t.jpg', uploadUrl: 'https://store/up/a', thumbUploadUrl: 'https://store/up/at' },
      { objectPath: 'u/e/b.jpg', thumbPath: 'u/e/b_t.jpg', uploadUrl: 'https://store/up/b', thumbUploadUrl: 'https://store/up/bt' },
    ],
    registeredPhotos: [{ id: 'p1' }, { id: 'p2' }],
  });
  // The wire view this suite asserts on: url/method/body/blob-type per call.
  const calls = () =>
    api.calls().map(([url, init]) => {
      const raw = (init as { body?: unknown } | undefined)?.body;
      return {
        url: String(url),
        method: init?.method ?? 'GET',
        body: typeof raw === 'string' ? raw : undefined,
        blobType: raw instanceof Blob ? raw.type : undefined,
      };
    });

  const photos = await uploadPhotos('tok', 'entry-1', [
    { fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg', takenAt: '2026-08-19T07:00:00Z' },
    { fullUri: 'file:///b.jpg', thumbUri: 'file:///b_t.jpg' },
  ]);

  expect(photos).toHaveLength(2);
  // The bytes went to storage, not the API.
  const puts = calls().filter((c) => c.method === 'PUT');
  expect(puts.map((c) => c.url)).toEqual([
    'https://store/up/a',
    'https://store/up/at',
    'https://store/up/b',
    'https://store/up/bt',
  ]);
  // RN puts the blob's own type on the wire as Content-Type; an untyped
  // blob got uploads rejected by the bucket's MIME allowlist (415).
  expect(puts.map((c) => c.blobType)).toEqual(Array(4).fill('image/jpeg'));
  // Registration carries the presigned paths and the capture time.
  const register = calls().find((c) => c.url.endsWith('/photos') && c.method === 'POST');
  const body = JSON.parse(register?.body ?? '{}');
  expect(body.photos).toEqual([
    { objectPath: 'u/e/a.jpg', thumbPath: 'u/e/a_t.jpg', takenAt: '2026-08-19T07:00:00Z' },
    { objectPath: 'u/e/b.jpg', thumbPath: 'u/e/b_t.jpg' },
  ]);
  // Order: presign before any upload, register after every upload.
  const presignIndex = calls().findIndex((c) => c.url.endsWith('/presign'));
  const registerIndex = calls().findIndex((c) => c.url.endsWith('/photos') && c.method === 'POST');
  const lastPut = calls()
    .map((c) => c.method)
    .lastIndexOf('PUT');
  expect(presignIndex).toBeLessThan(calls().findIndex((c) => c.method === 'PUT'));
  expect(lastPut).toBeLessThan(registerIndex);
});

it('issues every transfer before any of them has answered (#44)', async () => {
  api = installMockApi({ registeredPhotos: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] });
  // Storage answers nothing until released, so what is in the air while the
  // first upload is still open is the whole question: serially it is one
  // transfer, concurrently it is all six.
  const release = api.holdUploads();
  const inFlight = uploadPhotos('tok', 'entry-1', [
    { fullUri: 'file:///a.jpg', thumbUri: 'file:///a_t.jpg' },
    { fullUri: 'file:///b.jpg', thumbUri: 'file:///b_t.jpg' },
    { fullUri: 'file:///c.jpg', thumbUri: 'file:///c_t.jpg' },
  ]);
  const puts = () =>
    api.calls().filter(([u, init]) => String(u).startsWith('https://store/up/') && init?.method === 'PUT');

  let issuedWhileHeld: number;
  try {
    // Drain every microtask the presign and the file reads queue; nothing
    // beyond that can run while storage is holding.
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    issuedWhileHeld = puts().length;
  } finally {
    // Released whatever the count is, so a serial implementation fails the
    // assertion below rather than dangling an unsettled upload.
    release();
  }

  expect(await inFlight).toHaveLength(3);
  expect(issuedWhileHeld).toBe(6);
});

it('skips the network entirely with nothing staged', async () => {
  api = installMockApi();
  const photos = await uploadPhotos('tok', 'entry-1', []);
  expect(photos).toEqual([]);
  expect(api.calls()).toHaveLength(0);
});
