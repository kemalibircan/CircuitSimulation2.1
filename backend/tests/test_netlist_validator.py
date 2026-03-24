"""tests/test_netlist_validator.py — Unit tests for the SPICE netlist validator."""
from __future__ import annotations

import pytest
from app.services.netlist.validator import NetlistValidator


@pytest.fixture
def validator() -> NetlistValidator:
    return NetlistValidator()


VALID_NETLIST = """\
* Two-Stage CMOS Op-Amp
VDD vdd 0 DC 1.8
VSS vss 0 DC 0
M1 vout1 vinp vs1 vdd PMOS W=16u L=0.45u
M2 vout1 vinn vs2 vdd PMOS W=16u L=0.45u
M3 vout1 vout1 vss vss NMOS W=12u L=0.5u
M4 vout1 vout1 vss vss NMOS W=12u L=0.5u
M5 vs1 vbias vdd vdd PMOS W=20u L=0.5u
M6 vout vout1 vss vss NMOS W=40u L=0.5u
Cc vout1 vout 2.8p
CL vout 0 10p
.op
.ac dec 100 10 1G
.end
"""

MISSING_END = """\
* Test netlist without .end
VDD vdd 0 DC 1.8
M1 vout vinp vs vdd PMOS W=10u L=0.5u
"""

DUPLICATE_NAMES = """\
* Netlist with duplicate component
VDD vdd 0 DC 1.8
R1 vdd 0 1k
R1 vout 0 1k
.end
"""

TOO_FEW_TOKENS = """\
* Malformed MOSFET
VDD vdd 0 DC 1.8
M1 vout vinp
.end
"""


def test_valid_netlist(validator: NetlistValidator):
    result = validator.validate(VALID_NETLIST)
    assert result.valid, f"Expected valid, got issues: {result.issues}"


def test_missing_end(validator: NetlistValidator):
    result = validator.validate(MISSING_END)
    assert not result.valid
    assert any("end" in i.message.lower() for i in result.issues)


def test_duplicate_names(validator: NetlistValidator):
    result = validator.validate(DUPLICATE_NAMES)
    assert not result.valid
    assert any("Duplicate" in i.message for i in result.issues)


def test_too_few_tokens(validator: NetlistValidator):
    result = validator.validate(TOO_FEW_TOKENS)
    assert not result.valid
    assert any("too few fields" in i.message for i in result.issues)


def test_empty_netlist(validator: NetlistValidator):
    result = validator.validate("")
    assert not result.valid
    assert any("empty" in i.message.lower() for i in result.issues)
