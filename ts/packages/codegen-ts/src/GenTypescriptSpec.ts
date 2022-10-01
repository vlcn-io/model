import { CodegenFile, CodegenStep, generatedDir } from "@vulcan.sh/codegen-api";
import { edgeFn, fieldFn, nodeFn, tsImport } from "@vulcan.sh/schema";
import {
  SchemaEdge,
  EdgeDeclaration,
  EdgeReferenceDeclaration,
  Import,
  SchemaNode,
  Field,
  FieldDeclaration,
} from "@vulcan.sh/schema-api";
import * as path from "path";
import { importsToString } from "./tsUtils.js";
import TypescriptFile from "./TypescriptFile.js";

export default class GenTypescriptSpec extends CodegenStep {
  static accepts(_schema: SchemaNode | SchemaEdge): boolean {
    return true;
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

  async gen(): Promise<CodegenFile> {
    const imports = this.collectImports();
    return new TypescriptFile(
      path.join(generatedDir, this.schema.name + "Spec.ts"),
      `${importsToString(imports)}

${this.getSpecCode()}
`
    );
  }

  private getSpecCode(): string {
    let primaryKeyCode = "";
    let sourceDestFields = "";
    const nodeOrEdge = this.schema.type === "node" ? "Node" : "Edge";
    if (this.schema.type === "node") {
      primaryKeyCode = `primaryKey: '${this.schema.primaryKey}',`;
    } else {
      sourceDestFields = `
        sourceField: "id1",
        destField: "id2",
        get source() { return ${nodeFn.specName(this.schema.src.type)}; },
        get dest() { return ${nodeFn.specName(
          this.schema.dest.type,
          this.schema.name
        )}; },
      `;
    }

    return `const fields = ${this.getFieldSpecCode()};
const ${nodeFn.specName(this.schema.name)}: ${nodeOrEdge}SpecWithCreate<${
      this.schema.name
    }, Data> = {
      type: '${this.schema.type === "node" ? "node" : "junction"}',
      
  hydrate(data: Data) {
    ${this.getHydrateBody()}
  },

  create(data: Data) {
    ${this.getCreateBody()}
  },

  ${primaryKeyCode}
  ${sourceDestFields}

  storage: {
    engine: "${this.schema.storage.engine}",
    db: "${this.schema.storage.db}",
    type: "${this.schema.storage.type}",
    tablish: "${this.schema.storage.tablish}",
  },

  fields,

  ${this.getOutboundEdgeSpecCode()}
};

export default ${nodeFn.specName(this.schema.name)};
`;
  }

  private getHydrateBody(): string {
    if (this.schema.storage.type === "ephemeral") {
      return `return new ${this.schema.name}(data);`;
    }

    return `return PersistedModel.hydrate(${this.schema.name}, data)`;
  }

  private getCreateBody(): string {
    if (this.schema.storage.type === "ephemeral") {
      return `return new ${this.schema.name}(data);`;
    }

    return `return AsyncPersistedModel.createOrUpdate(${this.schema.name}, data)`;
  }

  private collectImports(): Import[] {
    return [
      tsImport("{PersistedModel}", null, "@vulcan.sh/runtime"),
      tsImport("{AsyncPersistedModel}", null, "@vulcan.sh/runtime"),
      tsImport("{ID_of}", null, "@vulcan.sh/runtime"),
      this.schema.type === "node"
        ? tsImport("{NodeSpecWithCreate}", null, "@vulcan.sh/runtime")
        : tsImport("{EdgeSpecWithCreate}", null, "@vulcan.sh/runtime"),
      ...this.getEdgeImports(),
      tsImport(this.schema.name, null, `../${this.schema.name}.js`),
      tsImport("{Data}", null, `./${this.schema.name}Base.js`),
      tsImport(
        "{default}",
        nodeFn.specName(this.schema.name),
        `./${nodeFn.specName(this.schema.name)}.js`
      ),
    ].filter((i) => i.as !== nodeFn.specName(this.schema.name));
  }

  private getOutboundEdgeSpecCode(): string {
    if (this.schema.type === "standaloneEdge") {
      return "";
    }
    return `outboundEdges: {
      ${Object.values(this.schema.extensions.outboundEdges?.edges || [])
        .map((edge) => edge.name + ": " + this.getSpecForEdge(edge))
        .join(",\n")}
      }`;
  }

  private getFieldSpecCode(): string {
    return `{
      ${Object.values(this.schema.fields)
        .map((field) => field.name + ": " + this.getSpecForField(field))
        .join(",\n")}
    } as const`;
  }

  private getSpecForField(field: FieldDeclaration): string {
    return `{
      encoding: "${fieldFn.encoding(field)}",
    }`;
  }

  private getSpecForEdge(
    edge: EdgeDeclaration | EdgeReferenceDeclaration
  ): string {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return "";
    }
    // reference declaration would just reference the generated junction spec
    // and otherwise we declare an inline spec
    const e = edgeFn.dereference(edge, this.edges);
    const edgeType = edgeFn.outboundEdgeType(schema, e);
    const sourceField = edgeFn.outboundEdgeSourceField(schema, e).name;
    const destField = edgeFn.outboundEdgeDestFieldName(schema, e);
    const sourceFn = `get source() { return ${nodeFn.specName(
      this.schema.name
    )}; }`;
    const destType = edgeFn.destModelSpecName(schema, e);
    const destFn = `get dest() { return ${destType}; }`;

    switch (edgeType) {
      case "field":
        return `{
          type: '${edgeType}',
          sourceField: '${sourceField}',
          destField: '${destField}',
          ${sourceFn},
          ${destFn},
        }`;
      case "junction":
        const storageConfig = edgeFn.storageConfig(e);
        // TODO: we should be importing the standalone edge spec!
        // return this or import a standalone generated junction edge def?
        return `{
          type: '${edgeType}',
          storage: {
            type: "${storageConfig.type}",
            engine: "${storageConfig.engine}",
            db: "${storageConfig.db}",
            tablish: "${storageConfig.tablish}",
          },
          fields: {},
          sourceField: '${sourceField}',
          destField: '${destField}',
          ${sourceFn},
          ${destFn},
        }`;
      case "foreignKey":
        return `{
          type: '${edgeType}',
          sourceField: '${sourceField}',
          destField: '${destField}',
          ${sourceFn},
          ${destFn},
        }`;
    }
  }

  private getEdgeImports(): Import[] {
    const schema = this.schema;
    if (schema.type === "standaloneEdge") {
      return [
        tsImport(
          "{default}",
          nodeFn.specName(schema.src.type),
          `./${nodeFn.specName(schema.src.type)}.js`
        ),
        tsImport(
          "{default}",
          nodeFn.specName(schema.dest.type),
          `./${nodeFn.specName(schema.dest.type)}.js`
        ),
      ];
    }
    const outbound = Object.values(
      schema.extensions.outboundEdges?.edges || {}
    ).map((e) => edgeFn.dereference(e, this.edges));
    return outbound
      .filter((edge) => edgeFn.destModelTypeName(schema, edge) !== schema.name)
      .map((edge) =>
        tsImport(
          "{default}",
          `${edgeFn.destModelSpecName(schema, edge)}`,
          `./${edgeFn.destModelSpecName(schema, edge)}.js`
        )
      );
  }
}
