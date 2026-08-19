// Manual mock, auto-applied by jest for every suite: the real library needs
// reanimated worklets that don't exist in the jest environment. Tests reach
// the reorder seam through mockDragState.onDragEnd.
import { View } from 'react-native';

type RenderInfo = { item: { id?: string }; drag: () => void; isActive: boolean };
type Props = {
  data: { id?: string }[];
  renderItem: (info: RenderInfo) => React.ReactNode;
  onDragEnd: (p: { data: object[] }) => void;
};

type DragState = { onDragEnd?: (p: { data: object[] }) => void };
const holder = globalThis as { __mockDragState?: DragState };
holder.__mockDragState = holder.__mockDragState ?? {};
export const mockDragState = holder.__mockDragState;

export default function MockDraggableFlatList({ data, renderItem, onDragEnd }: Props) {
  // A mock capturing its prop for tests is exactly a render-time mutation;
  // the compiler rule guards production components, not this file.
  // eslint-disable-next-line react-hooks/immutability
  holder.__mockDragState!.onDragEnd = onDragEnd;
  return (
    <View>
      {data.map((item, index) => (
        <View key={item.id ?? index}>
          {renderItem({ item, drag: jest.fn(), isActive: false })}
        </View>
      ))}
    </View>
  );
}
