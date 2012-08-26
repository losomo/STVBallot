var App = Em.Application.create();
var stv = new STV();

/*   MODELS  */
Candidates = Em.ArrayProxy.extend({});

Candidate = Em.Object.extend({
    name: null,
    gender: null,
    index: null,
    toString: function () {
        return this.index + " ~ " + this.name + " (" + this.gender + ")";
    }
});

BEntry = Em.Object.extend({
    order: "",
});

BEntries = Em.ArrayProxy.extend({});

Ballots = Em.ArrayProxy.extend({});

Ballot = Em.Object.extend({
    invalid: null,
    empty: null,
    entries: null,
    touched: null,
    index: null, // no builtin #each_with_index in handlebars
    init: function() {
        this._super();
        var candidates = App.router.get('voteSetupController').get('candidates');
        this.set('entries', BEntries.create({content: candidates.map(function(candidate) {
            return BEntry.create();
        })}));
        this.set('invalid', false);
        this.set('empty', false);
    },
    errorMessage: function() {
        return stv.validate(this);
    }.property('empty', 'invalid', 'entries.@each.order'),
    checkNumbers: function() {
        this.set('touched', !this.get('entries').everyProperty('order', ''));
    }.observes('entries.@each.order'),
});

Pile = Em.Object.extend({
    name: null,
    note: "", // "crosscheck"
    ballots: null,
    pileStatus: null,
    progress: function () {
        return this.get('ballots').content.length - 1;
    }.property('ballots', 'ballots.@each'),
    desc: function () {
        return this.get('name') + " " + this.get('note');
    }.property('name', 'note'),
    init: function() {
        this._super();
        this.set('ballots', Ballots.create({content: []}));
    },
    newBallotsCreator: function() {
        var bCount = this.get('ballots').content.length;
        if (bCount > 0) {
            var lastB = this.get('ballots').objectAt(bCount - 1);
            if (lastB.invalid || lastB.empty || lastB.touched) {
                this.get('ballots').pushObject(Ballot.create({index: bCount}));
            }
        }
        else {
            this.get('ballots').pushObject(Ballot.create({index: bCount}));
        }
    }.observes('ballots.@each.touched', 'ballots.@each.invalid', 'ballots.@each.empty'),
});

Piles = Em.ArrayProxy.extend({
    toString: function() {
        if (this.content.objectAt(0)) return this.content.objectAt(0).get('name');
        return "empty pileGroup";
    }
    crosscheckstatus: function() {
        return 'open'; //TODO crosscheck
    }.property('content.@each.pileStatus')
});

PileGroups = Em.ArrayProxy.extend({});

Tab = Em.Object.extend({
    currentStateBinding: 'App.router.currentState.name',
    appModeBinding: 'App.router.applicationController.appMode',
    desc: null,
    tabAction: null,
    currentClass: function() {
        if (this.get('appMode') == 'client'
         || this.get('appMode') == 'server' && this.get('tabAction') == 'typing') {
            return "navigation_hidden";
        }
        if (this.get('currentState') == this.get('tabAction')) {
            return "navigation_current";
        }
        return "navigation_active";
    }.property('currentState', 'appMode')
});


/* CONTROLLERS */
App.ApplicationController = Em.Controller.extend({
    appState: null, // 0: setup, 1: vote spec, 2: vote running, 3: vote finished
    appMode: null,
    userName: '',
    tabs: null,
    isServerMode: function() {
        return this.get('appMode') == 'server';
    }.property('appMode'),
    tabsEnabled: function() {
        return this.get('appState') > 1;
    }.property('appState'),
    init: function() {
         this.set('tabs', Em.ArrayProxy.create({
            content: [
                Tab.create({desc: "Start Vote",    tabAction: "voteSetup"}),
                Tab.create({desc: "Vote Progress", tabAction: "voteRunning"}),
                Tab.create({desc: "Ballot Typing", tabAction: "typing"}),
             ]
        }));
    },
});
App.AppSetupController = Em.Controller.extend({
    buttons: [
       {ba: 'client',     desc: 'Join the committee'},
       {ba: 'server',     desc: 'Host ballots'},
       {ba: 'standalone', desc: 'Standalone mode'},
    ],
    userNameBinding: 'App.router.applicationController.userName',
    btnState: function() {
        return (this.get('userName') && this.get('userName').length > 2) ? false : "disabled";
    }.property('userName')
});
App.VoteSetupController = Em.Controller.extend({
    voteNo: 1,
    candidateCount: null,
    mandateCount: 3,
    ballotCount: 8,
    replacements: null,
    candidates: null,
    genders: ['---','Female','Male'],
    updateCandidates: function() {
        var no = this.candidateCount;
        var current_no = this.get('candidates').content.length || 0;
        if (no > current_no) {
            for (var i = current_no; i < no; i++) {
                this.get('candidates').pushObject(Candidate.create({
                    name:   String.fromCharCode(65 + i),
                    gender: '---',
                    index: i,
                }));
            }
        }
        else if (no < current_no) {
            for (var i = no; i < current_no; i++) {
                this.get('candidates').popObject();
            }
        }
    }.observes('candidateCount'),
    launchState: function() {
        if (this.get('voteNo') > 0 && this.get('candidateCount') > 0 && this.get('mandateCount') > 0 && this.get('ballotCount') > 0) {
            var problem = false;
            this.get('candidates').forEach (function(item) {
                if (item.get("name").length < 1) {
                    problem = true;
                    return;
                }
            });
            // TODO check unique names, check gender consistency, candidates vs. mandates count, ballot count
            return problem ? 'disabled' : false;
        }
        else {
            return "disabled";
        }
    }.property('voteNo', 'candidateCount', 'mandateCount', 'ballotCount', 'candidates.@each.name'),
    shuffled: false,
    shuffle: function() {
        var c = this.get('candidates');
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
    },
    init: function() {
        this._super();
        this.set('candidates', Candidates.create({content: []}));
    }
});

App.VoteRunningController = Em.Controller.extend({
    pileGroups: null,
    init: function() {
        this._super();
        this.set('pileGroups', PileGroups.create({content: []}));
    },
});

App.TypingController = Em.Controller.extend({
    pileGroupsBinding: 'App.router.voteRunningController.pileGroups',
    candidatesBinding: 'App.router.voteSetupController.candidates',
    currentPileCaption: null,
    currentPile: function() {
        var cc = this.get('currentPileCaption');
        var ret = null;
        this.get('pileGroups').find(function(item){
            ret = item.findProperty('desc', cc);
            return ret;
        });
        return ret;
    }.property('currentPileCaption', 'pileGroups','pileGroups.@each'),
    pilesCaptions: function() {
        var a = [];
        this.get('pileGroups').forEach(function(item) {
            item.forEach(function(it){a.push(it.get('desc'))});
        });
        return a;
    }.property('pileGroups', 'pileGroups.@each'),
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
                router.get('applicationController').set('appMode', mode.context);
                router.get('applicationController').set('appState', 1);
                if (mode.context == 'client') {
                    router.transitionTo('connect');
                }
                else if (mode.context == 'server'){
                    router.transitionTo('startServer');
                }
                else { // standalone
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
                router.get('applicationController').set('appState', 2);
                var pileGroups = router.get('voteRunningController').get('pileGroups');
                pileGroups.clear();
                if (router.get('applicationController').get('appMode') == 'standalone') {
                    pileGroups.pushObject(Piles.create({ content: [
                        Pile.create({
                            name: router.get('applicationController').get('userName'),
                        }),
                        Pile.create({
                            name: router.get('applicationController').get('userName'),
                            note: "crosscheck",
                        })
                    ]}));
                }
                else { // TODO create piles in server mode
                }
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
            },
            clearTable: function(router) {
            },
            done: function(router) {
            },
            print: function(router) {
            },
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
        changeTab: function(router, newTab) {
            router.transitionTo(newTab.context);
        }
    })
});

Em.Handlebars.registerHelper('findBEntry', function(ca, ba, options) {
    var candidate = options.data.keywords[ca];
    var ballot = options.data.keywords[ba];
    var bentry = ballot.entries.objectAt(candidate.index);
    options.data.keywords.bentry = bentry;
    options.data.keywords.computedindex = ballot.get('index') + 2;
    return options.fn(this);
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
