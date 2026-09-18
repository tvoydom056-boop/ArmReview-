import type { Access } from 'payload'

// Все пользователи коллекции users — админы (Влад и Danil), публичной регистрации нет.
export const isAdmin: Access = ({ req }) => Boolean(req.user)

export const anyone: Access = () => true
