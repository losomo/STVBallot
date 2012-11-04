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
    while (mandates.length < op.setup.mandateCount && Object.keys(op.ab).length > 0) { // a) iv)
        op.report("<p>Shrnutí vyplněných preferencí</p>" + STVDataBallot.reportAggregatedBallots(op.setup, op.ab));
        var fp = STVDataBallot.aggregateFirstPreferences(op.ab, op.setup, op.original_fp);
        if (fp.length == 0) break;
        op.report("<p>Počet hlasů s nejvyšší preferencí:<table>");
        fp.forEach(function(f) {op.report("<tr><td>" + STVDataSetup.round(f[0]) + "</td><td>" + f[1] + " (" + op.setup.candidates[f[1]-1].name + ")</td></tr>")});
        op.report("</table>");
        var has_elected = false;
        var i = 0; // alternative algorithm could be: cycle for all i < fp.length in one round
        if (fp[i][0] >= op.quota) {
            mandates.push(op.setup.candidates[fp[i][1]-1]);
            op.ab = STVDataBallot.removeCandidateFromAggregatedBallots(op.ab, fp[i][1], op.quota);
            op.report("<p>Kandidát <b>" + op.setup.candidates[fp[i][1]-1].name +"</b> (" + fp[i][1] +
                ") zvolen, na další místa se přesouvá " + STVDataSetup.round(fp[i][0]-op.quota) +
                " (" + new Number((fp[i][0]-op.quota)/fp[i][0]*100).toFixed(1)  + " %) hlasů</p>");
            has_elected = true;
        }
        if (!has_elected) {
            var last = fp.length - 1;
            op.report("<p>Žádný kandidát nepřekračuje kvótu, odstraňuji kandidáta " + op.setup.candidates[fp[last][1]-1].name + " ("  + fp[last][1] + ")</p>");
            op.ab = STVDataBallot.removeCandidateFromAggregatedBallots(op.ab, fp[last][1], 0);
        }
    }
    if (mandates.length >= op.setup.mandateCount) {
        op.report("<p>Sčítání ukončeno, neboť stanovený počet mandátů byl obsazen.</p>");
    }
    else {
        op.report("<p>Sčítání ukončeno, neboť všichni kandidáti byli zvoleni nebo vyřazeni.</p>");
    }
    op.report("<h5>Zvolení kandidáti:</h5>" + mandates.map(function(c){return c.name;}).join(", ") + ". ");
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
    var quota = valid_ballots_count / (setup.mandateCount + 1) + 0.00001;
    var mandates;
    if (true /* TODO */|| setup.f_max == 0 &&  setup.m_max == 0 && setup.orderedCount == 0) {
        // plain STV:
        mandates = stv_round({
            "setup": setup, "ab": ab, "report": report, "quota": quota, "original_fp": original_fp
        });
        report("<h1>Výpočet náhradníků</h1>");
        mandates.forEach(function(mandate) {
            var new_ab = STVDataBallot.clone_ab(original_ab);
            var cnum = 0;
            setup.candidates.some(function(c, i) { // suboptimal, could have used hash instead
                if (c.name == mandate.name) {cnum = i+1; return true;} else {return false;}
            });
            report("<p>Náhradník za: " + mandate.name + " (kandidát č. " + cnum + ")<br/>");
            new_ab = STVDataBallot.removeCandidateFromAggregatedBallots(new_ab, cnum, 0);
            var new_mandates = stv_round({
                "setup": setup, "ab": new_ab, "report": report, "quota": quota, "original_fp": original_fp
            });
            var omandates = mandates.map(function(x){return x;}).sort(function(a, b) {return a.name.localeCompare(b.name)});
            new_mandates.push(mandate);
            new_mandates.sort(function(a, b) {return a.name.localeCompare(b.name)}).some(function(m, i) {
                if (i < omandates.length && m.name == omandates[i].name) {
                    return false;
                }
                else {
                    report("Náhradníkem za " + mandate.name + " se tedy stává " + m.name);
                    return true;
                }
            });
            report("</p>");
        });
        report("<h2>Zvolení kandidáti:</h2><ul><li>" + mandates.map(function(c){return c.name;}).join("</li><li>") + "</li></ul>");
    }
    else {
        // top-down STV
        mandates = [];
        for (var round = 1; round <= setup.mandateCount; round++) {
            var round_quota;
            if (round <= setup.orderedCount) {
                report("<h5>Výpočet pro obsazení pozice č. " + round + "</h5>");
                round_quota = valid_ballots_count / (round + 1) + 0.00001;
            }
            else {
                report("<h5>Kolo č. " + round + "</h5>");
                round_quota = quota;
            }
            // krok i)
            var new_ab = STVDataBallot.clone_ab(original_ab);
            stv_round({
                "soft_remove": true, "admissible_candidates": mandates, "setup": setup, "ab": new_ab, "report": report, "quota": round_quota, "original_fp": original_fp
            });
            // krok ii)
            // TODO reinsert soft-removed to new_ab
            // TODO check genders
            // TODO stv_round with last eliminated only, add to mandates
            // TODO elect the replacement
        }
    }
    done(mandates);
}

})()
