App = Ember.Application.create();

App.ApplicationAdapter = DS.RESTAdapter.extend({
  ajaxError: function(jqXHR) {
    var error = this._super(jqXHR);

    if (jqXHR && jqXHR.status === 401) {
      window.location = '/';
    } else {
      return error;
    }
  }
});

App.Router.map(function() {
  this.route('login');
  this.resource('todos');
});

// Login
App.IndexController = Ember.Controller.extend({
  actions: {
    login: function() {
      var register = this.get('register'),
          url = register ? '/register' : '/login';

      $.post(url, {
        username: this.get('username'),
        password: this.get('password')
      }).then(function() {
        this.transitionToRoute('todos');
      }.bind(this), function() {
        this.set('loginFailed', true);
      }.bind(this));
    }
  }
});

App.Todo = DS.Model.extend({
  created_at: DS.attr('date'),
  priority: DS.attr('number'),
  text: DS.attr('string'),

});

App.TodosRoute = Ember.Route.extend({
  model: function() {
    return this.store.find('todo');
  }
});

App.TodosController = Ember.ArrayController.extend({
  actions: {
    createTodo: function() {
      var text = (this.get('text') || '').trim(),
          todo;

      if (!text) {
        return;
      }

      todo = this.store.createRecord('todo', {
        text: text
      });

      todo.save();

      this.set('text', '');
    }
  },
  filtered: function() {
    return
  }
});

App.TodoController = Ember.ObjectController.extend({
  isEditing: false,
  priorities: [
    { value: 3, text: "High" },
    { value: 2, text: "Medium" },
    { value: 1, text: "Low" }
  ],
  actions: {
    editTodo: function() {
      this.set('isEditing', true);
    },
    updateTodo: function() {
      var text = this.get('text').trim(),
          priority = this.get('priority'),
          todo = this.get('model');

      todo.set('text', text);
      todo.set('priority', priority);

      if (!text) {
        todo.deleteRecord();
      }

      todo.save();

      this.set('isEditing', false);
    },
    cancelEdit: function() {
      this.set('isEditing', false);
    },
    removeTodo: function () {
      var todo = this.get('model');

      todo.deleteRecord();
      todo.save();
    }
  },
  priorityLabel: function() {
    var i,
        priority = this.get('model.priority');

    if (priority < 1) {
      priority = 1;
    } else if (priority > 3) {
      priority = 3;
    }

    for (i = 0; i < this.priorities.length; i++) {
      if (priority === this.priorities[i].value) {
        return this.priorities[i].text;
      }
    }

    return 'Low';
  }.property('model.priority')
});
