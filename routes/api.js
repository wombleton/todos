var async = require('async'),
    db = require('../lib/db');

module.exports = {
  register: function(req, res) {
    var password = req.body.password,
        username = req.body.username;

    async.waterfall([
      function(callback) {
        db.userExists(username, callback);
      },
      function(exists, callback) {
        if (exists) {
          return callback(409);
        }

        db.createUser(username, password, callback);
      },
      function(id, callback) {
        req.login({
          id: id
        }, function(err) {
          callback(err, id);
        });
      }
    ], function(err, id) {
      if (err) {
        return res.send(err);
      }

      res.send(200, id);
    });
  },
  listTodos: function(req, res) {
    if (req.isAuthenticated()) {
      db.listTodos(req.user.id, function(err, todos) {
        if (err) {
          return res.send(500, err);
        }

        res.json(200, {
          todos: todos
        });
      });
    } else {
      res.json(401, {
        error: 'Not authenticated.'
      });
    }
  },
  insertTodo: function(req, res) {
    var todo = req.body.todo || {};

    if (req.isAuthenticated()) {
      db.insertTodo({
        text: todo.text,
        user_id: req.user.id
      }, function(err, todo) {
        if (err) {
          return res.send(500, err);
        }
        res.send(200, {
          todo: todo
        });
      });
    } else {
      res.json(401, {
        error: 'Not authenticated.'
      });
    }
  },
  updateTodo: function(req, res) {
    var todo = req.body.todo || {};

    if (req.isAuthenticated()) {
      db.updateTodo({
        id: req.params.id,
        text: todo.text,
        priority: todo.priority,
        user_id: req.user.id
      }, function(err, change) {
        if (err) {
          return res.send(500, err);
        }

        res.send(200, {
          todo: change.new_val
        });
      });
    } else {
      res.json(401, {
        error: 'Not authenticated.'
      });
    }
  },
  removeTodo: function(req, res) {
    if (req.isAuthenticated()) {
      db.removeTodo({
        id: req.params.id,
        user_id: req.user.id
      }, function(err, id) {
        if (err) {
          return res.send(500, err);
        }

        res.send(200, null);
      });
    } else {
      res.json(401, {
        error: 'Not authenticated.'
      });
    }
  }
};
