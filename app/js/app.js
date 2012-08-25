var App = Em.Application.create({
    ApplicationView: Em.View.extend({
        templateName: 'application'
    }),
    ApplicationController: Em.Controller.extend({
    }),
    SetupView: Em.View.extend({
        templateName: 'setup'
    }),
    Router: Em.Router.extend({
        enableLogging: true,
        root: Em.Route.extend({
            index: Em.Route.extend({
                route: '/',
                redirectsTo: 'modeSetup'
            }),
            modeSetup: Em.Route.extend({
                route: '/modeSetup',
                connectOutlets: function(router) {
                    console.log("connecting");
                    router.get('applicationController').connectOutlet('setup');
                }
            }),
            voteSetup: Em.Route.extend({
                route: '/voteSetup',
            }),
            voteRunning: Em.Route.extend({
                route: '/voteRunning',
            }),
            voteClosed: Em.Route.extend({
                route: '/voteClosed',
            })
        })
    }),
});

App.initialize();
