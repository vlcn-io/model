import { tracer, Tracer } from "@vulcan.sh/instrument";

const t: Tracer = tracer("@vulcan.sh/absurd-sql-connector", "0.2.1");
export default t;
