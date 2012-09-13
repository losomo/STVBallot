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
        pile.get('ballots').map(function (item) {return STVDataBallot.fromGUI(item)}),
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
    var ret = setup.get('candidateCount') + " " + setup.get('mandateCount') + "\n";
    groups.forEach(function (group) {
        group.piles.forEach(function (pile) {
            var found = 0;
            if (!pile.note) {
                found += 1;
                pile.ballots.forEach(function (ballot) {
                    if (!ballot.invalid) {
                        if (ballot.empty) {
                            ret += "1 0\n"
                        }
                        else {
                            ret += "1 " + ballot.get_sorted_orders() + " 0\n";
                        }
                    }
                });                
            }
            if (found != 1) throw "Primary pile not found";
        });
    });
    ret += "0\n";
    setup.get('candidates').forEach(function (candidate) {
        ret += candidate.get('name');
        ret += "\n";
    });
    ret += title + "\n";
    console.log(ret);
    return ret;
}
