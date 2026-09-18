import pytest
from pathlib import Path
from modules.pan_verifier.pipeline import PANVerifierPipeline
from modules.pan_verifier.models import VerificationOutput

def test_pan_verifier_sample_benchmark():
    sample_path = Path(__file__).resolve().parent.parent / "samples" / "sample_pan.png"
    assert sample_path.exists(), f"Sample image not found at {sample_path}"

    pipeline = PANVerifierPipeline()
    output = pipeline.process_image(str(sample_path), save_json=True)

    assert isinstance(output, VerificationOutput)
    assert output.status == "VALID"
    assert output.overall_confidence >= 95.0

    # Field assertions against ground truth
    assert output.fields["pan_number"].value == "IPXPM8977J"
    assert output.fields["pan_number"].is_valid is True

    assert output.fields["name"].value == "BODHI MAHTO"
    assert output.fields["name"].is_valid is True

    assert output.fields["fathers_name"].value == "SHANICHAR MAHTO"
    assert output.fields["fathers_name"].is_valid is True

    assert output.fields["dob"].value == "01/01/1958"
    assert output.fields["dob"].is_valid is True

    assert output.qr_data.detected is True
