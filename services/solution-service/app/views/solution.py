from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.solution import SolutionCreate, SolutionUpdate, SolutionResponse
from app.models import Solution

# Sample CRUD Routers. Might add pagination in the future

router = APIRouter(prefix="/api/solutions", tags=["solutions"])

@router.get("/", response_model=List[SolutionResponse])
async def list_solutions():
    solutions = await Solution.all()
    return solutions

@router.get("/{solution_id}", response_model=SolutionResponse)
async def get_solution(solution_id: int):
    solution = await Solution.get_or_none(id=solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution

@router.post("/", response_model=SolutionResponse, status_code=201)
async def create_solution(solution_data: SolutionCreate):
    solution = await Solution.create(**solution_data.model_dump())
    return solution

@router.put("/{solution_id}", response_model=SolutionResponse)
async def update_solution(solution_id: int, solution_data: SolutionUpdate):
    solution = await Solution.get_or_none(id=solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    await solution.update_from_dict(solution_data.model_dump(exclude_unset=True))
    await solution.save()
    return solution

@router.delete("/{solution_id}", status_code=204)
async def delete_solution(solution_id: int):
    solution = await Solution.get_or_none(id=solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    await solution.delete()