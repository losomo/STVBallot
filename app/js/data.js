function STVDataBallot(invalid, empty, entries) {
    this.invalid = invalid; // Boolean
    this.empty = empty;     // Boolean
    this.entries = entries; // Array of integers
}

STVDataBallot.fromGUI = function (ballot) {
    return new STVDataBallot(
        ballot.get('invalid'),
        ballot.get('empty'),
        ballot.get('entries').mapProperty('order').map(function(item){return parseInt(item)})
    );
}

function STVDataPile(ballots) {
    this.ballots = ballots;       // Array of STVDataBallots
}

STVDataPile.fromGUI = function(pile) {
    return new STVDataPile(
        pile.get('ballots').map(function (item) {return STVDataBallot.fromGUI(item)})
    );
}

function STVDataPileGroup(piles) {
    this.piles = piles; // Array of STVDataPiles
}
STVDataPileGroup.fromGUI = function(pileGroup) {
    return new STVDataPileGroup(
        pileGroup.map(function(item) {return STVDataPile.fromGUI(item)})
    );
}

