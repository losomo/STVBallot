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
function STV() {
}

(function() {
STV.prototype.validate = function(ballot) {
    if (ballot.invalid || ballot.empty) return "";
    var last = 0;
    var sorted = ballot.entries.sort();
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
            return {status: "error", message: "Různá velikost hromádek"};
        }
        for (var j = 0; j < firstkeys.length; j++) {
            var key = firstkeys[j];
            if (key != ikeys[j]) return {status: "error", message: "Očekáváno " + key};
            if (first[key] != ipile[key]) return {status: "error", message: "Neshoda " + key};
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

function stv_round(op) {
    var mandates = []; // Array of STVDataCandidates
    op.report("<p>Kvóta pro zvolení: " + STVDataSetup.round(op.quota) + "</p>");
    var mandateCount = op.admissible_candidates == null ? op.setup.mandateCount : op.admissible_candidates.length;
    var last_alive; // [candidate, score]
    while (mandates.length < mandateCount && Object.keys(op.ab).length > 0) { // a) iv)
        op.report("<p>Shrnutí vyplněných preferencí</p>" + STVDataBallot.reportAggregatedBallots(op.setup, op.ab));
        var fp = STVDataBallot.aggregateFirstPreferences(op.ab, op.setup, op.original_fp);
        if (fp.length == 0) break;
        op.report("<p>Počet hlasů s nejvyšší preferencí:<table>");
        fp.forEach(function(f) {op.report("<tr><td>" + STVDataSetup.round(f[0]) + "</td><td>" + f[1] + " (" + op.setup.candidates[f[1]-1].name + ")</td></tr>")});
        op.report("</table>");
        var has_elected = false;
        var i = 0;
        while (i < fp.length && fp[i][0] >= op.quota && !op.deathmatch) {
            if (op.admissible_candidates != null) {
                if (op.admissible_candidates.some(function(c) { // suboptimal, could have used hash instead
                    return c.name == op.setup.candidates[fp[i][1]-1].name;
                })) {
                    op.report(op.setup.candidates[fp[i][1]-1].name + " je volitelný v kroce i).");
                }
                else {
                    op.report("<p>" + op.setup.candidates[fp[i][1]-1].name + " nemůže být zvolen v kroce i), ignoruji.</p>");
                    i++;
                    continue;
                }
            }
            mandates.push(op.setup.candidates[fp[i][1]-1]);
            op.ab = STVDataBallot.removeCandidateFromAggregatedBallots(op.ab, fp[i][1], op.quota, false);
            op.report("<p>Kandidát " + op.setup.candidates[fp[i][1]-1].name +" (" + fp[i][1] +
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
                        op.report(op.setup.candidates[fp[last][1]-1].name + " nemůže být vyřazen, aby mohl v kroce i) být zvolen.");
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
                break;
            }
        }
    }
    if (op.deathmatch) {
        if (last_alive != null && last_alive[1] >= op.quota) {
            op.report("Kandidát " + last_alive[0].name + " vyřazen jako poslední a tím zvolen s počtem hlasů " + last_alive[1]);
            mandates.push(last_alive[0]);
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
}

function stv_top_down(setup, valid_ballots_count, original_ab, replacement_quota, original_fp, candidate_orders, report) {
    var mandates = [];
    for (var round = 1; round <= setup.mandateCount; round++) {
        var round_quota;
        var new_ab = STVDataBallot.clone_ab(original_ab);
        if (round <= setup.orderedCount) {
            report("<h5>Výpočet pro obsazení pozice č. " + round + "</h5>");
            round_quota = valid_ballots_count / (round + 1) + 0.00001;
        }
        else {
            report("<h5>Kolo č. " + round + "</h5>");
            round_quota = valid_ballots_count / (setup.mandateCount + 1) + 0.00001;
        }
        // krok i)
        if (round > 1) {
            report("Krok i: odstranění již zvolených kandidátů (" + mandates.map(function(m){return m.name;}).join(", ") + ")");
            new_ab = STVDataBallot.remove_non_candidates(new_ab, setup, round - 1, mandates, report, true);
            var op_step1 = {
                "soft_remove": true, "admissible_candidates": mandates, "setup": setup, "ab": new_ab, "report": report, "quota": round_quota, "original_fp": original_fp
            };
            stv_round(op_step1);
            new_ab = op_step1["ab"];
        // krok ii)
            new_ab = STVDataBallot.reinsert_to_ab(new_ab);
            report("<p>Preference po vrácení kandidátů vyřazených v kroku i)</p>" + STVDataBallot.reportAggregatedBallots(setup, new_ab));
        }
        new_ab = STVDataBallot.remove_gender_violators_from_ab(new_ab, setup, report, candidate_orders, mandates);
        report("Krok ii: volba mandátu<br/>");
        new_ab = STVDataBallot.remove_non_candidates(new_ab, setup, round, mandates, report, false);
        var new_mandates = stv_round({
            "deathmatch": true, "setup": setup, "ab": new_ab, "report": report, "quota": (round_quota > replacement_quota ? round_quota : replacement_quota), "original_fp": original_fp
        });
        if (new_mandates.length > 0) {
            report("<br/>V kole č. " + round + " byl zvolen kandidát: <b>" + new_mandates[0].name + "</b>.");
            mandates.push(new_mandates[0]);
        }
        else {
            report("V kole č. " + round + " nebyl zvolen žádný kandidát.");
        }
    }
    return mandates;
}

STV.prototype.run = function(setup, ballots, report, done) {
    var ab = STVDataBallot.aggregateBallots(ballots);
    var original_ab = STVDataBallot.clone_ab(ab);
    var original_fp = STVDataBallot.aggregateFirstPreferences(ab, setup, null);
    var valid_ballots_count = ballots.length - ab['_invalid'];
    report(
        "<h1>Výpočet volby: " + setup.voteNo + "</h1>" +
        "<p>Z " + setup.candidateCount + " kandidátů voleno " + setup.mandateCount + " mandátů, z toho " +
        setup.orderedCount + " pozic s pořadím. Odevzdáno " + ballots.length + " hlasovacích lístků.<br/>" +
        "Neplatných lístků: " + ab['_invalid'] + ", prázdných lístků: " + ab['_empty'] + "</p>" +
        "<p>Kandidáti:<table><tr>" + setup.candidates.map(function(c){
            return "<td>" + c.gender + "</td><td>" + c.name + "</td><td>" +
            c.acceptable_positions.map(function(p){return p?'✓':'✗';}) + "</td>";
            }).join("</tr><tr>") +
        "</tr></table></p>" +
        "<p>Maximální počet mužů: " + (setup.m_max > 0 ? setup.m_max : 'neomezen')  + ", " +
        "maximální počet žen: " + (setup.f_max > 0 ? setup.f_max : 'neomezen') + "<br/>" +
        "Počet platných hlasovacích lístků: " + valid_ballots_count + "</p>"
    );
    var candidate_orders = {};
    setup.candidates.forEach(function(c, i) {
        candidate_orders[c.name] = i + 1;
    });
    var mandates;
    var replacements = [];
    var plainOK = false;
    if (setup.orderedCount == 0) {
        // plain STV:
        var quota = valid_ballots_count / (setup.mandateCount + 1) + 0.00001;
        mandates = stv_round({
            "setup": setup, "ab": ab, "report": report, "quota": quota, "original_fp": original_fp
        });
        if (setup.f_max > 0 || setup.m_max > 0) {
            var g_counts = {};
            mandates.forEach(function(m) {
                g_counts[m.gender] = g_counts[m.gender] ? g_counts[m.gender] + 1 : 1;
            });
            if (g_counts['M'] > setup.m_max) {
                report("<p><b>Zvolené mandáty nejsou platné, neboť počet zvolených mužů (" + g_counts['M'] + ") překračuje maximální počet (" + setup.m_max + "). Zahajuji nové sčítání podle odst. 4.</b></p>");
                plainOK = false;
            }
            else if (g_counts['F'] > setup.f_max) {
                report("<p><b>Zvolené mandáty nejsou platné, neboť počet zvolených žen (" + g_counts['F'] + ") překračuje maximální počet (" + setup.f_max + "). Zahajuji nové sčítání podle odst. 4.</b></p>");
                plainOK = false;
            }
            else {
                report("<p>Zvolené mandáty odpovídají kvótám: počet žen (" + g_counts['F'] + ") nepřekračuje " + setup.f_max + " a počet mužů (" + g_counts['M'] + ") nepřekračuje " + setup.m_max + "</p>");
                plainOK = true;
            }
        }
        else {
            plainOK = true;
        }
        if (plainOK) {
            report("<h1>Výpočet náhradníků</h1>");
            mandates.forEach(function(mandate, morder) {
                var new_ab = STVDataBallot.clone_ab(original_ab);
                var cnum = candidate_orders[mandate.name];
                report("<p>Výpočet náhradníka za: " + mandate.name + " (kandidát č. " + cnum + ")<br/>");
                new_ab = STVDataBallot.removeCandidateFromAggregatedBallots(new_ab, cnum, 0, false);
                var new_mandates = stv_round({
                    "setup": setup, "ab": new_ab, "report": report, "quota": quota, "original_fp": original_fp
                });
                if (!new_mandates.some(function(m) {
                    if (mandates.some(function(om) {return om.name == m.name})) {
                        return false;
                    }
                    else {
                        report("<br/>Náhradníkem za " + mandate.name + " se stává " + m.name);
                        replacements[morder] = [m];
                        return true;
                    }
                })) {
                    report("<br/>Náhradník za " + mandate.name + " nemohl být zvolen.")
                    replacements[morder] = [];
                }
                report("</p>");
            });
        }
    }
    if (!plainOK) {
        // top-down STV
        mandates = stv_top_down(setup, valid_ballots_count, original_ab, 0, original_fp, candidate_orders, report);
        mandates.forEach(function(mandate, morder) {
            var new_ab = STVDataBallot.clone_ab(original_ab);
            var cnum = candidate_orders[mandate.name];
            report("<p>Výpočet náhradníků za: " + mandate.name + " (kandidát č. " + cnum + ")<br/>");
            var repl_found = true;
            var repls = [];
            var repl_order = 0;
            while (repl_found) {
                repl_order++;
                new_ab = STVDataBallot.removeCandidateFromAggregatedBallots(new_ab, cnum, 0, false);
                repls.forEach(function(repl) {
                    new_ab = STVDataBallot.removeCandidateFromAggregatedBallots(new_ab, candidate_orders[repl.name], 0, false);
                });
                var replacement_quota = morder < setup.orderedCount ? valid_ballots_count / (morder + 2) + 0.00001 : 0;
                // "přičemž zvolen náhradníkem může být pouze kandidát, který dosáhne kvóty nutné pro zvolení nahrazovaného kandidáta
                var new_mandates = stv_top_down(setup, valid_ballots_count, new_ab, replacement_quota, original_fp, candidate_orders, report);
                repl_found = new_mandates.some(function(m) {
                    if (mandates.some(function(om) {return om.name == m.name})) {
                        return false;
                    }
                    else {
                        report("<br/>Náhradníkem č. " + repl_order + " za " + mandate.name + " se stává " + m.name);
                        repls.push(m);
                        return true;
                    }
                });
            }
            replacements[morder] = repls;
            report("<br/>Ukončen výpočet náhradníků za: " + mandate.name + "</p>");
        });
    }
    report("<h2>Zvolení kandidáti:</h2><ul><li>" + mandates.map(function(c, i){
        var ret = "";
        if (i < setup.orderedCount) {
            ret += "Pozice č. " + (1+i) + ": ";
        }
        ret += c.name;
        if (replacements[i] != null && replacements[i].length > 0) {
            ret += " (náhradník: " + replacements[i].map(function(r){return r.name;}).join(", ") + ")";
        }
        return ret;
    }).join("</li><li>") + "</li></ul>");
    done(mandates, replacements);
}

})()
