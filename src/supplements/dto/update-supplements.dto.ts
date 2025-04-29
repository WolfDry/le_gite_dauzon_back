import { SupplementType } from "@prisma/client"

export class UpdateSupplementDto {
  readonly label?: string;
  readonly tarif?: number;
  readonly type?: SupplementType;
}