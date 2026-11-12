import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';

/**
 * Vérifie la séparation site public / back office :
 * - les routes utilisées par le site public restent accessibles sans jeton ;
 * - toutes les autres exigent le JWT obtenu via /auth/login.
 * La base de données et l'envoi de mails sont simulés.
 */

const model = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  update: jest.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  delete: jest.fn().mockResolvedValue({ id: 1 }),
  deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
});

const prisma = {
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
};

const ADMIN = { email: 'admin@example.com', password: 'secret' };

describe("Contrôle d'accès de l'API", () => {
  let app: INestApplication;
  let token: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.SECRET_SALT = 'test-salt';

    // Importés après avoir défini l'environnement : AuthModule lit JWT_SECRET au chargement.
    const { AppModule } = await import('../app.module');
    const { PrismaService } = await import('../prisma.service');
    const { MailGunsService } = await import('../MailGun/mailGun.service');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(MailGunsService)
      .useValue({ sendMail: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: ADMIN.email,
      password: bcrypt.hashSync(`${process.env.SECRET_SALT}${ADMIN.password}`, 4),
    });
    const login = await http().post('/auth/login').send(ADMIN).expect(201);
    token = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('délivre un jeton à la connexion, sans renvoyer le mot de passe', async () => {
    const res = await http().post('/auth/login').send(ADMIN).expect(201);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: 1, email: ADMIN.email });

    await http().post('/auth/login').send({ ...ADMIN, password: 'faux' }).expect(401);
  });

  describe('routes du site public (sans jeton)', () => {
    it.each([
      ['get', '/'],
      ['get', '/cron'],
      ['get', '/reservations'],
      ['get', '/commentaires'],
      ['get', '/tarifs'],
      ['get', '/evenements'],
    ] as const)('%s %s est accessible', async (method, path) => {
      await http()[method](path).expect(200);
    });

    it('accepte une demande de réservation', async () => {
      await http()
        .post('/reservations/request')
        .send({ debut: '2026-07-04', fin: '2026-07-11', nbPersonne: [], email: 'a@b.fr', phone: '06' })
        .expect(201);
    });

    it('accepte un message du formulaire de contact', async () => {
      await http().post('/mailgun').send({ subject: 'autre', content: {} }).expect(201);
    });

    it('reste accessible même avec un jeton invalide ou expiré', async () => {
      await http().get('/tarifs').set('Authorization', 'Bearer invalide').expect(200);
    });
  });

  describe('routes du back office', () => {
    const adminRoutes = [
      ['get', '/clients'],
      ['post', '/clients'],
      ['get', '/clients/1'],
      ['patch', '/clients/1'],
      ['delete', '/clients/1'],
      ['post', '/reservations'],
      ['get', '/reservations/1'],
      ['patch', '/reservations/1'],
      ['delete', '/reservations/1'],
      ['get', '/commentaires/1'],
      ['patch', '/commentaires/1'],
      ['delete', '/commentaires/1'],
      ['post', '/tarifs'],
      ['get', '/tarifs/1'],
      ['patch', '/tarifs/1'],
      ['delete', '/tarifs/1'],
      ['get', '/supplements'],
      ['post', '/supplements'],
      ['patch', '/supplements/1'],
      ['delete', '/supplements/1'],
      ['post', '/evenements'],
      ['get', '/evenements/1'],
      ['patch', '/evenements/1'],
      ['delete', '/evenements/1'],
      ['post', '/upload'],
      ['get', '/users'],
      ['get', '/users/1'],
      ['patch', '/users/1'],
      ['delete', '/users/1'],
    ] as const;

    it.each(adminRoutes)('%s %s est refusé sans jeton', async (method, path) => {
      await http()[method](path).expect(401);
    });

    it('refuse un jeton invalide', async () => {
      await http().get('/clients').set('Authorization', 'Bearer invalide').expect(401);
    });

    it('accepte le jeton obtenu à la connexion', async () => {
      const auth = { Authorization: `Bearer ${token}` };
      await http().get('/clients').set(auth).expect(200);
      await http().get('/supplements').set(auth).expect(200);
      await http().patch('/commentaires/1').set(auth).send({ verif: true }).expect(200);
      await http().delete('/reservations/1').set(auth).expect(200);
    });
  });

  describe('création de commentaire', () => {
    const body = { name: 'Jean', commentaire: 'Super', note: 5, verif: true, created: '2020-01-01T00:00:00.000Z' };

    beforeEach(() => prisma.commentaire.create.mockClear());

    it("un visiteur ne peut ni valider ni antidater son commentaire", async () => {
      await http().post('/commentaires').send(body).expect(201);
      expect(prisma.commentaire.create).toHaveBeenCalledWith({
        data: { name: 'Jean', commentaire: 'Super', note: 5 },
      });
    });

    it("l'admin peut créer un commentaire validé et daté", async () => {
      await http().post('/commentaires').set('Authorization', `Bearer ${token}`).send(body).expect(201);
      expect(prisma.commentaire.create).toHaveBeenCalledWith({
        data: { name: 'Jean', commentaire: 'Super', note: 5, verif: true, created: body.created },
      });
    });
  });

  describe("création d'utilisateur", () => {
    const body = { email: 'nouveau@example.com', password: 'secret' };

    it('est ouverte tant qu’aucun compte n’existe', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      await http().post('/users').send(body).expect(201);
    });

    it('exige ensuite un jeton', async () => {
      await http().post('/users').send(body).expect(401);
      await http().post('/users').set('Authorization', `Bearer ${token}`).send(body).expect(201);
    });
  });
});
