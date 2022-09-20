import { Model } from "../Model.js";

class TestModel extends Model<{}> {}

test("notifies observers", () => {});
test("notifies keyed observers", () => {});
test("de-dupes notifications", () => {});
test("does not notify until tx commit", () => {});
test("does not notify on tx failure", () => {});
test("does not update state on tx failure", () => {});
test("transaction isolation", () => {});
