import { allowedOrigins, createSwaggerDocument, isSwaggerEnabled } from './app.factory'
import { createTestApp } from './testing/test-app'

describe('configuration HTTP', () => {
  describe('allowedOrigins (CORS)', () => {
    it('lit la liste de CORS_ORIGINS, sans espaces ni barre finale', () => {
      expect(allowedOrigins(' https://site.fr/, https://admin.site.fr ')).toEqual([
        'https://site.fr',
        'https://admin.site.fr',
      ])
    })

    it("autorise le site et l'admin en local quand la variable est absente", () => {
      expect(allowedOrigins(undefined)).toEqual(['http://localhost:3000', 'http://localhost:3002'])
      expect(allowedOrigins('')).toEqual(['http://localhost:3000', 'http://localhost:3002'])
    })
  })

  describe('Swagger', () => {
    it('est actif hors production', () => {
      expect(isSwaggerEnabled({})).toBe(true)
      expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true)
    })

    it('est désactivé en production, sauf SWAGGER_ENABLED=true', () => {
      expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false)
      expect(isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true)
    })

    it('génère la documentation à partir des DTO', async () => {
      const { app } = await createTestApp()
      try {
        const document = createSwaggerDocument(app)
        expect(document.paths['/reservations/disponibilites']).toBeDefined()
        expect(document.components?.schemas?.CreateRequestReservationDto).toBeDefined()
      } finally {
        await app.close()
      }
    })
  })
})
