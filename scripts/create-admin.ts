/**
 * Crée un compte du back office directement en base.
 * L'API n'expose plus d'inscription publique : c'est ainsi que se crée le premier compte.
 *
 *   npm run create-admin -- <email> <mot de passe>
 *
 * Utilise DATABASE_URL et SECRET_SALT du fichier .env (ou de l'environnement).
 * SECRET_SALT doit être identique à celui de l'API, sinon le compte ne pourra pas se connecter.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/auth/password'
import { PASSWORD_MIN_LENGTH } from '../src/users/dto/create-user.dto'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main() {
  try {
    process.loadEnvFile()
  } catch {
    // pas de fichier .env : variables déjà présentes dans l'environnement
  }

  const [email, password] = process.argv.slice(2)
  if (!email || !password) {
    fail('Usage : npm run create-admin -- <email> <mot de passe>')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`Adresse e-mail invalide : ${email}`)
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    fail(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  }
  if (!process.env.SECRET_SALT) {
    console.warn(
      "Attention : SECRET_SALT n'est pas défini. Le compte ne fonctionnera que si l'API tourne elle aussi sans SECRET_SALT.",
    )
  }

  const prisma = new PrismaClient()
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      fail(`Un compte existe déjà pour ${email}.`)
    }
    const user = await prisma.user.create({
      data: { email, password: await hashPassword(password) },
      omit: { password: true },
    })
    console.log(`Compte créé : ${user.email} (id ${user.id})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => fail(String(error)))
