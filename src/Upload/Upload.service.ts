import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'

@Injectable()
export class UploadService {
  async save(file: Express.Multer.File | undefined): Promise<{ filename: string }> {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu (champ "image")')
    }

    // Le disque de Vercel est en lecture seule : l'upload n'est disponible qu'en local.
    if (process.env.VERCEL) {
      throw new ServiceUnavailableException("L'envoi d'images n'est pas disponible sur cet environnement")
    }

    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`

    // Écriture dans ./uploads, servi par /uploads/<nom>.
    const dir = join(process.cwd(), 'uploads')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, name), file.buffer)
    return { filename: name }
  }
}
