import * as migration_20260918_191820_initial from './20260918_191820_initial';
import * as migration_20260918_195704_add_match_title from './20260918_195704_add_match_title';
import * as migration_20260918_201652_media_prefix from './20260918_201652_media_prefix';

export const migrations = [
  {
    up: migration_20260918_191820_initial.up,
    down: migration_20260918_191820_initial.down,
    name: '20260918_191820_initial',
  },
  {
    up: migration_20260918_195704_add_match_title.up,
    down: migration_20260918_195704_add_match_title.down,
    name: '20260918_195704_add_match_title',
  },
  {
    up: migration_20260918_201652_media_prefix.up,
    down: migration_20260918_201652_media_prefix.down,
    name: '20260918_201652_media_prefix'
  },
];
