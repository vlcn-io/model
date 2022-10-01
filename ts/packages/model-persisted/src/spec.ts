import { NodeSpec, JunctionEdgeSpec } from "@vulcan.sh/schema-api";
import { ID_of } from "@vulcan.sh/id";
import { IPersistedModel } from "./PersistedModel";

// TODO: update this to not require id. edges don't have a single id field for example.
// and users can define their own primary key field names
export type BasePersistedModelData = { id: ID_of<any> };

export type ModelCreate<
  M extends IPersistedModel<D>,
  D extends BasePersistedModelData
> = {
  // TODO: differentiate between async and sync model create
  create(data: D /*raw?: boolean*/): Promise<M>;
  hydrate(data: D): M;
};

export interface INode<T extends BasePersistedModelData>
  extends IPersistedModel<T> {
  readonly id: ID_of<this>;
  readonly spec: NodeSpecWithCreate<this, T>;
}

export interface IEdge<T extends BasePersistedModelData>
  extends IPersistedModel<T> {
  readonly spec: EdgeSpecWithCreate<this, T>;
}

export type NodeSpecWithCreate<
  M extends INode<D>,
  D extends BasePersistedModelData
> = ModelCreate<M, D> & NodeSpec;

export type EdgeSpecWithCreate<
  M extends IEdge<D>,
  D extends BasePersistedModelData
> = ModelCreate<M, D> & JunctionEdgeSpec;

export type ModelSpecWithCreate<
  M extends IPersistedModel<D>,
  D extends BasePersistedModelData
> = ModelCreate<M, D> & (NodeSpec | JunctionEdgeSpec);
