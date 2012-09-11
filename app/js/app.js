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
        return stv.validate(STVDataBallot.fromGUI(this));
    }.property('empty', 'invalid', 'entries.@each.order'),
    checkNumbers: function() {
        this.set('touched', !this.get('entries').everyProperty('order', ''));
    }.observes('entries.@each.order'),
    addVoteAt: function (i) {
        var maxOrder = this.get('entries').reduce(function(p,e){
            return e.get('order') > p ? e.get('order') : p;
        },0);
        this.get('entries').objectAt(i).set('order', parseInt(maxOrder) + 1);
    },
});

Pile = Em.Object.extend({
    name: null,
    note: "", // "crosscheck"
    ballots: null,
    pileClosed: false,
    client: null,
    pileOpened: function () {
        return !this.get('pileClosed');
    }.property('pileClosed'),
    progress: function () {
        return this.get('ballots').content.length - 1;
    }.property('ballots', 'ballots.@each'),
    announceProgress: function() {
        if (App.router.get('applicationController').get('appMode') == 'client') {
            console.log("Change detected", this, this.get('ballots'));
            send_command('to_server', {command: "pile_change", data: {pile: STVDataPile.fromGUI(this)}});
        }
    }.observes('ballots', 'ballots.@each', 'pileClosed', 'client'),
    desc: function () {
        return this.get('name') + " " + this.get('note');
    }.property('name', 'note'),
    init: function() {
        this._super();
        this.set('ballots', Ballots.create({content: []}));
    },
    addBallot: function() {
        var bCount = this.get('ballots').content.length;
        this.get('ballots').pushObject(Ballot.create({index: bCount}));
    },
    newBallotsCreator: function() {
        var bCount = this.get('ballots').content.length;
        if (bCount > 0) {
            var lastB = this.get('ballots').objectAt(bCount - 1);
            if (lastB.invalid || lastB.empty || lastB.touched) {
                this.addBallot();
            }
        }
        else {
            this.addBallot();
        }
    }.observes('ballots', 'ballots.@each.touched', 'ballots.@each.invalid', 'ballots.@each.empty'),
    lastIncompleteBallot: function () {
        var bCount = this.get('ballots').content.length;
        if (bCount == 1) {
            return this.get('ballots').objectAt(bCount - 1);
        }
        var lastFilled = this.get('ballots').objectAt(bCount - 2);
        if (lastFilled.get('entries').someProperty('order', '') && !lastFilled.get('empty') && !lastFilled.get('invalid')) {
            return lastFilled;
        }
        else    {
            return this.get('ballots').objectAt(bCount - 1);
        }
    },
});

PileGroup = Em.ArrayProxy.extend({
    ready: function() {
        return this.every(function(item) {return item.get('pileClosed')}) &&
        stv.crosscheck(STVDataPileGroup.fromGUI(this)).status == 'ok';
    }.property('content.@each.pileClosed'),
    toString: function() {
        if (this.content.objectAt(0)) return this.content.objectAt(0).get('name');
        return "empty pileGroup";
    },
    crosscheckstatus: function() {
        if (this.every(function(item) {return !item.get('pileClosed')})) {
            return "_Open".loc();
        }
        else if (this.every(function(item) {return item.get('pileClosed')})) {
            return stv.crosscheck(STVDataPileGroup.fromGUI(this)).message;
        }
        else {
            return "_Partial".loc();
        }
    }.property('content.@each.pileClosed'),
    openPiles: function() {
        if (this.every(function(item) {return !item.get('pileClosed')})) {
            return "disabled";
        }
        else {
            return false;
        }
    }.property('content.@each.pileClosed'),
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

Client = Em.Object.extend({
    host: null,
    port: null,
    name: null,
    pilesCaptions: null,
    last_alive: null,
    init: function() {
        this._super();
        this.set('last_alive', new Date());
        this.set('pilesCaptions', Em.ArrayProxy.create({content: []}));
    },
});

/* CONTROLLERS */
App.ApplicationController = Em.Controller.extend({
    appState: null, // 0: setup, 1: vote spec, 2: vote running, 3: vote finished
    appMode: null,
    userName: '',
    tabs: null,
    clients: null,
    isServerMode: function() {
        return this.get('appMode') == 'server';
    }.property('appMode'),
    tabsEnabled: function() {
        return this.get('appState') > 1;
    }.property('appState'),
    init: function() {
        this._super();
        this.set('tabs', Em.ArrayProxy.create({
            content: [
                Tab.create({desc: "_Start Vote".loc(),    tabAction: "voteSetup"}),
                Tab.create({desc: "_Vote Progress".loc(), tabAction: "voteRunning"}),
                Tab.create({desc: "_Ballot Typing".loc(), tabAction: "typing"}),
             ]
        }));
        this.set('clients', Em.ArrayProxy.create({content: []}));
    },
});
App.AppSetupController = Em.Controller.extend({
    buttons: [
       {ba: 'client',     desc: '_Join the committee'.loc()},
       {ba: 'server',     desc: '_Host ballots'.loc()},
       {ba: 'standalone', desc: '_Standalone mode'.loc()},
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
    genders: ['---','_Female'.loc(),'_Male'.loc()],
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
        while (--i > 0) {
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
    appStateBinding: 'App.router.applicationController.appState',
    pileGroups: null,
    init: function() {
        this._super();
        this.set('pileGroups', PileGroups.create({content: []}));
    },
    isRunning: function() {
        return this.get('appState') == 2 ? "disabled" : false;
    }.property('appState'),
    updatePileExternally: function(pile) {
        var affected_pile = find_pile(this.get('pileGroups'), pile);
        affected_pile.set('pileClosed', pile.pileClosed);
        affected_pile.set('ballots', STVDataPile.toGUI(pile).get('ballots'));
    }
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
    init: function() {
        this.set('currentPileCaption', this.get('pilesCaptions')[0]);
    },
});

App.ConnectingController = Em.Controller.extend({
    userNameBinding: 'App.router.applicationController.userName',
    searching: null,
    server_ip: null,
    findServers: function() {
       send_command('search_servers', this.get('searching'));
    }.observes('searching'),
    joinSession: function() {
        send_command('connect_to_host', {
            server_ip: this.get('server_ip'),
            name: this.get('userName')
        });
    }
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
                var ac = router.get('applicationController');
                ac.set('appState', 2);
                var pileGroups = router.get('voteRunningController').get('pileGroups');
                pileGroups.clear();
                if (ac.get('appMode') == 'standalone') {
                    pileGroups.pushObject(PileGroup.create({
                      content: [
                        Pile.create({
                            name: ac.get('userName'),
                        }),
                        Pile.create({
                            name: ac.get('userName'),
                            note: "_crosscheck".loc(),
                        })
                    ]}));
                }
                else {
                    var crosscheck_map = create_derranged_map(ac.get('clients'));
                    ac.get('clients').forEach(function (client) {
                        pileGroups.pushObject(PileGroup.create({
                          content: [
                            Pile.create({
                                name: client.name,
                                client: client,
                            }),
                            Pile.create({
                                name: client.name,
                                note: "(" + "_filled by".loc() + crosscheck_map[client].name  + ")",
                                client:  crosscheck_map[client],
                            })
                        ]}));
                    });
                    var candidates = router.get('voteSetupController').get('candidates');
                    ac.get('clients').forEach(function (client) {
                        send_command('to_client', {client: client, content: {command: "set_candidates", content: candidates.content}});
                    });
                    pileGroups.forEach(function(pileGroup) {
                        pileGroup.forEach(function(pile) {
                            send_command('to_client', {client: pile.client, content: {command: "create_pile", content: STVDataPile.fromGUI(pile)}});
                        });
                    });
                }
                router.transitionTo('voteRunning');
            },
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('voteSetup');
            }
        }),
        voteRunning: Em.Route.extend({
            route: '/voteRunning',
            reopenAction: function(router, pileGroupEvent) {
                var pileGroup = pileGroupEvent.context;
                router.get('voteRunningController').get('pileGroups').forEach(function(item){
                    if (item === pileGroup) {
                        pileGroup.forEach(function(pile) {
                            pile.set('pileClosed', false);
                        });
                    }
                });
            },
            exportOstv: function(router) {
                //TODO export to BLT
            },
            exportProtocol: function(router) {
                //TODO export completed vote
            },
            printBallots: function(router) {
                //TODO print ballots
            },
            runSTV: function(router) {
                //TODO launch computation
            },
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
                //if (confirm("_Really clear this pile?".loc())) { //TODO can't confirm in App
                    router.get('typingController').get('currentPile').get('ballots').clear();
                //}
            },
            addBallot: function(router) {
                router.get('typingController').get('currentPile').addBallot();
            },
            done: function(router) {
                router.get('typingController').get('currentPile').set('pileClosed', true);
            },
            print: function(router) {
                //TODO export typing protocol
            },
            addVoteFor: function(router, candidate) {
                var cindex = candidate.context.get('index');
                var c = router.get('typingController');
                var p = c.get('currentPile');
                if (!p.get('pileClosed')) {
                    var lastB = p.lastIncompleteBallot();
                    if (lastB.get('entries').objectAt(cindex).get('order')) {
                         var bCount = p.get('ballots').content.length;
                         lastB = p.get('ballots').objectAt(bCount - 1);
                    }
                    lastB.addVoteAt(cindex);
                }
            },
        }),
        connect: Em.Route.extend({
            route: '/connect',
            joinSession: function(router) {
                router.get('connectingController').joinSession();
            },
            enter: function(router) {
                router.get('connectingController').set('searching', true);
            },
            connectOutlets: function(router) {
                router.get('applicationController').connectOutlet('connecting');
            }
        }),
        startServer: Em.Route.extend({
            route: '/server_start',
            enter: function(router) {
                console.log('Starting server');
                send_command("start_server");
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

Em.Handlebars.registerHelper('t', function(str) {
    return str.loc();
});

/* Non-emberjs functions */
function send_command(c, d) {
    console.log("Sending message", c, d);
    App.source.postMessage({
       command: c,
       data: d,
       socketId: App.socketId,
       server_host: App.router.get('connectingController').get('server_ip'),
    }, '*');
}

function handle_client_message(message) {
    var ac = App.router.get('applicationController');
    var client = ac.clients.find(function (item) {
        return item.host == message.address && item.port == message.port;
    });
    var data = ab2struct(message.data);
    console.log("Message from client", data);
    switch(data.command) {
        case 'hand_shake':
            client = Client.create({
                host: message.address,
                port: message.port,
                name: data.name,
            });
            ac.clients.pushObject(client);
            send_command('to_client', {client: client, content: {command: "accepted"}});
            break;
        case 'alive':
            client.set('last_alive', new Date())
            break;
        case 'pile_change':
            App.router.get('voteRunningController').updatePileExternally(data.data.pile);
            break;
        case 'disconnect':
            ac.clients.removeObject(client);
            break;
        default:
            console.warn(data);
    };
}

function handle_server_message(message) {
    var data = ab2struct(message.data);
    console.log("Message from server", data);
    switch(data.command) {
        case 'accepted':
            App.router.get('connectingController').set('searching', false);
            App.router.transitionTo('typing');
            break;
        case 'create_pile':
            var pgs = App.router.get('typingController').get('pileGroups');
            pgs.pushObject(PileGroup.create({
                content: [
                    STVDataPile.toGUI(data.content)
                ]
            }));
            break;
        case 'reopen_pile':
            // TODO
            break;
        case 'set_candidates':
            var c = App.router.get('voteSetupController').get('candidates');
            c.clear();
            c.pushObjects(data.content.map(function(item) {return Candidate.create(item);}));
            break;
        case 'disconnect':
            // TODO
            break;
        default:
            console.warn(data);
    };
}

function handle_request (data) {
    var command = data.command;
    switch(command) {
        case 'init':
            console.log("connection with background page initialized");
            break;
        case 'client_request':
            handle_client_message(data.message);
            break;
        case 'server_request':
            if (!App.socketId && data.socketId) {
               App.socketId = data.socketId; 
            }
            handle_server_message(data.message);
            break;
        default:
            console.warn(data);
    }
}

var messageHandler = function(e) {
  App.source = e.source;
  handle_request(e.data);
};

function ab2struct(buf) {
  return JSON.parse(String.fromCharCode.apply(null, new Uint16Array(buf)));
}

function struct2ab(struct) {
  var str = JSON.stringify(struct);
  var buf = new ArrayBuffer(str.length*2);
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function create_derranged_map(clients) {
    var m = {};
    var avail = clients.map(function(item) {return item;});
    var i = avail.length;
    while (--i > 0) {
        var j = Math.floor(Math.random() * i);
        var c = avail[i];
        avail[i] = avail[j];
        avail[j] = c;
    }
    clients.forEach(function(item, index) {
        m[item] = avail[index];
    });
    return m;
}

function find_pile(pileGroups, p) {
    var r;
    pileGroups.find(function (pileGroup) {
        return pileGroup.find(function (pile) {
            if (pile.get('name') == p.name && pile.get('note') == p.note) {
                r = pile;
                return true;
            }
            else {
                return false;
            }
        });
    });
    return r;
}

parent.addEventListener('message', messageHandler, false);
App.initialize();
