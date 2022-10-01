import { upcaseAt } from "@vulcan.sh/util";
import { CodegenFile, CodegenStep, generatedDir } from "@vulcan.sh/codegen-api";
import TypescriptFile from "./TypescriptFile.js";
import {
  Field,
  SchemaNode,
  EdgeDeclaration,
  EdgeReferenceDeclaration,
  ID,
  Import,
  SchemaEdge,
  FieldDeclaration,
} from "@vulcan.sh/schema-api";
import { nodeFn, edgeFn, tsImport } from "@vulcan.sh/schema";
import { importsToString } from "./tsUtils.js";
import * as path from "path";

export default class GenTypescriptQuery extends CodegenStep {
  // This can technicall take a node _or_ an edge.
  // also... should we have access to the entire schema file?
  static accepts(schema: SchemaNode | SchemaEdge): boolean {
    return schema.storage.type !== "ephemeral";
  }

  private schema: SchemaNode | SchemaEdge;
  private edges: { [key: string]: SchemaEdge };

  constructor(opts: {
    nodeOrEdge: SchemaNode | SchemaEdge;
    edges: { [key: string]: SchemaEdge };
    dest: string;
  }) {
    super();
    this.schema = opts.nodeOrEdge;
    this.edges = opts.edges;
  }

  // Nit:
  // we can technically return an array of files.
  // Since we can have edge data... so we'd need edge queries rather than a query per schema.
  // b/c structure on the edges...
  // TODO: de-duplicate imports by storing imports in an intermediate structure.
  async gen(): Promise<CodegenFile> {
    const imports = this.collectImports();
    return new TypescriptFile(
      path.join(generatedDir, nodeFn.queryTypeName(this.schema.name) + ".ts"),
      `${importsToString(imports)}

export default class ${nodeFn.queryTypeName(
        this.schema.name
      )} extends DerivedQuery<${this.schema.name}> {
  static create() {
    return new ${nodeFn.queryTypeName(this.schema.name)}(
      QueryFactory.createSourceQueryFor(${nodeFn.specName(this.schema.name)}),
      modelLoad(${nodeFn.specName(this.schema.name)}.hydrate),
    );
  }

  static empty() {
    return new ${nodeFn.queryTypeName(this.schema.name)}(
      new EmptyQuery(),
    );
  }

  protected derive(expression: Expression): ${nodeFn.queryTypeName(
    this.schema.name
  )} {
    return new ${nodeFn.queryTypeName(this.schema.name)}(
      this,
      expression,
    )
  }

  ${this.getFromIdMethodCode()}
  ${this.getFromInboundFieldEdgeMethodsCode()}

  ${this.getFilterMethodsCode()}
  ${this.getHopMethodsCode()}

  ${this.getTakeMethodCode()}
  ${this.getOrderByMethodsCode()}

  ${this.getProjectionMethodsCode()}
}
`
    );
  }

  private collectImports(): Import[] {
    return [
      ...[
        "DerivedQuery",
        "QueryFactory",
        "modelLoad",
        "filter",
        "Predicate",
        "take",
        "orderBy",
        "P",
        "ModelFieldGetter",
        "Expression",
        "EmptyQuery",
      ].map((i) => tsImport(`{${i}}`, null, "@vulcan.sh/runtime")),
      tsImport("{ID_of}", null, "@vulcan.sh/runtime"),
      tsImport(this.schema.name, null, `../${this.schema.name}.js`),
      tsImport("{Data}", null, `./${this.schema.name}Base.js`),
      tsImport(
        nodeFn.specName(this.schema.name),
        null,
        `./${nodeFn.specName(this.schema.name)}.js`
      ),
      ...this.getIdFieldImports(),
      ...this.getEdgeImports(),
    ];
  }

  private getFilterMethodsCode(): string {
    const ret: string[] = [];
    const fields = Object.values(this.schema.fields);
    for (const field of fields) {
      ret.push(`
      where${upcaseAt(field.name, 0)}(p: Predicate<Data["${field.name}"]>) {
        ${this.getFilterMethodBody(field)}
      }`);
    }
    return ret.join("\n");
  }

  private getFilterMethodBody(field: FieldDeclaration): string {
    return `return this.derive(
      filter(
        new ModelFieldGetter<"${field.name}", Data, ${this.schema.name}>("${field.name}"),
        p,
      ), 
    )`;
  }

  private getOrderByMethodsCode(): string {
    const ret: string[] = [];
    const fields = Object.values(this.schema.fields);
    for (const field of fields) {
      ret.push(`
      orderBy${upcaseAt(field.name, 0)}(direction: 'asc' | 'desc' = 'asc') {
        ${this.getOrderByMethodBody(field)}
      }`);
    }
    return ret.join("\n");
  }

  private getOrderByMethodBody(field: FieldDeclaration): string {
    return `return this.derive(
      orderBy(
        new ModelFieldGetter<"${field.name}", Data, ${this.schema.name}>("${field.name}"),
        direction,
      ), 
    )`;
  }

  private getFromIdMethodCode(): string {
    if (this.schema.type === "standaloneEdge") {
      return "";
    }
    return `
static fromId(id: ID_of<${this.schema.name}>) {
  return this.create().whereId(P.equals(id));
}
`;
  }

  private getFromInboundFieldEdgeMethodsCode(): string {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return "";
    }
    // this would be inbound edges, right?
    // inbound edges to me based on one of my fields.
    const inbound: EdgeDeclaration[] = Object.values(
      schema.extensions.inboundEdges?.edges || {}
    )
      .filter((edge): edge is EdgeDeclaration => edge.type === "edge")
      .filter((edge: EdgeDeclaration) => edgeFn.isThroughNode(schema, edge));

    return inbound.map(this.getFromInboundFieldEdgeMethodCode).join("\n");
  }

  private getFromInboundFieldEdgeMethodCode(edge: EdgeDeclaration): string {
    const column = edge.throughOrTo.column!;
    const field = this.schema.fields[column];

    const idParts = field.type.filter(
      (f): f is ID => typeof f !== "string" && f.type === "id"
    );
    if (idParts.length === 0) {
      throw new Error("fields edges must refer to id fields");
    } else if (idParts.length > 1) {
      throw new Error(
        `unioning of ids for edges is not yet supported. Processing field ${field.name}`
      );
    }

    return `
static from${upcaseAt(column, 0)}(id: ID_of<${idParts[0].of}>) {
  return this.create().where${upcaseAt(field.name, 0)}(P.equals(id));
}
`;
  }

  private getEdgeImports(): Import[] {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return [];
    }
    const inbound = Object.values(
      schema.extensions.inboundEdges?.edges || {}
    ).map((e) => edgeFn.dereference(e, this.edges));

    const outbound = Object.values(
      schema.extensions.outboundEdges?.edges || {}
    ).map((e) => edgeFn.dereference(e, this.edges));

    return [...inbound, ...outbound]
      .filter(
        (edge) =>
          edgeFn.queryTypeName(schema, edge) !==
          nodeFn.queryTypeName(this.schema.name)
      )
      .flatMap((edge) => [
        tsImport(
          edgeFn.destModelSpecName(schema, edge),
          null,
          `./${edgeFn.destModelSpecName(schema, edge)}.js`
        ),
        tsImport(
          edgeFn.queryTypeName(schema, edge),
          null,
          `./${edgeFn.queryTypeName(schema, edge)}.js`
        ),
      ]);

    // import edge reference queries too
  }

  private getIdFieldImports(): Import[] {
    const idFields = Object.values(this.schema.fields)
      .flatMap((f) => f.type)
      .filter(
        (f): f is ID =>
          typeof f !== "string" && f.type === "id" && f.of !== "any"
      );

    return idFields.map((f) => tsImport(f.of, null, "../" + f.of + ".js"));
  }

  private getHopMethodsCode(): string {
    if (this.schema.type === "standaloneEdge") {
      return "";
    }
    // hop methods are edges
    // e.g., Deck.querySlides().queryComponents()
    const outbound = Object.values(
      this.schema.extensions.outboundEdges?.edges || {}
    );
    return outbound.map((e) => this.getHopMethod(e)).join("\n");
  }

  private getHopMethod(
    edge: EdgeDeclaration | EdgeReferenceDeclaration
  ): string {
    if (this.schema.type === "standaloneEdge") {
      return "";
    }
    const e = edgeFn.dereference(edge, this.edges);

    // if (edgeFn.isTo(edge)) {
    //   body = this.getHopMethodForJunctionLikeEdge(edge);
    // }

    return `query${upcaseAt(edge.name, 0)}(): ${edgeFn.queryTypeName(
      this.schema,
      e
    )} {
      ${this.getHopMethodBody(e, edge)}
    }`;
  }

  private getHopMethodForJunctionLikeEdge(
    edge: EdgeDeclaration | SchemaEdge
  ): string {
    return "";
  }

  private getHopMethodBody(
    edge: EdgeDeclaration | SchemaEdge,
    ref: EdgeDeclaration | EdgeReferenceDeclaration
  ): string {
    if (this.schema.type === "standaloneEdge") {
      return "";
    }
    return `return new ${edgeFn.queryTypeName(
      this.schema,
      edge
    )}(QueryFactory.createHopQueryFor(this, ${nodeFn.specName(
      this.schema.name
    )}.outboundEdges.${ref.name}),
      modelLoad(${edgeFn.destModelSpecName(this.schema, edge)}.hydrate),
    );`;
  }

  private getTakeMethodCode(): string {
    return `take(n: number) {
      return new ${nodeFn.queryTypeName(this.schema.name)}(
        this,
        take(n),
      );
    }`;
  }

  private getProjectionMethodsCode(): string {
    return "";
  }

  /*
  return new ComponentQuery(
    QueryFactory.createHopQueryFor(this, spec, ComponentSpec, edgeDef??),
    modelLoad(ComponentSpec.createFrom),
  ) // --> rm this as edge def does it: .whereSlideId(P.equals(this.id));

  createHopQuery should take in:
  - source spec & field for join
  - dest spec & field for join

  Now if it is neo... we'll figure something out.
  Maybe it is just src, dest, edge name?
  */
}
