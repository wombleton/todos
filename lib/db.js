var async = require('async'),
    bcrypt = require('bcrypt'),
    conn,
    r = require('rethinkdb'),
    authKey = process.env.RETHINKDB_AUTH || undefined,
    host = process.env.RETHINKDB_HOST || 'localhost',
    port = process.env.RETHINKDB_PORT || 28015,
    database = process.env.RETHINKDB_DB || 'todos';

    // initialise the database & create tables
function init(callback) {
  r.connect({
    authKey: authKey,
    db: database,
    host: host,
    port: port
  }, function(err, connection) {
    if (err) {
      return callback(err);
    }

    conn = connection;

    r.dbCreate(database).run(conn, function(err) {
      if (err) {
        console.log('Database %s already exists. Continuing.', database);
      } else {
        console.log('Database %s created.', database);
      }

      async.forEach(['users', 'todos'], function(table, callback) {
        r.tableCreate(table, {
          primaryKey: 'id'
        }).run(conn, function(err) {
          if (err) {
            console.log('Table %s already exists. Continuing.', table);
          } else {
            console.log('Table %s created.', table);
          }
          callback();
        });
      }, function(err) {
        callback(err);
      });
    });
  });
}

function unroll(cursor, callback, options) {
  var results = [];

  options = options || {};

  async.whilst(function() {
    return cursor.hasNext();
  }, function(callback) {
    cursor.next(function(err, row) {
      if (err) {
        return callback(err);
      }

      results.push(row);
      callback();
    });
  }, function(err) {
    if (options.single) {
      callback(err, results[0]);
    } else {
      callback(err, results);
    }
  });
}

module.exports = {
  init: init,
  userExists: function(username, callback) {
    r.table('users').filter({
      username: username
    }).limit(1).run(conn, function(err, cursor) {
      callback(err, cursor && cursor.hasNext());
    });
  },
  findUser: function(username, callback) {
    r.table('users').filter({
      username: username
    }).limit(1).run(conn, function(err, cursor) {
      if (err) {
        return callback(err);
      }

      unroll(cursor, function(err, user) {
        callback(null, user);
      }, { single: true});
    });
  },
  findUserById: function(id, callback) {
    r.table('users').get(id).run(conn, callback);
  },
  createUser: function(username, password, callback) {
    async.waterfall([
      function(callback) {
        bcrypt.hash(password, 10, callback);
      },
      function(hash, callback) {
        var user = {
          created_at: new Date(),
          hash: hash,
          username: username
        };
        r.table('users').insert(user).run(conn, callback);
      }
    ], function(err, result) {
      callback(err, result && result.generated_keys && result.generated_keys[0]);
    });
  },
  listTodos: function(userId, callback) {
    r.table('todos').filter({
      user_id: userId
    }).orderBy(r.desc('priority'), 'created_at').run(conn, function(err, cursor) {
      if (err) {
        return callback(err);
      }

      unroll(cursor, function(err, todos) {
        callback(null, todos);
      });
    });
  },
  insertTodo: function(todo, callback) {
    todo.priority = 1;
    todo.created_at = new Date();

    async.waterfall([
      function(callback) {
        r.table('todos').insert(todo).run(conn, callback);
      },
      function(result, callback) {
        r.table('todos').get(result.generated_keys[0]).run(conn, callback);
      }
    ], function(err, newTodo) {
      callback(err, newTodo);
    });
  },
  removeTodo: function(options, callback) {
    async.waterfall([
      function(callback) {
        r.table('todos').get(options.id).run(conn, callback);
      },
      function(todo, callback) {
        if (!todo || todo.user_id !== options.user_id) {
          callback({
            error: "Todo not found."
          });
        } else {
          r.table('todos').get(options.id).delete().run(conn, callback);
        }
      }
    ], function(err, change) {
      callback(err, change);
    });
  },
  updateTodo: function(options, callback) {
    if (options.priority < 1) {
      options.priority = 1;
    } else if (options.priority > 3) {
      options.priority = 3;
    }

    if (!options.text.trim()) {
      return module.exports.removeTodo(options, callback);
    }

    async.waterfall([
      function(callback) {
        r.table('todos').get(options.id).run(conn, callback);
      },
      function(todo, callback) {
        if (!todo || todo.user_id !== options.user_id) {
          callback({
            error: "Todo not found."
          });
        } else {
          r.table('todos').get(options.id).update({
            text: options.text,
            priority: options.priority
          }, {return_vals: true}).run(conn, callback);
        }
      }
    ], function(err, change) {
      callback(err, change);
    });
  }
};
