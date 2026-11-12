import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

/**
 * Crée et configure l'application Nest, sans la démarrer.
 * Partagé entre le serveur classique (main.ts) et la fonction Vercel (vercel.ts).
 */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors()

  const config = new DocumentBuilder()
    .setTitle('Api du gite d\'Auzon')
    .setDescription('Api du gite d\'Auzon')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  return app
}
