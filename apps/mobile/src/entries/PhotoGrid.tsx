import { Camera, X } from 'lucide-react-native';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import DraggableGrid from 'react-native-draggable-grid';

import { createStyles, theme } from '../theme';

export type GridPhoto = {
  key: string;
  uri: string;
};

type EditableProps = {
  onAdd: () => void;
  onRemove: (key: string) => void;
  onReorder: (keys: string[]) => void;
};

type Props = {
  photos: GridPhoto[];
  max?: number;
  /** Present in the entry form; absent on read-only surfaces (day cards). */
  editable?: EditableProps;
  /** Horizontal space the grid may fill; defaults to the window width minus gutters. */
  width?: number;
};

const COLUMNS = 4;
const ADD_KEY = '__add__';

// Photo grid per the canvas: up to 10 square tiles, 4 columns, never a
// carousel. Editing: tap a tile to remove it (the ✕ chip is the visual),
// long-press-drag to reorder, and the dashed tile adds (camera + n/10).
export function PhotoGrid({ photos, max = 10, editable, width }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const gridWidth = width ?? windowWidth - theme.spacing.screenGutter * 2;
  const tile = (gridWidth - theme.spacing.photoGridGap * (COLUMNS - 1)) / COLUMNS;

  if (!editable) {
    return (
      <View style={styles.staticGrid}>
        {photos.slice(0, max).map((photo) => (
          <Image
            key={photo.key}
            source={{ uri: photo.uri }}
            style={[styles.tile, { width: tile, height: tile }]}
          />
        ))}
      </View>
    );
  }

  const items = photos.slice(0, max).map((photo) => ({ ...photo, disabledDrag: false, disabledReSorted: false }));
  const withAdd =
    items.length < max
      ? [...items, { key: ADD_KEY, uri: '', disabledDrag: true, disabledReSorted: true }]
      : items;

  return (
    <DraggableGrid
      numColumns={COLUMNS}
      data={withAdd}
      itemHeight={tile + theme.spacing.photoGridGap}
      style={{ width: gridWidth }}
      onItemPress={(item: GridPhoto) => {
        if (item.key === ADD_KEY) {
          editable.onAdd();
        } else {
          editable.onRemove(item.key);
        }
      }}
      onDragRelease={(data: GridPhoto[]) => {
        editable.onReorder(data.filter((d) => d.key !== ADD_KEY).map((d) => d.key));
      }}
      renderItem={(item: GridPhoto) =>
        item.key === ADD_KEY ? (
          <View style={[styles.addTile, { width: tile, height: tile }]}>
            <Camera size={18} color={theme.colors.iconMuted} strokeWidth={2} />
            <Text style={styles.addCount}>{`${items.length}/${max}`}</Text>
          </View>
        ) : (
          <View style={{ width: tile, height: tile }}>
            <Image source={{ uri: item.uri }} style={[styles.tile, { width: tile, height: tile }]} />
            <View style={styles.removeChip}>
              <X size={12} color={theme.colors.textOnDark} strokeWidth={2.25} />
            </View>
          </View>
        )
      }
    />
  );
}

const styles = createStyles((t) => ({
  staticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.photoGridGap,
  },
  tile: {
    borderRadius: t.radius.photo,
    backgroundColor: t.colors.surfaceFillStrong,
  },
  addTile: {
    borderRadius: t.radius.photo,
    backgroundColor: t.colors.surfaceFill,
    borderWidth: t.border.hairline,
    borderStyle: 'dashed',
    borderColor: t.colors.lineSeparatorStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.space1,
  },
  addCount: {
    ...t.typography.dotOverflow,
    color: t.colors.textTertiary,
  },
  removeChip: {
    position: 'absolute',
    top: t.spacing.space2,
    right: t.spacing.space2,
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
