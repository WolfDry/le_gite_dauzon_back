import { createHash } from 'crypto'
import { Logger, ServiceUnavailableException } from '@nestjs/common'
import { v2 as cloudinary } from 'cloudinary'
import { EVENEMENTS_FOLDER, UploadService } from './Upload.service'

const CREDENTIALS = {
  CLOUDINARY_CLOUD_NAME: 'gite',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret',
}

describe('UploadService', () => {
  const savedEnv = { ...process.env }
  let service: UploadService
  let destroy: jest.SpyInstance
  let warn: jest.SpyInstance

  beforeEach(() => {
    service = new UploadService()
    destroy = jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' })
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    jest.restoreAllMocks()
  })

  describe('sans variables CLOUDINARY_*', () => {
    beforeEach(() => {
      for (const key of Object.keys(CREDENTIALS)) delete process.env[key]
    })

    it("refuse de signer un envoi (503) au lieu d'envoyer une signature inutilisable", () => {
      expect(() => service.createSignature()).toThrow(ServiceUnavailableException)
    })

    it("ne tente pas de supprimer l'image", async () => {
      await service.deleteImage('evenements/photo')
      expect(destroy).not.toHaveBeenCalled()
    })
  })

  describe('avec les variables CLOUDINARY_*', () => {
    beforeEach(() => {
      Object.assign(process.env, CREDENTIALS)
    })

    it('signe les paramètres imposés à l’admin (dossier, formats, redimensionnement)', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_400)

      const signed = service.createSignature()

      expect(signed).toEqual({
        cloudName: 'gite',
        apiKey: '123456',
        timestamp: 1_700_000_000,
        signature: expect.any(String),
        folder: EVENEMENTS_FOLDER,
        allowedFormats: 'jpg,jpeg,png,webp,avif,heic',
        transformation: 'c_limit,w_2400,h_2400',
      })
      // Signature Cloudinary : SHA-1 des paramètres triés, suivis du secret. Cloudinary refuse
      // l'envoi si l'admin change l'un d'eux (dossier, formats…) ; le secret ne quitte pas le serveur.
      const expected = createHash('sha1')
        .update(
          `allowed_formats=${signed.allowedFormats}&folder=${signed.folder}` +
            `&timestamp=${signed.timestamp}&transformation=${signed.transformation}secret`,
        )
        .digest('hex')
      expect(signed.signature).toBe(expected)
      expect(JSON.stringify(signed)).not.toContain('secret')
    })

    it("supprime l'image et vide le cache du CDN", async () => {
      await service.deleteImage('evenements/photo')
      expect(destroy).toHaveBeenCalledWith('evenements/photo', { invalidate: true })
    })

    it.each([null, undefined, ''])('ne fait rien sans image (%p)', async (publicId) => {
      await service.deleteImage(publicId)
      expect(destroy).not.toHaveBeenCalled()
    })

    it("n'échoue pas si Cloudinary refuse la suppression, mais le journalise", async () => {
      destroy.mockRejectedValueOnce(new Error('Cloudinary indisponible'))

      await expect(service.deleteImage('evenements/photo')).resolves.toBeUndefined()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('evenements/photo'))
    })
  })
})
