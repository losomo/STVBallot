var App = Em.Application.create();

/*   MODELS  */
Candidate = Em.Object.extend({
    name: null,
    gender: null,
    toString: function () {
        return this.name + " (" + this.gender + ")";
    }
});

/* CONTROLLERS */
App.ApplicationController = Em.Controller.extend({
    appState: null, // 0: setup, 1: vote spec, 2: vote running, 3: vote finished
    appMode: null,
    userName: null,
});
App.AppSetupController = Em.Controller.extend({
    buttons: [
       {ba: 'client',     desc: 'Join the committee'},
       {ba: 'server',     desc: 'Host ballots'},
       {ba: 'standalone', desc: 'Standalone mode'},
    ],
    userNameBinding: 'App.applicationController.userName',
    btnState: function() {
        return this && this.get('userName') && this.get('userName').length > 2 ? false : "disabled";
    }.property('userName')
});
App.VoteSetupController = Em.Controller.extend({
    voteNo: 1,
    candidateCount: null,
    mandateCount: null,
    ballotCount: null,
    replacements: null,
    candidatesControllerBinding: 'App.candidatesController',
    genders: ['---','Female','Male'],
    updateCandidates: function() {
        var no = this.candidateCount;
        var current_no = App.candidatesController.content.length || 0;
        if (no > current_no) {
            for (var i = current_no; i < no; i++) {
                App.candidatesController.pushObject(Candidate.create({
                    name:   String.fromCharCode(65 + i),
                    gender: '---'
                }));
            }
        }
        else if (no < current_no) {
            for (var i = no; i < current_no; i++) {
                App.candidatesController.popObject();
            }
        }
    }.observes('candidateCount'),
    launchState: function() {
        if (this.get('voteNo') > 0 && this.get('candidateCount') > 0 && this.get('mandateCount') > 0 && this.get('ballotCount') > 0) {
            var problem = false;
            this.get('candidatesController').forEach (function(item) {
                if (item.get("name").length < 1) {
                    problem = true;
                    return;
                }
            });
            return problem ? 'disabled' : false;
        }
        else {
            return "disabled";
        }
    }.property('voteNo', 'candidateCount', 'mandateCount', 'ballotCount', 'candidatesController.@each.name'),
    shuffled: false,
    shuffle: function() {
        var c = this.get('candidatesController');
        var i = c.content.length;
        while (--i) {
            var j = Math.floor(Math.random() * (i + 1));
            var oi = c.objectAt(i);
            var oj = c.objectAt(j);
            var iname = oi.get('name');
            var igeneder = oi.get('gender');
            oi.set('name', oj.get('name'));
            oi.set('gender', oj.get('gender'));
            oj.set('name', iname);
            oj.set('gender', igeneder);
        }
        this.set('shuffled', "disabled");
    }
});

App.candidatesController = Em.ArrayController.create({
    content: [],
});

App.VoteRunningController = Em.Controller.extend({
});

App.TypingController = Em.Controller.extend({
});

App.ConnectingController = Em.Controller.extend({
});

/*  VIEWS  */
App.AppSetupView = Em.View.extend({
    templateName: 'app-setup'
});
App.ApplicationView = Em.View.extend({
    templateName: 'application'
});
App.VoteSetupView = Em.View.extend({
    templateName: 'vote-setup',
});

App.VoteRunningView = Em.View.extend({
    templateName: 'vote-running',
});

App.TypingView = Em.View.extend({
    templateName: 'typing',
});

App.ConnectingView = Em.View.extend({
    templateName: 'connecting',
});

/* ROUTING */
App.Router = Em.Router.extend({
    enableLogging: true,
    root: Em.Route.extend({
        index: Em.Route.extend({
            route: '/',
            redirectsTo: 'modeSetup'
        }),
        modeSetup: Em.Route.extend({
            route: '/modeSetup',
            start: function(router, mode){
                router.get('applicationController').appMode = mode.context;
                if (mode.context == 'client') {
                    router.transitionTo('connect');
                }
                else if (mode.context == 'server'){
                    router.transitionTo('startServer');
                }
                else {
                    router.transitionTo('voteSetup');
                }
            },
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('appSetup');
            }
        }),
        voteSetup: Em.Route.extend({
            route: '/voteSetup',
            shuffle: function(router) {
                router.get('voteSetupController').shuffle();
            },
            launch: function(router) {
                router.transitionTo('voteRunning');
            },
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('voteSetup');
            }
        }),
        voteRunning: Em.Route.extend({
            route: '/voteRunning',
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('voteRunning');
            }
        }),
        typing: Em.Route.extend({
            route: '/typing',
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('typing');
            }
        }),
        connect: Em.Route.extend({
            route: '/connect',
            joinSession: function(router) {
                router.transitionTo('typing');
            },
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('connecting');
            }
        }),
        startServer: Em.Route.extend({
            route: '/server_start',
            enter: function(router) {
                console.log('Starting server');
                command("start_server");
            },
            redirectsTo: 'voteSetup'
        }),
    })
});

/* Non-emberjs functions */
function command(c) {
    App.source.postMessage({
       command: c,
    }, '*');
}

function handle_request (data) {
    var command = data.command;
    switch(command) {
        case 'init':
            console.log("connection with background page initialized");
            break;
    }
}

var messageHandler = function(e) {
  App.source = e.source;
  handle_request(e.data);
};

parent.addEventListener('message', messageHandler, false);
App.initialize();
