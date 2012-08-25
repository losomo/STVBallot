(function() {

// A helper function to define routes for better code reuse
function tabRoute(name) {
  return Ember.Route.extend({
    route: name,
    connectOutlets: function(router, context) {
      var TabView = Ember.View.extend({
        templateName: 'tab' + name
      });
      router.get('TabsController').connectOutlet({viewClass: TabView});
    }
  });
}

// A helper function to define a property used to render the navigation. Returns
// true if a state with the specified name is somewhere along the current route.
function stateFlag(name) {
  return Ember.computed(function() {
    var state = App.router.currentState;
    while(state) {
      if(state.name === name) return true;
      state = state.get('parentState');
    }
    return false;
  }).property('App.router.currentState');
}

// Create the application
window.App = Ember.Application.create({

  // Define the main application controller. This is automatically picked up by
  // the application and initialized.
  ApplicationController: Ember.Controller.extend({
  }),
  ApplicationView: Ember.View.extend({
    templateName: 'application'
  }),

  SetupController: Ember.Controller.extend(),
  SetupView: Ember.View.extend({
    templateName: 'setup'
  }),

  TabsController: Ember.Controller.extend({
    isTabStart: stateFlag('tabStart'),
    isTabProgress: stateFlag('tabProgress'),
    isTabEnter: stateFlag('tabEnter')
  }),
  TabsView: Ember.View.extend({
    templateName: 'tabs'
  }),
  SetupChoice: Ember.View.extend({
    tagName: "button",
    attributeBindings: ['name'],
    click: function(event){
        App.mode = name;
        doTabStart();
    }
  }),

  Router: Ember.Router.extend({
    root: Ember.Route.extend({
      doSetup: function(router, event) {
        router.transitionTo('setup');
      },
      doTabs: function(router, event, x) {
        console.log(event, x);
        router.transitionTo('tabs.index');
      },
      setup: Ember.Route.extend({
        route: '/',
        connectOutlets: function(router, event) {
          router.get('applicationController').connectOutlet('setup');
        }
      }),
      tabs: Ember.Route.extend({
        route: '/tabs',
        connectOutlets: function(router, event) {
          router.get('applicationController').connectOutlet('tabs');
        },
        index: Ember.Route.extend({
          route: '/'
        }),
        doTabStart: function(router, event) { router.transitionTo('tabs.tabStart'); },
        tabStart: tabRoute('Start'),
        doTabProgress: function(router, event) { router.transitionTo('tabs.tabProgress'); },
        tabProgress: tabRoute('Progress'),
        doTabEnter: function(router, event) { router.transitionTo('tabs.tabEnter'); },
        tabEnter: tabRoute('Enter')
      })
    })
  })

});
    

$(function() {
App.initialize();
});

})();

/*
var App = Em.Application.create();

App.Router = Ember.Router.extend({
  root: Ember.State.extend({
    index: Ember.State.extend({
      route: '/',
      redirectsTo: 'setup.index'
    }),

    setup: Ember.State.extend({
      route: '/welcome',
    }),

    vote: Ember.State.extend({
        route: '/vote',

        index: Ember.State.extend({
          route: '/',
          redirectsTo: 'vote.start.index'
        }),

        start: Ember.State.extend({
          route: '/start',
        }),
        progress: Ember.State.extend({
          route: '/progress',
        }),
        enter: Ember.State.extend({
          route: '/enter',
        })
    })
  })
});
*/
