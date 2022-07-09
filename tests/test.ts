#!/usr/bin/env node

import 'dotenv/config'
import test from 'tape';
import suite from 'abstract-level/test';
import { MongoLevel } from '../src/mongo-level';
import { AbstractDatabaseOptions } from 'abstract-level';
import { MongoClient } from 'mongodb';

function randString() { return (Math.random()).toString(36).substring(2); }

async function cleanupCollections() {
  console.log('Connecting for cleanup...');
  const mongo = await (new MongoClient(process.env.TEST_MONGO_URI)).connect();
  console.log('Connected. Cleaning up test collections...');
  const testCollections = await mongo.db().listCollections().toArray();
  await Promise.all(testCollections.filter(c => c.name !== 'test-collection')
    .map(col => mongo.db().dropCollection(col.name)));
  await mongo.close();
  console.log('Cleanup complete')
}

// Clean up collections before starting tests
cleanupCollections().then(() => {
  suite({
    test,
    factory(options: AbstractDatabaseOptions<string, string>) {
      if (!process.env.TEST_MONGO_URI || process.env.TEST_MONGO_URI === '') {
        throw new Error('TEST_MONGO_URI environment variable must be set to a valid MongoDB URI');
      }
      return new MongoLevel('mongo-level-test-' + randString(), { ...options, mongoUri: process.env.TEST_MONGO_URI });
    }
  });
  test('End tests', _ => { throw('Workaround for hanging tests'); });
});
