var fs = require('fs');

eval(fs.readFileSync('../app/js/data.js')+'');
eval(fs.readFileSync('../app/js/stv_czech_greens.js')+'');

var stv = new STV();

function test(fname, debug) {
    if (fname.match('\.json$')) {
        var test = JSON.parse(fs.readFileSync(fname));

        var ballots = test.ballots || [];
        if (test.ballots_ab) {
            for (var ab in test.ballots_ab) {
                for (var i = 0; i < test.ballots_ab[ab]; i++) {
                    ballots.push(new STVDataBallot(false, ab == "_empty", ab.split(':').map(function(o){return parseInt(o);}), true, i));
                }
            }
        }

        var msgs = "";
        stv.run({
            voteNo: "Test vote " + fname,
            candidateCount: test.candidates.length,
            mandateCount: test.mandates,
            candidates: test.candidates.map(function(c, i) {return {name: c, gender: test.genders[i], acceptable_positions: test.acceptable_positions[i]};}),
            f_max: test.f_max,
            m_max: test.m_max,
            orderedCount: test.ordered
        }, ballots, function(msg) {
            msgs += msg;
        }, function(mandates) {
           var ok = true;
           test.expected.forEach(function(ex) {
               var x = {};
               if (Array.isArray(ex)) {
                   ex.forEach(function(e) {
                       x[e] = 1;
                   });
               }
               else {
                   x[ex] = 1;
               }
               while(Object.keys(x).length > 0) {
                   var mandate = mandates.shift();
                   if (!mandate) {
                       console.error("Expected: " + JSON.stringify(Object.keys(x)) + ", got nothing");
                       ok = false;
                       break;
                   }
                   if (!delete x[mandate.name]) {
                       console.error("Expected: " + JSON.stringify(Object.keys(x)) + ", got: " + mandate.name);
                       ok = false;
                       break;
                   }
               }
           });
           if (mandates.length > 0) {
               console.error("Expected nothing, got " + JSON.stringify(mandates.map(function(m){return m.name})));
               ok = false;
           }
           if (ok) {
               console.error(fname + " OK");
               if (debug) console.log(envelope(msgs));
           }
           else {               
               console.log(envelope(msgs));
               console.error("Failed " + fname);
           }
        });
    }
}

function envelope(msg) {
    return '<!DOCTYPE html><html><head><meta charset="utf8"/></head><body>' + msg
    + "</body></html>";
}

var fname = process.argv[2];
if (fname) {
    test(fname, true);
}
else {
    fs.readdirSync('.').sort().forEach(test, false);
}
