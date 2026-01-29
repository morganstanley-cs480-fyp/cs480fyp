from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "solutions" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "exception_id" INT NOT NULL,
    "title" TEXT NOT NULL,
    "exception_description" TEXT,
    "reference_event" TEXT,
    "solution_description" TEXT,
    "create_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scores" INT NOT NULL
);
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztl21v2jAQx79KlFetxKqW0QftHaVsZSpQlWyrWlWRSY5gkdjUcVpQxXef7SSYhCSDvh"
    "ndeAd3/7PvfvHD+c0MqAt+eDSgfsQxJeYX480kKADxY81XM0w0nWqPNHA09JU4TFTKioYh"
    "Z8jhwjFCfgjC5ELoMDxNJiGR70sjdYQQE0+bIoKfI7A59YCPgQnH45MwY+LCDML073Rijz"
    "D4biZf7Mq5ld3m86mydQj/qoRytqHtiCwDosXTOR9TslRjwqXVAwIMcZDDcxbJ9GV2Salp"
    "RXGmWhKnuBLjwghFPl8pd0MGjsAo+IlsQlWgJ2f5VD9pnDcuPp81LoREZbK0nC/i8nTtca"
    "Ai0LPMhfIjjmKFwqi5wcwBlZS9FcF82J9ZpuSqYKYGTVOvoF3CqfFxzEX4GjcLZiXglgE5"
    "YiLJ3SRWgcNq31sy6SAMn31p6P1s3rWum3cH3eb9ofLME89Nv/ctlVNxOsTnRq9107/MEd"
    "UrazXhLQiXDvAu4sl2/oeBMxgBA+KADS8Q79tNUReE7iEXQk5vyPcu6rL4Pe5C3A4DUb7N"
    "cVBwOF8Jl/QUk86F5gC7SexR+mM3D22xM5HbJ/48+dpV/Dvd9sBqdm8zH+GqabWlp575AK"
    "n14Oww+w2Wgxi/Ota1If8aD/1eWxGkIfeYmlHrrAdT5oQiTm1CX23krvROqTUFk91JDpWD"
    "bd6q6ID/qUmRjfJostLyScMQOZNXxFx7zUPrtEy77grqQd6CCPIUC1mRTC55PzSBYWdsFr"
    "wsEk+t6l2BtGb/qNixBVareFS8AAsLL7jWGLFieishH6UzFqt+ZvtAPC4XeP30tIJZeqcJ"
    "Ve7oTK+7euzL3mNya2wBMZF/TIAnx8cbABSqUoDKl2sEKOGFTe33Qb9X0gDokBzIH0QU+O"
    "hih9cMH4f8aTexVlCUVVc3W/m+KneBywEu//b1svgNM/v8hw=="
)
