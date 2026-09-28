import assert from "node:assert/strict";
import { test } from "node:test";
import { demoData, parseOdds, parseResultsCsv, seasonCodes } from "../netlify/lib/data.mts";
import { analyseLeague, consensus, fitRatings, matchTeam, predict } from "../netlify/lib/engine.mts";

test("le modèle retrouve l'avantage du terrain et des probabilités cohérentes", () => {
  const { results } = demoData(3);
  const r = fitRatings(results);
  assert.ok(r.homeAdv > 1 && r.homeAdv < 1.5);
  const p = predict(r, r.teams[0], r.teams[1]);
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-9);
  assert.ok(Math.abs(p.over + p.under - 1) < 1e-9);
});

test("consensus : marge retirée et meilleure cote", () => {
  const rows = parseOdds([{ id: "e1", commence_time: "2026-10-01T18:00:00Z", home_team: "A", away_team: "B", bookmakers: [
    { title: "X", markets: [{ key: "h2h", outcomes: [{ name: "A", price: 2.0 }, { name: "B", price: 3.5 }, { name: "Draw", price: 3.2 }] }] },
    { key: "betfair_ex_eu", title: "Betfair", markets: [{ key: "h2h", outcomes: [{ name: "A", price: 9 }, { name: "B", price: 9 }, { name: "Draw", price: 9 }] }] },
    { title: "Y", markets: [{ key: "h2h", outcomes: [{ name: "A", price: 2.1 }, { name: "B", price: 3.3 }, { name: "Draw", price: 3.1 }] }] },
  ] }]);
  const c = consensus(rows);
  assert.ok(Math.abs(c.reduce((s, o) => s + o.marketProb, 0) - 1) < 1e-9);
  const home = c.find((o) => o.outcome === "home")!;
  assert.equal(home.bestOdds, 2.1);
  assert.equal(home.bestBookmaker, "Y");
});

test("appariement des noms d'équipes", () => {
  const known = ["Man United", "Man City", "Paris SG", "Lens", "Marseille", "Ath Madrid"];
  assert.equal(matchTeam("Manchester United", known), "Man United");
  assert.equal(matchTeam("Paris Saint Germain", known), "Paris SG");
  assert.equal(matchTeam("RC Lens", known), "Lens");
  assert.equal(matchTeam("Olympique Marseille", known), "Marseille");
  assert.equal(matchTeam("Atlético Madrid", known), "Ath Madrid");
  assert.equal(matchTeam("Unknown Town", known), null);
});

test("lecture CSV football-data et codes de saison", () => {
  const csv = "Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG\nF1,15/08/2026,20:00,Lens,Marseille,2,1\nF1,16/08/26,,Lyon,Nice,,\n";
  const r = parseResultsCsv(csv);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].home, r[0].hg, r[0].ag], ["Lens", 2, 1]);
  assert.deepEqual(seasonCodes(new Date("2026-09-28")), ["2627", "2526"]);
  assert.deepEqual(seasonCodes(new Date("2027-03-01")), ["2627", "2526"]);
});

test("analyse démo complète", () => {
  const { results, odds } = demoData();
  const a = analyseLeague("Démo", results, odds, 180);
  assert.equal(a.matches.length, 9);
  assert.equal(a.warnings.length, 0);
  assert.equal(a.outcomes.length, 9 * 5);
  assert.ok(a.outcomes.every((o) => o.modelProb !== null && o.nBookmakers === 7));
});

test("fixtures football-data : matchs à venir et cotes par bookmaker", async () => {
  const { parseFixturesCsv } = await import("../netlify/lib/data.mts");
  const csv = "﻿Div,Date,Time,HomeTeam,AwayTeam,B365H,B365D,B365A,BFEH,BFED,BFEA,B365>2.5,B365<2.5\n"
    + "F1,03/10/2026,20:00,Lens,Marseille,2.1,3.4,3.5,2.2,3.5,3.6,1.9,1.9\n"
    + "F1,01/09/2026,20:00,Lyon,Nice,2.0,3.3,3.8,,,,,\n";
  const by = parseFixturesCsv(csv, Date.parse("2026-09-28T12:00:00Z"));
  assert.deepEqual(Object.keys(by), ["F1"]);
  assert.equal(by.F1.length, 3 + 2); // bourse Betfair (BFE) exclue
  assert.equal(by.F1[0].commence, "2026-10-03T19:00:00.000Z"); // 20:00 heure de Londres (BST)
});

test("sélections : terrain neutre et amicaux", async () => {
  const { parseIntlCsv } = await import("../netlify/lib/data.mts");
  const csv = "date,home_team,away_team,home_score,away_score,tournament,city,country,neutral\n"
    + "2025-06-01,France,Spain,1,1,Friendly,Paris,France,FALSE\n"
    + "2025-07-01,Senegal,Egypt,2,0,African Cup of Nations,Rabat,Morocco,TRUE\n"
    + "2019-07-01,Senegal,Algeria,0,1,African Cup of Nations,Cairo,Egypt,TRUE\n"
    + "2026-11-01,Senegal,Mali,NA,NA,Friendly,Dakar,Senegal,FALSE\n";
  const r = parseIntlCsv(csv, Date.parse("2022-01-01"));
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].weight, r[0].neutral, r[1].weight, r[1].neutral], [0.5, false, 1, true]);
  const rt = fitRatings(r);
  const p = predict(rt, "Senegal", "Egypt", 2.5, true);
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-9);
});
