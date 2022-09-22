import { invariant } from "@aphrodite.sh/util";

type Config = {
  deviceId: string;
};
let _config: Config | null = null;

export function init(config: Config) {
  if (_config != null) {
    console.warn(
      "model-persisted was already configured and someone attempted to re-configure it."
    );
    return;
  }

  _config = config;
}

export const config = {
  get deviceId(): string {
    invariant(
      config != null,
      "model-persisted module needs to be configured before use. See model-persisted/config.ts"
    );
    return _config!.deviceId;
  },
};
