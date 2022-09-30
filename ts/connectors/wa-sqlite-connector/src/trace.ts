import { tracer, Tracer } from "@vulcan.sh/instrument";

const t: Tracer = tracer("@vulcan.sh/wa-sqlite-connector", "0.2.3");

export default t;
