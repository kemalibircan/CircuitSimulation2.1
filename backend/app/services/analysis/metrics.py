"""
app/services/analysis/metrics.py — Extract structured metrics from parsed simulation data.
Maps raw Xyce output to the SimulationMetric schema used by the frontend.
"""
from __future__ import annotations

import math
from typing import Any


class MetricsExtractor:
    """
    Converts raw parsed Xyce data (measure values + response curves) into
    the structured list of SimulationMetric dicts the frontend displays.
    """

    # Topologies where gain/GBW/phase margin are meaningful
    _AMPLIFIER_TOPOLOGIES = {"amplifier", "common_source", "bjt_amplifier", "lna"}

    def extract(
        self,
        measure_results: dict[str, float],
        target_constraints: list[dict[str, Any]],
        ac_response: list[dict] | None = None,
        phase_response: list[dict] | None = None,
        topology_type: str = "amplifier",
    ) -> list[dict[str, Any]]:
        """Return a list of SimulationMetric-shaped dicts.
        Only includes metrics that are meaningful for the given topology_type.
        """
        metrics: list[dict[str, Any]] = []
        is_amplifier = topology_type in self._AMPLIFIER_TOPOLOGIES

        # Build a lookup: metric label → target
        targets: dict[str, dict] = {
            c["metric"].lower(): c for c in target_constraints
        }

        # ── DC Gain (only for amplifiers) ─────────────────────
        if is_amplifier:
            gain_db = measure_results.get("gain_dc")
            if gain_db is None and ac_response:
                gain_db = max(pt["y"] for pt in ac_response) if ac_response else None
            if gain_db is not None:
                metrics.append(self._metric("gain", "DC Gain", gain_db, "dB", targets, "dc gain", False))

        # ── GBW (only for amplifiers) ─────────────────────────
        if is_amplifier:
            gbw_hz = measure_results.get("ugbw")
            if gbw_hz is None and ac_response:
                gbw_hz = self._find_gbw(ac_response)
            if gbw_hz is not None:
                metrics.append(self._metric("bw", "GBW", gbw_hz / 1e6, "MHz", targets, "gbw", False))

        # ── Phase Margin (only for amplifiers) ────────────────
        if is_amplifier:
            pm_deg = measure_results.get("pm")
            if pm_deg is None and phase_response and ac_response:
                pm_deg = self._find_phase_margin(ac_response, phase_response)
            if pm_deg is not None:
                metrics.append(self._metric("pm", "Phase Margin", pm_deg, "°", targets, "phase margin", False))

        # ── Output Voltage (for DC circuits) ──────────────────
        vout = measure_results.get("vout_dc")
        if vout is not None:
            metrics.append(self._metric("vout", "Output Voltage", vout, "V", targets, "output voltage", False))

        # ── Cutoff Frequency (for filters) ────────────────────
        cutoff = measure_results.get("cutoff_freq")
        if cutoff is not None:
            metrics.append(self._metric("cutoff", "Cutoff Frequency", cutoff / 1e3, "kHz", targets, "cutoff frequency", False))

        # ── Power ─────────────────────────────────────────────
        power_w = measure_results.get("power_vdd")
        if power_w is not None:
            metrics.append(self._metric("power", "Power", abs(power_w) * 1000, "mW", targets, "power", True))
        elif measure_results.get("ivdd"):
            ivdd = abs(measure_results["ivdd"])
            vdd = measure_results.get("vdd", 1.8)
            metrics.append(self._metric("power", "Power", ivdd * vdd * 1000, "mW", targets, "power", True))

        # ── Input Noise (amplifiers/LNA) ──────────────────────
        if is_amplifier:
            noise = measure_results.get("noise_input")
            if noise is not None:
                metrics.append(self._metric("noise", "Input Noise", noise * 1e9, "nV/√Hz", targets, "noise", True))

        # ── Output Swing ──────────────────────────────────────
        swing = measure_results.get("output_swing")
        if swing is not None:
            metrics.append(self._metric("swing", "Output Swing", swing, "V", targets, "output swing", False))

        # ── Rise Time (transient circuits) ────────────────────
        rise = measure_results.get("rise_time")
        if rise is not None:
            metrics.append(self._metric("rise", "Rise Time", rise * 1e9, "ns", targets, "rise time", True))

        # ── Settling Time ─────────────────────────────────────
        settling = measure_results.get("settling_time")
        if settling is not None:
            metrics.append(self._metric("settling", "Settling Time", settling * 1e9, "ns", targets, "settling time", True))

        return metrics

    # ── Helpers ───────────────────────────────────────────────

    def _metric(
        self,
        id_: str,
        label: str,
        value: float,
        unit: str,
        targets: dict,
        target_key: str,
        lower_is_better: bool,
    ) -> dict[str, Any]:
        target_entry = targets.get(target_key)
        target_val = target_entry["target"] if target_entry else None

        pass_fail: str | None = None
        if target_val is not None:
            if lower_is_better:
                pass_fail = "pass" if value <= target_val else "fail"
            else:
                pass_fail = "pass" if value >= target_val else "fail"

        return {
            "id": id_,
            "label": label,
            "value": round(value, 3),
            "unit": unit,
            "target": target_val,
            "pass_fail": pass_fail,
        }

    @staticmethod
    def _find_gbw(ac_response: list[dict]) -> float | None:
        """Find the 0 dB crossing frequency (GBW) from AC response."""
        prev = None
        for pt in ac_response:
            if prev is not None and prev["y"] >= 0 >= pt["y"]:
                # Linear interpolation
                t = prev["y"] / (prev["y"] - pt["y"])
                return prev["x"] + t * (pt["x"] - prev["x"])
            prev = pt
        return None

    @staticmethod
    def _find_phase_margin(
        ac_response: list[dict], phase_response: list[dict]
    ) -> float | None:
        """Find phase at the GBW frequency."""
        gbw = MetricsExtractor._find_gbw(ac_response)
        if gbw is None or not phase_response:
            return None
        # Find closest phase point
        closest = min(phase_response, key=lambda p: abs(p["x"] - gbw))
        return 180.0 + closest["y"]  # phase margin = 180° + phase
