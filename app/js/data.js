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
};

STVDataBallot.toGUI = function(b) {
    return Ballot.create({
        invalid: b.invalid,
        empty: b.empty,
        entries: BEntries.create({content: b.entries.map(function(eorder) {return BEntry.create({order: eorder || ""});})}),
        touched: b.touched,
        index: b.index,
    });
};

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
};

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
            key = ballot.entries.join(':').replace(/NaN/g,'0');
        }
        if (!ap[key]) ap[key] = 0;
        ap[key] += 1;
    }
    return ap;
};

STVDataBallot.reportAggregatedBallots = function(setup, ab) {
    var ret = '<table class="griddy"><tr><th></th><th>';
    ret += setup.candidates.map(function(c,i){return i+1}).join("</th><th>");
    ret += "</th></tr>";
    for (var b in ab) {
        if (b != "_invalid" && b != "_empty") {
            var lowest = STVDataBallot.get_most_preferred(b)[0];
            ret += "<tr><td>" + STVDataSetup.round(ab[b]) + "</td><td>" +
                b.split(":").map(function (x){
                    return x > 0 ?
                        (x == lowest ? "<b>" + x + "</b>" : x)
                        :""
                }).join("</td><td>")
                + "</td></tr>";
        }
    }
    ret += "</table>";
    return ret;
};

STVDataBallot.aggregateFirstPreferences = function(aggregatedBallots, setup, tie_order) {
    var ret = []; // Array of [ballots_with_1st_preference, 1+candidate_order] ordered by [0]
    var score = {}; // candidate_order -> ballots_with_1st_preference
    for (var ab in aggregatedBallots) {
        if (ab != "_empty" && ab != "_invalid") {
            var s = aggregatedBallots[ab];
            ab.split(':').forEach(function(o, i) {
                if (o > 0 && o < setup.candidates.length * 100) {
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
    var tindex = {};
    if (tie_order != null) {
        tie_order.forEach(function(to, i) {
            tindex[to[1]] = i;
        });
    }
    return ret.sort(function(a,b){return b[0]-a[0] == 0 ? tindex[b] - tindex[a] : b[0]-a[0]});
};

STVDataBallot.get_most_preferred = function(ab) {
    var barray = ab.split(':');
    return barray.reduce(function(min_count, order, index) {
                if (order > 0 && order < barray.length * 100) {
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
};

STVDataBallot.removeCandidateFromAggregatedBallots = function(oab, corder, discount, soft_remove) {
    var votes_for_candidate = function(aggrb) {
        var most_preferred = STVDataBallot.get_most_preferred(aggrb);
        if (most_preferred[1].some(function(i) {return i == corder})) {
            return oab[aggrb] / most_preferred[1].length;
        }
        else {
            return 0;
        }
    };
    var total_for_candidate = 0;
    if (discount > 0) {
        for (var b in oab) {
             total_for_candidate += votes_for_candidate(b);
        }
    }
    var new_weight = total_for_candidate == 0 ? 1 : (total_for_candidate - discount) / total_for_candidate;
    var ab = {};
    for (var b in oab) {
        if (b != "_empty" && b != "_invalid") {
            var for_candidate = votes_for_candidate(b);
            var barray = b.split(':');
            barray[corder-1] = soft_remove && barray[corder-1] > 0 ? 100 * barray.length + parseInt(barray[corder-1]) : 0;
            if (barray.some(function(x) {return x > 0;})) {
                var newb = barray.join(':');
                var new_score = new_weight * for_candidate + (oab[b] - for_candidate);
                if (!ab[newb]) ab[newb] = 0;
                ab[newb] += new_score;
            }
        }
    }
    return ab;
};

STVDataBallot.clone_ab = function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if (obj instanceof Array) {
        var copy = [];
        var len = obj.length;
        for (var i = 0; i < len; ++i) {
            copy[i] = STVDataBallot.clone_ab(obj[i]);
        }
        return copy;
    }
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = STVDataBallot.clone_ab(obj[attr]);
        }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

STVDataBallot.reinsert_to_ab = function(oab) {
    var ab = {};
    for (var b in oab) {
        if (b != "_empty" && b != "_invalid") {
            var barray = b.split(':');
            for (var i = 0; i < barray.length; i++) {
                if (barray[i] > 100 * barray.length) {
                    barray[i] = barray[i] - 100 * barray.length;
                }
            }
            var newb = barray.join(':');
            if (!ab[newb]) ab[newb] = 0;
            ab[newb] += oab[b];
        }
    }
    return ab;
}

STVDataBallot.remove_gender_violators_from_ab = function(oab, setup, report, candidate_orders, mandates) {
    var ab = oab;
    var m_count = 0;
    var f_count = 0;
    mandates.forEach(function (mandate) {
        if (mandate.gender == 'M') m_count++;
        if (mandate.gender == 'F') f_count++;
    });
    var rm_m = setup.m_max > 0 && m_count >= setup.m_max;
    var rm_f = setup.f_max > 0 && f_count >= setup.f_max;
    setup.candidates.forEach(function(candidate, i) {
        if (candidate.gender == 'M' && rm_m || candidate.gender == 'F' && rm_f) {
            ab = STVDataBallot.removeCandidateFromAggregatedBallots(ab, i+1, 0, false);
            report("Vyřazen z důvodu genderové kvóty: " + candidate.name + "<br/>");
        }
    });
    return ab;
}

STVDataBallot.remove_non_candidates = function(oab, setup, round, mandates, report, soft_remove) {
    var ab = oab;
    var ap_index = round > setup.orderedCount ? setup.orderedCount : round - 1;
    setup.candidates.forEach(function(candidate, cindex) {
        if(candidate.acceptable_positions != null && candidate.acceptable_positions.length > 0) {
            if (!candidate.acceptable_positions[ap_index]) {
                if (!mandates.some(function(m) { // suboptimal, could have used hash instead
                    return candidate.name == m.name;
                })) {
                    if (round > setup.orderedCount) {
                        report("<br/>Kandidát " + candidate.name + " nekandiduje na nečíslované pozice, vyřazuji.<br/>");
                    }
                    else {
                        report("<br/>Kandidát " + candidate.name + " nekandiduje v kole " + round + ", vyřazuji.<br/>");
                    }
                    ab = STVDataBallot.removeCandidateFromAggregatedBallots(ab, cindex+1, 0, soft_remove);
                }
            }
        }
    });
    return ab;
}

STVDataBallot.prototype.get_sorted_orders = function() {
    // Candidate numbers start at 1 !!!!!!
    var pairs = this.entries.map(function(e, index) {return [index+1, e]}); // [candidate_no, priority]
    return pairs.filter(function(e) {return e[1] > 0;})
        .sort(function(a, b) {return a[1] - b[1];})
        .map(function(e) {return e[0]});
};

STVDataBallot.prototype.isReal = function() {
    return this.empty || this.invalid || this.touched;
};

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
};

STVDataPile.toGUI = function(p) {
    return Pile.create({
        name: p.name,
        note: p.note,
        ballots: Em.ArrayProxy.create({content: p.ballots.map(function(ballot) {return STVDataBallot.toGUI(ballot);})}),
        pileClosed: p.pileClosed,
        client: p.client
    });
};

function STVDataPileGroup(piles) {
    this.piles = piles; // Array of STVDataPiles
}

STVDataPileGroup.fromGUI = function(pileGroup) {
    return new STVDataPileGroup(
        pileGroup.map(function(item) {return STVDataPile.fromGUI(item)})
    );
};

STVDataPileGroup.reportGroups = function(setup, groups, primary) {
    var ret = "<h1>" + "_Piles data".loc()  +  "</h1>";
    groups.forEach(function (group) {
        var found = 0;
        group.piles.forEach(function (pile) {
            if (!primary || !pile.note) {
                found += 1;
                var ab = STVDataBallot.aggregateBallots(pile.ballots);
                ret += "<h3>" + "_Pile".loc() + " " + pile.name + " " + (pile.note ? pile.note : "") + "</h3>";
                ret += STVDataBallot.reportAggregatedBallots(setup, ab);
                ret += "_Number of invalid".loc() + ": " + ab['_invalid'] + ", " + "_number of empty".loc() + ": " + ab['_empty'];
            }
        });
        if (primary && found != 1) throw "Primary pile not found";
    });
    return ret;
};

function STVDataFormats() {}

STVDataFormats.bltFromGroups = function(title, setup, groups) {
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
};

STVDataFormats.bltToCase = function(blt) {
    var lines = blt.toString().replace(/\r|"/g,'').split('\n');
    var header = lines.shift().split(' ').map(function(n){return parseInt(n)});
    var inC = false;
    var ab = {};
    while(!inC && lines.length > 0) {
        var line = lines.shift();
        if (line == "0") {
            inC = true;
        }
        else {
            // parse ballot
            var l = line.split(' ');
            l.pop(); // remove 0
            var count = parseInt(l.shift());
            var key;
            if (l.length == 0) {
                key = "_empty"; // empty ballots
            }
            else {
                var orders = {};
                l.forEach(function(cand_index, order_0) {
                    orders[cand_index] = order_0 + 1;
                });
                var k = [];
                for (var i = 0; i < header[0]; i++) {
                    k.push(orders[i+1] || 0);
                }
                key = k.join(':');
            }
            if (!ab[key]) ab[key] = 0;
            ab[key] += count;
        }
    }
    var candidates = [];
    for (var i = 0; i < header[0]; i++) {
        candidates.push(lines.shift());
    }
    var name = lines.shift();
    if (lines.length > 1) throw "Unexpected lines", lines;
    return {
        "candidates": candidates,
        "mandates": header[1],
        "ballots_ab": ab,
        "name": name,
        "expected": [
        ]
    }
};

STVDataFormats.jsonFromGroups = function(title, setup, groups, mandates, replacements) {
    var ballots = STVDataBallot.combineGroups(groups);
    console.log(setup.candidates);
    return JSON.stringify({
        "candidates": setup.candidates.mapProperty('name'),
        "acceptable_positions": setup.candidates.mapProperty('acceptable_positions'),
        "mandates": setup.mandateCount,
        "m_max": parseInt(setup.m_max),
        "f_max": parseInt(setup.f_max),
        "genders": setup.candidates.mapProperty('gender'),
        "ordered": parseInt(setup.orderedCount),
        "ballots_ab": STVDataBallot.aggregateBallots(ballots),
        "name": title,
        "expected": mandates,
        "expected_replacements": replacements.map(function(repl){return repl.map(function(r){return r.name})})
    }, null, "  ");
};

function STVDataSetup(voteNo, candidateCount, mandateCount, ballotCount, replacements, candidates, m_max, f_max, orderedCount) {
    this.voteNo = voteNo; // Not necessarily a number
    this.candidateCount = parseInt(candidateCount);
    this.mandateCount = parseInt(mandateCount);
    this.ballotCount = parseInt(ballotCount);
    this.replacements = replacements; // Boolean
    this.candidates = candidates; // Array of STVDataCandidate
    this.m_max = parseInt(m_max || 0);
    this.f_max = parseInt(f_max || 0);
    this.orderedCount = parseInt(orderedCount || 0);
}

STVDataSetup.round = function (x) {
    return new Number(x).toFixed(5);
};

STVDataSetup.fromGUI = function(controller) {
    return new STVDataSetup(
        controller.get('voteNo'),
        controller.get('candidateCount'),
        controller.get('mandateCount'),
        controller.get('ballotCount'),
        controller.get('replacements'),
        controller.get('candidates').map(function(candidate) {return STVDataCandidate.fromGUI(candidate);}),
        controller.get('m_max'),
        controller.get('f_max'),
        controller.get('orderedCount')
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

function STVDataCandidate(name, gender, acceptable_positions) {
    this.name = name;
    this.gender = gender;
    this.acceptable_positions = acceptable_positions;
}

STVDataCandidate.fromGUI = function (c) {
    return new STVDataCandidate(c.get('name'), c.get('gender').code, c.get('acceptable_positions').content.mapProperty('accepted'));
};

STVDataCandidate.toGUI = function (c, i) {
    return Candidate.create({
        name: c.name,
        gender: c.gender,
        index: i
    });
};
