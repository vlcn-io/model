import { tracer, Tracer } from "@vlcn.io/instrument";

const t: Tracer = tracer("@vlcn.io/wa-sqlite-connector", "0.2.3");

export default t;
