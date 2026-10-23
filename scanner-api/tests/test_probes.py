"""Offline tests for iteration 2 probe-ladder behavior (no network)."""
import importlib.util
import os
import sys

HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location(
    "_scanner", os.path.join(HERE, "..", "api", "_scanner.py")
)
sc = importlib.util.module_from_spec(spec)
sys.modules["_scanner"] = sc
spec.loader.exec_module(sc)

MIB = 1 << 20


def _mib(steps):
    return [round(s / MIB, 3) for s, _ in steps]


def test_default_ladder_is_half_one_two():
    assert sc.DEFAULT_MAX_PROBE_BYTES == 2 * MIB
    assert _mib(sc.PROBES) == [0.5, 1.0, 2.0]


def test_part_counts_are_dense():
    counts = [p for _, p in sc.PROBES]
    assert counts == [2003, 4006, 8013]
    for size, parts in sc.PROBES:
        body = sc.build_probe_body(size, parts)
        assert len(body) <= size
        real = parts * sc._bytes_per_part()
        assert real / size > 0.85


def test_no_eight_or_twenty_mib_by_default():
    assert all(size <= 2 * MIB for size, _ in sc.PROBES)


def test_ceiling_clamping():
    low = sc.build_probe_ladder(1)
    assert all(size >= sc.MIN_PROBE_BYTES for size, _ in low)
    high = sc.build_probe_ladder(999 * MIB)
    assert max(size for size, _ in high) <= sc.MAX_PROBE_BYTES
    assert max(_mib(sc.build_probe_ladder(4 * MIB))) == 4.0


def test_413_is_a_rejected_status():
    assert 413 in sc.REJECTED_STATUSES


def test_crash_signal_unchanged():
    ctrl = sc.HTTPResult(status_code=200, body=b"hello")
    probe = sc.HTTPResult(
        status_code=200,
        body=b"Fatal error: Allowed memory size of 1 bytes exhausted in Unknown",
    )
    mode, reason = sc.crash_signal(ctrl, probe, "auto")
    assert mode and "memory exhausted" in reason
    mode, _ = sc.crash_signal(ctrl, sc.HTTPResult(status_code=500, body=b""), "auto")
    assert mode
    mode, _ = sc.crash_signal(ctrl, sc.HTTPResult(status_code=502, body=b""), "fpm")
    assert mode == "PHP-FPM"
    assert sc.crash_signal(ctrl, sc.HTTPResult(status_code=200, body=b"ok"), "auto") == (None, None)


def test_bare_host_defaults_to_root_not_index_php():
    assert sc.DEFAULT_PATH == "/"
    assert sc.normalize_url("example.com") == "https://example.com/"
    assert sc.normalize_url("https://example.com/") == "https://example.com/"
    # an explicit path is still honored
    assert sc.normalize_url("https://example.com/app.php") == "https://example.com/app.php"


def test_resolve_redirect_absolute_relative_and_bad():
    assert sc.resolve_redirect("https://a.com/", "https://b.com/x") == "https://b.com/x"
    assert sc.resolve_redirect("https://a.com/", "/en/") == "https://a.com/en/"
    assert sc.resolve_redirect("https://a.com/p", "sub/") == "https://a.com/sub/"
    # non-http schemes rejected
    assert sc.resolve_redirect("https://a.com/", "javascript:alert(1)") is None
    assert sc.resolve_redirect("https://a.com/", "ftp://a.com/x") is None


def test_header_value_is_case_insensitive():
    assert sc.header_value({"Location": "/x"}, "location") == "/x"
    assert sc.header_value({"location": "/y"}, "Location") == "/y"
    assert sc.header_value({"X": "1"}, "location") == ""


def test_redirect_statuses():
    assert sc.REDIRECT_STATUSES == {301, 302, 303, 307, 308}


def test_check_url_follows_redirect_to_final_entry_point():
    """check_url follows a 3xx on the control request and probes the resolved URL."""
    calls = []

    def fake_send_post(target_url, body, boundary, custom_headers, timeout, verify_ssl):
        calls.append(target_url)
        if target_url == "https://a.test/":
            return sc.HTTPResult(
                status_code=302, reason="Found",
                headers={"Location": "/app/"}, body=b"",
            )
        # resolved entry point: clean 200 for control and all probes
        return sc.HTTPResult(status_code=200, reason="OK", headers={}, body=b"ok")

    orig = sc.send_post
    sc.send_post = fake_send_post
    try:
        result = sc.check_url(
            "a.test", "https://a.test/", 10, True, {}, "auto",
        )
    finally:
        sc.send_post = orig

    assert result["tested_url"] == "https://a.test/"
    assert result["final_url"] == "https://a.test/app/"
    # every probe targeted the resolved URL, never the original root
    probe_targets = [u for u in calls if u == "https://a.test/app/"]
    assert "https://a.test/" in calls  # initial control hit the root
    assert calls.count("https://a.test/") == 1  # only once, then redirected
    assert len(probe_targets) >= 4  # resolved control + 3 probes


def test_check_url_stops_on_redirect_loop():
    def fake_send_post(target_url, body, boundary, custom_headers, timeout, verify_ssl):
        # always bounce back to the same place -> loop guard must stop it
        return sc.HTTPResult(
            status_code=302, reason="Found",
            headers={"Location": "https://loop.test/"}, body=b"",
        )

    orig = sc.send_post
    sc.send_post = fake_send_post
    try:
        result = sc.check_url(
            "loop.test", "https://loop.test/", 10, True, {}, "auto",
        )
    finally:
        sc.send_post = orig
    # resolves to the loop target once, then stops (no infinite loop)
    assert result["final_url"] == "https://loop.test/"


if __name__ == "__main__":
    import traceback
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception:
            failed += 1
            print(f"FAIL {fn.__name__}")
            traceback.print_exc()
    sys.exit(1 if failed else 0)
