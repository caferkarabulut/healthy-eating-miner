"""Alembic env.py - Azure SQL migration configuration"""
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import pool
from alembic import context

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import our engine and models
from app.db.session import engine
from app.db.base import Base

# Import all models to ensure they're registered with Base.metadata
from app.db import models  # noqa

# Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    from app.db.session import build_conn_str
    
    url = build_conn_str()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with Azure SQL engine."""
    connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,  # Detect column type changes
            compare_server_default=False,  # Ignore default value changes (MSSQL noise)
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

