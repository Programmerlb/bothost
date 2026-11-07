import zipfile

import pytest

from src.archive import ArchiveRejected, validate_archive


def test_accepts_archive_with_main_py(tmp_path):
    archive_path = tmp_path / "bot.zip"
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("main.py", "print('hello')")
    assert len(validate_archive(str(archive_path))) == 1


def test_rejects_path_traversal(tmp_path):
    archive_path = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("../outside.txt", "no")
        archive.writestr("main.py", "pass")
    with pytest.raises(ArchiveRejected, match="unsafe_archive_path"):
        validate_archive(str(archive_path))


def test_requires_main_py(tmp_path):
    archive_path = tmp_path / "missing.zip"
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("bot.py", "pass")
    with pytest.raises(ArchiveRejected, match="main_py_missing"):
        validate_archive(str(archive_path))
