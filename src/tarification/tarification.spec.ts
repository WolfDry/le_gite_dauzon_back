import { SupplementType } from '@prisma/client';
import { createTestApp, TestApp } from '../testing/test-app';
import { dureeSejour, estUnWeekEnd, libellePeriode, totalReservation } from './calcul';

/**
 * Règle de prix (B-F4) : calcul, devis, réglages, périodes datées des tarifs
 * et totaux des réservations. La base de données est simulée.
 */

const d = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

const ligne = (type: SupplementType, tarif: number, nb: number) => ({ nb, tarif, supplement: { type } });

const reservation = (overrides: Partial<Parameters<typeof totalReservation>[0]> = {}) => ({
  tarif: 500,
  debut: d('2026-07-04'),
  fin: d('2026-07-11'),
  adultes: 2,
  taxeSejour: 1.65,
  supplements: [],
  ...overrides,
});

describe('règle de prix', () => {
  it('compte les nuits, les semaines facturées et celles des suppléments hebdomadaires', () => {
    expect(dureeSejour(d('2026-07-04'), d('2026-07-16'))).toEqual({ nuits: 12, semainesFacturees: 1, semainesSupplements: 2 });
    expect(dureeSejour(d('2026-07-04'), d('2026-07-07'))).toEqual({ nuits: 3, semainesFacturees: 1, semainesSupplements: 0 });
  });

  it("n'est pas décalée par le changement d'heure", () => {
    expect(dureeSejour(d('2026-03-28'), d('2026-03-30')).nuits).toBe(2);
  });

  it('une semaine : tarif + taxe de séjour des adultes', () => {
    // 500 + 2 adultes × 1,65 € × 7 nuits
    expect(totalReservation(reservation())).toBe(523.1);
  });

  it('multiplie le tarif par le nombre de semaines entières, sans facturer les jours restants', () => {
    expect(totalReservation(reservation({ fin: d('2026-07-18') }))).toBe(1046.2); // 500 × 2 + 2 × 1,65 × 14
    expect(totalReservation(reservation({ fin: d('2026-07-14') }))).toBe(533); // 10 nuits : 500 + 2 × 1,65 × 10
  });

  it("compte le tarif une fois pour un séjour de moins d'une semaine", () => {
    expect(totalReservation(reservation({ fin: d('2026-07-07') }))).toBe(509.9); // 500 + 2 × 1,65 × 3
  });

  it('ajoute les suppléments selon leur type, au prix enregistré', () => {
    const total = totalReservation(
      reservation({ supplements: [ligne('SEJOUR', 40, 1), ligne('HEBDOMADAIRE', 10, 2), ligne('QUOTIDIEN', 5, 1)] }),
    );
    // 523,1 + 40 + (10 × 2 × 1 semaine) + (5 × 7 nuits)
    expect(total).toBe(618.1);
  });

  it('compte une semaine de plus pour les suppléments hebdomadaires au-delà de 4 jours entamés', () => {
    const base = { fin: d('2026-07-16') }; // 12 nuits : 1 semaine + 5 jours
    const sans = totalReservation(reservation(base));
    const avec = totalReservation(reservation({ ...base, supplements: [ligne('HEBDOMADAIRE', 10, 1), ligne('HEBDOMADAIRE', 20, 1)] }));
    expect(avec - sans).toBeCloseTo(60);
  });

  it('applique la taxe de séjour enregistrée dans la réservation', () => {
    expect(totalReservation(reservation({ taxeSejour: 2 }))).toBe(528); // 500 + 2 × 2 × 7
  });

  it('gère une demande sans tarif ni adulte renseigné', () => {
    expect(totalReservation(reservation({ tarif: null, adultes: 0 }))).toBe(0);
  });

  it('reconnaît un week-end : arrivée le samedi, départ le dimanche', () => {
    expect(estUnWeekEnd(d('2027-05-08'), d('2027-05-09'))).toBe(true); // samedi → dimanche
    expect(estUnWeekEnd(d('2027-05-07'), d('2027-05-09'))).toBe(false); // vendredi → dimanche
    expect(estUnWeekEnd(d('2027-05-08'), d('2027-05-10'))).toBe(false); // samedi → lundi
    expect(estUnWeekEnd(d('2027-05-09'), d('2027-05-10'))).toBe(false); // dimanche → lundi
  });

  it('écrit les périodes en toutes lettres', () => {
    expect(libellePeriode({ debut: d('2026-05-02'), fin: d('2026-07-04') })).toBe('Du 2 mai au 4 juillet 2026');
    expect(libellePeriode({ debut: d('2026-12-19'), fin: d('2027-01-02') })).toBe('Du 19 décembre 2026 au 2 janvier 2027');
    expect(libellePeriode({ debut: d('2026-08-01'), fin: d('2026-09-01') })).toBe('Du 1er août au 1er septembre 2026');
  });
});

describe('API de tarification', () => {
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

  const MOYENNE = { id: 1, label: 'Moyenne saison', prix: 455.75 };
  const HAUTE = { id: 2, label: 'Haute saison', prix: 800 };
  const periode = (debut: string, fin: string, tarif: typeof MOYENNE) => ({ debut: d(debut), fin: d(fin), tarif });

  const devis = (body: Record<string, unknown>) => t.http().post('/devis').send(body);

  describe('devis', () => {
    it('prend le tarif de la période et calcule taxe, total et acompte', async () => {
      t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2026-07-04', '2026-08-29', HAUTE)]);

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-18', adultes: 2, enfants: 1 }).expect(200);

      expect(res.body).toEqual({
        nuits: 14,
        semainesFacturees: 2,
        semaines: [
          { debut: '2026-07-04T00:00:00.000Z', tarif: HAUTE },
          { debut: '2026-07-11T00:00:00.000Z', tarif: HAUTE },
        ],
        weekEnd: false,
        tarifPropose: 800,
        complet: true,
        hebergement: 1600,
        taxeSejour: { taux: 1.65, montant: 46.2 },
        supplements: [],
        totalSupplements: 0,
        sousTotal: 1600,
        total: 1646.2,
        acompte: { pourcentage: 30, montant: 480 },
        capacite: { max: 5, voyageurs: 3, depassee: false },
      });
      // Seules les périodes qui touchent les semaines facturées sont lues.
      // Seules les périodes des prix à la semaine qui touchent les semaines facturées sont lues.
      expect(t.prisma.tarifPeriode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            debut: { lte: d('2026-07-11') },
            fin: { gt: d('2026-07-04') },
            tarif: { frequence: { has: 'SEMAINE' } },
          },
        }),
      );
    });

    it('prend le tarif par défaut (basse saison) pour une semaine sans période', async () => {
      const BASSE = { id: 3, label: 'Basse saison', prix: 295 };
      t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2026-09-26', '2026-10-03', MOYENNE)]);
      t.prisma.tarif.findFirst.mockResolvedValueOnce(BASSE);

      const res = await devis({ debut: '2026-09-26', fin: '2026-10-10' }).expect(200);

      expect(t.prisma.tarif.findFirst).toHaveBeenCalledWith({
        where: { parDefaut: true, frequence: { has: 'SEMAINE' } },
        select: { id: true, label: true, prix: true },
      });
      expect(res.body.semaines.map((s: { tarif: { id: number } }) => s.tarif.id)).toEqual([1, 3]);
      expect(res.body.complet).toBe(true);
      expect(res.body.hebergement).toBe(750.75);
    });

    describe('week-end (du samedi au dimanche)', () => {
      const WEEK_END = { id: 7, label: 'Week-end', prix: 117 };

      it('applique le forfait week-end au lieu d’une semaine', async () => {
        t.prisma.tarif.findFirst.mockResolvedValueOnce(WEEK_END);

        const res = await devis({ debut: '2027-05-08', fin: '2027-05-09', adultes: 2 }).expect(200);

        expect(t.prisma.tarif.findFirst).toHaveBeenCalledWith({
          where: { frequence: { has: 'WEEKEND' } },
          select: { id: true, label: true, prix: true },
          orderBy: { id: 'asc' },
        });
        expect(t.prisma.tarifPeriode.findMany).not.toHaveBeenCalled();
        expect(res.body).toEqual(
          expect.objectContaining({
            weekEnd: true,
            semaines: [{ debut: '2027-05-08T00:00:00.000Z', tarif: WEEK_END }],
            tarifPropose: 117,
            hebergement: 117,
            total: 120.3, // 117 + 2 × 1,65 × 1 nuit
          }),
        );
      });

      it('compte une semaine pour une nuit qui ne va pas du samedi au dimanche', async () => {
        t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2027-05-01', '2027-07-03', MOYENNE)]);

        const res = await devis({ debut: '2027-05-07', fin: '2027-05-08' }).expect(200); // vendredi → samedi

        expect(res.body.weekEnd).toBe(false);
        expect(res.body.hebergement).toBe(455.75);
      });

      it('compte une semaine s’il n’y a pas de prix week-end', async () => {
        t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2027-05-01', '2027-07-03', MOYENNE)]);

        const res = await devis({ debut: '2027-05-08', fin: '2027-05-09' }).expect(200);

        expect(res.body.weekEnd).toBe(false);
        expect(res.body.hebergement).toBe(455.75);
      });
    });

    it('à cheval sur deux saisons, chaque semaine prend le tarif de sa première nuit', async () => {
      t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([
        periode('2026-05-02', '2026-07-11', MOYENNE),
        periode('2026-07-11', '2026-08-29', HAUTE),
      ]);

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-18', adultes: 0 }).expect(200);

      expect(res.body.semaines.map((s: { tarif: { id: number } }) => s.tarif.id)).toEqual([1, 2]);
      expect(res.body.hebergement).toBe(1255.75);
      // Prix par semaine proposé pour la réservation : la moyenne, au centime.
      expect(res.body.tarifPropose).toBe(627.88);
    });

    it("signale une semaine qu'aucune période ne couvre", async () => {
      t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2026-07-04', '2026-07-11', HAUTE)]);

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-18' }).expect(200);

      expect(res.body.semaines[1].tarif).toBeNull();
      expect(res.body.complet).toBe(false);
      expect(res.body.tarifPropose).toBeNull();
      expect(res.body.hebergement).toBe(800);
    });

    it('applique le prix par semaine et la taxe imposés (ceux d’une réservation)', async () => {
      t.prisma.tarifPeriode.findMany.mockResolvedValueOnce([periode('2026-07-04', '2026-08-29', HAUTE)]);

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-11', adultes: 2, tarif: 650.5, taxeSejour: 1 }).expect(200);

      expect(res.body.hebergement).toBe(650.5);
      expect(res.body.taxeSejour).toEqual({ taux: 1, montant: 14 });
      expect(res.body.tarifPropose).toBe(800);
      expect(res.body.complet).toBe(true);
    });

    it('suit les réglages : taxe, acompte et capacité', async () => {
      t.prisma.reglages.findUnique.mockResolvedValueOnce({
        id: 1,
        taxeSejour: 2,
        capacite: 4,
        saisonDebut: 4,
        saisonFin: 9,
        acomptePourcentage: 25,
      });

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-11', adultes: 3, enfants: 2, tarif: 500 }).expect(200);

      expect(res.body.taxeSejour).toEqual({ taux: 2, montant: 42 });
      expect(res.body.acompte).toEqual({ pourcentage: 25, montant: 125 });
      expect(res.body.capacite).toEqual({ max: 4, voyageurs: 5, depassee: true });
    });

    it('ajoute le supplément facturé par animal quand aucun supplément n’est choisi', async () => {
      t.prisma.supplement.findFirst.mockResolvedValueOnce({ id: 3, label: 'Animal', type: 'QUOTIDIEN', tarif: 1 });

      const res = await devis({ debut: '2026-07-04', fin: '2026-07-11', animaux: 2, tarif: 500 }).expect(200);

      expect(res.body.supplements).toEqual([{ supplementId: 3, label: 'Animal', type: 'QUOTIDIEN', nb: 2, tarif: 1, montant: 14 }]);
      expect(res.body.total).toBe(514);
    });

    it('chiffre les suppléments choisis, au prix envoyé ou à celui du catalogue', async () => {
      t.prisma.supplement.findMany.mockResolvedValueOnce([
        { id: 1, label: 'Ménage', type: 'SEJOUR', tarif: 70 },
        { id: 2, label: 'Draps', type: 'HEBDOMADAIRE', tarif: 10 },
      ]);

      const res = await devis({
        debut: '2026-07-04',
        fin: '2026-07-11',
        animaux: 1,
        tarif: 500,
        supplements: [{ supplementId: 1, nb: 1 }, { supplementId: 2, nb: 2, tarif: 12 }],
      }).expect(200);

      expect(res.body.supplements.map((s: { montant: number }) => s.montant)).toEqual([70, 24]);
      expect(res.body.totalSupplements).toBe(94);
      expect(res.body.acompte.montant).toBe(178.2); // 30 % de 594
      // La liste envoyée remplace le supplément automatique des animaux.
      expect(t.prisma.supplement.findFirst).not.toHaveBeenCalled();
    });

    it.each([
      ['un départ avant l’arrivée', { fin: '2026-07-01' }],
      ['une date invalide', { debut: 'demain' }],
      ['un séjour de plus d’un an', { fin: '2027-07-10' }],
      ['un prix par semaine négatif', { tarif: -1 }],
      ['un nombre d’adultes décimal', { adultes: 1.5 }],
    ])('refuse %s (400)', async (_label, override) => {
      await devis({ debut: '2026-07-04', fin: '2026-07-11', ...override }).expect(400);
    });

    it('refuse un supplément inconnu', async () => {
      const res = await devis({ debut: '2026-07-04', fin: '2026-07-11', supplements: [{ supplementId: 9, nb: 1 }] }).expect(400);
      expect(res.body.message).toEqual(['Supplément introuvable : 9']);
    });
  });

  describe('réglages', () => {
    it('renvoie les valeurs par défaut si la ligne de réglages manque', async () => {
      const res = await t.http().get('/reglages').expect(200);
      expect(res.body).toEqual({ taxeSejour: 1.65, capacite: 5, saisonDebut: 4, saisonFin: 9, acomptePourcentage: 30 });
    });

    it("n'enregistre que les champs envoyés", async () => {
      await t.http().patch('/reglages').set(t.auth).send({ taxeSejour: 1.8, inconnu: 1 }).expect(200);
      expect(t.prisma.reglages.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        create: { id: 1, taxeSejour: 1.8, capacite: 5, saisonDebut: 4, saisonFin: 9, acomptePourcentage: 30 },
        update: { taxeSejour: 1.8 },
      });
    });

    it('refuse une saison qui finit avant de commencer, en tenant compte des valeurs enregistrées', async () => {
      // Saison enregistrée : avril à septembre.
      await t.http().patch('/reglages').set(t.auth).send({ saisonDebut: 10 }).expect(400);
      expect(t.prisma.reglages.upsert).not.toHaveBeenCalled();
    });

    it.each([
      ['une taxe négative', { taxeSejour: -1 }],
      ['une taxe plus précise que le centime', { taxeSejour: 1.655 }],
      ['une capacité nulle', { capacite: 0 }],
      ['un mois inexistant', { saisonFin: 13 }],
      ['un acompte de plus de 100 %', { acomptePourcentage: 120 }],
    ])('refuse %s', async (_label, body) => {
      await t.http().patch('/reglages').set(t.auth).send(body).expect(400);
    });
  });

  describe('périodes datées des tarifs', () => {
    const TARIF = { desc: ' ', label: 'Haute saison', prix: 800, frequence: ['SEMAINE'] };

    it("remplacent l'ancien texte libre", async () => {
      await t
        .http()
        .post('/tarifs')
        .set(t.auth)
        .send({ ...TARIF, date: ['Du 05/07 au 30/08'], periodes: [{ debut: '2026-07-04', fin: '2026-08-29' }] })
        .expect(201);

      const { data } = t.prisma.tarif.create.mock.calls[0][0];
      expect(data.date).toEqual([]);
      expect(data.periodes).toEqual({ create: [{ debut: d('2026-07-04'), fin: d('2026-08-29') }] });
    });

    it("gardent l'ancien texte d'un tarif qui n'en a pas", async () => {
      await t.http().post('/tarifs').set(t.auth).send({ ...TARIF, date: ['Juillet et août'] }).expect(201);
      const { data } = t.prisma.tarif.create.mock.calls[0][0];
      expect(data.date).toEqual(['Juillet et août']);
      expect(data.periodes).toBeUndefined();
    });

    it('sont écrites en toutes lettres pour le site, sans les périodes terminées', async () => {
      t.prisma.tarif.findMany.mockResolvedValueOnce([
        {
          id: 1,
          ...TARIF,
          vacance: false,
          date: [],
          periodes: [
            { id: 1, debut: d('2000-07-01'), fin: d('2000-08-26') },
            { id: 2, debut: d('2099-07-04'), fin: d('2099-08-29') },
          ],
        },
        { id: 2, ...TARIF, label: 'Ancien', vacance: false, date: ['Du 01/05 au 05/07'], periodes: [] },
      ]);

      const res = await t.http().get('/tarifs').expect(200);

      expect(res.body[0].date).toEqual(['Du 4 juillet au 29 août 2099']);
      expect(res.body[0].periodes).toHaveLength(2);
      expect(res.body[1].date).toEqual(['Du 01/05 au 05/07']);
    });

    it('ne changent pas quand la modification ne les envoie pas', async () => {
      await t.http().patch('/tarifs/1').set(t.auth).send({ prix: 820 }).expect(200);
      const { data } = t.prisma.tarif.update.mock.calls[0][0];
      expect(data.periodes).toBeUndefined();
      expect(t.prisma.tarifPeriode.findFirst).not.toHaveBeenCalled();
    });

    it('remplacent les anciennes à la modification, en ignorant celles du tarif modifié', async () => {
      await t
        .http()
        .patch('/tarifs/1')
        .set(t.auth)
        .send({ periodes: [{ debut: '2026-07-04', fin: '2026-08-29' }] })
        .expect(200);

      expect(t.prisma.tarifPeriode.findFirst.mock.calls[0][0].where).toEqual({
        tarifId: { not: 1 },
        OR: [{ debut: { lt: d('2026-08-29') }, fin: { gt: d('2026-07-04') } }],
      });
      expect(t.prisma.tarif.update.mock.calls[0][0].data.periodes).toEqual({
        deleteMany: {},
        create: [{ debut: d('2026-07-04'), fin: d('2026-08-29') }],
      });
    });

    it('acceptent deux périodes qui se suivent (le jour de départ est la première nuit de la suivante)', async () => {
      await t
        .http()
        .patch('/tarifs/1')
        .set(t.auth)
        .send({ periodes: [{ debut: '2026-07-04', fin: '2026-07-11' }, { debut: '2026-07-11', fin: '2026-07-18' }] })
        .expect(200);
    });

    it('refusent deux périodes du même tarif qui se chevauchent', async () => {
      const res = await t
        .http()
        .patch('/tarifs/1')
        .set(t.auth)
        .send({ periodes: [{ debut: '2026-07-04', fin: '2026-07-18' }, { debut: '2026-07-11', fin: '2026-07-25' }] })
        .expect(400);
      expect(res.body.message).toEqual(['Les périodes du 04/07/2026 au 18/07/2026 et du 11/07/2026 au 25/07/2026 se chevauchent']);
      expect(t.prisma.tarif.update).not.toHaveBeenCalled();
    });

    it("refusent une période qui chevauche celle d'un autre tarif", async () => {
      t.prisma.tarifPeriode.findFirst.mockResolvedValueOnce({
        debut: d('2026-05-02'),
        fin: d('2026-07-11'),
        tarif: { label: ' Moyenne saison' },
      });

      const res = await t
        .http()
        .post('/tarifs')
        .set(t.auth)
        .send({ ...TARIF, periodes: [{ debut: '2026-07-04', fin: '2026-08-29' }] })
        .expect(400);

      expect(res.body.message[0]).toContain('« Moyenne saison »');
      expect(t.prisma.tarif.create).not.toHaveBeenCalled();
    });

    it('sont réservées aux prix à la semaine', async () => {
      const res = await t
        .http()
        .post('/tarifs')
        .set(t.auth)
        .send({ ...TARIF, label: 'Week-end', frequence: ['WEEKEND'], periodes: [{ debut: '2027-05-01', fin: '2027-07-03' }] })
        .expect(400);
      expect(res.body.message).toEqual(['Seul un prix à la semaine peut avoir des périodes ou être le tarif par défaut']);
    });

    it('empêchent de retirer la fréquence « semaine » d’un prix qui en a', async () => {
      t.prisma.tarif.findUniqueOrThrow.mockResolvedValueOnce({ frequence: ['SEMAINE'], parDefaut: false, _count: { periodes: 2 } });
      await t.http().patch('/tarifs/1').set(t.auth).send({ frequence: ['WEEKEND'] }).expect(400);
      expect(t.prisma.tarif.update).not.toHaveBeenCalled();
    });

    it('refusent une période qui finit avant de commencer', async () => {
      await t
        .http()
        .patch('/tarifs/1')
        .set(t.auth)
        .send({ periodes: [{ debut: '2026-07-11', fin: '2026-07-11' }] })
        .expect(400);
    });
  });

  describe('tarif par défaut', () => {
    const TARIF = { desc: ' ', label: 'Basse saison', prix: 295, frequence: ['SEMAINE'] };

    it('un seul à la fois : en marquer un retire la marque des autres', async () => {
      await t.http().post('/tarifs').set(t.auth).send({ ...TARIF, parDefaut: true }).expect(201);
      expect(t.prisma.tarif.updateMany).toHaveBeenCalledWith({ where: { parDefaut: true }, data: { parDefaut: false } });

      await t.http().patch('/tarifs/8').set(t.auth).send({ parDefaut: true }).expect(200);
      expect(t.prisma.tarif.updateMany).toHaveBeenLastCalledWith({
        where: { parDefaut: true, id: { not: 8 } },
        data: { parDefaut: false },
      });
    });

    it('ne touche pas aux autres tarifs sans marque', async () => {
      await t.http().patch('/tarifs/8').set(t.auth).send({ prix: 300 }).expect(200);
      expect(t.prisma.tarif.updateMany).not.toHaveBeenCalled();
    });

    it('est forcément un prix à la semaine', async () => {
      await t.http().post('/tarifs').set(t.auth).send({ ...TARIF, frequence: ['WEEKEND'], parDefaut: true }).expect(400);
      expect(t.prisma.tarif.create).not.toHaveBeenCalled();
    });
  });

  describe('réservations', () => {
    it('la liste renvoie le total de chaque réservation, calculé par l’API', async () => {
      t.prisma.reservation.findMany.mockResolvedValueOnce([
        {
          id: 1,
          ...reservation({ taxeSejour: 1 }),
          supplements: [{ supplementId: 1, nb: 1, tarif: 70, supplement: { id: 1, label: 'Ménage', type: 'SEJOUR' } }],
        },
      ]);

      const res = await t.http().get('/reservations').set(t.auth).expect(200);

      expect(res.body[0].total).toBe(584); // 500 + 2 × 1 × 7 + 70
      expect(t.prisma.reservation.findMany.mock.calls[0][0].select.taxeSejour).toBe(true);
    });

    it("la vue aperçu n'a pas de total", async () => {
      t.prisma.reservation.findMany.mockResolvedValueOnce([{ id: 1, debut: d('2026-07-04'), fin: d('2026-07-11') }]);
      const res = await t.http().get('/reservations?vue=apercu').set(t.auth).expect(200);
      expect(res.body[0].total).toBeUndefined();
    });

    it("enregistre la taxe de séjour des réglages dans une réservation saisie dans l'admin", async () => {
      t.prisma.reglages.findUnique.mockResolvedValueOnce({
        id: 1,
        taxeSejour: 2.2,
        capacite: 5,
        saisonDebut: 4,
        saisonFin: 9,
        acomptePourcentage: 30,
      });

      await t
        .http()
        .post('/reservations')
        .set(t.auth)
        .send({ tarif: 500, debut: '2026-08-01', fin: '2026-08-08', clientId: 1 })
        .expect(201);

      expect(t.prisma.reservation.create.mock.calls[0][0].data.taxeSejour).toBe(2.2);
    });
  });
});
