import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { v2 as cloudinary } from 'cloudinary'

export const EVENEMENTS_FOLDER = 'evenements'

const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif,heic'

const INCOMING_TRANSFORMATION = 'c_limit,w_2400,h_2400'

export type UploadSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  allowedFormats: string
  transformation: string
}

/**
 * Stockage des images sur Cloudinary.
 * L'admin envoie les fichiers directement à Cloudinary avec une signature
 * générée ici : le secret reste côté serveur, et l'upload ne passe pas
 * par la fonction Vercel, dont la taille de requête est limitée.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  private credentials() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!cloudName || !apiKey || !apiSecret) {
      return null
    }
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
    return { cloudName, apiKey, apiSecret }
  }

  /** Paramètres signés permettant à l'admin d'envoyer une image d'événement. */
  createSignature(): UploadSignature {
    const credentials = this.credentials()
    if (!credentials) {
      throw new ServiceUnavailableException("L'envoi d'images n'est pas configuré (variables CLOUDINARY_*)")
    }

    const params = {
      timestamp: Math.round(Date.now() / 1000),
      folder: EVENEMENTS_FOLDER,
      allowed_formats: ALLOWED_FORMATS,
      transformation: INCOMING_TRANSFORMATION,
    }
    const signature = cloudinary.utils.api_sign_request(params, credentials.apiSecret)

    return {
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      timestamp: params.timestamp,
      signature,
      folder: params.folder,
      allowedFormats: params.allowed_formats,
      transformation: params.transformation,
    }
  }

  async deleteImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId || !this.credentials()) return
    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true })
    } catch (error) {
      this.logger.warn(`Impossible de supprimer l'image ${publicId} : ${String(error)}`)
    }
  }
}
