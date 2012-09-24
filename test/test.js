var fs = require('fs');

eval(fs.readFileSync('../app/js/data.js')+'');
eval(fs.readFileSync('../app/js/stv_czech_greens.js')+'');

var stv = new STV();

fs.readdirSync('.').sort().forEach(function(fname) {
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
            candidates: test.candidates.map(function(c) {return {name: c, gender: '---'};})
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
               //console.log(msgs);
           }
           else {               
               console.log(msgs);
               console.error("Failed " + fname);
           }
        });
    }
});
