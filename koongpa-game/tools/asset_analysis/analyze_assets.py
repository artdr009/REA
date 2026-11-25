from __future__ import annotations

import argparse
import base64
import json
import struct
import zlib
from html import escape
from pathlib import Path

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
WEBP_SIGNATURE = b"WEBP"
COLOR_TYPES = {
    0: "grayscale",
    2: "rgb",
    3: "indexed",
    4: "grayscale-alpha",
    6: "rgba",
}
DISPLAY_ASSETS = (
    ("stage_rooftop.png", "Arena background"),
    ("power.png", "POWER"),
    ("speed.png", "SPEED"),
    ("balance.png", "BALANCE"),
    ("rival.png", "CPU rival"),
    ("power_transform.png", "POWER transformation"),
)


def inspect_png(data: bytes, path: Path, root: Path) -> dict[str, object]:
    offset = len(PNG_SIGNATURE)
    chunks: list[str] = []
    crc_valid = True
    has_transparency_chunk = False
    dimensions: tuple[int, int, int, int, int] | None = None

    while offset + 12 <= len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        chunk_type = data[offset + 4 : offset + 8]
        payload_start = offset + 8
        payload_end = payload_start + length
        chunk_end = payload_end + 4
        if chunk_end > len(data):
            raise ValueError(f"Truncated PNG chunk in {path}")

        payload = data[payload_start:payload_end]
        expected_crc = struct.unpack_from(">I", data, payload_end)[0]
        actual_crc = zlib.crc32(data[offset + 4 : payload_end]) & 0xFFFFFFFF
        crc_valid = crc_valid and expected_crc == actual_crc
        chunk_name = chunk_type.decode("ascii", errors="replace")
        chunks.append(chunk_name)

        if chunk_name == "IHDR":
            if len(payload) != 13:
                raise ValueError(f"Invalid PNG IHDR chunk in {path}")
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", payload)
            dimensions = (width, height, bit_depth, color_type, interlace)
        elif chunk_name == "tRNS":
            has_transparency_chunk = True

        offset = chunk_end
        if chunk_name == "IEND":
            break

    if dimensions is None:
        raise ValueError(f"PNG has no IHDR chunk: {path}")

    width, height, bit_depth, color_type, interlace = dimensions
    return {
        "file": path.relative_to(root).as_posix(),
        "image_format": "PNG",
        "extension_matches_format": path.suffix.lower() == ".png",
        "size_bytes": len(data),
        "width": width,
        "height": height,
        "bit_depth": bit_depth,
        "color_type": COLOR_TYPES.get(color_type, f"unknown-{color_type}"),
        "has_alpha": color_type in (4, 6) or has_transparency_chunk,
        "interlaced": bool(interlace),
        "chunks": chunks,
        "chunk_crcs_valid": crc_valid,
    }


def inspect_webp(data: bytes, path: Path, root: Path) -> dict[str, object]:
    offset = 12
    chunks: list[str] = []
    chunks_valid = True
    width: int | None = None
    height: int | None = None
    has_alpha: bool | None = None

    while offset + 8 <= len(data):
        chunk_type = data[offset : offset + 4].decode("ascii", errors="replace")
        length = struct.unpack_from("<I", data, offset + 4)[0]
        payload_start = offset + 8
        payload_end = payload_start + length
        padded_end = payload_end + (length & 1)
        if padded_end > len(data):
            chunks_valid = False
            break

        payload = data[payload_start:payload_end]
        chunks.append(chunk_type)
        if chunk_type == "VP8X" and len(payload) >= 10:
            has_alpha = bool(payload[0] & 0x10)
            width = 1 + int.from_bytes(payload[4:7], "little")
            height = 1 + int.from_bytes(payload[7:10], "little")
        elif chunk_type == "VP8L" and len(payload) >= 5 and payload[0] == 0x2F:
            width = 1 + (((payload[2] & 0x3F) << 8) | payload[1])
            height = 1 + (((payload[4] & 0x0F) << 10) | (payload[3] << 2) | (payload[2] >> 6))
            has_alpha = bool(payload[4] & 0x10)
        elif chunk_type == "VP8 " and len(payload) >= 10 and payload[3:6] == b"\x9d\x01\x2a":
            width = int.from_bytes(payload[6:8], "little") & 0x3FFF
            height = int.from_bytes(payload[8:10], "little") & 0x3FFF
            has_alpha = False

        offset = padded_end

    if width is None or height is None:
        raise ValueError(f"Unsupported or invalid WebP image: {path}")

    return {
        "file": path.relative_to(root).as_posix(),
        "image_format": "WEBP",
        "extension_matches_format": path.suffix.lower() == ".webp",
        "size_bytes": len(data),
        "width": width,
        "height": height,
        "bit_depth": 8,
        "color_type": "rgba" if has_alpha else "rgb",
        "has_alpha": has_alpha,
        "interlaced": None,
        "chunks": chunks,
        "chunk_crcs_valid": None,
        "riff_size_matches": struct.unpack_from("<I", data, 4)[0] + 8 == len(data),
        "chunk_sizes_valid": chunks_valid,
    }


def inspect_image(path: Path, root: Path) -> dict[str, object]:
    data = path.read_bytes()
    if data.startswith(PNG_SIGNATURE):
        return inspect_png(data, path, root)
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == WEBP_SIGNATURE:
        return inspect_webp(data, path, root)
    raise ValueError(f"Unsupported image data in {path}")


def image_data_uri(path: Path) -> str:
    data = path.read_bytes()
    if data.startswith(PNG_SIGNATURE):
        mime_type = "image/png"
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == WEBP_SIGNATURE:
        mime_type = "image/webp"
    else:
        raise ValueError(f"Unsupported image data in {path}")
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def contact_sheet_svg(asset_root: Path) -> str:
    width = 1200
    height = 1080
    chunks = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        "<defs><pattern id=\"checker\" width=\"20\" height=\"20\" patternUnits=\"userSpaceOnUse\">"
        "<rect width=\"20\" height=\"20\" fill=\"#eef0f5\"/><rect width=\"10\" height=\"10\" fill=\"#d9deea\"/>"
        "<rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"#d9deea\"/></pattern></defs>",
        '<rect width="100%" height="100%" fill="#11152c"/>',
        '<text x="40" y="52" fill="#fff3d4" font-family="Arial,sans-serif" font-size="28" font-weight="700">KOONGPA ASSET CONTACT SHEET</text>',
    ]

    stage_path = asset_root / "processed" / "stage_rooftop.png"
    if not stage_path.exists():
        stage_path = asset_root / "stage_rooftop.png"
    if stage_path.exists():
        stage_data = image_data_uri(stage_path)
        chunks.extend(
            [
                '<text x="40" y="92" fill="#9eacd2" font-family="Arial,sans-serif" font-size="16">Arena background</text>',
                '<rect x="40" y="110" width="1120" height="630" rx="8" fill="#20274a"/>',
                f'<image x="40" y="110" width="1120" height="630" href="{stage_data}" preserveAspectRatio="xMidYMid slice"/>',
            ]
        )

    card_y = 780
    card_width = 176
    gap = 18
    for index, (filename, label) in enumerate(DISPLAY_ASSETS[1:]):
        path = asset_root / "processed" / filename
        if not path.exists():
            path = asset_root / filename
        if not path.exists():
            continue

        x = 40 + index * (card_width + gap)
        image_data = image_data_uri(path)
        chunks.extend(
            [
                f'<rect x="{x}" y="{card_y}" width="{card_width}" height="260" rx="8" fill="#20274a" stroke="#ffffff30"/>',
                f'<text x="{x + 12}" y="{card_y + 24}" fill="#dbe4ff" font-family="Arial,sans-serif" font-size="13">{escape(label)}</text>',
                f'<rect x="{x + 10}" y="{card_y + 36}" width="{card_width - 20}" height="210" fill="url(#checker)"/>',
                f'<image x="{x + 10}" y="{card_y + 36}" width="{card_width - 20}" height="210" href="{image_data}" preserveAspectRatio="xMidYMid meet"/>',
            ]
        )

    chunks.append("</svg>")
    return "\n".join(chunks)


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Inspect Koongpa-owned PNG-named image assets.")
    parser.add_argument("--assets", type=Path, default=project_root / "assets", help="Asset directory to inspect")
    parser.add_argument(
        "--output",
        type=Path,
        default=project_root / "analysis" / "koongpa-assets",
        help="Directory for generated report and contact sheet",
    )
    args = parser.parse_args()

    asset_root = args.assets.resolve()
    output_root = args.output.resolve()
    if not asset_root.is_dir():
        parser.error(f"Asset directory does not exist: {asset_root}")

    image_files = sorted(asset_root.rglob("*.png"))
    report = {
        "asset_root": str(asset_root),
        "files": [inspect_image(path, asset_root) for path in image_files],
    }
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "asset-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_root / "contact-sheet.svg").write_text(
        contact_sheet_svg(asset_root),
        encoding="utf-8",
    )
    print(f"Inspected {len(image_files)} image files.")
    print(f"Report: {output_root / 'asset-report.json'}")
    print(f"Contact sheet: {output_root / 'contact-sheet.svg'}")


if __name__ == "__main__":
    main()
