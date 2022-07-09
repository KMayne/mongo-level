#!/bin/bash

# if test -f "ran-init"; then
#   echo "*** Already ran initial setup - skipping ***"
#   exit 0
# fi

echo "*** Running initial setup ***"

cat << EOF > /scripts/mongo-setup.mgo
const config = {
    "_id": "dbrs",
    "version": 1,
    "members": [
        {
            "_id": 1,
            "host": "mongo-server:27017",
            "priority": 1
        }
    ]
};
rs.initiate(config, { force: true });

use mongo-level-test;
db.createCollection('test-collection');
db.createUser({
  user: "test-user",
  pwd: "test-pass",
  roles: [{ role: "readWrite", db: "mongo-level-test" }]
});
rs.status();
EOF

mongo mongo-server:27017 < /scripts/mongo-setup.mgo && touch ran-init
