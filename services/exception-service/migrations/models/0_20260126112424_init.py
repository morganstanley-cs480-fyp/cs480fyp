from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "exceptions" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "trade_id" INT NOT NULL,
    "trans_id" INT NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'Pending',
    "msg" TEXT NOT NULL,
    "comment" TEXT,
    "priority" VARCHAR(50) NOT NULL,
    "create_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_time" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN "exceptions"."status" IS 'PENDING: Pending\nCLOSED: Closed';
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
    "eJztl21P2zAQgP9KlE9M6hDtKCC+dW0GnSBFkG0IhiI3dlOLxA6xA60Q/322kzRvTWiZNs"
    "rGt+Re4rvH5/juUfcpRB7bNmYOCjimRD/UHnUCfCQeqsqWpoMgyFRSwMHYU9YoNVNiMGY8"
    "BA4XmgnwGBIiiJgT4nQZEnmeFFJHGGLiZqKI4LsI2Zy6iE9RKBTXN0KMCUQzxNLX4NaeYO"
    "TBQsQYyrWV3ObzQMmGhH9RhnK1se1QL/JJZhzM+ZSShTUmXEpdRFAIOJKf52Ekw5fRJbmm"
    "GcWRZiZxiDkfiCYg8ngu3RUZOAKj4CeiYSpBV67ysdPe3d89+LS3eyBMVCQLyf5TnF6We+"
    "yoCJiW/qT0gIPYQmHMuImlILLXopd3eZ5hSqwJYirIKGaVs0kYC9gIWxvbwuV/xcY44BGr"
    "QutPQWiQyFfkhiIEQBxUIZh5l/iJkP8UP/0MESgRVSDqZ4Y5GJpHh1pi8pP0T0YXxuBQ63"
    "uUobgCnkfsg5ntIeLyqXht7zTw/N477x/3zrfaOx/kt6n4y8Y/YDPRdJSqiNxnbpW3hWY1"
    "VZqY/z3Av1egDbQs49KSQfuM3Xl5SlunvUsF0J8nmpOReZSa56iK7fxcoulQ30fxaV2VaM"
    "7lRVSTC+UfhhqEmIaYz5f/F5ZTzfu8lWItHvXuKke9W3/Uu5Wj7oRI5Gtz7KMqyoFQSU1N"
    "kRZdS0Rh4rudPmwoX5EEHBFvnpyapjoenhoXVu/0rFDMg55lSE2nUMipdGuvtBeLj2g/ht"
    "axJl+1q5FpKIKUcTdUK2Z21pUuYwIRpzahDzaAuY4xlaZgClsbBfClW1tyfd/aV91aFbyc"
    "Yia3uX5cCsbAuX0AIbQrGtqhdbZVld/xyxJAgKt2RbKVUSbjXQ+F2JnqSwa/RNNqmvpAZv"
    "M+8W1cz10/8d2jkCUj/aqXbc7lbd61nW53hctWWNXetkpXvG7l0VgDYmL+NgG2d1YbTJom"
    "k2q/Qglf2kx/vRiZdc30wqUE8hsRCV5D7PCW5mHGbzYTawNFmXVzb11uo0uXkfyA7K1f9X"
    "p5+gUYyHu1"
)
