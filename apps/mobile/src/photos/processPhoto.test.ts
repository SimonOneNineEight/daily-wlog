import { resizeSpec, takenAtFromExif } from './processPhoto';

describe('takenAtFromExif', () => {
  it('converts EXIF DateTimeOriginal to RFC3339', () => {
    const iso = takenAtFromExif({ DateTimeOriginal: '2026:08:19 15:04:05' });
    // Local-time EXIF → UTC instant; only shape and round-trip stability matter.
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(new Date(iso!).getTime()).toBe(new Date(2026, 7, 19, 15, 4, 5).getTime());
  });

  it('ignores missing or malformed EXIF and never reads GPS', () => {
    expect(takenAtFromExif(undefined)).toBeUndefined();
    expect(takenAtFromExif({})).toBeUndefined();
    expect(takenAtFromExif({ DateTimeOriginal: 'not a date' })).toBeUndefined();
    expect(takenAtFromExif({ GPSLatitude: 25.03, DateTime: '2026:01/02' })).toBeUndefined();
  });
});

describe('resizeSpec', () => {
  it('caps the longest edge and never upscales', () => {
    expect(resizeSpec(6000, 4000, 3500)).toEqual({ width: 3500 });
    expect(resizeSpec(3000, 5200, 3500)).toEqual({ height: 3500 });
    expect(resizeSpec(3000, 2000, 3500)).toBeNull();
  });
});
