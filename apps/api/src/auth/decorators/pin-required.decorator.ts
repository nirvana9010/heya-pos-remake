import { SetMetadata } from "@nestjs/common";

export const PIN_REQUIRED_KEY = "pinRequired";
export const PinRequired = (action: string) =>
  SetMetadata(PIN_REQUIRED_KEY, action);
