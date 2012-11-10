/*
 * Licensed to Václav Novák under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. ElasticSearch licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var App = Em.Application.create();
var stv = new STV();

/*   MODELS  */
Candidates = Em.ArrayProxy.extend({});

Candidate = Em.Object.extend({
    name: null,
    gender: null,
    index: null,
    acceptable_positions: null, // ArrayProxy of Objects with boolean flag
    toString: function () {
        return this.index + " ~ " + this.name + " (" + this.gender + ")";
    },
    init: function() {
        this.set('acceptable_positions', Em.ArrayProxy.create({content: []}));
    },
    setOrderedMandates: function(om) {
        var a = this.get('acceptable_positions');
        a.clear();
        if (om > 0) {
            for (var i = 0; i <= om; i++) {
                a.pushObject(Ember.Object.create({"accepted": true}));
            }
        }
    },
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
        if (!this.get('entries')) this.set('entries', BEntries.create({content: candidates.map(function(candidate) {
            return BEntry.create();
        })}));
    },
    index_1: function() {
        return 1 + this.get('index');
    }.property('index'),
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
    progressstyle: function () {
        var ccount = App.router.get('applicationController').get('clients').content.length || 1;
        var total = App.router.get('voteSetupController').get('ballotCount');
        var ret = this.get('pileClosed') ? "background: #DDD;" : "";
        ret += "width: " + Math.round((this.get('ballots').content.length - 1) / (total / ccount) * 100) + "%;";
        return ret;
    }.property('ballots', 'ballots.@each', 'pileClosed'),
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
        if (!this.get('ballots')) this.set('ballots', Ballots.create({content: []}));
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
            return {status: "open", message: "_Open".loc()};
        }
        else if (this.every(function(item) {return item.get('pileClosed')})) {
            return stv.crosscheck(STVDataPileGroup.fromGUI(this));
        }
        else {
            return {status: "partial", message: "_Partial".loc()};
        }
    }.property('content.@each.pileClosed'),
    statusimg: function() {
        var s = this.get('crosscheckstatus');
        switch (s.status) {
            case "open":
                return "img/gray.png";
            case "partial":
                return "img/yellow.png";
            case "ok":
                return "img/green.png";
            case "error":
                return "img/red.png";
        }
    }.property('crosscheckstatus'),
    openPiles: function() {
        if (App.router.get('applicationController').get('appState') != 2 || this.every(function(item) {return !item.get('pileClosed')})) {
            return "disabled";
        }
        else {
            return false;
        }
    }.property('content.@each.pileClosed')
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
    clients: null, //TODO diconnect clients manually in appState 0
    popup_msg: null,
    popup_action: null,
    isServerMode: function() {
        return this.get('appMode') == 'server';
    }.property('appMode'),
    tabsEnabled: function() {
        return this.get('appMode') == 'standalone' && this.get('appState') == 2;
    }.property('appState', 'appMode'),
    connectionsEnabled: function() {
        return this.get('appState') == 1;
    }.property('appState'),
    init: function() {
        this._super();
        this.set('tabs', Em.ArrayProxy.create({
            content: [
                Tab.create({desc: "_Vote Progress".loc(), tabAction: "voteRunning"}),
                Tab.create({desc: "_Ballot Typing".loc(), tabAction: "typing"}),
             ]
        }));
        this.set('clients', Em.ArrayProxy.create({content: []}));
    },
});
App.AppSetupController = Em.Controller.extend({
    buttons: [
       {ba: 'client',     desc: "_Join the committee".loc()},
       {ba: 'server',     desc: "_Host ballots".loc()},
       {ba: 'standalone', desc: "_Standalone mode".loc()},
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
    candidates: null,
    shuffled: null,
    m_max: null,
    f_max: null,
    orderedCount: null,
    genders: [{caption: '---', code: ''}, {caption: "_Female".loc(), code: 'F'},{caption: "_Male".loc(), code: 'M'}],
    updateCandidates: function() {
        var no = this.candidateCount;
        var current_no = this.get('candidates').content.length || 0;
        if (no > current_no) {
            for (var i = current_no; i < no; i++) {
                var candidate = Candidate.create({
                    name:   String.fromCharCode(65 + i),
                    gender: '',
                    index: i
                });
                candidate.setOrderedMandates(this.get('orderedCount'));
                this.get('candidates').pushObject(candidate);
            }
        }
        else if (no < current_no) {
            for (var i = no; i < current_no; i++) {
                this.get('candidates').popObject();
            }
        }
    }.observes('candidateCount'),
    updateOrderedMandates: function() {
        var vsc = this;
        vsc.get('candidates').forEach (function(candidate) {
                candidate.setOrderedMandates(vsc.get('orderedCount'));
        });
    }.observes('orderedCount'),
    launchState: function() {
        if (this.get('voteNo') != "" && parseInt(this.get('candidateCount')) > 0 && parseInt(this.get('mandateCount')) > 0 && parseInt(this.get('ballotCount')) > 0) {
            var names = {};
            var problem = false;
            var genders = (parseInt(this.get('m_max')) > 0 || parseInt(this.get('f_max')) > 0) ? true : false;
            this.get('candidates').forEach (function(item) {
                var name = item.get("name");
                var gender = item.get("gender");
                if (name.length < 1) {
                    problem = true;
                    return;
                }
                if (names[name]) problem = true;
                names[name] = true;

                if (gender && genders != (gender.code != '')) problem = true;
            });
            if (parseInt(this.get('candidateCount')) < parseInt(this.get('mandateCount'))) problem = true;
            if (parseInt(this.get('orderedCount')) > parseInt(this.get('mandateCount'))) problem = true;
            return problem ? 'disabled' : false;
        }
        else {
            return "disabled";
        }
    }.property('voteNo', 'candidateCount', 'mandateCount', 'ballotCount', 'candidates.@each.name', 'candidates.@each.gender', 'orderedCount', 'f_max', 'm_max'),
    shuffle: function() {
        var c = this.get('candidates');
        var i = c.content.length;
        while (--i > 0) {
            var j = Math.floor(Math.random() * (i + 1));
            var oi = c.objectAt(i);
            var oj = c.objectAt(j);
            var iname = oi.get('name');
            var igeneder = oi.get('gender');
            var iacceptable_positions = oi.get('acceptable_positions');
            oi.set('name', oj.get('name'));
            oi.set('gender', oj.get('gender'));
            oi.set('acceptable_positions', oj.get('acceptable_positions'));
            oj.set('name', iname);
            oj.set('gender', igeneder);
            oj.set('acceptable_positions', iacceptable_positions);
        }
        this.set('shuffled', true);
    },
    init: function() {
        this._super();
        this.set('candidates', Candidates.create({content: []}));
    },
    cantShuffle: function() {
        return !this.get('shuffled') && parseInt(this.get('candidateCount')) > 0 ? false : "disabled";
    }.property('shuffled', 'candidateCount')
});

App.VoteRunningController = Em.Controller.extend({
    appStateBinding: 'App.router.applicationController.appState',
    pileGroups: null,
    report: null,
    mandates: null,
    replacements: null,
    ballots_printed: null,
    init: function() {
        this._super();
        this.set('pileGroups', PileGroups.create({content: []}));
        this.set('report', "");
        this.set('mandates', Em.ArrayProxy.create({content: []}));
        this.set('replacements', Em.ArrayProxy.create({content: []}));
    },
    isRunning: function() {
        return this.get('appState') == 2 ? "disabled" : false;
    }.property('appState'),
    cantClose: function() {
        return this.get('appState') == 2 ?
        (this.get('pileGroups').every(function(g){
            return g.get('crosscheckstatus').status == "ok" || g.get('crosscheckstatus').status == "partial";
        }) ? false : "disabled")
        : "disabled";
    }.property('appState', 'pileGroups.@each.crosscheckstatus'),
    cantReset: function() {
        return this.get('appState') == 3 ? false : "disabled";
    }.property('appState'),
    updatePileExternally: function(pile) {
        var affected_pile = find_pile(this.get('pileGroups'), pile);
        affected_pile.set('ballots', STVDataPile.toGUI(pile).get('ballots'));
        affected_pile.set('pileClosed', pile.pileClosed);
    },
    report_append: function(msg) {
        this.set('report', this.get('report') + msg);
    },
    printBtnStyle: function() {
        return this.get('ballots_printed') ?
        "background: #DDDDDD;" :
        ""
    }.property('ballots_printed'),
});

App.TypingController = Em.Controller.extend({
    pileGroupsBinding: 'App.router.voteRunningController.pileGroups',
    candidatesBinding: 'App.router.voteSetupController.candidates',
    voteNoBinding: 'App.router.voteSetupController.voteNo',
    appStateBinding: 'App.router.applicationController.appState',
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
    obstruct_style: function () {
        return this.get('appState') == 2 ? "display: none;" : "position: absolute; top: 0%; left: 0%; width: 100%; height: 100%; background-color: black; z-index: 1001; opacity: .60";
    }.property('appState'),
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
            disconnect: function(router, client) {
                //TODO
            },
            launch: function(router) {
                var ac = router.get('applicationController');
                ac.set('appState', 2);
                var vrc = router.get('voteRunningController');
                vrc.set('report', "");
                vrc.get('mandates').clear();
                vrc.get('replacements').clear();
                var pileGroups = vrc.get('pileGroups');
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
                                note: "(" + "_filled by".loc() + " " + crosscheck_map[client].name  + ")",
                                client:  crosscheck_map[client],
                            })
                        ]}));
                    });
                    var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                    ac.get('clients').forEach(function (client) {
                        send_command('to_client', {client: client, content: {command: "set_setup", content: setup}});
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
                            if (pile.client) {
                                send_command('to_client', {client: pile.client, content: {command: "reopen_pile", content: STVDataPile.fromGUI(pile)}});
                            }
                        });
                    }
                });
            },
            exportOstv: function(router) {
                var pileGroups = router.get('voteRunningController').get('pileGroups');
                var groups = pileGroups.map(function (group) {return STVDataPileGroup.fromGUI(group);});
                var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                var title = "_Vote".loc() + "_" + setup.voteNo;
                send_command('download_data', {
                    header: "<pre>",
                    footer: "</pre>",
                    extension: "blt",
                    content: STVDataFormats.bltFromGroups(title, setup, groups),
                    title: title
                });
            },
            exportCase: function(router) {
                var pileGroups = router.get('voteRunningController').get('pileGroups');
                var groups = pileGroups.map(function (group) {return STVDataPileGroup.fromGUI(group);});
                var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                var mandates = router.get('voteRunningController').get('mandates').mapProperty('name');
                var replacements = router.get('voteRunningController').get('replacements');
                var title = "_Vote".loc() + "_" + setup.voteNo;
                send_command('download_data', {
                    header: "<pre>",
                    footer: "</pre>",
                    extension: "json",
                    content: STVDataFormats.jsonFromGroups(title, setup, groups, mandates, replacements),
                    title: title
                });
            },
            exportProtocol: function(router) {
                var vrc = router.get('voteRunningController');
                send_command('download_data', {
                   header: "",
                   footer: "",
                   extension: "html",
                   content: vrc.get('report'),
                   title: "",
                   print: true,
                });
            },
            printBallots: function(router) {
                var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                var title = "_Vote".loc() + ": " + setup.voteNo;
                send_command('download_data', {
                   header: "",
                   footer: "",
                   extension: "html",
                   content: print_ballots(setup, title),
                   title: title,
                   print: true,
                });
                router.get('voteRunningController').set('ballots_printed', true);
            },
            runSTV: function(router) {
                router.get('applicationController').set('appState', 3);
                var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                var vrc = router.get('voteRunningController');
                var pileGroups = vrc.get('pileGroups');
                var groups = pileGroups.map(function (group) {return STVDataPileGroup.fromGUI(group);});
                vrc.report_append("<h1>" + "_Vote".loc() + " " + setup.voteNo + "</h1>" +
                    "<p><em>" + new Date() + "</em> " + "_Computation started".loc() + "</p>");
                vrc.report_append(STVDataPileGroup.reportGroups(setup, groups, true));
                var ballots = STVDataBallot.combineGroups(groups);
                stv.run(setup, ballots, function(msg) {
                    //console.log(msg);
                    vrc.report_append(msg);
                },
                function(mandates, replacements) {
                    vrc.get('mandates').pushObjects(mandates);
                    vrc.get('replacements').pushObjects(replacements);
                    vrc.report_append("<p><em>" + new Date() + "</em> " + "_Computation done".loc() + ".</p>");
                });
            },
            resetAll: function(router) {
                var ac = router.get('applicationController');
                var vsc = router.get('voteSetupController');
                var n = vsc.get('voteNo');
                if (parseInt(n) > 0) {
                    n = parseInt(n) + 1;
                }
                else {
                    var m = /\d+$/;
                    var l = n.search(m);
                    if (l >= 0) {
                        var x = parseInt(n.match(m)[0]);
                        n = n.replace(m, x+1);
                    }
                    else {
                        n = n + " 2";
                    }
                }
                vsc.set('voteNo', n);
                ac.set('appState', 0);
                vsc.set('shuffled', false);
                router.get('voteRunningController').set('ballots_printed', false);
                router.transitionTo('voteSetup');
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
                var ac = router.get('applicationController');
                ac.set('popup_msg', "_Really clear this pile?".loc());
                ac.set('popup_action', function() {
                    router.get('typingController').get('currentPile').get('ballots').clear();
                });
                document.getElementById('black_overlay').style.display='block';
                document.getElementById('popup').style.display='block';
            },
            addBallot: function(router) {
                router.get('typingController').get('currentPile').addBallot();
            },
            done: function(router) {
                router.get('typingController').get('currentPile').set('pileClosed', true);
            },
            print: function(router) {
                var setup = STVDataSetup.fromGUI(router.get('voteSetupController'));
                var vrc = router.get('voteRunningController');
                var pileGroups = vrc.get('pileGroups');
                var groups = pileGroups.map(function (group) {return STVDataPileGroup.fromGUI(group);});
                var c = "<h1>" + "_Vote".loc() + " " + setup.voteNo + "</h1>" +
                    "<p><em>" + new Date() + "</em> " +
                    "<p>"+ "_Candidates".loc() + ":<ol><li>" + setup.candidates.map(function(c){return c.name;}).join("</li><li>") +
                    "</li></ol></p>" +
                    "_Data filled by ".loc() + " " +  router.get('applicationController').get('userName') + "</p>" +
                    STVDataPileGroup.reportGroups(setup, groups, false);
                send_command('download_data', {
                   header: "",
                   footer: "",
                   extension: "html",
                   content: c,
                   title:  "_Vote".loc() + " " + setup.voteNo,
                   print: true,
                });
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
    }),
    popupAct: function(router) {
        router.get('applicationController').get('popup_action')();
        document.getElementById('popup').style.display='none';
        document.getElementById('black_overlay').style.display='none';
    }
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
    window.parent.postMessage({
       command: c,
       data: d,
       socketId: App.socketId,
       server_host: App.router.get('connectingController').get('server_ip'),
    }, '*');
}

function handle_client_message(message) {
    var ac = App.router.get('applicationController');
    var client = ac.get('clients').find(function (item) {
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
            ac.get('clients').pushObject(client);
            send_command('to_client', {client: client, content: {command: "accepted"}});
            break;
        case 'alive':
            client.set('last_alive', new Date())
            break;
        case 'pile_change':
            App.router.get('voteRunningController').updatePileExternally(data.data.pile);
            break;
        case 'disconnect':
            ac.get('clients').removeObject(client);
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
            var tc = App.router.get('typingController');
            var pgs = tc.get('pileGroups');
            var newPile = STVDataPile.toGUI(data.content);
            pgs.pushObject(PileGroup.create({content: [newPile]}));
            //pgs.set('currentPile', newPile);
            tc.set('currentPileCaption', newPile.get('desc'));
            tc.get('currentPile').addBallot();
            App.router.get('applicationController').set('appState', 2);
            break;
        case 'reopen_pile':
            var d = STVDataPile.toGUI(data.content).get('desc');
            App.router.get('voteRunningController').get('pileGroups').forEach(function(pileGroup){
                pileGroup.forEach(function(pile) {
                    if (pile.get('desc') == d) pile.set('pileClosed', false);
                });
            });
            break;
        case 'set_setup':
            STVDataSetup.toGUI(data.content, App.router.get('voteSetupController'));
            App.router.get('typingController').get('pileGroups').clear();
            App.router.get('applicationController').set('appState', 2);
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

function print_ballots(setup, title) {
    var ret = '';
    for (var i = 0; i < setup.ballotCount; i++) {
        ret += '<div class="ballot"><h1>' + title + "</h1>";
        ret += stv.ballot_header();
        setup.candidates.forEach(function (candidate) {
            ret += '<div class="bentry"><span class="square">❏</span><span class="cname">' + candidate.name + "</span></div>";
        });
        ret += '<br/><span class="leaders">✂ ' +
        '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ' +
        '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ' +
        '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</span><br/></div>';
    }
    return ret;
}

window.addEventListener('message', messageHandler, false);
App.initialize();
