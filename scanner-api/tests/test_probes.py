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
