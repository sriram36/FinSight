import json
import logging
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.schemas.recommendation import RecommendationConfig

logger = logging.getLogger("finsight.llm")

def get_openai_client():
    """Returns AzureOpenAI client if credentials are configured, else None."""
    if settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_API_KEY:
        try:
            from openai import AzureOpenAI
            return AzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                timeout=10.0,  # 10s timeout budget per PRD & CONSTRAINTS.md
                max_retries=0  # Do not loop on slow connections
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Azure OpenAI client: {e}")
            return None
    return None

def generate_llm_recommendation(
    config: RecommendationConfig,
    category: str,
    evidence: Dict[str, Any],
    profile_summary: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Invokes Azure OpenAI with structured JSON schema when configured,
    or falls back deterministically within 10s budget.
    """
    client = get_openai_client()

    if client and config in (RecommendationConfig.SYSTEM_B, RecommendationConfig.SYSTEM_B_ABLATION, RecommendationConfig.SYSTEM_C):
        try:
            deployment = settings.AZURE_OPENAI_DEPLOYMENT or "gpt-5.6-luna"
            
            if config == RecommendationConfig.SYSTEM_C:
                system_prompt = (
                    "You are FinSight AI's System C Evidence-Grounded Recommender. "
                    "Your mandate is zero hallucination and strict adherence to provided empirical receipts. "
                    "NON-NEGOTIABLE RULES:\n"
                    "1. You must ONLY cite monetary amounts and percentages explicitly present in the EVIDENCE object.\n"
                    "2. Do NOT invent, extrapolate, or perform arithmetic on numbers.\n"
                    "3. Return strictly valid JSON with keys: action, reason, expected_impact, cited_transaction_ids, assumptions."
                )
                user_prompt = f"Category: {category}\nEvidence: {json.dumps(evidence)}\nProfile: {json.dumps(profile_summary)}"
            elif config == RecommendationConfig.SYSTEM_B:
                system_prompt = (
                    "You are FinSight AI's System B Personalized Recommender. "
                    "Generate advice conditioned on the user's spending profile deltas. "
                    "Return valid JSON with keys: action, reason, expected_impact, assumptions."
                )
                user_prompt = f"Category: {category}\nProfile: {json.dumps(profile_summary)}"
            else:  # SYSTEM_B_ABLATION
                system_prompt = (
                    "You are a general financial coach. Provide unconstrained, high-level advice. "
                    "Return JSON with keys: action, reason, expected_impact, assumptions."
                )
                user_prompt = f"Category: {category}"

            kwargs = {
                "model": deployment,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"}
            }

            try:
                response = client.chat.completions.create(**kwargs, max_completion_tokens=300)
            except Exception as e:
                err_str = str(e).lower()
                if "unsupported_parameter" in err_str or "max_completion_tokens" in err_str:
                    response = client.chat.completions.create(**kwargs, max_tokens=300)
                else:
                    raise e

            content = response.choices[0].message.content
            parsed = json.loads(content)
            if not isinstance(parsed, dict) or "action" not in parsed or "reason" not in parsed:
                raise ValueError("Malformed JSON structure from LLM completion.")

            # Filter cited transactions for System C to ensure zero hallucinated IDs
            if config == RecommendationConfig.SYSTEM_C:
                allowed_ids = set(evidence.get("source_transaction_ids", []))
                raw_cited = parsed.get("cited_transaction_ids", [])
                if isinstance(raw_cited, list):
                    parsed["cited_transaction_ids"] = [tx for tx in raw_cited if tx in allowed_ids]
                else:
                    parsed["cited_transaction_ids"] = list(allowed_ids)[:5]

            parsed["is_llm_generated"] = True
            parsed["generation_mode"] = "azure_openai"
            parsed["llm_provider"] = "azure_openai"
            parsed["model"] = deployment
            return parsed
        except Exception as e:
            logger.warning(f"LLM generation failed or timed out; falling back to deterministic template: {e}")

    # Deterministic fallback logic (guaranteed within < 5ms)
    fallback = generate_deterministic_fallback(config, category, evidence, profile_summary)
    fallback["is_llm_generated"] = False
    fallback["generation_mode"] = "deterministic_fallback"
    fallback["model"] = "rule_engine"
    return fallback

def generate_deterministic_fallback(
    config: RecommendationConfig,
    category: str,
    evidence: Dict[str, Any],
    profile_summary: Dict[str, Any]
) -> Dict[str, Any]:
    if config == RecommendationConfig.SYSTEM_A:
        pct = evidence.get("percentage_deviation", 0.0)
        impact = evidence.get("expected_impact", 0.0)
        return {
            "action": f"Review and moderate discretionary spending in {category}.",
            "reason": f"{category} spending is trending {pct:.1f}% above historical baseline pace.",
            "expected_impact": impact,
            "cited_transaction_ids": evidence.get("source_transaction_ids", []),
            "assumptions": ["Threshold rule triggered at >= 25% pace deviation."],
            "is_llm_generated": False,
            "llm_provider": "deterministic_rule"
        }
    elif config == RecommendationConfig.SYSTEM_B:
        pct = evidence.get("percentage_deviation", 0.0)
        impact = evidence.get("expected_impact", 0.0)
        return {
            "action": f"Plan flexible purchases carefully around {category}.",
            "reason": f"Your {category} spending has shown an upward shift (+{pct:.1f}%). We suggest reducing this category by ₹2,500.00 this month.",
            "expected_impact": impact,
            "cited_transaction_ids": [],
            "assumptions": ["Personalized recommendation conditioned on spending profile trends."],
            "is_llm_generated": False,
            "llm_provider": "deterministic_fallback"
        }
    elif config == RecommendationConfig.SYSTEM_B_ABLATION:
        return {
            "action": f"Try spending less on {category} this month.",
            "reason": f"You seemed to spend quite a bit on {category} lately. Aim to trim spending by ₹3,000.00 to balance your cash flow.",
            "expected_impact": None,
            "cited_transaction_ids": [],
            "assumptions": ["Unstructured heuristic without empirical evidence grounding."],
            "is_llm_generated": False,
            "llm_provider": "deterministic_fallback"
        }
    else:  # SYSTEM_C
        recent_pace = evidence.get("recent_daily_pace", 0.0)
        baseline_pace = evidence.get("baseline_daily_pace", 0.0)
        pct = evidence.get("percentage_deviation", 0.0)
        monthly_impact = evidence.get("monthly_impact", 0.0)
        source_ids = evidence.get("source_transaction_ids", [])
        
        return {
            "action": f"Consider capping {category} spending by ₹{monthly_impact:,.2f}/month to return to baseline pace.",
            "reason": (
                f"Your recent {category} spending pace is ₹{recent_pace:,.2f}/day, which is "
                f"{pct:.1f}% above your historical baseline pace of ₹{baseline_pace:,.2f}/day."
            ),
            "expected_impact": monthly_impact,
            "cited_transaction_ids": source_ids,
            "assumptions": [
                f"Historical baseline evaluated over {profile_summary.get('baseline_days', 60)} days.",
                f"Recent pacing evaluated over {profile_summary.get('recent_days', 30)} days.",
                "Discretionary adjustment assumes consistent recurring income."
            ],
            "is_llm_generated": False,
            "llm_provider": "deterministic_fallback"
        }
