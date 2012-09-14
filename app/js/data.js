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
        ballot.get('index')
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
   this.voteNo = voteNo;
   this.candidateCount = candidateCount;
   this.mandateCount = mandateCount;
   this.ballotCount = ballotCount;
   this.replacements = replacements; // Boolean
   this.candidates = candidates; // Array of STVDataCandidate
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

function STVDataCandidate(name, gender) {
    this.name = name;
    this.gender = gender;
}

STVDataCandidate.fromGUI = function (c) {
    return new STVDataCandidate(c.get('name'), c.get('gender'));
};
