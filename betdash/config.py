"""Championnats supportés : code football-data.co.uk <-> clé The Odds API."""

LEAGUES = {
    "Premier League (ANG)": {"fd": "E0", "odds": "soccer_epl"},
    "Championship (ANG)": {"fd": "E1", "odds": "soccer_efl_champ"},
    "Ligue 1 (FRA)": {"fd": "F1", "odds": "soccer_france_ligue_one"},
    "Ligue 2 (FRA)": {"fd": "F2", "odds": "soccer_france_ligue_two"},
    "La Liga (ESP)": {"fd": "SP1", "odds": "soccer_spain_la_liga"},
    "Bundesliga (ALL)": {"fd": "D1", "odds": "soccer_germany_bundesliga"},
    "Serie A (ITA)": {"fd": "I1", "odds": "soccer_italy_serie_a"},
    "Eredivisie (P-B)": {"fd": "N1", "odds": "soccer_netherlands_eredivisie"},
    "Liga Portugal (POR)": {"fd": "P1", "odds": "soccer_portugal_primeira_liga"},
}

DEFAULT_LEAGUES = ["Premier League (ANG)", "Ligue 1 (FRA)", "La Liga (ESP)"]

# Noms The Odds API -> noms football-data.co.uk (les autres sont appariés
# automatiquement par similarité de nom).
TEAM_ALIASES = {
    "manchester united": "Man United",
    "manchester city": "Man City",
    "tottenham hotspur": "Tottenham",
    "wolverhampton wanderers": "Wolves",
    "newcastle united": "Newcastle",
    "nottingham forest": "Nott'm Forest",
    "brighton and hove albion": "Brighton",
    "west ham united": "West Ham",
    "leeds united": "Leeds",
    "sheffield wednesday": "Sheffield Weds",
    "queens park rangers": "QPR",
    "paris saint germain": "Paris SG",
    "saint etienne": "St Etienne",
    "atletico madrid": "Ath Madrid",
    "athletic bilbao": "Ath Bilbao",
    "real betis": "Betis",
    "celta vigo": "Celta",
    "rayo vallecano": "Vallecano",
    "real sociedad": "Sociedad",
    "espanyol": "Espanol",
    "borussia dortmund": "Dortmund",
    "borussia monchengladbach": "M'gladbach",
    "bayer leverkusen": "Leverkusen",
    "eintracht frankfurt": "Ein Frankfurt",
    "1. fc koln": "FC Koln",
    "fc koln": "FC Koln",
    "inter milan": "Inter",
    "ac milan": "Milan",
    "as roma": "Roma",
    "hellas verona": "Verona",
    "psv eindhoven": "PSV Eindhoven",
    "sporting lisbon": "Sp Lisbon",
    "sporting cp": "Sp Lisbon",
    "fc porto": "Porto",
    "sc braga": "Sp Braga",
}
