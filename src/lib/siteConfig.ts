// Альфа — профили и матчи, голосование и топ — бета (docs/changes/roadmap.md § «Альфа»).
// Константа, а не .env: включение — после D1, D2, D5 отдельным коммитом (alpha-scope.md § 1).
// Пока false, сайт не ставит cookie и не пишет ipHash — персональных данных нет
export const VOTING_ENABLED: boolean = false

export const siteConfig = {
  name: 'ArmReview',
  description: VOTING_ENABLED ? 'Зрители оценивают матчи East vs West' : 'Профили рукоборцев и матчи East vs West',
  // TODO(вопрос 3): оператор ПД — до запуска голосования подставить ФИО (логично Влад)
  operatorName: '[ФИО оператора — уточнить]',
  // TODO(вопрос к Владу — контакт для жалоб и обращений): до запуска подставить почту или ссылку ВК
  contactEmail: '[адрес для обращений — уточнить]',
} as const
