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
  nbPersonne: [
    { label: 'Adultes', nb: 2 },
    { label: 'Enfants', nb: 0 },
  ],
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
    it('ne renvoie que les dates des séjours confirmés depuis le 1er janvier', async () => {
      t.prisma.reservation.findMany.mockResolvedValueOnce([
        { debut: new Date('2026-07-04'), fin: new Date('2026-07-11') },
      ]);

      const res = await t.http().get('/reservations/disponibilites').expect(200);

      expect(res.body).toEqual([{ debut: '2026-07-04T00:00:00.000Z', fin: '2026-07-11T00:00:00.000Z' }]);
      const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
      expect(t.prisma.reservation.findMany).toHaveBeenCalledWith({
        where: { verif: true, fin: { gte: startOfYear } },
        select: { debut: true, fin: true },
        orderBy: { debut: 'asc' },
      });
    });
  });

  describe('demande de réservation du site', () => {
    it('est toujours enregistrée non confirmée, sans champ inconnu', async () => {
      await t
        .http()
        .post('/reservations/request')
        .send({ ...REQUEST, verif: true, tarif: 0, clientId: 3 })
        .expect(201);

      expect(t.prisma.reservation.create).toHaveBeenCalledWith({
        data: {
          debut: new Date('2026-07-04'),
          fin: new Date('2026-07-11'),
          nbPersonne: REQUEST.nbPersonne,
          verif: false,
        },
      });
      expect(t.mail.sendMail).toHaveBeenCalledWith('reservation', expect.objectContaining({ email: 'a@b.fr' }));
    });

    it.each([
      ['un départ avant l’arrivée', { fin: '2026-07-01' }],
      ['un départ le jour de l’arrivée', { fin: '2026-07-04' }],
      ['une date invalide', { debut: 'pas une date' }],
      ['un e-mail invalide', { email: 'pas-un-email' }],
      ['un téléphone vide', { phone: '' }],
      ['zéro personne', { nbPersonne: [{ label: 'Adultes', nb: 0 }] }],
      ['un nombre de personnes négatif', { nbPersonne: [{ label: 'Adultes', nb: -1 }] }],
    ])('refuse %s (400)', async (_label, override) => {
      await t
        .http()
        .post('/reservations/request')
        .send({ ...REQUEST, ...override })
        .expect(400);
      expect(t.prisma.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('commentaires', () => {
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
        .send({ tarif: 0, debut: '2026-08-01', fin: '2026-08-08', nbPersonne: [], clientId: 1, verif: true })
        .expect(201);
    });

    it("exige les coordonnées d'un nouveau client à la création d'une réservation", async () => {
      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({ tarif: 500, debut: '2026-08-01', fin: '2026-08-08', nbPersonne: [], clientId: null, email: '' })
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
        verif: true,
        nbPersonne: [{ label: 'Adultes', nb: 2 }],
        clientId: 3,
        email: '',
        nom: '',
        prenom: '',
        telephone: '',
        supplements: [{ supplementId: 1, nb: 1 }],
      };
      await t.http().post('/reservations').set(t.auth).send(body).expect(201);
      await t.http().patch('/reservations/1').set(t.auth).send({ ...body, clientId: null }).expect(200);

      expect(t.prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          debut: new Date(body.debut),
          fin: new Date(body.fin),
          tarif: 650,
          nbPersonne: [{ label: 'Adultes', nb: 2 }],
        }),
      });
      expect(t.prisma.supplementOnReservation.create).toHaveBeenCalledWith({
        data: { reservationId: 1, supplementId: 1, nb: 1 },
      });
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
