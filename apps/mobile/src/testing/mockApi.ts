// The suite's one mock API — the api seam's second adapter. Every contract
// arm the app calls is implemented here once, stateful where the server is
// (entries per date, the idempotency-key replay of #17, category creation),
// with per-arm failure switches for the airplane-mode stories. Suites
// declare a world in installMockApi() and assert through the returned
// helpers; nobody hand-rolls globalThis.fetch anymore.
//
// Failure semantics mirror what the screens actually meet: entry writes and
// presign fail as network throws (TypeError), category creation fails as a
// 500 response, health fails either way.

type FetchInit = { method?: string; headers?: Record<string, string>; body?: unknown };
// The recorded view types body as string — the JSON wire case every suite
// parses; photo-blob PUTs re-widen locally where asserted.
type RecordedCall = [string, { method?: string; headers?: Record<string, string>; body?: string } | undefined];

export type MockEntry = {
  id: string;
  date: string;
  position: number;
  categoryId: string;
  subcategoryId?: string;
  authorId: string;
  content: string;
  photos?: object[];
};

export type MockWorld = {
  /** The day lists GET /entries?date= serves; POST appends position = length + 1. */
  entries: Record<string, MockEntry[]>;
  /** One days array served for every month (matches the suites' semantics). */
  monthDays: object[];
  /** Per-year payloads; unknown years serve { days: [], totalEntries: 0 }. */
  years: Record<string, { days: object[]; totalEntries: number }>;
  colorRecents: string[];
  me: object;
  /** The #15 gate: /me 403s until /me/reactivate flips this off. */
  deactivated: boolean;
  health: object;
  /** Override the indexed presign default (uploadPhotos pins named paths). */
  presignUploads?: { objectPath: string; thumbPath: string; uploadUrl: string; thumbUploadUrl: string }[];
  /** The register response's photos array. */
  registeredPhotos: object[];
  /** file:// URIs containing this marker read as purged (OS-evicted cache). */
  purgedFileMarker?: string;
};

export type MockFailures = {
  entryWrites: boolean;
  presign: boolean;
  categoryPost: boolean;
  health?: 'reject' | 'unhealthy';
};

const ok = (payload: unknown, status = 200) => ({
  ok: true,
  status,
  json: async () => payload,
});

export function installMockApi(
  setup: Partial<Omit<MockWorld, 'entries'>> & {
    entries?: Record<string, MockEntry[]>;
    failures?: Partial<MockFailures>;
  } = {},
) {
  const realFetch = globalThis.fetch;
  const world: MockWorld = {
    entries: setup.entries ?? {},
    monthDays: setup.monthDays ?? [],
    years: setup.years ?? {},
    colorRecents: setup.colorRecents ?? [],
    me: setup.me ?? { userId: 'u1', journalId: 'j1', categories: [] },
    deactivated: setup.deactivated ?? false,
    health: setup.health ?? { status: 'ok', schemaVersion: 1 },
    ...(setup.presignUploads ? { presignUploads: setup.presignUploads } : {}),
    registeredPhotos: setup.registeredPhotos ?? [],
    ...(setup.purgedFileMarker ? { purgedFileMarker: setup.purgedFileMarker } : {}),
  };
  const failures: MockFailures = {
    entryWrites: false,
    presign: false,
    categoryPost: false,
    ...setup.failures,
  };
  // The server's idempotency memory (#17): the first 201 per key replays
  // verbatim on the same key. Seedable to play "the create landed but the
  // response was lost".
  const entriesByKey: Record<string, MockEntry> = {};
  let createdEntries = 0;
  let createdCategories = 0;

  const network = () => {
    throw new TypeError('Network request failed');
  };

  const handler = async (url: unknown, init?: FetchInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    const body = () => JSON.parse(typeof init?.body === 'string' ? init.body : '{}');

    if (u.startsWith('file://')) {
      if (world.purgedFileMarker && u.includes(world.purgedFileMarker)) network();
      return { ok: true, blob: async () => new Blob(['bytes']) };
    }
    if (u.startsWith('https://store/up/')) return ok({});
    if (u.endsWith('/health')) {
      if (failures.health === 'reject') throw new Error('network down');
      if (failures.health === 'unhealthy') {
        return { ok: false, json: async () => ({ message: 'database unreachable' }) };
      }
      return ok(world.health);
    }
    if (u.endsWith('/me/reactivate') && method === 'POST') {
      world.deactivated = false;
      return ok(world.me);
    }
    if (u.endsWith('/me') && method === 'DELETE') return ok({}, 204);
    if (u.endsWith('/me')) {
      if (world.deactivated) {
        return { ok: false, status: 403, json: async () => ({ message: 'account is deactivated' }) };
      }
      return ok(world.me);
    }
    if (u.endsWith('/photos/presign') && method === 'POST') {
      if (failures.presign) network();
      const count = body().count as number;
      const uploads =
        world.presignUploads ??
        Array.from({ length: count }, (_, i) => ({
          objectPath: `u/e/${i}.jpg`,
          thumbPath: `u/e/${i}_t.jpg`,
          uploadUrl: `https://store/up/${i}`,
          thumbUploadUrl: `https://store/up/${i}t`,
        }));
      return ok({ uploads });
    }
    if (u.endsWith('/photos') && method === 'POST') {
      return ok({ photos: world.registeredPhotos }, 201);
    }
    if (u.includes('/categories') && method === 'POST') {
      if (failures.categoryPost) {
        return { ok: false, status: 500, json: async () => ({ message: 'nope' }) };
      }
      const requested = body();
      createdCategories += 1;
      return ok({
        id: `c-new-${createdCategories}`,
        name: requested.name,
        color: requested.color,
        icon: requested.parentId ? 'tag' : (requested.icon ?? 'tag'),
        parentId: requested.parentId,
        position: 9,
        inUse: false,
        hasChildren: false,
      });
    }
    if (u.includes('/categories/') && method === 'PATCH') {
      return ok({ id: u.split('/').pop(), ...body() });
    }
    if (u.includes('/categories/') && method === 'DELETE') return ok({}, 204);
    if (u.includes('/color-recents') && method === 'PUT') {
      return ok({ colors: [body().color, ...world.colorRecents] });
    }
    if (u.includes('/color-recents')) return ok({ colors: world.colorRecents });
    if (u.includes('/months/')) return ok({ days: world.monthDays });
    if (u.includes('/years/')) {
      const year = u.split('/years/')[1];
      return ok(world.years[year] ?? { days: [], totalEntries: 0 });
    }
    if (u.includes('/order') && method === 'PUT') {
      const all = Object.values(world.entries).flat();
      const byId = new Map(all.map((entry) => [entry.id, entry]));
      return ok({ entries: (body().entryIds as string[]).map((id) => byId.get(id)) });
    }
    if (u.includes('/entries/') && method === 'PATCH') {
      if (failures.entryWrites) network();
      const id = u.split('/').pop();
      const existing = Object.values(world.entries)
        .flat()
        .find((entry) => entry.id === id);
      return ok({ id, date: '2026-08-19', position: 1, authorId: 'u1', ...existing, ...body() });
    }
    if (u.includes('/entries/') && method === 'DELETE') return ok({}, 204);
    if (u.endsWith('/entries') && method === 'POST') {
      if (failures.entryWrites) network();
      const requested = body();
      const replayed = requested.idempotencyKey && entriesByKey[requested.idempotencyKey];
      if (replayed) return ok(replayed);
      createdEntries += 1;
      const created: MockEntry = {
        id: createdEntries === 1 ? 'e-new' : `e-new-${createdEntries}`,
        date: requested.date,
        position: (world.entries[requested.date] ?? []).length + 1,
        categoryId: requested.categoryId,
        ...(requested.subcategoryId !== undefined
          ? { subcategoryId: requested.subcategoryId }
          : {}),
        authorId: 'u1',
        content: requested.content,
      };
      if (requested.idempotencyKey) entriesByKey[requested.idempotencyKey] = created;
      return ok(created);
    }
    if (u.includes('/entries')) {
      const date = u.includes('date=') ? u.split('date=')[1] : undefined;
      const listed = date !== undefined ? (world.entries[date] ?? []) : [];
      return ok({ entries: listed });
    }
    throw new Error(`unexpected fetch ${u}`);
  };

  const fetchMock = jest.fn(handler);
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const calls = () => fetchMock.mock.calls as unknown as RecordedCall[];
  return {
    world,
    failures,
    seedReplay(key: string, entry: MockEntry) {
      entriesByKey[key] = entry;
    },
    calls,
    entryPosts: () =>
      calls().filter(([u, init]) => String(u).endsWith('/entries') && init?.method === 'POST'),
    find: (method: string, urlPart: string) =>
      calls().find(([u, init]) => (init?.method ?? 'GET') === method && String(u).includes(urlPart)),
    restore() {
      globalThis.fetch = realFetch;
    },
  };
}

export type MockApi = ReturnType<typeof installMockApi>;
