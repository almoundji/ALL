"""Tableau de bord Streamlit.  Lancer avec :  streamlit run app.py"""

import os

import pandas as pd
import streamlit as st

from betdash import data
from betdash.config import DEFAULT_LEAGUES, LEAGUES
from betdash.pipeline import run
from betdash.value import Settings

st.set_page_config(page_title="Value Bets Foot", page_icon="⚽", layout="wide")


# Cache : les résultats changent peu, les cotes bougent -> 15 min (économise le quota API).
@st.cache_data(ttl=6 * 3600, show_spinner=False)
def cached_results(fd_code):
    return data.load_results(fd_code)


@st.cache_data(ttl=15 * 60, show_spinner=False)
def cached_odds(sport_key, api_key):
    return data.fetch_odds(sport_key, api_key)


def secret_key():
    try:
        return st.secrets.get("ODDS_API_KEY", "")
    except Exception:
        return ""


# ---------------------------------------------------------------- barre latérale
with st.sidebar:
    st.header("⚙️ Réglages")
    default_key = os.environ.get("ODDS_API_KEY") or secret_key()
    demo = st.toggle("Mode démo (données simulées)", value=not default_key,
                     help="Sans clé API, le tableau de bord tourne sur un championnat fictif.")
    api_key = st.text_input("Clé The Odds API", value=default_key, type="password",
                            disabled=demo, help="Gratuite sur the-odds-api.com (500 crédits/mois).")
    leagues = st.multiselect("Championnats", list(LEAGUES), default=DEFAULT_LEAGUES, disabled=demo)
    if not demo:
        st.caption(f"≈ {len(leagues) * 4} crédits API par actualisation (cache 15 min).")

    st.subheader("Stratégie")
    model_weight = st.slider("Poids du modèle vs marché", 0.0, 1.0, 0.3, 0.05,
                             help="0 = consensus des bookmakers seul ; 1 = modèle statistique seul. "
                                  "Le marché est difficile à battre : rester prudent.")
    min_edge = st.slider("Value minimale", 0.0, 0.20, 0.03, 0.01, format="%.2f")
    min_odds, max_odds = st.slider("Plage de cotes", 1.01, 15.0, (1.3, 6.0), 0.05)
    half_life = st.slider("Demi-vie de la forme (jours)", 30, 720, 180, 30,
                          help="Plus court = on privilégie la forme récente.")

    st.subheader("Gestion de bankroll")
    bankroll = st.number_input("Bankroll (€)", min_value=1.0, value=100.0, step=10.0)
    kelly_fraction = st.select_slider("Fraction de Kelly", [0.1, 0.25, 0.5, 1.0], value=0.25)
    max_stake = st.slider("Mise max (% bankroll)", 0.01, 0.10, 0.05, 0.01, format="%.2f")

    if st.button("🔄 Actualiser les cotes"):
        st.cache_data.clear()

settings = Settings(model_weight=model_weight, min_edge=min_edge, min_odds=min_odds,
                    max_odds=max_odds, bankroll=bankroll, kelly_fraction=kelly_fraction,
                    max_stake_pct=max_stake)

# ---------------------------------------------------------------- en-tête
st.title("⚽ Value Bets Football")
st.caption("Compare les cotes de dizaines de bookmakers à un modèle statistique "
           "et signale les paris dont la cote est supérieure à la probabilité estimée.")
st.warning("Aucun modèle ne garantit un gain : même un pari « value » perd souvent. "
           "Mise uniquement ce que tu peux te permettre de perdre. Aide : "
           "Joueurs Info Service 09 74 75 13 13.", icon="⚠️")

if not demo and not api_key:
    st.info("Entre une clé The Odds API dans la barre latérale, ou active le mode démo.")
    st.stop()
if not demo and not leagues:
    st.info("Choisis au moins un championnat.")
    st.stop()

with st.spinner("Collecte des cotes et calcul des probabilités…"):
    res = run(leagues, settings, api_key=api_key, demo=demo, half_life_days=half_life,
              loaders={"results": cached_results, "odds": cached_odds})

for w in res.warnings:
    st.caption(f"ℹ️ {w}")

c1, c2, c3, c4 = st.columns(4)
c1.metric("Matchs analysés", len(res.matches))
c2.metric("Value bets", len(res.picks))
c3.metric("Mise totale conseillée", f"{res.picks['stake'].sum():.2f} €" if len(res.picks) else "0 €")
c4.metric("Crédits API restants", res.credits_remaining or ("démo" if demo else "—"))

tab_picks, tab_matches, tab_ratings, tab_method = st.tabs(
    ["🎯 Paris conseillés", "📅 Tous les matchs", "📊 Force des équipes", "📖 Méthode"])

# ---------------------------------------------------------------- paris conseillés
with tab_picks:
    if res.picks.empty:
        st.info("Aucun pari ne passe les filtres actuels. Élargis la plage de cotes "
                "ou baisse la value minimale.")
    else:
        p = res.picks
        view = pd.DataFrame({
            "Date": p["commence_time"].dt.tz_convert("Europe/Paris").dt.strftime("%d/%m %H:%M"),
            "Championnat": p["league"],
            "Match": p["home_team"] + " – " + p["away_team"],
            "Pari": p["label"],
            "Cote": p["best_odds"],
            "Bookmaker": p["best_bookmaker"],
            "Cote juste": p["fair_odds"],
            "Proba modèle": p["model_prob"] * 100,
            "Proba marché": p["market_prob"] * 100,
            "Proba retenue": p["prob"] * 100,
            "Value": p["edge"] * 100,
            "Mise (€)": p["stake"],
            "Confiance": p["confidence"].map(lambda n: "★" * n + "☆" * (5 - n)),
        })
        st.dataframe(
            view, hide_index=True, width="stretch",
            column_config={
                "Cote": st.column_config.NumberColumn(format="%.2f"),
                "Cote juste": st.column_config.NumberColumn(format="%.2f"),
                "Proba modèle": st.column_config.NumberColumn(format="%.0f %%"),
                "Proba marché": st.column_config.NumberColumn(format="%.0f %%"),
                "Proba retenue": st.column_config.ProgressColumn(format="%.0f %%", min_value=0, max_value=100),
                "Value": st.column_config.NumberColumn(format="+%.1f %%"),
                "Mise (€)": st.column_config.NumberColumn(format="%.2f"),
            },
        )
        st.caption("**Value** = proba retenue × cote − 1 : gain moyen attendu par euro misé. "
                   "**Cote juste** = cote à partir de laquelle le pari devient rentable. "
                   "La confiance monte quand modèle et marché sont d'accord et que le marché est liquide.")
        st.download_button("Exporter en CSV", view.to_csv(index=False).encode("utf-8"),
                           "value_bets.csv", "text/csv")

# ---------------------------------------------------------------- tous les matchs
with tab_matches:
    m = res.matches
    if m.empty:
        st.info("Aucun match.")
    else:
        m = m.sort_values("commence_time")
        cols = {"home": "1", "draw": "N", "away": "2", "over": "+2.5", "btts_yes": "Les 2 marquent"}
        view = pd.DataFrame({
            "Date": m["commence_time"].dt.tz_convert("Europe/Paris").dt.strftime("%d/%m %H:%M"),
            "Championnat": m["league"],
            "Match": m["home_team"] + " – " + m["away_team"],
            **{label: m.get(k, pd.Series(dtype=float)) * 100 for k, label in cols.items()},
            "xG dom.": m.get("xg_home"),
            "xG ext.": m.get("xg_away"),
            "Score probable": m.get("likely_score"),
        })
        pct = st.column_config.NumberColumn(format="%.0f %%")
        st.dataframe(view, hide_index=True, width="stretch",
                     column_config={**{label: pct for label in cols.values()},
                                    "xG dom.": st.column_config.NumberColumn(format="%.2f"),
                                    "xG ext.": st.column_config.NumberColumn(format="%.2f")})
        st.caption("Probabilités du modèle statistique seul. xG = buts attendus.")

        st.subheader("Détail des cotes d'un match")
        options = dict(zip(view["Match"] + " (" + view["Date"] + ")", m["event_id"]))
        chosen = st.selectbox("Match", list(options))
        o = res.outcomes[res.outcomes["event_id"] == options[chosen]]
        if len(o):
            st.dataframe(pd.DataFrame({
                "Pari": o["label"],
                "Meilleure cote": o["best_odds"],
                "Bookmaker": o["best_bookmaker"],
                "Cote moyenne": o["avg_odds"],
                "Cote juste": o["fair_odds"],
                "Value": o["edge"] * 100,
                "Nb bookmakers": o["n_bookmakers"],
            }), hide_index=True, width="stretch",
                column_config={"Meilleure cote": st.column_config.NumberColumn(format="%.2f"),
                               "Cote moyenne": st.column_config.NumberColumn(format="%.2f"),
                               "Cote juste": st.column_config.NumberColumn(format="%.2f"),
                               "Value": st.column_config.NumberColumn(format="%+.1f %%")})

# ---------------------------------------------------------------- force des équipes
with tab_ratings:
    for league, r in res.ratings.items():
        with st.expander(league, expanded=len(res.ratings) == 1):
            t = r.table()
            st.dataframe(t, hide_index=True, width="stretch",
                         column_config={c: st.column_config.NumberColumn(format="%.2f")
                                        for c in ["Attaque", "Défense", "Force", "Matchs (pondérés)"]})
            st.caption(f"Attaque > 1 : marque plus que la moyenne. Défense < 1 : encaisse moins. "
                       f"Avantage du terrain : ×{r.home_adv:.2f} ; moyenne {r.mu:.2f} but(s) par équipe.")

# ---------------------------------------------------------------- méthode
with tab_method:
    st.markdown("""
**1. Collecte.** Les cotes 1N2 et plus/moins de buts de dizaines de bookmakers européens
viennent de [The Odds API](https://the-odds-api.com). Les résultats des deux dernières
saisons viennent de [football-data.co.uk](https://www.football-data.co.uk).

**2. Modèle statistique.** Chaque équipe reçoit une force offensive et défensive
(modèle de Poisson / Dixon-Coles), les matchs récents pesant plus lourd. On en déduit
les buts attendus de chaque équipe, la probabilité de chaque score, puis de chaque pari.

**3. Consensus du marché.** Pour chaque bookmaker on retire sa marge, puis on fait
la moyenne : c'est une estimation très fiable, car elle agrège l'avis de tout le marché.

**4. Value.** La probabilité retenue mélange modèle et marché (curseur « Poids du modèle »).
Un pari est signalé si *probabilité × meilleure cote − 1* dépasse le seuil choisi.

**5. Mise.** Critère de Kelly fractionné, plafonné : on mise plus quand l'avantage est grand,
jamais plus d'un petit pourcentage de la bankroll.

**Limites à connaître**
- Les bookmakers sont très bons : une « value » apparente vient souvent d'une info que le
  modèle ignore (blessures, rotation, météo, motivation). Vérifie l'actualité avant de parier.
- Le modèle ne connaît que les buts marqués ; les promus sans historique sont évalués
  sur le marché seul.
- Les bookmakers limitent souvent les comptes des joueurs gagnants.
- Ne juge une stratégie que sur des centaines de paris : note tes paris et compare ta
  cote à la cote de clôture.
""")
