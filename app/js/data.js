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
