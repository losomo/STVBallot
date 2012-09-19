function STVDataBallot(invalid, empty, entries, touched, index) {
    this.invalid = invalid; // Boolean
    this.empty = empty;     // Boolean
    this.entries = entries; // Array of integers
    this.touched = touched; // Boolean
    this.index = index;     // integer
}

STVDataBallot.fromGUI = function (ballot) {
    return new STVDataBallot(
        ballot.get('invalid'),
        ballot.get('empty'),
        ballot.get('entries').mapProperty('order').map(function(item){return parseInt(item)}),
        ballot.get('touched'),
        parseInt(ballot.get('index'))
    );
}

STVDataBallot.toGUI = function(b) {
    return Ballot.create({
        invalid: b.invalid,
        empty: b.empty,
        entries: BEntries.create({content: b.entries.map(function(eorder) {return BEntry.create({order: eorder || ""});})}),
        touched: b.touched,
        index: b.index,
    });
}

/*
  takes array of groups, returns a single array of all ballots from primary groups
*/
STVDataBallot.combineGroups = function(groups) {
    var ret = [];
    groups.forEach(function (group) {
        var found = 0;
        group.piles.forEach(function (pile) {
            if (!pile.note) {
                found += 1;
                ret = ret.concat(pile.ballots);       
            }
        });
        if (found != 1) throw "Primary pile not found";
    });
    return ret;
}

STVDataBallot.aggregateBallots = function(ballots) {
    var ap = {
        "_invalid": 0,
        "_empty": 0
    };
    for (var i = 0; i < ballots.length; i++) {
        var ballot = ballots[i];
        var key;
        if (ballot.invalid) {
            key = '_invalid';
        }
        else if (ballot.empty) {
            key = '_empty';
        }
        else {
            key = ballot.entries.join(':');
        }
        if (!ap[key]) ap[key] = 0;
        ap[key] += 1;
    }
    return ap;
}

STVDataBallot.reportAggregatedBallots = function(setup, ab) {
    var ret = '<table class="griddy"><tr><th></th><th>';
    ret += setup.candidates.map(function(c,i){return i+1}).join("</th><th>");
    ret += "</th></tr>";
    for (var b in ab) {
        if (b != "_invalid" && b != "_empty") {
            ret += "<tr><td>" + STVDataSetup.round(ab[b]) + "</td><td>" + 
                b.split(":").map(function (x){return x>0?x:""}).join("</td><td>")
                + "</td></tr>";
        }
    }
    ret += "</table>";
    return ret;
}

STVDataBallot.aggregateFirstPreferences = function(aggregatedBallots) {
    var ret = []; // Array of [ballots_with_1st_preference, 1+candidate_order] ordered by [0], randomly where there is a tie
    var score = {}; // candidate_order -> ballots_with_1st_preference
    for (var ab in aggregatedBallots) {
        if (ab != "_empty" && ab != "_invalid") {
            var s = aggregatedBallots[ab];
            ab.split(':').forEach(function(o, i) {
                if (o > 0) {
                    if (!score[i+1]) score[i+1] = 0;
                }
            });
            var most_preferred = STVDataBallot.get_most_preferred(ab);            
            most_preferred[1].forEach(function(candidate) {
                score[candidate] += s / most_preferred[1].length;
            });            
        }
    }
    for (var candidate in score) {
        ret.push([score[candidate], candidate]);
    }
    var i = ret.length; // Shuffle to randomize ties
    while (--i > 0) {
        var j = Math.floor(Math.random() * (i + 1));
        var oi = ret[i];
        ret[i] = ret[j];
        ret[j] = oi;
    }
    return ret.sort(function(a,b){return b[0]-a[0]});
}

STVDataBallot.get_most_preferred = function(ab) {
    return ab.split(':').reduce(function(min_count, order, index) {
                if (order > 0) {
                    var min = min_count[0];
                    if(order == min) {
                        min_count[1].push(index + 1);
                    }
                    else if (order < min) {
                        min_count = [order, [index + 1]];
                    }
                }
                return min_count;
            }, [Number.MAX_VALUE, []]); // returns [min_order, [1+index_with_min_order]]
}

STVDataBallot.removeCandidateFromAggregatedBallots = function(oab, candidate, transfer) {
    var votes_for_candidate = function(aggrb) {
        var most_preferred = STVDataBallot.get_most_preferred(aggrb);
        if (most_preferred[1].some(function(i) {return i == candidate})) {
            return oab[aggrb] / most_preferred[1].length;
        }
        else {
            return 0;
        }
    };
    var total_for_candidate = 0;
    if (transfer > 0) {
        for (var b in oab) {
             total_for_candidate += votes_for_candidate(b);
        }
    }
    var new_weight = total_for_candidate == 0 ? 1 : (total_for_candidate - transfer) / total_for_candidate;
    var ab = {};
    for (var b in oab) {
        if (b != "_empty" && b != "_invalid") {
            var for_candidate = votes_for_candidate(b);
            barray = b.split(':');
            barray[candidate-1] = 0;
            if (barray.some(function(x) {return x > 0;})) {
                var newb = barray.join(':');
                var new_score = new_weight * for_candidate + (oab[b] - for_candidate);
                if (!ab[newb]) ab[newb] = 0;
                ab[newb] += new_score;
            }
        }
    }
    return ab;
}

STVDataBallot.prototype.get_sorted_orders = function() {
    // Candidate numbers start at 1 !!!!!!
    var pairs = this.entries.map(function(e, index) {return [index+1, e]}); // [candidate_no, priority]
    return pairs.filter(function(e) {return e[1] > 0;})
        .sort(function(a, b) {return a[1] - b[1];})
        .map(function(e) {return e[0]});
}

STVDataBallot.prototype.isReal = function() {
    return this.empty || this.invalid || this.touched;
}

function STVDataPile(name, note, ballots, pileClosed, client) {
    this.name = name;
    this.note = note;
    this.ballots = ballots;       // Array of STVDataBallots
    this.pileClosed = pileClosed;
    this.client = client;
}

STVDataPile.fromGUI = function(pile) {
    return new STVDataPile(
        pile.get('name'),
        pile.get('note'),
        pile.get('ballots').map(function (item) {return STVDataBallot.fromGUI(item)}).filter(function (b) {return b.isReal();}),
        pile.get('pileClosed'),
        pile.get('client')
    );
}

STVDataPile.toGUI = function(p) {
    return Pile.create({
        name: p.name,
        note: p.note,
        ballots: Em.ArrayProxy.create({content: p.ballots.map(function(ballot) {return STVDataBallot.toGUI(ballot);})}),
        pileClosed: p.pileClosed,
        client: p.client
    });
}

function STVDataPileGroup(piles) {
    this.piles = piles; // Array of STVDataPiles
}
STVDataPileGroup.fromGUI = function(pileGroup) {
    return new STVDataPileGroup(
        pileGroup.map(function(item) {return STVDataPile.fromGUI(item)})
    );
}

STVDataPileGroup.reportGroups = function(setup, groups, primary) {
    var ret = "<h1>" + "_Piles data".loc()  +  "</h1>";
    groups.forEach(function (group) {
        var found = 0;
        group.piles.forEach(function (pile) {
            if (!primary || !pile.note) {
                found += 1;
                var ab = STVDataBallot.aggregateBallots(pile.ballots);
                ret += "<h2>" + "_Pile".loc() + " " + pile.name + "</h2>";
                ret += STVDataBallot.reportAggregatedBallots(setup, ab);
                ret += "_Number of invalid".loc() + ": " + ab['_invalid'] + ", " + "_number of empty".loc() + ": " + ab['_empty'];
            }
        });
        if (primary && found != 1) throw "Primary pile not found";
    });
    return ret;
}

function STVDataBLT() {}

STVDataBLT.fromGroups = function(groups, title, setup) {
    var ret = setup.candidateCount + " " + setup.mandateCount + "\n";
    groups.forEach(function (group) {
        var found = 0;
        group.piles.forEach(function (pile) {
            if (!pile.note) {
                found += 1;
                pile.ballots.forEach(function (ballot) {
                    if (!ballot.invalid) {
                        if (ballot.empty) {
                            ret += "1 0\n"
                        }
                        else {
                            ret += "1 " + ballot.get_sorted_orders().join(" ") + " 0\n";
                        }
                    }
                });                
            }
        });
        if (found != 1) throw "Primary pile not found";
    });
    ret += "0\n";
    setup.candidates.forEach(function (candidate) {
        ret += '"';
        ret += candidate.name;
        ret += '"\n';
    });
    ret += '"'  + title + '"\n';
    return ret;
}

function STVDataSetup(voteNo, candidateCount, mandateCount, ballotCount, replacements, candidates) {
   this.voteNo = voteNo; // Not necessarily a number
   this.candidateCount = parseInt(candidateCount);
   this.mandateCount = parseInt(mandateCount);
   this.ballotCount = parseInt(ballotCount);
   this.replacements = replacements; // Boolean
   this.candidates = candidates; // Array of STVDataCandidate
}

STVDataSetup.round = function (x) {
    return new Number(x).toFixed(5);
}

STVDataSetup.fromGUI = function(controller) {
    return new STVDataSetup(
        controller.get('voteNo'),
        controller.get('candidateCount'),
        controller.get('mandateCount'),
        controller.get('ballotCount'),
        controller.get('replacements'),
        controller.get('candidates').map(function(candidate) {return STVDataCandidate.fromGUI(candidate);})
    );
};

STVDataSetup.toGUI = function(setup, controller) {
    controller.set('voteNo', setup.voteNo);
    controller.set('candidateCount', setup.candidateCount);
    controller.set('mandateCount', setup.mandateCount);
    controller.set('ballotCount', setup.ballotCount);
    controller.set('replacements', setup.replacements);
    controller.set('candidates', Em.ArrayProxy.create({
        content: setup.candidates.map(function(candidate, index) {return STVDataCandidate.toGUI(candidate, index);})
    }));
};

function STVDataCandidate(name, gender) {
    this.name = name;
    this.gender = gender;
}

STVDataCandidate.fromGUI = function (c) {
    return new STVDataCandidate(c.get('name'), c.get('gender'));
};

STVDataCandidate.toGUI = function (c, i) {
    return Candidate.create({
        name: c.name, 
        gender: c.gender,
        index: i
    });
};
