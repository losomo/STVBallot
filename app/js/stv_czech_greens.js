function STV() {
}

STV.prototype.validate = function(ballot) {
    if (ballot.invalid || ballot.empty) return "";    
    var last = 0;
    var sorted = ballot.entries.sort();
    for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i];
        if (e) {
            if (e != ++last) return e > last ? 'Chybí pořadí: ' + last : 'Duplicitní pořadí: ' + e;           
        }
    }
    return "ok";
}
