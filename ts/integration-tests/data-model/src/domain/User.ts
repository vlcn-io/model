import spec from "./generated/UserSpec.js";
import UserBase from "./generated/UserBase.js";
export { Data } from "./generated/UserBase.js";

export default class User extends UserBase {
  static readonly spec = spec;
  // insert any manual method you may have here
}
