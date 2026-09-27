import { describe, expect, it } from 'vitest'

import { checkSameOriginJson } from './sameOrigin'

const json = { 'content-type': 'application/json' }

describe('checkSameOriginJson', () => {
  it('пропускает fetch со своей страницы', () => {
    expect(checkSameOriginJson(new Headers({ ...json, 'sec-fetch-site': 'same-origin', origin: 'https://armreview.ru', host: 'armreview.ru' }))).toBe('ok')
  })

  it('отклоняет чужой сайт и поддомен по Sec-Fetch-Site, даже с JSON', () => {
    for (const site of ['cross-site', 'same-site', 'none']) {
      expect(checkSameOriginJson(new Headers({ ...json, 'sec-fetch-site': site }))).toBe('cross_origin')
    }
  })

  it('Sec-Fetch-Site важнее Origin: подделанный Origin при cross-site не помогает', () => {
    expect(checkSameOriginJson(new Headers({ ...json, 'sec-fetch-site': 'cross-site', origin: 'https://armreview.ru', host: 'armreview.ru' }))).toBe('cross_origin')
  })

  it('без Sec-Fetch-Site сверяет Origin с Host', () => {
    expect(checkSameOriginJson(new Headers({ ...json, origin: 'https://armreview.ru', host: 'armreview.ru' }))).toBe('ok')
    expect(checkSameOriginJson(new Headers({ ...json, origin: 'https://evil.example', host: 'armreview.ru' }))).toBe('cross_origin')
    expect(checkSameOriginJson(new Headers({ ...json, origin: 'http://localhost:3001', host: 'localhost:3000' }))).toBe('cross_origin')
  })

  it('Origin: null и Origin без Host — чужие', () => {
    expect(checkSameOriginJson(new Headers({ ...json, origin: 'null', host: 'armreview.ru' }))).toBe('cross_origin')
    expect(checkSameOriginJson(new Headers({ ...json, origin: 'https://armreview.ru' }))).toBe('cross_origin')
  })

  it('без Sec-Fetch-Site и Origin (не браузер) пропускает — чужой IP так не подставить', () => {
    expect(checkSameOriginJson(new Headers(json))).toBe('ok')
  })

  it('принимает только JSON, в любом регистре и с параметрами', () => {
    const same = { 'sec-fetch-site': 'same-origin' }
    expect(checkSameOriginJson(new Headers({ ...same, 'content-type': 'Application/JSON; charset=utf-8' }))).toBe('ok')
    expect(checkSameOriginJson(new Headers({ ...same, 'content-type': 'text/plain;charset=UTF-8' }))).toBe('not_json')
    expect(checkSameOriginJson(new Headers({ ...same, 'content-type': 'application/x-www-form-urlencoded' }))).toBe('not_json')
    expect(checkSameOriginJson(new Headers(same))).toBe('not_json')
  })
})
