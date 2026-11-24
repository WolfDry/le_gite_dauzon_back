import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ADMIN, createTestApp, TestApp } from './testing/test-app';

/**
 * Règles métier et de sécurité de l'API : données exposées au public,
 * mots de passe, validation des entrées et traduction des erreurs Prisma.
 */

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError(`Erreur ${code}`, { code, clientVersion: 'test', meta });

const REQUEST = {
  debut: '2026-07-04',
  fin: '2026-07-11',
  adultes: 2,
  enfants: 1,
  nom: 'Marie Dupont',
  email: 'a@b.fr',
  phone: '06 12 34 56 78',
};

describe("Règles de l'API", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(() => {
    t.resetThrottle();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('disponibilités publiques', () => {
    it('ne renvoie que les dates des options et séjours confirmés depuis le 1er janvier', async () => {
      t.prisma.reservation.findMany.mockResolvedValueOnce([
        { debut: new Date('2026-07-04'), fin: new Date('2026-07-11') },
      ]);

      const res = await t.http().get('/reservations/disponibilites').expect(200);

      expect(res.body).toEqual([{ debut: '2026-07-04T00:00:00.000Z', fin: '2026-07-11T00:00:00.000Z' }]);
      const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
      expect(t.prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { statut: { in: ['OPTION', 'CONFIRMEE'] }, fin: { gte: startOfYear } },
        select: { debut: true, fin: true },
        orderBy: { debut: 'asc' },
      });
    });
  });

  describe('demande de réservation du site', () => {
    it('enregistre les coordonnées, toujours au statut DEMANDE, sans champ inconnu', async () => {
      const res = await t
        .http()
        .post('/reservations/request')
        .send({ ...REQUEST, nom: '  Marie Dupont ', message: 'Arrivée tardive', statut: 'CONFIRMEE', tarif: 0, clientId: 3 })
        .expect(201);

      expect(res.body).toEqual({ id: 1 });
      expect(t.prisma.reservation.create).toHaveBeenCalledWith({
        data: {
          debut: new Date('2026-07-04'),
          fin: new Date('2026-07-11'),
          adultes: 2,
          enfants: 1,
          animaux: 0,
          taxeSejour: 1.65,
          statut: 'DEMANDE',
          source: 'SITE',
          demandeurNom: 'Marie Dupont',
          demandeurEmail: 'a@b.fr',
          demandeurTelephone: '06 12 34 56 78',
          message: 'Arrivée tardive',
        },
      });
      expect(t.mail.sendMail).toHaveBeenCalledWith(
        'reservation',
        expect.objectContaining({ name: 'Marie Dupont', email: 'a@b.fr', message: 'Arrivée tardive', adultes: 2, enfants: 1 }),
      );
    });

    it("attend l'envoi du mail et garde la demande si le mail échoue", async () => {
      t.mail.sendMail.mockRejectedValueOnce(new Error('Mailgun indisponible'));
      await t.http().post('/reservations/request').send(REQUEST).expect(201);
      expect(t.prisma.reservation.create).toHaveBeenCalledTimes(1);
    });

    it('enregistre un message vide comme absent', async () => {
      await t.http().post('/reservations/request').send({ ...REQUEST, message: '   ' }).expect(201);
      expect(t.prisma.reservation.create.mock.calls[0][0].data.message).toBeNull();
    });

    it('ajoute le supplément facturé par animal avec le nombre d’animaux indiqué', async () => {
      t.prisma.supplement.findFirst.mockResolvedValueOnce({ id: 5, tarif: 8.5 });
      await t.http().post('/reservations/request').send({ ...REQUEST, animaux: 2 }).expect(201);

      expect(t.prisma.supplement.findFirst).toHaveBeenCalledWith({ where: { parAnimal: true }, select: { id: true, tarif: true } });
      const data = t.prisma.reservation.create.mock.calls[0][0].data;
      expect(data.animaux).toBe(2);
      expect(data.supplements).toEqual({ create: [{ supplement: { connect: { id: 5 } }, nb: 2, tarif: 8.5 }] });
    });

    it('enregistre la demande sans supplément si aucun supplément n’est facturé par animal', async () => {
      await t.http().post('/reservations/request').send({ ...REQUEST, animaux: 1 }).expect(201);
      const data = t.prisma.reservation.create.mock.calls[0][0].data;
      expect(data.animaux).toBe(1);
      expect(data.supplements).toBeUndefined();
    });

    it('ne cherche pas de supplément sans animal', async () => {
      await t.http().post('/reservations/request').send(REQUEST).expect(201);
      expect(t.prisma.supplement.findFirst).not.toHaveBeenCalled();
    });

    it.each([
      ['un départ avant l’arrivée', { fin: '2026-07-01' }],
      ['un départ le jour de l’arrivée', { fin: '2026-07-04' }],
      ['une date invalide', { debut: 'pas une date' }],
      ['un e-mail invalide', { email: 'pas-un-email' }],
      ['un téléphone vide', { phone: '' }],
      ['un nom absent', { nom: undefined }],
      ['un nom fait d’espaces', { nom: '   ' }],
      ['un message trop long', { message: 'x'.repeat(2001) }],
      ['aucun adulte', { adultes: 0, enfants: 2 }],
      ['un nombre d’adultes absent', { adultes: undefined }],
      ['un nombre d’enfants négatif', { enfants: -1 }],
      ['un nombre d’animaux décimal', { animaux: 1.5 }],
      ['un nombre de voyageurs excessif', { adultes: 51 }],
      ['l’ancien format nbPersonne', { adultes: undefined, nbPersonne: [{ label: 'Adultes', nb: 2 }] }],
    ])('refuse %s (400)', async (_label, override) => {
      await t
        .http()
        .post('/reservations/request')
        .send({ ...REQUEST, ...override })
        .expect(400);
      expect(t.prisma.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('statut des réservations (admin)', () => {
    const DEMANDE = { statut: 'DEMANDE', clientId: null, tarif: null };
    const NEW_CLIENT = { nom: 'Dupont', prenom: 'Marie', email: 'a@b.fr', telephone: '06 12 34 56 78' };

    it("une réservation saisie dans l'admin est confirmée par défaut", async () => {
      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({ tarif: 500, debut: '2026-08-01', fin: '2026-08-08', clientId: 1 })
        .expect(201);
      expect(t.prisma.reservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ statut: 'CONFIRMEE', source: 'ADMIN' }),
      });
    });

    it.each(['OPTION', 'CONFIRMEE'])('refuse de passer en %s une demande sans client ni tarif (400)', async (statut) => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(DEMANDE);
      await t.http().patch('/reservations/1').set(t.auth).send({ statut }).expect(400);
      expect(t.prisma.reservation.update).not.toHaveBeenCalled();
    });

    it('confirme une demande en créant la fiche client', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(DEMANDE);
      await t
        .http()
        .patch('/reservations/1')
        .set(t.auth)
        .send({ statut: 'CONFIRMEE', tarif: 650, newClient: NEW_CLIENT })
        .expect(200);
      expect(t.prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          statut: 'CONFIRMEE',
          statutModifieLe: expect.any(Date),
          tarif: 650,
          client: { create: NEW_CLIENT },
        }),
      });
    });

    it('confirme une demande en la rattachant à un client existant', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(DEMANDE);
      await t
        .http()
        .patch('/reservations/1')
        .set(t.auth)
        .send({ statut: 'OPTION', tarif: 650, clientId: 4, newClient: NEW_CLIENT })
        .expect(200);
      expect(t.prisma.reservation.update.mock.calls[0][0].data.client).toEqual({ connect: { id: 4 } });
    });

    it('refuse une demande sans exiger de client', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(DEMANDE);
      await t.http().patch('/reservations/1').set(t.auth).send({ statut: 'REFUSEE' }).expect(200);
      expect(t.prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ statut: 'REFUSEE', statutModifieLe: expect.any(Date) }),
      });
    });

    it('ne change pas la date de statut si le statut ne change pas', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce({ statut: 'CONFIRMEE', clientId: 2, tarif: 500 });
      await t.http().patch('/reservations/1').set(t.auth).send({ statut: 'CONFIRMEE', tarif: 600 }).expect(200);
      const { data } = t.prisma.reservation.update.mock.calls[0][0];
      expect(data.statut).toBeUndefined();
      expect(data.statutModifieLe).toBeUndefined();
    });

    it('détache le client quand clientId vaut null', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce({ statut: 'DEMANDE', clientId: 2, tarif: null });
      await t.http().patch('/reservations/1').set(t.auth).send({ clientId: null }).expect(200);
      expect(t.prisma.reservation.update.mock.calls[0][0].data.client).toEqual({ disconnect: true });
    });

    it("refuse de détacher le client d'une réservation confirmée", async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce({ statut: 'CONFIRMEE', clientId: 2, tarif: 500 });
      await t.http().patch('/reservations/1').set(t.auth).send({ clientId: null }).expect(400);
    });

    it("ignore les coordonnées client d'une réservation sans client (pas d'erreur 500)", async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(DEMANDE);
      await t.http().patch('/reservations/1').set(t.auth).send({ client: { nom: 'Dupont' } }).expect(200);
      expect(t.prisma.reservation.update.mock.calls[0][0].data.client).toBeUndefined();
    });

    it('refuse un statut inconnu', async () => {
      await t.http().patch('/reservations/1').set(t.auth).send({ statut: 'PAYEE' }).expect(400);
    });
  });

  describe('liste des réservations (admin)', () => {
    const lastFindManyArgs = () => t.prisma.reservation.findMany.mock.calls[0][0];

    it('filtre par période, bornes incluses, et trie par arrivée', async () => {
      await t.http().get('/reservations?depuis=2026-01-01&jusqua=2026-12-31').set(t.auth).expect(200);
      expect(lastFindManyArgs().where).toEqual({
        fin: { gte: new Date('2026-01-01') },
        debut: { lte: new Date('2026-12-31') },
      });
      expect(lastFindManyArgs().orderBy).toEqual([{ debut: 'asc' }, { id: 'asc' }]);
    });

    it('renvoie la vue liste par défaut, sans le message ni le téléphone du client', async () => {
      await t.http().get('/reservations').set(t.auth).expect(200);
      const { where, select } = lastFindManyArgs();
      expect(where).toEqual({});
      expect(select.supplements).toBeDefined();
      expect(select.message).toBeUndefined();
      expect(select.client).toEqual({ select: { id: true, nom: true, prenom: true, email: true } });
    });

    it("la vue aperçu ne renvoie que l'id, les dates, le statut et le nom", async () => {
      await t.http().get('/reservations?vue=apercu&statut=DEMANDE').set(t.auth).expect(200);
      const { where, select } = lastFindManyArgs();
      expect(where).toEqual({ statut: { in: ['DEMANDE'] } });
      expect(Object.keys(select).sort()).toEqual(['client', 'clientId', 'debut', 'demandeurNom', 'fin', 'id', 'statut']);
    });

    it('accepte plusieurs statuts, séparés par des virgules ou répétés', async () => {
      await t.http().get('/reservations?statut=OPTION,CONFIRMEE').set(t.auth).expect(200);
      await t.http().get('/reservations?statut=OPTION&statut=CONFIRMEE').set(t.auth).expect(200);
      for (const [args] of t.prisma.reservation.findMany.mock.calls) {
        expect(args.where).toEqual({ statut: { in: ['OPTION', 'CONFIRMEE'] } });
      }
    });

    it.each([
      ['une date invalide', 'depuis=demain'],
      ['un statut inconnu', 'statut=PAYEE'],
      ['une vue inconnue', 'vue=complete'],
    ])('refuse %s', async (_, query) => {
      await t.http().get(`/reservations?${query}`).set(t.auth).expect(400);
      expect(t.prisma.reservation.findMany).not.toHaveBeenCalled();
    });

    it('est réservée aux administrateurs', async () => {
      await t.http().get('/reservations').expect(401);
    });
  });

  describe('liste des clients (admin)', () => {
    it('ajoute le nombre de réservations de chaque client', async () => {
      t.prisma.client.findMany.mockResolvedValueOnce([
        { id: 1, nom: 'Dupont', prenom: 'Marie', email: 'a@b.fr', telephone: '06', _count: { reservations: 3 } },
      ]);
      const res = await t.http().get('/clients').set(t.auth).expect(200);
      expect(res.body).toEqual([
        { id: 1, nom: 'Dupont', prenom: 'Marie', email: 'a@b.fr', telephone: '06', nbReservations: 3 },
      ]);
    });
  });

  describe('purge automatique des demandes', () => {
    const SECRET = 'cron-secret-de-test';

    afterEach(() => {
      delete process.env.CRON_SECRET;
    });

    it('refuse un appel sans le secret, ou si le secret n’est pas configuré', async () => {
      await t.http().get('/cron/purge-demandes').expect(401);
      process.env.CRON_SECRET = SECRET;
      await t.http().get('/cron/purge-demandes').expect(401);
      await t.http().get('/cron/purge-demandes').set('Authorization', 'Bearer faux').expect(401);
      await t.http().get('/cron/purge-demandes').set(t.auth).expect(401);
      expect(t.prisma.reservation.deleteMany).not.toHaveBeenCalled();
    });

    it('supprime les demandes refusées et les demandes jamais traitées depuis 90 jours', async () => {
      process.env.CRON_SECRET = SECRET;
      t.prisma.reservation.deleteMany.mockResolvedValueOnce({ count: 3 });
      const before = Date.now();

      const res = await t.http().get('/cron/purge-demandes').set('Authorization', `Bearer ${SECRET}`).expect(200);

      expect(res.body).toEqual({ supprimees: 3 });
      const { where } = t.prisma.reservation.deleteMany.mock.calls[0][0];
      const limite: Date = where.OR[0].statutModifieLe.lt;
      expect(where).toEqual({
        OR: [
          { statut: 'REFUSEE', statutModifieLe: { lt: limite } },
          { statut: 'DEMANDE', fin: { lt: limite } },
        ],
      });
      const days = (before - limite.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(89.99);
      expect(days).toBeLessThan(90.01);
    });
  });

  describe('commentaires', () => {
    it("enregistre le commentaire même si le mail de notification échoue", async () => {
      t.mail.sendMail.mockRejectedValueOnce(new Error('Mailgun indisponible'));
      await t.http().post('/commentaires').send({ name: 'Jean', commentaire: 'Super', note: 5 }).expect(201);
    });

    it('transmet le commentaire au mail de notification', async () => {
      await t.http().post('/commentaires').send({ name: 'Jean', commentaire: 'Super', note: 5 }).expect(201);
      expect(t.mail.sendMail).toHaveBeenCalledWith('commentaire', { name: 'Jean', note: 5, message: 'Super' });
    });

    it('le public ne voit que les commentaires validés', async () => {
      await t.http().get('/commentaires').expect(200);
      expect(t.prisma.commentaire.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { verif: true } }),
      );
    });

    it("l'admin voit aussi les commentaires en attente", async () => {
      await t.http().get('/commentaires').set(t.auth).expect(200);
      expect(t.prisma.commentaire.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });

    it('refuse une note hors de 1 à 5 pour un visiteur', async () => {
      const body = { name: 'Jean', commentaire: 'Super' };
      await t.http().post('/commentaires').send({ ...body, note: 9999 }).expect(400);
      await t.http().post('/commentaires').send({ ...body, note: 'cinq' }).expect(400);
      await t.http().post('/commentaires').send({ ...body, note: 0 }).expect(400);
      expect(t.prisma.commentaire.create).not.toHaveBeenCalled();
    });

    it("accepte un commentaire sans note (0) venant de l'admin", async () => {
      await t.http().post('/commentaires').set(t.auth).send({ name: 'Jean', commentaire: 'Super', note: 0 }).expect(201);
    });
  });

  describe('utilisateurs', () => {
    const OMIT_PASSWORD = { password: true };

    it('hache le mot de passe à la modification', async () => {
      await t.http().patch('/users/2').set(t.auth).send({ password: 'nouveau-mot-de-passe' }).expect(200);

      const { data } = t.prisma.user.update.mock.calls[0][0];
      expect(data.password).not.toBe('nouveau-mot-de-passe');
      expect(bcrypt.compareSync(`test-salt${'nouveau-mot-de-passe'}`, data.password)).toBe(true);
    });

    it('hache le mot de passe à la création', async () => {
      await t.http().post('/users').set(t.auth).send({ email: 'b@example.com', password: 'motdepasse-solide' }).expect(201);

      const { data } = t.prisma.user.create.mock.calls[0][0];
      expect(bcrypt.compareSync(`test-salt${'motdepasse-solide'}`, data.password)).toBe(true);
    });

    it('ne renvoie jamais le hash du mot de passe', async () => {
      await t.http().get('/users').set(t.auth).expect(200);
      await t.http().get('/users/2').set(t.auth).expect(200);
      await t.http().post('/users').set(t.auth).send({ email: 'b@example.com', password: 'motdepasse-solide' }).expect(201);
      await t.http().patch('/users/2').set(t.auth).send({ email: 'c@example.com' }).expect(200);
      t.prisma.user.count.mockResolvedValueOnce(2);
      await t.http().delete('/users/2').set(t.auth).expect(200);

      for (const method of ['findMany', 'findUniqueOrThrow', 'create', 'update', 'delete'] as const) {
        expect(t.prisma.user[method]).toHaveBeenCalledWith(expect.objectContaining({ omit: OMIT_PASSWORD }));
      }
    });

    it('refuse un mot de passe trop court', async () => {
      await t.http().patch('/users/2').set(t.auth).send({ password: 'court' }).expect(400);
      expect(t.prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuse de supprimer son propre compte', async () => {
      await t.http().delete(`/users/${ADMIN.id}`).set(t.auth).expect(409);
      expect(t.prisma.user.delete).not.toHaveBeenCalled();
    });

    it('refuse de supprimer le dernier compte', async () => {
      t.prisma.user.count.mockResolvedValueOnce(1);
      await t.http().delete('/users/2').set(t.auth).expect(409);
      expect(t.prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('validation des entrées', () => {
    it("refuse un identifiant non numérique (400 et non 500)", async () => {
      await t.http().get('/clients/abc').set(t.auth).expect(400);
    });

    it('refuse une connexion sans corps (400 et non 500)', async () => {
      await t.http().post('/auth/login').expect(400);
    });

    it("refuse un sujet de mail inconnu", async () => {
      await t
        .http()
        .post('/mailgun')
        .send({ subject: 'reservation', content: { name: 'Jean', email: 'jean@example.com', message: 'Bonjour' } })
        .expect(400);
      expect(t.mail.sendMail).not.toHaveBeenCalled();
    });

    it('accepte la valeur 0 (prix, tarif de séjour)', async () => {
      await t
        .http()
        .post('/tarifs')
        .set(t.auth)
        .send({ desc: ' ', label: 'Offert', date: [], prix: 0, frequence: ['SEMAINE'] })
        .expect(201);
      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({ tarif: 0, debut: '2026-08-01', fin: '2026-08-08', clientId: 1, statut: 'CONFIRMEE' })
        .expect(201);
    });

    it("exige les coordonnées d'un nouveau client à la création d'une réservation", async () => {
      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({ tarif: 500, debut: '2026-08-01', fin: '2026-08-08', clientId: null, email: '' })
        .expect(400);
    });

    it("refuse une image d'événement hors du dossier Cloudinary prévu", async () => {
      await t.http().patch('/evenements/1').set(t.auth).send({ image: 'ailleurs/photo' }).expect(400);
    });
  });

  describe("compatibilité avec les formulaires de l'admin", () => {
    it('accepte une réservation avec un client existant (champs du nouveau client vides)', async () => {
      const body = {
        debut: '2026-08-01T00:00:00.000Z',
        fin: '2026-08-08T00:00:00.000Z',
        tarif: 650,
        statut: 'CONFIRMEE',
        adultes: 2,
        enfants: 1,
        clientId: 3,
        email: '',
        nom: '',
        prenom: '',
        telephone: '',
        supplements: [{ supplementId: 1, nb: 1 }],
      };
      // Une fois pour la création, une fois pour la modification.
      t.prisma.supplement.findMany.mockResolvedValueOnce([{ id: 1, tarif: 40 }]).mockResolvedValueOnce([{ id: 1, tarif: 40 }]);
      await t.http().post('/reservations').set(t.auth).send(body).expect(201);
      await t.http().patch('/reservations/1').set(t.auth).send(body).expect(200);

      expect(t.prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          debut: new Date(body.debut),
          fin: new Date(body.fin),
          tarif: 650,
          adultes: 2,
          enfants: 1,
          animaux: undefined,
          supplements: {
            deleteMany: {},
            create: [{ supplement: { connect: { id: 1 } }, nb: 1, tarif: 40 }],
          },
        }),
      });
    });

    it('enregistre la réservation et ses suppléments en une seule écriture (tout ou rien)', async () => {
      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({
          debut: '2026-08-01T00:00:00.000Z',
          fin: '2026-08-08T00:00:00.000Z',
          tarif: 650,
          statut: 'CONFIRMEE',
          adultes: 2,
          clientId: 3,
          supplements: [{ supplementId: 1, nb: 2, tarif: 25 }],
        })
        .expect(201);

      expect(t.prisma.reservation.create).toHaveBeenCalledTimes(1);
      expect(t.prisma.reservation.create.mock.calls[0][0].data.supplements).toEqual({
        create: [{ supplement: { connect: { id: 1 } }, nb: 2, tarif: 25 }],
      });
      expect(t.prisma.supplementOnReservation.create).not.toHaveBeenCalled();
    });

    it('ne touche pas aux suppléments quand la modification ne les envoie pas', async () => {
      await t.http().patch('/reservations/1').set(t.auth).send({ tarif: 700 }).expect(200);

      expect(t.prisma.reservation.update.mock.calls[0][0].data.supplements).toBeUndefined();
      expect(t.prisma.supplementOnReservation.deleteMany).not.toHaveBeenCalled();
    });

    it('enregistre le prix du supplément choisi pour la réservation, sans relire le catalogue', async () => {
      await t
        .http()
        .patch('/reservations/1')
        .set(t.auth)
        .send({ supplements: [{ supplementId: 1, nb: 2, tarif: 25 }] })
        .expect(200);

      expect(t.prisma.supplement.findMany).not.toHaveBeenCalled();
      // Anciens suppléments retirés et nouveaux ajoutés dans la même requête que la réservation.
      expect(t.prisma.reservation.update.mock.calls[0][0].data.supplements).toEqual({
        deleteMany: {},
        create: [{ supplement: { connect: { id: 1 } }, nb: 2, tarif: 25 }],
      });
      expect(t.prisma.supplementOnReservation.deleteMany).not.toHaveBeenCalled();
      expect(t.prisma.supplementOnReservation.create).not.toHaveBeenCalled();
    });

    it('refuse un supplément inconnu sans modifier la réservation', async () => {
      t.prisma.supplement.findMany.mockResolvedValueOnce([]);
      await t
        .http()
        .patch('/reservations/1')
        .set(t.auth)
        .send({ supplements: [{ supplementId: 99, nb: 1 }] })
        .expect(400);

      expect(t.prisma.reservation.update).not.toHaveBeenCalled();
      expect(t.prisma.supplementOnReservation.deleteMany).not.toHaveBeenCalled();
    });

    it('refuse un prix de supplément négatif ou plus précis que le centime', async () => {
      for (const tarif of [-1, 12.345]) {
        await t
          .http()
          .patch('/reservations/1')
          .set(t.auth)
          .send({ supplements: [{ supplementId: 1, nb: 1, tarif }] })
          .expect(400);
      }
    });

    it('accepte les montants en euros avec centimes (tarif, supplément, prix)', async () => {
      await t
        .http()
        .patch('/reservations/1')
        .set(t.auth)
        .send({ tarif: 650.5, supplements: [{ supplementId: 1, nb: 1, tarif: 12.5 }] })
        .expect(200);
      expect(t.prisma.reservation.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          tarif: 650.5,
          supplements: { deleteMany: {}, create: [{ supplement: { connect: { id: 1 } }, nb: 1, tarif: 12.5 }] },
        }),
      );

      await t.http().patch('/supplements/1').set(t.auth).send({ tarif: 9.99 }).expect(200);
      await t.http().patch('/tarifs/1').set(t.auth).send({ prix: 700.25 }).expect(200);
      expect(t.prisma.supplement.update.mock.calls[0][0].data).toEqual({ tarif: 9.99 });
      expect(t.prisma.tarif.update.mock.calls[0][0].data).toEqual({ prix: 700.25 });
    });

    it('un seul supplément est facturé par animal : en marquer un retire la marque des autres', async () => {
      await t.http().patch('/supplements/3').set(t.auth).send({ parAnimal: true }).expect(200);
      expect(t.prisma.supplement.updateMany).toHaveBeenCalledWith({
        where: { parAnimal: true, id: { not: 3 } },
        data: { parAnimal: false },
      });
      expect(t.prisma.supplement.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { parAnimal: true } });

      await t
        .http()
        .post('/supplements')
        .set(t.auth)
        .send({ label: 'Animal', tarif: 8, type: 'HEBDOMADAIRE', parAnimal: true })
        .expect(201);
      expect(t.prisma.supplement.updateMany).toHaveBeenLastCalledWith({ where: { parAnimal: true }, data: { parAnimal: false } });
      expect(t.prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('ne touche pas aux autres suppléments sans marque « par animal »', async () => {
      await t.http().patch('/supplements/3').set(t.auth).send({ tarif: 10, parAnimal: false }).expect(200);
      expect(t.prisma.supplement.updateMany).not.toHaveBeenCalled();
    });

    it('accepte un événement sans date, lieu ni lien (null)', async () => {
      await t
        .http()
        .patch('/evenements/1')
        .set(t.auth)
        .send({ type: 'RANDO', titre: 'Balade', description: 'Texte', image: 'evenements/abc', lien: null, localisation: null, date: null })
        .expect(200);
      expect(t.prisma.evenement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { type: 'RANDO', titre: 'Balade', description: 'Texte', image: 'evenements/abc', lien: null, localisation: null, date: null },
      });
    });

    it('accepte un commentaire modifié par le formulaire complet', async () => {
      await t
        .http()
        .patch('/commentaires/1')
        .set(t.auth)
        .send({ name: 'Jean', created: '2026-05-01T00:00:00.000Z', commentaire: 'Super', note: 4, verif: true })
        .expect(200);
    });

    it('accepte un client modifié', async () => {
      await t
        .http()
        .patch('/clients/1')
        .set(t.auth)
        .send({ nom: 'Dupont', prenom: 'Marie', email: 'marie@example.com', telephone: '+32 470 12 34 56' })
        .expect(200);
    });
  });

  describe('dates modifiées séparément (admin)', () => {
    const STORED = { statut: 'DEMANDE', clientId: null, tarif: null, debut: new Date('2026-07-04'), fin: new Date('2026-07-11') };

    it.each([
      ['un départ seul avant l’arrivée enregistrée', { fin: '2026-07-01' }],
      ['une arrivée seule après le départ enregistré', { debut: '2026-07-12' }],
      ['une arrivée seule le jour du départ enregistré', { debut: '2026-07-11' }],
    ])('refuse %s (400)', async (_label, body) => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(STORED);
      await t.http().patch('/reservations/1').set(t.auth).send(body).expect(400);
      expect(t.prisma.reservation.update).not.toHaveBeenCalled();
    });

    it('accepte un départ seul après l’arrivée enregistrée', async () => {
      t.prisma.reservation.findUniqueOrThrow.mockResolvedValueOnce(STORED);
      await t.http().patch('/reservations/1').set(t.auth).send({ fin: '2026-07-18' }).expect(200);
    });
  });

  describe('protection anti-robot des formulaires publics', () => {
    const CONTACT = { subject: 'autre', content: { name: 'Jean', email: 'jean@example.com', message: 'Bonjour' } };
    const COMMENT = { name: 'Jean', commentaire: 'Super', note: 5 };
    let fetchMock: jest.SpyInstance;

    const cloudflare = (body: object) =>
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('fetch non simulé'));
    });

    afterEach(() => {
      fetchMock.mockRestore();
      delete process.env.TURNSTILE_SECRET_KEY;
    });

    describe('champ piège', () => {
      it('répond comme un succès sans rien enregistrer ni envoyer', async () => {
        const res = await t.http().post('/reservations/request').send({ ...REQUEST, website: 'https://spam.example' }).expect(201);
        expect(res.body).toEqual({ id: 0 });
        await t.http().post('/commentaires').send({ ...COMMENT, website: 'spam' }).expect(201);
        await t.http().post('/mailgun').send({ ...CONTACT, website: 'spam' }).expect(201);

        expect(t.prisma.reservation.create).not.toHaveBeenCalled();
        expect(t.prisma.commentaire.create).not.toHaveBeenCalled();
        expect(t.mail.sendMail).not.toHaveBeenCalled();
      });

      it("accepte le champ vide et ne l'enregistre pas", async () => {
        await t.http().post('/commentaires').send({ ...COMMENT, website: '', turnstileToken: 'x' }).expect(201);
        expect(t.prisma.commentaire.create).toHaveBeenCalledWith({ data: { name: 'Jean', commentaire: 'Super', note: 5 } });
      });
    });

    describe('Cloudflare Turnstile', () => {
      it("n'appelle pas Cloudflare sans TURNSTILE_SECRET_KEY", async () => {
        await t.http().post('/mailgun').send(CONTACT).expect(201);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('refuse une requête sans jeton (403)', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret-turnstile';
        await t.http().post('/reservations/request').send(REQUEST).expect(403);
        expect(t.prisma.reservation.create).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('refuse un jeton rejeté par Cloudflare (403)', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret-turnstile';
        cloudflare({ success: false, 'error-codes': ['invalid-input-response'] });
        await t.http().post('/mailgun').send({ ...CONTACT, turnstileToken: 'faux' }).expect(403);
        expect(t.mail.sendMail).not.toHaveBeenCalled();
      });

      it('accepte un jeton valide, vérifié avec la clé secrète', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret-turnstile';
        cloudflare({ success: true });
        await t.http().post('/reservations/request').send({ ...REQUEST, turnstileToken: 'bon-jeton' }).expect(201);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        expect(JSON.parse(init.body)).toMatchObject({ secret: 'secret-turnstile', response: 'bon-jeton' });
        expect(t.prisma.reservation.create.mock.calls[0][0].data).not.toHaveProperty('turnstileToken');
      });

      it('laisse passer la demande si Cloudflare ne répond pas', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret-turnstile';
        await t.http().post('/reservations/request').send({ ...REQUEST, turnstileToken: 'jeton' }).expect(201);
        expect(t.prisma.reservation.create).toHaveBeenCalledTimes(1);
      });

      it("ne contrôle pas l'admin connecté", async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret-turnstile';
        await t.http().post('/commentaires').set(t.auth).send({ ...COMMENT, website: 'rempli par erreur' }).expect(201);
        expect(t.prisma.commentaire.create).toHaveBeenCalledTimes(1);
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('erreurs de base de données', () => {
    it('répond 404 pour un élément introuvable', async () => {
      t.prisma.client.findUniqueOrThrow.mockRejectedValueOnce(prismaError('P2025'));
      await t.http().get('/clients/42').set(t.auth).expect(404);

      t.prisma.tarif.update.mockRejectedValueOnce(prismaError('P2025'));
      await t.http().patch('/tarifs/42').set(t.auth).send({ prix: 10 }).expect(404);

      t.prisma.reservation.delete.mockRejectedValueOnce(prismaError('P2025'));
      await t.http().delete('/reservations/42').set(t.auth).expect(404);
    });

    it('répond 409 pour un libellé déjà utilisé', async () => {
      t.prisma.tarif.create.mockRejectedValueOnce(prismaError('P2002', { target: ['label'] }));
      const res = await t
        .http()
        .post('/tarifs')
        .set(t.auth)
        .send({ desc: '', label: 'Haute saison', date: [], prix: 700, frequence: ['SEMAINE'] })
        .expect(409);
      expect(res.body.message).toContain('label');
    });

    it('répond 409 pour un supplément encore utilisé par une réservation', async () => {
      t.prisma.supplement.delete.mockRejectedValueOnce(prismaError('P2003'));
      await t.http().delete('/supplements/1').set(t.auth).expect(409);
    });

    it('répond 500 sans détail pour une autre erreur Prisma', async () => {
      t.prisma.client.findMany.mockRejectedValueOnce(prismaError('P1001'));
      const res = await t.http().get('/clients').set(t.auth).expect(500);
      expect(res.body.message).toBe('Erreur de base de données');
    });
  });
});
