"""
Synthetic ID Card Generator for Hackingly PS-003 Verification Prototype.
Generates 4 benchmark test samples in backend/app/static/samples/:
1. genuine_college_id.png  (Clean college ID with matching name, DOB, and valid QR)
2. duplicate_id.png         (Identical card used for testing Sybil reuse under different name)
3. tampered_dob_id.png      (ID with visibly spliced/mismatched DOB text vs QR payload)
4. blurry_id.png            (Gaussian-blurred genuine ID to test false-positive quality gate)
"""

import json
import os
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import qrcode

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"
DEMOS_DIR = BASE_DIR / "static" / "demos"

SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
DEMOS_DIR.mkdir(parents=True, exist_ok=True)


def get_font(size: int, bold: bool = False):
    font_candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_student_avatar(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int):
    """Draws a clean student portrait silhouette inside the photo box."""
    # Background gradient fill
    draw.rectangle([x, y, x + w, y + h], fill=(226, 232, 240), outline=(148, 163, 184), width=2)
    
    # Head circle
    head_r = int(w * 0.22)
    head_center_x = x + w // 2
    head_center_y = y + int(h * 0.38)
    draw.ellipse(
        [head_center_x - head_r, head_center_y - head_r, head_center_x + head_r, head_center_y + head_r],
        fill=(71, 85, 105),
    )
    
    # Body / shoulders
    shoulder_w = int(w * 0.65)
    shoulder_top = y + int(h * 0.62)
    draw.chord(
        [head_center_x - shoulder_w // 2, shoulder_top, head_center_x + shoulder_w // 2, y + h + 20],
        start=0,
        end=180,
        fill=(51, 65, 85),
    )


def create_base_id_card(
    name: str,
    dob_printed: str,
    id_number: str,
    institution: str,
    qr_payload_dict: dict,
    is_tampered_dob: bool = False,
    tampered_display_dob: str = "2007-04-14",
) -> Image.Image:
    """Renders a realistic synthetic collegiate ID card."""
    width, height = 800, 500
    card = Image.new("RGB", (width, height), color=(248, 250, 252))
    draw = ImageDraw.Draw(card)

    # Outer border
    draw.rounded_rectangle([10, 10, width - 10, height - 10], radius=16, outline=(203, 213, 225), width=3)

    # Top Header Banner
    header_h = 100
    draw.rounded_rectangle([10, 10, width - 10, 10 + header_h], radius=16, fill=(30, 58, 138))
    # Square bottom of header
    draw.rectangle([10, 10 + header_h - 16, width - 10, 10 + header_h], fill=(30, 58, 138))

    # Header Emblem
    draw.ellipse([30, 25, 30 + 65, 25 + 65], fill=(234, 179, 8), outline=(255, 255, 255), width=2)
    font_emblem = get_font(28, bold=True)
    draw.text((50, 38), "AIT", font=font_emblem, fill=(30, 58, 138))

    # Header Titles
    font_inst = get_font(24, bold=True)
    font_sub = get_font(14, bold=False)
    draw.text((115, 32), institution.upper(), font=font_inst, fill=(255, 255, 255))
    draw.text((115, 66), "STUDENT IDENTITY & ELIGIBILITY CARD · BATCH 2023-2027", font=font_sub, fill=(226, 232, 240))

    # Student Photo Frame
    photo_x, photo_y, photo_w, photo_h = 40, 135, 160, 195
    draw_student_avatar(draw, photo_x, photo_y, photo_w, photo_h)

    # Photo Badge
    draw.rectangle([photo_x, photo_y + photo_h, photo_x + photo_w, photo_y + photo_h + 28], fill=(30, 58, 138))
    font_badge = get_font(13, bold=True)
    draw.text((photo_x + 42, photo_y + photo_h + 6), "STUDENT", font=font_badge, fill=(255, 255, 255))

    # Student Details Fields
    font_label = get_font(14, bold=True)
    font_val = get_font(16, bold=False)
    font_name = get_font(20, bold=True)

    fields_x = 230
    curr_y = 140

    # Name
    draw.text((fields_x, curr_y), "Full Name:", font=font_label, fill=(100, 116, 139))
    draw.text((fields_x, curr_y + 20), name, font=font_name, fill=(15, 23, 42))
    curr_y += 62

    # DOB Section (Handles clean vs tampered text)
    draw.text((fields_x, curr_y), "Date of Birth (DOB):", font=font_label, fill=(100, 116, 139))
    if is_tampered_dob:
        # Draw visibly spliced text overlay box
        splice_box = [fields_x - 4, curr_y + 20, fields_x + 180, curr_y + 48]
        draw.rectangle(splice_box, fill=(255, 255, 255), outline=(239, 68, 68), width=1)
        font_spliced = get_font(17, bold=True)
        # Spliced text contradicting QR
        draw.text((fields_x + 4, curr_y + 24), tampered_display_dob, font=font_spliced, fill=(185, 28, 28))
    else:
        draw.text((fields_x, curr_y + 20), dob_printed, font=font_val, fill=(15, 23, 42))
    curr_y += 58

    # Roll Number
    draw.text((fields_x, curr_y), "Roll / Student ID:", font=font_label, fill=(100, 116, 139))
    draw.text((fields_x, curr_y + 20), id_number, font=font_val, fill=(15, 23, 42))
    curr_y += 58

    # Program / Branch
    draw.text((fields_x, curr_y), "Department:", font=font_label, fill=(100, 116, 139))
    draw.text((fields_x, curr_y + 20), "Computer Science & Engineering", font=font_val, fill=(15, 23, 42))

    # Generate QR Code
    qr_payload_str = json.dumps(qr_payload_dict, separators=(",", ":"))
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(qr_payload_str)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((150, 150))

    # Paste QR Code
    qr_x, qr_y = 600, 145
    card.paste(qr_img, (qr_x, qr_y))
    draw.rectangle([qr_x - 2, qr_y - 2, qr_x + 152, qr_y + 152], outline=(203, 213, 225), width=2)

    font_caption = get_font(11, bold=False)
    draw.text((qr_x + 10, qr_y + 158), "Official QR Payload", font=font_caption, fill=(100, 116, 139))
    draw.text((qr_x + 5, qr_y + 172), "DigiLocker NAD Verified", font=font_caption, fill=(16, 185, 129))

    # Bottom Footer Bar
    footer_y = 445
    draw.rectangle([10, footer_y, width - 10, height - 10], fill=(15, 23, 42))
    font_footer = get_font(12, bold=False)
    draw.text((30, footer_y + 15), "AFFILIATED TO AICTE & UGC · VERIFIED UNDER NATIONAL ACADEMIC DEPOSITORY (NAD)", font=font_footer, fill=(148, 163, 184))

    return card


def generate_all_samples():
    print("Generating synthetic demo samples for PS-003...")

    # Canonical metadata
    student_name = "Rahul Kumar"
    genuine_dob = "2005-03-14"
    id_number = "ABC20261023"
    institution = "ABC Institute of Technology"

    qr_payload_valid = {
        "NAME": student_name,
        "DOB": genuine_dob,
        "ID_NUMBER": id_number,
        "INSTITUTION": institution,
    }

    # 1. Genuine College ID
    genuine_card = create_base_id_card(
        name=student_name,
        dob_printed=genuine_dob,
        id_number=id_number,
        institution=institution,
        qr_payload_dict=qr_payload_valid,
        is_tampered_dob=False,
    )
    genuine_path = SAMPLES_DIR / "genuine_college_id.png"
    genuine_card.save(genuine_path, "PNG")
    # Also save as valid_id.jpg in static/demos
    genuine_card.save(DEMOS_DIR / "valid_id.jpg", "JPEG", quality=95)
    print(f"[+] Created: {genuine_path}")

    # 2. Duplicate ID (Identical physical card used for Sybil reuse under different name)
    duplicate_path = SAMPLES_DIR / "duplicate_id.png"
    genuine_card.save(duplicate_path, "PNG")
    print(f"[+] Created: {duplicate_path}")

    # 3. Tampered DOB ID (Visibly spliced DOB on card contradicting authentic QR payload)
    tampered_card = create_base_id_card(
        name=student_name,
        dob_printed=genuine_dob,
        id_number=id_number,
        institution=institution,
        qr_payload_dict=qr_payload_valid,  # QR has genuine DOB: 2005-03-14
        is_tampered_dob=True,
        tampered_display_dob="2007-04-14",  # Printed text tampered to 2007-04-14
    )
    tampered_path = SAMPLES_DIR / "tampered_dob_id.png"
    tampered_card.save(tampered_path, "PNG")
    # Also save as edited_id.jpg in static/demos
    tampered_card.save(DEMOS_DIR / "edited_id.jpg", "JPEG", quality=90)
    print(f"[+] Created: {tampered_path}")

    # 4. Blurry ID (Gaussian blurred genuine ID to test false-positive quality gate)
    cv_img = cv2.cvtColor(np.array(genuine_card), cv2.COLOR_RGB2BGR)
    # Apply severe Gaussian blur (ksize 27)
    blurred_cv = cv2.GaussianBlur(cv_img, (27, 27), 0)
    blurry_card = Image.fromarray(cv2.cvtColor(blurred_cv, cv2.COLOR_BGR2RGB))
    
    blurry_path = SAMPLES_DIR / "blurry_id.png"
    blurry_card.save(blurry_path, "PNG")
    # Also save as blurry_id.jpg in static/demos
    blurry_card.save(DEMOS_DIR / "blurry_id.jpg", "JPEG", quality=85)
    print(f"[+] Created: {blurry_path}")

    # 5. Underage ID (Participant under 18 years old)
    underage_qr = {
        "NAME": "Aarav Gupta",
        "DOB": "2011-08-20",
        "ID_NUMBER": "SCH20269941",
        "INSTITUTION": "Delhi Public School",
    }
    underage_card = create_base_id_card(
        name="Aarav Gupta",
        dob_printed="2011-08-20",
        id_number="SCH20269941",
        institution="Delhi Public School",
        qr_payload_dict=underage_qr,
        is_tampered_dob=False,
    )
    underage_path = SAMPLES_DIR / "underage_id.png"
    underage_card.save(underage_path, "PNG")
    underage_card.save(DEMOS_DIR / "underage_id.jpg", "JPEG", quality=95)
    print(f"[+] Created: {underage_path}")

    print("All synthetic demo samples generated successfully!")


if __name__ == "__main__":
    generate_all_samples()
