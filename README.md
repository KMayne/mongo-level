# mongo-level

![level badge](https://leveljs.org/img/badge.svg)


[mongo-level](https://www.npmjs.com/package/mongo-level) is an [abstract-level](https://github.com/Level/abstract-level) adapter for MongoDB. While it does pass all the abstract-level tests, it is not production ready yet.

To run the tests, run the Docker compose script to start up the test DB, create an env file with the test server URI and then run the npm tests as normal:
```
docker compose up
echo 'TEST_MONGO_URI=mongodb://test-user:test-pass@127.0.0.1:27017/mongo-level-test?replicaSet=dbrs' > .env
npm run test
```

For now, I have no plans to work on this further. I was originally going to use this to connect `yjs` to a MongoDB instance but the [y-LevelDb](https://github.com/yjs/y-leveldb) adapter is not compatible with LevelDB 8 and I didn't want to re-write that as well.
