from fastapi import APIRouter
from pydantic import BaseModel

from . import service

router = APIRouter(prefix="/api/rng", tags=["RNG équitable"])


class VerifyIn(BaseModel):
    server_seed: str
    client_seed: str
    nonce: int


@router.post("/verify")
def verify(body: VerifyIn):
    """Vérification publique : recalcule l'engagement et le tirage à partir des graines révélées."""
    return {"commitment": service.commitment(body.server_seed), "roll": service.roll(body.server_seed, body.client_seed, body.nonce), "range": service.RANGE}
