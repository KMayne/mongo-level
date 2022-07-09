import { NextCallback } from "abstract-level/types/abstract-iterator";
import { MongoLevel } from "./mongo-level"

import { AbstractIterator } from 'abstract-level';
import { FindCursor } from "mongodb";
import { IteratorOptions, LevelRecord } from "./abstract-level-types";

export class MongoIterator<K, V> extends AbstractIterator<MongoLevel, K, V> {
  private options: IteratorOptions<K>;
  private cursor: FindCursor<LevelRecord<K, V>>;
  private cursorComplete = false;

  constructor(db: MongoLevel, options: IteratorOptions<K>, cursor: FindCursor<LevelRecord<K, V>>) {
    super(db, options);
    this.options = options;
    this.cursor = cursor;
  }

  _next(callback: NextCallback<K, V>) {
    // Early return if we've seen all the documents
    if (this.cursorComplete) return callback(null, undefined, undefined);
    this.cursor.next().then(r => {
      if (r === null) {
        this.cursorComplete = true;
        callback(null, undefined, undefined);
      } else {
        callback(null, this.options.keys ? r._id : undefined, this.options.values ? r.value : undefined);
      }
    }).catch(err => callback(err));
  }
}
