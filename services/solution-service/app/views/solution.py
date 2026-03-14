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

@router.get("/{exception_id}", response_model=SolutionResponse)
async def get_solution(exception_id: int):
    solution = await Solution.get_or_none(exception_id=exception_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution

@router.post("", response_model=SolutionResponse, status_code=201)
async def create_solution(solution_data: SolutionCreate):
    # Check if solution with this exception_id already exists
    existing_solution = await Solution.filter(exception_id=solution_data.exception_id).first()
    if existing_solution:
        raise HTTPException(
            status_code=409, 
            detail=f"Solution for exception_id {solution_data.exception_id} already exists"
        )
    
    try:
        # Exclude create_time - let DB generate it
        data = solution_data.model_dump(exclude_unset=True, exclude={'create_time'})
        solution = await Solution.create(**data)
        await solution.refresh_from_db()
        return solution
    except Exception as e:
        # If duplicate key error, sync sequence and retry once
        if "duplicate key value violates unique constraint" in str(e) and "solutions_pkey" in str(e):
            conn = Tortoise.get_connection("default")
            await conn.execute_script("""
                SELECT setval('solutions_id_seq', (SELECT COALESCE(MAX(id), 99999) FROM solutions));
            """)
            # Retry the creation
            data = solution_data.model_dump(exclude_unset=True, exclude={'create_time'})
            solution = await Solution.create(**data)
            await solution.refresh_from_db()
            return solution
        else:
            raise

@router.post("/batch", response_model=List[SolutionResponse], status_code=201)
async def batch_create_solutions(solutions_data: List[SolutionCreate]):
    """
    Create multiple solutions in a single request.
    Skips solutions with duplicate exception_ids.
    """
    created_solutions = []
    skipped = []
    sequence_synced = False
    
    for solution_data in solutions_data:
        # Check if solution with this exception_id already exists
        existing_solution = await Solution.filter(exception_id=solution_data.exception_id).first()
        if existing_solution:
            skipped.append({
                "exception_id": solution_data.exception_id,
                "reason": "Solution already exists"
            })
            continue
        
        try:
            # Exclude create_time - let DB generate it
            data = solution_data.model_dump(exclude_unset=True, exclude={'create_time'})
            solution = await Solution.create(**data)
            await solution.refresh_from_db()
            created_solutions.append(solution)
        except Exception as e:
            if not sequence_synced and "duplicate key value violates unique constraint" in str(e) and "solutions_pkey" in str(e):
                conn = Tortoise.get_connection("default")
                await conn.execute_script("""
                    SELECT setval('solutions_id_seq', (SELECT COALESCE(MAX(id), 99999) FROM solutions));
                """)
                sequence_synced = True
                # Retry this solution
                data = solution_data.model_dump(exclude_unset=True, exclude={'create_time'})
                solution = await Solution.create(**data)
                await solution.refresh_from_db()
                created_solutions.append(solution)
            else:
                raise
    
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
        create_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        
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

@router.delete("/table/drop", status_code=200)
async def drop_solutions_table():
    """
    Drops the solutions table if it exists.
    WARNING: This will delete all solution data permanently.
    """
    sql = "DROP TABLE IF EXISTS solutions CASCADE;"
    
    try:
        conn = Tortoise.get_connection("default")
        await conn.execute_script(sql)
        
        return {
            "message": "Solutions table dropped successfully",
            "details": "All solution data has been deleted"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to drop table: {str(e)}")