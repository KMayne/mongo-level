import { AbstractDatabaseOptions } from "abstract-level";

export type Encoding = 'buffer' | 'view' | 'utf8'

export interface MongoLevelOptions<K, V> extends AbstractDatabaseOptions<K, V>
{
  mongoUri: string;
}

export interface DatabaseOpenOptions {
  createIfMissing: boolean;
  errorIfExists: boolean;
}

export interface EncodingOptions {
  keyEncoding: Encoding;
  valueEncoding: Encoding;
}

export interface KeyEncodingOptions {
  keyEncoding: Encoding;
}

interface Operation<KeyType> {
  type: 'put' | 'del';
  key: KeyType;
  keyEncoding: Encoding;
}

export interface DeleteOperation<KeyType> extends Operation<KeyType> {
  type: 'del';
}

export interface PutOperation<KeyType, ValueType> extends Operation<KeyType> {
  type: 'put';
  value: ValueType;
  valueEncoding: Encoding;
}

export interface RangeOptions<KeyType> {
  gt?: KeyType
  gte?: KeyType
  lt?: KeyType
  lte?: KeyType
}

export interface IteratorOptions<KeyType> extends EncodingOptions, RangeOptions<KeyType> {
  reverse: boolean;
  keys: boolean;
  values: boolean;
  limit: number;
}

export interface ClearOptions<KeyType> extends RangeOptions<KeyType> {
  reverse: boolean;
  keys: KeyType[];
  limit: number;
}

export interface LevelRecord<KeyType, ValueType> {
  _id: KeyType
  value: ValueType
}
