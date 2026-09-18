import * as migration_20260918_191820_initial from './20260918_191820_initial';

export const migrations = [
  {
    up: migration_20260918_191820_initial.up,
    down: migration_20260918_191820_initial.down,
    name: '20260918_191820_initial'
  },
];
