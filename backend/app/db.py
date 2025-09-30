from __future__ import annotations

import hashlib
import logging
import os
from typing import AsyncGenerator, Optional, Dict, Any
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse, quote

from dotenv import load_dotenv
from sqlalchemy import String, JSON, Text, Index
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

try:
    from backend.app.databricks_client import generate_database_token
except Exception:
    generate_database_token = None  # type: ignore

# Configuration
load_dotenv()

logger = logging.getLogger(__name__)


class Config:
    """Centralized configuration management"""
    SCHEMA = os.getenv("DB_SCHEMA", "public")
    DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URL_TEMPLATE")
    DBX_DB_INSTANCE_NAME = os.getenv("DBX_DB_INSTANCE_NAME")
    USE_DBX_DATABASE_TOKEN = os.getenv("USE_DBX_DATABASE_TOKEN", "0").lower() in ("1", "true", "yes")
    LOG_DB_TOKEN_DEBUG = os.getenv("LOG_DB_TOKEN_DEBUG", "0").lower() in ("1", "true", "yes")
    
    @classmethod
    def get_database_url(cls) -> Optional[str]:
        """Get and process database URL with environment variable expansion"""
        if not cls.DATABASE_URL:
            return None
        return os.path.expandvars(cls.DATABASE_URL)


class DatabaseTokenManager:
    """Handles Databricks token generation and injection"""
    
    @staticmethod
    def generate_token(instance_name: str) -> Optional[str]:
        """Generate Databricks database token"""
        if not generate_database_token:
            return None
            
        try:
            token = generate_database_token([instance_name])
            if Config.LOG_DB_TOKEN_DEBUG:
                DatabaseTokenManager._log_masked_token(token, instance_name)
            return token
        except Exception as e:
            logger.error(
                "DBX token generation failed for instance '%s': %s. Falling back to DATABASE_URL password.",
                instance_name, str(e)
            )
            return None
    
    @staticmethod
    def _log_masked_token(token: str, instance_name: str) -> None:
        """Log masked token for debugging"""
        prefix = token[:6]
        suffix = token[-4:] if len(token) > 10 else ""
        masked = f"{prefix}{'*' * max(0, len(token) - len(prefix) - len(suffix))}{suffix}"
        fp = hashlib.sha256(token.encode()).hexdigest()[:8]
        logger.warning(
            "Generated DB token for instance '%s' [masked=%s, fp=%s]",
            instance_name, masked, fp
        )
    
    @staticmethod
    def inject_token_to_url(url: str, token: str) -> str:
        """Inject token into database URL"""
        parsed = urlparse(url)
        user = parsed.username or ""
        creds = f"{user}:{quote(token)}@" if user else f":{quote(token)}@"
        hostport = parsed.hostname or ""
        if parsed.port:
            hostport += f":{parsed.port}"
        new_netloc = creds + hostport
        return urlunparse((parsed.scheme, new_netloc, parsed.path, 
                          parsed.params, parsed.query, parsed.fragment))


class DatabaseURLProcessor:
    """Processes and normalizes database URLs"""
    
    @staticmethod
    def process_url(url: Optional[str]) -> Optional[str]:
        """Process database URL with all transformations"""
        if not url:
            return None
            
        url = DatabaseURLProcessor._convert_to_asyncpg(url)
        url = DatabaseURLProcessor._handle_ssl_params(url)
        url = DatabaseURLProcessor._inject_dbx_token_if_needed(url)
        DatabaseURLProcessor._log_sanitized_url(url)
        return url
    
    @staticmethod
    def _convert_to_asyncpg(url: str) -> str:
        """Convert postgresql:// to postgresql+asyncpg://"""
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    @staticmethod
    def _handle_ssl_params(url: str) -> str:
        """Convert psycopg2 sslmode to asyncpg ssl parameter"""
        try:
            parsed = urlparse(url)
            query = dict(parse_qsl(parsed.query, keep_blank_values=True))
            sslmode = query.pop("sslmode", None)
            
            if sslmode is not None:
                ssl_required = sslmode.lower() in ("require", "verify-ca", "verify-full", "prefer")
                query["ssl"] = "true" if ssl_required else "false"
                new_qs = urlencode(query)
                return urlunparse((parsed.scheme, parsed.netloc, parsed.path, 
                                 parsed.params, new_qs, parsed.fragment))
        except Exception:
            pass
        return url
    
    @staticmethod
    def _inject_dbx_token_if_needed(url: str) -> str:
        """Inject Databricks token if configured"""
        if not (Config.DBX_DB_INSTANCE_NAME and Config.USE_DBX_DATABASE_TOKEN):
            if Config.DBX_DB_INSTANCE_NAME and not Config.USE_DBX_DATABASE_TOKEN:
                logger.info(
                    "DBX_DB_INSTANCE_NAME is set ('%s') but USE_DBX_DATABASE_TOKEN is disabled",
                    Config.DBX_DB_INSTANCE_NAME
                )
            return url
            
        logger.warning(
            "Attempting DB credential injection via Databricks instance '%s'",
            Config.DBX_DB_INSTANCE_NAME
        )
        
        token = DatabaseTokenManager.generate_token(Config.DBX_DB_INSTANCE_NAME)
        if token:
            return DatabaseTokenManager.inject_token_to_url(url, token)
        return url
    
    @staticmethod
    def _log_sanitized_url(url: str) -> None:
        """Log sanitized URL without credentials"""
        parsed = urlparse(url)
        sanitized_netloc = (parsed.hostname or "") + (f":{parsed.port}" if parsed.port else "")
        query_params = dict(parse_qsl(parsed.query))
        logger.info(
            "DB engine target host='%s' db='%s' ssl='%s'",
            sanitized_netloc,
            (parsed.path or "/").lstrip('/'),
            query_params.get('ssl')
        )


class DatabaseEngineBuilder:
    """Builds SQLAlchemy engine with proper configuration"""
    
    def __init__(self):
        self.connection_method = "password"
    
    def build_engine(self, url: Optional[str]) -> tuple:
        """Build async engine and session maker"""
        if not url:
            return None, None
            
        parsed = urlparse(url)
        sa_url = self._create_sqlalchemy_url(parsed)
        connect_args = self._get_connect_args(parsed)
        
        engine = create_async_engine(sa_url, connect_args=connect_args) if connect_args else create_async_engine(sa_url)
        session_maker = async_sessionmaker(engine, expire_on_commit=False)
        
        return engine, session_maker
    
    def _create_sqlalchemy_url(self, parsed) -> URL:
        """Create SQLAlchemy URL object"""
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query.pop("sslmode", None)  # Remove sslmode as it's handled in connect_args
        
        driver = self._get_driver(parsed.scheme)
        
        return URL.create(
            drivername=driver,
            username=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port,
            database=(parsed.path or "/").lstrip('/'),
            query=query or None,
        )
    
    def _get_driver(self, scheme: str) -> str:
        """Determine appropriate driver"""
        if scheme == "postgresql+asyncpg":
            return scheme
        elif scheme.startswith("postgresql"):
            return "postgresql+asyncpg"
        return scheme
    
    def _get_connect_args(self, parsed) -> Dict[str, Any]:
        """Get connection arguments for SSL"""
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        sslmode = query.get("sslmode")
        
        if not sslmode:
            return {}
            
        connect_args = {}
        sslmode_lower = sslmode.lower()
        
        if sslmode_lower in ("require", "verify-ca", "verify-full", "prefer", "allow"):
            connect_args["ssl"] = True
        elif sslmode_lower == "disable":
            connect_args["ssl"] = False
            
        return connect_args


# Initialize database connection
_engine_builder = DatabaseEngineBuilder()
DATABASE_URL = DatabaseURLProcessor.process_url(Config.get_database_url())
engine, SessionLocal = _engine_builder.build_engine(DATABASE_URL)


def get_connection_method() -> str:
    """Get the current connection method"""
    return _engine_builder.connection_method


# Database Models
class Base(DeclarativeBase):
    pass


class DatasetModel(Base):
    __tablename__ = "datasets"
    __table_args__ = {"schema": Config.SCHEMA}
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON)
    owner_id: Mapped[str] = mapped_column(String, nullable=False)
    org_id: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String)
    #business_domain: Mapped[Optional[str]] = mapped_column(String)
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    visibility: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)


class EventModel(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_dataset_id_created_at", "dataset_id", "created_at"),
        {"schema": Config.SCHEMA},
    )
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    actor_id: Mapped[Optional[str]] = mapped_column(String)
    dataset_id: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False)


class FollowModel(Base):
    __tablename__ = "follows"
    __table_args__ = {"schema": Config.SCHEMA}
    
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String, primary_key=True)


class LikeModel(Base):
    __tablename__ = "likes"
    __table_args__ = {"schema": Config.SCHEMA}
    
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String, primary_key=True)


class PlatformProfileModel(Base):
    __tablename__ = "platform_profiles"
    __table_args__ = {"schema": Config.SCHEMA}
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, index=True)
    platform_type: Mapped[str] = mapped_column(String)
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": Config.SCHEMA}
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    job_title: Mapped[Optional[str]] = mapped_column(String)
    company: Mapped[Optional[str]] = mapped_column(String)
    subsidiary: Mapped[Optional[str]] = mapped_column(String)
    #domain: Mapped[Optional[str]] = mapped_column(String)
    tools: Mapped[Optional[list[str]]] = mapped_column(JSON)
    org_id: Mapped[str] = mapped_column(String, nullable=False, default="org")
    role: Mapped[str] = mapped_column(String, nullable=False, default="consumer")
    created_at: Mapped[str] = mapped_column(String, nullable=False)


# Session management
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session, raises if not configured"""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL not configured")
    async with SessionLocal() as session:
        yield session


async def get_session_optional() -> AsyncGenerator[Optional[AsyncSession], None]:
    """Get optional database session, returns None if not configured"""
    if SessionLocal is None:
        yield None
    else:
        async with SessionLocal() as session:
            yield session