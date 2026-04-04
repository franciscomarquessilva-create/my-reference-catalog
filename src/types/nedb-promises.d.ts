declare module "nedb-promises" {
  export type DatastoreQuery<TDocument> = Partial<TDocument>;

  export interface DatastoreInstance<TDocument> {
    ensureIndex(options: { fieldName: keyof TDocument | string; unique?: boolean }): Promise<void>;
    count(query: DatastoreQuery<TDocument>): Promise<number>;
    find(query: DatastoreQuery<TDocument>): Promise<TDocument[]>;
    findOne(query: DatastoreQuery<TDocument>): Promise<TDocument | null>;
    insert(doc: TDocument): Promise<TDocument>;
    update(
      query: DatastoreQuery<TDocument>,
      update: Partial<TDocument> | TDocument,
      options: { upsert?: boolean }
    ): Promise<number>;
    remove(query: DatastoreQuery<TDocument>, options: Record<string, unknown>): Promise<number>;
  }

  const Datastore: {
    create<TDocument = Record<string, unknown>>(options: {
      filename: string;
      autoload?: boolean;
      inMemoryOnly?: boolean;
    }): DatastoreInstance<TDocument>;
  };

  export default Datastore;
}