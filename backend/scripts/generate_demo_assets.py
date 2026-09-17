import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import qrcode

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BASE_DIR / "static" / "demos"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1200, 750

def get_font(size: int, bold: bool = False):
    font_candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/HelveticaNeue.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            try:
                return ImageFont.truetype(candidate, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_card(
    name: str = "Rahul Kumar",
    dob: str = "14-03-2005",
    id_num: str = "ABC20261023",
    institution: str = "ABC Institute of Technology",
    course: str = "B.Tech Computer Science & Engineering",
    out_file: str = "valid_id.jpg",
    qr_name: str = "Rahul Kumar",
    qr_dob: str = "14-03-2005",
    tamper_visual: bool = False,
):
    img = Image.new("RGB", (W, H), "#0f172a")
    d = ImageDraw.Draw(img)

    # Card background container
    d.rounded_rectangle((24, 24, W - 24, H - 24), radius=28, fill="#ffffff", outline="#334155", width=4)
    
    # Header banner
    d.rounded_rectangle((24, 24, W - 24, 130), radius=28, fill="#1e293b")
    d.rectangle((24, 100, W - 24, 130), fill="#1e293b")  # flatten bottom curve
    
    # Institution title
    d.text((60, 48), institution.upper(), font=get_font(36, bold=True), fill="#38bdf8")
    d.text((60, 95), "OFFICIAL STUDENT IDENTITY CARD · SYNTHETIC DEMO", font=get_font(18), fill="#94a3b8")

    # Photo portrait frame
    d.rounded_rectangle((60, 160, 320, 500), radius=16, fill="#e2e8f0", outline="#cbd5e1", width=3)
    # Silhouette face representation
    d.ellipse((130, 200, 250, 320), fill="#64748b")
    d.rounded_rectangle((100, 335, 280, 480), radius=60, fill="#64748b")
    d.text((125, 460), "PORTRAIT", font=get_font(16, bold=True), fill="#ffffff")

    # Field labels and values
    fields = [
        ("FULL NAME", name),
        ("DATE OF BIRTH", dob),
        ("STUDENT ID NO.", id_num),
        ("PROGRAM", course),
        ("VALID UNTIL", "AUGUST 2028"),
    ]

    y = 160
    for label, val in fields:
        d.text((360, y), label, font=get_font(16, bold=True), fill="#64748b")
        d.text((360, y + 24), val, font=get_font(28, bold=True), fill="#0f172a")
        y += 76

    # Tamper visual artifact simulation for edited card
    if tamper_visual:
        # Draw a subtle mismatched compression / highlight box over the DOB field
        d.rectangle((355, 230, 680, 290), fill="#f1f5f9", outline="#f43f5e", width=2)
        d.text((360, 236), "DATE OF BIRTH", font=get_font(16, bold=True), fill="#e11d48")
        d.text((360, 260), dob, font=get_font(28, bold=True), fill="#e11d48")

    # Machine readable QR Code
    qr_payload_text = f"NAME={qr_name};DOB={qr_dob};ID={id_num};INSTITUTION={institution}"
    qr = qrcode.QRCode(box_size=5, border=1)
    qr.add_data(qr_payload_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f172a", back_color="#ffffff").convert("RGB").resize((220, 220))
    img.paste(qr_img, (W - 270, 440))
    
    d.text((W - 270, 415), "SECURE QR PAYLOAD", font=get_font(14, bold=True), fill="#64748b")

    # Bottom notice footer
    d.rectangle((24, H - 75, W - 24, H - 24), fill="#f8fafc")
    d.text((60, H - 58), "VERIFORGE BENCHMARK DATASET · FOR HACKATHON EVALUATION ONLY · NO REAL PII", font=get_font(16, bold=True), fill="#dc2626")

    target_path = OUT_DIR / out_file
    img.save(target_path, quality=95)
    print(f"Generated: {target_path}")


def main():
    print("Generating synthetic demo assets for VeriForge PS-003...")
    
    # 1. Genuine Valid Student ID (Age 21 on Sep 2026, QR matches text)
    make_card(
        name="Rahul Kumar",
        dob="14-03-2005",
        id_num="ABC20261023",
        institution="ABC Institute of Technology",
        out_file="valid_id.jpg",
        qr_name="Rahul Kumar",
        qr_dob="14-03-2005",
        tamper_visual=False,
    )

    # 2. Tampered / Edited ID (Text changed to Rohan Sharma, DOB changed to 2007, but QR has Rahul Kumar and 2005!)
    make_card(
        name="Rohan Sharma",
        dob="14-04-2007",
        id_num="ABC20261023",
        institution="ABC Institute of Technology",
        out_file="edited_id.jpg",
        qr_name="Rahul Kumar",
        qr_dob="14-03-2005",
        tamper_visual=True,
    )

    # 3. Blurry ID (Valid ID processed with severe Gaussian blur)
    valid_card = Image.open(OUT_DIR / "valid_id.jpg").convert("RGB")
    blurry_card = valid_card.filter(ImageFilter.GaussianBlur(radius=4.5))
    blurry_card.save(OUT_DIR / "blurry_id.jpg", quality=85)
    print(f"Generated: {OUT_DIR / 'blurry_id.jpg'}")

    # 4. Underage ID (Age 15, DOB 2011)
    make_card(
        name="Aarav Gupta",
        dob="20-08-2011",
        id_num="SCH20269941",
        institution="Delhi Public School",
        course="Secondary High School Grade 10",
        out_file="underage_id.jpg",
        qr_name="Aarav Gupta",
        qr_dob="20-08-2011",
        tamper_visual=False,
    )

    # 5. Synthetic Selfie Photo for Biometric Match
    selfie = Image.new("RGB", (500, 500), "#f1f5f9")
    s_draw = ImageDraw.Draw(selfie)
    s_draw.ellipse((150, 100, 350, 300), fill="#334155")
    s_draw.rounded_rectangle((100, 310, 400, 500), radius=80, fill="#334155")
    s_draw.text((170, 430), "SYNTHETIC SELFIE", font=get_font(18, bold=True), fill="#ffffff")
    selfie.save(OUT_DIR / "demo_selfie.jpg", quality=90)
    print(f"Generated: {OUT_DIR / 'demo_selfie.jpg'}")

    print("All demo assets successfully generated.")


if __name__ == "__main__":
    main()
