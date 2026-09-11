import { Preferences } from '@capacitor/preferences';

export type SaveData = {
  highScore: number;
  bestLevel: number;
  shards: number;
  games: number;
  sound: boolean;
  haptics: boolean;
  selectedShip: string;
  unlockedShips: string[];
};

const defaults: SaveData = {
  highScore: 0,
  bestLevel: 1,
  shards: 0,
  games: 0,
  sound: true,
  haptics: true,
  selectedShip: 'nova',
  unlockedShips: ['nova']
};

export async function loadSave(): Promise<SaveData> {
  const { value } = await Preferences.get({ key: 'nova-lane-save-v1' });
  if (!value) return { ...defaults };
  try {
    return { ...defaults, ...JSON.parse(value) as Partial<SaveData> };
  } catch {
    return { ...defaults };
  }
}

export async function writeSave(save: SaveData): Promise<void> {
  await Preferences.set({ key: 'nova-lane-save-v1', value: JSON.stringify(save) });
}
