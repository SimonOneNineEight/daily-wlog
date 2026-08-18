import { decodeContent, encodeContent } from './content';

describe('entry content codec', () => {
  it('round-trips title and note through the versioned blob', () => {
    const blob = encodeContent({ title: '晨跑 5K', note: '河濱公園，天氣很好' });
    expect(JSON.parse(blob).v).toBe(1);
    expect(decodeContent(blob)).toEqual({ title: '晨跑 5K', note: '河濱公園，天氣很好' });
  });

  it('returns null for blobs it cannot read', () => {
    expect(decodeContent('not json at all')).toBeNull();
    expect(decodeContent('{"v":99}')).toBeNull();
  });
});
