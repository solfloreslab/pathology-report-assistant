"""Test validation — complete vs critically incomplete reports."""


def test_colon_complete_high_score(expected_outputs):
    """Colon complete report should have completeness >= 90%."""
    data = expected_outputs["colon-adenocarcinoma"]
    assert data["validation"]["completeness_score"] >= 90
    assert data["validation"]["status"] == "complete"


def test_gastric_incomplete_detects_critical_fields(expected_outputs):
    """Gastric incomplete report should detect missing pTNM, lymph nodes, HER2."""
    data = expected_outputs["gastric-incomplete"]
    assert data["validation"]["completeness_score"] < 50
    assert data["validation"]["status"] == "critically_incomplete"

    missing_fields = [m["field"] for m in data["validation"]["missing_required"]]
    missing_critical = [
        m["field"]
        for m in data["validation"]["missing_required"]
        if m["severity"] == "critical"
    ]

    # These MUST be detected as missing
    assert any("pT" in f for f in missing_critical), "pT_stage should be critical missing"
    assert any("lymph" in f.lower() for f in missing_critical), "Lymph nodes should be critical missing"
    assert any("her2" in f.lower() for f in missing_fields), "HER2 should be missing"
