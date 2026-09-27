import * as migration_20260918_191820_initial from './20260918_191820_initial';
import * as migration_20260918_195704_add_match_title from './20260918_195704_add_match_title';
import * as migration_20260918_201652_media_prefix from './20260918_201652_media_prefix';
import * as migration_20260927_113244_vlad_feedback_techniques from './20260927_113244_vlad_feedback_techniques';
import * as migration_20260927_193315_technique_pyramid from './20260927_193315_technique_pyramid';

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
    name: '20260918_201652_media_prefix',
  },
  {
    up: migration_20260927_113244_vlad_feedback_techniques.up,
    down: migration_20260927_113244_vlad_feedback_techniques.down,
    name: '20260927_113244_vlad_feedback_techniques',
  },
  {
    up: migration_20260927_193315_technique_pyramid.up,
    down: migration_20260927_193315_technique_pyramid.down,
    name: '20260927_193315_technique_pyramid'
  },
];
