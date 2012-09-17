function STV() {
}

(function() {
function _r(x) {
    return new Number(x).toFixed(5);
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

STV.prototype.crosscheck = function(pileGroup) {
    var piles = pileGroup.piles;
    var aggregatedPiles = [];
    for (var i = 0; i < piles.length; i++) {
        aggregatedPiles.push(STVDataBallot.aggregateBallots(piles[i].ballots));
    }
    var first = aggregatedPiles[0];
    var firstkeys = Object.keys(first).sort();
    for (var i = 1; i < aggregatedPiles.length; i++) {
        var ipile = aggregatedPiles[i];
        var ikeys = Object.keys(ipile).sort();
        if (ikeys.length != firstkeys.length) return {status: "error", message: "length mismatch"};
        for (var j = 0; j < firstkeys.length; j++) {
            var key = firstkeys[j];
            if (key != ikeys[j]) return {status: "error", message: "Expected " + key};
            if (first[key] != ipile[key]) return {status: "error", message: "Mismatch in " + key};
        }
    }
    return {status: "ok", message: "ok"};
}

STV.prototype.ballot_header = function() { return "Pokyny pro hlasování: " +
    "<ul><li>Označte číslem pořadí kandidátů, ve kterém preferujete jejich zvolení. " +
    "U&nbsp;kandidáta, kterého upřednostňujete nejvíce, uveďte číslo 1, u&nbsp;kandidáta, " +
    "kterého považujete za druhého nejlepšího, uveďte číslo 2 atd., až očíslujete " +
    "podle vašich preferencí pořadí všech kandidátů, jejichž zvolení v&nbsp;tomto pořadí " +
    "preferujete před zvolením nikoho. Pokud nechcete svůj hlas dát nikomu z" +
    "&nbsp;kandidátů, neuvedete žádné číslo na hlasovacím lístku.</li>" +

    "<li>Hlas je neplatný, pokud uvedete stejné číslo u&nbsp;dvou kandidátů, pokud " +
    "nejnižší Vámi uvedené číslo není 1 nebo pokud Vámi uvedené čísla nejsou po " +
    "sobě jdoucí pořadová čísla.</li>" +
    
    "<li>Pokud po volbě nejsou obsazeny všechny mandáty voleného orgánu, konají " +
    "se nové volby na tyto mandáty.</li></ul>"; 
}

STV.prototype.run = function(setup, ballots, report, done) {
    var ab = STVDataBallot.aggregateBallots(ballots);
    var valid_ballots_count = ballots.length - ab['_invalid'];
    report(
        "<h1>Výpočet volby: " + setup.voteNo + "</h1>" +
        "<p>Z " + setup.candidateCount + " kandidátů voleno " + setup.mandateCount + " mandátů, odevzdáno " + ballots.length + " hlasovacích lístků.</p>" +
        "<p>Neplatných lístků: " + ab['_invalid'] + ", prázdných lístků: " + ab['_empty'] + "</p>" +
        "<p>Kandidáti:<ol><li>" + setup.candidates.map(function(c){return c.name;}).join("</li><li>") +
        "</li></ol></p>" + 
        "<p>Počet platných hlasovacích lístků: " + valid_ballots_count + "</p>"
    );
    var quota = valid_ballots_count / (setup.mandateCount + 1) + 0.00001; // a) v) Přílohy 2 Jednacího řádu
    var mandates = []; // Array of STVDataCandidates
    report("<p>Kvóta pro zvolení: " + _r(quota) + "</p>");
    while (mandates.length < setup.mandateCount && Object.keys(ab).length > 0) { // a) iv)
        report("<p>Shrnutí vyplněných preferencí</p>" + this._reportAB(setup, ab));
        var fp = STVDataBallot.aggregateFirstPreferences(ab);
        report("<p>Počet hlasů s nejvyšší preferencí (při shodě v náhodném pořadí):<table>");
        fp.forEach(function(f) {report("<tr><td>" + _r(f[0]) + "</td><td>" + setup.candidates[f[1]-1].name + "</td></tr>")});
        report("</table>");
        if (fp[0][0] >= quota) {
            mandates.push(setup.candidates[fp[0][1]-1]);
            ab = STVDataBallot.removeCandidateFromAggregatedBallots(ab, fp[0][1], quota);
            report("<p>Kandidát <b>" + setup.candidates[fp[0][1]-1].name +"</b> zvolen, na další místa se přesouvá " + _r(fp[0][0]-quota) + " hlasů</p>");
        }
        else {
            var last = fp.length - 1;
            report("<p>Žádný kandidát nepřekračuje kvótu, odstraňuji kandidáta " + setup.candidates[fp[last][1]-1].name + "</p>");
            ab = STVDataBallot.removeCandidateFromAggregatedBallots(ab, fp[0][1], 0);
        }
    }   
    report("<h1>Zvolení kandidáti:</h1><ol><li>" + mandates.map(function(c){return c.name;}).join("</li><li>") + "</li></ol>" +
        "<p><pre>" + new Date() + "</pre>Výpočet ukončen.</p>");
    done(mandates);
}

STV.prototype._reportAB = function(setup, ab) {
    var ret = '<table class="griddy"><tr><th>Kandidáti:</th><th>';
    ret += setup.candidates.map(function(c,i){return i+1}).join("</th><th>");
    ret += "</th></tr>";
    for (var b in ab) {
        if (b != "_invalid" && b != "_empty") {
            ret += "<tr><td>" + _r(ab[b]) + "</td><td>" + 
                b.split(":").map(function (x){return x>0?x:""}).join("</td><td>")
                + "</td></tr>";
        }
    }
    ret += "</table>";
    return ret;
}
})()
