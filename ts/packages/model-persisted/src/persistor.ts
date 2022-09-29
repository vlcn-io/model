/**
 * Reads the current Vulcan config to fetch:
 * - resolved db
 * -
 */

import { IPersistedModel } from "./PersistedModel";

export default {
  create(m: IPersistedModel<any>): Promise<void> {
    throw new Error("unimplemented");
  },
  update(m: IPersistedModel<any>): Promise<void> {
    throw new Error("unimplemented");
  },
  delete(m: IPersistedModel<any>): Promise<void> {
    throw new Error("unimplemented");
  },
};

// TODO: sql persist will need to check id for hex only and use blob literal?
// depending on byte length?
