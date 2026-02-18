"""
LexAssist — Structured Logger
Enterprise-grade logging with rotation, JSON formatting, and request tracing.
"""
import logging
import sys
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

LOG_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
LOG_FORMAT = '[%(asctime)s] %(levelname)-8s %(name)-24s %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def setup_logger(name: str = "LexAssist", level: str = None) -> logging.Logger:
    """
    Create a named logger with console + rotating file output.

    Args:
        name:  Logger name (usually module or class).
        level: Override log level (DEBUG/INFO/WARNING/ERROR). Defaults to
               env LOG_LEVEL or INFO.

    Returns:
        Configured logging.Logger instance.
    """
    logger = logging.getLogger(name)

    # Avoid adding handlers twice when modules re-import
    if logger.handlers:
        return logger

    resolved_level = getattr(
        logging,
        (level or os.environ.get('LOG_LEVEL', 'INFO')).upper(),
        logging.INFO
    )
    logger.setLevel(resolved_level)

    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    # --- Console handler (always) ---
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(resolved_level)
    console.setFormatter(formatter)
    logger.addHandler(console)

    # --- Rotating file handler (only when writable) ---
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        file_handler = RotatingFileHandler(
            os.path.join(LOG_DIR, f'{name.lower().replace(" ", "_")}.log'),
            maxBytes=5 * 1024 * 1024,   # 5 MB
            backupCount=3,
            encoding='utf-8'
        )
        file_handler.setLevel(resolved_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except OSError:
        logger.debug("File logging unavailable — running console-only.")

    return logger
