import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';

/**
 * Application complète (gardes, validation, filtres) pour les tests,
 * avec une base de données et un envoi de mails simulés.
 */

const model = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1 }),
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  update: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  delete: jest.fn().mockResolvedValue({ id: 1 }),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
});

const createPrismaMock = () => ({
  onModuleInit: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([1]),
  user: model(),
  client: model(),
  reservation: model(),
  supplement: model(),
  supplementOnReservation: model(),
  commentaire: model(),
  tarif: model(),
  evenement: model(),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const ADMIN = { id: 1, email: 'admin@example.com', password: 'secret-admin' };

export async function createTestApp() {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SECRET_SALT = 'test-salt';

  // Importés après avoir défini l'environnement : AuthModule lit JWT_SECRET au chargement.
  const { AppModule } = await import('../app.module');
  const { PrismaService } = await import('../prisma.service');
  const { MailGunsService } = await import('../MailGun/mailGun.service');

  const prisma = createPrismaMock();
  const mail = { sendMail: jest.fn().mockResolvedValue({}) };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(MailGunsService)
    .useValue(mail)
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();

  const throttlerStorage = app.get<ThrottlerStorageService>(getStorageToken());
  const http = () => request(app.getHttpServer());

  // Compte admin utilisé par la connexion (findUnique ne sert qu'à la recherche par e-mail).
  const adminHash = bcrypt.hashSync(`${process.env.SECRET_SALT}${ADMIN.password}`, 4);
  prisma.user.findUnique.mockImplementation(async ({ where }) =>
    where.email === ADMIN.email ? { id: ADMIN.id, email: ADMIN.email, password: adminHash } : null,
  );

  const login = await http().post('/auth/login').send({ email: ADMIN.email, password: ADMIN.password }).expect(201);
  const token: string = login.body.access_token;

  return {
    app,
    prisma,
    mail,
    http,
    token,
    auth: { Authorization: `Bearer ${token}` },
    /** Remet à zéro les compteurs de limite de débit (vide le stockage en mémoire). */
    resetThrottle: () => throttlerStorage.onApplicationShutdown(),
  };
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>;
