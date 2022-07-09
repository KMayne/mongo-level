import { AbstractLevel, NodeCallback } from 'abstract-level';
import ModuleError from 'module-error';
import { Collection, Filter, MongoClient } from 'mongodb';
import * as AbstractTypes from './abstract-level-types';
import { IteratorOptions, LevelRecord, MongoLevelOptions } from './abstract-level-types';
import { MongoIterator } from './MongoIterator';

type KDefault = string
type VDefault = string

export class MongoLevel extends AbstractLevel<string, KDefault, VDefault> {
  private collectionName: string;
  private client: MongoClient;
  private collection: Collection<Record<KDefault, VDefault>> | undefined;

  constructor(location: string, options: MongoLevelOptions<KDefault, VDefault>) {
    const encodings = { utf8: true };
    super({ encodings, snapshots: false, createIfMissing: true, errorIfExists: true }, options);

    this.collectionName = location || 'mongo-level';
    this.client = new MongoClient(options.mongoUri);
  }

  _open({ createIfMissing, errorIfExists }: AbstractTypes.DatabaseOpenOptions, callback: NodeCallback<void>) {
    this.client.connect().then(async () => {
      const db = this.client.db()
      const adminDb = db.admin();
      // Verify that we can connect to the admin DB and the target DB
      await adminDb.command({ ping: 1 });
      await db.command({ ping: 1 });
      const collectionExists = (await db.listCollections({ name: this.collectionName }).toArray()).some(c => c.name === this.collectionName);
      if (collectionExists && errorIfExists) {
        throw new ModuleError('errorIfExists flag set to true but MongoDB collection already exists', {
          code: 'LEVEL_DATABASE_NOT_OPEN'
        });
      } else if (!collectionExists) {
        if (createIfMissing) {
          await db.createCollection(this.collectionName);
        } else {
          throw new ModuleError('Mongo collection does not exist and createIfMissing is not set', {
            code: 'LEVEL_DATABASE_NOT_OPEN'
          });
        }
      }
      this.collection = db.collection(this.collectionName);
    }).then(() => callback(null))
      .catch(err => callback(err));
  }

  _close(callback: NodeCallback<void>) {
    this.client.close()
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  _get(key: KDefault, _options: AbstractTypes.EncodingOptions, callback: NodeCallback<VDefault>) {
    this._getCollection().findOne<Record<KDefault, VDefault>>({ _id: key })
      .then(async result => {
        if (result !== null) {
          callback(null, result.value);
        } else {
          throw new ModuleError(`Key ${key} was not found`, { code: 'LEVEL_NOT_FOUND', });
        }
      }).catch(err => callback(err));
  }

  _getMany(keys: KDefault[], _options: AbstractTypes.EncodingOptions, callback: NodeCallback<VDefault[]>) {
    const cursor = this._getCollection().find<Record<KDefault, VDefault>>({ _id: { $in: keys } });
    const docs: { [key: KDefault]: VDefault } = {};
    cursor.forEach(doc => { docs[doc._id] = doc.value; })
      .then(() => callback(null, keys.map(k => docs[k])))
      .catch(err => callback(err));
  }

  _put(key: KDefault, value: VDefault, _options: AbstractTypes.EncodingOptions, callback: NodeCallback<void>) {
    this._getCollection().updateOne({ _id: key }, { $set: { value } }, { upsert: true })
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  _del(key: KDefault, _options: AbstractTypes.KeyEncodingOptions, callback: NodeCallback<void>) {
    this._getCollection().deleteOne({ _id: key })
      .then(() => callback(null))
      .catch(err => callback(err));
  }

  _batch(
    operations: Array<AbstractTypes.DeleteOperation<KDefault> | AbstractTypes.PutOperation<KDefault, VDefault>>,
    _options: Object,
    callback: NodeCallback<void>) {
    const session = this.client.startSession();
    session.withTransaction(async session => {
      for (const op of operations) {
        if (op.type === 'del') {
          await this._getCollection().deleteMany({ _id: op.key }, { session });
        } else if (op.type === 'put') {
          await this._getCollection().updateOne({ _id: op.key }, { $set: { value: op.value } }, { upsert: true, session });
        }
      }
    }).then(() => callback(null))
      .catch(err => callback(err));
  }

  _iterator(options: IteratorOptions<KDefault>): MongoIterator<KDefault, VDefault> {
    const cursor = this._getCollection().find<LevelRecord<KDefault, VDefault>>(
      this._buildFilter(options),
      { sort: { _id: options.reverse ? -1 : 1 } });
    return new MongoIterator<KDefault, VDefault>(this, options, cursor);
  }

  _clear(options: AbstractTypes.ClearOptions<KDefault>, callback: NodeCallback<void>) {
    if (options.limit === -1) {
      this._getCollection().deleteMany(this._buildFilter(options))
        .then(() => callback(null))
        .catch(err => callback(err));
    } else {
      const iterator = this.iterator({ ...options, keyEncoding: 'utf8', valueEncoding: 'utf8', keys: true });
      const iteratorDelete = async () => {
        for await (const [key, _value] of iterator) {
          await this._getCollection().deleteOne({ _id: key });
        }
      }
      iteratorDelete()
        .then(() => callback(null))
        .catch(err => callback(err));
    }
  }

  private _getCollection(): Collection<Record<KDefault, VDefault>> {
    if (!this.collection) throw new ModuleError(`MongoLevel collection is undefined`, { code: 'LEVEL_DATABASE_NOT_OPEN' });
    return this.collection;
  }

  private _buildFilter(options: AbstractTypes.RangeOptions<KDefault>) {
    const idFilter = {} as Filter<Record<KDefault, VDefault>>;
    if (options.gt !== undefined) idFilter.$gt = options.gt;
    if (options.lt !== undefined) idFilter.$lt = options.lt;
    if (options.gte !== undefined) {
      idFilter.$gte = options.gte;
      delete idFilter.$gt;
    }
    if (options.lte !== undefined) {
      idFilter.$lte = options.lte;
      delete idFilter.$lt;
    }
    return Object.keys(idFilter).length > 0 ? { _id: idFilter } : {};
  }
}
