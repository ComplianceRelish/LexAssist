"""
LexAssist — Jurisdiction Resolver
===================================
Scans legal brief text for Indian place names and resolves them to
authoritative district / state / court information.

This runs BEFORE Claude analysis, so Claude receives verified
geographic data instead of guessing.

Usage:
    resolver = JurisdictionResolver()
    result = resolver.resolve("property dispute in Panavally Panchayat")
    # → { "resolved": True,
    #     "places_found": ["panavally"],
    #     "district": "Alappuzha",
    #     "state": "Kerala",
    #     "high_court": "Kerala High Court",
    #     "district_court": "District Court, Alappuzha",
    #     ... }
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from backend.data.indian_jurisdictions import (
    STATE_INFO,
    DISTRICT_REGISTRY,
    PLACE_TO_DISTRICT,
    TALUK_TO_DISTRICT,
)
from backend.utils.logger import setup_logger

logger = setup_logger("JurisdictionResolver")


class JurisdictionResolver:
    """
    Resolve Indian place names in legal text to authoritative
    district → state → court hierarchy.
    """

    def __init__(self):
        # Pre-build a combined lookup: place → district (lowercase)
        # Priority: PLACE_TO_DISTRICT > TALUK_TO_DISTRICT > DISTRICT_REGISTRY
        self._place_lookup: Dict[str, str] = {}

        # First pass: district names themselves
        for dist_lower in DISTRICT_REGISTRY:
            self._place_lookup[dist_lower] = dist_lower

        # Second pass: taluk → district
        for taluk_lower, dist_lower in TALUK_TO_DISTRICT.items():
            self._place_lookup[taluk_lower] = dist_lower

        # Third pass: place → district (highest priority, overwrites if conflict)
        for place_lower, dist_lower in PLACE_TO_DISTRICT.items():
            self._place_lookup[place_lower] = dist_lower

        # Build sorted list of place names by length (longest first)
        # to match "North Paravur" before "Paravur"
        self._sorted_place_names = sorted(
            self._place_lookup.keys(), key=len, reverse=True
        )

        # Pre-compile a single regex for efficient scanning
        # Escape place names and join with alternation
        escaped = [re.escape(p) for p in self._sorted_place_names]
        # Only compile if we have entries
        if escaped:
            self._pattern = re.compile(
                r'\b(' + '|'.join(escaped) + r')\b',
                re.IGNORECASE
            )
        else:
            self._pattern = None

        # Also build a state name lookup for direct state mentions
        self._state_names = {s.lower(): s for s in STATE_INFO}

        logger.info(
            "JurisdictionResolver ready — %d places, %d districts, %d states",
            len(self._place_lookup), len(DISTRICT_REGISTRY), len(STATE_INFO),
        )

    def resolve(self, text: str) -> Dict[str, Any]:
        """
        Scan text for place names and resolve jurisdiction.

        Returns a dict with:
            resolved: bool — whether any place was matched
            places_found: list of matched place names
            district: str — resolved district name
            state: str — resolved state name
            high_court: str — applicable High Court
            hc_seat: str — High Court seat city
            district_court: str — district court name
            all_matches: list of all matched jurisdiction details
            confidence: str — "verified" | "probable" | "inferred"
        """
        if not text or not text.strip():
            return {"resolved": False, "error": "Empty text"}

        text_lower = text.lower()
        matches: List[Dict[str, Any]] = []
        seen_districts = set()

        # 1. Try regex matching for all known place names
        if self._pattern:
            for m in self._pattern.finditer(text_lower):
                place = m.group(1).lower().strip()
                dist_lower = self._place_lookup.get(place)
                if dist_lower and dist_lower not in seen_districts:
                    dist_info = DISTRICT_REGISTRY.get(dist_lower)
                    if dist_info:
                        seen_districts.add(dist_lower)
                        matches.append({
                            "matched_place": place,
                            "district": dist_info["district"],
                            "state": dist_info["state"],
                            "high_court": dist_info["high_court"],
                            "hc_seat": dist_info["hc_seat"],
                            "district_court": dist_info["district_court"],
                        })

        # 2. Also check for direct state name mentions
        state_mentions = []
        for state_lower, state_proper in self._state_names.items():
            if state_lower in text_lower:
                state_mentions.append(state_proper)

        if not matches:
            # No place matched — check if a state was at least mentioned
            if state_mentions:
                state = state_mentions[0]
                info = STATE_INFO[state]
                return {
                    "resolved": True,
                    "confidence": "inferred",
                    "places_found": [],
                    "state_mentioned": state,
                    "district": None,
                    "state": state,
                    "high_court": info["high_court"],
                    "hc_seat": info["hc_seat"],
                    "district_court": None,
                    "all_matches": [],
                    "note": f"State '{state}' mentioned but no specific district/place identified.",
                }
            return {"resolved": False}

        # Pick primary match (first one found — usually most relevant)
        primary = matches[0]

        return {
            "resolved": True,
            "confidence": "verified",
            "places_found": [m["matched_place"] for m in matches],
            "district": primary["district"],
            "state": primary["state"],
            "high_court": primary["high_court"],
            "hc_seat": primary["hc_seat"],
            "district_court": primary["district_court"],
            "all_matches": matches if len(matches) > 1 else [],
            "state_mentions": state_mentions,
        }

    def format_for_prompt(self, resolution: Dict[str, Any]) -> str:
        """
        Format resolved jurisdiction data as a clear text block
        that can be injected into the Claude prompt.

        Returns empty string if nothing was resolved.
        """
        if not resolution.get("resolved"):
            return ""

        parts = []
        parts.append("VERIFIED JURISDICTION DATA (from authoritative Indian geographic database):")

        confidence = resolution.get("confidence", "unknown")

        if resolution.get("district"):
            parts.append(f"  District: {resolution['district']}")
        if resolution.get("state"):
            parts.append(f"  State: {resolution['state']}")
        if resolution.get("high_court"):
            parts.append(f"  High Court: {resolution['high_court']}")
        if resolution.get("hc_seat"):
            parts.append(f"  HC Seat: {resolution['hc_seat']}")
        if resolution.get("district_court"):
            parts.append(f"  District Court: {resolution['district_court']}")

        if resolution.get("places_found"):
            parts.append(f"  Places identified: {', '.join(resolution['places_found'])}")

        if confidence == "verified":
            parts.append("  ⚠ This geographic data is VERIFIED. Use this for jurisdiction, do NOT guess.")
        elif confidence == "inferred":
            parts.append("  ⚠ Only the state was identified. Ask the user for specific district if needed.")

        # If multiple districts were matched (cross-district case)
        if resolution.get("all_matches") and len(resolution["all_matches"]) > 1:
            parts.append("  Multiple locations identified:")
            for m in resolution["all_matches"]:
                parts.append(f"    - {m['matched_place']} → {m['district']} District, {m['state']}")

        return "\n".join(parts)

    def enrich_context(self, context: Dict[str, Any], text: str) -> Dict[str, Any]:
        """
        Convenience method: resolve jurisdiction from text and merge
        into the existing context dict used by analyze_brief.

        Args:
            context: The existing regex-extracted context dict
            text: The raw brief text

        Returns:
            The context dict with 'jurisdiction_data' added.
        """
        resolution = self.resolve(text)
        if resolution.get("resolved"):
            context["jurisdiction_data"] = resolution
            context["jurisdiction_prompt"] = self.format_for_prompt(resolution)
            logger.info(
                "Jurisdiction resolved: %s → %s, %s (confidence: %s)",
                resolution.get("places_found", []),
                resolution.get("district"),
                resolution.get("state"),
                resolution.get("confidence"),
            )
        else:
            logger.info("No jurisdiction resolved from brief text")
        return context
