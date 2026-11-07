from __future__ import annotations

import stat
import zipfile
from pathlib import PurePosixPath

MAX_FILES = 500
MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024


class ArchiveRejected(ValueError):
    pass


def validate_archive(path: str) -> list[zipfile.ZipInfo]:
    """Validate archive metadata before extraction; never extracts files."""
    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as exc:
        raise ArchiveRejected("invalid_zip") from exc

    with archive:
        entries = archive.infolist()
        if not entries or len(entries) > MAX_FILES:
            raise ArchiveRejected("invalid_file_count")

        total = 0
        has_entrypoint = False
        for entry in entries:
            normalized = entry.filename.replace("\\", "/")
            pure = PurePosixPath(normalized)
            if (
                not normalized
                or normalized.startswith("/")
                or pure.is_absolute()
                or any(part in ("", ".", "..") for part in pure.parts)
                or ":" in pure.parts[0]
            ):
                raise ArchiveRejected("unsafe_archive_path")

            mode = (entry.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise ArchiveRejected("symlink_not_allowed")
            if entry.file_size < 0 or entry.file_size > MAX_SINGLE_FILE_BYTES:
                raise ArchiveRejected("file_too_large")
            total += entry.file_size
            if total > MAX_UNCOMPRESSED_BYTES:
                raise ArchiveRejected("archive_expands_too_large")
            if normalized == "main.py":
                has_entrypoint = True

        if not has_entrypoint:
            raise ArchiveRejected("main_py_missing")
        return entries
