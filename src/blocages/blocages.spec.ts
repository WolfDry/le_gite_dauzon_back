import { createTestApp, TestApp } from '../testing/test-app';

/** Dates bloquées hors réservation (B-F8) : routes de l'admin. */
describe('Blocages de dates', () => {
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

  it('crée un blocage avec son motif, sans champ inconnu', async () => {
    await t
      .http()
      .post('/blocages')
      .set(t.auth)
      .send({ debut: '2026-10-03', fin: '2026-10-10', motif: '  Travaux  ', statut: 'CONFIRMEE' })
      .expect(201);

    expect(t.prisma.blocage.create).toHaveBeenCalledWith({
      data: { debut: new Date('2026-10-03'), fin: new Date('2026-10-10'), motif: 'Travaux' },
    });
  });

  it('enregistre un motif vide comme absent', async () => {
    await t.http().post('/blocages').set(t.auth).send({ debut: '2026-10-03', fin: '2026-10-10', motif: ' ' }).expect(201);
    expect(t.prisma.blocage.create).toHaveBeenCalledWith({
      data: { debut: new Date('2026-10-03'), fin: new Date('2026-10-10'), motif: null },
    });
  });

  it('refuse une fin qui ne suit pas le début', async () => {
    await t.http().post('/blocages').set(t.auth).send({ debut: '2026-10-10', fin: '2026-10-10' }).expect(400);
    await t.http().post('/blocages').set(t.auth).send({ debut: '2026-10-10' }).expect(400);
    expect(t.prisma.blocage.create).not.toHaveBeenCalled();
  });

  it('refuse un blocage qui chevauche un autre blocage (deux blocages peuvent se suivre)', async () => {
    t.prisma.blocage.findFirst.mockResolvedValueOnce({ debut: new Date('2026-10-01'), fin: new Date('2026-10-05') });
    const res = await t.http().post('/blocages').set(t.auth).send({ debut: '2026-10-03', fin: '2026-10-10' }).expect(400);
    expect(res.body.message).toEqual(['Ces dates chevauchent des dates déjà bloquées (du 01/10/2026 au 05/10/2026)']);
    expect(t.prisma.blocage.create).not.toHaveBeenCalled();

    // Bornes strictes : un blocage qui finit le 3 ou commence le 10 n'est pas un chevauchement.
    expect(t.prisma.blocage.findFirst).toHaveBeenCalledWith({
      where: { debut: { lt: new Date('2026-10-10') }, fin: { gt: new Date('2026-10-03') } },
      select: { debut: true, fin: true },
    });
  });

  it('modifie une seule date en la comparant à celle enregistrée', async () => {
    t.prisma.blocage.findUniqueOrThrow.mockResolvedValueOnce({ debut: new Date('2026-10-03'), fin: new Date('2026-10-10') });
    await t.http().patch('/blocages/4').set(t.auth).send({ debut: '2026-10-12' }).expect(400);

    t.prisma.blocage.findUniqueOrThrow.mockResolvedValueOnce({ debut: new Date('2026-10-03'), fin: new Date('2026-10-10') });
    await t.http().patch('/blocages/4').set(t.auth).send({ fin: '2026-10-12' }).expect(200);
    expect(t.prisma.blocage.findFirst).toHaveBeenCalledWith({
      where: { debut: { lt: new Date('2026-10-12') }, fin: { gt: new Date('2026-10-03') }, id: { not: 4 } },
      select: { debut: true, fin: true },
    });
    expect(t.prisma.blocage.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { debut: undefined, fin: new Date('2026-10-12') },
    });
  });

  it('efface le motif, sans vérifier les dates si elles ne changent pas', async () => {
    t.prisma.blocage.findUniqueOrThrow.mockResolvedValueOnce({ debut: new Date('2026-10-03'), fin: new Date('2026-10-10') });
    await t.http().patch('/blocages/4').set(t.auth).send({ motif: null }).expect(200);
    expect(t.prisma.blocage.findFirst).not.toHaveBeenCalled();
    expect(t.prisma.blocage.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { debut: undefined, fin: undefined, motif: null },
    });
  });

  it('liste les blocages qui touchent une période, bornes incluses', async () => {
    await t.http().get('/blocages?depuis=2026-01-01&jusqua=2026-12-31').set(t.auth).expect(200);
    expect(t.prisma.blocage.findMany).toHaveBeenCalledWith({
      where: { fin: { gte: new Date('2026-01-01') }, debut: { lte: new Date('2026-12-31') } },
      orderBy: [{ debut: 'asc' }, { id: 'asc' }],
    });
  });
});
