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
function STV(debug) {
    this.debug = debug;
}

(function() {
STV.prototype.validate = function(ballot) {
    if (ballot.invalid || ballot.empty) return "";
    var last = 0;
    var sorted = ballot.entries.toArray();
    sorted = merge_sort(sorted, function(a,b){return STVDataSetup.parseNum(a) - STVDataSetup.parseNum(b)});
    for (var i = 0; i < sorted.length; i++) {
        var e = sorted[i];
        if (e) {
            if (e != ++last) return e > last ? 'Chybí ' + last : 'Duplicitní: ' + e;
        }
    }
    return "ok";
}

STV.prototype.crosscheck = function(pileGroup) {
    var piles = pileGroup.piles;
    var poss = [];
    var error_return = function(message) {
        var l = piles[0].ballots.length;
        piles[0].ballots.forEach(function(b1, i) {
            var ballotOK = true;
            piles.forEach(function(p, j) {
                if (j > 0) {
                    var b2 = p.ballots[i];
                    if (b2 == null || b1.invalid != b2.invalid ||
                        b1.empty != b2.empty ||
                        b1.entries > b2.entries || b2.entries > b1.entries) {
                            ballotOK = false;
                        }
                }
            });
            if (!ballotOK) {
                  poss.push(i);
            }
        });
        var maxl = 0;
        piles.forEach(function(p) {
            if (p.ballots.length > maxl) {
                maxl = p.ballots.length;
            }
        });
        for (var i = l; i < maxl; i++) {
            poss.push(i);
        }
        return {
            status: "error",
            message: message,
            positions: poss
        };
    };
    var aggregatedPiles = [];
    for (var i = 0; i < piles.length; i++) {
        aggregatedPiles.push(STVDataBallot.aggregateBallots(piles[i].ballots));
    }
    var first = aggregatedPiles[0];
    var firstkeys = Object.keys(first).sort();
    for (var i = 1; i < aggregatedPiles.length; i++) {
        var ipile = aggregatedPiles[i];
        var ikeys = Object.keys(ipile).sort();
        if (ikeys.length != firstkeys.length) {
            console.log(pileGroup, ipile, first);
            return error_return("Různá velikost hromádek");
        }
        for (var j = 0; j < firstkeys.length; j++) {
            var key = firstkeys[j];
            if (key != ikeys[j]) return error_return("Očekáváno " + key);
            if (first[key] != ipile[key]) return error_return("Neshoda " + key);
        }
    }
    return {status: "ok", message: "ok"};
}

STV.prototype.ballot_header = function() { return "Pokyny pro hlasování: " +
    "<p>Kandidátům, jejichž zvolení podporujete, přidělte preference " +
    "v&nbsp;podobě po sobě jdoucích čísel tak, že ke kandidátovi, kterého " +
    "upřednostňujete nejvíce, napíšete „1“, ke kandidátovi, kterého " +
    "upřednostňujete jako druhého v&nbsp;pořadí, napíšete „2“ atd. " +
    "U kandidátů, jejichž zvolení nepodporujete, neuvádějte žádné číslo. " +
    "Hlasovací lístek je platný, pokud přidělené preference tvoří vzestupnou " +
    "řadu po sobě jdoucích přirozených čísel počínaje „1“, nebo pokud je " +
    "přidělena preference „1“ pouze u&nbsp;jediného kandidáta, nebo pokud není " +
    "přidělena preference u žádného kandidáta.</p>"
}

STV.prototype.stv_round = function(op) {
    var mandates = []; // Array of [STVDataCandidate, score]
    op.report("<p>Kvóta pro zvolení: " + STVDataSetup.round(op.quota) + "</p>");
    var mandateCount = op.admissible_candidates == null ? op.setup.mandateCount : op.admissible_candidates.length;
    var last_alive; // [candidate, score]
    while (mandates.length < mandateCount && Object.keys(op.ab).length > 0) {
        op.report("<p>Shrnutí vyplněných preferencí</p>" + STVDataBallot.reportAggregatedBallots(op.setup, op.ab));
        var fp = STVDataBallot.aggregateFirstPreferences(op.ab, op.setup, op.original_fp);
        if (fp.length == 0) break;
        op.report("<p>Počet hlasů pro kandidáty:<table>");
        fp.forEach(function(f) {op.report("<tr><td>" + STVDataSetup.round(f[0]) + "</td><td>" + f[1] + " (" + op.setup.candidates[f[1]-1].name + ")</td></tr>")});
        op.report("</table>");
        var has_elected = false;
        var i = 0;
        while (i < fp.length && fp[i][0] >= op.quota + 0.00001 && !op.deathmatch) {
            var first_candidate = op.setup.candidates[fp[i][1]-1];
            if (op.admissible_candidates != null) {
                if (op.admissible_candidates.some(function(c) { // suboptimal, could have used hash instead
                    return c.name == first_candidate.name;
                })) {
                    op.report(first_candidate.name + " je volitelný v kroce 1.");
                }
                else {
                    op.report("<p>" + first_candidate.name + " nemůže být zvolen v kroce 1, ignoruji.</p>");
                    i++;
                    continue;
                }
            }
            mandates.push([first_candidate, fp[i][0]]);
            op.ab = STVDataBallot.removeCandidateFromAggregatedBallots(op.ab, fp[i][1], op.quota, false);
            if (this.debug) console.error("elected:" + fp[i][1]);
            op.report("<p>Kandidát " + first_candidate.name +" (" + fp[i][1] +
                ") zvolen, na další místa se přesouvá " + STVDataSetup.round(fp[i][0]-op.quota) +
                " (" + new Number((fp[i][0]-op.quota)/fp[i][0]*100).toFixed(1)  + " %) hlasů</p>");
            has_elected = true;
            break;
        }
        if (!has_elected) {
            var last = fp.length - 1;
            while (true) {
                if (op.admissible_candidates != null) {
                    if (op.admissible_candidates.some(function(c) { // suboptimal, could have used hash instead
                        return c.name == op.setup.candidates[fp[last][1]-1].name;
                    })) {
                        op.report(op.setup.candidates[fp[last][1]-1].name + " nemůže být vyřazen, aby mohl v kroce 1 být zvolen.");
                        last--;
                        if (last < 0) {
                            op.report("<h5>Nemůžu nikoho vyřadit, protože všichni musí být zvoleni. Co teď?</h5>");
                        }
                        else {
                            continue;
                        }
                    }
                }
                last_alive = [op.setup.candidates[fp[last][1]-1], fp[last][0]];
                op.report("<p>Žádný kandidát není zvolen, odstraňuji kandidáta " + last_alive[0].name + " ("  + fp[last][1] + ")</p>");
                op.ab = STVDataBallot.removeCandidateFromAggregatedBallots(op.ab, fp[last][1], 0, op.soft_remove);
                if (this.debug) console.error("removed:" + fp[last][1]);
                break;
            }
        }
    }
    if (op.deathmatch) {
        if (last_alive != null && last_alive[1] >= op.quota + 0.00001) {
            op.report("Kandidát " + last_alive[0].name + " vyřazen jako poslední a tím zvolen s počtem hlasů " + STVDataSetup.round(last_alive[1]));
            mandates.push(last_alive);
        }
        else {
            op.report("Poslední vyřazený kandidát nepřekročil kvótu. Nikdo není zvolen.")
        }
    }
    else if (mandates.length >= mandateCount) {
        op.report("<p>Sčítání ukončeno, neboť stanovený počet mandátů byl obsazen.</p>");
    }
    else {
        op.report("<p>Běh sčítání ukončen.</p>");
    }
    return mandates;
};

STV.prototype.stv_top_down = function(setup, valid_ballots_count, original_ab, replacement_quota, original_fp, candidate_orders, report) {
    var mandates = [];
    for (var round = 1; round <= setup.mandateCount; round++) {
        var new_ab = STVDataBallot.clone_ab(original_ab);
        var elected = mandates.map(function(m){return m[0];}).filter(function(c){return !c.is_null;});
        var quota = valid_ballots_count / ((round <= setup.orderedCount ? round : setup.mandateCount) + 1);
        report("<h5>Cyklus č. " + round + "</h5>");
        // krok 1
        if (round > 1) {
            report("Krok 1: odstranění již zvolených kandidátů (" + elected.map(function(m){return m.name;}).join(", ") + ")<br/>");
            new_ab = STVDataBallot.remove_non_candidates(new_ab, setup, round - 1, elected, report, true);
            var elected_last_round = mandates.map(function(m){return m[0];});
            elected_last_round.pop();
            elected_last_round = elected_last_round.filter(function(c){return !c.is_null;});
            new_ab = STVDataBallot.remove_gender_violators_from_ab(new_ab, setup, report, candidate_orders, elected_last_round, round -1, true);
            var op_step1 = {
                "soft_remove": true, "admissible_candidates": elected, "setup": setup, "ab": new_ab, "report": report, "quota": quota, "original_fp": original_fp
            };
            this.stv_round(op_step1);
            new_ab = op_step1["ab"];
        // krok 2
            new_ab = STVDataBallot.reinsert_to_ab(new_ab);
            report("<p>Preference po vrácení kandidátů vyřazených v kroku 1</p>" + STVDataBallot.reportAggregatedBallots(setup, new_ab));
        }
        report("Krok 2: volba mandátu<br/>");
        new_ab = STVDataBallot.remove_gender_violators_from_ab(new_ab, setup, report, candidate_orders, elected, round, false);
        new_ab = STVDataBallot.remove_non_candidates(new_ab, setup, round, elected, report, false);
        if (this.debug) console.error("cycle start: " + round);
        var new_fp = STVDataBallot.aggregateFirstPreferences(new_ab, setup, original_fp);
        if (this.debug) new_fp.forEach(function (f) {console.error(["original",f[0],f[1]].join(":"));});
        var new_mandates = this.stv_round({
            "deathmatch": true, "setup": setup, "ab": new_ab, "report": report, "quota": quota, "original_fp": original_fp
        });
        if (this.debug) console.error("cycle end: " + round);
        if (new_mandates.length > 0) {
            var winner = new_mandates[0];
            report("<br/>V cyklu č. " + round + " byl zvolen kandidát: <b>" + winner[0].name + "</b>.");
            mandates.push(winner);
        }
        else {
            report("V cyklu č. " + round + " nebyl zvolen žádný kandidát.");
            mandates.push([STVDataCandidate.nullCandidate(), 0]);
        }
    }
    return mandates;
};

STV.prototype.run = function(setup, ballots, report, done) {
    setup.debug = this.debug;
    var ab = STVDataBallot.aggregateBallots(ballots);
    var original_ab = STVDataBallot.clone_ab(ab);
    var original_fp = STVDataBallot.aggregateFirstPreferences(ab, setup, null);
    if (this.debug) original_fp.forEach(function (f) {console.error(["original",f[0],f[1]].join(":"));});
    var valid_ballots_count = ballots.length - ab['_invalid'];
    report(
        "<h1>Výpočet volby: " + setup.voteNo + "</h1>" +
        "<p>Z " + setup.candidateCount + " kandidátů voleno " + setup.mandateCount + " mandátů, z toho " +
        setup.orderedCount + " pozic, kde záleží na pořadí. Odevzdáno " + ballots.length + " hlasovacích lístků.<br/>" +
        "Neplatných lístků: " + ab['_invalid'] + ", prázdných lístků: " + ab['_empty'] + "</p>" +
        "<p>Kandidáti:<table><tr>" + setup.candidates.map(function(c){
            return "<td>" + c.gender + "</td><td>" + c.name + "</td><td>" +
            c.acceptable_positions.map(function(p){return p?'✓':'✗';}) + "</td>";
            }).join("</tr><tr>") +
        "</tr></table></p>" +
        "<p>Maximální počet mužů: " + (setup.m_max > 0 ? setup.m_max : 'neomezen')  + ", " +
        "maximální počet žen: " + (setup.f_max > 0 ? setup.f_max : 'neomezen') + "<br/>" +
        "<p>Genderová omezení pořadí: <table><tr>" + (setup.gconstraints.length > 0 ? setup.gconstraints.map(function(c){
            return "<td>Mezi místy </td><td>" + c.from + "</td><td> a </td><td>" + c.to + "</td><td>smí být nejvýše </td><td>" +
            c.mmax + "</td><td> mužů a nejvýše </td><td>" + c.fmax + "</td><td>žen</td>";
            }).join("</tr><tr>") : "žádná") +
        "</tr></table></p>" +
        "Počet platných hlasovacích lístků: " + valid_ballots_count + "</p>"
    );
    var candidate_orders = {};
    setup.candidates.forEach(function(c, i) {
        candidate_orders[c.name] = i + 1;
    });
    var mandates_scores;
    var replacements = [];
    if (setup.orderedCount == 0 && setup.f_max == 0 && setup.m_max == 0) {
        // plain STV:
        var quota = valid_ballots_count / (setup.mandateCount + 1);
        mandates_scores = this.stv_round({
            "setup": setup, "ab": ab, "report": report, "quota": quota, "original_fp": original_fp
        });
    }
    else {
        // top-down STV
        mandates_scores = this.stv_top_down(setup, valid_ballots_count, original_ab, 0, original_fp, candidate_orders, report);
    }
    var orig_map = {};
    original_fp.forEach(function(p) {
        orig_map[p[1]] = new Number(p[0]).toFixed(0);
    });
    var mandates = mandates_scores.map(function(ms) {
        var m = ms[0];
        m.score = new Number(ms[1]).toFixed(0);
        m.first_score = orig_map[candidate_orders[m.name]] || 0;
        return m;
    });
    report("<h2>Zvolení kandidáti:</h2><ul><li>" + mandates.map(function(c, i){
        var ret = "";
        if (i < setup.orderedCount) {
            ret += "Pozice č. " + (1+i) + ": ";
        }
        ret += c.name;
        if (replacements[i] != null && replacements[i].length > 0) {
            ret += " (náhradník: " + replacements[i].map(function(r){return r.name;}).join(", ") + ")";
        }
        return ret + ": počet prvních míst: " + c.first_score + ", při zvolení: " + c.score;
    }).join("</li><li>") + "</li></ul>");
    done(mandates, replacements);
}

})()
