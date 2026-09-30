import logging
import sys


def configure_logging(debug: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    # Keep third-party noise down.
    for noisy in ("sqlalchemy.engine", "multipart", "PIL"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
