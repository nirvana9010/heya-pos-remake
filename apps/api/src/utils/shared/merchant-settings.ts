import { MerchantSettings } from "../../types/models/merchant";

type SettingsObject = Record<string, any>;

/**
 * Flattens legacy nested merchant settings objects and ensures critical defaults are set.
 * Some historical records persisted as `{ settings: { ... } }`, causing consumers that read the
 * raw JSON to miss overrides. This helper unwraps any nested `settings` layer while preserving
 * sibling properties and applies minimal defaults for downstream logic.
 */
export function normalizeMerchantSettings<
  T extends SettingsObject = MerchantSettings,
>(rawSettings: unknown): T {
  if (!rawSettings || typeof rawSettings !== "object") {
    return {} as T;
  }

  // Work on a shallow clone so we do not mutate the Prisma JsonValue instance.
  let normalized: SettingsObject = { ...(rawSettings as SettingsObject) };
  const seen = new Set<SettingsObject>();

  while (normalized && typeof normalized === "object") {
    const nested = (normalized as SettingsObject).settings;
    if (
      !nested ||
      typeof nested !== "object" ||
      seen.has(nested as SettingsObject)
    ) {
      break;
    }

    seen.add(nested as SettingsObject);
    const topLevelProps: SettingsObject = { ...normalized };
    delete topLevelProps.settings;
    normalized = { ...topLevelProps, ...(nested as SettingsObject) };
  }

  if (
    normalized &&
    typeof normalized === "object" &&
    normalized.priceToDurationRatio === undefined
  ) {
    normalized.priceToDurationRatio = 1.0;
  }

  return normalized as T;
}
