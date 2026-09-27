import type { Access, FieldAccess } from 'payload'

// Все пользователи коллекции users — админы (Влад и Danil), публичной регистрации нет.
export const isAdmin: Access = ({ req }) => Boolean(req.user)

export const anyone: Access = () => true

// То же для отдельного поля: у поля свой тип доступа (только boolean, без Where)
export const isAdminField: FieldAccess = ({ req }) => Boolean(req.user)
