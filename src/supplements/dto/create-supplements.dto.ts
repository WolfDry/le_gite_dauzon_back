import { SupplementType } from "@prisma/client"

export class CreateSupplementDto {
  readonly label: string;
  readonly tarif: number;
  readonly type: SupplementType;
}