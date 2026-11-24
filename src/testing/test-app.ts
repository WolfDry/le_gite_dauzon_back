import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';
import { MailGunsService } from '../MailGun/mailGun.service';

/**
 * Application complète (gardes, validation, filtres) pour les tests,
 * avec une base de données et un envoi de mails simulés.
 */

const model = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  findFirst: jest.fn().mockResolvedValue(null),
  findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1 }),
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  update: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  upsert: jest.fn().mockImplementation(async ({ create }) => ({ id: 1, ...create })),
  delete: jest.fn().mockResolvedValue({ id: 1 }),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  updateMany: jest.fn().mockResolvedValue({ count: 0 }),
});

/** Un tarif est toujours renvoyé avec ses périodes (`include`). */
const tarifModel = () => {
  const tarif = model();
  const avecPeriodes = async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data, periodes: [] });
  tarif.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    date: [],
    frequence: ['SEMAINE'],
    parDefaut: false,
    periodes: [],
    _count: { periodes: 0 },
  });
  tarif.create.mockImplementation(avecPeriodes);
  tarif.update.mockImplementation(avecPeriodes);
  return tarif;
};

const createPrismaMock = () => ({
  onModuleInit: jest.fn(),
  // Les opérations reçues sont déjà des promesses simulées.
  $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  user: model(),
  client: model(),
  reservation: model(),
  supplement: model(),
  supplementOnReservation: model(),
  commentaire: model(),
  tarif: tarifModel(),
  tarifPeriode: model(),
  reglages: model(),
  evenement: model(),
  blocage: model(),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const ADMIN = { id: 1, email: 'admin@example.com', password: 'secret-admin' };

export async function createTestApp() {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SECRET_SALT = 'test-salt';

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
