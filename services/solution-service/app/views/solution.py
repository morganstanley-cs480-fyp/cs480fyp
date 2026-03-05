from fastapi import APIRouter, HTTPException
from typing import List
from tortoise import Tortoise
from app.schemas.solution import SolutionCreate, SolutionUpdate, SolutionResponse
from app.models import Solution

# Sample CRUD Routers. Might add pagination in the future

router = APIRouter(prefix="/api/solutions", tags=["solutions"])

@router.get("", response_model=List[SolutionResponse])
async def list_solutions():
    solutions = await Solution.all()
    return solutions

@router.get("/{solution_id}", response_model=SolutionResponse)
async def get_solution(solution_id: int):
    solution = await Solution.get_or_none(id=solution_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution

@router.post("", response_model=SolutionResponse, status_code=201)
async def create_solution(solution_data: SolutionCreate):
    solution = await Solution.create(**solution_data.model_dump())
    return solution

@router.post("/batch", response_model=List[SolutionResponse], status_code=201)
async def batch_create_solutions(solutions_data: List[SolutionCreate]):
    """
    Create multiple solutions in a single request.
    """
    created_solutions = []
    for solution_data in solutions_data:
        solution = await Solution.create(**solution_data.model_dump())
        created_solutions.append(solution)  
    return created_solutions

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

@router.post("/table", status_code=201)
async def create_solutions_table():
    """
    Creates the solutions table with 6-digit ID constraint if it doesn't exist.
    This endpoint is idempotent - safe to call multiple times.
    """
    sql = """
    -- Create solutions table
    CREATE TABLE IF NOT EXISTS solutions (
        id SERIAL PRIMARY KEY,
        exception_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        exception_description TEXT,
        reference_event TEXT,
        solution_description TEXT,
        scores INTEGER NOT NULL,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Foreign key constraint
        CONSTRAINT fk_solutions_exception_id 
            FOREIGN KEY (exception_id) REFERENCES exceptions(id) ON DELETE CASCADE,
        
        -- Score constraint
        CONSTRAINT chk_solutions_scores 
            CHECK (scores >= 0 AND scores <= 27)
    );

    -- Create indexes for solutions table
    CREATE INDEX IF NOT EXISTS idx_solutions_exception_id ON solutions(exception_id);
    CREATE INDEX IF NOT EXISTS idx_solutions_scores ON solutions(scores DESC);
    CREATE INDEX IF NOT EXISTS idx_solutions_create_time ON solutions(create_time DESC);
    """
    
    # SQL to set sequence (only runs if sequence exists)
    sequence_sql = """
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'solutions_id_seq') THEN
            ALTER SEQUENCE solutions_id_seq RESTART WITH 100000;
        END IF;
    END $$;
    """
    
    try:
        conn = Tortoise.get_connection("default")
        
        # Execute table creation SQL
        await conn.execute_script(sql)
        
        # Execute sequence restart SQL
        await conn.execute_script(sequence_sql)
        
        return {
            "message": "Solutions table created successfully",
            "details": "Table created with 6-digit ID constraint (starting from 100000)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create table: {str(e)}")