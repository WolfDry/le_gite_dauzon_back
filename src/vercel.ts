import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from './app.factory'

type Handler = (req: IncomingMessage, res: ServerResponse) => void

// L'application est initialisée une seule fois par instance de fonction,
// puis réutilisée par les requêtes suivantes (démarrage à froid uniquement).
let server: Promise<Handler> | undefined

async function bootstrap(): Promise<Handler> {
  const app = await createApp()
  await app.init()
  return app.getHttpAdapter().getInstance()
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!server) {
    server = bootstrap().catch((err) => {
      server = undefined
      throw err
    })
  }
  const instance = await server
  instance(req, res)
}
