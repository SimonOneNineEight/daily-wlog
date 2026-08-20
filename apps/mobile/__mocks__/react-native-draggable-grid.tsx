// Manual mock, auto-applied: the real library's PanResponder gestures don't
// exist in jest. Tests reach the reorder seam via __mockGridState.
import { Pressable, View } from 'react-native';

type Item = { key: string; uri?: string; disabledDrag?: boolean };
type Props = {
  data: Item[];
  renderItem: (item: Item) => React.ReactNode;
  onItemPress?: (item: Item) => void;
  onDragRelease?: (data: Item[]) => void;
};

type GridState = { onDragRelease?: (data: Item[]) => void };
const holder = globalThis as { __mockGridState?: GridState };
holder.__mockGridState = holder.__mockGridState ?? {};

export default function MockDraggableGrid({ data, renderItem, onItemPress, onDragRelease }: Props) {
  // eslint-disable-next-line react-hooks/immutability
  holder.__mockGridState!.onDragRelease = onDragRelease;
  return (
    <View>
      {data.map((item) => (
        <Pressable key={item.key} testID={`grid-item-${item.key}`} onPress={() => onItemPress?.(item)}>
          {renderItem(item)}
        </Pressable>
      ))}
    </View>
  );
}
