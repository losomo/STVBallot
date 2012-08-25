var App = Em.Application.create();

/*   MODELS  */
Candidate = Em.Object.extend({
    name: null,
    gender: null
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
    voteNo: null,
    candidateCount: null,
    mandateCount: null,
    ballotCount: null,
    replacements: null,
    genders: ['---','Female','Male'],
    updateCandidates: function() {
        var no = this.candidateCount;
        var current_no = App.candidatesController.content.length || 0;
        if (no > current_no) {
            for (var i = current_no; i < no; i++) {
                App.candidatesController.pushObject(Candidate.create({
                    name:   String.fromCharCode(65 + i),
                    gander: '---'
                }));
            }
        }
        else if (no < current_no) {
            for (var i = no; i < current_no; i++) {
                App.candidatesController.popObject();
            }
        }
    }.observes('candidateCount')
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
                start_server();
            },
            redirectsTo: 'voteSetup'
        }),
    })
});

/* Non-emberjs functions */
function start_server() {
    chrome.experimental.socket.create('udp', '225.0.0.37', 5353, { 
        onEvent: function(d) {
            var data = chrome.experimental.socket.read(d.socketId);
            console.log(data);
            }
        },
        function(socketInfo) {
          // The socket is created, now we want to connect to the service
          var socketId = socketInfo.socketId;
          chrome.experimental.socket.connect(socketId, function(result) {
            // We are now connected to the socket so send it some data
            chrome.experimental.socket.write(socketId, arrayBuffer,
              function(sendInfo) {
                console.log("wrote " + sendInfo.bytesWritten);
              }
            );
          });
        }
    );
}

App.initialize();
