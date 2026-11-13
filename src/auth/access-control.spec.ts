import { ADMIN, createTestApp, TestApp } from '../testing/test-app';

/**
 * Vérifie la séparation site public / back office :
 * - les routes utilisées par le site public restent accessibles sans jeton ;
 * - toutes les autres exigent le JWT obtenu via /auth/login.
 * La base de données et l'envoi de mails sont simulés.
 */

const REQUEST = {
  debut: '2026-07-04',
  fin: '2026-07-11',
  nbPersonne: [{ label: 'Adultes', nb: 2 }],
  email: 'a@b.fr',
  phone: '06 12 34 56 78',
};

describe("Contrôle d'accès de l'API", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(() => t.resetThrottle());

  afterAll(async () => {
    await t.app.close();
  });

  it('délivre un jeton à la connexion, sans renvoyer le mot de passe', async () => {
    const res = await t.http().post('/auth/login').send({ email: ADMIN.email, password: ADMIN.password }).expect(201);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: ADMIN.id, email: ADMIN.email });

    await t.http().post('/auth/login').send({ email: ADMIN.email, password: 'faux' }).expect(401);
  });

  describe('routes du site public (sans jeton)', () => {
    it.each([
      ['get', '/'],
      ['get', '/cron'],
      ['get', '/reservations/disponibilites'],
      ['get', '/commentaires'],
      ['get', '/tarifs'],
      ['get', '/evenements'],
    ] as const)('%s %s est accessible', async (method, path) => {
      await t.http()[method](path).expect(200);
    });

    it('accepte une demande de réservation', async () => {
      await t.http().post('/reservations/request').send(REQUEST).expect(201);
    });

    it('accepte un message du formulaire de contact', async () => {
      await t
        .http()
        .post('/mailgun')
        .send({ subject: 'autre', content: { name: 'Jean', email: 'jean@example.com', message: 'Bonjour' } })
        .expect(201);
    });

    it('reste accessible même avec un jeton invalide ou expiré', async () => {
      await t.http().get('/tarifs').set('Authorization', 'Bearer invalide').expect(200);
    });
  });

  describe('routes du back office', () => {
    const adminRoutes = [
      ['get', '/clients'],
      ['post', '/clients'],
      ['get', '/clients/1'],
      ['patch', '/clients/1'],
      ['delete', '/clients/1'],
      ['get', '/reservations'],
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
      ['post', '/upload/signature'],
      ['post', '/users'],
      ['get', '/users'],
      ['get', '/users/1'],
      ['patch', '/users/1'],
      ['delete', '/users/1'],
    ] as const;

    it.each(adminRoutes)('%s %s est refusé sans jeton', async (method, path) => {
      await t.http()[method](path).expect(401);
    });

    it('refuse un jeton invalide', async () => {
      await t.http().get('/clients').set('Authorization', 'Bearer invalide').expect(401);
    });

    it('accepte le jeton obtenu à la connexion', async () => {
      await t.http().get('/clients').set(t.auth).expect(200);
      await t.http().get('/reservations').set(t.auth).expect(200);
      await t.http().get('/supplements').set(t.auth).expect(200);
      await t.http().patch('/commentaires/1').set(t.auth).send({ verif: true }).expect(200);
      await t.http().delete('/reservations/1').set(t.auth).expect(200);
    });
  });

  describe('création de commentaire', () => {
    const body = { name: 'Jean', commentaire: 'Super', note: 5, verif: true, created: '2020-01-01T00:00:00.000Z' };

    beforeEach(() => t.prisma.commentaire.create.mockClear());

    it("un visiteur ne peut ni valider ni antidater son commentaire", async () => {
      await t.http().post('/commentaires').send(body).expect(201);
      expect(t.prisma.commentaire.create).toHaveBeenCalledWith({
        data: { name: 'Jean', commentaire: 'Super', note: 5 },
      });
    });

    it("l'admin peut créer un commentaire validé et daté", async () => {
      await t.http().post('/commentaires').set(t.auth).send(body).expect(201);
      expect(t.prisma.commentaire.create).toHaveBeenCalledWith({
        data: { name: 'Jean', commentaire: 'Super', note: 5, verif: true, created: new Date(body.created) },
      });
    });
  });

  describe("création d'utilisateur", () => {
    const body = { email: 'nouveau@example.com', password: 'motdepasse-solide' };

    it('exige un jeton, même quand aucun compte n’existe', async () => {
      t.prisma.user.count.mockResolvedValueOnce(0);
      await t.http().post('/users').send(body).expect(401);
    });

    it("est possible pour l'admin connecté", async () => {
      await t.http().post('/users').set(t.auth).send(body).expect(201);
    });
  });

  describe('limite de débit', () => {
    it('bloque les essais de connexion répétés (429 au 6e essai en une minute)', async () => {
      for (let i = 0; i < 5; i++) {
        await t.http().post('/auth/login').send({ email: ADMIN.email, password: 'faux' }).expect(401);
      }
      await t.http().post('/auth/login').send({ email: ADMIN.email, password: ADMIN.password }).expect(429);
    });

    it('bloque les demandes de réservation en rafale (429 à la 6e)', async () => {
      for (let i = 0; i < 5; i++) {
        await t.http().post('/reservations/request').send(REQUEST).expect(201);
      }
      await t.http().post('/reservations/request').send(REQUEST).expect(429);
    });
  });
});
