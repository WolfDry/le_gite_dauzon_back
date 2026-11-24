import { PrismaService } from 'src/prisma.service';
import { UploadService } from 'src/Upload/Upload.service';
import { EvenementService } from './evenements.service';

const EVENT = { id: 7, titre: 'Marché de Noël', image: 'evenements/ancienne' };

const setup = () => {
  const evenement = {
    findUnique: jest.fn().mockResolvedValue({ image: EVENT.image }),
    update: jest.fn().mockImplementation(async ({ data }) => ({ ...EVENT, ...data })),
    delete: jest.fn().mockResolvedValue(EVENT),
  };
  const upload = { deleteImage: jest.fn().mockResolvedValue(undefined) };
  const service = new EvenementService(
    { evenement } as unknown as PrismaService,
    upload as unknown as UploadService,
  );
  return { service, evenement, upload };
};

describe('EvenementService', () => {
  describe('modification', () => {
    it("supprime l'ancienne image de Cloudinary quand elle est remplacée", async () => {
      const { service, upload } = setup();

      const updated = await service.update(EVENT.id, { image: 'evenements/nouvelle' });

      expect(updated.image).toBe('evenements/nouvelle');
      expect(upload.deleteImage).toHaveBeenCalledWith('evenements/ancienne');
    });

    it("garde l'image quand elle ne change pas", async () => {
      const { service, upload } = setup();

      await service.update(EVENT.id, { titre: 'Marché de Noël 2026' });

      expect(upload.deleteImage).not.toHaveBeenCalled();
    });

    it("garde l'ancienne image si l'enregistrement échoue", async () => {
      const { service, evenement, upload } = setup();
      evenement.update.mockRejectedValueOnce(new Error('base indisponible'));

      await expect(service.update(EVENT.id, { image: 'evenements/nouvelle' })).rejects.toThrow('base indisponible');
      expect(upload.deleteImage).not.toHaveBeenCalled();
    });
  });

  describe('suppression', () => {
    it("supprime aussi l'image de l'événement", async () => {
      const { service, upload } = setup();

      await expect(service.remove(EVENT.id)).resolves.toEqual(EVENT);
      expect(upload.deleteImage).toHaveBeenCalledWith('evenements/ancienne');
    });

    it("garde l'image si l'événement n'a pas pu être supprimé", async () => {
      const { service, evenement, upload } = setup();
      evenement.delete.mockRejectedValueOnce(new Error('introuvable'));

      await expect(service.remove(EVENT.id)).rejects.toThrow('introuvable');
      expect(upload.deleteImage).not.toHaveBeenCalled();
    });
  });
});
