import { IsEnum, IsInt, IsOptional, Min } from "class-validator";
import type { AustralianState } from "@heya-pos/types";

export const AUSTRALIAN_STATE_ENUM = {
  ACT: "ACT",
  NSW: "NSW",
  NT: "NT",
  QLD: "QLD",
  SA: "SA",
  TAS: "TAS",
  VIC: "VIC",
  WA: "WA",
} as const;

export class SetStateHolidaysDto {
  @IsEnum(AUSTRALIAN_STATE_ENUM)
  state!: AustralianState;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;
}
