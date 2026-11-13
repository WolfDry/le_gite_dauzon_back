import * as bcrypt from 'bcryptjs'

const salted = (password: string) => `${process.env.SECRET_SALT}${password}`

export const hashPassword = (password: string) => bcrypt.hash(salted(password), 10)

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(salted(password), hash)
