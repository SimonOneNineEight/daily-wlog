// Shared test categories — the one place the ids, names, colors, and icons
// the suites assert on are declared. Suites spread and override (position,
// inUse/hasChildren flags) to build the exact set a screen expects.
export const cat = {
  work: { id: 'c-work', name: '工作', color: '#4A93C4', icon: 'briefcase', position: 1 },
  sport: { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 2 },
  food: { id: 'c-food', name: '美食', color: '#D3AE40', icon: 'utensils', position: 3 },
  gym: { id: 'c-gym', name: '健身房', color: '#73B062', icon: 'tag', position: 1, parentId: 'c-sport' },
};
