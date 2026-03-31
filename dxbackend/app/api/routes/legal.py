"""Public legal pages served as HTML (no frontend required)."""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

_STATIC = Path(__file__).resolve().parent.parent.parent / "static" / "legal"


@router.get("/privacy-policy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy() -> str:
    path = _STATIC / "privacy-policy.html"
    if path.is_file():
        return path.read_text(encoding="utf-8")
    return _FALLBACK_PRIVACY_HTML


# Minimal fallback if the static file is missing (replace file content for production).
_FALLBACK_PRIVACY_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — SplitKit</title>
  <style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5}</style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>Replace this text by editing
    <code>dxbackend/app/static/legal/privacy-policy.html</code> on the server.</p>
  <p><strong>Contact:</strong> support@example.com</p>
</body>
</html>
"""
