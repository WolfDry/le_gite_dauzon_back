import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'

const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3002']

export function allowedOrigins(value = process.env.CORS_ORIGINS): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return origins.length > 0 ? origins : DEV_ORIGINS
}

export function isSwaggerEnabled(env = process.env): boolean {
  return env.NODE_ENV !== 'production' || env.SWAGGER_ENABLED === 'true'
}

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const swagger = isSwaggerEnabled()

  app.set('trust proxy', 1)

  app.use(helmet({ contentSecurityPolicy: swagger ? false : undefined }))

  app.enableCors({ origin: allowedOrigins() })

  if (swagger) {
    SwaggerModule.setup('api', app, createSwaggerDocument(app))
  }

  return app
}

export function createSwaggerDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Api du gite d\'Auzon')
    .setDescription('Api du gite d\'Auzon')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  return SwaggerModule.createDocument(app, config)
}
