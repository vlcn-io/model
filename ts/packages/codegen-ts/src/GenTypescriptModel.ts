import { asPropertyAccessor, upcaseAt } from "@vlcn.io/util";
import { fieldToTsType, importsToString } from "./tsUtils.js";
import { CodegenFile, CodegenStep, generatedDir } from "@vlcn.io/codegen-api";
import TypescriptFile from "./TypescriptFile.js";
import {
  SchemaEdge,
  EdgeDeclaration,
  EdgeReferenceDeclaration,
  ID,
  Import,
  SchemaNode,
  RemoveNameField,
  Field,
  FieldDeclaration,
  TypeAtom,
} from "@vlcn.io/schema-api";
import { nodeFn, edgeFn, tsImport, fieldFn } from "@vlcn.io/schema";
import * as path from "path";
import featureGates from "@vlcn.io/feature-gates";

export default class GenTypescriptModel extends CodegenStep {
  static accepts(schema: SchemaNode | SchemaEdge): boolean {
    return true;
  }

  private readonly schema: SchemaNode | SchemaEdge;
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

  async gen(): Promise<CodegenFile> {
    const baseClass = this.schema.type === "node" ? "Node" : "Edge";
    return new TypescriptFile(
      path.join(generatedDir, this.schema.name + "Base.ts"),
      `${importsToString(this.collectImports())}

${this.getMutationsConvenienceTypeDeclCode()}

export type Data = ${this.getDataShapeCode()};

${
  this.schema.type === "node"
    ? this.schema.extensions.type?.decorators?.join("\n") || ""
    : ""
}
// @Sealed(${this.schema.name})
export default abstract class ${this.schema.name}Base
  extends AsyncPersistedModel<Data> implements I${baseClass}<Data> {
  readonly spec = s as unknown as ${baseClass}SpecWithCreate<this, Data>;
  ${this.getMutationsConvenienceCode()}
  ${this.getFieldCode()}
  ${this.getEdgeCode()}

  ${this.getOneToOneGenCode()}

  ${this.getQueryAllMethodCode()}

  ${this.getGenxMethodCode()}

  ${this.getGenMethodCode()}

  ${this.getCreateMethodCode()}
}
`
    );
  }

  private getMutationsConvenienceCode(): string {
    if (!this.hasMutations()) {
      return "";
    }
    return `
    static get mutations(): Muts { return ${this.schema.name}Mutations };

    get mutations(): IMuts {
      return new InstancedMutations(this as any);
    }
    `;
  }

  private getMutationsConvenienceTypeDeclCode(): string {
    if (!this.hasMutations()) {
      return "";
    }
    return `declare type Muts = typeof ${this.schema.name}Mutations;
    declare type IMuts = InstancedMutations;`;
  }

  // TODO: we should figure out how to allow the mutation extension augment
  // models...
  private hasMutations(verb?: "create" | "update" | "delete"): boolean {
    if (!featureGates.NAMED_MUTATIONS) {
      return false;
    }

    const muts = (this.schema.extensions as any)?.mutations?.mutations || {};
    if (!muts) {
      return false;
    }
    const values = Object.values(muts);
    if (values.length === 0) {
      return false;
    }

    // any random mutation exists if a verb was not provided
    if (verb == null) {
      return true;
    }

    // verb provided? Check that one of the mutations has the verb.
    return values.some((v: any) => v.verb === verb);
  }

  private getCreateMethodCode(): string {
    if (this.hasMutations("create")) {
      return "";
    }
    return `static create(data: Data) {
      return ${this.schema.name}.spec.create(data);
    }`;
  }

  private getDataShapeCode(): string {
    const fieldProps = Object.values(this.schema.fields).map(
      (field) => `${asPropertyAccessor(field.name)}: ${fieldToTsType(field)}`
    );
    return `{
  ${fieldProps.join(",\n")}
}`;
  }

  private collectImports(): Import[] {
    return [
      tsImport(`${this.schema.name}`, null, `../${this.schema.name}.js`),
      tsImport(
        "{default}",
        "s",
        "./" + nodeFn.specName(this.schema.name) + ".js"
      ),
      tsImport("{P}", null, "@vlcn.io/runtime"),
      tsImport("{modelGenMemo}", null, "@vlcn.io/runtime"),
      tsImport("{AsyncPersistedModel}", null, "@vlcn.io/runtime"),
      this.schema.type === "node"
        ? tsImport("{INode}", null, "@vlcn.io/runtime")
        : tsImport("{IEdge}", null, "@vlcn.io/runtime"),
      this.schema.type === "node"
        ? tsImport("{NodeSpecWithCreate}", null, "@vlcn.io/runtime")
        : tsImport("{EdgeSpecWithCreate}", null, "@vlcn.io/runtime"),
      tsImport("{ID_of}", null, "@vlcn.io/runtime"),
      ...(this.schema.storage.type !== "ephemeral"
        ? [
            tsImport(
              nodeFn.queryTypeName(this.schema.name),
              null,
              `./${nodeFn.queryTypeName(this.schema.name)}.js`
            ),
          ]
        : []),
      ...(this.schema.type === "node"
        ? this.schema.extensions.module?.imports.values() || []
        : []),
      ...this.getEdgeImports(),
      // ...this.getIdFieldImports(),
      ...this.getNestedTypeImports(),
    ].filter((i) => i.name !== this.schema.name + "Base");
  }

  private getNestedTypeImports(): Import[] {
    const typeFields = Object.values(this.schema.fields)
      .flatMap((f) => this.getFieldTypeImports(f.type))
      .filter((f): f is string => f != null);

    return typeFields.map((f) => tsImport(f, null, "../" + f + ".js"));
  }

  private getFieldTypeImports = (type: TypeAtom[]): (string | undefined)[] => {
    return type.flatMap((t) => {
      if (typeof t === "string") {
        return t;
      }

      if (t.type === "intersection" || t.type === "union") {
        return;
      }

      return this.getFieldImports(t);
    });
  };

  private getFieldImports = (
    field: RemoveNameField<Field>
  ): string | undefined => {
    if (field.type === "array" || field.type === "map") {
      if (typeof field.values === "string") {
        return field.values;
      } else {
        return this.getFieldImports(field.values);
      }
    }

    if (field.type === "id" && field.of != "any") {
      return field.of;
    }
  };

  private getEdgeImports(): Import[] {
    if (this.schema.type === "standaloneEdge") {
      return [];
    }

    const ret: Import[] = [];
    for (const edge of nodeFn.allEdges(this.schema)) {
      const e = edgeFn.dereference(edge, this.edges);
      ret.push(
        tsImport(
          edgeFn.queryTypeName(this.schema, e),
          null,
          "./" + edgeFn.queryTypeName(this.schema, e) + ".js"
        )
      );
      if (edge.type === "edge") {
        if (edge.throughOrTo.type !== this.schema.name) {
          ret.push(
            tsImport(
              edge.throughOrTo.type,
              null,
              "../" + edge.throughOrTo.type + ".js"
            )
          );
        } else {
          const destSpec = edgeFn.destModelSpecName(this.schema, edge);
          ret.push(tsImport(destSpec, null, "./" + destSpec + ".js"));
        }
      }
    }

    return ret;
  }

  private getFieldCode(): string {
    const ret = Object.values(this.schema.fields).map((field) => {
      if (field.name === "id") {
        return `${field.decorators?.join("\n") || ""}
            get ${field.name}(): ID_of<this> {
              return this.data.${field.name} as unknown as ID_of<this>;
            }
          `;
      }
      return `${field.decorators?.join("\n") || ""}
          get ${field.name}(): ${fieldToTsType(field)} {
            return this.data.${field.name};
          }
        `;
    });

    if (this.schema.type == "standaloneEdge") {
      ret.push(`get id(): ID_of<this> {
        return (this.data.id1 + '-' + this.data.id2) as ID_of<this>;
      }`);
    }

    return ret.join("\n");
  }

  private getEdgeCode(): string {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return "";
    }
    /*
    outbound edges
    - through a field on self: field edge
    - to self type: should have been a junction edge?
      - not yet supported, ask user to declare a standalone junction
      - could be an edge stored in a different system or a junction edge.
    - through a field on other: foreign key edge
    - to a other type: should have been a junction edge?
      - not yet supported, ask user to declare a standalone edge
      - could be an edge stored in a different system or a junction edge.

    inbound edges:
    - through a field on self
      - foreign key
    - through a field on other
      - foreign key
    - from self
      - see outbound `to self type`
    - from other type
      - see outbound `to other type`
    */

    return Object.values(schema.extensions.outboundEdges?.edges || {})
      .map((edge) => {
        let emptyReturnCondition = "";
        if (edge.type === "edge") {
          const column = edge.throughOrTo.column;
          if (
            column != null &&
            edge.throughOrTo.type === this.schema.name &&
            fieldFn.isNullable(this.schema.fields[column])
          ) {
            emptyReturnCondition = `if (this.${column} == null) {
              return ${edgeFn.queryTypeName(schema, edge)}.empty();
            }`;
          }
        }

        const e = edgeFn.dereference(edge, this.edges);

        if (e.type === "standaloneEdge") {
          return `query${upcaseAt(edge.name, 0)}(): ${edgeFn.queryTypeName(
            schema,
            e
          )} {
            return ${nodeFn.queryTypeName(
              schema.name
            )}.fromId(this.id as any).query${upcaseAt(edge.name, 0)}();
          }`;
        }

        return `query${upcaseAt(edge.name, 0)}(): ${edgeFn.queryTypeName(
          schema,
          e
        )} {
          ${emptyReturnCondition}
          return ${edgeFn.queryTypeName(
            schema,
            e
          )}.${this.getFromMethodInvocation("outbound", e)};
        }`;
      })
      .join("\n");

    // TODO: static inbound edge defs
  }

  private getOneToOneGenCode(): string {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return "";
    }

    return Object.values(schema.extensions.outboundEdges?.edges || {})
      .filter((e): e is EdgeDeclaration => edgeFn.isFieldEdge(schema, e))
      .map((e) => {
        const required = edgeFn.isRequiredFieldEdge(schema, e);
        const destTypeName = edgeFn.destModelTypeName(schema, e);
        const returnType = `${destTypeName}${required ? "" : "| null"}`;

        // can't `modelGenMemo` this until we have a way to clear memoized results based
        // upon modifications of the id fields these reference.
        return `async gen${upcaseAt(e.name, 0)}(): Promise<${returnType}> {
          const existing = config.cache.get(this.${
            e.throughOrTo.column
          }, ${destTypeName}Spec.storage.db, ${destTypeName}Spec.storage.tablish);
          if (existing != null) {
            return existing;
          }
          return await this.query${upcaseAt(e.name, 0)}().gen${
          required ? "x" : ""
        }OnlyValue();
        }`;
      })
      .join("\n\n");
  }

  // inbound edges would be static methods
  private getFromMethodInvocation(
    type: "inbound" | "outbound",
    edge: EdgeDeclaration | EdgeReferenceDeclaration
  ): string {
    if (type === "inbound") {
      throw new Error("inbound edge generation on models not yet supported");
    }

    // outbound edge through a field would be:
    // outbound foreign key would be: BarQuery.fromFooId(this.id); // Foo | OB { Edge<Bar.fooId> }
    // outbound field edge would be: BarQuery.fromId(this.barId); // Foo | OB { Edge<Foo.barId> }

    switch (edge.type) {
      case "edge":
        const column = edge.throughOrTo.column;
        if (column == null) {
          // this error should already have been thrown earlier.
          throw new Error(
            `Locally declared edge (${JSON.stringify(
              edge
            )}) that is not _through_ something is currently unsupported`
          );
        }

        // through a field on self is a field edge
        // a field edge refers to the id of the destination type.
        if (edge.throughOrTo.type === this.schema.name) {
          return `fromId(this.${column})`;
        }

        // through a field on some other type is a foreign key edge
        // we're thus qurying that type based on some column rather than its id
        return `create().where${upcaseAt(column, 0)}(P.equals(this.id as any))`;
      case "edgeReference":
        // if (edge.inverted) {
        //   return "fromDst";
        // }
        return "fromSrc(this.id as any)";
    }
  }

  private getQueryAllMethodCode(): string {
    if (this.schema.storage.type === "ephemeral") {
      return "";
    }
    return `static queryAll(): ${nodeFn.queryTypeName(this.schema.name)} {
      return ${nodeFn.queryTypeName(this.schema.name)}.create();
    }`;
  }

  private getGenMethodCode(): string {
    if (
      this.schema.type === "standaloneEdge" ||
      this.schema.storage.type === "ephemeral"
    ) {
      return "";
    }
    return `static gen = modelGenMemo<${this.schema.name}, ${this.schema.name} | null>(
      "${this.schema.storage.db}",
      "${this.schema.storage.tablish}",
      (id: ID_of<${this.schema.name}>): Promise<${this.schema.name} | null> => this
            .queryAll()
            .whereId(P.equals(id)).genOnlyValue()
    );`;
  }

  private getGenxMethodCode(): string {
    if (
      this.schema.type === "standaloneEdge" ||
      this.schema.storage.type === "ephemeral"
    ) {
      return "";
    }
    return `static genx = modelGenMemo(
      "${this.schema.storage.db}",
      "${this.schema.storage.tablish}",
      (id: ID_of<${this.schema.name}>): Promise<${this.schema.name}> => this
            .queryAll()
            .whereId(P.equals(id)).genxOnlyValue(),
    );`;
  }
}
