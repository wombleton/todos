var bcrypt = require('bcrypt'),
    db = require('./db'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;

module.exports = function(app) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(function(username, password, done) {
    db.findUser(username, function(err, user) {
      if (err) {
        done(err);
      } else if (user) {
        bcrypt.compare(password, user.hash, function(err, matches) {
          if (err || !matches) {
            done(err, false, { message: 'Incorrect password.' });
          } else {
            done(null, user);
          }
        });
      } else {
        done(null, false, { message: 'Incorrect username.' });
      }
    });
  }));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    db.findUserById(id, done);
  });

  app.post('/login', passport.authenticate('local'), function(req, res) {
    res.send(200, req.user.id);
  });
};

