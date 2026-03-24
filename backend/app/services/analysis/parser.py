"""
app/services/analysis/parser.py — Parse Xyce .prn and stdout output files
to extract time-domain, AC, and DC operating point data.
"""
from __future__ import annotations

import math
import re
from pathlib import Path


class XyceOutputParser:
    """
    Parses Xyce simulation output files into structured Python dicts
    ready to be stored in SimulationResult.
    """

    # ── .prn file (time-domain / transient) ──────────────────

    def parse_prn(self, prn_path: str) -> list[dict[str, float]]:
        """
        Parse a .prn file and return rows as list of dicts.
        First row is the header.  Returns [{col: value, ...}, ...]
        """
        rows: list[dict[str, float]] = []
        columns: list[str] = []
        with open(prn_path, "r") as f:
            for lineno, line in enumerate(f):
                stripped = line.strip()
                if not stripped:
                    continue
                tokens = stripped.split()
                if lineno == 0:
                    columns = tokens
                    continue
                try:
                    values = [float(t) for t in tokens]
                    if len(values) == len(columns):
                        rows.append(dict(zip(columns, values)))
                except ValueError:
                    continue
        return rows

    # ── AC sweep from .prn ────────────────────────────────────

    def extract_ac_response(
        self, prn_rows: list[dict[str, float]], freq_col: str = "FREQ", gain_col: str = "VDB(vout)"
    ) -> list[dict[str, float]]:
        return [
            {"x": row[freq_col], "y": row[gain_col]}
            for row in prn_rows
            if freq_col in row and gain_col in row
        ]

    # ── Phase response ────────────────────────────────────────

    def extract_phase_response(
        self, prn_rows: list[dict[str, float]], freq_col: str = "FREQ", phase_col: str = "VP(vout)"
    ) -> list[dict[str, float]]:
        return [
            {"x": row[freq_col], "y": row[phase_col]}
            for row in prn_rows
            if freq_col in row and phase_col in row
        ]

    # ── Transient response ────────────────────────────────────

    def extract_transient(
        self, prn_rows: list[dict[str, float]], time_col: str = "TIME", volt_col: str = "V(vout)"
    ) -> list[dict[str, float]]:
        # Convert time to nanoseconds for the frontend
        return [
            {"x": row[time_col] * 1e9, "y": row[volt_col]}
            for row in prn_rows
            if time_col in row and volt_col in row
        ]

    # ── Measure results from stdout ───────────────────────────

    MEASURE_PATTERN = re.compile(
        r"^\s*(\w+)\s*=\s*([\d.eE+\-]+)\s*(?:\((\w+)\))?\s*$", re.MULTILINE
    )

    def parse_measure_results(self, stdout: str) -> dict[str, float]:
        """Extract .measure results from Xyce stdout."""
        results: dict[str, float] = {}
        for match in self.MEASURE_PATTERN.finditer(stdout):
            name, value = match.group(1), match.group(2)
            try:
                results[name.lower()] = float(value)
            except ValueError:
                pass
        return results

    # ── Synthetic data generators ─────────────────────────────

    @staticmethod
    def synthetic_ac_response(gain_db: float, gbw_mhz: float) -> list[dict[str, float]]:
        """Generate Bode magnitude plot: gain (dB) vs frequency (Hz)."""
        points = []
        for exp_10 in range(0, 101):
            freq = 10 ** (exp_10 * 0.1)  # 1 Hz → 10 GHz
            freq_mhz = freq / 1e6
            roll = 20 * math.log10(math.sqrt(1 + (freq_mhz / max(gbw_mhz, 0.01)) ** 2))
            gain = gain_db - roll
            points.append({"x": round(freq, 2), "y": round(max(gain, -40), 3)})
        return points

    @staticmethod
    def synthetic_phase_response(gbw_mhz: float, second_pole_ghz: float = 1.2) -> list[dict[str, float]]:
        """Generate Bode phase plot: phase (°) vs frequency (Hz)."""
        points = []
        for exp_10 in range(0, 101):
            freq = 10 ** (exp_10 * 0.1)
            freq_mhz = freq / 1e6
            phase = (
                -90
                - (math.atan(freq_mhz / max(gbw_mhz, 0.01)) * 180) / math.pi
                - (math.atan(freq_mhz / (second_pole_ghz * 1000)) * 180) / math.pi
            )
            points.append({"x": round(freq, 2), "y": round(phase, 2)})
        return points

    @staticmethod
    def synthetic_transient(supply_v: float = 1.8, topology: str = "amplifier") -> list[dict[str, float]]:
        """Generate output step response.  X = time (seconds), Y = voltage."""
        points = []
        n = 201
        t_max = 500e-9  # 500 ns

        # Different behaviour per topology
        if topology in ("voltage_divider", "resistor_network"):
            v_final = supply_v * 0.5
            tau = 5e-9
        elif topology == "common_source":
            v_final = supply_v * 0.6
            tau = 20e-9
        else:
            v_final = supply_v * 0.55
            tau = 25e-9

        step_t = 50e-9
        for i in range(n):
            t = i * (t_max / (n - 1))
            if t < step_t:
                v = 0.0
            else:
                v = v_final * (1 - math.exp(-(t - step_t) / tau))
            points.append({"x": round(t, 13), "y": round(v, 6)})
        return points

    @staticmethod
    def synthetic_dc_sweep(measure_vals: dict[str, float], supply_v: float = 1.8) -> list[dict[str, float]]:
        """DC sweep: Vout vs Vin."""
        vout_dc = measure_vals.get("vout_dc", supply_v * 0.5)
        ratio = vout_dc / supply_v if supply_v > 0 else 0.5
        points = []
        for i in range(51):
            vin = supply_v * i / 50
            points.append({"x": round(vin, 4), "y": round(vin * ratio, 4)})
        return points

    @staticmethod
    def synthetic_dc_node_voltages(measure_vals: dict[str, float], supply_v: float = 1.8) -> list[dict]:
        """Bar chart data for DC node voltages."""
        voltage_keys = [("vout_dc", "V_out"), ("vin_dc", "V_in"), ("voltage_ratio", "V_ratio")]
        data = []
        for key, label in voltage_keys:
            if key in measure_vals:
                data.append({"x": 0, "y": measure_vals[key], "label": label})
        for key, val in measure_vals.items():
            if key not in dict(voltage_keys) and isinstance(val, (int, float)):
                data.append({"x": 0, "y": val, "label": key.replace("_", " ").title()[:12]})
        if not data:
            data = [
                {"x": 0, "y": supply_v, "label": "V_in"},
                {"x": 0, "y": supply_v * 0.5, "label": "V_out"},
                {"x": 0, "y": 0.0, "label": "GND"},
            ]
        return data

    # ── Per-signal synthetic data (for optional waveforms) ────

    @staticmethod
    def synthetic_signal_data(
        signal_name: str,
        signal_type: str,
        supply_v: float = 1.8,
        topology: str = "amplifier",
        index: int = 0,
    ) -> list[dict[str, float]]:
        """Generate **unique** time-domain data for a single signal.

        Each signal gets a visibly different waveform based on its name,
        type (voltage / current) and a running index so no two optional
        charts look the same.
        """
        points: list[dict[str, float]] = []
        n = 201
        t_max = 500e-9  # 500 ns total window

        # Derive a deterministic "hash" from the signal name for variety
        h = sum(ord(c) for c in signal_name) + index * 37

        if signal_type == "current":
            # Current waveform – µA range, with unique magnitude & time constant
            i_base = ((h % 7) + 1) * 50e-6          # 50 µA – 350 µA
            tau = ((h % 5) + 2) * 10e-9              # 20 ns – 60 ns
            step_t = 40e-9
            for k in range(n):
                t = k * (t_max / (n - 1))
                if t < step_t:
                    curr = i_base * 0.1
                else:
                    curr = i_base * (1 - 0.9 * math.exp(-(t - step_t) / tau))
                ripple = i_base * 0.015 * math.sin(2 * math.pi * 50e6 * t + h)
                points.append({"x": round(t, 13), "y": round(curr + ripple, 9)})
        else:
            sig_lo = signal_name.lower()

            if "vdd" in sig_lo or "supply" in sig_lo:
                # Supply rail – flat with tiny noise
                for k in range(n):
                    t = k * (t_max / (n - 1))
                    noise = 0.003 * math.sin(2 * math.pi * 80e6 * t)
                    points.append({"x": round(t, 13), "y": round(supply_v + noise, 5)})

            elif "out" in sig_lo:
                # Output – step response with slight overshoot
                v_final = supply_v * (0.35 + (h % 4) * 0.08)
                tau = ((h % 4) + 2) * 12e-9
                step_t = 50e-9
                overshoot = 0.04 + (h % 3) * 0.02  # 4–8 %
                for k in range(n):
                    t = k * (t_max / (n - 1))
                    if t < step_t:
                        v = 0.0
                    else:
                        dt = t - step_t
                        env = 1.0 + overshoot * math.exp(-dt / (tau * 0.6)) * math.cos(2 * math.pi * dt / (tau * 4))
                        v = v_final * (1 - math.exp(-dt / tau)) * env
                    points.append({"x": round(t, 13), "y": round(v, 6)})

            elif "in" in sig_lo:
                # Input – clean step
                v_step = supply_v * (0.02 + (h % 5) * 0.01)
                step_t = 50e-9
                for k in range(n):
                    t = k * (t_max / (n - 1))
                    v = v_step if t >= step_t else 0.0
                    points.append({"x": round(t, 13), "y": round(v, 6)})

            else:
                # Internal node – DC bias with settling & ringing
                v_dc = supply_v * (0.15 + (h % 9) * 0.08)   # 0.27 V – 0.99 V
                tau = ((h % 6) + 1) * 15e-9
                step_t = 30e-9
                overshoot = 0.06 + (h % 4) * 0.02

                for k in range(n):
                    t = k * (t_max / (n - 1))
                    if t < step_t:
                        v = v_dc * 0.95
                    else:
                        dt = t - step_t
                        ring = 1 + overshoot * math.exp(-dt / (tau * 0.5)) * math.sin(2 * math.pi * dt / (tau * 3))
                        v = v_dc * ring
                    points.append({"x": round(t, 13), "y": round(v, 6)})

        return points
