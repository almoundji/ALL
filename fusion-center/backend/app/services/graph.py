"""Analyse de liens : voisinage, chemins, centralité, communautés (NetworkX)."""
from collections import deque

import networkx as nx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import Entity, Relation, User
from .access import user_can_see, visible_entities_stmt, visible_relations_stmt


def load_graph(db: Session, user: User) -> nx.Graph:
    g = nx.Graph()
    for e in db.execute(visible_entities_stmt(user)).scalars():
        g.add_node(e.id, label=e.label, type=e.type, classification=e.classification)
    for r in db.execute(visible_relations_stmt(user)).scalars():
        if r.source_id in g and r.target_id in g:
            if g.has_edge(r.source_id, r.target_id):
                g[r.source_id][r.target_id]["weight"] += r.weight
            else:
                g.add_edge(r.source_id, r.target_id, weight=r.weight, type=r.type, id=r.id)
    return g


def ego_subgraph(db: Session, user: User, roots: list[int], depth: int = 1, limit: int = 300) -> dict:
    """Expansion en largeur depuis des entités racines, restreinte aux objets visibles."""
    seen: set[int] = set()
    frontier = deque()
    for r in roots:
        if r not in seen:
            seen.add(r)
            frontier.append((r, 0))
    while frontier and len(seen) < limit:
        node, d = frontier.popleft()
        if d >= depth:
            continue
        rels = db.execute(visible_relations_stmt(user).where(or_(Relation.source_id == node, Relation.target_id == node))).scalars()
        for rel in rels:
            other = rel.target_id if rel.source_id == node else rel.source_id
            if other not in seen:
                seen.add(other)
                frontier.append((other, d + 1))
                if len(seen) >= limit:
                    break
    ents = db.execute(visible_entities_stmt(user).where(Entity.id.in_(seen))).scalars().all()
    ids = {e.id for e in ents}
    rels = db.execute(visible_relations_stmt(user).where(Relation.source_id.in_(ids), Relation.target_id.in_(ids))).scalars().all()
    return {"nodes": ents, "edges": rels}


def shortest_path(db: Session, user: User, a: int, b: int, max_len: int = 6) -> list[int] | None:
    g = load_graph(db, user)
    if a not in g or b not in g:
        return None
    try:
        path = nx.shortest_path(g, a, b)
    except nx.NetworkXNoPath:
        return None
    return path if len(path) - 1 <= max_len else None


def centrality(db: Session, user: User, top: int = 10) -> dict:
    g = load_graph(db, user)
    if g.number_of_nodes() == 0:
        return {"degree": [], "betweenness": [], "pagerank": [], "communities": []}
    deg = nx.degree_centrality(g)
    btw = nx.betweenness_centrality(g, k=min(200, g.number_of_nodes()), seed=42) if g.number_of_nodes() > 2 else {}
    pr = nx.pagerank(g, weight="weight")

    def fmt(scores):
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top]
        return [{"id": n, "label": g.nodes[n]["label"], "type": g.nodes[n]["type"], "score": round(s, 4)} for n, s in ranked]

    comms = []
    if g.number_of_edges() > 0:
        for i, c in enumerate(nx.community.greedy_modularity_communities(g, weight="weight")):
            members = sorted(c, key=lambda n: deg.get(n, 0), reverse=True)
            comms.append({"id": i, "size": len(members),
                          "members": [{"id": n, "label": g.nodes[n]["label"], "type": g.nodes[n]["type"]} for n in members[:12]]})
    return {"degree": fmt(deg), "betweenness": fmt(btw), "pagerank": fmt(pr), "communities": comms[:10],
            "nodes": g.number_of_nodes(), "edges": g.number_of_edges()}
